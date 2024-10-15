
# MQTT settings
BROKER = "localhost"
PORT = 1883

# Configuration
NUM_PLANTS = 1
NUM_MACHINES_PER_PLANT = 5
FAULT_PROBABILITY = 0.01  # 1% chance for a machine to become faulty
OFFLINE_PROBABILITY = 0.01  # 1% chance for a machine to go offline
NORMAL_INTERVAL = 1  # Time interval for stable devices (in seconds)
BACK_TO_NORMAL_FROM_OFFLINE = 0.05
BACK_TO_NORMAL_FROM_FAULTY = 0.02

# Centralized normal range for all parameters
NORMAL_RANGE = {
    "temperature": (40, 60),
    "humidity": (40, 50),
    "power_supply": (230, 240),
    "vibration": (0.2, 0.4)
}

# Faulty ranges for all parameters (outside the normal bounds)
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

# Drift ranges for going out of bound and coming back to normal
DRIFT_RANGE = {
    "temperature": (1, 5),
    "humidity": (1, 5),
    "power_supply": (1, 5),
    "vibration": (0.07, 0.12)
}
