from influxdb import InfluxDBClient
import asyncio
from fastapi import WebSocket, HTTPException, Depends
from datetime import datetime, timedelta
import logging
from sqlalchemy.orm import Session
from models import LastFetchedTimestamp
from database import get_db
from dotenv import load_dotenv
import os

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# InfluxDB settings
INFLUXDB_HOST = os.getenv("INFLUXDB_HOST")
INFLUXDB_PORT = 8086
INFLUXDB_DATABASE = "iot_machine_data"
FILTERED_DATABASE = "filtered_iot_machine_data"

# Initialize InfluxDB client
client = InfluxDBClient(host=INFLUXDB_HOST, port=INFLUXDB_PORT, database=INFLUXDB_DATABASE)
filtered_client = InfluxDBClient(host=INFLUXDB_HOST, port=INFLUXDB_PORT, database=FILTERED_DATABASE)

def create_filtered_database():
    databases = client.get_list_database()
    if FILTERED_DATABASE not in [db['name'] for db in databases]:
        client.create_database(FILTERED_DATABASE)
        print("Filtered data db created")
        logger.info(f"Created database: {FILTERED_DATABASE}")
    print("Filtered data db already created")
        
        
def filter_and_store_data(machine_id: int, plant_id: int, data):
    filtered_data = {
        "temperature": [],
        "humidity": [],
        "power_supply": [],
        "vibration": []
    }
    previous_values = {}

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
    # print("Filterd data written to the filtered db in influxdb")


def get_last_processed_timestamp( machine_id: int, plant_id: int):
    db: Session = next(get_db())
    try:
        record = db.query(LastFetchedTimestamp).filter(LastFetchedTimestamp.machine_id == machine_id, LastFetchedTimestamp.plant_id == plant_id).first()
        if record:
            return record.last_timestamp
        return None
    except Exception:
        print(f"Exception in get last processed timestamp : {Exception}")
    finally:
        db.close()

def update_last_processed_timestamp( machine_id: int, plant_id: int, last_timestamp: datetime):
    db: Session = next(get_db())
    try:
        record = db.query(LastFetchedTimestamp).filter(LastFetchedTimestamp.machine_id == machine_id, LastFetchedTimestamp.plant_id == plant_id).first()
        if record:
            record.last_timestamp = last_timestamp
        else:
            new_record = LastFetchedTimestamp(machine_id=machine_id, plant_id=plant_id, last_timestamp=last_timestamp)
            db.add(new_record)
        db.commit()
    except Exception:
        print(f"Exception occured in update last timestamp : {Exception}")
    finally:
        db.close()
        
async def continuous_filter_and_store():

    plants = get_distinct_plant_count()
    machines = get_distinct_machine_count()
    plant_ids = plants.get('distinct_plant_count')
    machine_ids = machines.get('distinct_machine_count')
    
    print("plant ids in " , plant_ids)
    print("machine in " , machine_ids)
    for plant_id in plant_ids:
        for machine_id in machine_ids:
            last_timestamp = get_last_processed_timestamp(machine_id, plant_id)

            if last_timestamp:
                last_timestamp_ns = int(last_timestamp.timestamp() * 1e9)
            else:
                last_timestamp_ns = int((datetime.utcnow() - timedelta(days=365)).timestamp() * 1e9)
                
            
            query = f'''
                SELECT * FROM "machine_data" 
                WHERE "machine_id" = {machine_id} AND "plant_id" = {plant_id}
                AND time > {last_timestamp_ns}
            '''
            
            try:
                result = client.query(query)
                
                print("data retrieved for machine ", machine_id, " plant_id ", plant_id)
                new_data = []
                if(result):
                    for point in list(result)[0]:
                        new_data.append({
                            "time": point['time'],
                            "machine_id": point['machine_id'],
                            "plant_id": point['plant_id'],
                            "temperature": point['temperature'],
                            "humidity": point['humidity'],
                            "power_supply": point['power_supply'],
                            "vibration": point['vibration'],
                            "machine_status": point['machine_status'],
                        })
                        
                        last_timestamp_ns = int(datetime.strptime(point['time'], '%Y-%m-%dT%H:%M:%S.%fZ').timestamp() * 1_000_000_000)
                    print("length of data points retrieved :", len(list(result)[0]))
                    
                    filter_and_store_data(machine_id, plant_id, new_data)
                     
                    update_last_processed_timestamp(machine_id, plant_id,
                                                        datetime.fromtimestamp(last_timestamp_ns / 1_000_000_000))
                    
            except Exception as e:
                logger.error(f"An error occurred while querying InfluxDB: {e}")
                print(f"An error occurred while querying InfluxDB: {e}")



async def get_historical_machine_data(machineId: int, plantId: int, startTime: datetime, endTime: datetime):
    try:
        # Map timeframe to duration
        # print(machineId,plantId,timeframe)
        
        start_time_ns = int(startTime.timestamp() * 1e9)
        end_time_ns = int(endTime.timestamp() * 1e9)
        
        diff = (endTime - startTime).days

        # Query to fetch historical data
        query = f'''
            SELECT * FROM "machine_data"
            WHERE "machine_id" = {machineId} AND "plant_id" = {plantId}
            AND time > {start_time_ns} AND time <= {end_time_ns}
        '''
        
        # if(diff < 5):
        #     query += " GROUP BY time"
        
        result = client.query(query)
        
        data = []
        if result:
            for point in list(result)[0]:
                data.append({
                    "time": point['time'],
                    "machine_id": point['machine_id'],
                    "plant_id": point['plant_id'],
                    "temperature": point['temperature'],
                    "humidity": point['humidity'],
                    "power_supply": point['power_supply'],
                    "vibration": point['vibration'],
                    "machine_status": point['machine_status'],
                })
        return data
    except Exception as e:
        # print(query)
        print(f"An error occurred while querying InfluxDB get historical data: {e}")
        raise HTTPException(status_code=500, detail="Error fetching historical data")
    

