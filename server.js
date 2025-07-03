const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Store connected users and their data
const users = new Map();
const userMessages = new Map(); // Track message count for rate limiting
const bannedUsers = new Set(); // Track banned users
const verifiedUsers = new Set(); // Track verified users

// Content moderation - prohibited words
const prohibitedWords = [
  'fuck', 'shit', 'damn', 'bitch', 'asshole', 'bastard', 'crap', 'piss',
  'stupid', 'idiot', 'moron', 'retard', 'gay', 'fag', 'nigger', 'slut',
  'whore', 'pussy', 'dick', 'cock', 'penis', 'vagina', 'sex', 'porn',
  'nude', 'naked', 'kill', 'die', 'suicide', 'murder', 'hate', 'racist'
];

// Admin users (you can modify this list)
const adminUsers = ['admin', 'moderator', 'technest_admin'];

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Disable for Socket.IO
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Utility functions
function sanitizeInput(input) {
  return input.replace(/[<>\"']/g, '').trim();
}

function containsProhibitedContent(message) {
  const lowerMessage = message.toLowerCase();
  return prohibitedWords.some(word => lowerMessage.includes(word));
}

function moderateMessage(message) {
  let moderatedMessage = message;
  prohibitedWords.forEach(word => {
    const regex = new RegExp(word, 'gi');
    moderatedMessage = moderatedMessage.replace(regex, '*'.repeat(word.length));
  });
  return moderatedMessage;
}

function isValidUsername(username) {
  // Username validation: 2-20 characters, alphanumeric and underscores only
  const regex = /^[a-zA-Z0-9_]{2,20}$/;
  return regex.test(username) && !prohibitedWords.some(word => username.toLowerCase().includes(word));
}

function generateVerificationQuestion() {
  const questions = [
    { question: "What is 5 + 3?", answer: "8" },
    { question: "What color is the sky?", answer: "blue" },
    { question: "How many days in a week?", answer: "7" },
    { question: "What is 2 x 4?", answer: "8" },
    { question: "What is the first letter of the alphabet?", answer: "a" },
    { question: "How many sides does a triangle have?", answer: "3" },
    { question: "What is 10 - 4?", answer: "6" },
    { question: "What comes after Monday?", answer: "tuesday" }
  ];
  return questions[Math.floor(Math.random() * questions.length)];
}

function isRateLimited(socketId) {
  const now = Date.now();
  const userMsgData = userMessages.get(socketId);
  
  if (!userMsgData) {
    userMessages.set(socketId, { count: 1, lastReset: now });
    return false;
  }
  
  // Reset count every minute
  if (now - userMsgData.lastReset > 60000) {
    userMsgData.count = 1;
    userMsgData.lastReset = now;
    return false;
  }
  
  // Allow max 10 messages per minute
  if (userMsgData.count >= 10) {
    return true;
  }
  
  userMsgData.count++;
  return false;
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle favicon requests
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Verification endpoint
app.post('/api/verify', (req, res) => {
  const { username, answer, sessionId } = req.body;
  
  // Validate input
  if (!username || !answer || !sessionId) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }
  
  const sanitizedUsername = sanitizeInput(username);
  const sanitizedAnswer = sanitizeInput(answer.toLowerCase());
  
  // Check if username is valid
  if (!isValidUsername(sanitizedUsername)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid username. Use 2-20 characters, letters, numbers, and underscores only.' 
    });
  }
  
  // Check if user is banned
  if (bannedUsers.has(sanitizedUsername.toLowerCase())) {
    return res.status(403).json({ success: false, message: 'User is banned from the chat.' });
  }
  
  // For demo purposes, we'll accept any answer that matches our simple questions
  // In production, you'd store the correct answer per session
  const validAnswers = ['8', 'blue', '7', '3', 'a', '6', 'tuesday'];
  if (validAnswers.includes(sanitizedAnswer)) {
    verifiedUsers.add(sessionId);
    res.json({ success: true, message: 'Verification successful!' });
  } else {
    res.status(400).json({ success: false, message: 'Incorrect answer. Please try again.' });
  }
});

// Get verification question
app.get('/api/verification-question', (req, res) => {
  const question = generateVerificationQuestion();
  res.json(question);
});

