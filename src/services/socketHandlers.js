// // Store active connections
// const activeConnections = new Map();

// module.exports = function(io) {
//   io.on('connection', (socket) => {
//     console.log('New client connected:', socket.id);
    
//     // Store user connection when they connect
//     socket.on('user_connected', (userData) => {
//       if (!userData || !userData.email) {
//         console.warn('Invalid user data received for connection');
//         return;
//       }
      
//       console.log('User connected:', userData.email, 'Socket ID:', socket.id);
//       activeConnections.set(userData.email, socket.id);
      
//       // Log all active connections for debugging
//       console.log('Active connections:', Array.from(activeConnections.entries()));
//     });"http://localhost:5000/get-messages"
    
//     // Handle refetch-messages event
//     socket.on('refetch-messages', (data) => {
//       if (!data || !data.recipient_user_id) {
//         console.warn('Invalid data for refetch-messages event');
//         return;
//       }
      
//       console.log('Refetch messages for recipient:', data.recipient_user_id);
      
//       // Note: recipient_user_id is the user ID, not the email
//       // We need to find the corresponding email for this user ID
//       // For now, we'll assume recipient_user_id is the email
//       const recipientSocketId = activeConnections.get(data.recipient_user_id);
//       if (recipientSocketId) {
//         io.to(recipientSocketId).emit('refetch-messages');
//         console.log('Notification sent to recipient:', data.recipient_user_id);
//       } else {
//         console.log('Recipient not connected:', data.recipient_user_id);
//       }
//     });
    
//     // Handle mark_message_seen event
//     socket.on('mark_message_seen', (data) => {
//       if (!data || !data.messageId || !data.senderId || !data.recipientId) {
//         console.warn('Invalid data for mark_message_seen event:', data);
//         return;
//       }
      
//       console.log('Message marked as seen:', data);
//       console.log('Looking for sender socket ID for:', data.senderId);
      
//       // Note: senderId and recipientId are both email addresses
//       const senderSocketId = activeConnections.get(data.senderId);
      
//       if (senderSocketId) {
//         console.log('Sender found with socket ID:', senderSocketId);
//         // Notify the sender that their message has been seen
//         io.to(senderSocketId).emit('message_seen', {
//           messageId: data.messageId,
//           senderId: data.senderId,      // Sender's email
//           recipientId: data.recipientId 
//         });
//         console.log('Seen notification sent to sender:', data.senderId);
//       } else {
//         console.log('Sender not connected:', data.senderId);
//       }
//     });
    
//     socket.on('disconnect', () => {
//       // Remove user from active connections
//       let disconnectedUser = null;
      
//       for (const [email, id] of activeConnections.entries()) {
//         if (id === socket.id) {
//           disconnectedUser = email;
//           activeConnections.delete(email);
//           break;
//         }
//       }
      
//       console.log('User disconnected:', disconnectedUser || 'Unknown user', 'Socket ID:', socket.id);
//       console.log('Remaining connections:', Array.from(activeConnections.entries()));
//     });
//   });
// };