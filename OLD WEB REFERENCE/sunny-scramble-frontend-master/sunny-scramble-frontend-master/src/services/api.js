import axios from 'axios';

// Create an Axios instance pointing to your backend
const API = axios.create({
  baseURL: import.meta.env.MODE === 'development' 
    ? 'http://localhost:5000/api' 
    : 'https://sunny-scramble-backend.vercel.app/api', 
});

// Intercept requests to automatically attach the JWT token if the user is logged in
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;
