import React, { useState } from 'react';
import { toast } from 'react-toastify';
import socket from '../services/socketService'; // Import the shared socket

function SendMessageComponent({ setMessages, fetchMessages }) {
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
 
  // Handle the message input change
  const handleMessageChange = (e) => {
    setMessage(e.target.value);
  };
  
  // Handle Enter key for sending message
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
 
  // Send message on button click
  const handleSendMessage = async () => {
    const loggedInEmail = localStorage.getItem("loggedInEmail");
    const openedChatUserId = localStorage.getItem("openedChatUserId");
    
    if (!loggedInEmail || !openedChatUserId || !message.trim()) {
      setError("You must be logged in and provide a message to send.");
      return;
    }
    
    setIsSending(true);
   
    // Instant UI update - add the new message to state
    const newMessage = {
      message_id: `temp-${Date.now()}`,  // Use the current timestamp as a temporary message ID
      sender_email: loggedInEmail,
      content: message,
      created_at: new Date().toISOString(),
      sender_id: null // This will be filled in by the server
    };
    
    setMessages(prevMessages => [...prevMessages, newMessage]);  // Add the new message immediately
    const currentMessage = message;
    setMessage('');  // Clear the input field
 
    try {
      const response = await fetch(`${API_BASE_URL}/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loggedInEmail,
          otherUserId: openedChatUserId,
          message: currentMessage,
        }),
      });
 
      const data = await response.json();
 
      if (response.ok) {
        console.log("Message sent successfully:", data);
       
        // Check if socket is connected before sending notification
        if (socket && socket.connected) {
          // Send notification directly with socket.emit
          socket.emit('notify_recipient', {
            recipientId: openedChatUserId,
            senderId: loggedInEmail,
            messageContent: currentMessage || 'New message'
          });
          console.log('Socket notification sent successfully');
          
          // Also emit refetch-messages event to notify the recipient
          socket.emit('refetch-messages', { recipient_user_id: openedChatUserId });
          console.log('Emitted refetch-messages event');
          
          // Fetch messages to ensure we have the latest data
          if (fetchMessages) {
            setTimeout(() => {
              fetchMessages();
            }, 300);
          }
        } else {
          console.warn('Socket not connected, attempting to reconnect...');
          socket.connect();
        }
      } else {
        toast.error('Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("An error occurred while sending the message.");
      // Optionally remove the temporary message if send failed
      setMessages(prev => prev.filter(msg => msg.message_id !== newMessage.message_id));
    } finally {
      setIsSending(false);
    }
  };
 
  return (
    <div className="SendMessageComponent">
      <textarea
        value={message}
        onChange={handleMessageChange}
        onKeyDown={handleKeyDown}
        placeholder="Type your message here..."
        disabled={isSending}
      ></textarea>
      <button 
        className="sendMessageButton" 
        onClick={handleSendMessage}
        disabled={isSending || !message.trim()}
      >
        <svg
          id="Layer_1"
          data-name="Layer 1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 122.56 122.88"
        >
          <path
            fillRule="evenodd"
            d="M2.33,44.58,117.33.37a3.63,3.63,0,0,1,5,4.56l-44,115.61h0a3.63,3.63,0,0,1-6.67.28L53.93,84.14,89.12,33.77,38.85,68.86,2.06,51.24a3.63,3.63,0,0,1,.27-6.66Z"
          />
        </svg>
      </button>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
}

export default SendMessageComponent;