async def get_historical_machine_data_param(machineId: int, plantId: int, startTime: datetime, endTime: datetime, param: str):
    try:

        start_time_ns = int(startTime.timestamp() * 1e9)
        end_time_ns = int(endTime.timestamp() * 1e9)
        
        diff = (endTime - startTime).days

        # Query to fetch historical data
        query = f'''
            SELECT * FROM "{param}"
            WHERE "machine_id" = {machineId} AND "plant_id" = {plantId}
            AND time > {start_time_ns} AND time <= {end_time_ns}
        '''
        
        result = filtered_client.query(query)
        
        data = []
        if result:
            for point in list(result)[0]:
                data.append({
                    "time": point['time'],
                    "machine_id": point['machine_id'],
                    "plant_id": point['plant_id'],
                    param : point[param],
                })
        return data
    except Exception as e:
        # print(query)
        print(f"An error occurred while querying InfluxDB get historical data: {e}")
        raise HTTPException(status_code=500, detail="Error fetching historical data")


async def get_historical_data(machineId: int, plantId: int, timeframe: str):
    try:
        # Map timeframe to duration
        # print(machineId,plantId,timeframe)
        unit_map = {
            'm': 'minutes',
            'h': 'hours',
        }
        unit = unit_map[timeframe[-1]]
        duration = int(timeframe[:-1])
        start_time = datetime.utcnow() - timedelta(**{unit: duration})

        # Query to fetch historical data
        query = f'''
            SELECT * FROM "machine_data"
            WHERE "machine_id" = {machineId} AND "plant_id" = {plantId}
            AND time >= '{start_time.isoformat()}Z'
            ORDER BY time ASC
        '''
        
        # print(query)
        
        result = client.query(query)
        
        # print(list(result)[0])
        
        
        data = []
        if result:
            for point in list(result)[0]:
                data.append({
                    "time": point['time'],
                    "machine_id": point['machine_id'],
                    "plant_id": point['plant_id'],
                    "temperature": point['temperature'],
                    "humidity": point['humidity'],
                    "power_supply": point['power_supply'],
                    "vibration": point['vibration'],
                    "machine_status": point['machine_status'],
                })
        return data
    except Exception as e:
        # print(query)
        print(f"An error occurred while querying InfluxDB get historical data: {e}")
        raise HTTPException(status_code=500, detail="Error fetching historical data")

def get_distinct_machine_count():
    try:
        # Query for distinct machine IDs
        results = client.query("SELECT DISTINCT(\"machine_id\") FROM \"machine_data\"")
        # print((results))  # This will help you debug and see the structure of the results
        
        # Extract the machine IDs
        # The results are stored in a nested structure, we need to loop through to get the values
        if list(results):
            machine_ids = [item['distinct'] for item in list(results)[0]]
            # print(machine_ids)
            # Count distinct machine IDs
            # distinct_count = len(machine_ids)
            return {"distinct_machine_count": machine_ids}   
    except Exception as e:
        print(f"An error occurred: {e}")
        return {"error": str(e)}


def get_distinct_plant_count():
    try:
        # Query for distinct machine IDs
        results = client.query("SELECT DISTINCT(plant_id) FROM machine_data")
        # print(results)  # This will help you debug and see the structure of the results
        
        # Extract the machine IDs
        # The results are stored in a nested structure, we need to loop through to get the values
        if results:
            plant_ids = [item['distinct'] for item in list(results)[0]]
            # print(plant_ids)
            # Count distinct machine IDs
            # distinct_count = len(plant_ids)
            return {"distinct_plant_count": plant_ids}   
    except Exception as e:
        print(f"An error occurred: {e}")
        return {"error": str(e)}
    
    
async def send_data_to_client(websocket: WebSocket, machine_id: int, plant_id: int):
    try:
        await websocket.accept()
        print(f"WebSocket connection accepted for machine id {machine_id} and plantid {plant_id}")
        # Your existing code to send data
    except Exception as e:
        print(f"An error occurred: {e}")
        await websocket.close()
    
    last_timestamp = int(datetime.utcnow().timestamp() * 1_000_000_000)  # Variable to track the last timestamp
    # print(last_timestamp)

    prev_data = None

    while True:
        # Build the query to fetch new records
        query = f'''
            SELECT * FROM "machine_data" 
            WHERE machine_id = {machine_id} AND plant_id = {plant_id}
            AND time > {last_timestamp}
            ORDER BY time DESC 
            LIMIT 1
        '''
        try:
            result = client.query(query)
            new_data = []
            if(result):
                for point in list(result)[0]:
                    new_data.append({
                        "time": point['time'],
                        "machine_id": point['machine_id'],
                        "plant_id": point['plant_id'],
                        "temperature": point['temperature'],
                        "humidity": point['humidity'],
                        "power_supply": point['power_supply'],
                        "vibration": point['vibration'],
                        "machine_status": point['machine_status'],
                    })

                    # Update last timestamp for the next query
                    last_timestamp = int(datetime.strptime(point['time'], '%Y-%m-%dT%H:%M:%S.%fZ').timestamp() * 1_000_000_000)
                
                # Send new data to the client if it's different from the previous data
                if new_data:
                    if prev_data is None or prev_data[-1]['time'] != new_data[-1]['time']:
                        await websocket.send_json(new_data)
                        prev_data = new_data.copy()  
            await asyncio.sleep(3)

        except Exception as e:
            logger.error(f"An error occurred while querying InfluxDB in WebSocket real-time data: {e}")
            print(f"An error occurred while querying InfluxDB in websocket realtime data: {e}")
            break  # Exit the loop on error
