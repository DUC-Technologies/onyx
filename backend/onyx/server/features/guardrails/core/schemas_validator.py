from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from onyx.db.enums import ValidatorType
from onyx.db.models import Validator


class ValidatorOwner(BaseModel):
    """Вложенная схема для ответа API при запросе валидатора"""

    id: UUID = Field(
        description="ID создателя валидатора",
        examples=["c310315f-93bf-4e53-a84d-37a7c9e07710"]
    )
    email: str = Field(
        description="Email создателя валидатора",
        examples=["admin@yandex.ru"]
    )


class ValidatorCreate(BaseModel):
    """Схема для запроса к API при создании экземпляра валидатора"""

    name: str = Field(
        description="Название валидатора",
        examples=["Валидатор персональных данных"],
    )
    description: str | None = Field(
        description="Описание валидатора",
        examples=["Выполняет обнаружение персональных данных в тексте и маскирует их"],
    )
    validator_type: ValidatorType = Field(
        description="Тип валидатора",
    )
    config: dict[str, Any] = Field(
        description="Настройки валидатора в формате JSON",
        examples=[{"pii_entities": ["EMAIL_ADDRESS", "PHONE_NUMBER", "CREDIT_CARD"]}],
    )


class ValidatorUpdate(BaseModel):
    """Схема для запроса к API при обновлении экземпляра валидатора"""

    name: str = Field(
        description="Название валидатора",
        examples=["Валидатор персональных данных"],
    )
    description: str | None = Field(
        description="Описание валидатора",
        examples=["Выполняет обнаружение персональных данных в тексте и маскирует их"],
    )
    config: dict[str, Any] = Field(
        description="Настройки валидатора в формате JSON",
        examples=[{"pii_entities": ["EMAIL_ADDRESS", "PHONE_NUMBER", "CREDIT_CARD"]}],
    )


class ValidatorResponse(BaseModel):
    """Схема для ответа API при запросе валидатора"""

    owner: ValidatorOwner | None = Field(
        default=None,
        description="Данные о создателе валидатора",
    )
    id: int = Field(description="ID валидатора", examples=["1"])
    name: str = Field(
        description="Название валидатора",
        examples=["Валидатор персональных данных"],
    )
    description: str | None = Field(
        description="Описание валидатора",
        examples=["Выполняет обнаружение персональных данных в тексте и маскирует их"],
    )
    validator_type: ValidatorType
    config: dict[str, Any] = Field(
        description="Настройки валидатора в формате JSON",
        examples=[{"pii_entities": ["EMAIL_ADDRESS", "PHONE_NUMBER", "CREDIT_CARD"]}],
    )
    created_at: datetime = Field(
        description="Дата создания валидатора",
        examples=["2025-10-06 15:25:15.695 +0300"]
    )
    updated_at: datetime = Field(
        description="Дата обновления валидатора",
        examples=["2025-10-06 20:35:00.695 +0300"]
    )

    @classmethod
    def from_model(cls, validator: Validator) -> "ValidatorResponse":
        return ValidatorResponse(
            owner=(
                ValidatorOwner(id=validator.user_id, email=validator.user.email)
                if validator.user
                else None
            ),
            id=validator.id,
            name=validator.name,
            description=validator.description,
            validator_type=validator.validator_type,
            config=validator.config,
            created_at=validator.created_at,
            updated_at=validator.updated_at,
        )
