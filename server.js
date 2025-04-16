const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs'); // Import bcryptjs
const cors = require('cors');
const http = require('http');


const { Server } = require('socket.io');

// Create an express application
const app = express();
const allowedOrigins = [
  // 'http://localhost:3000', // Dev frontend
  // 'https://livechat-app-frontend.vercel.app' // Deployed frontend
];

const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: allowedOrigins, // Your React app's URL
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true
  }
});



app.use(cors({
  origin: allowedOrigins, // Your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));






// Handle 'send_message' event
// Consolidated Socket.IO implementation

// Keep track of user connections
const userSocketMap = {}; // To store user-email to socketId mappings

io.on('connection', (socket) => {
  console.log(`New socket connection: ${socket.id}`);
  let userEmail = null;
  
  // User identifies themselves
  socket.on('user_connected', ({ email }) => {
    if (email) {
      userEmail = email;
      userSocketMap[email] = socket.id;
      console.log(`User connected: ${email} with socket ID ${socket.id}`);
    }
  });

  // Handle refetch-messages event
  socket.on('refetch-messages', (data) => {
    if (data.recipient_user_id) {
      console.log(`Trying to send refetch notification to user ID: ${data.recipient_user_id}`);

      const query = 'SELECT email FROM users WHERE user_id = ?';
      db.query(query, [data.recipient_user_id], (err, result) => {
        if (err) {
          console.error('Error fetching recipient email:', err);
          return;
        }

        if (result.length === 0) {
          console.log(`Recipient user ID ${data.recipient_user_id} not found`);
          return;
        }

        const recipientEmail = result[0].email;
        const recipientSocketId = userSocketMap[recipientEmail];

        if (recipientSocketId) {
          console.log(`Sending refetch notification to ${recipientEmail} (socket: ${recipientSocketId})`);
          io.to(recipientSocketId).emit('refetch-messages');
        } else {
          console.log(`Recipient ${recipientEmail} is not currently connected`);
        }
      });
    }
  });

  // Handle 'mark_message_seen' event
  // Handle 'mark_message_seen' event
  socket.on('mark_message_seen', (data) => {
    console.log('Received mark_message_seen event:', data);
    
    if (!data || !data.messageId || !data.senderId || !data.recipientId) {
      console.warn('Invalid data for mark_message_seen event:', data);
      return;
    }
    
    // Update the message status in the database
    const updateQuery = 'UPDATE messages SET seen = 1 WHERE message_id = ?';
    console.log('Executing query:', updateQuery, 'with params:', [data.messageId]);
    
    db.query(updateQuery, [data.messageId], (updateErr, updateResult) => {
      if (updateErr) {
        console.error('Error updating message seen status:', updateErr);
        return;
      }
      
      console.log(`Updated seen status for message ${data.messageId}. Affected rows: ${updateResult.affectedRows}`);
      
      // If the update was successful, notify the original sender
      if (updateResult.affectedRows > 0) {
        // Find the socket ID of the original sender using their email
        const senderSocketId = userSocketMap[data.senderId];
        
        console.log('Looking for socket ID for sender:', data.senderId);
        console.log('userSocketMap:', userSocketMap);
        console.log('Found socket ID:', senderSocketId);
        
        if (senderSocketId) {
          console.log(`Notifying sender ${data.senderId} that their message was seen`);
          console.log('Emitting mark_message_seen event with data:', data);
          
          io.to(senderSocketId).emit('mark_message_seen', data);
          console.log('Event emitted successfully');
        } else {
          console.log(`Sender ${data.senderId} not connected, cannot notify about seen message`);
        }
      } else {
        console.log(`Message ${data.messageId} not found or already marked as seen`);
      }
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`Socket ${socket.id} disconnected`);

    if (userEmail && userSocketMap[userEmail] === socket.id) {
      delete userSocketMap[userEmail];
      console.log(`Removed user ${userEmail} from socket mapping`);
    }
  });
});







app.use(cors({
  origin: '*',  // Allow all origins (OK for dev)
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));


// Middleware to parse JSON request bodies
app.use(bodyParser.json());

// MySQL connection setup
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root', // Replace with your MySQL username
  password: 'azsamnoob44', // Replace with your MySQL password
  database: 'realtime_chat'
});

// Connect to the database
db.connect((err) => {
  if (err) {
    console.error('Error connecting to the database: ', err);
    return;
  }
  console.log('Connected to the database!');
});

app.post('/mark-message-seen', (req, res) => {
  const { messageId } = req.body;
  
  if (!messageId) {
    return res.status(400).json({ message: 'Message ID is required' });
  }
  
  const query = 'UPDATE messages SET seen = 1 WHERE message_id = ?';
  db.query(query, [messageId], (err, result) => {
    if (err) {
      console.error('Error updating message:', err);
      return res.status(500).json({ message: 'Error updating message' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Message not found or already marked as seen' });
    }
    
    return res.json({ message: 'Message marked as seen', messageId });
  });
});
// Define the route to create a new user (register)
app.post('/create-user', (req, res) => {
  const { username, email, password } = req.body;

  // Basic validation
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'All fields (username, email, password) are required.' });
  }

  // Hash the password using bcryptjs
  bcrypt.hash(password, 10, (err, passwordHash) => {
    if (err) {
      console.error('Error hashing password: ', err);
      return res.status(500).json({ message: 'Error hashing password.' });
    }

    // Insert the new user into the database with the hashed password
    const query = 'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)';

    db.query(query, [username, email, passwordHash], (err, result) => {
      if (err) {
        console.error('Error inserting user: ', err);
        return res.status(500).json({ message: 'Error adding user.' });
      }

      return res.status(201).json({ message: 'User created successfully!', userId: result.insertId });
    });
  });
});

// Define the route for login
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  // Query the database for the user with the provided email
  const query = 'SELECT * FROM users WHERE email = ?';
  db.query(query, [email], (err, result) => {
    if (err) {
      console.error('Error fetching user: ', err);
      return res.status(500).json({ message: 'Error checking user.' });
    }

    if (result.length === 0) {
      // User not found
      return res.status(404).json({ message: 'User not found.' });
    }

    // Compare the provided password with the stored password hash
    const user = result[0];
    bcrypt.compare(password, user.password_hash, (err, isMatch) => {
      if (err) {
        console.error('Error comparing passwords: ', err);
        return res.status(500).json({ message: 'Error comparing passwords.' });
      }

      if (!isMatch) {
        // Passwords don't match
        return res.status(401).json({ message: 'Invalid password.' });
      }

      // Success - User authenticated
      return res.status(200).json({
        message: 'Login successful!',
        userId: user.id, // Send user ID or any other details
      });
    });
  });
});


