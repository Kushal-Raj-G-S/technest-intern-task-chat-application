// Socket.IO connection
const socket = io();

// DOM elements
const loginScreen = document.getElementById('loginScreen');
const chatScreen = document.getElementById('chatScreen');
const loginForm = document.getElementById('loginForm');
const messageForm = document.getElementById('messageForm');
const usernameInput = document.getElementById('username');
const roomSelect = document.getElementById('room');
const messageInput = document.getElementById('messageInput');
const messagesContainer = document.getElementById('messagesContainer');
const usersList = document.getElementById('usersList');
const usersSidebar = document.getElementById('usersSidebar');
const roomNameDisplay = document.getElementById('roomName');
const userCountDisplay = document.getElementById('userCount');
const typingIndicator = document.getElementById('typingIndicator');
const typingText = document.getElementById('typingText');
const toggleUsersBtn = document.getElementById('toggleUsers');
const leaveChatBtn = document.getElementById('leaveChat');
const charCount = document.getElementById('charCount');

// Modal elements
const verificationModal = document.getElementById('verificationModal');
const verificationQuestion = document.getElementById('verificationQuestion');
const verificationAnswer = document.getElementById('verificationAnswer');
const verificationError = document.getElementById('verificationError');
const submitVerificationBtn = document.getElementById('submitVerification');

const privateMessageModal = document.getElementById('privateMessageModal');
const privateRecipient = document.getElementById('privateRecipient');
const privateMessageInput = document.getElementById('privateMessageInput');
const sendPrivateMessageBtn = document.getElementById('sendPrivateMessage');
const privateCharCount = document.getElementById('privateCharCount');

const reportModal = document.getElementById('reportModal');
const reportUsername = document.getElementById('reportUsername');
const reportReason = document.getElementById('reportReason');
const reportDescription = document.getElementById('reportDescription');
const submitReportBtn = document.getElementById('submitReport');

const adminModal = document.getElementById('adminModal');
const adminTarget = document.getElementById('adminTarget');
const adminReason = document.getElementById('adminReason');
const kickUserBtn = document.getElementById('kickUser');
const banUserBtn = document.getElementById('banUser');
const muteUserBtn = document.getElementById('muteUser');

const notificationContainer = document.getElementById('notificationContainer');

// State variables
let currentUser = '';
let currentRoom = '';
let sessionId = '';
let isVerified = false;
let isAdmin = false;
let typingTimer = null;
let isTyping = false;
let currentVerificationQuestion = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    setupSocketListeners();
    generateSessionId();
});

// Generate unique session ID
function generateSessionId() {
    sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Event Listeners
function initializeEventListeners() {
    // Login form submission
    loginForm.addEventListener('submit', handleLogin);
    
    // Message form submission
    messageForm.addEventListener('submit', handleSendMessage);
    
    // Message input for typing indicators and character count
    messageInput.addEventListener('input', handleMessageInput);
    messageInput.addEventListener('blur', stopTyping);
    
    // Private message input character count
    if (privateMessageInput) {
        privateMessageInput.addEventListener('input', updatePrivateCharCount);
    }
    
    // UI controls
    toggleUsersBtn.addEventListener('click', toggleUsersSidebar);
    leaveChatBtn.addEventListener('click', leaveChat);
    
    // Verification modal
    if (submitVerificationBtn) {
        submitVerificationBtn.addEventListener('click', submitVerification);
    }
    if (verificationAnswer) {
        verificationAnswer.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') submitVerification();
        });
    }
    
    // Private message modal
    if (sendPrivateMessageBtn) {
        sendPrivateMessageBtn.addEventListener('click', sendPrivateMessage);
    }
    
    // Report modal
    if (submitReportBtn) {
        submitReportBtn.addEventListener('click', submitReport);
    }
    
    // Admin panel
    if (kickUserBtn) kickUserBtn.addEventListener('click', () => executeAdminCommand('kick'));
    if (banUserBtn) banUserBtn.addEventListener('click', () => executeAdminCommand('ban'));
    if (muteUserBtn) muteUserBtn.addEventListener('click', () => executeAdminCommand('mute'));
    
    // Close modal handlers
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
    
    // Close modals when clicking outside
    [verificationModal, privateMessageModal, reportModal, adminModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeAllModals();
            });
        }
    });
}

