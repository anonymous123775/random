import random
import paho.mqtt.client as mqtt
import time
import json
from datetime import datetime

# MQTT settings
broker = "localhost"
port = 1883

# Configuration
NUM_PLANTS = 2
NUM_MACHINES_PER_PLANT = 1
FAULT_PROBABILITY = 0.06  # 60% chance for a machine to become faulty
OFFLINE_PROBABILITY = 0.05  # 5% chance for a machine to go offline
NORMAL_INTERVAL = 5  # Time interval for stable devices (in seconds)
BACK_TO_NORMAL_FROM_OFFLINE = 0.05
BACK_TO_NORMAL_FROM_FAULTY = 0.02

# Define centralized normal range for all parameters
NORMAL_RANGE = {
    "temperature": (40, 60),
    "humidity": (40, 50),
    "power_supply": (230, 240),
    "vibration": (0.2, 0.4)
}

# Define faulty ranges for all parameters (outside the normal bounds)
FAULTY_RANGE = {
    "temperature": (20, 100),
    "humidity": (20, 80),
    "power_supply": (180, 280),
    "vibration": (0.1, 2.0)
}

NORMAL_DRIFT_RANGE = {
    "temperature": (-1, 1),
    "humidity": (-1, 1),
    "power_supply": (-1, 1),
    "vibration": (-0.07, 0.07)
}

# Define drift ranges for going out of bound and coming back to normal
DRIFT_RANGE = {
    "temperature": (1, 5),
    "humidity": (1, 5),
    "power_supply": (1, 5),
    "vibration": (0.07, 0.12)
}

# Initialize current values and faulty direction (up/down) for each machine
current_values = {
    (plant_id, machine_id): {
        "temperature": random.uniform(*NORMAL_RANGE["temperature"]),
        "humidity": random.uniform(*NORMAL_RANGE["humidity"]),
        "power_supply": random.uniform(*NORMAL_RANGE["power_supply"]),
        "vibration": random.uniform(*NORMAL_RANGE["vibration"]),
        "fault_direction": None,  # Will be set to 'up' or 'down' when machine becomes faulty
        "transitioning": False,  # Track whether a machine is transitioning back to normal
        "faulty_parameters": []  # List of parameters that will go out of bound when faulty
    } for plant_id in range(1, NUM_PLANTS+1) for machine_id in range(1, NUM_MACHINES_PER_PLANT+1)
}

# Machine states: normal, faulty, offline
machine_states = {
    (plant_id, machine_id): "normal" for plant_id in range(1, NUM_PLANTS+1) for machine_id in range(1, NUM_MACHINES_PER_PLANT+1)
}

def fluctuate_in_normal_range(param_name, current_value):
    """Keep values fluctuating minimally within the central normal range."""
    min_val, max_val = NORMAL_RANGE[param_name]
    drift_min, drift_max = NORMAL_DRIFT_RANGE[param_name]
    fluctuation = random.uniform(drift_min, drift_max)  # Minimal fluctuation for stable machines
    new_value = current_value + fluctuation
    return max(min_val, min(new_value, max_val))

def gradually_out_of_bound(param_name, current_value, direction):
    """Slowly push values out of bounds for faulty machines."""
    min_faulty, max_faulty = FAULTY_RANGE[param_name]
    drift_min, drift_max = DRIFT_RANGE[param_name]
    drift = random.uniform(drift_min, drift_max) # Gradual drift rate
    if direction == 'up':
        new_value = current_value + drift
        return min(new_value, max_faulty)  # Ensure it doesn't exceed max faulty range
    else:  # direction == 'down'
        new_value = current_value - drift
        return max(new_value, min_faulty)  # Ensure it doesn't go below min faulty range

def gradually_back_to_normal(param_name, current_value):
    """Slowly bring values back into the normal range."""
    min_val, max_val = NORMAL_RANGE[param_name]
    drift_min, drift_max = DRIFT_RANGE[param_name]
    if current_value < min_val:
        return current_value + random.uniform(drift_min, drift_max)  # Gradually increase to normal
    elif current_value > max_val:
        return current_value - random.uniform(drift_min, drift_max)  # Gradually decrease to normal
    return current_value  # Already within normal range

