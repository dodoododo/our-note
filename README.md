# Our Note

**Our Note** is a comprehensive note-taking and management web application designed to streamline your personal and professional organization. Built with a modern **MERN stack** (MongoDB, Express, React, Node.js), it integrates rich text editing, interactive maps, and drag-and-drop task management into a single, cohesive platform.

![License](https://img.shields.io/badge/license-ISC-blue.svg)
![Node](https://img.shields.io/badge/node->=18-green.svg)
![React](https://img.shields.io/badge/react-18-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

## ✨ Key Features

Based on the project dependencies, **Our Note** includes:

- **Rich Text Note Taking:** Create and edit detailed notes using a WYSIWYG editor (`react-quill`).
- **Task Management:** Organize tasks with drag-and-drop functionality (`@hello-pangea/dnd`), perfect for Kanban boards or prioritized lists.
- **Location Services:** Interactive maps integration (`leaflet`, `react-leaflet`) for location-based notes or tracking.
- **Modern UI/UX:** Responsive design built with **Tailwind CSS v4** and **Radix UI** primitives for accessible, high-quality components.
- **Secure Authentication:** User registration and login protected by JWT and bcrypt.

## 🚀 Tech Stack

This project is structured as a monolithic repository containing both the client and server.

### Frontend (`/frontend`)
- **Core:** [React](https://react.dev/) (v18), [Vite](https://vitejs.dev/) (v7), [TypeScript](https://www.typescriptlang.org/).
- **Styling:** Tailwind CSS v4, Radix UI, `class-variance-authority` (CVA), `clsx`, `tailwind-merge`.
- **State Management:** [TanStack Query](https://tanstack.com/query/latest) (v5).
- **Routing:** React Router DOM (v7).
- **Utilities:** `date-fns` (Date manipulation), `axios` (HTTP client), `sonner` (Toast notifications).
- **Animation:** Framer Motion.

### Backend (`/server`)
- **Runtime:** Node.js & [Express](https://expressjs.com/).
- **Database:** MongoDB with [Mongoose](https://mongoosejs.com/).
- **Validation:** Joi.
- **Security:** Helmet, CORS, jsonwebtoken (JWT), bcryptjs.
- **Utils:** Compression, Dotenv.

## 📂 Project Structure

```bash
root/
├── frontend/      # React Vite Application
├── server/        # Express API Server
└── package.json   # Root scripts to manage both
