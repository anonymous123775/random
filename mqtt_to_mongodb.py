import paho.mqtt.client as mqtt
from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS
import json

# MQTT settings
MQTT_BROKER = "localhost"
MQTT_PORT = 1883
MQTT_TOPIC = "iot/#"  # Subscribe to all topics under 'iot/'

# InfluxDB settings
INFLUXDB_URL = "http://localhost:8086"
INFLUXDB_TOKEN = "UazZ2vrlpsvTcOfUHXB2i9a-MKmW0zeFdJ4g4GJWcYS5_a0Rz_E6OXycF0UosWc3QEyxo4qPvRA5C-6-Uy4-wQ=="
INFLUXDB_ORG = "iot_monitoring"
INFLUXDB_BUCKET = "iot_machine_data"

# Initialize InfluxDB client
influxdb_client = InfluxDBClient(url=INFLUXDB_URL, token=INFLUXDB_TOKEN, org=INFLUXDB_ORG)
write_api = influxdb_client.write_api(write_options=SYNCHRONOUS)

def on_connect(client, userdata, flags, rc):
    print(f"Connected with result code {rc}")
    client.subscribe(MQTT_TOPIC)

def on_message(client, userdata, msg):
    print(f"Received message on topic {msg.topic}")
    try:
        data = json.loads(msg.payload.decode())
        
        data["humidity"] = float(data["humidity"])
        data["temperature"] = float(data["temperature"])
        data["power_supply"] = float(data["power_supply"])
        data["vibration"] = float(data["vibration"])
        
       
                
        
        write_api.write(bucket=INFLUXDB_BUCKET, org=INFLUXDB_ORG, record=point)
        print(f"Data written to InfluxDB: {data}")
    except Exception as e:
        print(f"Error processing message: {e}")

# Initialize MQTT client
mqtt_client = mqtt.Client()
mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message

try:
    # Connect to MQTT broker
    mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)

    # Start the MQTT client loop
    mqtt_client.loop_forever()
except Exception as e:
    print(f"Failed to connect to MQTT Broker: {e}")
