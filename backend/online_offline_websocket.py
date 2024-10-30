# websocket.py

from influxdb import InfluxDBClient
from fastapi import WebSocket, HTTPException, WebSocketDisconnect
from datetime import datetime, timedelta
import logging
import asyncio
from dotenv import load_dotenv
import os

load_dotenv()

# InfluxDB settings
INFLUXDB_HOST = os.getenv("INFLUXDB_HOST")
INFLUXDB_PORT = 8086
INFLUXDB_DATABASE = "iot_machine_data"

# Initialize InfluxDB client
client = InfluxDBClient(host=INFLUXDB_HOST, port=INFLUXDB_PORT, database=INFLUXDB_DATABASE)

# Set up logging
logger = logging.getLogger(__name__)

async def get_machine_status_counts_and_list(plant_id: str):
    try:
        # Current time and time one minute ago
        current_time = datetime.utcnow()
        one_minute_ago = current_time - timedelta(minutes=1)

        # Step 1: Query to get distinct machine IDs for the specified plant in the last 30 seconds
        machine_query = f'''
            SELECT DISTINCT("machine_id") FROM "machine_data" 
            WHERE "plant_id" = {plant_id}
        '''
        machine_results = client.query(machine_query)

        # Extract machine IDs from the query results
        machine_ids = [item['distinct'] for item in list(machine_results)[0]]
        
        # Initialize counts and list
        online_count = 0
        offline_count = 0
        unavailable_count = 0
        machines_list = []

        # Step 2: Iterate through each machine ID
        for machine_id in machine_ids:
            # Query to get the latest status of the machine in the last minute
            query = '''
                SELECT "machine_status", "machine_id", "time" 
                FROM "machine_data"
                WHERE time >= {} AND "plant_id" = {} AND "machine_id" = {}
            '''.format(int(one_minute_ago.timestamp() * 1e9), plant_id, machine_id)  # Convert to nanoseconds
            # print(query)
            results = client.query(query)
            # print(results)
            if results and len(list(results)) > 0:
                # Get the last data point for the machine
                last_point = list(results)[0][-1]  # Get the last entry in the results
                status = last_point['machine_status']
                last_time = last_point['time']
                
                # Check if the status update is within the last minute
                if last_time >= one_minute_ago.isoformat():
                    if status == 1:
                        online_count += 1
                        machines_list.append({"machine_id": machine_id, "status": "online"})
                    elif status == 0:
                        offline_count += 1
                        machines_list.append({"machine_id": machine_id, "status": "offline"})
                else:
                    # If no recent data, mark as unavailable
                    unavailable_count += 1
                    machines_list.append({"machine_id": machine_id, "status": "unavailable"})
            else:
                # If no data points found for the machine in the last minute
                unavailable_count += 1
                machines_list.append({"machine_id": machine_id, "status": "unavailable"})

        return {
            "online_count": online_count,
            "offline_count": offline_count,
            "unavailable_count": unavailable_count,
            "machines": machines_list
        }
    except Exception as e:
        logger.error(f"An error occurred while querying InfluxDB for machine status counts: {e}")
        raise HTTPException(status_code=500, detail="Error fetching machine status counts")
    
    
async def machine_status_websocket(websocket: WebSocket, plant_id : int):
    await websocket.accept()
    logger.info("WebSocket connection accepted")

    try:
        
        logger.info(f"Received plant ID: {plant_id}")

        while True:
            # Get the current counts of online, offline, and unavailable machines for the specified plant
            machine_status_counts = await get_machine_status_counts_and_list(plant_id)
            # Send the counts and list to the client
            await websocket.send_json(machine_status_counts)

            # Optionally, add a delay if necessary (e.g., 1 second)
            await asyncio.sleep(10)  # Adjust the sleep time as needed
            
    except WebSocketDisconnect:
        logger.info("Client disconnected")
        await websocket.close()

    except Exception as e:
        logger.error(f"An error occurred: {e}")
        await websocket.close()
