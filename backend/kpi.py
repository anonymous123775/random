from datetime import datetime, timedelta, timezone
from influxdb import InfluxDBClient
from sqlalchemy.orm import Session
from database import get_db
from models import KPI, Notification
import logging
from mongodb_logger import log_to_mongodb
from dotenv import load_dotenv
import os

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# InfluxDB settings
INFLUXDB_HOST = os.getenv("INFLUXDB_HOST")
INFLUXDB_PORT = 8086
INFLUXDB_DATABASE = "iot_machine_data"

# Initialize InfluxDB client
client = InfluxDBClient(host=INFLUXDB_HOST, port=INFLUXDB_PORT, database=INFLUXDB_DATABASE)

async def calculate_kpis():
    db: Session = next(get_db())  # Get DB session
    try:
        # Get the current time
        current_time = datetime.utcnow()

        # Query the last processed timestamp for each machine
        last_processed_query = db.query(KPI).all()
        last_processed_timestamps = {f"{entry.plant_id}-{entry.machine_id}": entry.last_processed_timestamp for entry in last_processed_query}
        # print(last_processed_timestamps)
        # Query distinct plant IDs from InfluxDB
        plant_query = 'SELECT DISTINCT("plant_id") FROM "machine_data"'
        plant_results = client.query(plant_query)
        # print(list(plant_results))
        plant_ids = [item['distinct'] for item in list(plant_results)[0]]
        # print(plant_ids)
        for plant_id in plant_ids:
            # For each plant, get distinct machine IDs
            machine_query = f'SELECT DISTINCT("machine_id") FROM "machine_data" WHERE "plant_id" = {plant_id}'
            machine_results = client.query(machine_query)
            machine_ids = [item['distinct'] for item in list(machine_results)[0]]
            # print(plant_ids)
            for machine_id in machine_ids:
                key = f"{plant_id}-{machine_id}"
                # Determine the start time for KPI calculation
                start_time = last_processed_timestamps.get(key, current_time - timedelta(days=1))

                # Fetch data points for this time range
                data_query = f'''
                    SELECT * FROM "machine_data" 
                    WHERE "plant_id" = {plant_id} AND "machine_id" = {machine_id}
                    AND time > '{start_time}' AND time <= '{current_time}'
                '''
                data_results = client.query(data_query)

                # Calculate KPIs based on the data
                uptime, downtime, num_alerts = await calculate_kpi_values(data_results, machine_id, plant_id, start_time, current_time)

                # Save/update KPI entry in the SQLite database
                save_kpi_data(db, plant_id, machine_id, uptime, downtime, num_alerts, current_time)
                
                # Log KPI data to MongoDB
                kpi_log_data = {
                    "plant_id": plant_id,
                    "machine_id": machine_id,
                    "uptime": uptime,
                    "downtime": downtime,
                    "num_alerts_triggered": num_alerts,
                    "timestamp": current_time.isoformat()
                }
                await log_to_mongodb("info", kpi_log_data)

        # print("KPIs calculated and stored successfully.")

    except Exception as e:
        print(f"An error occurred while calculating KPIs: {e}")
    finally:
        db.close()

async def calculate_kpi_values(data_results, machine_id, plant_id, start_time, end_time):
    uptime = 0
    downtime = 0
    num_alerts = 0
    # failure_events = 0
    # total_duration = 0

    points = list(data_results)

    # print(points)

    if not points:
        # print("points is empty")
        return uptime, downtime, num_alerts
    
    points = points[0]
    # print(points)

    # Iterate through data points to calculate uptime, downtime, and alerts
    if len(points) > 1:
        for i in range(1, len(points)):
            if datetime.strptime(points[i]["time"], "%Y-%m-%dT%H:%M:%S.%fZ") > start_time:
                start_point = points[i - 1]
                end_point = points[i]

                start_time_point = datetime.strptime(start_point['time'], "%Y-%m-%dT%H:%M:%S.%fZ")
                end_time_point = datetime.strptime(end_point['time'], "%Y-%m-%dT%H:%M:%S.%fZ")
                duration = (end_time_point - start_time_point).total_seconds() / 60  # duration in minutes

                if start_point['machine_status'] == 1:  # Assuming machine_status is 1 for 'online'
                    uptime += duration
                else:
                    downtime += duration
                    
    elif len(points) == 1:
        start_time_point = start_time
        end_time_point = datetime.strptime(points[0]['time'], "%Y-%m-%dT%H:%M:%S.%fZ")
        duration = (end_time_point - start_time_point).total_seconds() / 60

        if points[0]['machine_status'] == 1:  # Assuming machine_status is 1 for 'online'
            uptime += duration
        else:
            downtime += duration

    # Calculate number of alerts triggered from the notifications stored in the database
    db: Session = next(get_db())
    try:
        num_alerts = db.query(Notification).filter(
            Notification.machine_id == machine_id,
            Notification.plant_id == plant_id,
            Notification.timestamp > start_time,
            Notification.timestamp <= end_time
        ).count()
    finally:
        db.close()

    # Calculate failure rate
    # failure_rate = failure_events / total_duration if total_duration > 0 else 0.0

    return uptime, downtime, num_alerts