// Route to send a friend request (using sender's email and receiver's username)
app.post('/send-friend-request', (req, res) => {
  const { senderEmail, receiverUsername } = req.body;

  // Basic validation
  if (!senderEmail || !receiverUsername) {
    return res.status(400).json({ message: 'Both sender email and receiver username are required.' });
  }

  // Query the database to get the sender's user ID using the email
  const senderQuery = 'SELECT user_id FROM users WHERE email = ?';
  db.query(senderQuery, [senderEmail], (err, senderResult) => {
    if (err) {
      console.error('Error fetching sender: ', err);
      return res.status(500).json({ message: 'Error fetching sender information.' });
    }

    if (senderResult.length === 0) {
      return res.status(404).json({ message: 'Sender not found.' });
    }

    const senderId = senderResult[0].user_id;

    // Query the database to get the receiver's user ID using the username
    const receiverQuery = 'SELECT user_id FROM users WHERE username = ?';
    db.query(receiverQuery, [receiverUsername], (err, receiverResult) => {
      if (err) {
        console.error('Error fetching receiver: ', err);
        return res.status(500).json({ message: 'Error fetching receiver information.' });
      }

      if (receiverResult.length === 0) {
        return res.status(404).json({ message: 'Receiver not found.' });
      }

      const receiverId = receiverResult[0].user_id;

      // **Prevent self-friend requests**
      if (senderId === receiverId) {
        return res.status(400).json({ message: 'You cannot send a friend request to yourself.' });
      }

      // Check if a friend request already exists between the two users
      const checkRequestQuery = 'SELECT * FROM friend_requests WHERE sender_id = ? AND receiver_id = ?';
      db.query(checkRequestQuery, [senderId, receiverId], (err, requestResult) => {
        if (err) {
          console.error('Error checking existing friend request: ', err);
          return res.status(500).json({ message: 'Error checking existing friend request.' });
        }

        if (requestResult.length > 0) {
          return res.status(400).json({ message: 'A friend request already exists between these users.' });
        }

        // Insert a new friend request
        const insertRequestQuery = 'INSERT INTO friend_requests (sender_id, receiver_id, status) VALUES (?, ?, ?)';
        db.query(insertRequestQuery, [senderId, receiverId, 'pending'], (err, result) => {
          if (err) {
            console.error('Error inserting friend request: ', err);
            return res.status(500).json({ message: 'Error sending friend request.' });
          }

          return res.status(201).json({ message: 'Friend request sent successfully.' });
        });
      });
    });
  });
});



