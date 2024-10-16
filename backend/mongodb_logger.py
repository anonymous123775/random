import logging 
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_DETAILS = os.getenv('MONGO_URL')
# print(MONGO_DETAILS)
client = AsyncIOMotorClient(MONGO_DETAILS)
db = client.get_database("Logs")
collection = db.get_collection("piyush")

logger = logging.getLogger('mongodb_logger')
logger.setLevel(logging.INFO)

async def get_next_logid():
    last_log = await collection.find_one(sort=[("Logid", -1)])
    if last_log:
        return last_log["Logid"] + 1
    return 1

async def log_to_mongodb(log_type: str, log_data: dict):
    logid = await get_next_logid()
    if(log_type == "alert"):
        log_data["iserrorlog"] = 1
    else:
        log_data["iserrorlog"] = 0 
    log_entry = {
        "Username": "Piyush",
        "Logid": logid,
        "Timestamp": datetime.utcnow().isoformat(),
        "Values": log_data
    }
    await collection.insert_one(log_entry)
    # logger.info(f"Logged {log_type} to MongoDB: {log_entry}")