def save_kpi_data(db, plant_id, machine_id, uptime, downtime, num_alerts , timestamp):
    if not isinstance(timestamp, datetime):
        timestamp = datetime.strptime(timestamp, "%Y-%m-%dT%H:%M:%S.%fZ")

    existing_entry = db.query(KPI).filter(
        KPI.plant_id == plant_id,
        KPI.machine_id == machine_id
    ).first()

    if existing_entry:
        existing_entry.uptime += uptime
        existing_entry.downtime += downtime
        total_duration = existing_entry.uptime + existing_entry.downtime + uptime + downtime
        existing_entry.num_alerts_triggered += num_alerts
        existing_entry.failure_rate = existing_entry.num_alerts_triggered / total_duration if total_duration > 0 else 0.0
        existing_entry.last_processed_timestamp = timestamp
        db.commit()
    else:
        total_duration = uptime + downtime
        failure_rate = num_alerts / total_duration
        new_kpi = KPI(
            plant_id=plant_id,
            machine_id=machine_id,
            uptime=uptime,
            downtime=downtime,
            num_alerts_triggered=num_alerts,
            failure_rate=failure_rate,
            last_processed_timestamp=timestamp
        )
        db.add(new_kpi)
        db.commit()

def get_num_failures_month(db: Session, month: int, year: int, machine_id: str, plant_id: str):
    start_date = datetime(year, month, 1)
    end_date = (start_date + timedelta(days=32)).replace(day=1) 
    
    alerts = db.query(Notification).filter(
        Notification.timestamp >= start_date,
        Notification.timestamp < end_date,
        Notification.machine_id == machine_id,
        Notification.plant_id == plant_id,
    ).all()

    
    
    alert_counts = {day: 0 for day in range(1, (end_date - start_date).days + 1)}
    
    for alert in alerts:
        day_key = alert.timestamp.day
        alert_counts[day_key] += 1
    
    return [{"day": day, "failures": count} for day, count in alert_counts.items()]

def get_num_failures_per_machine(db: Session, plant_id: str):
    alerts = db.query(Notification).filter(
        Notification.plant_id == plant_id,
        Notification.machine_id.isnot(None) 
    ).all()
    
    machine_failures = {}
    
    for alert in alerts:
        machine_id = alert.machine_id
        if machine_id not in machine_failures:
            machine_failures[machine_id] = 0
        machine_failures[machine_id] += 1
    
    # Sort the results by machine_id
    sorted_failures = sorted(machine_failures.items())
    
    return [{"machine_id": machine_id, "failures": count} for machine_id, count in sorted_failures]




def fetch_machine_kpis(machineId: int, plantId : int, db: Session):
    data = db.query(KPI).filter(
        KPI.machine_id == machineId,
        KPI.plant_id == plantId
    ).all()
    
    # print(f"KPI data for machine {machineId} plant {plantId} \n", data)
    
    return data
    
    
    
