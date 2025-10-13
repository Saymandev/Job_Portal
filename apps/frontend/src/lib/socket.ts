import { resetSocketListeners } from '@/store/chat-store';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initSocket = (userId: string): Socket => {
  // Disconnect existing socket if any
  if (socket) {
    socket.disconnect();
    socket = null;
    // Reset socket listeners flag when socket is recreated
    resetSocketListeners();
  }
  
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
  
  socket = io(socketUrl, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
    timeout: 10000,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    forceNew: true,
  });

  socket.on('connect', () => {
    socket?.emit('join', userId);
  });

  socket.on('disconnect', (reason) => {
    if (reason === 'io server disconnect') {
      socket?.connect();
    }
  });

  socket.on('reconnect', (attemptNumber) => {
    socket?.emit('join', userId);
  });

  return socket;
};

// Initialize notifications socket
let notificationsSocket: Socket | null = null;

export const initNotificationsSocket = (userId: string): Socket => {
  if (notificationsSocket) {
    notificationsSocket.disconnect();
    notificationsSocket = null;
  }
  
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
  
  notificationsSocket = io(`${socketUrl}/notifications`, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
    timeout: 10000,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    forceNew: true,
  });

  notificationsSocket.on('connect', () => {
    // Join user to their personal notification room
    notificationsSocket?.emit('joinUserRoom', userId);
  });

  notificationsSocket.on('disconnect', (reason) => {
    if (reason === 'io server disconnect') {
      notificationsSocket?.connect();
    }
  });

  notificationsSocket.on('reconnect', (attemptNumber) => {
    notificationsSocket?.emit('joinUserRoom', userId);
  });

  return notificationsSocket;
};

export const getNotificationsSocket = (): Socket | null => notificationsSocket;

export const disconnectNotificationsSocket = (): void => {
  if (notificationsSocket) {
    notificationsSocket.disconnect();
    notificationsSocket = null;
  }
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const reconnectSocket = (userId: string): Socket => {
  disconnectSocket();
  return initSocket(userId);
};

