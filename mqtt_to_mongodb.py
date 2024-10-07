# import paho.mqtt.client as mqtt
# from influxdb_client import InfluxDBClient, Point, WritePrecision
# from influxdb_client.client.write_api import SYNCHRONOUS
# import json
# from datetime import datetime

# # MQTT settings
# MQTT_BROKER = "localhost"
# MQTT_PORT = 1883
# MQTT_TOPIC = "iot/#"  # Subscribe to all topics under 'iot/'

# # InfluxDB settings
# INFLUXDB_URL = "http://localhost:8086"
# INFLUXDB_TOKEN = "z1SMuOYbG-nnEnjFPxjo_FrlpZkQofwBGJkE6z99oY19qL88IhHxgJqRkBWellbEOh-jvss2eyawuQva9DFkgg=="
# INFLUXDB_ORG = "company"
# INFLUXDB_BUCKET = "iot_machine_data"

# # Initialize InfluxDB client
# influxdb_client = InfluxDBClient(url=INFLUXDB_URL, token=INFLUXDB_TOKEN, org=INFLUXDB_ORG)
# write_api = influxdb_client.write_api(write_options=SYNCHRONOUS)

# def on_connect(client, userdata, flags, rc):
#     print(f"Connected with result code {rc}")
#     client.subscribe(MQTT_TOPIC)

# def on_message(client, userdata, msg):
#     print(f"Received message on topic {msg.topic}")
#     try:
#         data = json.loads(msg.payload.decode())
        
#         data["humidity"] = float(data["humidity"])
#         data["temperature"] = float(data["temperature"])
#         data["power_supply"] = float(data["power_supply"])
#         data["vibration"] = float(data["vibration"])
        
#         point = Point("machine_data") \
#             .tag("plant_id", data["plant_id"]) \
#             .tag("machine_id", data["machine_id"]) \
#             .field("temperature", data["temperature"]) \
#             .field("humidity", data["humidity"]) \
#             .field("power_supply", data["power_supply"]) \
#             .field("vibration", data["vibration"]) \
#             .field("machine_status", data["machine_status"])
                
#         write_api.write(bucket=INFLUXDB_BUCKET, org=INFLUXDB_ORG, record=point)
#         print(f"Data written to InfluxDB: {data}")
#     except Exception as e:
#         print(f"Error processing message: {e}")

# # Initialize MQTT client
# mqtt_client = mqtt.Client()
# mqtt_client.on_connect = on_connect
# mqtt_client.on_message = on_message

# try:
#     # Connect to MQTT broker
#     mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)

#     # Start the MQTT client loop
#     mqtt_client.loop_forever()
# except Exception as e:
#     print(f"Failed to connect to MQTT Broker: {e}")



import paho.mqtt.client as mqtt
from influxdb import InfluxDBClient
import json
from datetime import datetime

# MQTT settings
MQTT_BROKER = "localhost"
MQTT_PORT = 1883
MQTT_TOPIC = "iot/#"  # Subscribe to all topics under 'iot/'

# InfluxDB settings
INFLUXDB_HOST = "localhost"
INFLUXDB_PORT = 8086
INFLUXDB_DATABASE = "iot_machine_data"

# Initialize InfluxDB client for InfluxDB 1.8
influxdb_client = InfluxDBClient(host=INFLUXDB_HOST, port=INFLUXDB_PORT)
influxdb_client.switch_database(INFLUXDB_DATABASE)

def on_connect(client, userdata, flags, rc):
    print(f"Connected with result code {rc}")
    client.subscribe(MQTT_TOPIC)

def on_message(client, userdata, msg):
    print(f"Received message on topic {msg.topic}")
    try:
        data = json.loads(msg.payload.decode())

        # Ensure the necessary fields are present and correctly formatted
        data["humidity"] = float(data["humidity"])
        data["temperature"] = float(data["temperature"])
        data["power_supply"] = float(data["power_supply"])
        data["vibration"] = float(data["vibration"])

        # Prepare the data for InfluxDB
        influx_data = [
            {
                "measurement": "machine_data",
                "fields": {
                    "temperature": data["temperature"],
                    "humidity": data["humidity"],
                    "power_supply": data["power_supply"],
                    "vibration": data["vibration"],
                    "machine_status": data["machine_status"],
                    "plant_id": data["plant_id"],
                    "machine_id": data["machine_id"]
                },
                "time": datetime.utcnow().isoformat()  # Ensure proper timestamp formatting
            }
        ]

        # Write the data to InfluxDB
        influxdb_client.write_points(influx_data)
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
