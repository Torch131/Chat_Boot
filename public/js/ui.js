class ChatUI {
    constructor(chatManager) {
        this.chatManager = chatManager;
        this.elements = this.initializeElements();
        this.emojiList = ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊',  
                         '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗',
                         '🙃','😙', '😚', '😋', '😛', '😝', '😜', '🤪',
                         '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒',
                         '👍', '👎', '👋', '🙌', '👏', '🤝', '👊', '✊',
                         '🤛', '🤜', '🤚', '✨', '⭐', '🔥',
                         '❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤',
                         '🎉', '💫', '💯', '💢', '💥', '💫', '💦'];
        
        this.setupEventListeners();
        this.setupChatManagerCallbacks();
        this.setupEmojiGrid();
    }

    initializeElements() {
        return {
            loginForm: document.getElementById('login-form'),
            chatFormContainer: document.getElementById('chat-form-container'),
            usernameInput: document.getElementById('username-input'),
            loginButton: document.getElementById('login-button'),
            chatForm: document.getElementById('chat-form'),
            messageInput: document.getElementById('message-input'),
            publicMessages: document.getElementById('public-messages'),
            privateMessages: document.getElementById('private-messages'),
            usersList: document.getElementById('users-list'),
            typingIndicator: document.getElementById('typing-indicator'),
            typingDots: document.getElementById('typing-dots'),
            publicTab: document.getElementById('public-tab'),
            privateTab: document.getElementById('private-tab'),
            currentChatMessages: document.getElementById('current-chat-messages'),
            currentChatHeader: document.getElementById('current-chat-header'),
            privateChatsList: document.getElementById('private-chats-list'),
            emojiButton: document.getElementById('emoji-button'),
            emojiModal: document.getElementById('emoji-modal'),
            emojiGrid: document.getElementById('emoji-grid'),
            closeEmojiModal: document.getElementById('close-emoji-modal')
        };
    }

    setupEventListeners() {
        this.elements.loginButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        this.elements.usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleLogin();
            }
        });

        this.elements.chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleMessageSubmit();
        });

        this.elements.messageInput.addEventListener('input', () => {
            this.chatManager.handleTyping();
        });

        this.elements.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleMessageSubmit();
            }
        });

        this.elements.publicTab.addEventListener('click', () => this.switchTab('public'));
        this.elements.privateTab.addEventListener('click', () => this.switchTab('private'));

        this.elements.emojiButton.addEventListener('click', () => this.toggleEmojiModal());
        this.elements.closeEmojiModal.addEventListener('click', () => this.toggleEmojiModal(false));

        window.addEventListener('click', (e) => {
            if (e.target === this.elements.emojiModal) {
                this.toggleEmojiModal(false);
            }
        });

        window.chatUI = this;
    }
    setupChatManagerCallbacks() {
        this.chatManager.onMessage((data, isPrivate) => {
            if (data) {
                console.log('Mensaje recibido:', data, 'Es privado:', isPrivate);
                this.appendMessage(data, isPrivate);
                if (isPrivate) {
                    this.updatePrivateChatsList();
                }
            }
        });

        this.chatManager.onUserList((users) => {
            if (Array.isArray(users)) {
                this.updateUsersList(users);
            }
        });

        this.chatManager.onTypingUpdate((typers) => {
            if (Array.isArray(typers)) {
                this.updateTypingIndicator(typers);
            }
        });

        this.chatManager.onRecentMessages((messages) => {
            if (Array.isArray(messages)) {
                messages.forEach(msg => {
                    if (msg) this.appendMessage(msg, false);
                });
            }
        });
    }

    handleLogin() {
        const username = this.elements.usernameInput.value.trim();
        if (username) {
            if (this.chatManager.setUsername(username)) {
                this.elements.loginForm.classList.add('hidden');
                this.elements.chatFormContainer.classList.remove('hidden');
                this.elements.messageInput.focus();
            }
        }
    }

    handleMessageSubmit() {
        const message = this.elements.messageInput.value.trim();
        if (message && this.chatManager.sendMessage(message)) {
            this.elements.messageInput.value = '';
            this.elements.messageInput.focus();
        }
    }

    appendMessage(data, isPrivate = false) {
        if (!data || (!data.message && !data.content)) {
            console.error('Mensaje inválido:', data);
            return;
        }

        const messageDiv = document.createElement('div');
        const isOwnMessage = data.sender === this.chatManager.getUsername() || 
                           data.username === this.chatManager.getUsername();

        let className = 'message-bubble p-4 rounded-lg mb-2 max-w-[80%] ';
        if (isOwnMessage) {
            className += 'ml-auto bg-gradient-to-r from-indigo-500 to-purple-500 text-white';
        } else {
            className += 'bg-gray-100';
        }

        messageDiv.className = className;

        let time;
        try {
            time = new Date(data.timestamp || data.created_at).toLocaleTimeString();
        } catch (error) {
            time = new Date().toLocaleTimeString();
        }

        const message = data.message || data.content || '';
        let senderName = data.username || data.sender || 'Sistema';
        
        messageDiv.innerHTML = `
            <div class="flex items-center gap-2 mb-1">
                <span class="font-semibold ${isOwnMessage ? 'text-white' : 'text-indigo-600'}">
                    ${senderName}
                </span>
                <span class="text-xs ${isOwnMessage ? 'text-indigo-100' : 'text-gray-500'}">
                    ${time}
                </span>
            </div>
            <div class="${isOwnMessage ? 'text-white' : 'text-gray-800'}">
                ${message}
            </div>
        `;

        let container;
        if (isPrivate) {
            if (this.chatManager.getActivePrivateChat() === (data.sender === this.chatManager.getUsername() ? data.receiver : data.sender)) {
                container = this.elements.currentChatMessages;
            }
        } else {
            container = this.elements.publicMessages;
        }

        if (container) {
            container.appendChild(messageDiv);
            container.scrollTop = container.scrollHeight;
        }
    }
    switchTab(tab) {
        if (!tab) return;
        
        const isPublic = tab === 'public';
        
        this.elements.publicTab.classList.toggle('bg-indigo-600', isPublic);
        this.elements.publicTab.classList.toggle('text-white', isPublic);
        this.elements.privateTab.classList.toggle('bg-indigo-600', !isPublic);
        this.elements.privateTab.classList.toggle('text-white', !isPublic);
        
        this.elements.publicMessages.classList.toggle('hidden', !isPublic);
        this.elements.privateMessages.classList.toggle('hidden', isPublic);

        this.chatManager.currentChat = tab;
    }

    setupEmojiGrid() {
        if (this.elements.emojiGrid) {
            this.elements.emojiGrid.innerHTML = this.emojiList.map(emoji => `
                <div class="emoji-grid-item p-2 text-center text-2xl cursor-pointer hover:bg-gray-100 rounded" 
                     data-emoji="${emoji}">
                    ${emoji}
                </div>
            `).join('');

            this.elements.emojiGrid.addEventListener('click', (e) => {
                const emojiElement = e.target.closest('.emoji-grid-item');
                if (emojiElement) {
                    const emoji = emojiElement.dataset.emoji;
                    this.insertEmoji(emoji);
                }
            });
        }
    }

    toggleEmojiModal(show = true) {
        if (this.elements.emojiModal) {
            this.elements.emojiModal.classList.toggle('hidden', !show);
        }
    }

    insertEmoji(emoji) {
        const input = this.elements.messageInput;
        if (input) {
            const cursorPos = input.selectionStart;
            const textBefore = input.value.substring(0, cursorPos);
            const textAfter = input.value.substring(cursorPos);
            
            input.value = textBefore + emoji + textAfter;
            input.selectionStart = cursorPos + emoji.length;
            input.selectionEnd = cursorPos + emoji.length;
            input.focus();
            
            this.toggleEmojiModal(false);
        }
    }

    updateUsersList(users) {
        if (!Array.isArray(users)) {
            console.error('Lista de usuarios inválida:', users);
            return;
        }

        this.elements.usersList.innerHTML = users.map(user => {
            if (!user || !user.username) {
                console.error('Usuario inválido:', user);
                return '';
            }

            const isOnline = user.status === 'online';
            const isCurrentUser = user.username === this.chatManager.getUsername();
            const lastSeen = user.last_seen ? new Date(user.last_seen).toLocaleString() : 'Desconectado';
            
            return `
                <div class="flex items-center justify-between p-4 ${isCurrentUser ? 'bg-gray-100' : 'bg-gray-50'} rounded-lg hover:bg-gray-100 transition-all" 
                     data-user="${user.username}">
                    <div class="flex flex-col">
                        <div class="flex items-center gap-2">
                            <span class="w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}"></span>
                            <span class="font-medium">${user.username}</span>
                            ${isCurrentUser ? '<span class="text-xs text-indigo-600">(Tú)</span>' : ''}
                        </div>
                        <span class="text-xs text-gray-500 mt-1">
                            ${isOnline ? 'En línea' : `Última vez: ${lastSeen}`}
                        </span>
                    </div>
                    ${!isCurrentUser ? `
                        <button onclick="chatUI.startPrivateChat('${user.username}')"
                            class="px-3 py-1 text-sm ${isOnline ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-700'} 
                            rounded-lg hover:bg-indigo-200 transition-all">
                            Mensaje${!isOnline ? ' (Offline)' : ''}
                        </button>
                    ` : ''}
                </div>
            `;
        }).filter(Boolean).join('');
    }

    startPrivateChat(username) {
        if (!username) return;

        console.log('Iniciando chat privado con:', username);
        const messages = this.chatManager.startPrivateChat(username);
        
        this.switchTab('private');
        
        const user = this.getUserFromList(username);
        const isOnline = user && user.status === 'online';
        const lastSeen = user && user.last_seen ? new Date(user.last_seen).toLocaleString() : 'Desconectado';
        
        this.elements.currentChatHeader.innerHTML = `
            <div class="flex items-center justify-between p-4 border-b">
                <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}"></span>
                    <span class="font-semibold text-lg">${username}</span>
                    <span class="text-sm text-gray-500">
                        ${isOnline ? 'En línea' : `Última vez: ${lastSeen}`}
                    </span>
                </div>
            </div>
        `;

        this.elements.currentChatMessages.innerHTML = '';
        if (messages && messages.length > 0) {
            messages.forEach(msg => {
                if (msg) this.appendMessage(msg, true);
            });
        }

        this.updatePrivateChatsList();
    }

    getUserFromList(username) {
        if (!username) return null;

        const userElement = this.elements.usersList.querySelector(`[data-user="${username}"]`);
        if (userElement) {
            const isOnline = userElement.querySelector('.rounded-full').classList.contains('bg-green-500');
            const lastSeenElement = userElement.querySelector('.text-gray-500');
            const lastSeen = lastSeenElement ? lastSeenElement.textContent.replace('Última vez: ', '') : null;
            
            return {
                username,
                status: isOnline ? 'online' : 'offline',
                last_seen: lastSeen
            };
        }
        return null;
    }

    updatePrivateChatsList() {
        const chats = this.chatManager.getPrivateChats();
        const activeChat = this.chatManager.getActivePrivateChat();
        
        if (!chats) return;

        this.elements.privateChatsList.innerHTML = Array.from(chats.keys()).map(username => `
            <div class="p-3 rounded-lg ${
                username === activeChat ? 'bg-indigo-100' : 'bg-gray-50'
            } hover:bg-indigo-50 cursor-pointer transition-all"
                onclick="chatUI.startPrivateChat('${username}')">
                <div class="font-medium">${username}</div>
                <div class="text-xs text-gray-500">
                    ${chats.get(username).length} mensajes
                </div>
            </div>
        `).join('');
    }

    updateTypingIndicator(typers) {
        if (!Array.isArray(typers)) return;

        if (typers.length > 0) {
            const typersText = typers.join(', ');
            this.elements.typingIndicator.textContent = `${typersText} ${
                typers.length > 1 ? 'están' : 'está'
            } escribiendo...`;
            this.elements.typingDots.classList.remove('opacity-0');
        } else {
            this.elements.typingIndicator.textContent = '';
            this.elements.typingDots.classList.add('opacity-0');
        }
    }
}

export default ChatUI;