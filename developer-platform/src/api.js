import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1',
  headers: {
    Authorization: `Bearer ${import.meta.env.VITE_API_TOKEN || 'dev-token'}`
  }
});

export async function getData(path) {
  const response = await api.get(path);
  return response.data.data;
}

export async function postData(path, payload) {
  const response = await api.post(path, payload);
  return response.data.data;
}
