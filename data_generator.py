import random
import paho.mqtt.client as mqtt
import time
import json
from datetime import datetime
import config
import threading
import os
import dotenv
import queue

dotenv.load_dotenv()

stop_flag = threading.Event()

broker = os.getenv('MQTT_BROKER')
port = 1883

def on_connect(client, userdata, flags, rc):
    print(f"Connected with result code {rc}")

client = mqtt.Client()
client.on_connect = on_connect
client.username_pw_set(username=os.getenv('MQTT_USERNAME'),password=os.getenv('MQTT_PASSWORD'))
print(os.getenv('MQTT_USERNAME') , os.getenv('MQTT_PASSWORD'))
print(broker, port)
client.connect(broker, port, 60)

data_queue = queue.Queue()

# Configuration
NUM_PLANTS = config.NUM_PLANTS
NUM_MACHINES_PER_PLANT = config.NUM_MACHINES_PER_PLANT
FAULT_PROBABILITY = config.FAULT_PROBABILITY  
OFFLINE_PROBABILITY = config.OFFLINE_PROBABILITY 
NORMAL_INTERVAL = config.NORMAL_INTERVAL 
BACK_TO_NORMAL_FROM_OFFLINE = config.BACK_TO_NORMAL_FROM_OFFLINE
BACK_TO_NORMAL_FROM_FAULTY = config.BACK_TO_NORMAL_FROM_FAULTY
DEBOUNCE_TIME = config.DEBOUNCE_TIME

NORMAL_RANGE = config.NORMAL_RANGE

FAULTY_RANGE = config.FAULTY_RANGE

NORMAL_DRIFT_RANGE = config.NORMAL_DRIFT_RANGE

DRIFT_RANGE = config.DRIFT_RANGE

current_values = {
    (plant_id, machine_id): {
        "temperature": random.uniform(*NORMAL_RANGE["temperature"]),
        "humidity": random.uniform(*NORMAL_RANGE["humidity"]),
        "power_supply": random.uniform(*NORMAL_RANGE["power_supply"]),
        "vibration": random.uniform(*NORMAL_RANGE["vibration"]),
        "fault_direction": None, 
        "transitioning": False, 
        "faulty_parameters": [],
        "last_state_change": datetime.now(),  
        "last_state": "normal"
    } for plant_id in range(1, NUM_PLANTS+1) for machine_id in range(1, NUM_MACHINES_PER_PLANT+1)
}

machine_states = {
    (plant_id, machine_id): "normal" for plant_id in range(1, NUM_PLANTS+1) for machine_id in range(1, NUM_MACHINES_PER_PLANT+1)
}

def fluctuate_in_normal_range(param_name, current_value):
    """Keep values fluctuating minimally within the central normal range."""
    min_val, max_val = NORMAL_RANGE[param_name]
    drift_min, drift_max = NORMAL_DRIFT_RANGE[param_name]
    fluctuation = random.uniform(drift_min, drift_max) 
    new_value = current_value + fluctuation
    return max(min_val, min(new_value, max_val))

def gradually_out_of_bound(param_name, current_value, direction):
    """Slowly push values out of bounds for faulty machines."""
    min_faulty, max_faulty = FAULTY_RANGE[param_name]
    drift_min, drift_max = DRIFT_RANGE[param_name]
    drift = random.uniform(drift_min, drift_max) 
    if direction == 'up':
        new_value = current_value + drift
        return min(new_value, max_faulty) 
    else:  
        new_value = current_value - drift
        return max(new_value, min_faulty) 

def gradually_back_to_normal(param_name, current_value):
    """Slowly bring values back into the normal range."""
    min_val, max_val = NORMAL_RANGE[param_name]
    drift_min, drift_max = DRIFT_RANGE[param_name]
    if current_value < min_val:
        return current_value + random.uniform(drift_min, drift_max) 
    elif current_value > max_val:
        return current_value - random.uniform(drift_min, drift_max)  
    return current_value 


def update_machine_state(plant_id, machine_id):
    current_state = machine_states[(plant_id, machine_id)]
    current_values_entry = current_values[(plant_id, machine_id)]
    last_state_change = current_values_entry["last_state_change"]
    current_time = datetime.now()
    
    if current_state == "normal":
        if (current_time - last_state_change).total_seconds() >= DEBOUNCE_TIME:
            if random.random() <= FAULT_PROBABILITY:
                machine_states[(plant_id, machine_id)] = "faulty"
                current_values_entry["last_state_change"] = current_time
                current_values_entry["last_state"] = current_state
                current_values_entry["fault_direction"] = random.choice(['up', 'down'])
                num_faulty_params = random.randint(1, len(NORMAL_RANGE))
                current_values_entry["faulty_parameters"] = random.sample(list(NORMAL_RANGE.keys()), num_faulty_params)
            elif random.random() <= OFFLINE_PROBABILITY:
                machine_states[(plant_id, machine_id)] = "offline"
                current_values_entry["last_state_change"] = current_time
                current_values_entry["last_state"] = current_state
        
    elif current_state == "faulty":
        if random.random() <= BACK_TO_NORMAL_FROM_FAULTY: 
            machine_states[(plant_id, machine_id)] = "normal"
            current_values_entry["transitioning"] = True 
    
    elif current_state == "offline":
        if random.random() < BACK_TO_NORMAL_FROM_OFFLINE:  
            machine_states[(plant_id, machine_id)] = "normal"
            
            current_values[(plant_id, machine_id)]["temperature"] = random.uniform(*NORMAL_RANGE["temperature"])
            current_values[(plant_id, machine_id)]["humidity"] = random.uniform(*NORMAL_RANGE["humidity"])
            current_values[(plant_id, machine_id)]["power_supply"] = random.uniform(*NORMAL_RANGE["power_supply"])
            current_values[(plant_id, machine_id)]["vibration"] = random.uniform(*NORMAL_RANGE["vibration"])
    
    return machine_states[(plant_id, machine_id)]