// Socket.IO Event Listeners
function setupSocketListeners() {
    // Connection established
    socket.on('connect', () => {
        console.log('Connected to server');
        showNotification('Connected to server', 'success');
    });

    // Verification required
    socket.on('verification_required', () => {
        showVerificationModal();
    });

    // Join errors
    socket.on('join_error', (data) => {
        showNotification(data.message, 'error');
        if (loginForm.classList.contains('loading')) {
            loginForm.classList.remove('loading');
        }
    });

    // System messages
    socket.on('system_message', (data) => {
        displaySystemMessage(data.message, new Date().toISOString(), data.type);
    });

    // User joined notification
    socket.on('user_joined', (data) => {
        displaySystemMessage(data.message, data.timestamp);
        playNotificationSound('join');
        if (data.username === currentUser) {
            switchToChat();
        }
    });

    // User left notification
    socket.on('user_left', (data) => {
        displaySystemMessage(data.message, data.timestamp);
    });

    // Receive message
    socket.on('receive_message', (data) => {
        displayMessage(data);
        playNotificationSound('message');
    });

    // Receive private message
    socket.on('receive_private_message', (data) => {
        displayPrivateMessage(data);
        playNotificationSound('private');
        showNotification(`Private message from ${data.from}`, 'info');
    });

    // Private message sent confirmation
    socket.on('private_message_sent', (data) => {
        displayPrivateMessage(data, true);
        showNotification(`Private message sent to ${data.to}`, 'success');
    });

    // Update room users
    socket.on('room_users', (users) => {
        updateUsersList(users);
        updateUserCount(users.length);
        
        // If we're still on login screen and received room users, switch to chat
        if (loginScreen.classList.contains('active')) {
            switchToChat();
        }
    });

    // Typing indicator
    socket.on('user_typing', (data) => {
        showTypingIndicator(data.username, data.isTyping);
    });

    // Rate limit warning
    socket.on('rate_limit_warning', (data) => {
        showNotification(data.message, 'warning');
        messageInput.classList.add('shake');
        setTimeout(() => messageInput.classList.remove('shake'), 500);
    });

    // Content warning
    socket.on('content_warning', (data) => {
        showNotification(data.message, 'warning');
        displayContentWarning(data);
    });

    // Message error
    socket.on('message_error', (data) => {
        showNotification(data.message, 'error');
    });

    // Admin responses
    socket.on('admin_response', (data) => {
        showNotification(data.message, 'info');
    });

    // Permission denied
    socket.on('permission_denied', (data) => {
        showNotification(data.message, 'error');
    });

    // Kicked/Banned
    socket.on('kicked', (data) => {
        showNotification(`You were kicked: ${data.reason}`, 'error');
        setTimeout(() => leaveChat(), 2000);
    });

    socket.on('banned', (data) => {
        showNotification(`You were banned: ${data.reason}`, 'error');
        setTimeout(() => leaveChat(), 2000);
    });

    // Connection error
    socket.on('connect_error', (error) => {
        console.error('Connection failed:', error);
        showNotification('Connection failed. Please try again.', 'error');
    });

    // Disconnection
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        showNotification('Disconnected from server', 'warning');
    });
}

// Enhanced message input handling
function handleMessageInput() {
    const message = messageInput.value;
    updateCharCount(message.length);
    
    if (!isTyping && message.length > 0) {
        isTyping = true;
        socket.emit('typing', { isTyping: true });
    }
    
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
        stopTyping();
    }, 2000);
}