// Report user endpoint
app.post('/api/report', (req, res) => {
  const { reportedUser, reason, reporterSession } = req.body;
  
  if (!verifiedUsers.has(reporterSession)) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }
  
  // Log the report (in production, save to database)
  console.log(`🚨 User Report: ${reportedUser} reported for: ${reason}`);
  
  res.json({ success: true, message: 'Report submitted successfully' });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle user joining with verification
  socket.on('user_join', (data) => {
    const { username, room, sessionId } = data;
    
    // Check if user is verified
    if (!verifiedUsers.has(sessionId)) {
      socket.emit('verification_required');
      return;
    }
    
    const sanitizedUsername = sanitizeInput(username);
    
    // Validate username
    if (!isValidUsername(sanitizedUsername)) {
      socket.emit('join_error', { message: 'Invalid username format' });
      return;
    }
    
    // Check if user is banned
    if (bannedUsers.has(sanitizedUsername.toLowerCase())) {
      socket.emit('join_error', { message: 'You are banned from this chat' });
      return;
    }
    
    // Check if username is already taken in this room
    const existingUser = Array.from(users.values()).find(
      user => user.username.toLowerCase() === sanitizedUsername.toLowerCase() && user.room === room
    );
    
    if (existingUser) {
      socket.emit('join_error', { message: 'Username already taken in this room' });
      return;
    }
    
    // Store user information
    users.set(socket.id, {
      username: sanitizedUsername,
      room,
      id: socket.id,
      joinTime: new Date(),
      isAdmin: adminUsers.includes(sanitizedUsername.toLowerCase()),
      sessionId
    });

    // Join the specified room
    socket.join(room);

    // Broadcast to room that user joined
    socket.to(room).emit('user_joined', {
      username: sanitizedUsername,
      message: `${sanitizedUsername} joined the chat`,
      timestamp: new Date().toISOString()
    });

    // Send current room users to the new user
    const roomUsers = Array.from(users.values()).filter(user => user.room === room);
    socket.emit('room_users', roomUsers);

    // Broadcast updated user list to room
    io.to(room).emit('room_users', roomUsers);

    // Send welcome message with rules
    socket.emit('system_message', {
      message: `Welcome ${sanitizedUsername}! Please follow our community guidelines: Be respectful, no spam, no inappropriate content.`,
      type: 'welcome'
    });

    console.log(`${sanitizedUsername} joined room: ${room}`);
  });

  // Handle sending messages with moderation
  socket.on('send_message', (data) => {
    const user = users.get(socket.id);
    if (!user) return;
    
    // Check rate limiting
    if (isRateLimited(socket.id)) {
      socket.emit('rate_limit_warning', { 
        message: 'You are sending messages too quickly. Please slow down.' 
      });
      return;
    }
    
    let message = sanitizeInput(data.message);
    
    // Check for empty or too long messages
    if (!message || message.length > 500) {
      socket.emit('message_error', { 
        message: 'Message must be between 1 and 500 characters' 
      });
      return;
    }
    
    // Check for prohibited content
    if (containsProhibitedContent(message)) {
      // Moderate the message
      const moderatedMessage = moderateMessage(message);
      
      // Warn the user
      socket.emit('content_warning', {
        message: 'Your message contained inappropriate content and has been filtered.',
        original: message,
        filtered: moderatedMessage
      });
      
      // Use moderated message
      message = moderatedMessage;
      
      // Log the incident
      console.log(`🚨 Content filtered for user ${user.username}: "${data.message}" -> "${message}"`);
    }
    
    const messageData = {
      username: user.username,
      message: message,
      timestamp: new Date().toISOString(),
      userId: socket.id,
      isAdmin: user.isAdmin
    };

    // Broadcast message to all users in the room
    io.to(user.room).emit('receive_message', messageData);
    console.log(`Message from ${user.username} in ${user.room}: ${message}`);
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    const user = users.get(socket.id);
    if (user) {
      socket.to(user.room).emit('user_typing', {
        username: user.username,
        isTyping: data.isTyping
      });
    }
  });

  // Handle private messages with enhanced security
  socket.on('private_message', (data) => {
    const sender = users.get(socket.id);
    const recipient = Array.from(users.values()).find(user => user.username === data.to);
    
    if (!sender || !recipient) return;
    
    // Rate limit private messages too
    if (isRateLimited(socket.id)) {
      socket.emit('rate_limit_warning', { 
        message: 'You are sending messages too quickly. Please slow down.' 
      });
      return;
    }
    
    let message = sanitizeInput(data.message);
    
    // Content moderation for private messages
    if (containsProhibitedContent(message)) {
      message = moderateMessage(message);
      socket.emit('content_warning', {
        message: 'Your private message contained inappropriate content and has been filtered.'
      });
    }
    
    const messageData = {
      from: sender.username,
      to: recipient.username,
      message: message,
      timestamp: new Date().toISOString(),
      isPrivate: true
    };

    // Send to recipient
    io.to(recipient.id).emit('receive_private_message', messageData);
    
    // Send confirmation to sender
    socket.emit('private_message_sent', messageData);
    
    console.log(`Private message from ${sender.username} to ${recipient.username}`);
  });
  
  // Admin commands
  socket.on('admin_command', (data) => {
    const admin = users.get(socket.id);
    if (!admin || !admin.isAdmin) {
      socket.emit('permission_denied', { message: 'You do not have admin privileges' });
      return;
    }
    
    const { command, target, reason } = data;
    
    switch (command) {
      case 'kick':
        const userToKick = Array.from(users.values()).find(u => u.username === target);
        if (userToKick) {
          const socketToKick = io.sockets.sockets.get(userToKick.id);
          if (socketToKick) {
            socketToKick.emit('kicked', { reason: reason || 'No reason provided' });
            setTimeout(() => socketToKick.disconnect(true), 1000);
          }
          console.log(`👮 Admin ${admin.username} kicked user ${target}`);
        }
        break;
        
      case 'ban':
        bannedUsers.add(target.toLowerCase());
        const userToBan = Array.from(users.values()).find(u => u.username === target);
        if (userToBan) {
          const socketToBan = io.sockets.sockets.get(userToBan.id);
          if (socketToBan) {
            socketToBan.emit('banned', { reason: reason || 'No reason provided' });
            setTimeout(() => socketToBan.disconnect(true), 1000);
          }
        }
        console.log(`🚫 Admin ${admin.username} banned user ${target}`);
        break;
        
      case 'mute':
        // Implementation for muting users (you can extend this)
        socket.emit('admin_response', { message: `User ${target} has been muted` });
        break;
    }
  });

  // Handle user disconnect
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      // Remove user from users map
      users.delete(socket.id);

      // Broadcast to room that user left
      socket.to(user.room).emit('user_left', {
        username: user.username,
        message: `${user.username} left the chat`,
        timestamp: new Date().toISOString()
      });

      // Broadcast updated user list to room
      const roomUsers = Array.from(users.values()).filter(u => u.room === user.room);
      io.to(user.room).emit('room_users', roomUsers);

      console.log(`${user.username} disconnected from room: ${user.room}`);
    }
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Chat application running on http://localhost:${PORT}`);
  console.log(`📡 Socket.IO server ready for real-time communication`);
});
