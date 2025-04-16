import React, { useEffect, useRef, useState } from 'react';
import '../css/ChatArea.css';
import '../css/ChatContactsSection.css';
import { io } from 'socket.io-client'; // Import socket.io-client directly
import { API_BASE_URL } from '../config';

function ChatArea({ messages, setMessages, fetchMessages = () => {} }) {
  const accountEmail = localStorage.getItem('loggedInEmail');
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const [error, setError] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const openedChatUserId = localStorage.getItem('openedChatUserId');
  const previousMessagesLengthRef = useRef(0);
  const [seenMessageIds, setSeenMessageIds] = useState(() => {
    // Initialize from localStorage if available
    const saved = localStorage.getItem('seenMessageIds');
    return saved ? JSON.parse(saved) : [];
  });
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Track processed messages to avoid duplicate marking
  const processedMessagesRef = useRef(new Set());
  
  // Track if the component is mounted
  const isMountedRef = useRef(true);

  const isUserAtBottom = useRef(true);

  // Save seenMessageIds to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('seenMessageIds', JSON.stringify(seenMessageIds));
  }, [seenMessageIds]);

  // Initialize socket connection
  useEffect(() => {
    const checkServer = async () => {
      try {
        
        const newSocket = io(`${API_BASE_URL}`, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000
        });
        setSocket(newSocket); // Assuming you're managing socket in state
      } catch (err) {
        console.error('Backend not ready yet.');
      }
    };
  
    checkServer();
  }, []); // Empty dependency array means this only runs once on mount

  // Re-send user_connected when email or socket changes
  useEffect(() => {
    if (socket && accountEmail && isConnected) {
      socket.emit('user_connected', { email: accountEmail });
    }
  }, [accountEmail, socket, isConnected]);  

  const scrollToBottom = () => {
    if (isUserAtBottom.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    isUserAtBottom.current = distanceFromBottom <= 100;
  };

  // Only scroll to bottom when new messages are added
  useEffect(() => {
    // Only scroll if the number of messages has increased
    if (messages.length > previousMessagesLengthRef.current) {
      scrollToBottom();
    }
    previousMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  // Fetch messages only once when the component mounts or when openedChatUserId changes
  useEffect(() => {
    if (openedChatUserId) {
      const fetchInitialMessages = async () => {
        setIsFetching(true);
        try {
          await fetchMessages();
        } catch (err) {
          setError("Error fetching messages: " + err.message);
        } finally {
          setIsFetching(false);
        }
      };
      
      fetchInitialMessages();
      
      // Reset tracking when changing chats
      processedMessagesRef.current = new Set();
      
      // Don't reset seenMessageIds when changing chats
      // This allows the seen status to persist
    }
  }, [openedChatUserId, fetchMessages]);

  // Helper function to get email from user ID
  const getEmailFromUserId = (userId) => {
    // Find a message from this user to get their email
    const message = messages.find(msg => 
      (msg.sender_id === userId) || 
      (msg.recipient_id === userId)
    );
    
    if (message) {
      // If the sender ID matches, return sender email
      if (message.sender_id === userId) {
        return message.sender_email;
      }
      // If the recipient ID matches, return recipient email
      if (message.recipient_id === userId) {
        return message.recipient_email;
      }
    }
    
    // If no match found, return null
    return null;
  };

  // Process new messages to mark them as seen
  // Process new messages to mark them as seen
useEffect(() => {
  // Don't process if no messages, no chat open, component unmounted, or no socket
  if (!messages.length || !openedChatUserId || !isMountedRef.current || !socket || !isConnected)  return;
  
  // Find the last message from the other user
  let lastReceivedMessage = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].sender_email !== accountEmail) {
      lastReceivedMessage = messages[i];
      break;
    }
  }
  
  // If no message from other user, or already processed, exit
  if (!lastReceivedMessage) return;
  
  const messageKey = `${lastReceivedMessage.message_id}`;
  if (processedMessagesRef.current.has(messageKey)) return;
  
  // Mark this message as processed
  processedMessagesRef.current.add(messageKey);
  
  // Use a timeout to prevent potential loops
  const timeoutId = setTimeout(() => {
    if (!isMountedRef.current || !socket || !isConnected) 
      

      return;
    
    try {
      // Get the sender's email from the message
      const senderEmail = lastReceivedMessage.sender_email;
      
      console.log(`Marking message ${lastReceivedMessage.message_id} as seen`);
      console.log(`Sender: ${senderEmail}, Recipient: ${accountEmail}`);
      
      // Send mark_message_seen event to the server
      const markSeenData = {
        messageId: lastReceivedMessage.message_id,
        senderId: senderEmail, // This is the email of the sender
        recipientId: accountEmail // This is the email of the current user (recipient)
      };
      
      socket.emit('mark_message_seen', markSeenData);
      console.log('Sent mark_message_seen event with:', markSeenData);
      console.log('Message seen event received:', data);
    } catch (error) {
      console.error('Error marking message as seen:', error);
    }
  }, 1000);
  
  return () => clearTimeout(timeoutId);
}, [messages, openedChatUserId, accountEmail, socket, isConnected]);

  // Get all sent messages
  const sentMessages = messages.filter(msg => msg.sender_email === accountEmail);
  
  // Get the last sent message
  const lastSentMessage = sentMessages.length > 0 ? sentMessages[sentMessages.length - 1] : null;
  
  // Determine message status for the last sent message
  const getMessageStatus = (message) => {
    if (!message) return '';
    const isSeen = seenMessageIds.includes(message.message_id);
    return isSeen ? 'Seen' : 'Delivered';
  };

  // Manual function to mark a message as seen (for testing)
  const handleManualMarkSeen = () => {
    if (!lastSentMessage) return;
    
    // Add the message ID to seenMessageIds
    setSeenMessageIds(prev => {
      // Only add if not already in the array
      if (!prev.includes(lastSentMessage.message_id)) {
        return [...prev, lastSentMessage.message_id];
      }
      return prev;
    });
  };

  // Function to manually trigger a mark_message_seen event
  const handleManualEmitMarkSeen = () => {
    if (!socket || !isConnected || !lastSentMessage) return;
    
    // Find the recipient's email from the messages
    const recipientEmail = messages.find(msg => msg.sender_email !== accountEmail)?.sender_email;
    
    if (!recipientEmail) return;
    
    const markSeenData = {
      messageId: lastSentMessage.message_id,
      senderId: accountEmail,
      recipientId: recipientEmail
    };
    
    console.log('Manually emitting mark_message_seen event:', markSeenData);
    socket.emit('mark_message_seen', markSeenData);
    
    // Also update the local state to ensure the UI shows "Seen" immediately
    handleManualMarkSeen();
  };

  return (
    <div className="ChatArea" ref={containerRef}>
      {error && <p className="error">{error}</p>}
      
      <div style={{ padding: '10px', backgroundColor: isConnected ? '#e6ffe6' : '#ffeeee', marginBottom: '10px', borderRadius: '4px' }}>
        <div>Socket status: {isConnected ? 'Connected' : 'Disconnected'}</div>
        {socket && <div>Socket ID: {socket.id}</div>}
        <div>Seen message IDs: {seenMessageIds.join(', ') || 'None'}</div>
        
        <div style={{ marginTop: '10px' }}>
          <button 
            onClick={handleManualMarkSeen}
            style={{ 
              padding: '5px 10px', 
              backgroundColor: '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            Mark Last Message as Seen (UI Only)
          </button>
          
          <button 
            onClick={handleManualEmitMarkSeen}
            style={{ 
              padding: '5px 10px', 
              backgroundColor: '#28a745', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Emit mark_message_seen Event
          </button>
        </div>
      </div>
      
      <ul className="messages">
        {messages.map((msg, index) => (
          <React.Fragment key={msg.message_id}>
            <li className={msg.sender_email === accountEmail ? "sent message-item" : "received message-item"}>
              {msg.content}
              <span style={{ fontSize: '0.7em', marginLeft: '5px', color: '#888' }}>
                (ID: {msg.message_id})
              </span>
            </li>
            
            {/* Display message status outside the list item for the last sent message */}
            {msg.sender_email === accountEmail && msg.message_id === (lastSentMessage?.message_id) && (
              <div className="message-status-container">
                <div className="messageStatus sent">{getMessageStatus(msg)}</div>
              </div>
            )}
          </React.Fragment>
        ))}
        <div ref={messagesEndRef} />
      </ul>
    </div>
  );
}

export default ChatArea;