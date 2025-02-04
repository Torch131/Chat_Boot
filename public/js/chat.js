class ChatManager {
    constructor() {
        this.socket = io();
        this.username = '';
        this.currentChat = 'public';
        this.activePrivateChat = null;
        this.privateChats = new Map();
        this.typingTimeout = null;
        this.activeTypers = new Set();
        
        this.callbacks = {
            message: null,
            userList: null,
            typing: null,
            recentMessages: null,
            connectionStatus: null
        };

        this.setupSocketListeners();
        console.log('ChatManager: Inicializado');
    }

    setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('Socket.IO: Conexión establecida');
            if (this.callbacks.connectionStatus) {
                this.callbacks.connectionStatus(true);
            }
        });

        this.socket.on('disconnect', () => {
            console.log('Socket.IO: Desconectado');
            if (this.callbacks.connectionStatus) {
                this.callbacks.connectionStatus(false);
            }
        });

        this.socket.on('recent messages', (messages) => {
            console.log('Mensajes recientes recibidos:', messages);
            if (Array.isArray(messages)) {
                messages.forEach(msg => {
                    if (this.callbacks.message) {
                        this.callbacks.message(msg, false);
                    }
                });
                if (this.callbacks.recentMessages) {
                    this.callbacks.recentMessages(messages);
                }
            }
        });

        this.socket.on('chat message', (data) => {
            console.log('Mensaje público recibido:', data);
            if (this.callbacks.message && data && data.message) {
                if (!data.timestamp) {
                    data.timestamp = new Date();
                }
                this.callbacks.message(data, false);
            }
        });

        this.socket.on('private message', (data) => {
            console.log('Mensaje privado recibido:', data);
            if (data && (data.sender || data.receiver)) {
                const otherUser = data.sender === this.username ? data.receiver : data.sender;
                
                if (!this.privateChats.has(otherUser)) {
                    this.privateChats.set(otherUser, []);
                }
                
                const messages = this.privateChats.get(otherUser);
                messages.push({
                    ...data,
                    timestamp: data.timestamp || new Date(),
                    isPrivate: true
                });
                
                if (this.callbacks.message) {
                    this.callbacks.message(data, true);
                }
                console.log('Chats privados actualizados:', this.privateChats);
            }
        });

        this.socket.on('users list', (users) => {
            console.log('Lista de usuarios actualizada:', users);
            if (Array.isArray(users) && this.callbacks.userList) {
                this.callbacks.userList(users);
            }
        });

        this.socket.on('user typing', (username) => {
            if (username && username !== this.username) {
                this.activeTypers.add(username);
                if (this.callbacks.typing) {
                    this.callbacks.typing(Array.from(this.activeTypers));
                }
            }
        });

        this.socket.on('stop typing', (username) => {
            if (username) {
                this.activeTypers.delete(username);
                if (this.callbacks.typing) {
                    this.callbacks.typing(Array.from(this.activeTypers));
                }
            }
        });

        // Manejo de errores
        this.socket.on('error', (error) => {
            console.error('Error de Socket.IO:', error);
        });
    }

    setUsername(username) {
        if (!username || typeof username !== 'string' || !username.trim()) {
            console.error('Nombre de usuario inválido');
            return false;
        }
        
        this.username = username.trim();
        this.socket.emit('user joined', this.username);
        console.log('Usuario registrado:', this.username);
        return true;
    }

    // Envío de mensajes
    sendMessage(message) {
        if (!message || typeof message !== 'string' || !message.trim() || !this.username) {
            console.error('Mensaje inválido o usuario no registrado');
            return false;
        }

        const messageContent = message.trim();
        const timestamp = new Date();

        if (this.currentChat === 'public') {
            const messageData = {
                username: this.username,
                message: messageContent,
                timestamp: timestamp
            };
            console.log('Enviando mensaje público:', messageData);
            this.socket.emit('chat message', messageData);
        } else if (this.activePrivateChat) {
            const privateMessage = {
                sender: this.username,
                receiver: this.activePrivateChat,
                message: messageContent,
                timestamp: timestamp,
                isPrivate: true
            };
            
            console.log('Enviando mensaje privado:', privateMessage);
            this.socket.emit('private message', privateMessage);

            if (!this.privateChats.has(this.activePrivateChat)) {
                this.privateChats.set(this.activePrivateChat, []);
            }
            this.privateChats.get(this.activePrivateChat).push(privateMessage);
        }

        this.socket.emit('stop typing', this.username);
        return true;
    }

    startPrivateChat(receiverUsername) {
        if (!receiverUsername || receiverUsername === this.username) {
            console.error('Usuario receptor inválido');
            return null;
        }

        if (!this.privateChats.has(receiverUsername)) {
            this.privateChats.set(receiverUsername, []);
        }
        
        this.activePrivateChat = receiverUsername;
        this.currentChat = 'private';
        
        console.log('Chat privado iniciado con:', receiverUsername);
        console.log('Mensajes en la conversación:', this.privateChats.get(receiverUsername));
        
        return this.privateChats.get(receiverUsername);
    }

    handleTyping() {
        if (!this.username) return;
        
        this.socket.emit('typing', this.username);
        clearTimeout(this.typingTimeout);
        
        this.typingTimeout = setTimeout(() => {
            this.socket.emit('stop typing', this.username);
        }, 1000);
    }

    onConnectionStatus(callback) {
        this.callbacks.connectionStatus = callback;
    }

    onRecentMessages(callback) {
        this.callbacks.recentMessages = callback;
    }

    onMessage(callback) {
        this.callbacks.message = callback;
    }

    onUserList(callback) {
        this.callbacks.userList = callback;
    }

    onTypingUpdate(callback) {
        this.callbacks.typing = callback;
    }

    // Getters
    getUsername() {
        return this.username;
    }

    getCurrentChat() {
        return this.currentChat;
    }

    getActivePrivateChat() {
        return this.activePrivateChat;
    }

    getPrivateChats() {
        return this.privateChats;
    }

    switchChat(chatType) {
        if (chatType === 'public' || chatType === 'private') {
            this.currentChat = chatType;
            if (chatType === 'public') {
                this.activePrivateChat = null;
            }
            return true;
        }
        return false;
    }

    clearCurrentPrivateChat() {
        if (this.activePrivateChat) {
            this.privateChats.delete(this.activePrivateChat);
            this.activePrivateChat = null;
        }
    }

    // Desconexión
    disconnect() {
        if (this.socket) {
            clearTimeout(this.typingTimeout);
            this.privateChats.clear();
            this.activeTypers.clear();
            this.username = '';
            this.currentChat = 'public';
            this.activePrivateChat = null;
            this.socket.disconnect();
            console.log('Desconexión completada');
        }
    }
}

// Exportar la clase para su uso
export default ChatManager;