# Configuration
NUM_PLANTS = 5
NUM_MACHINES_PER_PLANT = 5
FAULT_PROBABILITY = 0.01
OFFLINE_PROBABILITY = 0.01
NORMAL_INTERVAL = 1
BACK_TO_NORMAL_FROM_OFFLINE = 0.05
BACK_TO_NORMAL_FROM_FAULTY = 0.02
DEBOUNCE_TIME = 600

NORMAL_RANGE = {
    "temperature": (40, 60),
    "humidity": (40, 50),
    "power_supply": (230, 240),
    "vibration": (0.2, 0.4)
}

FAULTY_RANGE = {
    "temperature": (20, 100),
    "humidity": (20, 80),
    "power_supply": (180, 280),
    "vibration": (0.1, 2.0)
}

NORMAL_DRIFT_RANGE = {
    "temperature": (-0.2, 0.2),
    "humidity": (-0.2, 0.2),
    "power_supply": (-0.2, 0.2),
    "vibration": (-0.015, 0.015)
}

DRIFT_RANGE = {
    "temperature": (0.2, 1),
    "humidity": (1, 0.2),
    "power_supply": (0.2, 1),
    "vibration": (0.015, 0.025)
}
