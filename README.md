# 🚀 TechNest Real-time Chat Application

A modern, real-time chat application built with **Socket.IO** for instant messaging with low latency bidirectional communication. This project demonstrates efficient WebSocket implementation for seamless user experience.

![Chat Application](https://img.shields.io/badge/Socket.IO-Real--time-brightgreen) ![Node.js](https://img.shields.io/badge/Node.js-Backend-green) ![Express](https://img.shields.io/badge/Express-Server-blue)

## 🌟 Features

### Core Chat Features
- **Real-time Messaging**: Instant message delivery using Socket.IO
- **Multiple Chat Rooms**: Join different themed chat rooms (General, Tech Talk, Random, Help & Support)
- **User Presence**: See who's online in real-time
- **Typing Indicators**: Visual feedback when users are typing
- **Private Messaging**: Send direct messages to specific users
- **Message History**: View conversation history during session

### Security & Moderation
- **Human Verification**: CAPTCHA-like verification to prevent bots
- **Content Moderation**: Automatic filtering of inappropriate/vulgar content
- **Rate Limiting**: Prevents spam and excessive messaging (10 messages/minute)
- **User Reporting**: Report inappropriate behavior with detailed reasons
- **Admin Controls**: Kick, ban, and mute capabilities for administrators
- **Input Validation**: Comprehensive validation and sanitization
- **Security Headers**: Helmet.js for enhanced security

### User Experience
- **Modern UI**: Beautiful, responsive design with smooth animations
- **Low Latency**: Optimized for fast, bidirectional communication
- **Mobile Responsive**: Works seamlessly on all devices
- **Sound Notifications**: Audio alerts for different message types
- **Character Counters**: Visual feedback for message length
- **Keyboard Shortcuts**: Efficient navigation and messaging
- **Context Menus**: Right-click options for user interactions
- **Loading States**: Visual feedback during operations

### Advanced Features
- **Session Management**: Secure session handling
- **User Roles**: Admin and regular user differentiation
- **Content Filtering**: Real-time inappropriate content detection
- **Error Handling**: Comprehensive error management
- **Accessibility**: Screen reader support and keyboard navigation
- **Progressive Enhancement**: Works even with limited features

## 🛠️ Technologies Used

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **Socket.IO** - Real-time bidirectional communication

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with gradients and animations
- **JavaScript (ES6+)** - Client-side functionality
- **Socket.IO Client** - Real-time communication

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd task_chat-application
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```
   or for production:
   ```bash
   npm start
   ```

4. **Access the application**
   Open your browser and navigate to `http://localhost:3000`

## 📱 How to Use

### Getting Started
1. **Enter Username**: Choose a unique username (minimum 2 characters)
2. **Select Room**: Pick from available chat rooms:
   - **General** - Open discussions
   - **Tech Talk** - Technology discussions
   - **Random** - Casual conversations
   - **Help & Support** - Get help from others

3. **Start Chatting**: Begin sending messages instantly!

### Features Guide
- **Send Messages**: Type in the input field and press Enter or click send
- **Human Verification**: Complete simple verification questions to join
- **Private Messages**: Click on any user in the sidebar to send a private message
- **Report Users**: Right-click on users to report inappropriate behavior
- **Admin Features**: Admins can access moderation panel with Ctrl+Shift+A
- **Content Filtering**: Inappropriate content is automatically filtered
- **Typing Indicators**: See when others are typing in real-time
- **User List**: Toggle the users sidebar to see who's online
- **Character Limits**: Messages are limited to 500 characters with visual feedback
- **Rate Limiting**: Maximum 10 messages per minute to prevent spam

### Keyboard Shortcuts
- `Enter` - Send message
- `Ctrl + Enter` - Send message (alternative)
- `Ctrl + U` - Toggle users sidebar
- `Ctrl + /` - Focus message input
- `Ctrl + Shift + A` - Open admin panel (admins only)
- `Escape` - Close any open modal

## 🏗️ Project Structure

```
task_chat-application/
├── server.js                 # Express server with Socket.IO
├── package.json              # Dependencies and scripts
├── public/                   # Static files
│   ├── index.html           # Main chat interface
│   ├── styles.css           # CSS styling
│   └── script.js            # Client-side JavaScript
├── .github/
│   └── copilot-instructions.md
└── README.md                # Project documentation
```

## 🔧 Socket.IO Events

### Client to Server
- `user_join` - User joins a chat room (requires verification)
- `send_message` - Send a message to the room (with content moderation)
- `typing` - Typing indicator
- `private_message` - Send private message (with content filtering)
- `admin_command` - Admin actions (kick, ban, mute)
- `disconnect` - User leaves

### Server to Client
- `verification_required` - Prompt for human verification
- `user_joined` - Notify room of new user
- `user_left` - Notify room of user leaving
- `receive_message` - Receive room message
- `receive_private_message` - Receive private message
- `room_users` - Updated list of room users
- `user_typing` - Show typing indicator
- `rate_limit_warning` - Rate limiting notification
- `content_warning` - Content moderation alert
- `system_message` - System notifications
- `kicked` / `banned` - Moderation actions

## 🔐 API Endpoints

### POST /api/verify
Verify human users with simple questions
```json
{
  "username": "string",
  "answer": "string", 
  "sessionId": "string"
}
```

### GET /api/verification-question
Get a random verification question
```json
{
  "question": "What is 2 + 3?",
  "answer": "5"
}
```

### POST /api/report
Report inappropriate user behavior
```json
{
  "reportedUser": "string",
  "reason": "string",
  "description": "string",
  "reporterSession": "string"
}
```

## 👨‍💼 Admin Features

### Admin Commands
- **Kick User**: Temporarily remove user from chat
- **Ban User**: Permanently ban user from chat
- **Mute User**: Prevent user from sending messages

### Admin Identification
- Admins are identified by username in the `adminUsers` array
- Admin usernames: `admin`, `moderator`, `technest_admin`
- Admins have crown (👑) indicator in chat

### Content Moderation
- Automatic filtering of inappropriate words
- Rate limiting (10 messages per minute)
- Real-time content scanning
- User reporting system

## 🎨 UI Features

- **Modern Design**: Gradient backgrounds and smooth animations
- **Responsive Layout**: Adapts to different screen sizes
- **Dark/Light Elements**: Balanced color scheme for readability
- **Smooth Animations**: Fade-in effects for messages and interactions
- **Custom Scrollbars**: Styled scrollbars for better aesthetics
- **Loading States**: Visual feedback for user actions

## 🚀 Deployment

### Local Development
```bash
npm run dev  # Uses nodemon for auto-restart
```

### Production
```bash
npm start    # Runs with Node.js
```

### Environment Variables
- `PORT` - Server port (default: 3000)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📋 TODO / Future Enhancements

- [ ] Message history persistence
- [ ] File sharing capabilities
- [ ] Emoji reactions
- [ ] Message encryption
- [ ] Push notifications
- [ ] User authentication
- [ ] Chat room creation
- [ ] Message search functionality
- [ ] Voice/Video chat integration

## 🐛 Known Issues

- Audio notifications may not work in some browsers due to autoplay policies
- Private messages are not persisted between sessions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Socket.IO team for the excellent real-time communication library
- Express.js community for the robust web framework
- Font Awesome for the beautiful icons
- Google Fonts for the Inter font family

## 📞 Support

For support, email [your-email@example.com] or create an issue in the repository.

---

**Built with ❤️ for TechNest Internship Program**

*Task 3: Real-time Chat Application with Socket.IO*