// Route to get all incoming friend requests for a user based on their email
app.post('/incoming-friend-requests', (req, res) => {
  const { email } = req.body;

  // Basic validation
  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  // Query the database to get the user ID using the email
  const query = 'SELECT user_id FROM users WHERE email = ?';
  db.query(query, [email], (err, result) => {
    if (err) {
      console.error('Error fetching user: ', err);
      return res.status(500).json({ message: 'Error fetching user information.' });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const userId = result[0].user_id;

    // Query to fetch all incoming friend requests for the user (where they are the receiver)
    // We now join the `users` table to get the sender's username
    const checkRequestsQuery = `
      SELECT 
        fr.*, u.username AS senderUsername
      FROM 
        friend_requests fr
      JOIN 
        users u ON u.user_id = fr.sender_id
      WHERE 
        fr.receiver_id = ?
    `;

    db.query(checkRequestsQuery, [userId], (err, requests) => {
      if (err) {
        console.error('Error fetching friend requests: ', err);
        return res.status(500).json({ message: 'Error fetching friend requests.' });
      }

      if (requests.length === 0) {
        return res.status(200).json({ message: 'No incoming friend requests.' });
      }

      // Return the friend requests with the sender's username
      return res.status(200).json({
        message: 'Incoming friend requests found.',
        requests: requests,
      });
    });
  });
});

app.post('/accept-friend-request', (req, res) => {
  const { email, requestId } = req.body;
  console.log('Request body:', req.body);

  // Basic validation
  if (!email || !requestId) {
    return res.status(400).json({ message: 'Email and requestId are required.' });
  }

  // Query to get the user ID from the email
  const query = 'SELECT user_id FROM users WHERE email = ?';
  db.query(query, [email], (err, result) => {
    if (err) {
      console.error('Error fetching user: ', err);
      return res.status(500).json({ message: 'Error fetching user information.' });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const userId = result[0].user_id;

    // Query to get the friend request details
    const requestQuery = 'SELECT * FROM friend_requests WHERE request_id = ? AND receiver_id = ?';
    db.query(requestQuery, [requestId, userId], (err, requestResult) => {
      if (err) {
        console.error('Error fetching friend request: ', err);
        return res.status(500).json({ message: 'Error fetching friend request.' });
      }

      if (requestResult.length === 0) {
        return res.status(404).json({ message: 'Friend request not found or not for this user.' });
      }

      console.log('Friend request found:', requestResult);

      // Update the status of the friend request to "accepted"
      const updateQuery = 'UPDATE friend_requests SET status = ? WHERE request_id = ?';
      db.query(updateQuery, ['accepted', requestId], (err, updateResult) => {
        if (err) {
          console.error('Error updating friend request status: ', err);
          return res.status(500).json({ message: 'Error accepting friend request.' });
        }

        // Insert the friendship into the "friends" table (both directions)
        const insertFriendQuery = `
          INSERT INTO friends (user_id_1, user_id_2) 
          SELECT ?, ? 
          WHERE NOT EXISTS (
            SELECT 1 FROM friends 
            WHERE (user_id_1 = ? AND user_id_2 = ?) 
               OR (user_id_1 = ? AND user_id_2 = ?)
          );
        `;
        
        db.query(insertFriendQuery, 
          [userId, requestResult[0].sender_id, userId, requestResult[0].sender_id, requestResult[0].sender_id, userId], 
          (err, insertResult) => {
            if (err) {
              console.error('Error inserting into friends table:', err);
              return res.status(500).json({ message: 'Error adding friend.' });
            }
            
            // Remove the accepted request from the friend_requests table
            const deleteRequestQuery = 'DELETE FROM friend_requests WHERE request_id = ?';
            db.query(deleteRequestQuery, [requestId], (err, deleteResult) => {
              if (err) {
                console.error('Error deleting friend request:', err);
                return res.status(500).json({ message: 'Error cleaning up the friend request.' });
              }

              return res.status(200).json({ message: 'Friend request accepted and users are now friends.' });
            });
          }
        );
      });
    });
  });
});





app.post('/reject-friend-request', (req, res) => {
  const { email, requestId } = req.body;

  // Basic validation
  if (!email || !requestId) {
    return res.status(400).json({ message: 'Email and requestId are required.' });
  }

  // Query to get the user ID from the email
  const query = 'SELECT user_id FROM users WHERE email = ?';
  db.query(query, [email], (err, result) => {
    if (err) {
      console.error('Error fetching user: ', err);
      return res.status(500).json({ message: 'Error fetching user information.' });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const userId = result[0].user_id;

    // Query to get the friend request details (using `request_id`)
    const requestQuery = 'SELECT * FROM friend_requests WHERE request_id = ? AND receiver_id = ?';
    db.query(requestQuery, [requestId, userId], (err, requestResult) => {
      if (err) {
        console.error('Error fetching friend request: ', err);
        return res.status(500).json({ message: 'Error fetching friend request.' });
      }

      if (requestResult.length === 0) {
        return res.status(404).json({ message: 'Friend request not found or not for this user.' });
      }

      // Delete the friend request (or set status to 'rejected')
      const deleteQuery = 'DELETE FROM friend_requests WHERE request_id = ?';
      db.query(deleteQuery, [requestId], (err, deleteResult) => {
        if (err) {
          console.error('Error deleting friend request: ', err);
          return res.status(500).json({ message: 'Error rejecting friend request.' });
        }

        return res.status(200).json({ message: 'Friend request rejected.' });
      });
    });
  });
});



app.post('/get-friends', (req, res) => {
  const { email } = req.body;

  // Basic validation
  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  // Query to get the user ID from the email
  const query = 'SELECT user_id FROM users WHERE email = ?';
  db.query(query, [email], (err, result) => {
    if (err) {
      console.error('Error fetching user: ', err);
      return res.status(500).json({ message: 'Error fetching user information.' });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const userId = result[0].user_id;

    // Query to get all friends of the user
    const friendsQuery = `
      SELECT u.user_id, u.username, u.email 
      FROM users u
      JOIN friends f ON (u.user_id = f.user_id_1 OR u.user_id = f.user_id_2)
      WHERE (f.user_id_1 = ? OR f.user_id_2 = ?) AND u.user_id != ?
    `;

    db.query(friendsQuery, [userId, userId, userId], (err, friendsResult) => {
      if (err) {
        console.error('Error fetching friends: ', err);
        return res.status(500).json({ message: 'Error fetching friends.' });
      }

      if (friendsResult.length === 0) {
        return res.status(200).json({ message: 'No friends found.', friends: [] });
      }

      return res.status(200).json({
        message: 'Friends retrieved successfully.',
        friends: friendsResult,
      });
    });
  });
});


app.post('/get-username', (req, res) => {
  const { email } = req.body;

  // Basic validation
  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  // Query to get the username using the email
  const query = 'SELECT username FROM users WHERE email = ?';
  db.query(query, [email], (err, result) => {
    if (err) {
      console.error('Error fetching username: ', err);
      return res.status(500).json({ message: 'Error fetching username.' });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    return res.status(200).json({ 
      message: 'Username retrieved successfully.', 
      
      username: result[0].username 
    });
  });
});


app.post('/create-chat', (req, res) => {
  const { email, otherUserId } = req.body;

  if (!email || !otherUserId) {
    return res.status(400).json({ message: 'Both email and otherUserId are required.' });
  }

  const query = 'SELECT user_id FROM users WHERE email = ?';
  db.query(query, [email], (err, result) => {
    if (err) {
      console.error('Error fetching user: ', err);
      return res.status(500).json({ message: 'Error fetching user information.' });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const userId = result[0].user_id;

    if (userId === otherUserId) {
      return res.status(400).json({ message: 'You cannot create a chat with yourself.' });
    }

    const checkChatQuery = `
      SELECT chat_id FROM chats 
      WHERE (user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?)
    `;

    db.query(checkChatQuery, [userId, otherUserId, otherUserId, userId], (err, chatResult) => {
      if (err) {
        console.error('Error checking existing chat: ', err);
        return res.status(500).json({ message: 'Error checking existing chat.' });
      }

      if (chatResult.length > 0) {
        return res.status(200).json({ message: 'Chat already exists.', chatId: chatResult[0].chat_id });
      }

      const insertChatQuery = 'INSERT INTO chats (user_id_1, user_id_2) VALUES (?, ?)';
      db.query(insertChatQuery, [userId, otherUserId], (err, result) => {
        if (err) {
          console.error('Error inserting chat: ', err);
          return res.status(500).json({ message: 'Error creating chat.' });
        }

        return res.status(201).json({ message: 'Chat created successfully!', chatId: result.insertId });
      });
    });
  });
});



app.post('/send-message', (req, res) => {
  const { email, otherUserId, message } = req.body;

  // Basic validation
  if (!email || !otherUserId || !message) {
    return res.status(400).json({ message: 'Email, otherUserId, and message content are required.' });
  }

  // Query to get the user ID from the email
  const query = 'SELECT user_id FROM users WHERE email = ?';
  db.query(query, [email], (err, result) => {
    if (err) {
      console.error('Error fetching user: ', err);
      return res.status(500).json({ message: 'Error fetching user information.' });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const senderId = result[0].user_id;

    // Check if a chat exists between the sender and receiver
    const checkChatQuery = 'SELECT chat_id FROM chats WHERE (user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?)';
    db.query(checkChatQuery, [senderId, otherUserId, otherUserId, senderId], (err, chatResult) => {
      if (err) {
        console.error('Error checking existing chat: ', err);
        return res.status(500).json({ message: 'Error checking existing chat.' });
      }

      if (chatResult.length === 0) {
        return res.status(404).json({ message: 'No chat exists between these users.' });
      }

      const chatId = chatResult[0].chat_id;

      // Insert the message into the messages table
      const insertMessageQuery = 'INSERT INTO messages (chat_id, sender_id, content) VALUES (?, ?, ?)';
      db.query(insertMessageQuery, [chatId, senderId, message], (err, result) => {
        if (err) {
          console.error('Error inserting message: ', err);
          return res.status(500).json({ message: 'Error sending message.' });
        }

        return res.status(201).json({ message: 'Message sent successfully!', messageId: result.insertId });
      });
    });
  });
});




app.post('/get-messages', (req, res) => {
  const { email, otherUserId } = req.body;
  
  if (!email || !otherUserId) {
    return res.status(400).json({ message: 'Email and otherUserId are required' });
  }
  
  // Only log once per minute per user pair
  const cacheKey = `${email}-${otherUserId}`;
  const now = Date.now();
  
  // Create a cache object if it doesn't exist
  if (!global.logCache) {
    global.logCache = {};
  }
  
  // Only log if we haven't logged for this user pair in the last minute
  const shouldLog = !global.logCache[cacheKey] || (now - global.logCache[cacheKey] > 60000);
  
  if (shouldLog) {
    console.log(`Fetching messages between ${email} and user ID ${otherUserId}`);
    global.logCache[cacheKey] = now;
  }
  
  // First, get the user_id for the logged-in user
  const userQuery = 'SELECT user_id FROM users WHERE email = ?';
  db.query(userQuery, [email], (userErr, userResults) => {
    if (userErr || userResults.length === 0) {
      console.error('Error finding user ID:', userErr || 'User not found');
      return res.status(500).json({ message: 'Error finding user' });
    }
    
    const userId = userResults[0].user_id;
    
    if (shouldLog) {
      console.log(`Found user ID ${userId} for email ${email}`);
    }
    
    // Get the email of the other user
    const otherUserQuery = 'SELECT email FROM users WHERE user_id = ?';
    db.query(otherUserQuery, [otherUserId], (otherUserErr, otherUserResults) => {
      if (otherUserErr || otherUserResults.length === 0) {
        console.error('Error finding other user:', otherUserErr || 'User not found');
        return res.status(500).json({ message: 'Error finding other user' });
      }
      
      const otherUserEmail = otherUserResults[0].email;
      
      if (shouldLog) {
        console.log(`Found email ${otherUserEmail} for user ID ${otherUserId}`);
      }
      
      // Find the chat between these two users
      const chatQuery = `
        SELECT chat_id FROM chats 
        WHERE (user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?)
      `;
      
      db.query(chatQuery, [userId, otherUserId, otherUserId, userId], (chatErr, chatResults) => {
        if (chatErr) {
          console.error('Error finding chat:', chatErr);
          return res.status(500).json({ message: 'Error finding chat' });
        }
        
        if (shouldLog) {
          console.log('Chat query results:', chatResults);
        }
        
        if (chatResults.length === 0) {
          // No chat exists yet
          if (shouldLog) {
            console.log('No chat found between these users');
          }
          return res.json([]);
        }
        
        const chatId = chatResults[0].chat_id;
        
        if (shouldLog) {
          console.log(`Found chat ID ${chatId}`);
        }
        
        // Get messages for this chat, including the seen status
        const messagesQuery = `
          SELECT m.message_id, m.content, m.created_at, m.seen, 
                 u.email as sender_email, u.user_id as sender_id
          FROM messages m
          JOIN users u ON m.sender_id = u.user_id
          WHERE m.chat_id = ?
          ORDER BY m.created_at ASC
        `;
        
        db.query(messagesQuery, [chatId], (messagesErr, messagesResults) => {
          if (messagesErr) {
            console.error('Error fetching messages:', messagesErr);
            return res.status(500).json({ message: 'Error fetching messages' });
          }
          
          if (shouldLog) {
            console.log(`Found ${messagesResults.length} messages for chat ID ${chatId}`);
          }
          
          // Add recipient_email to each message
          const messages = messagesResults.map(msg => {
            return {
              ...msg,
              recipient_email: msg.sender_email === email ? otherUserEmail : email
            };
          });
          
          // Log messages with seen status
          if (shouldLog) {
            const seenMessages = messages.filter(msg => msg.seen === 1);
            console.log(`Found ${seenMessages.length} messages with seen status`);
          }
          
          return res.json(messages);
        });
      });
    });
  });
});





// Start the server

server.listen(5000, () => {
  console.log(`Server is running on http://localhost:5000`);
});
