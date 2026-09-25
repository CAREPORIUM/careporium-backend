# Healthcare Worker Shift Marketplace — Backend

Backend API for CAREPORIUM, a platform designed to connect healthcare facilities with verified healthcare professionals looking for short-term shifts.

The backend is being developed using - Node.js, Express.js, and MongoDB.

---

# Project Status

**Current stage:** Backend Foundation

Completed:

* Node.js project setup
* Express.js server
* Environment variable configuration
* CORS configuration
* JSON request handling
* MongoDB Atlas setup
* Mongoose database connection
* Health-check endpoint
* Basic project folder structure

Next:

* User model
* User registration
* Login
* Password hashing
* JWT authentication
* Role-based authorization

---

# Technology Stack

* **Node.js** — JavaScript runtime
* **Express.js** — Backend web framework
* **MongoDB Atlas** — Cloud database
* **Mongoose** — MongoDB object modeling
* **dotenv** — Environment variable management
* **CORS** — Cross-Origin Resource Sharing
* **bcryptjs** — Password hashing
* **jsonwebtoken** — JWT authentication
* **Nodemon** — Development server auto-restart

---

# 📁 Project Structure

CAREPORIUM_API/
│
├── config/             env config, db connection, matching weights
│   └── db.js           responsible for connecting the application to MongoDB Atlas
│
├── controllers/        the business logic for handling requests
│
├── middleware/         middleware used between the incoming request and the controller
│
├── models/             Mongoose schemas and models that define how data is stored in MongoDB
│
├── routes/             API routes/endpoints
│
├── services/           reusable business/service logic that should be separated from controllers
│
├── utils/              reusable helper functions
├── .env
├── .gitignore
├── index.js
├── package.json
├── package-lock.json
└── README.md


## To Note

### `middleware/`

Examples we expect to add:

middleware/
├── authMiddleware.js
├── roleMiddleware.js
└── errorMiddleware.js


---

### `services/`

Potential future services:

services/
├── matchingService.js
├── paymentService.js
└── notificationService.js

---

### `utils/`

Examples:

utils/
├── validators.js
└── generateToken.js

---

# Getting Started

## 1. Clone the repository

Clone the project:

```bash
git clone <repository-url>
```

Then enter the project directory:

```bash
cd CAREPORIUM-API
```

---

## 2. Install dependencies

Run:

```bash
npm install
```

This installs all dependencies listed in `package.json`.

---

## 3. Create your `.env` file

Each developer should create their own local `.env` file after cloning

Create a file called:

```text
.env
```

The `.env` file should contain:


PORT=8089

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_secret_key 

**and any other credential personal to you while you build**


### Important

**Please do not commit or push `.env` to GitHub.**

The `.gitignore` file already contains:

```text
node_modules/
.env
```

---

# MongoDB

The project uses **MongoDB Atlas**.

The backend connects to MongoDB through Mongoose using:

```text
process.env.MONGODB_URI
```

The database connection is handled in:

```text
config/db.js
```

The connection is initialized from:

```text
index.js
```

### Do not hard-code MongoDB credentials

Please do not add this to the index.js file:

mongoose.connect("mongodb+srv://username:password@...");


Instead use this as your connection string in your locally created .env file:

MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.erzqlbf.mongodb.net/careporium_db?appName=Cluster0;


---

# Running the Application

## Development

Run:

```bash
npm run dev
```

Nodemon will automatically restart the server when changes are detected.

Expected output:

```text
Server running on port 8089
MongoDB connected successfully!

```

---

## Production

Run:

```bash
npm start
```

This runs:

```bash
node index.js
```

---

# 🔍 Current API Endpoints

## Root Endpoint

```http
GET /
```

Expected response:

```json
{
  "message": "Careporium API is running!"
}
```

---

## Health Check

```http
GET /health
```

Expected response:

```json
{
  "status": "OK",
  "message": "Server is up and running!"
}
```

The health endpoint can be used to quickly confirm that the backend server is running.

---

# Environment Variables

The application currently expects:

| Variable     | Purpose                                         |
| ------------ | ----------------------------------------------- |
| `PORT`       | Port the Express server runs on                 |
| `MONGO_URI`  | MongoDB Atlas connection string                 |
| `JWT_SECRET` | Secret that will be used for JWT authentication |

Example:

```env
PORT=5050
MONGO_URI=your_connection_string
JWT_SECRET=your_secret
```

Never commit actual credentials to GitHub... the reason .env file was included in the .gitignore file. Please
ensure to check this before pushing your code to the repository.

---

# Git Workflow

