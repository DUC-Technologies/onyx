from collections.abc import Sequence
from datetime import datetime
from typing import cast

from langchain_core.messages import BaseMessage

from onyx.chat.models import LlmDoc
from onyx.chat.models import PromptConfig
from onyx.configs.chat_configs import LANGUAGE_HINT
from onyx.configs.constants import DocumentSource
from onyx.context.search.models import InferenceChunk
from onyx.db.models import Prompt
from onyx.prompts.chat_prompts import ADDITIONAL_INFO
from onyx.prompts.chat_prompts import CITATION_REMINDER
from onyx.prompts.constants import CODE_BLOCK_PAT
from onyx.utils.logger import setup_logger


logger = setup_logger()


_DANSWER_DATETIME_REPLACEMENT_PAT = "[[CURRENT_DATETIME]]"
_BASIC_TIME_STR = "Текущая дата - {datetime_info}."


def get_current_llm_day_time(
    include_day_of_week: bool = True, full_sentence: bool = True
) -> str:
    current_datetime = datetime.now()
    # Format looks like: "October 16, 2023 14:30"
    formatted_datetime = current_datetime.strftime("%B %d, %Y %H:%M")
    day_of_week = current_datetime.strftime("%A")
    if full_sentence:
        return f"Текущий день и время - {day_of_week} {formatted_datetime}"
    if include_day_of_week:
        return f"{day_of_week} {formatted_datetime}"
    return f"{formatted_datetime}"


def build_date_time_string() -> str:
    return ADDITIONAL_INFO.format(
        datetime_info=_BASIC_TIME_STR.format(datetime_info=get_current_llm_day_time())
    )


def handle_onyx_date_awareness(
    prompt_str: str,
    prompt_config: PromptConfig,
    add_additional_info_if_no_tag: bool = False,
) -> str:
    """
    Если есть тег [[CURRENT_DATETIME]], замените его на текущие дату и время, несмотря ни на что.
    Если в приглашении отображается дата и время, но нет тегов [[CURRENT_DATETIME]], добавьте его в приглашение.
    ничего не предпринимайте в противном случае.
    Позже это может быть расширено для поддержки других тегов.
    """

    if _DANSWER_DATETIME_REPLACEMENT_PAT in prompt_str:
        return prompt_str.replace(
            _DANSWER_DATETIME_REPLACEMENT_PAT,
            get_current_llm_day_time(full_sentence=False, include_day_of_week=True),
        )
    any_tag_present = any(
        _DANSWER_DATETIME_REPLACEMENT_PAT in text
        for text in [prompt_str, prompt_config.system_prompt, prompt_config.task_prompt]
    )
    if add_additional_info_if_no_tag and not any_tag_present:
        return prompt_str + build_date_time_string()
    return prompt_str


def build_task_prompt_reminders(
    prompt: Prompt | PromptConfig,
    use_language_hint: bool,
    citation_str: str = CITATION_REMINDER,
    language_hint_str: str = LANGUAGE_HINT,
) -> str:
    base_task = prompt.task_prompt
    citation_or_nothing = citation_str if prompt.include_citations else ""
    language_hint_or_nothing = language_hint_str.lstrip() if use_language_hint else ""
    return base_task + citation_or_nothing + language_hint_or_nothing


# Maps connector enum string to a more natural language representation for the LLM
# If not on the list, uses the original but slightly cleaned up, see below
CONNECTOR_NAME_MAP = {
    "web": "Вебсайт",
    "requesttracker": "Отслеживатель запросов",
    "github": "GitHub",
    "file": "Загрузка файла",
}


def clean_up_source(source_str: str) -> str:
    if source_str in CONNECTOR_NAME_MAP:
        return CONNECTOR_NAME_MAP[source_str]
    return source_str.replace("_", " ").title()


def build_doc_context_str(
    semantic_identifier: str,
    source_type: DocumentSource,
    content: str,
    metadata_dict: dict[str, str | list[str]],
    updated_at: datetime | None,
    ind: int,
    include_metadata: bool = True,
) -> str:
    context_str = ""
    if include_metadata:
        context_str += f"ДОКУМЕНТ {ind}: {semantic_identifier}\n"
        context_str += f"Источник: {clean_up_source(source_type)}\n"

        for k, v in metadata_dict.items():
            if isinstance(v, list):
                v_str = ", ".join(v)
                context_str += f"{k.capitalize()}: {v_str}\n"
            else:
                context_str += f"{k.capitalize()}: {v}\n"

        if updated_at:
            update_str = updated_at.strftime("%B %d, %Y %H:%M")
            context_str += f"Обновленный: {update_str}\n"
    context_str += f"{CODE_BLOCK_PAT.format(content.strip())}\n\n\n"
    return context_str


def build_complete_context_str(
    context_docs: Sequence[LlmDoc | InferenceChunk],
    include_metadata: bool = True,
) -> str:
    context_str = ""
    for ind, doc in enumerate(context_docs, start=1):
        context_str += build_doc_context_str(
            semantic_identifier=doc.semantic_identifier,
            source_type=doc.source_type,
            content=doc.content,
            metadata_dict=doc.metadata,
            updated_at=doc.updated_at,
            ind=ind,
            include_metadata=include_metadata,
        )

    return context_str.strip()


_PER_MESSAGE_TOKEN_BUFFER = 7


def find_last_index(lst: list[int], max_prompt_tokens: int) -> int:
    """From the back, find the index of the last element to include
    before the list exceeds the maximum"""
    running_sum = 0

    if not lst:
        logger.warning("Пустая история сообщений, переданная в find_last_index")
        return 0

    last_ind = 0
    for i in range(len(lst) - 1, -1, -1):
        running_sum += lst[i] + _PER_MESSAGE_TOKEN_BUFFER
        if running_sum > max_prompt_tokens:
            last_ind = i + 1
            break

    if last_ind >= len(lst):
        logger.error(
            f"Последнее сообщение слишком велико! max_prompt_tokens: {max_prompt_tokens}, message_token_counts: {lst}"
        )
        raise ValueError("Последнее сообщение слишком велико!")

    return last_ind


def drop_messages_history_overflow(
    messages_with_token_cnts: list[tuple[BaseMessage, int]],
    max_allowed_tokens: int,
) -> list[BaseMessage]:
    """As message history grows, messages need to be dropped starting from the furthest in the past.
    The System message should be kept if at all possible and the latest user input which is inserted in the
    prompt template must be included"""

    final_messages: list[BaseMessage] = []
    messages, token_counts = cast(
        tuple[list[BaseMessage], list[int]], zip(*messages_with_token_cnts)
    )
    system_msg = (
        final_messages[0]
        if final_messages and final_messages[0].type == "system"
        else None
    )

    history_msgs = messages[:-1]
    final_msg = messages[-1]
    if final_msg.type != "human":
        if final_msg.type != "tool":
            raise ValueError("Last message must be user input OR a tool result")
        else:
            final_msgs = messages[-3:]
            history_msgs = messages[:-3]
    else:
        final_msgs = [final_msg]

    # Start dropping from the history if necessary
    ind_prev_msg_start = find_last_index(
        token_counts, max_prompt_tokens=max_allowed_tokens
    )

    if system_msg and ind_prev_msg_start <= len(history_msgs):
        final_messages.append(system_msg)

    final_messages.extend(history_msgs[ind_prev_msg_start:])
    final_messages.extend(final_msgs)

    return final_messages
