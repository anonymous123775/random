from datetime import datetime, timedelta
from influxdb import InfluxDBClient
from sqlalchemy.orm import Session
from database import get_db
from models import KPI, Notification
from typing import List

# InfluxDB settings
INFLUXDB_HOST = "localhost"
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

        # Query distinct plant IDs from InfluxDB
        plant_query = 'SHOW TAG VALUES ON "iot_machine_data" WITH KEY = "plant_id"'
        plant_results = client.query(plant_query)
        plant_ids = [item['value'] for item in list(plant_results.get_points())]

        for plant_id in plant_ids:
            # For each plant, get distinct machine IDs
            machine_query = f'SHOW TAG VALUES ON "iot_machine_data" WITH KEY = "machine_id" WHERE "plant_id" = \'{plant_id}\''
            machine_results = client.query(machine_query)
            machine_ids = [item['value'] for item in list(machine_results.get_points())]

            for machine_id in machine_ids:
                key = f"{plant_id}-{machine_id}"
                # Determine the start time for KPI calculation
                start_time = last_processed_timestamps.get(key, current_time - timedelta(days=1))

                # Fetch data points for this time range
                data_query = f'''
                    SELECT * FROM "machine_data" 
                    WHERE "plant_id" = '{plant_id}' AND "machine_id" = '{machine_id}'
                    AND time > '{start_time}' AND time <= '{current_time}'
                '''
                data_results = client.query(data_query)

                # Calculate KPIs based on the data
                uptime, downtime, num_alerts = await calculate_kpi_values(data_results, machine_id, plant_id, start_time, current_time)

                # Save/update KPI entry in the SQLite database
                save_kpi_data(db, plant_id, machine_id, uptime, downtime, num_alerts, current_time)

    except Exception as e:
        print(f"An error occurred while calculating KPIs: {e}")
    finally:
        db.close()

async def calculate_kpi_values(data_results, machine_id, plant_id, start_time, end_time):
    uptime = 0
    downtime = 0
    num_alerts = 0
    points = list(data_results.get_points())

    if not points:
        return uptime, downtime, num_alerts

    # Iterate through data points to calculate uptime, downtime, and alerts
    for i in range(1, len(points)):
        start_point = points[i - 1]
        end_point = points[i]

        start_time_point = datetime.strptime(start_point['time'], "%Y-%m-%dT%H:%M:%SZ")
        end_time_point = datetime.strptime(end_point['time'], "%Y-%m-%dT%H:%M:%SZ")
        duration = (end_time_point - start_time_point).total_seconds() / 60  # duration in minutes

        if start_point['machine_status'] == 1:  # Assuming machine_status is 1 for 'online'
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

    return uptime, downtime, num_alerts

def save_kpi_data(db: Session, plant_id: int, machine_id: int, uptime: float, downtime: float, num_alerts: int, timestamp: datetime):
    existing_entry = db.query(KPI).filter(
        KPI.plant_id == plant_id,
        KPI.machine_id == machine_id
    ).first()

    if existing_entry:
        # Update existing KPI
        existing_entry.uptime += uptime
        existing_entry.downtime += downtime
        total_duration = existing_entry.uptime + existing_entry.downtime
        existing_entry.num_alerts_triggered += num_alerts
        existing_entry.failure_rate = existing_entry.num_alerts_triggered / total_duration if total_duration > 0 else 0.0
        existing_entry.last_processed_timestamp = timestamp
    else:
        # Insert new KPI
        total_duration = uptime + downtime
        failure_rate = num_alerts / total_duration if total_duration > 0 else 0.0
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

        # print(f"Inserted new KPI data for plant_id: {plant_id}, machine_id: {machine_id}")
        # print(f"Inserted data: {new_kpi}")

    # print(f"KPI data saved for plant_id: {plant_id}, machine_id: {machine_id}")


def get_num_failures_month(db: Session, month: int, year: int, machine_id: str, plant_id: str):
    start_date = datetime(year, month, 1)
    end_date = (start_date + timedelta(days=32)).replace(day=1)  # First day of the next month
    
    alerts = db.query(Notification).filter(
        Notification.timestamp >= start_date,
        Notification.timestamp < end_date,
        Notification.machine_id == machine_id,
        Notification.plant_id == plant_id
    ).all()
    
    # Initialize alert counts for all days in the month
    alert_counts = {day: 0 for day in range(1, (end_date - start_date).days + 1)}
    
    for alert in alerts:
        day_key = alert.timestamp.day
        alert_counts[day_key] += 1
    
    return [{"day": day, "failures": count} for day, count in alert_counts.items()]