function updateCharCount(count) {
    if (!charCount) return;
    charCount.textContent = count;
    charCount.className = 'char-counter';
    
    if (count > 400) {
        charCount.classList.add('danger');
    } else if (count > 300) {
        charCount.classList.add('warning');
    }
}

function updatePrivateCharCount() {
    if (!privateCharCount || !privateMessageInput) return;
    const count = privateMessageInput.value.length;
    privateCharCount.textContent = count;
}

// Login handler with enhanced validation
async function handleLogin(e) {
    e.preventDefault();
    
    const username = usernameInput.value.trim();
    const room = roomSelect.value;
    
    if (!username || !room) {
        showNotification('Please enter username and select a room', 'error');
        return;
    }
    
    // Enhanced username validation
    if (username.length < 2 || username.length > 20) {
        showNotification('Username must be 2-20 characters long', 'error');
        usernameInput.classList.add('shake');
        setTimeout(() => usernameInput.classList.remove('shake'), 500);
        return;
    }
    
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
        showNotification('Username can only contain letters, numbers, and underscores', 'error');
        usernameInput.classList.add('shake');
        setTimeout(() => usernameInput.classList.remove('shake'), 500);
        return;
    }
    
    // Add loading state
    loginForm.classList.add('loading');
    
    // Store user data
    currentUser = username;
    currentRoom = room;
    
    // Check if verification is needed
    if (!isVerified) {
        await showVerificationModal();
        return;
    }
    
    // Join the chat room
    socket.emit('user_join', { username, room, sessionId });
}

// Verification modal
async function showVerificationModal() {
    try {
        const response = await fetch('/api/verification-question');
        const question = await response.json();
        
        if (verificationQuestion) {
            verificationQuestion.textContent = question.question;
        }
        if (verificationAnswer) {
            verificationAnswer.value = '';
        }
        if (verificationError) {
            verificationError.classList.add('hidden');
        }
        if (verificationModal) {
            verificationModal.classList.remove('hidden');
            verificationAnswer?.focus();
        }
    } catch (error) {
        showNotification('Failed to load verification question', 'error');
    }
}

// Submit verification
async function submitVerification() {
    if (!verificationAnswer) return;
    
    const answer = verificationAnswer.value.trim();
    if (!answer) {
        showVerificationError('Please provide an answer');
        return;
    }
    
    if (submitVerificationBtn) {
        submitVerificationBtn.classList.add('loading');
    }
    
    try {
        const response = await fetch('/api/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: currentUser,
                answer: answer,
                sessionId: sessionId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            isVerified = true;
            if (verificationModal) {
                verificationModal.classList.add('hidden');
            }
            showNotification('Verification successful!', 'success');
            
            // Continue with login
            if (currentUser && currentRoom) {
                socket.emit('user_join', { username: currentUser, room: currentRoom, sessionId });
            }
        } else {
            showVerificationError(data.message);
        }
    } catch (error) {
        showVerificationError('Verification failed. Please try again.');
    } finally {
        if (submitVerificationBtn) {
            submitVerificationBtn.classList.remove('loading');
        }
    }
}

function showVerificationError(message) {
    if (verificationError) {
        verificationError.textContent = message;
        verificationError.classList.remove('hidden');
    }
    if (verificationAnswer) {
        verificationAnswer.classList.add('shake');
        setTimeout(() => verificationAnswer.classList.remove('shake'), 500);
    }
}

// Switch to chat screen
function switchToChat() {
    loginScreen.classList.remove('active');
    chatScreen.classList.add('active');
    loginForm.classList.remove('loading');
    
    // Update room display
    if (roomNameDisplay) {
        roomNameDisplay.textContent = currentRoom.charAt(0).toUpperCase() + currentRoom.slice(1);
    }
    
    // Clear welcome message after a short delay
    setTimeout(() => {
        const welcomeMsg = messagesContainer.querySelector('.welcome-message');
        if (welcomeMsg) {
            welcomeMsg.remove();
        }
    }, 3000);
    
    // Focus on message input
    if (messageInput) {
        messageInput.focus();
    }
    
    showNotification(`Welcome to ${currentRoom}!`, 'success');
}

