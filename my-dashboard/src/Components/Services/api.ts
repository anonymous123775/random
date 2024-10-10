import axios from 'axios';

const API_URL = 'http://localhost:8000';  // FastAPI backend URL

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    };
};

export const loginUser = async (username: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await axios.post(`${API_URL}/token`, formData, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    });

    const token = response.data.access_token;
    localStorage.setItem('token', token);  // Store the token
    return response;
};

export const registerUser = async (userData: { username: string, password: string, email: string, fullName: string }) => {
    const response = await axios.post(`${API_URL}/users/`, userData, getAuthHeaders());
    return response;
};

export const getMachineCount = async () => {
    const response = await axios.get(`${API_URL}/machine-count`, getAuthHeaders());
    return response.data;
};

export const getPlantCount = async () => {
    const response = await axios.get(`${API_URL}/plant-count`, getAuthHeaders());
    return response.data;
};

// New API calls for fetching historical and real-time data
export const fetchHistoricalData = async (machineId: string, plantId: string, timeframe: string) => {
    const response = await axios.get(`${API_URL}/historical-data`, {
        headers: {
            ...getAuthHeaders().headers,
        },
        params: { machineId, plantId, timeframe },
    });
    return response.data;
};



export interface Notification {
    id: number;
    plant_id: string;
    machine_id: string;
    parameter: string;
    status: string;
    threshold: string;
    timestamp: string;
}

// Fetch notifications with type safety
export const fetchNotificationsTyped = async (): Promise<Notification[]> => {
    const response = await axios.get(`${API_URL}/api/notifications`, getAuthHeaders());
    return response.data;
};

export const fetchNumFailures = async (month: number, year: number, machineId: string, plantId: string) => {
    const response = await axios.get(`${API_URL}/api/num-failures`, {
        headers: getAuthHeaders().headers,
        params: { month, year, machine_id: machineId, plant_id: plantId },
    });
    return response.data;
};

export const fetchUserData = async () => {
    try {
        const response = await axios.get(`${API_URL}/users/me/`, getAuthHeaders());
        return response.data;
    } catch (error) {
        console.error('Failed to fetch user data:', error);
        throw error; // Rethrow or handle it as per your application's logic
    }
};


export const updateUserData = async (userData: any) => {
    const response = await axios.put(`${API_URL}/api/user`, userData, getAuthHeaders());
    return response.data;
};