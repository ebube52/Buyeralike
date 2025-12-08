const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const onlineUsers = new Map();
const models = require('./models');
const { Op } = require('sequelize'); // Import Sequelize Operators

module.exports = (server) => {
    // Log the environment variables being used for CORS
    console.log('--- Socket.IO Server Initialization ---');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('FRONTEND_URL (production):', process.env.FRONTEND_URL);
    console.log('JWT_SECRET (exists):', !!process.env.JWT_SECRET); // Check if secret exists, don't print value
    console.log('JWT_SECRET_ADMIN (exists):', !!process.env.JWT_SECRET_ADMIN); // Check if secret exists

    const allowedOrigin = process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : "http://localhost:5173";
    console.log('Configured allowedOrigin for CORS:', allowedOrigin);

    const io = socketIo(server, {
        cors: {
            origin: allowedOrigin,
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    console.log('Socket.IO server initialized.');

    // Authentication Middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        console.log(`[Auth Middleware] Incoming connection attempt. Token present: ${!!token}`);

        if (!token) {
            console.warn('[Auth Middleware] Authentication error: No token provided.');
            return next(new Error('Authentication error: No token'));
        }

        try {
            let decoded;
            try {
                // Try verifying with the regular user secret
                decoded = jwt.verify(token, process.env.JWT_SECRET);
                console.log('[Auth Middleware] Token verified with JWT_SECRET.');
            } catch (userVerifyError) {
                console.warn('[Auth Middleware] JWT_SECRET verification failed. Trying JWT_SECRET_ADMIN. Error:', userVerifyError.message);
                try {
                    decoded = jwt.verify(token, process.env.JWT_SECRET_ADMIN);
                    console.log('[Auth Middleware] Token verified with JWT_SECRET_ADMIN.');
                } catch (adminVerifyError) {
                    // If both fail, then the token is truly invalid
                    console.error('[Auth Middleware] JWT verification failed with BOTH secrets. User error:', userVerifyError.message, 'Admin error:', adminVerifyError.message);
                    return next(new Error('Authentication error: Invalid token'));
                }
            }
            socket.user = decoded;
            console.log(`[Auth Middleware] User authenticated: ${socket.user.id}`);
            next();
        } catch (err) {
            // This outer catch handles any unexpected errors during the process
            console.error('[Auth Middleware] Unexpected error during JWT authentication:', err);
            return next(new Error('Authentication error: Invalid token'));
        }
    });

    // Connection Event
    io.on('connection', (socket) => {
        const userId = socket.user.id;
        onlineUsers.set(userId, socket.id);
        console.log(`[Connection] User connected: ${userId}, socket ID: ${socket.id}`);
        console.log('[Connection] Current onlineUsers map size:', onlineUsers.size);
        // console.log('[Connection] Online users:', Array.from(onlineUsers.keys())); // Uncomment for full list

        // Send Message Event
        socket.on('send-message', async (messageData) => {
            const { to_user_id, message, optimisticId } = messageData;
            const from_user_id = userId;
            console.log(`[send-message] Received message from ${from_user_id} to ${to_user_id}. Optimistic ID: ${optimisticId}`);
            console.log('[send-message] Message content:', message);

            try {
                // Check if connection exists between users
                const connection = await models.Connection.findOne({
                    where: {
                        [Op.or]: [
                            { requesterId: from_user_id, receiverId: to_user_id },
                            { requesterId: to_user_id, receiverId: from_user_id }
                        ],
                        status: 'connected',
                    }
                });
                console.log(`[send-message] Connection check result for ${from_user_id} and ${to_user_id}:`, connection ? 'Found' : 'Not Found');

                if (!connection) {
                    console.warn(`[send-message] Connection not found between ${from_user_id} and ${to_user_id}. Emitting error.`);
                    return socket.emit('error', { message: 'You are not connected to this user.' });
                }

                // Create new message in DB
                const newMessage = await models.Message.create({
                    from_user_id,
                    to_user_id,
                    message,
                });
                console.log(`[send-message] Message saved to DB. ID: ${newMessage.id}`);

                // Emit to receiver if online
                const receiverSocketId = onlineUsers.get(to_user_id);
                if (receiverSocketId) {
                    console.log(`[send-message] Receiver ${to_user_id} is online. Emitting 'new-message' to socket ID: ${receiverSocketId}`);
                    io.to(receiverSocketId).emit('new-message', newMessage);
                } else {
                    console.log(`[send-message] Receiver ${to_user_id} is offline. Message will be delivered when they connect.`);
                }

                // Emit confirmation to sender, including optimisticId
                console.log(`[send-message] Emitting 'new-message' confirmation to sender ${from_user_id} with optimistic ID: ${optimisticId}`);
                socket.emit('new-message', { ...newMessage.get({ plain: true }), optimisticId });

            } catch (error) {
                console.error('[send-message] Error sending message:', error);
                socket.emit('message-error', { message: 'Failed to send message.', optimisticId });
            }
        });

        // View Chat Event (Load history and mark as read)
        socket.on('view-chat', async (otherUserId) => {
            const viewerId = userId;
            console.log(`[view-chat] User ${viewerId} viewing chat with ${otherUserId}.`);

            try {
                // 1. Mark ALL incoming messages from otherUserId to viewerId as read
                const [updatedCount] = await models.Message.update(
                    { is_read: true },
                    {
                        where: {
                            from_user_id: otherUserId,
                            to_user_id: viewerId,
                        }
                    }
                );
                console.log(`[view-chat] Marked ${updatedCount} messages from ${otherUserId} to ${viewerId} as read.`);

                // 2. Retrieve ALL messages between the two users
                const allMessages = await models.Message.findAll({
                    where: {
                        [Op.or]: [
                            { from_user_id: viewerId, to_user_id: otherUserId },
                            { from_user_id: otherUserId, to_user_id: viewerId }
                        ]
                    },
                    order: [['sent_on', 'ASC']]
                });
                console.log(`[view-chat] Retrieved ${allMessages.length} messages for chat between ${viewerId} and ${otherUserId}.`);

                // 3. Emit all retrieved messages back to the client who requested to view the chat
                console.log(`[view-chat] Emitting 'chat-history' to ${viewerId} for partner ${otherUserId}.`);
                socket.emit('chat-history', {
                    partnerId: otherUserId,
                    messages: allMessages
                });

                // 4. If any messages were newly marked as read, notify other participants
                if (updatedCount > 0) {
                    const newlyReadMessages = await models.Message.findAll({
                        where: {
                            from_user_id: otherUserId,
                            to_user_id: viewerId,
                            is_read: true,
                            updatedAt: {
                                [Op.gt]: models.sequelize.literal('NOW() - INTERVAL 5 SECOND')
                            }
                        },
                        attributes: ['id']
                    });
                    const readMessageIds = newlyReadMessages.map(msg => msg.id);
                    console.log(`[view-chat] Newly read message IDs to broadcast: ${readMessageIds.join(', ')}`);

                    const participants = [viewerId, otherUserId];
                    participants.forEach(participantId => {
                        const participantSocketId = onlineUsers.get(participantId);
                        if (participantSocketId) {
                            console.log(`[view-chat] Notifying participant ${participantId} (socket ID: ${participantSocketId}) about read messages.`);
                            io.to(participantSocketId).emit('messages-read', {
                                partnerId: otherUserId,
                                readMessageIds,
                                viewerId
                            });
                        } else {
                            console.log(`[view-chat] Participant ${participantId} is offline, cannot notify about read messages.`);
                        }
                    });
                }
            } catch (error) {
                console.error('[view-chat] Error handling view-chat:', error);
                socket.emit('error', { message: 'Failed to load chat or update read status.' });
            }
        });

        // Disconnect Event
        socket.on('disconnect', () => {
            onlineUsers.delete(userId);
            console.log(`[Disconnect] User disconnected: ${userId}`);
            console.log('[Disconnect] Current onlineUsers map size:', onlineUsers.size);
        });
    });

    return io;
};
