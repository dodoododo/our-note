# 📝 Our Note

> **Our Note** is an all-in-one collaboration and productivity platform designed to streamline teamwork and personal organization. Beyond just notes, it integrates real-time communication, scheduling, and visual brainstorming into a single, cohesive workspace.

Built with the **MERN Stack** (MongoDB, Express, React, Node.js), it features a modern architecture supporting real-time interaction and complex group management.

## Our Note Repository - [Source Code](https://github.com/dodoododo/our-note)

---

## 🧠 Features

Based on the project structure, **Our Note** provides a comprehensive suite of tools:

### 🤝 Collaboration & Social
- **👥 Group Management:** Create and manage user groups with dedicated settings and detail views (`Groups`, `GroupDetail`).
- **💬 Real-time Chat:** robust messaging system supporting both direct messages and group chats (`GroupChat`, `Messages`).
- **🟢 User Presence:** Real-time online/offline status indicators (`Presence`).
- **📩 Invitations:** System to handle group and event invitations (`Invitations`).

### 📅 Planning & Organization
- **🗓️ Smart Calendar:** Integrated calendar view to manage time and schedules (`Calendar`).
- **🎉 Event Management:** Create and track specific events (`Events`).
- **✅ Advanced Task Management:** Kanban-style or list-based task tracking (`Tasks`).

### 💡 Creativity & Documentation
- **📝 Rich Note Taking:** Comprehensive note editor (`Notes`).
- **🎨 Interactive Whiteboard:** A visual canvas for brainstorming and drawing ideas (`Whiteboard`).

### ⚙️ System
- **🔐 Secure Authentication:** Complete login/signup flows (`Auth`).
- **🌗 Theming:** Built-in support for different visual themes (`Theme`).

---

## 🛠️ Technologies Used

| Layer | Technology |
|------|-----------|
| **Frontend Framework** | React 18 |
| **Build Tool** | Vite |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS v4, Radix UI |
| **Real-time Engine** | Socket.io (Implied for Chat/Presence) |
| **State Management** | TanStack Query |
| **Visuals** | Framer Motion |
| **Backend Runtime** | Node.js |
| **Server Framework** | Express.js |
| **Database** | MongoDB (Mongoose) |

---

---

## 🚀 Installation & Setup

### ✅ Requirements

- Node.js (v18+ recommended)
- MongoDB (Local instance or Atlas connection string)
- npm

---

### 🪄 Setup Steps

1. **Clone the repository**
   ```bash
   git clone [https://github.com/dodoododo/our-note.git](https://github.com/dodoododo/our-note.git)
   cd our-note
2. **Install dependencies** (This script installs dependencies for Root, Server, and Frontend automatically)
   ```bash
    npm run install-all
3. **Environment Configuration:**  Create a .env file in the server/ folder
   ```bash
   PORT=5000
   MONGODB_URL=your_mongodb_connection_string
   JWT_SECRET=your_secret_key
  
4. **Run application:** 
   ```bash
    npm start
   
