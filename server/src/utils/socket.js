const Message = require('../models/message.model.js');
let io;

module.exports = {
  init: (httpServer) => {
    io = require('socket.io')(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"]
      }
    });

    io.on('connection', (socket) => {
      console.log('Client connected');

      // Join a specific group chat room
      socket.on('join_group', (groupId) => {
        socket.join(groupId);
      });

      // Leave a specific group chat room
      socket.on('leave_group', (groupId) => {
        socket.leave(groupId);
      });

      // Handle real-time typing indicators
      socket.on('typing', (payload) => {
        // Broadcast to everyone in the room EXCEPT the sender
        socket.to(payload.group_id).emit('typing_status', payload);
      });

      // Handle real-time individual message read receipts
      socket.on('mark_read', async ({ messageId, groupId, userEmail }) => {
        try {
          // Update DB directly via socket to save HTTP overhead
          const updatedMsg = await Message.findByIdAndUpdate(
            messageId,
            { $addToSet: { read_by: userEmail } }, // $addToSet prevents duplicate emails
            { new: true }
          );

          if (updatedMsg) {
            // Tell everyone in the room that this message was read
            io.to(groupId).emit('message_read', { 
              messageId: updatedMsg._id, 
              readBy: updatedMsg.read_by 
            });
          }
        } catch (error) {
          console.error('Socket mark_read error:', error);
        }
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected');
      });
    });

    return io;
  },
  
  // Helper to get the IO instance anywhere in your app (like in controllers)
  getIO: () => {
    if (!io) {
      throw new Error("Socket.io not initialized!");
    }
    return io;
  }
};