from datetime import datetime, timedelta, timezone
from influxdb import InfluxDBClient
from sqlalchemy.orm import Session
from database import get_db
from fastapi import HTTPException
from models import KPI, Notification
import logging
from mongodb_logger import log_to_mongodb
from dotenv import load_dotenv
import os

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


INFLUXDB_HOST = os.getenv("INFLUXDB_HOST")
INFLUXDB_PORT = 8086
INFLUXDB_DATABASE = "iot_machine_data"

client = InfluxDBClient(host=INFLUXDB_HOST, port=INFLUXDB_PORT, database=INFLUXDB_DATABASE)

async def calculate_kpis():
    db: Session = next(get_db())
    try:
        current_time = datetime.utcnow()

        last_processed_query = db.query(KPI).all()
        last_processed_timestamps = {f"{entry.plant_id}-{entry.machine_id}": entry.last_processed_timestamp for entry in last_processed_query}
    
        plant_query = 'SELECT DISTINCT("plant_id") FROM "machine_data"'
        plant_results = client.query(plant_query)
        plant_ids = [item['distinct'] for item in list(plant_results)[0]]
        for plant_id in plant_ids:
            machine_query = f'SELECT DISTINCT("machine_id") FROM "machine_data" WHERE "plant_id" = {plant_id}'
            machine_results = client.query(machine_query)
            machine_ids = [item['distinct'] for item in list(machine_results)[0]]
            for machine_id in machine_ids:
                key = f"{plant_id}-{machine_id}"
                start_time = last_processed_timestamps.get(key, current_time - timedelta(days=1))
                data_query = f'''
                    SELECT * FROM "machine_data" 
                    WHERE "plant_id" = {plant_id} AND "machine_id" = {machine_id}
                    AND time > '{start_time}' AND time <= '{current_time}'
                '''
                data_results = client.query(data_query)

                uptime, downtime, num_alerts = await calculate_kpi_values(data_results, machine_id, plant_id, start_time, current_time)

                save_kpi_data(db, plant_id, machine_id, uptime, downtime, num_alerts, current_time)
                
                kpi_log_data = {
                    "plant_id": plant_id,
                    "machine_id": machine_id,
                    "uptime": uptime,
                    "downtime": downtime,
                    "num_alerts_triggered": num_alerts,
                    "timestamp": current_time.isoformat()
                }
                await log_to_mongodb("info", kpi_log_data)

    except Exception as e:
        print(f"An error occurred while calculating KPIs: {e}")
    finally:
        db.close()

async def calculate_kpi_values(data_results, machine_id, plant_id, start_time, end_time):
    uptime = 0
    downtime = 0
    num_alerts = 0

    points = list(data_results)

    if not points:
        return uptime, downtime, num_alerts
    
    points = points[0]

    if len(points) > 1:
        for i in range(1, len(points)):
            if datetime.strptime(points[i]["time"], "%Y-%m-%dT%H:%M:%S.%fZ") > start_time:
                start_point = points[i - 1]
                end_point = points[i]

                start_time_point = datetime.strptime(start_point['time'], "%Y-%m-%dT%H:%M:%S.%fZ")
                end_time_point = datetime.strptime(end_point['time'], "%Y-%m-%dT%H:%M:%S.%fZ")
                duration = (end_time_point - start_time_point).total_seconds() / 60  

                if start_point['machine_status'] == 1:  
                    uptime += duration
                else:
                    downtime += duration
                    
    elif len(points) == 1:
        start_time_point = start_time
        end_time_point = datetime.strptime(points[0]['time'], "%Y-%m-%dT%H:%M:%S.%fZ")
        duration = (end_time_point - start_time_point).total_seconds() / 60

        if points[0]['machine_status'] == 1: 
            uptime += duration
        else:
            downtime += duration
            
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
    
    return data
    
    
    
async def get_machine_status_counts_and_list(plant_id: str):
    try:
        current_time = datetime.utcnow()
        one_minute_ago = current_time - timedelta(minutes=1)
        query = '''
            SELECT last("machine_status") AS "status", "machine_id", "time"
            FROM "machine_data"
            WHERE time >= {} AND "plant_id" = '{}'
            GROUP BY "machine_id"
        '''.format(int(one_minute_ago.timestamp() * 1e9), plant_id) 

        results = client.query(query)

        online_count = 0
        offline_count = 0
        unavailable_count = 0
        machines_list = []

        for point in list(results)[0]:
            machine_id = point['machine_id']
            status = point['status']
            last_time = point['time']

            if last_time >= one_minute_ago.isoformat():
                if status == 'online':
                    online_count += 1
                    machines_list.append({"machine_id": machine_id, "status": "online"})
                elif status == 'offline':
                    offline_count += 1
                    machines_list.append({"machine_id": machine_id, "status": "offline"})
            else:
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

        start_time_ns = int(startTime.timestamp() * 1e9)
        end_time_ns = int(endTime.timestamp() * 1e9)

        data_query = f'''
            SELECT * FROM "machine_data" 
            WHERE "plant_id" = {plant_id} AND "machine_id" = {machine_id}
            AND time > {start_time_ns} AND time <= {end_time_ns}
        '''
        data_results = client.query(data_query)
        uptime, downtime, num_alerts = calculate_kpi_values_no(data_results, machine_id, plant_id, startTime, endTime,db)

        result = {
            "plant_id": plant_id,
            "machine_id": machine_id,
            "uptime": uptime,
            "downtime": downtime,
            "num_alerts_triggered": num_alerts,
            "failure_rate": num_alerts/(uptime + downtime) if (uptime + downtime) > 0 else 0.0
        }

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
        return uptime, downtime, num_alerts
    
    points = points[0]

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

        if points['machine_status'] == 1:
            uptime += duration
        else:
            downtime += duration
            
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

