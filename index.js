const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const emoji = require('node-emoji');
const {
    createUser,
    updateUserStatus,
    getAllUsers,
    saveMessage,
    getRecentMessages,
    savePrivateMessage,
    getPrivateMessages
} = require('./database');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const connectedUsers = new Map();

app.use(express.static(path.join(__dirname, 'public')));

const getSocketIdByUsername = (username) => {
    for (const [id, name] of connectedUsers.entries()) {
        if (name === username) return id;
    }
    return null;
};

const emitUpdatedUsersList = async () => {
    try {
        const users = await getAllUsers();
        io.emit('users list', users.map(user => ({
            username: user.username,
            status: user.status,
            last_seen: user.last_seen ? new Date(user.last_seen).toISOString() : null
        })));
    } catch (error) {
        console.error('Error al emitir lista de usuarios:', error);
    }
};

io.on('connection', async (socket) => {
    console.log('Un usuario se conectó');
    try {
        const recentMessages = await getRecentMessages(50);
        const formattedMessages = recentMessages.map(msg => ({
            username: msg.sender,
            message: msg.content,
            timestamp: msg.created_at
        }));
        socket.emit('recent messages', formattedMessages);
        
        await emitUpdatedUsersList();
    } catch (error) {
        console.error('Error al cargar datos iniciales:', error);
    }

    socket.on('user joined', async (username) => {
        try {
            await createUser(username);
            socket.username = username;
            connectedUsers.set(socket.id, username);

            await emitUpdatedUsersList();

            const systemMessage = {
                username: 'Sistema',
                message: `${username} se ha unido al chat`,
                timestamp: new Date().toISOString()
            };
            await saveMessage('Sistema', systemMessage.message);
            io.emit('chat message', systemMessage);

        } catch (error) {
            console.error('Error al registrar usuario:', error);
            socket.emit('error', 'Error al registrar usuario');
        }
    });

    socket.on('chat message', async (data) => {
        try {
            if (!data.message || !data.username) {
                console.error('Datos de mensaje inválidos:', data);
                return;
            }

            const messageWithEmojis = emoji.emojify(data.message);
            const messageData = {
                username: data.username,
                message: messageWithEmojis,
                timestamp: new Date().toISOString()
            };

            await saveMessage(data.username, messageWithEmojis);
            io.emit('chat message', messageData);

        } catch (error) {
            console.error('Error al procesar mensaje:', error);
            socket.emit('error', 'Error al enviar mensaje');
        }
    });

    socket.on('private message', async (data) => {
        try {
            if (!data.message || !data.sender || !data.receiver) {
                console.error('Datos de mensaje privado inválidos:', data);
                return;
            }

            const receiverSocketId = getSocketIdByUsername(data.receiver);
            const messageWithEmojis = emoji.emojify(data.message);

            const messageData = {
                sender: data.sender,
                receiver: data.receiver,
                message: messageWithEmojis,
                timestamp: new Date().toISOString(),
                isPrivate: true
            };

            await savePrivateMessage(data.sender, data.receiver, messageWithEmojis);

            if (receiverSocketId && receiverSocketId !== socket.id) {
                io.to(receiverSocketId).emit('private message', messageData);
            }
            socket.emit('private message', messageData);

        } catch (error) {
            console.error('Error al enviar mensaje privado:', error);
            socket.emit('error', 'Error al enviar mensaje privado');
        }
    });

    socket.on('load private messages', async (data) => {
        try {
            const messages = await getPrivateMessages(data.user1, data.user2);
            const formattedMessages = messages.map(msg => ({
                sender: msg.sender,
                receiver: msg.receiver,
                message: msg.content,
                timestamp: msg.created_at,
                isPrivate: true
            }));
            socket.emit('private messages history', formattedMessages);
        } catch (error) {
            console.error('Error al cargar mensajes privados:', error);
            socket.emit('error', 'Error al cargar mensajes privados');
        }
    });

    socket.on('typing', (username) => {
        if (username) {
            socket.broadcast.emit('user typing', username);
        }
    });

    socket.on('stop typing', (username) => {
        if (username) {
            socket.broadcast.emit('stop typing', username);
        }
    });

    socket.on('disconnect', async () => {
        if (socket.username) {
            try {
                await updateUserStatus(socket.username, 'offline');
                connectedUsers.delete(socket.id);
                await emitUpdatedUsersList();

                const systemMessage = {
                    username: 'Sistema',
                    message: `${socket.username} ha dejado el chat`,
                    timestamp: new Date().toISOString()
                };
                
                await saveMessage('Sistema', systemMessage.message);
                io.emit('chat message', systemMessage);

            } catch (error) {
                console.error('Error al desconectar usuario:', error);
            }
        }
        console.log('Usuario desconectado');
    });
});

io.on('error', (error) => {
    console.error('Error de Socket.IO:', error);
});

const ports = [3000, 3001, 3002, 3003];
let currentPortIndex = 0;

function tryPort() {
    const PORT = ports[currentPortIndex];
    server.listen(PORT)
        .on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`Puerto ${PORT} en uso, probando siguiente puerto...`);
                currentPortIndex++;
                if (currentPortIndex < ports.length) {
                    tryPort();
                } else {
                    console.error('No hay puertos disponibles');
                    process.exit(1);
                }
            } else {
                console.error('Error al iniciar el servidor:', err);
                process.exit(1);
            }
        })
        .on('listening', () => {
            console.log(`Servidor corriendo en http://localhost:${PORT}`);
        });
}

tryPort();