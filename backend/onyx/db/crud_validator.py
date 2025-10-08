from uuid import UUID
from fastapi import HTTPException
from sqlalchemy import delete, exists, select, Select, update
from sqlalchemy.orm import Session, aliased, joinedload

from onyx.auth.schemas import UserRole
from onyx.configs.app_configs import DISABLE_AUTH
from onyx.db.models import (
    User,
    Validator,
    Validator__UserGroup,
    User__UserGroup,
)
from onyx.server.features.guardrails.core.schemas_validator import (
    ValidatorCreate,
    ValidatorUpdate,
)

def _add_user_filters(
    stmt: Select, user: User | None, get_editable: bool = True
) -> Select:
    """
    Применяет фильтры к запросу валидаторов.
    """
    # администраторы видят все валидаторы
    if (user is None and DISABLE_AUTH) or (user and user.role == UserRole.ADMIN):
        return stmt

    stmt = stmt.distinct()
    Validator__UG = aliased(Validator__UserGroup)
    User__UG = aliased(User__UserGroup)

    # добавляем связи для фильтрации по группам
    stmt = stmt.outerjoin(Validator__UG).outerjoin(
        User__UG,
        User__UG.user_group_id == Validator__UG.user_group_id,
    )
    # eсли пользователь неавторизован, показываем только публичные валидаторы
    if user is None:
        return stmt.where(Validator.is_public == True) # noqa: E712

    # фильтры для авторизованного пользователя
    where_clause = User__UG.user_id == user.id
    if user.role == UserRole.CURATOR and get_editable:
        where_clause &= User__UG.is_curator == True # noqa: E712

    # дополнительные условия для редактирования
    if get_editable:
        # для редактирования пользователь должен быть куратором ВСЕХ групп, к которым привязан валидатор.
        user_groups = select(User__UG.user_group_id).where(User__UG.user_id == user.id)
        if user.role == UserRole.CURATOR:
            user_groups = user_groups.where(
                User__UserGroup.is_curator == True # noqa: E712
            )

        # проверка, что НЕ существует ни одной группы, связанной с этим валидатором,
        # в которой пользователь НЕ является куратором.
        where_clause &= (
            ~exists()
            .where(Validator__UG.validator_id == Validator.id)
            .where(~Validator__UG.user_group_id.in_(user_groups))
            .corrolate(Validator)
        )
        # владелец всегда может редактировать.
        where_clause |= Validator.user_id == user.id
    else:
        # для просмотра/использования достаточно быть в одной из групп
        # или если валидатор публичный, или если пользователь - владелец.
        where_clause |= Validator.is_public == True
        where_clause |= Validator.user_id == user.id

    return stmt.where(where_clause)


def get_validator_by_id_for_user(
    db_session: Session, validator_id: int, user: User | None, get_editable: bool = True
) -> Validator:
    """Получает валидатор по ID с проверкой прав доступа."""
    stmt = (
        select(Validator)
        .where(Validator.id == validator_id)
        .options(
            joinedload(Validator.user),
            joinedload(Validator.groups),
        )
    )
    stmt = _add_user_filters(stmt=stmt, user=user, get_editable=get_editable)
    validator = db_session.scalars(stmt).one_or_none()
    if not validator:
        raise HTTPException(
            status_code=404,
            detail=f"Валидатор с ID {validator_id} не найден или у вас нет прав доступа.",
        )
    return validator


def get_validators_for_user(
    db_session: Session, user: User | None, get_editable: bool = False
) -> list[Validator]:
    """Получает список валидаторов, доступных пользователю."""
    stmt = select(Validator).options(
        joinedload(Validator.user),
        joinedload(Validator.groups),
    )
    stmt = _add_user_filters(stmt=stmt, user=user, get_editable=get_editable)
    return list(db_session.scalars(stmt).unique().all())


def get_validators_by_ids_for_user(
    db_session: Session,
    validator_ids: list[int],
    user: User | None,
    get_editable: bool = False,
) -> list[Validator]:
    """Получает список валидаторов по их ID с проверкой прав."""
    if not validator_ids:
        return []

    stmt = select(Validator).where(Validator.id.in_(validator_ids))
    stmt = _add_user_filters(stmt=stmt, user=user, get_editable=get_editable)

    validators = list(db_session.scalars(stmt).all())
    if len(validators) != len(set(validator_ids)):
        found_ids = {v.id for v in validators}
        missing_ids = [vid for vid in validator_ids if vid not in found_ids]
        raise HTTPException(
            status_code=404,
            detail=f"Валидаторы с ID {missing_ids} не найдены или у вас нет прав на их использование.",
        )
    return validators


def create_validator(
    db_session: Session, user: User | None, validator_create: ValidatorCreate
) -> Validator:
    """Создает новый валидатор."""
    new_validator = Validator(
        name=validator_create.name,
        description=validator_create.description,
        validator_type=validator_create.validator_type,
        config=validator_create.config,
        user_id=user.id if user else None,
        is_public=validator_create.is_public,
    )
    db_session.add(new_validator)
    db_session.flush()

    _update_validator_sharing(
        db_session=db_session,
        validator_id=new_validator.id,
        group_ids=validator_create.groups,
    )

    db_session.commit()
    db_session.refresh(new_validator)
    return new_validator


def update_validator(
    db_session: Session,
    user: User | None,
    validator_id: int,
    validator_update: ValidatorUpdate,
) -> Validator:
    """Обновляет существующий валидатор."""
    validator = get_validator_by_id_for_user(
        db_session=db_session, validator_id=validator_id, user=user, get_editable=True
    )

    validator.name = validator_update.name
    validator.description = validator_update.description
    validator.config = validator_update.config
    validator.is_public = validator_update.is_public

    _update_validator_sharing(
        db_session=db_session,
        validator_id=validator.id,
        group_ids=validator_update.groups,
    )

    db_session.commit()
    db_session.refresh(validator)
    return validator


def delete_validator(db_session: Session, user: User | None, validator_id: int) -> None:
    """Удаляет валидатор."""
    validator = get_validator_by_id_for_user(
        db_session=db_session, validator_id=validator_id, user=user, get_editable=True
    )
    db_session.delete(validator)
    db_session.commit()


def _update_validator_sharing(
    db_session: Session,
    validator_id: int,
    group_ids: list[int] | None,
) -> None:
    """Вспомогательная функция для обновления связей валидатора с группами."""
    db_session.query(Validator__UserGroup).filter(
        Validator__UserGroup.validator_id == validator_id
    ).delete(synchronize_session=False)

    if group_ids:
        for group_id in group_ids:
            db_session.add(
                Validator__UserGroup(validator_id=validator_id, user_group_id=group_id)
            )


def get_validators_templates(db_session: Session) -> list[Validator]:
    return list(
        db_session.scalars(
            select(Validator).where(Validator.user_id.is_(None))
        ).all()
    )
