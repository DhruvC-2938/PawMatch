# 🐾 PawMatch — Pet Adoption & Shelter Management Platform

PawMatch is a full-stack web application designed to bridge the gap between animal rescue shelters and prospective pet adopters. It digitizes the pet adoption lifecycle—from discovering rescue animals to submitting and reviewing adoption applications—through a unified platform supporting two distinct user personas: **Adopters** looking for a pet and **Shelters** managing rescue operations.

---

## 🎯 What PawMatch Does

In traditional pet adoption workflows, shelters often manage animal profiles and incoming adoption inquiries through fragmented channels like email, phone calls, or paper forms. PawMatch centralizes this entire process into a single ecosystem:

1. **For Adopters:**
   - Browse rescue pets with real photography, species categorization (Dogs, Cats, Rabbits, Birds, and others), and keyword search.
   - View pet biographies, age, breed, gender, and shelter information.
   - Submit formal adoption applications containing statements of interest and home suitability notes.
   - Track application statuses (`pending`, `approved`, `rejected`) in real time.

2. **For Animal Shelters:**
   - Set up and manage a registered shelter profile.
   - List new rescue animals with breed details, temperament, age, gender, and bio.
   - Update or delete existing pet listings as animals are adopted or medical details change.
   - Access a dedicated Shelter Dashboard to review incoming adoption inquiries and approve or reject them with a single click.

---

## 🏗 How the System Works (End-to-End Architecture)

PawMatch is structured around a classic Model-View-Controller (MVC) REST pattern backed by MongoDB Atlas and a hybrid authentication system.

```mermaid
graph TD
    Client[Modern Web Frontend - HTML/CSS/JS]
    Gateway[Express 5 REST API Server]
    AuthMW[Auth & Role Middlewares]
    FirebaseAuth[Firebase Authentication API]
    MongoAtlas[(MongoDB Atlas Database)]

    Client -->|HTTP REST Requests| Gateway
    Gateway -->|Verify Tokens & Roles| AuthMW
    Gateway -->|Credential Signup / Signin| FirebaseAuth
    Gateway -->|Query / Persist Records| MongoAtlas
```

### 1. Hybrid Authentication Model
PawMatch combines **Google Firebase Authentication** with **self-signed JWTs (JSON Web Tokens)**:
- **Registration/Login:** When a user enters their email and password, the Express server authenticates them against Firebase Identity Toolkit REST endpoints. This offloads password hashing and credential verification to Google's infrastructure.
- **Backend Authorization:** Once Firebase verifies the credentials, PawMatch locates or creates the user's profile in MongoDB and signs an internal JWT containing `{ userId, firebaseUid, role }`.
- **Stateless Session:** The client receives this JWT and sends it inside the `Authorization: Bearer <token>` header for subsequent requests.

### 2. Role-Based Access Control (RBAC)
PawMatch distinguishes between two roles:
- `adopter`: Can view pets, view shelters, submit adoption applications, and view their own submitted applications.
- `shelter`: Can create shelter profiles, publish new pet listings, update or delete existing listings, and approve/reject applications.

---

## 📂 Project Directory Structure

