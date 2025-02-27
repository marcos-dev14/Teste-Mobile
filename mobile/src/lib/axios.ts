import axios from "axios";

// API LOCAL
export const api = axios.create({
  baseURL: 'http://192.168.0.106:3000',
});

api.defaults.headers.common['Access-Control-Allow-Origin'] = 'http://192.168.0.106:3000';
api.defaults.headers.common['Access-Control-Allow-Methods'] = 'POST, PUT, DELETE';
api.defaults.headers.common['Access-Control-Allow-Headers'] = 'Content-Type';