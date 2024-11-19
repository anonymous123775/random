import asyncio
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from influxdb import InfluxDBClient
import traceback
from dotenv import load_dotenv
import os
from database import get_db  
from models import LastFetchedTimestamp

load_dotenv()

INFLUXDB_HOST = os.getenv("INFLUXDB_HOST")
INFLUXDB_PORT = 8086
INFLUXDB_DATABASE = "iot_machine_data"
FILTERED_DATABASE = "filtered_iot_machine_data"

client = InfluxDBClient(host=INFLUXDB_HOST, port=INFLUXDB_PORT, database=INFLUXDB_DATABASE)
filtered_client = InfluxDBClient(host=INFLUXDB_HOST, port=INFLUXDB_PORT, database=FILTERED_DATABASE)

async def filter_and_store_data(machine_id: int, plant_id: int, data):
    filtered_data = {
        "temperature": [],
        "humidity": [],
        "power_supply": [],
        "vibration": []
    }
    previous_values = {}
    
    for param in filtered_data.keys():
        query = f'SELECT "{param}" FROM "{param}" WHERE "machine_id" = {machine_id} AND "plant_id" = {plant_id}'
        result = filtered_client.query(query)
        if result:
            last_point = list(result.get_points())[0]
            previous_values[param] = last_point[param]
        else:
            previous_values[param] = None

    for point in data:
        current_values = {
            "temperature": point['temperature'],
            "humidity": point['humidity'],
            "power_supply": point['power_supply'],
            "vibration": point['vibration']
        }
        
        for param in current_values:
            if current_values[param] != previous_values.get(param):
                filtered_data[param].append({
                    "measurement": param,
                    "fields": {
                        "machine_id": machine_id,
                        "plant_id": plant_id,
                        param: current_values[param]
                    },
                    "time": point['time'],
                })
                previous_values[param] = current_values[param]

    for param, points in filtered_data.items():
        if points:
            filtered_client.write_points(points)

async def get_last_processed_timestamp(machine_id: int, plant_id: int):
    db: Session = next(get_db())
    try:
        record = db.query(LastFetchedTimestamp).filter(LastFetchedTimestamp.machine_id == machine_id, LastFetchedTimestamp.plant_id == plant_id).first()
        if record:
            return record.last_timestamp
        return None
    except Exception as e:
        print(f"Exception in get last processed timestamp : {e}")
        traceback.print_exc()
    finally:
        db.close()

async def update_last_processed_timestamp(machine_id: int, plant_id: int, last_timestamp: datetime):
    db: Session = next(get_db())
    try:
        record = db.query(LastFetchedTimestamp).filter(LastFetchedTimestamp.machine_id == machine_id, LastFetchedTimestamp.plant_id == plant_id).first()
        if record:
            record.last_timestamp = last_timestamp
        else:
            new_record = LastFetchedTimestamp(machine_id=machine_id, plant_id=plant_id, last_timestamp=last_timestamp)
            db.add(new_record)
        db.commit()
    except Exception as e:
        print(f"Exception occured in update last timestamp : {e}")
        traceback.print_exc()
    finally:
        db.close()

async def process_data_bucket(machine_id: int, plant_id: int, data_bucket: list):
    if len(data_bucket) >= 10:
        await filter_and_store_data(machine_id, plant_id, data_bucket)
        data_bucket.clear()

def get_distinct_machine_count():
    try:
        results = client.query("SELECT DISTINCT(\"machine_id\") FROM \"machine_data\"")
        if list(results):
            machine_ids = [item['distinct'] for item in list(results)[0]]
            return {"distinct_machine_count": machine_ids}   
    except Exception as e:
        print(f"An error occurred: {e}")
        return {"error": str(e)}


def get_distinct_plant_count():
    try:
        results = client.query("SELECT DISTINCT(plant_id) FROM machine_data")
        if results:
            plant_ids = [item['distinct'] for item in list(results)[0]]
            return {"distinct_plant_count": plant_ids}   
    except Exception as e:
        print(f"An error occurred: {e}")
        return {"error": str(e)}
    

async def continuous_filter_and_store():
    plants = get_distinct_plant_count()
    machines = get_distinct_machine_count()
    plant_ids = plants.get('distinct_plant_count')
    machine_ids = machines.get('distinct_machine_count')
    
    data_buckets = {machine_id: [] for machine_id in machine_ids}  
    last_timestamps = {} 
    
    while True:
        for plant_id in plant_ids:
            for machine_id in machine_ids:
                if machine_id not in last_timestamps:
                    last_timestamp = await get_last_processed_timestamp(machine_id, plant_id)
                    if last_timestamp:
                        last_timestamps[machine_id] = int(last_timestamp.timestamp() * 1e9)
                    else:
                        last_timestamps[machine_id] = int((datetime.utcnow() - timedelta(days=365)).timestamp() * 1e9)
                
                query = f'''
                    SELECT * FROM "machine_data" 
                    WHERE "machine_id" = {machine_id} AND "plant_id" = {plant_id}
                    AND time > {last_timestamps[machine_id]}
                '''
                
                try:
                    result = client.query(query)
                    
                    # print("data retrieved for machine", machine_id, "plant_id", plant_id)
                    if result:
                        for point in list(result)[0]:
                            data_point = {
                                "time": point['time'],
                                "machine_id": point['machine_id'],
                                "plant_id": point['plant_id'],
                                "temperature": point['temperature'],
                                "humidity": point['humidity'],
                                "power_supply": point['power_supply'],
                                "vibration": point['vibration'],
                                "machine_status": point['machine_status'],
                            }
                            data_buckets[machine_id].append(data_point)

                            last_timestamps[machine_id] = int(datetime.strptime(point['time'], '%Y-%m-%dT%H:%M:%S.%fZ').timestamp() * 1_000_000_000)
                        
                  
                        
                        await process_data_bucket(machine_id, plant_id, data_buckets[machine_id])
        
                        if len(data_buckets[machine_id]) == 0:
                            print(f"data processed for machine {machine_id} plant {plant_id} timestamp {last_timestamps[machine_id]}")
                            await update_last_processed_timestamp(machine_id, plant_id,
                                                                  datetime.fromtimestamp(last_timestamps[machine_id] / 1_000_000_000))
                        
                except Exception as e:
                    print(f"An error occurred while querying InfluxDB: {e}")
                    
        await asyncio.sleep(5)

if __name__ == "__main__":
    asyncio.run(continuous_filter_and_store())