To avoid everyone making changes directly to `main`, developers should work on feature branches.

### 1. To get the latest code

```bash
git pull origin main
```

### 2. Create a feature branch

Use a descriptive branch name depending on the module you are assigned to work on:

```bash
git checkout -b feature/user-registration
```

Examples:

```text
feature/user-login
feature/worker-profile
feature/facility-profile
feature/shift-management
feature/application-api
```

### 3. Make your changes

Test your changes locally.

### 4. Commit

```bash
git add .
git commit -m "feat: add user registration"
```

### 5. Push your branch

```bash
git push origin feature/user-registration
```

### 6. Create a Pull Request

Open a Pull Request on GitHub and request another team member to review the code.

Do not merge unreviewed work directly into `main`.

---

# API Testing

We will use **Postman** to test our API endpoints.

Every new endpoint should be tested for:

* Successful requests
* Invalid input
* Missing required fields
* Invalid IDs
* Unauthorized requests
* Forbidden requests where applicable
* Appropriate HTTP status codes
* Appropriate error responses

A shared Postman collection will be maintained as the API grows.

---

# Development Principles

### 1. Keep responsibilities separated

Routes should handle routing.

Controllers should handle request/response logic.

Models should define database structures.

Middleware should handle reusable request-processing logic.

Services should contain reusable business logic where appropriate.

---

### 2. Do not create models without understanding the requirement

Before creating a new collection/model, understand:

```text
Requirement
    ↓
Business rule
    ↓
Entity
    ↓
Relationship
    ↓
Schema
    ↓
API
```

We should avoid creating database collections simply because a frontend screen exists.

---

### 3. Communicate dependencies

If your work depends on another developer's module, communicate it early.

For example:

```text
Shift application
       ↓
requires
       ↓
User authentication
       ↓
requires
       ↓
User model
```

Don't wait until the end of the sprint to discover that two modules were designed differently.

---

# Backend Team

We currently consist of 7 developers.

Development will be collaborative. Module ownership means responsibility for coordinating and maintaining that area; it does not mean developers work in isolation.

Proposed areas of ownership:

| Area                           | Responsibility                                |
| ------------------------------ | --------------------------------------------- |
| Authentication & Authorization | User registration, login, JWT, roles          |
| Worker                         | Worker profile and credentials                |
| Facility                       | Facility profile and verification             |
| Shifts                         | Shift creation, management and search         |
| Applications                   | Shift applications and matching               |
| Assignments                    | Assignment, attendance and completion         |
| Payments/Platform              | Payments, reviews, notifications and disputes |

Ownership may change as the requirements and MVP are finalized.

---

# Current Development Roadmap

### Phase 1 — Backend Foundation - DONE

* [x] Initialize Node.js project
* [x] Install dependencies
* [x] Configure Express
* [x] Configure environment variables
* [x] Configure CORS
* [x] Create project structure
* [x] Create MongoDB connection
* [x] Create health endpoint

### Phase 2 — Authentication - TO BEGIN

* [ ] User model
* [ ] Registration
* [ ] Password hashing
* [ ] Login
* [ ] JWT generation
* [ ] Authentication middleware
* [ ] Role-based authorization

### Phase 3 — Profiles & Verification

* [ ] Worker profile
* [ ] Healthcare credentials
* [ ] Worker verification
* [ ] Facility profile
* [ ] Facility verification

### Phase 4 — Shift Marketplace

* [ ] Create shift
* [ ] Update shift
* [ ] Delete/cancel shift
* [ ] View available shifts
* [ ] Search/filter shifts
* [ ] Matching

### Phase 5 — Applications & Assignments

* [ ] Apply for shift
* [ ] Review applications
* [ ] Select worker
* [ ] Assignment
* [ ] Attendance
* [ ] Shift completion

### Phase 6 — Payments & Platform Features

* [ ] Payment processing
* [ ] Payment release
* [ ] Transactions
* [ ] Reviews and ratings
* [ ] Notifications
* [ ] Disputes

---

# Important

This project is still under development.

Some features and business rules are still subject to confirmation from the product requirements and team discussions.

Before implementing a feature whose requirements are unclear:

1. Raise the question with the team.
2. Confirm the expected behavior.
3. Document the decision.
4. Then implement it.

This helps prevent different developers from implementing different interpretations of the same feature.

---

# Team Communication

When blocked, communicate early.

A useful blocker message should include:

```text
Task:
What I am building

Problem:
What is currently preventing progress

What I have tried:
Steps already taken

What I need:
Specific help or decision required
```

This makes it easier for the team to resolve issues quickly.


