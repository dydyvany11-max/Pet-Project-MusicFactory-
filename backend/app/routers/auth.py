from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import database
from app.deps import get_db
from app.schemas import LoginIn, RegisterIn, UserOut
from app.services import hash_password, is_admin_user

router = APIRouter(prefix='/auth', tags=['auth'])


def as_user_out(user: database.User) -> UserOut:
    return UserOut(
        id=user.id,
        username=user.username,
        email=user.email,
        is_admin=is_admin_user(user.username, user.email),
    )


@router.post('/register', response_model=UserOut)
def register_user(payload: RegisterIn, db: Session = Depends(get_db)):
    username = payload.username.strip()
    email = payload.email.strip().lower()

    if len(username) < 3:
        raise HTTPException(status_code=400, detail='Username must be at least 3 characters')
    if len(payload.password) < 4:
        raise HTTPException(status_code=400, detail='Password must be at least 4 characters')

    user = database.User(
        username=username,
        email=email,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='Username or email already exists')
    db.refresh(user)
    return as_user_out(user)


@router.post('/login', response_model=UserOut)
def login_user(payload: LoginIn, db: Session = Depends(get_db)):
    login = payload.login.strip()
    user = (
        db.query(database.User)
        .filter((database.User.username == login) | (database.User.email == login.lower()))
        .first()
    )
    if not user or user.hashed_password != hash_password(payload.password):
        raise HTTPException(status_code=401, detail='Invalid credentials')
    return as_user_out(user)


@router.get('/users/{user_id}', response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(database.User).filter(database.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    return as_user_out(user)
