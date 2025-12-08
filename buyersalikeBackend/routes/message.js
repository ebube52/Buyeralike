// routes/messages.js
const express = require('express');
const router = express.Router();
const models = require('../models');
const { protect, checkAuth } = require('../middleware/auth');
const { Sequelize } = require('sequelize');

// Create a Message
// router.post('/send-message', protect, async (req, res) => {
//   const { from_user_id, to_user_id, message } = req.body;
  
//   try {
//     const newMessage = await models.Message.create({ 
//       from_user_id, 
//       to_user_id, 
//       message 
//     });
//     res.status(200).json({ message: 'Message sent successfully', newMessage });
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to send message' });
//   }
// });

// routes/messages.js
router.get('/get-messages/:user1/:user2', protect, async (req, res) => {
    const { user1, user2 } = req.params;
  
    try {
      const messages = await models.Message.findAll({
        where: {
          [Sequelize.Op.or]: [
            { from_user_id: user1, to_user_id: user2 },
            { from_user_id: user2, to_user_id: user1 },
          ]
        },
        order: [['sent_on', 'ASC']],
      });
      res.status(200).json(messages);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// routes/messages.js
router.post('/mark-as-read', protect, async (req, res) => {
    const { messageId } = req.body;
  
    try {
      await models.Message.update({ is_read: true }, { where: { id: messageId } });
      res.status(200).json({ message: 'Message marked as read' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to mark message as read' });
    }
});
  

module.exports = router;
