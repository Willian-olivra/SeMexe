import axios from 'axios';

// ⚠️ Mantenha o IP da sua máquina
const API_URL: string = 'http://192.168.8.5:3000/api'; 

const api = axios.create({
    baseURL: API_URL,
});

export default api;