from sqlalchemy.orm import Session
import database


def get_db():
    db: Session = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()