// Send message handler
function handleSendMessage(e) {
    e.preventDefault();
    
    const message = messageInput.value.trim();
    if (!message) return;
    
    if (message.length > 500) {
        showNotification('Message is too long (max 500 characters)', 'error');
        return;
    }
    
    // Send message to server
    socket.emit('send_message', { message });
    
    // Clear input and stop typing
    messageInput.value = '';
    updateCharCount(0);
    stopTyping();
}

// Enhanced message display
function displayMessage(data) {
    const messageDiv = document.createElement('div');
    let className = `message ${data.userId === socket.id ? 'own' : ''}`;
    
    if (data.isAdmin) {
        className += ' admin';
    }
    
    messageDiv.className = className;
    
    const timestamp = formatTimestamp(data.timestamp);
    const initials = getInitials(data.username);
    
    messageDiv.innerHTML = `
        <div class="message-avatar">${initials}</div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-username">${escapeHtml(data.username)}${data.isAdmin ? ' 👑' : ''}</span>
                <span class="message-time">${timestamp}</span>
            </div>
            <div class="message-text">${escapeHtml(data.message)}</div>
        </div>
    `;
    
    messageDiv.classList.add('bounce-in');
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

// Display system message with enhanced styling
function displaySystemMessage(message, timestamp, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `system-message ${type}`;
    
    const time = formatTimestamp(timestamp);
    messageDiv.innerHTML = `
        <i class="fas ${getSystemMessageIcon(type)}"></i>
        ${escapeHtml(message)}
        <span class="message-time">${time}</span>
    `;
    
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

function getSystemMessageIcon(type) {
    const icons = {
        welcome: 'fa-star',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle',
        error: 'fa-times-circle'
    };
    return icons[type] || 'fa-info-circle';
}

// Display content warning
function displayContentWarning(data) {
    const warningDiv = document.createElement('div');
    warningDiv.className = 'content-warning';
    warningDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        Content filtered: "${escapeHtml(data.original)}" → "${escapeHtml(data.filtered)}"
    `;
    messagesContainer.appendChild(warningDiv);
    scrollToBottom();
}

// Display private message
function displayPrivateMessage(data, isSent = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isSent ? 'own' : ''} private`;
    
    const timestamp = formatTimestamp(data.timestamp);
    const displayName = isSent ? `To ${data.to || privateRecipient?.textContent}` : `From ${data.from}`;
    const initials = getInitials(isSent ? currentUser : data.from);
    
    messageDiv.innerHTML = `
        <div class="message-avatar">${initials}</div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-username">${displayName} (Private)</span>
                <span class="message-time">${timestamp}</span>
            </div>
            <div class="message-text" style="border-left: 4px solid #e53e3e; background: #fed7d7;">
                ${escapeHtml(data.message)}
            </div>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

// Enhanced users list with context menu
function updateUsersList(users) {
    if (!usersList) return;
    
    usersList.innerHTML = '';
    
    users.forEach(user => {
        const userDiv = document.createElement('div');
        userDiv.className = 'user-item';
        
        let userBadge = '';
        if (user.isAdmin) userBadge = ' 👑';
        if (user.username === currentUser) userBadge += ' (You)';
        
        userDiv.innerHTML = `
            <div class="user-avatar">${getInitials(user.username)}</div>
            <span class="user-name">${escapeHtml(user.username)}${userBadge}</span>
        `;
        
        // Add context menu for other users
        if (user.username !== currentUser) {
            userDiv.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                showUserContextMenu(e, user.username);
            });
            
            userDiv.addEventListener('click', () => {
                openPrivateMessageModal(user.username);
            });
        }
        
        usersList.appendChild(userDiv);
    });
    
    // Check if current user is admin
    const currentUserData = users.find(u => u.username === currentUser);
    if (currentUserData && currentUserData.isAdmin) {
        isAdmin = true;
        addAdminButton();
    }
}

// Show user context menu
function showUserContextMenu(event, username) {
    // Remove existing context menus
    document.querySelectorAll('.user-context-menu').forEach(menu => menu.remove());
    
    const contextMenu = document.createElement('div');
    contextMenu.className = 'user-context-menu visible';
    contextMenu.style.top = `${event.clientY}px`;
    contextMenu.style.left = `${event.clientX}px`;
    
    contextMenu.innerHTML = `
        <div class="context-menu-item" onclick="openPrivateMessageModal('${username}')">
            <i class="fas fa-envelope"></i> Private Message
        </div>
        <div class="context-menu-item danger" onclick="openReportModal('${username}')">
            <i class="fas fa-flag"></i> Report User
        </div>
    `;
    
    document.body.appendChild(contextMenu);
    
    // Close context menu when clicking elsewhere
    const closeContextMenu = (e) => {
        if (!contextMenu.contains(e.target)) {
            contextMenu.remove();
            document.removeEventListener('click', closeContextMenu);
        }
    };
    
    setTimeout(() => {
        document.addEventListener('click', closeContextMenu);
    }, 100);
}

// Add admin button
function addAdminButton() {
    if (document.getElementById('adminBtn')) return; // Already exists
    
    const adminBtn = document.createElement('button');
    adminBtn.id = 'adminBtn';
    adminBtn.className = 'action-btn admin-btn';
    adminBtn.innerHTML = '<i class="fas fa-user-shield"></i>';
    adminBtn.title = 'Admin Panel';
    adminBtn.addEventListener('click', openAdminModal);
    
    const chatActions = document.querySelector('.chat-actions');
    if (chatActions && leaveChatBtn) {
        chatActions.insertBefore(adminBtn, leaveChatBtn);
    }
}

// Modal functions
function openPrivateMessageModal(username) {
    if (privateRecipient) privateRecipient.textContent = username;
    if (privateMessageInput) privateMessageInput.value = '';
    updatePrivateCharCount();
    if (privateMessageModal) {
        privateMessageModal.classList.remove('hidden');
        privateMessageInput?.focus();
    }
}

function openReportModal(username) {
    if (reportUsername) reportUsername.textContent = username;
    if (reportReason) reportReason.value = '';
    if (reportDescription) reportDescription.value = '';
    if (reportModal) reportModal.classList.remove('hidden');
}

function openAdminModal() {
    if (!isAdmin) {
        showNotification('You do not have admin privileges', 'error');
        return;
    }
    
    if (adminTarget) adminTarget.value = '';
    if (adminReason) adminReason.value = '';
    if (adminModal) adminModal.classList.remove('hidden');
}

function closeAllModals() {
    [verificationModal, privateMessageModal, reportModal, adminModal].forEach(modal => {
        if (modal) modal.classList.add('hidden');
    });
}

// Send private message
function sendPrivateMessage() {
    if (!privateMessageInput || !privateRecipient) return;
    
    const message = privateMessageInput.value.trim();
    if (!message) return;
    
    const recipient = privateRecipient.textContent;
    socket.emit('private_message', {
        to: recipient,
        message: message
    });
    
    closeAllModals();
}

// Submit report
async function submitReport() {
    if (!reportReason || !reportUsername) return;
    
    const reason = reportReason.value;
    const description = reportDescription?.value.trim() || '';
    const username = reportUsername.textContent;
    
    if (!reason) {
        showNotification('Please select a reason for the report', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                reportedUser: username,
                reason: reason,
                description: description,
                reporterSession: sessionId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Report submitted successfully', 'success');
            closeAllModals();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('Failed to submit report', 'error');
    }
}

// Execute admin command
function executeAdminCommand(command) {
    if (!adminTarget || !isAdmin) return;
    
    const target = adminTarget.value.trim();
    const reason = adminReason?.value.trim() || '';
    
    if (!target) {
        showNotification('Please enter a username', 'error');
        return;
    }
    
    if (target === currentUser) {
        showNotification('You cannot perform actions on yourself', 'error');
        return;
    }
    
    socket.emit('admin_command', {
        command: command,
        target: target,
        reason: reason
    });
    
    closeAllModals();
}

// Enhanced notification system
function showNotification(message, type = 'info', duration = 4000) {
    if (!notificationContainer) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = 'background:none;border:none;color:white;font-size:1.2rem;float:right;cursor:pointer;margin-left:10px;';
    closeBtn.onclick = () => removeNotification(notification);
    notification.appendChild(closeBtn);
    
    notificationContainer.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Auto remove
    setTimeout(() => removeNotification(notification), duration);
}

function removeNotification(notification) {
    if (!notification.parentNode) return;
    
    notification.classList.remove('show');
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
}

// Enhanced sound notifications
function playNotificationSound(type = 'message') {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Different sounds for different notification types
        const sounds = {
            message: [800, 600],
            private: [1000, 800, 600],
            join: [600, 800],
            error: [400, 300, 200]
        };
        
        const frequencies = sounds[type] || sounds.message;
        
        frequencies.forEach((freq, index) => {
            setTimeout(() => {
                oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
            }, index * 100);
        });
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
        console.log('Audio notification not supported');
    }
}

// Utility functions
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getInitials(username) {
    return username.substring(0, 2).toUpperCase();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function scrollToBottom() {
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

function stopTyping() {
    if (isTyping) {
        isTyping = false;
        socket.emit('typing', { isTyping: false });
    }
    clearTimeout(typingTimer);
}

function showTypingIndicator(username, isTyping) {
    if (!typingIndicator || !typingText) return;
    
    if (isTyping) {
        typingText.textContent = `${username} is typing...`;
        typingIndicator.classList.remove('hidden');
    } else {
        typingIndicator.classList.add('hidden');
    }
    scrollToBottom();
}

function updateUserCount(count) {
    if (userCountDisplay) {
        userCountDisplay.textContent = `${count} user${count !== 1 ? 's' : ''} online`;
    }
}

function toggleUsersSidebar() {
    if (usersSidebar) {
        usersSidebar.classList.toggle('visible');
    }
}

function leaveChat() {
    if (confirm('Are you sure you want to leave the chat?')) {
        socket.disconnect();
        loginScreen.classList.add('active');
        chatScreen.classList.remove('active');
        
        // Reset state
        currentUser = '';
        currentRoom = '';
        isVerified = false;
        isAdmin = false;
        
        // Reset form
        loginForm.reset();
        loginForm.classList.remove('loading');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="welcome-message">
                    <i class="fas fa-rocket"></i>
                    <h3>Welcome to TechNest Chat!</h3>
                    <p>Start chatting with your team members</p>
                </div>
            `;
        }
        
        // Remove admin button if exists
        const adminBtn = document.getElementById('adminBtn');
        if (adminBtn) adminBtn.remove();
        
        // Reconnect socket
        socket.connect();
        generateSessionId();
    }
}

// Enhanced keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Send message with Ctrl+Enter
    if (e.ctrlKey && e.key === 'Enter' && messageInput === document.activeElement) {
        e.preventDefault();
        handleSendMessage(e);
    }
    
    // Toggle users sidebar with Ctrl+U
    if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        toggleUsersSidebar();
    }
    
    // Focus message input with Ctrl+/
    if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        if (messageInput) messageInput.focus();
    }
    
    // Close modals with Escape
    if (e.key === 'Escape') {
        closeAllModals();
    }
    
    // Admin panel with Ctrl+Shift+A
    if (e.ctrlKey && e.shiftKey && e.key === 'A' && isAdmin) {
        e.preventDefault();
        openAdminModal();
    }
});

// Handle page visibility change
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && currentUser && messageInput) {
        messageInput.focus();
    }
});