def update_machine_state(plant_id, machine_id):
    current_state = machine_states[(plant_id, machine_id)]
    current_values_entry = current_values[(plant_id, machine_id)]
    
    # Machines have a low chance to go faulty or offline if they're currently normal
    if current_state == "normal":
        if random.random() < FAULT_PROBABILITY:
            machine_states[(plant_id, machine_id)] = "faulty"
            # Randomly choose the fault direction (up or down) when a machine becomes faulty
            current_values_entry["fault_direction"] = random.choice(['up', 'down'])
            # Randomly choose some parameters to go out of bound when faulty
            num_faulty_params = random.randint(1, len(NORMAL_RANGE))
            current_values_entry["faulty_parameters"] = random.sample(list(NORMAL_RANGE.keys()), num_faulty_params)
        elif random.random() < OFFLINE_PROBABILITY:
            machine_states[(plant_id, machine_id)] = "offline"
    
    # Machines that are faulty can eventually go back to normal
    elif current_state == "faulty":
        if random.random() < BACK_TO_NORMAL_FROM_FAULTY:  # Chance to recover
            machine_states[(plant_id, machine_id)] = "normal"
            current_values_entry["transitioning"] = True  # Set transition flag to True
    
    # Machines that are offline have a chance to come back online
    elif current_state == "offline":
        if random.random() < BACK_TO_NORMAL_FROM_OFFLINE:  # Chance to come back online
            machine_states[(plant_id, machine_id)] = "normal"
            
            current_values[(plant_id, machine_id)]["temperature"] = random.uniform(*NORMAL_RANGE["temperature"])
            current_values[(plant_id, machine_id)]["humidity"] = random.uniform(*NORMAL_RANGE["humidity"])
            current_values[(plant_id, machine_id)]["power_supply"] = random.uniform(*NORMAL_RANGE["power_supply"])
            current_values[(plant_id, machine_id)]["vibration"] = random.uniform(*NORMAL_RANGE["vibration"])
    
    return machine_states[(plant_id, machine_id)]

def generate_data():
    all_data = []
    
    for plant_id in range(1, NUM_PLANTS+1):
        for machine_id in range(1, NUM_MACHINES_PER_PLANT+1):
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
                    # Gradually bring the parameters back to the normal range if they were faulty
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
                    
                    # Check if all parameters are back in the normal range, if so, stop transitioning
                    if (NORMAL_RANGE["temperature"][0] <= temperature <= NORMAL_RANGE["temperature"][1] and
                        NORMAL_RANGE["humidity"][0] <= humidity <= NORMAL_RANGE["humidity"][1] and
                        NORMAL_RANGE["power_supply"][0] <= power_supply <= NORMAL_RANGE["power_supply"][1] and
                        NORMAL_RANGE["vibration"][0] <= vibration <= NORMAL_RANGE["vibration"][1]):
                        current_values[(plant_id, machine_id)]["transitioning"] = False  #
                else:
                    # Stable machines fluctuate normally within the range
                    temperature = fluctuate_in_normal_range("temperature", current_temp)
                    humidity = fluctuate_in_normal_range("humidity", current_humidity)
                    power_supply = fluctuate_in_normal_range("power_supply", current_power)
                    vibration = fluctuate_in_normal_range("vibration", current_vibration)
            elif state == "faulty":
                # Trend out of bounds in the chosen direction (up or down) for faulty parameters
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
                # If offline, all parameters are None
                temperature, humidity, power_supply, vibration = 0,0,0,0
            
            # Update current values for trending
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
            all_data.append(data)
    
    return all_data

# MQTT client setup
client = mqtt.Client()
client.connect(broker, port, 60)

try:
    while True:
        data_list = generate_data()
        for data in data_list:
            plant_id = data["plant_id"]
            machine_id = data["machine_id"]
            topic = f"iot/plant{plant_id}/machine{machine_id}"  # Dynamic topic based on plant and machine ID
            client.publish(topic, json.dumps(data))  # Publish data in JSON format
            print(f"Published to {topic}: {data}")
        time.sleep(NORMAL_INTERVAL)  # Interval for generating data
except KeyboardInterrupt:
    print("Data generation stopped.")
    client.disconnect()
