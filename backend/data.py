# from influxdb_client import InfluxDBClient
# import os

# # InfluxDB Configuration
# INFLUXDB_URL = os.getenv("INFLUXDB_URL", "http://localhost:8086")
# INFLUXDB_TOKEN = os.getenv("INFLUXDB_TOKEN", "z1SMuOYbG-nnEnjFPxjo_FrlpZkQofwBGJkE6z99oY19qL88IhHxgJqRkBWellbEOh-jvss2eyawuQva9DFkgg==")
# INFLUXDB_ORG = os.getenv("INFLUXDB_ORG", "company")
# INFLUXDB_BUCKET = os.getenv("INFLUXDB_BUCKET", "iot_machine_data")

# client = InfluxDBClient(url=INFLUXDB_URL, token=INFLUXDB_TOKEN, org=INFLUXDB_ORG)
# query_api = client.query_api()

# async def get_machine_and_plant_count():
#     # Query to fetch unique counts of machines and plants
#     plant_query = f'''
#         from(bucket: "{INFLUXDB_BUCKET}")
#     |> range(start: -1h)
#     |> filter(fn: (r) => r._measurement == "machine_data")
#     |> group(columns: ["plant_id"])
#     |> count()
#     '''

#     machine_query = f'''
#         from(bucket: "{INFLUXDB_BUCKET}")
#     |> range(start: -20s)
#     |> filter(fn: (r) => r._measurement == "machine_data")
#     '''
    
#     # Execute both queries
#     machine_result = query_api.query(machine_query)
#     plant_result = query_api.query(plant_query)

#     print(machine_result)
#     # Initialize counts
#     machines_count = 0
#     plants_count = 0

#     # Count the unique machine IDs
#     for table in machine_result:
#         print(table)
#         if "machine_id" in table.columns:
#             machines_count = len(table.records)  # Count unique machine IDs

#     # Count the unique plant IDs
#     for table in plant_result:
#         print(table)
#         if "plant_id" in table.columns:
#             plants_count = len(table.records)  # Count unique plant IDs

#     return machines_count, plants_count

from influxdb import InfluxDBClient
import asyncio
from fastapi import WebSocket
from datetime import datetime

# InfluxDB settings
INFLUXDB_HOST = "localhost"
INFLUXDB_PORT = 8086
INFLUXDB_DATABASE = "iot_machine_data"

# Initialize InfluxDB client
client = InfluxDBClient(host=INFLUXDB_HOST, port=INFLUXDB_PORT, database=INFLUXDB_DATABASE)


def get_distinct_machine_count():
    try:
        # Query for distinct machine IDs
        results = client.query("SHOW TAG VALUES ON \"iot_machine_data\" WITH KEY = \"machine_id\"")
        print(results)  # This will help you debug and see the structure of the results
        
        # Extract the machine IDs
        # The results are stored in a nested structure, we need to loop through to get the values
        machine_ids = [item['value'] for item in list(results)[0]]
        print(machine_ids)
        # Count distinct machine IDs
        distinct_count = len(machine_ids)
        return {"distinct_machine_count": distinct_count}   
    except Exception as e:
        print(f"An error occurred: {e}")
        return {"error": str(e)}


def get_distinct_plant_count():
    try:
        # Query for distinct machine IDs
        results = client.query("SHOW TAG VALUES ON \"iot_machine_data\" WITH KEY = \"plant_id\"")
        # print(results)  # This will help you debug and see the structure of the results
        
        # Extract the machine IDs
        # The results are stored in a nested structure, we need to loop through to get the values
        plant_ids = [item['value'] for item in list(results)[0]]
        # print(plant_ids)
        # Count distinct machine IDs
        distinct_count = len(plant_ids)
        return {"distinct_plant_count": distinct_count}   
    except Exception as e:
        print(f"An error occurred: {e}")
        return {"error": str(e)}
    
    
async def send_data_to_client(websocket: WebSocket, machine_id: int, plant_id: int):
    try:
        await websocket.accept()
        print("WebSocket connection accepted")
        # Your existing code to send data
    except Exception as e:
        print(f"An error occurred: {e}")
        await websocket.close()
    
    last_timestamp = int(datetime.utcnow().timestamp() * 1_000_000_000)  # Variable to track the last timestamp
    print(last_timestamp)

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
                    prev_data = new_data.copy()  # Update previous data after sending

            # Wait for a short period before the next query
            await asyncio.sleep(2)  # Adjust the frequency of updates as needed

        except Exception as e:
            print(f"An error occurred while querying InfluxDB: {e}")
            break  # Exit the loop on error
