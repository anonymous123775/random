from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserBase(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    disabled: Optional[bool] = None

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int

    class Config:
        orm_mode = True

# Additional schemas for other models

class NotificationBase(BaseModel):
    machine_id: int
    plant_id: int
    parameter: str
    threshold: float
    timestamp: Optional[datetime] = None
    status: Optional[str] = None

class Notification(NotificationBase):
    id: int

    class Config:
        orm_mode = True

class KPIBase(BaseModel):
    machine_id: int
    plant_id: int
    uptime: Optional[float] = None
    downtime: Optional[float] = None
    failure_rate: Optional[float] = None
    num_alerts_triggered: Optional[int] = None
    last_processed_timestamp: datetime

class KPI(KPIBase):
    id: int

    class Config:
        orm_mode = True


class UserUpdate(BaseModel):
    username: Optional[str]
    full_name: Optional[str]
    email: Optional[str]
    disabled: Optional[bool]