async def get_machine_status_counts_and_list(plant_id: str):
    try:
        # Current time and time one minute ago
        current_time = datetime.utcnow()
        one_minute_ago = current_time - timedelta(minutes=1)

        # Query to get the latest status of all machines in the last minute for the specific plant
        query = '''
            SELECT last("machine_status") AS "status", "machine_id", "time"
            FROM "machine_data"
            WHERE time >= {} AND "plant_id" = '{}'
            GROUP BY "machine_id"
        '''.format(int(one_minute_ago.timestamp() * 1e9), plant_id)  # Convert to nanoseconds

        results = client.query(query)

        online_count = 0
        offline_count = 0
        unavailable_count = 0
        machines_list = []

        # Check results and categorize machine statuses
        for point in list(results)[0]:
            machine_id = point['machine_id']
            status = point['status']
            last_time = point['time']

            # Check the time of the last status update
            if last_time >= one_minute_ago.isoformat():
                if status == 'online':
                    online_count += 1
                    machines_list.append({"machine_id": machine_id, "status": "online"})
                elif status == 'offline':
                    offline_count += 1
                    machines_list.append({"machine_id": machine_id, "status": "offline"})
            else:
                # If no recent data, mark as unavailable
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

async def fetch_machine_kpis_not_realtime(machine_id: str,plant_id: str,startTime:datetime, endTime:datetime,db: Session):
    try:
        
        # Fetch data points for the given time range from InfluxDB
        start_time_ns = int(startTime.timestamp() * 1e9)
        end_time_ns = int(endTime.timestamp() * 1e9)

        # Fetch data points for the given time range from InfluxDB
        data_query = f'''
            SELECT * FROM "machine_data" 
            WHERE "plant_id" = {plant_id} AND "machine_id" = {machine_id}
            AND time > {start_time_ns} AND time <= {end_time_ns}
        '''
        data_results = client.query(data_query)
        # print("startTime : ",start_time_ns, startTime)
        # print("endTime : ",end_time_ns,endTime)
        
        # print("data_results : ",data_results)
        # Calculate KPIs based on the data
        uptime, downtime, num_alerts = calculate_kpi_values_no(data_results, machine_id, plant_id, startTime, endTime,db)

        # Return the result with machine and plant id
        result = {
            "plant_id": plant_id,
            "machine_id": machine_id,
            "uptime": uptime,
            "downtime": downtime,
            "num_alerts_triggered": num_alerts,
            "failure_rate": num_alerts/(uptime + downtime) if (uptime + downtime) > 0 else 0.0
        }
        
        # print(result)

        return result

    except Exception as e:
        print(f"An error occurred while fetching and calculating KPIs: {e}")
        return None
    
def calculate_kpi_values_no(data_results, machine_id, plant_id, start_time, end_time, db: Session):
    uptime = 0
    downtime = 0
    num_alerts = 0

    points = list(data_results)

    if not points:
        # print("points is empty")
        return uptime, downtime, num_alerts
    
    points = points[0]

    # Iterate through data points to calculate uptime, downtime, and alerts
    if len(points) > 1:
        for i in range(1, len(points)):
            if datetime.strptime(points[i]["time"], "%Y-%m-%dT%H:%M:%S.%fZ").replace(tzinfo=timezone.utc) > start_time:
                start_point = points[i - 1]
                end_point = points[i]

                start_time_point = datetime.strptime(start_point['time'], "%Y-%m-%dT%H:%M:%S.%fZ").replace(tzinfo=timezone.utc)
                end_time_point = datetime.strptime(end_point['time'], "%Y-%m-%dT%H:%M:%S.%fZ").replace(tzinfo=timezone.utc)
                duration = (end_time_point - start_time_point).total_seconds() / 60  # duration in minutes

                if start_point['machine_status'] == 1:  # Assuming machine_status is 1 for 'online'
                    uptime += duration
                else:
                    downtime += duration

    elif len(points) == 1:
        start_time_point = start_time
        end_time_point = datetime.strptime(points['time'], "%Y-%m-%dT%H:%M:%S.%fZ").replace(tzinfo=timezone.utc)
        duration = (end_time_point - start_time_point).total_seconds() / 60

        if points['machine_status'] == 1:  # Assuming machine_status is 1 for 'online'
            uptime += duration
        else:
            downtime += duration

    # Calculate number of alerts triggered from the notifications stored in the database
    try:
        num_alerts = db.query(Notification).filter(
            Notification.machine_id == machine_id,
            Notification.plant_id == plant_id,
            Notification.timestamp > start_time,
            Notification.timestamp <= end_time
        ).count()
    finally:
        db.close()

    return uptime, downtime, num_alerts