```text
PawMatch/
│
├── controllers/                  # Core business logic & request handling
│   ├── authController.js         # Firebase signup/login & backend JWT issuance
│   ├── petController.js          # Pet listing CRUD & keyword search logic
│   ├── shelterController.js      # Shelter organization registration
│   └── applicationController.js  # Adoption applications & status updates
│
├── middleware/                   # Express request interception middlewares
│   ├── authMiddleware.js         # Verifies JWT signatures and binds req.user
│   ├── roleMiddleware.js         # Restricts routes to authorized roles (e.g. 'shelter')
│   └── validationMiddleware.js   # Validates presence of required JSON body fields
│
├── models/                       # Mongoose schemas & MongoDB entity definitions
│   ├── User.js                   # User accounts (firebaseUid, email, name, role)
│   ├── Shelter.js                # Shelter profiles (name, address, email, phone)
│   ├── Pet.js                    # Pet listings (name, species, breed, age, shelterId)
│   └── Application.js            # Adoption requests (adopterId, petId, shelterId, status)
│
├── routes/                       # Express endpoint definitions
│   ├── authRoutes.js             # /api/auth
│   ├── petRoutes.js              # /api/pets
│   ├── shelterRoutes.js          # /api/shelters
│   └── applicationRoutes.js      # /api/applications
│
├── frontend/                     # Zero-dependency client Single Page Application
│   ├── index.html                # App shell, navigation, modals & shelter dashboard
│   ├── script.js                 # API interactions, client state store & photo mapping
│   └── style.css                 # Glassmorphism aesthetic, typography & responsive grid
│
├── .env                          # Local environment variables & secrets (git-ignored)
├── .gitignore                    # Prevents node_modules, .env, and uploads from commit
├── package.json                  # Dependencies & start scripts
└── server.js                     # Server bootstrap, CORS setup & MongoDB connection
```

---

## 🗄 Database Schemas (MongoDB Atlas)

### 1. User Schema (`models/User.js`)
Stores authenticated user records linked to Firebase UIDs.
* `firebaseUid` *(String, Required, Unique)*: Unique user identifier from Firebase.
* `name` *(String, Required)*: Full name of the user.
* `email` *(String, Required, Unique)*: User's contact email.
* `role` *(String, Enum: `["adopter", "shelter"]`, Default: `"adopter"`)*: User access role.
* `createdAt` / `updatedAt` *(Timestamps)*: Managed automatically by Mongoose.

### 2. Shelter Schema (`models/Shelter.js`)
Represents animal shelters that rescue and house animals.
* `name` *(String, Required)*: Organization name.
* `email` *(String, Required, Unique)*: Official shelter email.
* `address` *(String, Required)*: Physical street address.
* `phone` *(String)*: Telephone contact number.
* `createdAt` / `updatedAt` *(Timestamps)*

### 3. Pet Schema (`models/Pet.js`)
Represents individual animals up for adoption.
* `name` *(String, Required)*: Animal's name.
* `species` *(String, Required)*: Animal classification (`Dog`, `Cat`, `Rabbit`, `Bird`, `Other`).
* `breed` *(String, Required)*: Animal breed.
* `age` *(Number, Required)*: Age in years.
* `gender` *(String, Required)*: `Male` or `Female`.
* `description` *(String, Default: `""`)*: Personality, background, and medical notes.
* `shelterId` *(ObjectId, Ref: `Shelter`, Required)*: ID of the shelter housing this pet.
* `createdAt` / `updatedAt` *(Timestamps)*

### 4. Application Schema (`models/Application.js`)
Links adopters with pets and shelters to track adoption requests.
* `adopterId` *(ObjectId, Ref: `User`, Required)*: The user applying to adopt.
* `petId` *(ObjectId, Ref: `Pet`, Required)*: The pet being requested.
* `shelterId` *(ObjectId, Ref: `Shelter`, Required)*: The shelter responsible for the pet.
* `status` *(String, Enum: `["pending", "approved", "rejected"]`, Default: `"pending"`)*: Current status.
* `message` *(String, Default: `""`)*: Note from the applicant explaining their home environment.
* `createdAt` / `updatedAt` *(Timestamps)*

---

## 💻 Frontend Client Experience

The frontend is a lightweight, responsive Single Page Application (SPA) with zero external bundling dependencies:

- **Curated Photography:** Automatically pairs species and breeds with high-resolution animal photography from the Unsplash CDN, giving each animal listing a polished and lively look.
- **Dynamic Role Experience:** When an adopter logs in, they see options to apply for pets and view their applications. When a shelter logs in, the navigation dynamically reveals the **Shelter Dashboard** for listing animals and managing incoming requests.
- **Client State Store:** Manages current user session, auth token, active filter category, and loaded pets in memory while synchronizing tokens with browser `localStorage`.
- **Configurable Backend Host:** Includes an in-app setting that allows switching the API base URL (e.g., from `http://localhost:5000/api` to a production URL on Render or Railway).

