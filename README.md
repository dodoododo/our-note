# Our Note

**Our Note** is an all-in-one collaboration and productivity platform designed to streamline teamwork and personal organization. Beyond simple note-taking, it integrates real-time communication, scheduling, and visual brainstorming into a single, cohesive workspace.

Built with the **MERN Stack** (MongoDB, Express, React, Node.js), it features a modern architecture supporting real-time interactions, complex group management, and secure data handling.

[View Source Code](https://github.com/dodoododo/our-note)

---

## Key Features

Based on the project structure, Our Note provides a comprehensive suite of tools organized into four core pillars:

### Collaboration & Social
* **Group Management** – Create and manage user groups with dedicated settings and detailed views.
* **Real-time Chat** – A robust messaging system supporting both direct messages and group chats.
* **User Presence** – Real-time online/offline status indicators.
* **Invitations** – System to handle group and event invitations seamlessly.

### Planning & Organization
* **Smart Calendar** – Integrated calendar view to manage time and schedules.
* **Event Management** – Create, track, and manage specific events.
* **Advanced Task Management** – Kanban-style or list-based task tracking for personal or team projects.

### Creativity & Documentation
* **Rich Note Taking** – Comprehensive note editor supporting rich text, media, and formatting.
* **Interactive Whiteboard** – A visual canvas for brainstorming, drawing, and ideating in real-time.

### System Architecture
* **Secure Authentication** – Complete login/signup flows with JWT and password hashing.
* **Theming** – Built-in support for multiple visual themes (Dark/Light modes).

---

## Tech Stack

This project leverages a modern **MERN** architecture with **TypeScript** on the frontend and robust security tooling on the backend.

| Category | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | **[React](https://react.dev/)** | Main UI library for building component-based interfaces. |
| | **[TypeScript](https://www.typescriptlang.org/)** | Adds static typing to JavaScript for better code quality and DX. |
| | **[Vite](https://vitejs.dev/)** | Next-generation frontend tooling and bundler. Fast HMR. |
| | **[Tailwind CSS](https://tailwindcss.com/)** | Utility-first CSS framework for rapid UI development. |
| | **[shadcn/ui](https://ui.shadcn.com/)** | Re-usable components built with **Radix UI** and **Tailwind**. |
| | **[TanStack Query](https://tanstack.com/query)** | Powerful asynchronous state management (data fetching/caching). |
| | **[React Router](https://reactrouter.com/)** | Client-side routing for single-page applications. |
| | **[React Quill](https://github.com/zenoamaro/react-quill)** | Rich text editor for creating styled notes. |
| | **[Leaflet](https://leafletjs.com/)** | Interactive maps for location-based features. |
| | **[@hello-pangea/dnd](https://github.com/hello-pangea/dnd)** | Accessible drag-and-drop library. |
| | **[Framer Motion](https://www.framer.com/motion/)** | Production-ready animation library for React. |
| | **[Sonner](https://sonner.emilkowal.ski/)** | An opinionated toast notification component. |
| **Backend** | **[Node.js](https://nodejs.org/)** | JavaScript runtime built on Chrome's V8 engine. |
| | **[Express.js](https://expressjs.com/)** | Fast, unopinionated, minimalist web framework for Node.js. |
| | **[Mongoose](https://mongoosejs.com/)** | Elegant MongoDB object modeling (ODM) for Node.js. |
| | **[Joi](https://joi.dev/)** | Schema description language and data validator. |
| | **[JSON Web Token](https://jwt.io/)** | Secure transmission of information as a JSON object. |
| | **[Bcryptjs](https://www.npmjs.com/package/bcryptjs)** | Library to help hash passwords for security. |
| | **[Helmet](https://helmetjs.github.io/)** | Helps secure Express apps by setting various HTTP headers. |
| | **[Compression](https://www.npmjs.com/package/compression)** | Node.js compression middleware (Gzip) for performance. |
| **Database** | **[MongoDB](https://www.mongodb.com/)** | NoSQL database for storing flexible JSON-like documents. |
| **DevOps** | **[ESLint](https://eslint.org/)** | Pluggable linting utility for JavaScript and TypeScript. |
| | **[Concurrently](https://www.npmjs.com/package/concurrently)** | Run multiple commands (frontend & backend) concurrently. |
| | **[Nodemon](https://nodemon.io/)** | Utility that monitors for changes and automatically restarts the server. |

---

## Installation & Setup

Follow these steps to set up the project locally.

### Prerequisites

* **Node.js** (v18+ recommended)
* **MongoDB** (Local instance or Atlas connection string)
* **npm** or **yarn**

### Setup Steps

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/dodoododo/our-note.git](https://github.com/dodoododo/our-note.git)
    cd our-note
    ```

2.  **Install dependencies**
    This project uses a root-level script to install dependencies for the root, server, and frontend automatically.
    ```bash
    npm run install-all
    ```

3.  **Environment Configuration**
    Create a `.env` file in the `server/` directory and configure the following variables:
    ```bash
    PORT=5000
    MONGODB_URL=your_mongodb_connection_string
    JWT_SECRET=your_secret_key
    ```

4.  **Run Application**
    Start both the backend server and the frontend client concurrently:
    ```bash
    npm start
    ```



# OurNote - Website Interface Demonstration

Welcome to the UI showcase of **OurNote**. Below you will find screenshots of the application flow, ranging from authentication to collaborative features.

## Landing Page & Authentication
<img width="1900" height="1583" alt="localhost_5173_landing" src="https://github.com/user-attachments/assets/e1f655f1-6bd4-4542-8df7-b441bad9dde2" />
<img width="1919" height="905" alt="Authentication" src="https://github.com/user-attachments/assets/a8304fc6-13b8-43e7-9918-7af734fe1882" />

---


## Homepage & Personal Dashboard
<img width="1900" height="1855" alt="our-note-homepage" src="https://github.com/user-attachments/assets/d464231e-5292-45d8-a180-0f7c40d757de" />

---


## Group Displays
<img width="1900" height="1801" alt="our-note-my-groups" src="https://github.com/user-attachments/assets/87e3f47b-a929-4f09-a082-99432c7a2ddd" />

### Create Group
<img width="1919" height="911" alt="our-note-new-group" src="https://github.com/user-attachments/assets/93d3bca0-ad54-416f-b4bc-9c66db97d942" />


### Special Couple Group Detail
<img width="1900" height="1745" alt="our-note-couple-group" src="https://github.com/user-attachments/assets/f7ca243b-fcaf-4e0f-9b1b-05e013e3ddd9" />

### Group Settings 
<img width="1900" height="3346" alt="our-note-group-settings" src="https://github.com/user-attachments/assets/d576dbc1-b457-4be4-9fbf-3c9e31bae0ff" />

---

## Messaging
<img width="1919" height="911" alt="our-note-messages" src="https://github.com/user-attachments/assets/eb1bfc1a-026e-48b6-a9ca-bd2049c6598c" />
<img width="1919" height="908" alt="Screenshot 2026-02-07 194356" src="https://github.com/user-attachments/assets/09564f72-0002-4cd1-8b68-c3d43adafa8b" />


---

## Calendar
<img width="1900" height="1564" alt="our-note-calendar" src="https://github.com/user-attachments/assets/0784ef55-53ae-4729-b4e5-f662ee06e8b0" />

### Create calendar event 
<img width="1919" height="906" alt="add-calendar-event" src="https://github.com/user-attachments/assets/82082784-23d4-414d-910f-32c791a88f46" />

### See calendar date's event
<img width="1919" height="905" alt="our-note-calendar-date-event" src="https://github.com/user-attachments/assets/881f5b4e-ef85-49f2-b3a2-96abba26575c" />

### Calendar event detail
<img width="1919" height="906" alt="date-event-preview" src="https://github.com/user-attachments/assets/bf4dcbe1-3d63-444e-a2a3-3e00e2faaa32" />

---

## Task KanBan
<img width="1900" height="1580" alt="our-note-tasks" src="https://github.com/user-attachments/assets/4d11d5d8-90f0-46b3-a3f9-ee00c10e40bd" />

### Create task
<img width="1919" height="909" alt="create-task" src="https://github.com/user-attachments/assets/5fa1dbbc-834a-4cf6-b6d1-e2f5bb897fc3" />

### Edit task
<img width="1919" height="906" alt="edit-task" src="https://github.com/user-attachments/assets/66ef8bd4-5f7a-4d70-b62c-da0d21be4ecc" />


---

## Notes
<img width="1919" height="909" alt="our-notes-note" src="https://github.com/user-attachments/assets/e010232a-1ee1-4846-88db-ef71bb54f574" />

### Note preview
<img width="1919" height="908" alt="note-preview" src="https://github.com/user-attachments/assets/31a7e365-030f-4d2b-8152-f22e59be87cc" />

### Edit notes
<img width="1919" height="904" alt="edit-note" src="https://github.com/user-attachments/assets/2ae3a27e-66fc-406a-83c3-18d898825a4b" />

---

## Events
<img width="1900" height="3148" alt="our-note-events" src="https://github.com/user-attachments/assets/f1b6c0a5-4b07-4047-b372-9b15b4aa7f12" />

### Events map
<img width="1919" height="905" alt="our-note-event-map" src="https://github.com/user-attachments/assets/550d3947-3aa4-4462-a6a0-ccf9bb05b42d" />

---

## Whiteboard
<img width="1900" height="1276" alt="our-note-whiteboard" src="https://github.com/user-attachments/assets/451f06af-0fd1-430a-9b84-7dffd248a5ff" />

### Whiteboard text
<img width="1918" height="905" alt="our-note-whiteboard-text" src="https://github.com/user-attachments/assets/b22c36f5-87f0-4506-9914-8166415ab826" />

---

## Invitations
<img width="1919" height="907" alt="our-note-invitations" src="https://github.com/user-attachments/assets/22a1c49b-4bdd-4736-ab90-223b1ff99fc9" />

---