def generate_data(plant_id, machine_id):
    
    try : 
        while not stop_flag.is_set():
            state = update_machine_state(plant_id, machine_id)
            current_temp = current_values[(plant_id, machine_id)]["temperature"]
            current_humidity = current_values[(plant_id, machine_id)]["humidity"]
            current_power = current_values[(plant_id, machine_id)]["power_supply"]
            current_vibration = current_values[(plant_id, machine_id)]["vibration"]
            fault_direction = current_values[(plant_id, machine_id)]["fault_direction"]
            transitioning = current_values[(plant_id, machine_id)]["transitioning"]
            faulty_parameters = current_values[(plant_id, machine_id)]["faulty_parameters"]
            
            if state == "normal":
                if transitioning:
                    temperature, humidity, vibration, power_supply = 0, 0, 0, 0

                    if NORMAL_RANGE["temperature"][0] <= current_temp <= NORMAL_RANGE["temperature"][1]:
                        temperature = fluctuate_in_normal_range("temperature", current_temp)
                    else:
                        temperature = gradually_back_to_normal("temperature", current_temp)
                    if NORMAL_RANGE["humidity"][0] <= current_humidity <= NORMAL_RANGE["humidity"][1]:
                        humidity = fluctuate_in_normal_range("humidity", current_humidity)
                    else:
                        humidity = gradually_back_to_normal("humidity", current_humidity)
                    if NORMAL_RANGE["power_supply"][0] <= current_power <= NORMAL_RANGE["power_supply"][1]:
                        power_supply = fluctuate_in_normal_range("power_supply", current_power)
                    else:
                        power_supply = gradually_back_to_normal("power_supply", current_power)
                    if NORMAL_RANGE["vibration"][0] <= current_vibration <= NORMAL_RANGE["vibration"][1]:
                        vibration = fluctuate_in_normal_range("vibration", current_vibration)
                    else:
                        vibration = gradually_back_to_normal("vibration", current_vibration)
                    
                    if (NORMAL_RANGE["temperature"][0] <= temperature <= NORMAL_RANGE["temperature"][1] and
                        NORMAL_RANGE["humidity"][0] <= humidity <= NORMAL_RANGE["humidity"][1] and
                        NORMAL_RANGE["power_supply"][0] <= power_supply <= NORMAL_RANGE["power_supply"][1] and
                        NORMAL_RANGE["vibration"][0] <= vibration <= NORMAL_RANGE["vibration"][1]):
                        current_values[(plant_id, machine_id)]["transitioning"] = False  
                else:
                    temperature = fluctuate_in_normal_range("temperature", current_temp)
                    humidity = fluctuate_in_normal_range("humidity", current_humidity)
                    power_supply = fluctuate_in_normal_range("power_supply", current_power)
                    vibration = fluctuate_in_normal_range("vibration", current_vibration)
            elif state == "faulty":
                temperature = current_temp
                humidity = current_humidity
                power_supply = current_power
                vibration = current_vibration
                if "temperature" in faulty_parameters:
                    temperature = gradually_out_of_bound("temperature", current_temp, fault_direction)
                else:
                    temperature = fluctuate_in_normal_range("temperature", current_temp)
                if "humidity" in faulty_parameters:
                    humidity = gradually_out_of_bound("humidity", current_humidity, fault_direction)
                else:
                    humidity = fluctuate_in_normal_range("humidity", current_humidity)
                if "power_supply" in faulty_parameters:
                    power_supply = gradually_out_of_bound("power_supply", current_power, fault_direction)
                else:
                    power_supply = fluctuate_in_normal_range("power_supply", current_power)
                if "vibration" in faulty_parameters:
                    vibration = gradually_out_of_bound("vibration", current_vibration, fault_direction)
                else:
                    vibration = fluctuate_in_normal_range("vibration", current_vibration)
            else:
                temperature, humidity, power_supply, vibration = 0,0,0,0
            
            current_values[(plant_id, machine_id)]["temperature"] = temperature
            current_values[(plant_id, machine_id)]["humidity"] = humidity
            current_values[(plant_id, machine_id)]["power_supply"] = power_supply
            current_values[(plant_id, machine_id)]["vibration"] = vibration
            
            data = {
                "timestamp": datetime.now().isoformat(),
                "plant_id": plant_id,
                "machine_id": machine_id,
                "temperature": temperature,
                "humidity": humidity,
                "power_supply": power_supply,
                "vibration": vibration,
                "machine_status": "offline" if state == 'offline' else 'online'
            }
            
            data_queue.put(data)
            time.sleep(NORMAL_INTERVAL)
        
    except Exception:
        print("Exception in generating data : ", Exception)
        
def process_queue():
    while not stop_flag.is_set():
        if not data_queue.empty():
            data = data_queue.get()  # This removes the item from the queue
            topic = f"iot/plant{data['plant_id']}/machine{data['machine_id']}"
            client.publish(topic, json.dumps(data))

threads = []

try : 
    for plant_id in range(1, config.NUM_PLANTS + 1):
        for machine_id in range(1, config.NUM_MACHINES_PER_PLANT + 1):
            thread = threading.Thread(target=generate_data, args=(plant_id, machine_id))
            threads.append(thread)
            thread.start()
except Exception:
    print("Exception while generating threads : ", Exception)

try:
    queue_thread = threading.Thread(target=process_queue)
    queue_thread.start()
except Exception:
    print("Exception in creating queue thread to push data")

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("Data generation stopped.")
    stop_flag.set()
    for thread in threads:
        thread.join()
    queue_thread.join()
    client.disconnect()