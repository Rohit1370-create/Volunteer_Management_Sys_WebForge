# P21 — Volunteer Management System (REST API)

A production-grade, secure REST API backend built for managing student volunteers for college campus activities, events, and operations.

Built with **Node.js, Express.js, MongoDB, Mongoose, JWT (HTTP-Only Cookie), bcryptjs, and express-validator**.

---

## 📋 Table of Contents
1. [Core Features & Architecture](#core-features--architecture)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Environment Setup & Installation](#environment-setup--installation)
5. [Database Seeding](#database-seeding)
6. [Running the Application](#running-the-application)
7. [Running Automated Tests](#running-automated-tests)
8. [Postman Test Collection](#postman-test-collection)
9. [API Reference](#api-reference)
10. [Key Engineering Algorithms & Design Decisions](#key-engineering-algorithms--design-decisions)
11. [Security Highlights](#security-highlights)

---

## 🚀 Core Features & Architecture

### User Roles & Permissions (RBAC)
* **USER**:
  * Browse and search opportunities with status, date, and location filters
  * View detailed opportunity information
  * Register for open opportunities (strictly guarded by capacity and duplicate checks)
  * Withdraw from opportunities (only while eligible)
  * View personal participation history
  * Update personal profile name (role escalation prevented)
* **ADMIN**:
  * Create, update details, and manage status transitions (`OPEN`, `CLOSED`, `COMPLETED`, `CANCELLED`)
  * Delete opportunities
  * View all registered volunteers for a specific opportunity
  * View and filter all system registrations
  * Set volunteer participation outcomes (`ATTENDED`, `ABSENT`, `WITHDRAWN`)
  * Access directory of campus volunteers

---

## 🛠 Tech Stack

* **Runtime**: Node.js (v24+)
* **Framework**: Express.js (v4.21+)
* **Database**: MongoDB (Local or Atlas)
* **ODM**: Mongoose (v8.9+)
* **Authentication**: JSON Web Tokens (JWT) stored in secure `httpOnly` cookies (also supporting Bearer Authorization header for API testing)
* **Password Hashing**: bcryptjs (Work / Cost factor 12)
* **Validation**: express-validator
* **Testing Framework**: Jest & Supertest

---

## 📂 Project Structure

```
volunteer-management-system/
├── .env.example                      # Environment variables template
├── .env                              # Local environment variables
├── package.json                      # Project metadata and dependencies
├── README.md                         # Complete documentation
├── postman_collection.json           # Ready-to-import Postman v2.1 collection
├── src/
│   ├── app.js                        # Express app setup, CORS, cookies, route mounting
│   ├── server.js                     # MongoDB connection & HTTP server boot
│   ├── config/
│   │   └── db.js                     # Mongoose connection logic
│   ├── models/
│   │   ├── User.js                   # User schema (bcrypt 12, select: false, role enum)
│   │   ├── Opportunity.js            # Opportunity schema (denormalized registeredCount)
│   │   └── Registration.js           # Registration schema (compound unique index: user+opportunity)
│   ├── middleware/
│   │   ├── auth.js                   # protect (re-reads DB user) & authorize(roles)
│   │   ├── validate.js               # express-validator result handler (400 responses)
│   │   └── errorHandler.js           # Centralized error handler ({ success: false, message: ... })
│   ├── validators/
│   │   ├── authValidators.js         # Register and login validators
│   │   ├── opportunityValidators.js  # Opportunity CRUD, status, and query validators
│   │   ├── registrationValidators.js # Registration query and outcome validators
│   │   └── userValidators.js         # User update and ID validators
│   ├── controllers/
│   │   ├── authController.js         # Auth actions & cookie issuance
│   │   ├── opportunityController.js  # Opportunity actions & atomic capacity registration
│   │   ├── registrationController.js # Participation management, withdrawal & outcomes
│   │   └── userController.js         # Volunteer directory & profile updates
│   ├── routes/
│   │   ├── authRoutes.js             # /api/auth
│   │   ├── opportunityRoutes.js      # /api/opportunities
│   │   ├── registrationRoutes.js     # /api/registrations
│   │   └── userRoutes.js             # /api/users
│   └── seeds/
│       └── seed.js                   # Database seeder with sample opportunities & accounts
└── tests/
    ├── setup.js                      # Jest test database connection & teardown
    ├── auth.test.js                  # Authentication, cookie, and enumeration tests
    ├── opportunities.test.js         # Opportunity CRUD, RBAC, filters, and status tests
    ├── registrations.test.js         # Capacity guard, duplicate guard, state transitions tests
    └── users.test.js                 # Volunteer directory & privilege escalation tests
```

---

## ⚙️ Environment Setup & Installation

### 1. Prerequisites
- Node.js (v18+ recommended)
- MongoDB running locally on default port `27017` or a MongoDB Atlas URI

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
A `.env` file has been provided. You can modify it or use `.env.example`:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/volunteer_management
JWT_SECRET=super_secret_jwt_key_volunteer_mgmt_2026_dev_mode
JWT_EXPIRE=7d
COOKIE_EXPIRE=7
```

---

## 🌰 Database Seeding

Run the seed script to populate default admin, volunteers, and sample opportunities:
```bash
npm run seed
```

### Seeded Credentials:
| Role | Email | Password |
|---|---|---|
| **ADMIN** | `admin@campus.edu` | `Admin@12345` |
| **USER** | `asha@campus.edu` | `Password123` |
| **USER** | `ravi@campus.edu` | `Password123` |

### Seeded Opportunities:
1. **Campus Tree Plantation Drive**: `OPEN` (0/20 slots filled)
2. **Annual Tech Symposium Registration Desk**: `OPEN` (Near capacity: 1/2 slots filled by Asha)
3. **Blood Donation Camp Assistant**: `CLOSED` (0/5 slots)
4. **Orientation Day Campus Tour Guide**: `COMPLETED` (Past event, attended by Ravi)

---

## 🏃 Running the Application

### Development Mode (with hot-reload):
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```
The API will start listening on `http://localhost:5000`.
Health check: `GET http://localhost:5000/api/health`

---

## 🧪 Running Automated Tests

Run the complete Jest integration test suite (using an isolated test database `volunteer_management_test`):
```bash
npm test
```
**Results:** All **32 tests** pass across 4 suites covering:
* Cookie issuance & user enumeration defense
* Atomic capacity check & rollback
* Compound index duplicate prevention
* Withdrawal eligibility date & status guards
* Admin event cancellation cascade
* Privilege escalation rejection

---

## 📮 Postman Test Collection

A complete Postman collection is included in the project root: `postman_collection.json`.

### How to use:
1. Open **Postman**.
2. Click **Import** -> Select `postman_collection.json`.
3. The collection is organized into 4 folders matching the requirements:
   - `01. Auth & Security`
   - `02. Opportunities Management`
   - `03. Capacity & Registration Guard`
   - `04. Admin Operations & Status Transitions`
4. Run the collection with Postman Collection Runner to execute all automated test scripts.

---

## 📖 API Reference

### 1. Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new user (always creates `USER` role) |
| `POST` | `/api/auth/login` | Public | Login with email & password; sets HTTP-only cookie |
| `POST` | `/api/auth/logout` | Public | Clears auth cookie |
| `GET` | `/api/auth/me` | USER, ADMIN | Returns profile of currently logged-in user |

### 2. Opportunities (`/api/opportunities`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/opportunities` | USER, ADMIN | Browse opportunities (filters: `status`, `location`, `upcoming`, `page`, `limit`) |
| `GET` | `/api/opportunities/:id` | USER, ADMIN | View single opportunity by ID |
| `POST` | `/api/opportunities` | ADMIN | Create new opportunity (`dateTime` must be in the future) |
| `PATCH` | `/api/opportunities/:id` | ADMIN | Update details only (`title`, `description`, `location`, `capacity`, `dateTime`) |
| `PATCH` | `/api/opportunities/:id/status`| ADMIN | Update status (`OPEN`, `CLOSED`, `COMPLETED`, `CANCELLED`) |
| `DELETE` | `/api/opportunities/:id` | ADMIN | Delete opportunity and its registrations |
| `GET` | `/api/opportunities/:id/volunteers`| ADMIN | View all registrations for an opportunity |
| `POST` | `/api/opportunities/:id/register` | USER | Register for an opportunity (atomic capacity-safe) |

### 3. Registrations (`/api/registrations`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/registrations/me` | USER | View own participation history |
| `PATCH` | `/api/registrations/:id/withdraw`| USER (Owner)| Withdraw from an opportunity (only when eligible) |
| `GET` | `/api/registrations` | ADMIN | View and filter all registrations (`opportunity`, `user`, `status`, pagination) |
| `PATCH` | `/api/registrations/:id/status`| ADMIN | Set volunteer outcome (`ATTENDED`, `ABSENT`, `WITHDRAWN`) |

### 4. Users (`/api/users`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `PATCH` | `/api/users/me` | USER, ADMIN | Update own profile name (role escalation prevented) |
| `GET` | `/api/users` | ADMIN | List registered student volunteers |
| `GET` | `/api/users/:id` | ADMIN | View single volunteer profile |

---

## 🧠 Key Engineering Algorithms & Design Decisions

### 1. Capacity-Safe Registration Algorithm (§8)
To prevent race conditions and overbooking when multiple users register concurrently:
1. Verify opportunity exists, `status === 'OPEN'`, and `dateTime > Date.now()`.
2. Verify user does not already hold an active `REGISTERED` document.
3. Atomically check capacity and increment in a single database command using `$expr`:
   ```javascript
   const updatedOpp = await Opportunity.findOneAndUpdate(
     {
       _id: opportunityId,
       status: 'OPEN',
       $expr: { $lt: ['$registeredCount', '$requiredVolunteers'] }
     },
     { $inc: { registeredCount: 1 } },
     { new: true }
   );
   ```
4. If `null` is returned, abort immediately with `409 "No available slots"`.
5. Upsert registration document (create new, or flip an existing `WITHDRAWN` record back to `REGISTERED`).
6. In case of unexpected registration creation failure, step 3's counter increment is automatically rolled back by decrementing `registeredCount` by 1.

### 2. Withdrawal State Machine & Eligibility Algorithm (§9)
Withdrawal is allowed only when:
- Registration belongs to the requesting user (`req.user._id`).
- Registration status is currently `REGISTERED`.
- Opportunity status is not `COMPLETED` or `CANCELLED`.
- Opportunity `dateTime` is in the future (`dateTime > Date.now()`).
When withdrawing, `Opportunity.registeredCount` is atomically decremented (floored at 0), status is changed to `WITHDRAWN`, and `withdrawnAt` is recorded.

### 3. Duplicate Registration Constraint (§5)
A MongoDB compound unique index on `{ user: 1, opportunity: 1 }` guarantees that even under race conditions or bugs, duplicate registrations cannot be persisted. Re-registering flips the existing document rather than creating a duplicate.

### 4. Opportunity Cancellation Cascade (§10)
When an ADMIN sets an opportunity status to `CANCELLED`:
- Opportunity `registeredCount` is reset to 0.
- All registrations for that opportunity with `status: 'REGISTERED'` are bulk-flipped to `WITHDRAWN`.

---

## 🔒 Security Highlights

* **HTTP-Only Cookies**: JWT authentication tokens are saved in `httpOnly` cookies with `sameSite: strict` in production, eliminating the risk of token theft via Cross-Site Scripting (XSS).
* **Password Security**: Passwords are hashed with `bcryptjs` using a cost factor of **12**. The password field has `select: false` on the schema and is stripped by `toJSON` transformations.
* **Privilege Escalation Protection**: Public registration always forces role `USER`. Profile update (`PATCH /api/users/me`) explicitly forbids modifying `role`, `email`, or `password`.
* **User Enumeration Prevention**: Login failure returns identical status 401 and message `"Invalid credentials"` regardless of whether the email or the password was incorrect.
* **Database Re-Verification on Request**: The `protect` middleware re-queries the user on every request rather than trusting stale JWT payloads.
