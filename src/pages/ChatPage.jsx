import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'; // Import the CSS
import ChatContactsSection from '../components/ChatContactsSection';
import ChatArea from '../components/ChatArea';
import '../css/ChatPage.css';
import '../css/ChatContactsSection.css'
import SendMessageComponent from '../components/SendMessageComponent';
import socket from '../services/socketService';

function ChatPage() {
  const loggedInEmail = localStorage.getItem("loggedInEmail");
  const openedChatUserId = localStorage.getItem("openedChatUserId");
  const [messages, setMessages] = useState([]);
  const [seenMessageIds, setSeenMessageIds] = useState(() => {
    // Initialize from localStorage if available
    try {
      const saved = localStorage.getItem('seenMessageIds');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error parsing seenMessageIds:', error);
      return [];
    }
  });

  // Use refs to prevent infinite loops
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const fetchThrottleTime = 2000; // 2 seconds between fetches
  const pollingIntervalRef = useRef(null);

  // Save seenMessageIds to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('seenMessageIds', JSON.stringify(seenMessageIds));
    } catch (error) {
      console.error('Error saving seenMessageIds:', error);
    }
  }, [seenMessageIds]);

  // Use useCallback to memoize the fetchMessages function
  const fetchMessages = useCallback(async (force = false) => {
    // If already fetching, don't fetch again unless forced
    if (isFetchingRef.current && !force) {
      return messages;
    }

    const chatId = localStorage.getItem('openedChatUserId');
    if (!chatId) return [];

    // Throttle fetches to prevent spamming
    const now = Date.now();
    if (!force && now - lastFetchTimeRef.current < fetchThrottleTime) {
      return messages;
    }

    // Set fetching flag and update last fetch time
    isFetchingRef.current = true;
    lastFetchTimeRef.current = now;

    try {
      // Make sure we have both email and otherUserId
      if (!loggedInEmail || !chatId) {
        console.error('Missing required parameters:', { loggedInEmail, chatId });
        return messages;
      }

      const response = await fetch("http://localhost:5000/get-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: loggedInEmail, 
          otherUserId: chatId 
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      // Handle both array and object with messages property
      const messageArray = Array.isArray(data) ? data : (data.messages || []);
      setMessages(messageArray);
      
      // Update seenMessageIds based on messages from the server
      const seenIds = messageArray
        .filter(msg => msg.seen === 1 && msg.sender_email === loggedInEmail)
        .map(msg => msg.message_id);
      
      if (seenIds.length > 0) {
        setSeenMessageIds(prevIds => {
          // Combine with existing IDs to avoid duplicates
          const combinedIds = [...prevIds, ...seenIds];
          const uniqueIds = [...new Set(combinedIds)]; // Remove duplicates
          return uniqueIds;
        });
      }
      
      return messageArray;
    } catch (error) {
      console.error('Error fetching messages:', error);
      // Only show toast if toast is defined
      if (typeof toast !== 'undefined') {
        toast.error(`Failed to fetch messages: ${error.message}`);
      }
      return [];
    } finally {
      // Reset fetching flag
      isFetchingRef.current = false;
    }
  }, [loggedInEmail, messages]);

  // Set up socket event listeners
  useEffect(() => {
    const handleRefetchMessages = () => {
      fetchMessages(true).catch(err => {
        console.error('Error fetching messages:', err);
        if (typeof toast !== 'undefined') {
          toast.error('Failed to fetch messages');
        }
      });
    };

    if (socket) {
      // Remove existing listeners to prevent duplicates
      socket.off('refetch-messages');
      socket.off('mark_message_seen');
      
      // Add new listeners
      socket.on('refetch-messages', handleRefetchMessages);
      
      socket.on('mark_message_seen', (data) => {
        if (data.senderId === loggedInEmail) {
          setSeenMessageIds(prev => {
            const messageId = Number(data.messageId);
            if (!prev.includes(messageId)) {
              return [...prev, messageId];
            }
            return prev;
          });
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('refetch-messages', handleRefetchMessages);
        socket.off('mark_message_seen');
      }
    };
  }, [loggedInEmail, fetchMessages]);

  // Set up polling and initial fetch when chat changes
  useEffect(() => {
    // Clear any existing polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (openedChatUserId) {
      // Initial fetch
      fetchMessages(true);
      
      // Set up polling (every 10 seconds)
      pollingIntervalRef.current = setInterval(() => {
        fetchMessages();
      }, 10000);
    } else {
      setMessages([]);
    }

    // Cleanup on unmount or when openedChatUserId changes
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [openedChatUserId, fetchMessages]);

  return (
    <div className="ChatPage">
      <div className="chatContent">
        <ChatContactsSection
          setMessages={setMessages}
          messages={messages}
          fetchMessages={fetchMessages}
        />
        <ChatArea
          setMessages={setMessages}
          messages={messages}
          fetchMessages={fetchMessages}
          seenMessageIds={seenMessageIds}
          setSeenMessageIds={setSeenMessageIds}
        />
      </div>
      <SendMessageComponent
        setMessages={setMessages}
        messages={messages}
        fetchMessages={fetchMessages}
      />
    </div>
  );
}

export default ChatPage;