import { io } from 'socket.io-client';

// Replace with your actual backend URL when deploying
const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'; 

export const socket = io(BACKEND_URL, {
  autoConnect: false, // We will connect manually when the user is logged in
});