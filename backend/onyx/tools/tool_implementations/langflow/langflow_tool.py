import json
from typing import Any, cast, Generator

import requests
from langchain_core.messages import HumanMessage
from pydantic import BaseModel
from sqlalchemy.orm import Session

from onyx.chat.models import PromptConfig
from onyx.chat.prompt_builder.answer_prompt_builder import AnswerPromptBuilder
from onyx.configs.app_configs import LANGFLOW_BASE_URL, LANGFLOW_API_KEY
from onyx.llm.utils import message_to_prompt_and_imgs
from onyx.tools.message import ToolCallSummary
from onyx.utils.special_types import JSON_ro
from onyx.llm.interfaces import LLM, LLMConfig
from onyx.llm.models import PreviousMessage
from onyx.tools.models import ToolResponse
from onyx.tools.tool import Tool
from onyx.utils.logger import setup_logger

logger = setup_logger()
LANGFLOW_RESPONSE_SUMMARY_ID = "langflow_response_summary"


class LangflowResponseSummary(BaseModel):
    tool_result: str
    tool_name: str


class LangflowTool(Tool):
    NAME = "langflow_tool"
    langflow_tool_description = """An API for Langflow"""
    _DISPLAY_NAME = "Langflow"

    def __init__(
            self,
            db_session: Session,
            pipeline_id: str,
            prompt_config: PromptConfig,
            llm_config: LLMConfig,
            chat_session_id,
    ):
        self.db_session = db_session
        self.pipeline_id = pipeline_id
        self.base_url = LANGFLOW_BASE_URL
        self.prompt_config = prompt_config
        self.llm_config = llm_config
        self.chat_session_id = chat_session_id

    @property
    def name(self) -> str:
        return self.NAME

    @property
    def description(self) -> str:
        return self.langflow_tool_description

    @property
    def display_name(self) -> str:
        return self._DISPLAY_NAME

    def tool_definition(self) -> dict:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": {
                    "type": "object",
                    "properties": {
                        "question": {
                            "type": "string",
                            "description": "What to search for",
                        },
                    },
                    "required": ["question"],
                },
            },
        }

    def build_tool_message_content(
            self, *args: ToolResponse
    ) -> str:
        response = cast(LangflowResponseSummary, args[0].response)
        return response.tool_result

    def get_args_for_non_tool_calling_llm(
            self,
            query: str,
            history: list[PreviousMessage],
            llm: LLM,
            force_run: bool = True,
    ) -> dict[str, Any] | None:

        return {"question": query}

    def run(self, **kwargs: Any) -> Generator[ToolResponse, None, None]:
        request_body = {
            "input_value": kwargs['question'],
            "session_id": str(self.chat_session_id),
        }

        url = self.base_url + f"/api/v1/run/{self.pipeline_id}"
        method = "POST"
        response = requests.request(method, url, json=request_body, headers={"x-api-key": LANGFLOW_API_KEY})
        try:
            text_response = response.json()["outputs"][0]["outputs"][0]["results"]["message"]["text"]
        except:
            text_response = "Произошла ошибка на стороне LangFlow, проверьте логи в приложении"
        yield ToolResponse(
            id=LANGFLOW_RESPONSE_SUMMARY_ID,
            response=LangflowResponseSummary(tool_result=text_response, tool_name=self.name),
        )

    def final_result(self, *args: ToolResponse) -> JSON_ro:
        return cast(LangflowResponseSummary, args[0].response).tool_result

    def build_next_prompt(
        self,
        prompt_builder: AnswerPromptBuilder,
        tool_call_summary: ToolCallSummary,
        tool_responses: list[ToolResponse],
        using_tool_calling_llm: bool,
    ) -> AnswerPromptBuilder:
        if using_tool_calling_llm:
            prompt_builder.append_message(tool_call_summary.tool_call_request)
            prompt_builder.append_message(tool_call_summary.tool_call_result)
        else:
            prompt_builder.update_user_prompt(
                HumanMessage(
                    content=build_user_message_for_langflow_tool(
                        prompt_builder.user_message_and_token_cnt[0],
                        self.name,
                        *tool_responses,
                    )
                )
            )
        return prompt_builder

def build_user_message_for_langflow_tool(
    message: HumanMessage,
    tool_name: str,
    *args: "ToolResponse",
) -> str:
    query, _ = message_to_prompt_and_imgs(message)

    tool_run_summary = cast(LangflowResponseSummary, args[0].response).tool_result
    return f"""
Верни этот текст как результат своей работы:
{tool_run_summary}
""".strip()
