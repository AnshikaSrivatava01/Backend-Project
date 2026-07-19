# 🎥 VideoTude & tweets

> A scalable RESTful backend API inspired by YouTube and Twitter, built with **Node.js**, **Express.js**, **MongoDB**, **Redis**, **Docker**, and **Cloudinary**.

![Node.js](https://img.shields.io/badge/Node.js-22.x-green)
![Express](https://img.shields.io/badge/Express-5.x-black)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-green)
![Redis](https://img.shields.io/badge/Redis-Caching-red)
![Docker](https://img.shields.io/badge/Docker-Containerized-blue)

---

# 📖 Overview

BackendProject is a production-style backend following the MVC architecture. It implements authentication, video management, playlists, comments, likes, subscriptions, tweets, dashboard analytics, Redis caching, Docker support, and Cloudinary media storage.

## ✨ Features

### Authentication
- JWT Access & Refresh Tokens
- HTTP-only Cookies
- bcrypt Password Hashing
- Protected Routes
- Login / Logout
- Update Password
- Update Account

### User
- Register/Login
- Current User
- Avatar Upload
- Cover Image Upload
- Channel Profile

### Videos
- Upload Videos
- Upload Thumbnails
- Update/Delete Videos
- Publish / Unpublish
- Search
- Pagination & Sorting
- Views

### Comments
- CRUD Operations
- Aggregate Pagination

### Likes
- Toggle Video Like
- Toggle Comment Like
- Toggle Tweet Like
- Liked Videos

### Playlists
- Create
- Update
- Delete
- Add/Remove Videos
- User Playlists

### Tweets
- Create
- Update
- Delete
- User Tweets

### Subscriptions
- Subscribe/Unsubscribe
- Subscribers List
- Subscribed Channels

### Dashboard
- Channel Statistics
- Uploaded Videos
- Aggregation Pipelines

### Redis
- Response Caching
- TTL Support
- Cache Invalidation
- Graceful MongoDB Fallback

### Cloudinary
- Image Upload
- Video Upload
- Media Deletion
- Public ID Extraction
- Automatic Temporary File Cleanup

### DevOps
- Docker
- Docker Compose
- Environment Variables

---

# 🏗 Architecture

```text
              Client
                 │
                 ▼
          Express REST API
                 │
     ┌───────────┼────────────┐
     ▼           ▼            ▼
 Authentication Controllers  Redis
     │           │            │
     └──────────►MongoDB◄─────┘
                 │
                 ▼
            Cloudinary
```

---

# 🛠 Tech Stack

## Backend
- Node.js
- Express.js

## Database
- MongoDB
- Mongoose

## Authentication
- JWT
- bcrypt

## Cache
- Redis (ioredis)

## Storage
- Cloudinary
- Multer

## DevOps
- Docker
- Docker Compose

## Utilities
- dotenv
- cookie-parser
- cors
- mongoose-aggregate-paginate-v2
- prettier
- nodemon

---

# 📁 Project Structure

```text
BackendProject
├── public/
├── src
│   ├── controllers
│   ├── db
│   ├── middlewares
│   ├── models
│   ├── redis
│   ├── routes
│   ├── utils
│   ├── app.js
│   ├── constants.js
│   └── index.js
├── Dockerfile
├── docker-compose.yml
├── package.json
├── .env
└── README.md
```

---

# 🚀 Installation

## Local

```bash
git clone <repository-url>
cd BackendProject
npm install
npm run dev
```

## Docker

```bash
docker compose up --build
```

---

# ⚙ Environment Variables

```env
PORT=8000
MONGODB_URI=
ACCESS_TOKEN_SECRET=
ACCESS_TOKEN_EXPIRY=
REFRESH_TOKEN_SECRET=
REFRESH_TOKEN_EXPIRY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
REDIS_URL=redis://redis:6379
CORS_ORIGIN=http://localhost:3000
```

---

# 🐳 Docker

```yaml
version: "3.8"

services:
  backendproject:
    build: .
    ports:
      - "8000:8000"
    env_file:
      - .env
    environment:
      REDIS_URL: ${REDIS_URL}

  redis:
    image: redis:7-alpine
```

---

# ⚡ Redis Cache Layer

The project contains a reusable cache manager providing:

- cacheManager.get()
- cacheManager.set()
- cacheManager.delete()

Features:

- Safe cache lookup
- JSON serialization
- Configurable TTL
- Graceful fallback
- Fault-tolerant logging

---

# ☁ Cloudinary

Utilities included:

- uploadOnCloudinary()
- deleteFromCloudinary()
- extractPublicId()

Supports automatic upload, deletion, cleanup, and secure media URLs.

---

# 🔐 Security

- JWT Authentication
- Refresh Token Rotation
- HTTP-only Cookies
- Password Hashing
- Protected Routes
- Centralized Error Handling

---

# 📊 Aggregation Pipelines

Uses MongoDB Aggregation Framework extensively:

- $lookup
- $match
- $project
- $group
- $sort
- $unwind
- $addFields
- Pagination

---

# 📡 API Modules

| Module | Operations |
|--------|------------|
| Users | Authentication, Profile |
| Videos | CRUD, Publish |
| Comments | CRUD |
| Likes | Toggle, Liked Videos |
| Playlists | CRUD |
| Tweets | CRUD |
| Subscriptions | Subscribe |
| Dashboard | Stats |
| Healthcheck | API Status |

---

# 🚀 Performance

- Redis Caching
- MongoDB Aggregation
- Pagination
- Cloudinary CDN
- Modular MVC
- Async Handler
- Standardized ApiResponse / ApiError

---

# 🔮 Future Improvements

- Email Verification
- Forgot Password
- Video Streaming
- Watch History
- Notifications
- Recommendation System
- OAuth Login
- CI/CD
- Kubernetes

---

# 👩‍💻 Author

**Anshika Ashish Srivastava**

- GitHub: https://github.com/AnshikaSrivatava01
- LinkedIn: https://linkedin.com/in/anshika-srivastava-a410b6354

---

# 📄 License

ISC

---

⭐ If you found this project useful, consider giving it a star.