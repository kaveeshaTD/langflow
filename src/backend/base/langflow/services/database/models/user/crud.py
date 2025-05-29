from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from loguru import logger
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm.attributes import flag_modified
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from langflow.services.database.models.user.model import User, UserUpdate

#new import
from sqlalchemy import insert
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from .model import User 
from typing import Optional
import json


async def get_user_by_username(db: AsyncSession, username: str) -> User | None:
    stmt = select(User).where(User.username == username)
    return (await db.exec(stmt)).first()


# async def get_user_by_id(db: AsyncSession, user_id: UUID) -> User | None:
#     #need to edit
#     print("get user by id function called.................")
#     print("function incomming user id is - ",user_id)
#     if isinstance(user_id, str):
#         user_id = UUID(user_id)
#     stmt = select(User).where(User.id == user_id)
#     #if user is not here extract the user details from user and create a new user from using token details

#     return (await db.exec(stmt)).first()

# update function to create user

# async def get_user_by_id(db: AsyncSession, user_id: UUID, token_payload: dict) -> Optional[User]:
#     print("get user by id function called.................")
#     print("function incoming user id is - ", user_id)

#     if isinstance(user_id, str):
#         user_id = UUID(user_id)

#     stmt = select(User).where(User.id == user_id)
#     result = await db.execute(stmt)
#     user = result.scalar_one_or_none()

#     if user:
#         return user

#     # User not found, create new one from token
#     username = token_payload.get("preferred_username")
#     is_superuser = 1 if "SuperUser" in token_payload.get("realm_access", {}).get("roles", []) else 0
#     is_active = is_superuser  # If SuperUser, user is active too

#     now = datetime.now(timezone.utc)
#     default_optins = {
#         "github_starred": False,
#         "dialog_dismissed": False,
#         "discord_clicked": False
#     }


#     # Use a random/dummy password (bcrypt hashed)
#     dummy_password = "$2b$12$o86nO1tD2UVaNBgkg4TOn.YSfoWXqwFRIB3uL35woxO1lqkqrdbkm"

#     new_user = User(
#         id=user_id,
#         username=username,
#         password=dummy_password,
#         profile_image=None,
#         is_active=is_active,
#         is_superuser=is_superuser,
#         create_at=now,
#         updated_at=now,
#         last_login_at=None,
#         store_api_key=None,
#         optins=default_optins
#     )

#     print("new dab data is ++++++++++++++ " , new_user )
#     db.add(new_user)
#     await db.commit()
#     await db.refresh(new_user)

#     print("New user created:", new_user)
#     return new_user

# ================ make token payload optionals =========================

async def get_user_by_id(db: AsyncSession, user_id: UUID, token_payload: Optional[dict] = None) -> Optional[User]:
    print("get user by id function called.................")
    print("function incoming user id is - ", user_id)

    if isinstance(user_id, str):
        user_id = UUID(user_id)

    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user:
        return user

    if token_payload is None:
        # Don't create a user if token payload is not provided
        print("Token payload not provided, and user not found.")
        return None

    # Proceed to create new user
    username = token_payload.get("preferred_username")
    is_superuser = 1 if "SuperUser" in token_payload.get("realm_access", {}).get("roles", []) else 0
    is_active = is_superuser

    now = datetime.now(timezone.utc)
    default_optins = {
        "github_starred": False,
        "dialog_dismissed": False,
        "discord_clicked": False
    }

    dummy_password = "$2b$12$o86nO1tD2UVaNBgkg4TOn.YSfoWXqwFRIB3uL35woxO1lqkqrdbkm"

    new_user = User(
        id=user_id,
        username=username,
        password=dummy_password,
        profile_image=None,
        is_active=is_active,
        is_superuser=is_superuser,
        create_at=now,
        updated_at=now,
        last_login_at=None,
        store_api_key=None,
        optins=default_optins
    )

    print("new dab data is ++++++++++++++ ", new_user)
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    print("New user created:", new_user)
    return new_user
#=========================================================================================================================


async def update_user(user_db: User | None, user: UserUpdate, db: AsyncSession) -> User:
    if not user_db:
        raise HTTPException(status_code=404, detail="User not found")

    # user_db_by_username = get_user_by_username(db, user.username)
    # if user_db_by_username and user_db_by_username.id != user_id:
    #     raise HTTPException(status_code=409, detail="Username already exists")

    user_data = user.model_dump(exclude_unset=True)
    changed = False
    for attr, value in user_data.items():
        if hasattr(user_db, attr) and value is not None:
            setattr(user_db, attr, value)
            changed = True

    if not changed:
        raise HTTPException(status_code=status.HTTP_304_NOT_MODIFIED, detail="Nothing to update")

    user_db.updated_at = datetime.now(timezone.utc)
    flag_modified(user_db, "updated_at")

    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e)) from e

    return user_db


async def update_user_last_login_at(user_id: UUID, db: AsyncSession):
    try:
        user_data = UserUpdate(last_login_at=datetime.now(timezone.utc))
        user = await get_user_by_id(db, user_id)
        return await update_user(user, user_data, db)
    except Exception as e:  # noqa: BLE001
        logger.error(f"Error updating user last login at: {e!s}")
