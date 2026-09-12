# Task Manager Application

This repository contains the backend (`api`) and frontend (`web`) code for the Task Manager application. Below is a comprehensive list of all the features currently available in both the API and Web modules.

## 🚀 Web Frontend Features (Next.js)

The web application provides a responsive, modern interface for managing projects and tasks, featuring different views and detailed task management components.

### 🔐 Authentication
- **Google Login:** Secure authentication using Google OAuth.
- **Guest Login:** Anonymous login option for quick access.

### 📋 Task Views
- **Kanban Board View:** Interactive board with columns representing different statuses. Drag and drop task cards to update progress.
- **List View:** Structured list layout grouping tasks logically, with detailed rows.

### 📝 Task Details & Management
- **Task Creation & Editing:** Create tasks, update titles, descriptions, priorities, and statuses.
- **Task Details Panel:** A slide-out or modal panel for in-depth task management.
- **Comments System:** Add, edit, and delete comments on tasks to collaborate with team members.
- **Timeline & Updates:** View a history of task updates and timeline events.
- **Time Tracking UI:** Interface for starting and stopping a timer on a specific task.
- **File Attachments:** Upload and view files attached to tasks.
- **Member Invitations:** UI to invite other users to collaborate on specific tasks.

### 📊 Analytics & Dashboard
- **Employee Activity Dashboard:** Comprehensive dashboard displaying active employee metrics, completed tasks, overdue items, hours logged, completion trends, department analytics, status distributions, top performers leaderboard, and live running timers.
- **Weekly / Monthly Filtering:** Switch aggregation scopes dynamically.

### 📂 Project Management
- **Project Listing:** View all available projects.
- **Project Capsules/Badges:** Visual indicators for tasks belonging to specific projects.

---

## ⚙️ API Backend Features (NestJS)

The backend provides a robust RESTful API built with NestJS, utilizing JWT for authentication and modular controllers for resource management.

### 🛡️ Authentication & User Management (`/auth`, `/users`)
- **Google OAuth Integration:** Validates Google tokens and provisions users.
- **Guest Accounts:** Generates temporary guest user profiles.
- **JWT Authentication:** Secure endpoints using access and refresh tokens (HTTP-only cookies).
- **Profile Retrieval:** Fetch current authenticated user details.
- **Logout:** Clears authentication cookies.

### 📁 Projects Management (`/projects`)
- **CRUD Operations:** Create, Read (all or specific by ID), Update, and Delete projects.
- **User Authorization:** Endpoints are secured and tied to the authenticated user's workspace/account.

### ✅ Task Management (`/tasks`)
- **Core CRUD:** Create, Read, Update, and Delete tasks.
- **Project Filtering:** Retrieve tasks filtered by a specific `projectId`.
- **Duplicate Tasks:** Endpoint to instantly duplicate an existing task.

### 📊 Dashboard & Reporting (`/dashboard`)
- **Employee Activity Aggregation:** High-performance `$facet` aggregation pipeline returning KPIs with delta comparisons, daily completion trends, department performance, status breakdown, top performers, and live timer statuses.

### 💬 Task Collaboration & Advanced Features
- **Comments Management:** Add, update, and remove comments on specific tasks.
- **File Uploads:** Upload multiple files (using Multer disk storage) and attach them directly as resources to a task.
- **Generic File Uploads:** Upload files independently of a specific task.
- **Time Tracking:** Start and stop a timer on a task to log time spent.
- **Task Invitations:** Invite users to a specific task by email.
