import { io } from 'socket.io-client';

// Create a single socket instance
const socket = io('http://localhost:5000', {
  transports: ['websocket', 'polling'],  // Try WebSocket first, then fall back to polling
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

// Add event listeners for debugging
socket.on('connect', () => {
  console.log('Socket connected with ID:', socket.id);
  
  // Send user_connected event when socket connects
  const email = localStorage.getItem('loggedInEmail');
  if (email) {
    socket.emit('user_connected', { email });
    console.log('Sent user_connected event with email:', email);
  }
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error);
});

socket.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason);
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});

// Debug: Log all events
socket.onAny((event, ...args) => {
  if (event !== 'ping' && event !== 'pong') {
    console.log(`[Socket Event] ${event}:`, args);
  }
});

// Helper function to mark a message as seen
export const markMessageAsSeen = (messageId, senderId, recipientId) => {
  if (!socket || !socket.connected) {
    console.warn('Socket not connected, cannot mark message as seen');
    return;
  }
  
  console.log(`Marking message ${messageId} as seen from ${senderId} to ${recipientId}`);
  
  const data = {
    messageId,
    senderId,    // This is the email of the sender
    recipientId  // This is the email of the recipient
  };
  
  console.log('Emitting mark_message_seen event with data:', data);
  
  socket.emit('mark_message_seen', data);
};

// Helper function to check if socket is connected
export const isSocketConnected = () => {
  return socket && socket.connected;
};

// Export the socket instance as default
export default socket;