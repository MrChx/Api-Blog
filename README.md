# Blog API

![Express Logo](https://upload.wikimedia.org/wikipedia/commons/6/64/Expressjs.png)

This project is an API for a Blog website built using **Express.js** as the backend and **MongoDB** as the database. The API allows users to share their stories or activities in a blog forum.

---

## Key Features
- **Article CRUD**: Create, read, update, and delete articles.
- **Posts CRUD**: Create, read, update, and delete posts.
- **User Management**: Endpoints to manage user data.
- **Authentication**: JWT-based authentication middleware for security.
- **File Management**: Upload user avatars and article thumbnails.
- **Error Handling**: Custom middleware to handle errors.

---

## Project Structure
The following is the file and folder structure of the project:

```
.
├── controller
│   ├── article-controller.js      # Logic for article CRUD
│   ├── post-controller.js         # Logic for post entities
│   └── user-controller.js         # Logic for user management
│
├── middleware
│   ├── auth-middleware.js         # Middleware for authentication
│   └── error-middleware.js        # Middleware for error handling
│
├── model
│   ├── article-model.js           # MongoDB schema and model for articles
│   ├── error-model.js             # Model to log errors (optional)
│   ├── post-model.js              # Schema and model for posts
│   └── user-model.js              # MongoDB schema and model for users
│
├── public/uploads
│   ├── articles                   # Directory for article images
│   │   ├── avatar                 # Folder for user avatars
│   │   └── thumbnail              # Folder for article thumbnails
│
├── routes
│   └── route.js                   # All API route definitions
│
├── .env                           # Environment configuration file
├── .gitignore                     # Files/folders ignored by Git
└── index.js                       # Application entry point
```

---

## Setup and Usage

### 1. Requirements
- Node.js (v14 or higher)
- MongoDB

### 2. Installation
1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd blog-express
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on the following example:
   ```plaintext
   PORT=3001
   MONGO_URI=mongodb://localhost:27017/blogDB
   JWT_SECRET=your_jwt_secret
   ```
4. Run the application:
   ```bash
   npm start
   ```

---

## Documentation API
https://documenter.getpostman.com/view/38348317/2sAYQUpE8a
---

## Technologies Used
- **Express.js**: Backend framework for Node.js
- **MongoDB**: NoSQL database for data storage
- **Mongoose**: ODM for MongoDB
- **JWT**: For authentication and authorization
- **Multer**: For file upload management
- **dotenv**: For environment configuration

---

## Project Goals
The Blog API project aims to provide a platform where users can:
- Share their stories or activities.
- Interact through the articles they create.

This platform fosters a community where ideas and stories can be shared and discovered by others.
