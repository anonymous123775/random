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

const axiosInstance = axios.create({
    baseURL: API_URL,
});

axiosInstance.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config;
        if (error.response.status === 401 && !originalRequest._retry) {
            // console.log("token expired 401 error")
            originalRequest._retry = true;
            const refreshToken = localStorage.getItem('refresh_token');
            // console.log("refreshToken : ", refreshToken)
            try {
                const response = await axios.post(`${API_URL}/refresh-token`, 
                    { refreshToken: refreshToken },
                    {
                        headers: {'Content-Type': 'application/json'},
                        params: {refreshToken,}
                    });
                if (response.status === 200) {
                    // console.log("new token recived, ", response)
                    const newToken = response.data.access_token;
                    localStorage.setItem('token', newToken);
                    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                    originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                    return axiosInstance(originalRequest);
                }
            }
            catch(refreshError) {
                console.error('Failed to refresh token:', refreshError);
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export const loginUser = async (username: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await axiosInstance.post(`/token`, formData, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    });
    const { access_token, refresh_token } = response.data;
    localStorage.setItem('token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    return response;
};

export const registerUser = async (userData: { username: string, password: string, email: string, fullName: string }) => {
    const response = await axios.post(`${API_URL}/users/`, userData, getAuthHeaders());
    return response;
};

export const getMachineCount = async () => {
    const response = await axiosInstance.get(`/machine-count`, getAuthHeaders());
    return response.data;
};

export const getPlantCount = async () => {
    const response = await axiosInstance.get(`/plant-count`, getAuthHeaders());
    return response.data;
};

export const fetchHistoricalData = async (machineId: string, plantId: string, timeframe: string) => {
    const response = await axiosInstance.get(`/historical-data`, {
        headers: {
            ...getAuthHeaders().headers,
        },
        params: { machineId, plantId, timeframe },
    });
    return response.data;
};


export const fetchHistoricalMachineData = async (machineId: string, plantId: string, startTime: Date|null, endTime: Date|null) => {

    const response = await axiosInstance.get(`/historical-data-start-end`, {
        headers: {
            ...getAuthHeaders().headers,
        },
        params: { machineId, plantId, startTime, endTime },
    });
    return response.data;
};

export const fetchHistoricalMachineDataParam = async (machineId: string, plantId: string, param: string ,startTime: Date|null, endTime: Date|null) => {

    const response = await axiosInstance.get(`/historical-data-start-end-param`, {
        headers: {
            ...getAuthHeaders().headers,
        },
        params: { machineId, plantId, startTime, endTime, param },
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
    severity: string;
}

export const fetchNotificationsTyped = async (): Promise<Notification[]> => {
    const response = await axiosInstance.get(`/api/notifications`, getAuthHeaders());
    return response.data;
};

export const fetchNumFailures = async (month: number, year: number, machineId: string, plantId: string) => {
    const response = await axiosInstance.get(`/api/num-failures`, {
        headers: getAuthHeaders().headers,
        params: { month, year, machine_id: machineId, plant_id: plantId },
    });
    return response.data;
};

export const fetchUserData = async () => {
    try {
        const response = await axiosInstance.get(`/users/me/`, getAuthHeaders());
        return response.data;
    } catch (error) {
        console.error('Failed to fetch user data:', error);
        throw error;
    }
};


export const updateUserData = async (userData: any) => {
    const response = await axiosInstance.put(`/api/user/${userData.id}`, userData, getAuthHeaders());
    return response.data;
};


export const fetchMachineKpis = async (machineId: string , plantId: string) => {
    try{
        const response = await axiosInstance.get(`/api/machine-kpis`,{
            headers: getAuthHeaders().headers,
            params: { machine_id : machineId, plant_id : plantId},
        });
        return response.data
    }
    catch(error){
        throw error;
    }
}

export const fetchKpiNotRealTime = async (machineId: string , plantId: string, startTime: Date | null, endTime: Date | null) => {
    try{
        const response = await axiosInstance.get(`/api/machine-kpis-not-realtime`,{
            headers: getAuthHeaders().headers,
            params: { machine_id : machineId, plant_id : plantId, startTime: startTime, endTime: endTime},
        });
        return response.data
    }
    catch(error){
        throw error;
    }
}


export const fetchMachineFailuresPlant = async (plantId: string) => {
    try{
        const response = await axiosInstance.get(`/api/num-machine-failures`,{
            headers: getAuthHeaders().headers,
            params: { plant_id : plantId},
        });
        return response.data
    }
    catch(error){
        throw error;
    }
}