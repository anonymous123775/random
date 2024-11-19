from sqlalchemy import Column, Integer, DateTime
from database import Base

class LastFetchedTimestamp(Base):
    __tablename__ = "last_fetched_timestamps"
    
    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, index=True)
    plant_id = Column(Integer, index=True)
    last_timestamp = Column(DateTime)
