const Message = require('../models/message.model.js');
const socket = require('../utils/socket.js'); 

exports.getMessages = async (req, res) => {
  try {
    const { group_id } = req.query;
    
    // Build query: If group_id is provided, filter by it. Otherwise return all
    const query = group_id ? { group_id } : {};

    // Get messages, sorted by oldest to newest
    const messages = await Message.find(query).sort({ created_at: 1 });
    
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch messages", error: error.message });
  }
};

exports.createMessage = async (req, res) => {
  try {
    // 1. Save message to database
    const newMessage = new Message(req.body);
    await newMessage.save();

    // 2. Broadcast the message to everyone in the group room in real-time
    const io = socket.getIO();
    io.to(req.body.group_id).emit('receive_message', newMessage);

    // 3. Respond to the sender
    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ message: "Failed to send message", error: error.message });
  }
};

exports.markGroupAsRead = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userEmail = req.user?.email || req.body?.userEmail; 

    if (!userEmail) {
      return res.status(400).json({ message: "userEmail is required to mark messages as read" });
    }

    const result = await Message.updateMany(
      { 
        group_id: groupId, 
        sender_email: { $ne: userEmail },
        read_by: { $ne: userEmail }
      },
      { 
        $push: { read_by: userEmail } 
      }
    );
    
    // ✨ FIX: Báo qua Socket cho người gửi biết là "Tôi vừa vào phòng và đọc hết tin nhắn rồi!"
    if (result.modifiedCount > 0) {
      const io = socket.getIO();
      // Phát tín hiệu 'group_messages_read' tới tất cả những ai đang mở group này
      io.to(groupId).emit('group_messages_read', { groupId, userEmail });
    }

    res.status(200).json({ 
      message: "Messages marked as read",
      updatedCount: result.modifiedCount 
    });
  } catch (error) {
    console.error("Error in markGroupAsRead:", error);
    res.status(500).json({ message: "Failed to mark messages as read", error: error.message });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    await Message.findByIdAndDelete(id);
    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete message", error: error.message });
  }
};