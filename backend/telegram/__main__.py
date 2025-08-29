import asyncio
import logging
import os
from typing import Optional, Tuple

from telebot import asyncio_filters
from telebot.async_telebot import AsyncTeleBot
from telebot.states.asyncio import StateMiddleware

from onyx.configs.app_configs import POSTGRES_API_SERVER_POOL_SIZE, POSTGRES_API_SERVER_POOL_OVERFLOW
from onyx.configs.constants import POSTGRES_WEB_APP_NAME
from onyx.db.engine import SqlEngine
from telegram.filters.auth import AuthFilter
from telegram.handlers import register_events

from onyx.server.features.telegram.models import TelegramTokenSettings
from onyx.server.features.telegram.store import load_telegram_settings, store_telegram_settings

CHECK_INTERVAL = 15.0  # Интервал проверки значения токена (в секундах)
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s:  %(asctime)s - %(name)s %(lineno)d: %(message)s',
    datefmt='%m/%d/%Y %H:%M:%S'
)
logger = logging.getLogger(__name__)


def mask_token(token: Optional[str]) -> str:
    """
    Маскирует токен для безопасного отображения в логах.

    Args:
        token: Токен для маскирования или None
    Returns:
        Маскированная строка токена в формате "abcde*****vwxyz" или "None"
    """
    if not token:
        return "None"
    if len(token) <= 10:
        return "*****"
    return f"{token[:5]}*****{token[-5:]}"


async def token_watcher(
        initial_token: Optional[str],
        stop_event: asyncio.Event,
        change_event: asyncio.Event
):
    """
    Мониторит изменения токена Telegram бота в фоновом режиме.

    Функция работает в цикле, проверяя каждые CHECK_INTERVAL секунд,
    не изменился ли токен бота. При обнаружении изменения устанавливает
    change_Event и завершает работу.

    Args:
        initial_token: Начальное значение токена для сравнения
        stop_event: Событие для остановки мониторинга
        change_event: Событие, которое устанавливается при изменении токена
    """
    current = initial_token
    while not stop_event.is_set():
        try:
            await asyncio.sleep(CHECK_INTERVAL)
            settings = load_telegram_settings()
            new_token = settings.token if settings else None
            if new_token != current:
                logger.info("Telegram token change detected (old=%s, new=%s)",
                            mask_token(current), mask_token(new_token))
                change_event.set()
                return
        except Exception:
            logger.exception("Ошибка при проверке токена")
    logger.debug("token_watcher stopped by stop_event")



async def is_valid_token(token: str) -> bool:
    """
    Проверяет валидность токена Telegram бота.
    Делает тестовый запрос к API Telegram для проверки корректности токена.

    Args:
        token: Токен для проверки
    Returns:
        True если токен валиден, False в противном случае
    """
    if not token:
        return False
    try:
        bot = AsyncTeleBot(token)
        await bot.get_me()
        return True
    except Exception as e:
        if "401" in str(e) or "Unauthorized" in str(e):
            logger.error("Invalid Telegram token provided: %s", mask_token(token))
        else:
            logger.error("Error validating token %s: %s", mask_token(token), str(e))
        return False


async def start_bot(token: str) -> Tuple[AsyncTeleBot, asyncio.Task]:
    """
    Инициализирует и запускает Telegram бота.

    Args:
        token: Токен бота для запуска
    Returns:
        Кортеж (экземпляр бота, задача polling)
    """
    bot = AsyncTeleBot(token)
    bot.add_custom_filter(AuthFilter())
    bot.setup_middleware(StateMiddleware(bot))
    bot.add_custom_filter(asyncio_filters.StateFilter(bot))
    register_events(bot)

    polling_task = asyncio.create_task(bot.polling(allowed_updates=["message", "callback_query"]))
    logger.info("Started bot polling task for token: %s", mask_token(token))
    return bot, polling_task


async def close_bot_gracefully(bot: AsyncTeleBot):
    """
    Корректно останавливает бота, закрывая все соединения.

    Args:
        bot: Экземпляр бота для остановки
    """
    try:
        try:
            await bot.delete_webhook()
        except Exception:
            logger.debug("delete_webhook failed (ignored)", exc_info=True)
        try:
            await bot.close_session()
        except Exception:
            logger.debug("close_session failed (ignored)", exc_info=True)
        try:
            await bot.close()
        except Exception:
            logger.debug("bot.close failed (ignored)", exc_info=True)
    except Exception:
        logger.exception("Ошибка при закрытии бота")


