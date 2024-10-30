import paho.mqtt.client as mqtt
from influxdb import InfluxDBClient
import json
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
import os
import dotenv
import config

dotenv.load_dotenv()


MQTT_BROKER = config.BROKER
MQTT_PORT = config.PORT
MQTT_TOPIC = "iot/#" 

# InfluxDB settings
INFLUXDB_HOST = config.BROKER
INFLUXDB_PORT = 8086
INFLUXDB_DATABASE = os.getenv('INFLUXDB_NAME')

# Initialize InfluxDB client for InfluxDB 1.8
influxdb_client = InfluxDBClient(host=INFLUXDB_HOST, port=INFLUXDB_PORT)
influxdb_client.switch_database(INFLUXDB_DATABASE)

# Initialize a thread pool with a suitable number of worker threads
thread_pool = ThreadPoolExecutor(max_workers=10)

def on_connect(client, userdata, flags, rc):
    print(f"Connected with result code {rc}")
    client.subscribe(MQTT_TOPIC)

def on_message(client, userdata, msg):
    # print(f"Received message on topic {msg.topic}")
    thread_pool.submit(process_message, msg)

def process_message(msg):
    try:
        data = json.loads(msg.payload.decode())

        # Ensure the necessary fields are present and correctly formatted
        data["humidity"] = float(data["humidity"])
        data["temperature"] = float(data["temperature"])
        data["power_supply"] = float(data["power_supply"])
        data["vibration"] = float(data["vibration"])
        machine_status = 1 if data["machine_status"].lower() == "online" else 0
        # print(machine_status)
        
        influx_data = [
            {
                "measurement": "machine_data",
                "fields": {
                    "temperature": data["temperature"],
                    "humidity": data["humidity"],
                    "power_supply": data["power_supply"],
                    "vibration": data["vibration"],
                    "machine_status": int(machine_status),
                    "plant_id": data["plant_id"],
                    "machine_id": data["machine_id"]
                },
                "time": datetime.utcnow().isoformat()  # Ensure proper timestamp formatting
            }
        ]

        # Write the data to InfluxDB
        influxdb_client.write_points(influx_data)
        # print(f"Data written to InfluxDB: {data}")
    except Exception as e:
        print(f"Error processing message: {e}")

# Initialize MQTT client
mqtt_client = mqtt.Client()
mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message
mqtt_client.username_pw_set(username=os.getenv('MQTT_USERNAME'),password=os.getenv('MQTT_PASSWORD'))

try:
    # Connect to MQTT broker
    mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)

    # Start the MQTT client loop
    mqtt_client.loop_forever()
except Exception as e:
    print(f"Failed to connect to MQTT Broker: {e}")
finally:
    # Shutdown the thread pool
    thread_pool.shutdown(wait=True)
