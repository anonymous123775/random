from sqlalchemy import Boolean, Column, Integer, String, DateTime, Float, Enum
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
    threshold = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="unresolved")
    severity = Column(String)
    
class KPI(Base):
    __tablename__ = "kpis"
    
    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, nullable=False)
    plant_id = Column(Integer, nullable=False)
    uptime = Column(Float, nullable=True)
    downtime = Column(Float, nullable=True)
    failure_rate = Column(Float, nullable=True)
    num_alerts_triggered = Column(Integer, nullable=True)
    last_processed_timestamp = Column(DateTime, default=datetime.utcnow)  
    
    def __repr__(self):
        return (f"<KPI(plant_id={self.plant_id}, machine_id={self.machine_id}, "
                f"uptime={self.uptime}, downtime={self.downtime}, "
                f"num_alerts_triggered={self.num_alerts_triggered}, "
                f"failure_rate={self.failure_rate}, "
                f"last_processed_timestamp={self.last_processed_timestamp})>")
        
class LastFetchedTimestamp(Base):
    __tablename__ = "last_fetched_timestamps"
    
    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, index=True)
    plant_id = Column(Integer, index=True)
    last_timestamp = Column(DateTime)