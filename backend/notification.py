from influxdb import InfluxDBClient
import asyncio
from fastapi import WebSocket
from datetime import datetime
from sqlalchemy.orm import Session
from database import get_db
from models import Notification
from datetime import datetime
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_SERVER = "127.0.0.1"
SMTP_PORT = 25
SMTP_USERNAME = "admin@localdomain.com"  # The email you set up in hMailServer
SMTP_PASSWORD = "12345"  # Password for that email

async def send_email(to_address: str, subject: str, body: str):
    message = MIMEMultipart()
    message["From"] = SMTP_USERNAME
    message["To"] = to_address
    message["Subject"] = subject

    # Attach the email body
    message.attach(MIMEText(body, "plain"))

    try:
        await aiosmtplib.send(
            message,
            hostname=SMTP_SERVER,
            port=SMTP_PORT,
            username=SMTP_USERNAME,
            password=SMTP_PASSWORD,
        )
        print(f"Email sent to {to_address}")
    except Exception as e:
        print(f"Failed to send email: {e}")

# Retrieve email addresses from the SQLite database
async def get_email_list():
    # db: Session = next(get_db())
    # try:
    #     result = db.execute("SELECT email FROM users")  # Assuming users table has an email column
    #     return [row.email for row in result]
    # finally:
    #     db.close()
    return ['piyushbonde006@gmail.com']

# InfluxDB settings
INFLUXDB_HOST = "localhost"
INFLUXDB_PORT = 8086
INFLUXDB_DATABASE = "iot_machine_data"

# Initialize InfluxDB client
client = InfluxDBClient(host=INFLUXDB_HOST, port=INFLUXDB_PORT, database=INFLUXDB_DATABASE)

async def send_data_to_client(websocket: WebSocket):
    await websocket.accept()
    
    try:
        while True:
            # Step 1: Get distinct plant IDs
            plant_query = 'SELECT DISTINCT("plant_id") FROM "machine_data" WHERE "time" > now() - 30s'
            plant_results = client.query(plant_query)

            plant_ids = [item['distinct'] for item in list(plant_results)[0]]
            # print(plant_ids)
            new_data = []

            # Step 2: For each plant, get distinct machine IDs
            for plant_id in plant_ids:
                machine_query = f'''
                    SELECT DISTINCT("machine_id") FROM "machine_data" WHERE "plant_id" = {plant_id} AND "time" > now() - 30s
                '''
                machine_results = client.query(machine_query)
                # print(machine_results)
                machine_ids = [item['distinct'] for item in list(machine_results)[0]]
                # print(plant_id,machine_ids)
                # Step 3: For each machine, get the latest data entry
                for machine_id in machine_ids:
                    query = f'''
                        SELECT * FROM "machine_data" 
                        WHERE "machine_id" = {machine_id} 
                        ORDER BY time DESC 
                        LIMIT 1
                    '''
                    result = client.query(query)

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

                        # Call the notification handling function for each parameter
                        await handle_notifications(point, websocket)

            await asyncio.sleep(2)

    except Exception as e:
        print(f"An error occurred while querying InfluxDB in notifications websocket: {e}")


# Global dictionary to track last notification states for parameters
last_notification_states = {}

# Global dictionary to track machine online status
last_machine_status = {}

async def handle_notifications(point, websocket):
    if point['machine_id'] is None or point['plant_id'] is None:
        return  # Skip further processing for this point

    # Define thresholds
    thresholds = {
        "temperature": (40, 60),
        "humidity": (40, 50),
        "vibration": (0.2, 0.4),
        "power_supply": (230, 240),
    }

    # Initialize an empty list to hold notifications
    notifications = []
    
    machine_status = point['machine_status']
    
    if machine_status == 0:
        # Notify for offline status.
        if last_machine_status.get((point['plant_id'],point['machine_id'])) != "offline":
            severity = "error"
            notifications.append({
                "machine_id": point['machine_id'],
                "plant_id": point['plant_id'],
                "parameter": "status",
                "threshold": -1,
                "timestamp": point['time'],
                "severity": severity,
            })
        # Update last machine status to offline
        last_machine_status[(point['plant_id'],point['machine_id'])] = "offline"
    else:
        # Notify when machine comes back online
        if last_machine_status.get((point['plant_id'],point['machine_id'])) == "offline":
            notifications.append({
                "machine_id": point['machine_id'],
            "plant_id": point['plant_id'],
            "parameter": "status",
            "threshold": -1,
            "timestamp": point['time'],
            "severity": 'info',
            })

        # Update last machine status to online
        last_machine_status[(point['plant_id'],point['machine_id'])] = "online"



        # Iterate through thresholds and check each parameter
        for param, (lower, upper) in thresholds.items():
            value = point[param]
            
            if value is None:
                continue  # Skip the parameter if the value is None
            
            # Create a unique key for the current machine and parameter
            key = (point['machine_id'], point['plant_id'], param)

            # Get the last state from the global dictionary
            last_state = last_notification_states.get(key, None)

            # Check if the current value is out of bounds
            if value < lower or value > upper:
                # If the last state was normal (None or within bounds), send a notification
                if last_state is None or (last_state >= lower and last_state <= upper):
                    notifications.append({
                        "machine_id": point['machine_id'],
                        "plant_id": point['plant_id'],
                        "parameter": param,
                        "threshold": value,
                        "timestamp": point['time'],
                        "severity": "warning",
                    })
                    # Update the last notification state for this key
                    last_notification_states[key] = value  # Store the out-of-bounds value
            else:
                # If the current value is normal, reset the last state
                last_notification_states[key] = value  # Mark as normal

    # Store notifications in the database
    
    for notification in notifications:
        await store_notification(notification)
        # Send notification to the user
        await websocket.send_json({"notification": notification})
        
        email_list = await get_email_list()

        # Send email notifications to all users
        if notification["severity"] in ["warning", "error"]:
            for email in email_list:
                subject = f"Warning for Machine {notification['machine_id']}"
                body = f"""
                    Warning Notification:

                    Machine ID: {notification['machine_id']}
                    Plant ID: {notification['plant_id']}
                    Parameter: {notification['parameter']}
                    Current Value: {notification['threshold']}

                    Please check the machine status.
                """                
                await send_email(email, subject, body)


async def store_notification(notification):
    db: Session = next(get_db())  # Manually get the session from the generator
    try:
        # Parse the timestamp string into a datetime object
        timestamp_str = notification["timestamp"]
        timestamp_dt = datetime.strptime(timestamp_str, "%Y-%m-%dT%H:%M:%S.%fZ")
        
        # Create a new notification record
        new_notification = Notification(
            machine_id=notification["machine_id"],
            plant_id=notification["plant_id"],
            parameter=notification["parameter"],
            threshold=notification["threshold"],
            timestamp=timestamp_dt,
            status="unresolved",
            severity=notification["severity"],
        )
        
        # Add the new notification to the session and commit the transaction
        db.add(new_notification)
        db.commit()
        db.refresh(new_notification)
        
        return new_notification
    finally:
        db.close()  # Ensure that the session is closed after use
