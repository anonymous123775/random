import axios from 'axios';

const API_URL = 'http://localhost:8000';  // FastAPI backend URL

export const loginUser = async (username: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await axios.post(`${API_URL}/token`, formData, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    });

    // If successful, save token to local storage or return the response
    const token = response.data.access_token;
    localStorage.setItem('token', token);  // Store the token
    return response;
};

export const registerUser = async (userData: { username: string, password: string, email: string, fullName: string }) => {
    const response = await axios.post(`${API_URL}/users/`, {
        username: userData.username,
        password: userData.password,
        email: userData.email,
        full_name: userData.fullName,
    }, {
        headers: {
            'Content-Type': 'application/json',
        },
    });

    return response;
};