async def main_async():
    """
    Основная асинхронная функция управления жизненным циклом бота.

    Функция выполняет:
    1. Инициализацию базы данных
    2. Загрузку начального токена
    3. Запуск основного цикла работы бота:
    4. Обработку изменения токена
    5. Перезапуск бота при необходимости
    """
    SqlEngine.set_app_name(POSTGRES_WEB_APP_NAME)
    SqlEngine.init_engine(
        pool_size=POSTGRES_API_SERVER_POOL_SIZE,
        max_overflow=POSTGRES_API_SERVER_POOL_OVERFLOW,
    )

    # Загрузка начального токена
    tg_settings = load_telegram_settings()
    token = tg_settings.token if tg_settings else None
    if not token:
        token = os.environ.get("TELEGRAM_TOKEN")
        store_telegram_settings(TelegramTokenSettings(token=token))

    if not token:
        logger.warning("No Telegram token provided")
        return

    # Проверка валидности начального токена
    if not await is_valid_token(token):
        logger.error("Provided Telegram token is invalid. Waiting for valid token...")
        # Ожидание валидного токена
        while True:
            await asyncio.sleep(CHECK_INTERVAL)
            tg_settings = load_telegram_settings()
            new_token = tg_settings.token if tg_settings else None
            if new_token and await is_valid_token(new_token):
                token = new_token
                logger.info("Valid token received, starting bot")
                break

    shutdown = False
    global_stop_event = asyncio.Event()

    current_token = token
    while not shutdown:
        change_event = asyncio.Event()
        watcher_task = asyncio.create_task(token_watcher(current_token, global_stop_event, change_event))

        bot, polling_task = await start_bot(current_token)

        done, pending = await asyncio.wait(
            {watcher_task, polling_task},
            return_when=asyncio.FIRST_COMPLETED,
        )

        # Обработка изменения токена
        if watcher_task in done:
            if not polling_task.done():
                polling_task.cancel()
                try:
                    await polling_task
                except asyncio.CancelledError:
                    logger.debug("Polling task cancelled after token change")
                except Exception:
                    logger.exception("Polling task raised on cancel")

            await close_bot_gracefully(bot)

            try:
                new_settings = load_telegram_settings()
                new_token = new_settings.token if new_settings else None
                if not new_token:
                    new_token = os.environ.get("TELEGRAM_TOKEN")
                    store_telegram_settings(TelegramTokenSettings(token=new_token))

                # Проверка валидности нового токена
                if new_token and await is_valid_token(new_token):
                    current_token = new_token
                else:
                    logger.error("New token is invalid. Waiting for valid token...")
                    # Ожидание валидного токена
                    while True:
                        await asyncio.sleep(CHECK_INTERVAL)
                        tg_settings = load_telegram_settings()
                        valid_token = tg_settings.token if tg_settings else None
                        if valid_token and await is_valid_token(valid_token):
                            current_token = valid_token
                            logger.info("Valid token received, restarting bot")
                            break

                for t in pending:
                    t.cancel()
            except Exception:
                logger.exception("Ошибка при получении нового токена — завершение.")
                break

            continue

        # Обработка остановки бота
        if polling_task in done:
            try:
                exc = polling_task.exception()
            except asyncio.CancelledError:
                exc = "cancelled"

            # Обработка ошибки неверного токена
            if exc and "401" in str(exc):
                logger.error("Token became invalid. Waiting for token change...")
                if not watcher_task.done():
                    # Ожидание изменения токена
                    try:
                        await watcher_task
                    except asyncio.CancelledError:
                        pass
                    except Exception:
                        logger.exception("Watcher task raised on cancel")
            else:
                logger.warning("Polling task finished unexpectedly. Exception: %s. Restarting bot.", exc)

            if not watcher_task.done():
                watcher_task.cancel()
                try:
                    await watcher_task
                except asyncio.CancelledError:
                    pass
                except Exception:
                    logger.exception("Watcher task raised on cancel")

            await close_bot_gracefully(bot)
            await asyncio.sleep(1.0)
            continue

    global_stop_event.set()


def main() -> None:
    """
    Основная точка входа приложения.
    Запускает асинхронную основную функцию и обрабатывает исключения.
    """
    try:
        asyncio.run(main_async())
    except (KeyboardInterrupt, SystemExit):
        logger.info("Shutting down due to keyboard interrupt or system exit.")
    except Exception:
        logger.exception("Fatal error in main")


if __name__ == "__main__":
    main()