---

## 📡 Complete REST API Documentation

### Authentication (`/api/auth`)

| Method | Endpoint | Auth | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | None | Anyone | Registers a user via Firebase & creates a MongoDB profile. Requires `name`, `email`, `password`, optional `role`. |
| `POST` | `/api/auth/login` | None | Anyone | Validates credentials with Firebase and returns JWT token & user object. Requires `email`, `password`. |
| `GET` | `/api/auth/profile` | Bearer JWT | Any | Returns profile details for the currently logged-in user. |

### Pet Management (`/api/pets`)

| Method | Endpoint | Auth | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/pets` | None | Public | Returns all available pets across all shelters. |
| `GET` | `/api/pets/search?keyword=query` | None | Public | Searches pets by matching keyword against `name`, `species`, or `breed`. |
| `GET` | `/api/pets/:id` | None | Public | Returns full details of a specific pet by MongoDB ID. |
| `POST` | `/api/pets` | Bearer JWT | Shelter | Creates a new pet listing. Requires `name`, `species`, `breed`, `age`, `gender`, `shelterId`. |
| `PUT` | `/api/pets/:id` | Bearer JWT | Shelter | Updates fields on an existing pet profile. |
| `DELETE`| `/api/pets/:id` | Bearer JWT | Shelter | Removes a pet profile from the database. |

### Shelters (`/api/shelters`)

| Method | Endpoint | Auth | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/shelters` | Bearer JWT | Shelter | Registers a new shelter. Requires `name`, `email`, `address`, and optional `phone`. |

### Adoption Applications (`/api/applications`)

| Method | Endpoint | Auth | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/applications` | Bearer JWT | Adopter | Submits an adoption inquiry for a pet. Requires `petId` and optional `message`. |
| `GET` | `/api/applications/my` | Bearer JWT | Adopter | Retrieves all applications submitted by the logged-in adopter with populated pet and shelter information. |
| `GET` | `/api/applications/user/:id` | Bearer JWT | Adopter | Retrieves applications by user ID (restricted so users can only view their own records). |
| `PUT` | `/api/applications/:id/status`| Bearer JWT | Shelter | Updates application status. Body requires `status`: `"pending"`, `"approved"`, or `"rejected"`. |

---

## ⚙️ Environment Variables Guide

The backend requires the following keys in a `.env` file in the project root:

```env
# Port for the Express server to listen on
PORT=5000

# MongoDB Atlas connection string
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/pawmatch?retryWrites=true&w=majority

# Web API Key from Firebase Console (Project Settings -> General -> Web API Key)
FIREBASE_API_KEY=AIzaSyA1234567890abcdefghijklmnopqrstuv

# Secret string used to sign and verify backend JWT tokens
JWT_SECRET=your_long_random_secure_jwt_secret_string
```

---

## 🚀 Running the Project Locally

### 1. Install Backend Dependencies
In the root directory, install the required packages:
```bash
npm install
```

### 2. Configure Environment
Create your `.env` file using the parameters listed above:
```bash
touch .env
```

### 3. Start the Express Server
```bash
# Production mode
npm start

# Or with live reload using nodemon
npx nodemon server.js
```
The console will display:
```text
MongoDB Atlas connected successfully
Server running on port 5000
```

### 4. Launch the Frontend
Open `frontend/index.html` in your browser, or run a lightweight local static server:
```bash
npx serve frontend -p 3000
```
Open `http://localhost:3000` to interact with the platform.

---

## 🛡️ Security Features

- **Decoupled Password Storage:** User passwords never touch or reside in the MongoDB database; they are handled directly by Firebase's identity infrastructure.
- **Payload Validation Middleware:** Every write request runs through `validateRequiredFields`, which cleanly rejects missing attributes with descriptive 400 error responses before database queries execute.
- **Cross-User Protection:** Users cannot view other users' application submissions; the server enforces identity verification between token claims and URL route parameters.
- **Role Isolation:** Non-shelter users attempting to access pet creation, shelter creation, or application approval routes receive a `403 Forbidden` response.
