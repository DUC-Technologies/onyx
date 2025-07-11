PERSONA_CATEGORY_GENERATION_PROMPT = """
На основе имени, описания и инструкций помощника сгенерируй {num_categories}
  **уникальные и разнообразные категории**, которые представляют различные типы начальных сообщений, которые пользователь
может отправить, чтобы начать разговор с этим чат-ботом-помощником.

**Убедись, что категории являются актуальными и охватывают
темы, связанные с возможностями ассистента.**

Предоставьте категории в виде массива строк в формате JSON ** без каких-либо ограничений кода или дополнительного текста **.

**Информация о ассистенте:**
- **Имя**: {name}
- **Описание**: {description}
- **Инструкция**: {instructions}
"""

PERSONA_STARTER_MESSAGE_CREATION_PROMPT = """
Создай начальное сообщение, которое пользователь может отправить, чтобы начать разговор с чат-ботом-ассистентом.

{category_prompt}

В вашем ответе должно содержаться только то сообщение, которое пользователь отправил бы ассистенту.
Оно должно быть естественным, увлекательным и способствовать получению полезного ответа от ассистента.
** Избегай излишне специфичных деталей; оставь сообщение общим и широко применимым.**

Например:
- Вместо "Я только что усыновил 6-месячного щенка лабрадора, который тянет за поводок"
напиши "У меня возникли проблемы с обучением моего нового щенка хорошо ходить на поводке".
Не приводи никаких дополнительных текстов или объяснений и будь предельно лаконичным.

**Информация о ассистенте:**
- **Имя**: {name}
- **Описание**: {description}
- **Инструкция**: {instructions}
""".strip()


def format_persona_starter_message_prompt(
    name: str, description: str, instructions: str, category: str | None = None
) -> str:
    category_prompt = f"**Category**: {category}" if category else ""
    return PERSONA_STARTER_MESSAGE_CREATION_PROMPT.format(
        category_prompt=category_prompt,
        name=name,
        description=description,
        instructions=instructions,
    )


if __name__ == "__main__":
    print(PERSONA_CATEGORY_GENERATION_PROMPT)
    print(PERSONA_STARTER_MESSAGE_CREATION_PROMPT)
