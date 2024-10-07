from sqlalchemy import Boolean, Column, Integer, String, DateTime
from database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    full_name = Column(String)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    disabled = Column(Boolean, default=False)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer)
    plant_id = Column(Integer)
    parameter = Column(String)
    threshold = Column(String)  # You can change the type according to your needs
    timestamp = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="unresolved")