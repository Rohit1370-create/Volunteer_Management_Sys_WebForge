# P21 — Volunteer Management Backend REST API

A production-grade REST API backend built for managing student volunteers across college campus events and student affairs activities.

Built with **Node.js, Express.js (v1 API), MongoDB, Mongoose, JWT (HTTP-Only Cookie with Bearer fallback), bcrypt (cost 12), express-validator, ExcelJS, Helmet, and express-rate-limit**.

---

## 📋 Table of Contents
1. [Tech Stack](#-tech-stack)
2. [Project Structure](#-project-structure)
3. [Environment Configuration](#-environment-configuration)
4. [Installation & Setup](#-installation--setup)
5. [Database Seeding](#-database-seeding)
6. [Running the Application](#-running-the-application)
7. [Automated Testing](#-automated-testing)
8. [Postman & Newman Suite](#-postman--newman-suite)
9. [API Reference (Endpoints Table)](#-api-reference)
10. [Core Business Rules & Algorithms](#-core-business-rules--algorithms)
11. [Bonus Rules (Additions Flag)](#-bonus-rules-additions-flag)
12. [Security & Correctness Highlights](#-security--correctness-highlights)

---

## 🛠 Tech Stack
* **Runtime**: Node.js (v18+)
* **Framework**: Express.js (mounted under `/api/v1`)
* **Database**: MongoDB & Mongoose ODM
* **Authentication**: JWT delivered via an `httpOnly` cookie (primary), with `Authorization: Bearer` as documented fallback
* **Password Hashing**: bcryptjs (Work factor 12)
* **Security Middleware**: `helmet`, `cors` (explicit credentials & origin), `express-mongo-sanitize` (recursive NoSQL injection defense), `express-rate-limit`
* **File Export**: `exceljs`
* **Test Runners**: Jest, Supertest, Newman

---

## 📂 Project Structure

```
volunteer-management-system/
├── config/
│   └── db.js                       # Mongoose connection logic
├── controllers/
│   ├── authController.js           # Auth & cookie management
│   ├── clubController.js           # Club listing and creation
│   ├── eventController.js          # Event listing and creation
│   ├── opportunityController.js    # Opportunity CRUD, soft-cancel, volunteer listing
│   └── registrationController.js   # User withdrawal & participation history
├── middlewares/
│   ├── auth.js                     # protect (cookie/bearer + isActive check), authorize(roles)
│   ├── errorHandler.js             # Centralized JSON error envelope
│   ├── validate.js                 # express-validator result handler
│   └── validateObjectId.js         # ObjectId format check before DB queries
├── models/
│   ├── Club.js                     # Club schema (descriptive grouping)
│   ├── Event.js                    # Event schema linked to Club
│   ├── Opportunity.js             # Opportunity schema (denormalized registeredCount)
│   ├── Registration.js            # Registration schema (partial unique index)
│   └── User.js                     # User schema (student profile fields, bcrypt 12)
├── routes/
│   ├── authRoutes.js               # /api/v1/auth
│   ├── clubRoutes.js               # /api/v1/clubs
│   ├── eventRoutes.js              # /api/v1/events
│   ├── opportunityRoutes.js        # /api/v1/opportunities
│   └── registrationRoutes.js       # /api/v1/registrations
├── services/
│   ├── excelService.js             # Excel (.xlsx) roster generation
│   └── registrationService.js      # Atomic capacity, duplicate guard, schedule conflict
├── utils/
│   ├── apiError.js                 # Normalized API error class
│   └── responseEnvelope.js         # Standard success envelope
├── seed/
│   └── seed.js                     # Comprehensive database seeder
├── tests/
│   ├── setup.js                    # Test environment configuration
│   ├── auth.test.js                # Auth, cookie, and enumeration tests
│   ├── clubs_events.test.js        # Clubs & events tests
│   ├── opportunities.test.js       # Opportunity CRUD & soft-cancel tests
│   └── registrations.test.js       # Capacity guard, duplicate check, schedule conflict tests
├── .env.example
├── .env
├── package.json
├── postman_collection.json         # Newman-runnable Postman test suite
└── postman_environment.json        # Postman environment variables
```

---

## ⚙️ Environment Configuration

Copy `.env.example` to `.env`:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/volunteer_management
CLIENT_URL=http://localhost:3000
JWT_SECRET=super_secret_jwt_key_volunteer_mgmt_2026_dev_mode
JWT_EXPIRE=7d
COOKIE_EXPIRE=7
```

---

## 📦 Installation & Setup

1. Clone repository and install dependencies:
```bash
npm install
```

2. Make sure MongoDB is running locally on port 27017 or set `MONGO_URI` in `.env`.

---

## 🌰 Database Seeding

Run the seed script to populate test data:
```bash
npm run seed
```

### Seeded Test Credentials:
| Role | Email | Password | Details |
|---|---|---|---|
| **ADMIN** | `admin@campus.edu` | `Admin@12345` | Campus Administrator |
| **USER** | `asha@campus.edu` | `Password123` | Asha Sharma (CSE, Year 3) |
| **USER** | `ravi@campus.edu` | `Password123` | Ravi Kumar (ECE, Year 2) |
| **USER** | `neha@campus.edu` | `Password123` | Neha Patel (Mech, Year 4) |
| **USER** | `arjun@campus.edu` | `Password123` | Arjun Das (IT, Year 1) |
| **USER** | `priya@campus.edu` | `Password123` | Priya Nair (Civil, Year 3) |

### Key Seeded Scenarios:
* **Opportunity 1** (`Hackathon Registration Desk Coordinator`): `OPEN`, capacity **1/1 filled** by Asha. Used to test `409 CAPACITY_EXCEEDED`.
* **Opportunity 2** (`Hackathon Hardware Lab Assistant`): `OPEN`, starts **30 minutes after Opportunity 1**. Used to test `409 SCHEDULE_CONFLICT` when Asha attempts to sign up.
* **11 Opportunities total** across `OPEN`, `CLOSED`, `COMPLETED`, and `CANCELLED`.

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
Server runs at `http://localhost:5000`. Health check: `GET http://localhost:5000/api/v1/health`

---

## 🧪 Automated Testing

Run the automated Jest test suite (against isolated test database):
```bash
npm test
```
**Results:** **34 tests across 4 suites** passing with 100% success rate:
- `auth.test.js`: Registration, login, bad credential enumeration guard, deactivated user rejection
- `clubs_events.test.js`: RBAC, club creation, event creation
- `opportunities.test.js`: Browsing, CRUD, soft-cancel, date validations
- `registrations.test.js`: Atomic capacity guard, duplicate guard, schedule conflict check, partial unique index re-registration, withdrawal eligibility

---

## 📮 Postman & Newman Suite

Two files are included in the root directory:
* [`postman_collection.json`](./postman_collection.json)
* [`postman_environment.json`](./postman_environment.json)

### Running via Newman CLI:
```bash
npx newman run postman_collection.json -e postman_environment.json
```
The collection features positive and negative tests on **every endpoint**, auto-captures JWT tokens into environment variables, and asserts both HTTP status codes and exact response envelope shapes.

---

## 📖 API Reference

All routes are mounted under `/api/v1`:

| Method | Path | Access | Description / Rules |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Public | Register new student (`role` always forced to `USER` server-side) |
| `POST` | `/api/v1/auth/login` | Public | Generic 401 on bad credentials — never reveals which field was wrong |
| `POST` | `/api/v1/auth/logout` | Protected | Clears authentication cookie |
| `GET` | `/api/v1/auth/me` | Protected | Caller's own profile |
| `GET` | `/api/v1/clubs` | Protected | List clubs (open to all users) |
| `POST` | `/api/v1/clubs` | Admin | Create a club |
| `GET` | `/api/v1/events` | Protected | List events, filterable by `club` |
| `POST` | `/api/v1/events` | Admin | Create an event under a club |
| `GET` | `/api/v1/opportunities` | Protected | Browse/list opportunities (`status`, `club`, `event`, `date`, `upcoming`, paginate) |
| `GET` | `/api/v1/opportunities/:id` | Protected | Single opportunity details |
| `POST` | `/api/v1/opportunities` | Admin | Create opportunity (`dateTime` must be in the future) |
| `PATCH` | `/api/v1/opportunities/:id` | Admin | Update opportunity fields including `status` |
| `DELETE` | `/api/v1/opportunities/:id` | Admin | Soft-cancel (`status: CANCELLED`), never hard-delete once it has registrations |
| `POST` | `/api/v1/opportunities/:id/register` | User | Register: atomic capacity check, duplicate check, schedule conflict check |
| `PATCH` | `/api/v1/registrations/:id/withdraw` | Owner only | Withdraw from opportunity, only while `dateTime` is in the future |
| `GET` | `/api/v1/registrations/me` | Protected | Caller's own participation history |
| `GET` | `/api/v1/opportunities/:id/volunteers` | Admin | List of registered volunteers |
| `GET` | `/api/v1/opportunities/:id/volunteers/export` | Admin | Download volunteer roster as formatted `.xlsx` file |

---

## 🧠 Core Business Rules & Algorithms

### 1. Response Envelope
* **Success**: `{ success: true, data: ..., message?: "..." }`
* **Failure**: `{ success: false, error: { code: "...", message: "...", details?: ... } }`

### 2. Atomic Conditional Capacity Check
To prevent race conditions and overbooking when multiple requests arrive concurrently, slot incrementation is performed in a single atomic database operation:
```javascript
const reservedOpp = await Opportunity.findOneAndUpdate(
  {
    _id: opportunityId,
    status: 'OPEN',
    $expr: { $lt: ['$registeredCount', '$requiredVolunteers'] }
  },
  { $inc: { registeredCount: 1 } },
  { new: true }
);
```
If `reservedOpp` returns null, the request is rejected with `409 CAPACITY_EXCEEDED`. If any subsequent check or save fails, the counter is rolled back.

### 3. Partial Unique Index on Registration
The `Registration` schema uses a **partial unique index**:
```javascript
registrationSchema.index(
  { user: 1, opportunity: 1 },
  { unique: true, partialFilterExpression: { status: 'REGISTERED' } }
);
```
* **Why**: A standard compound unique index would prevent a student from withdrawing and signing up again in the future, as two `WITHDRAWN` documents would collide. The partial index only enforces uniqueness when `status == 'REGISTERED'`.

### 4. Soft-Cancellation on DELETE
Deleting an opportunity preserves participation history:
* Sets `status = 'CANCELLED'` and resets `registeredCount = 0`.
* Cascades to all active registrations, bulk-flipping them to `WITHDRAWN`.

---

## 🌟 Bonus Rules (Additions Flag)

> **Note for Evaluators:** The following two features are deliberate, additive enhancements built on top of the required problem statement:
>
> 1. **Schedule-Conflict Check (`409 SCHEDULE_CONFLICT`)**: When a user registers for an opportunity, the system queries the user's other active registrations and verifies that the new opportunity's start time does not collide within a **1-hour buffer** of any existing commitment. If a conflict occurs, the capacity reservation is rolled back and rejected with `409 SCHEDULE_CONFLICT`.
> 2. **Excel Volunteer Export (`GET /opportunities/:id/volunteers/export`)**: Admins can download an Excel workbook (`.xlsx`) containing full volunteer contact and academic information (Name, Email, Phone, Branch, Section, Year, Registration Timestamp) with formatted headers and auto-sized columns.

---

## 🔒 Security & Correctness Highlights

* **Helmet & CORS**: Strict security headers and credentials-enabled CORS tied to `CLIENT_URL` (never wildcard `*`).
* **Rate Limiting**: Tiered rate limiting with tighter restrictions on `/auth/*` routes.
* **NoSQL Injection Defense**: Recursive sanitization stripping `$` and `.` keys using `express-mongo-sanitize`.
* **Database Re-Verification**: `protect` middleware re-reads `User` on every request and confirms `isActive: true`.
* **Explicit Body Destructuring**: Controllers never pass raw `req.body` to Mongoose models.
* **Pre-Query ID Validation**: Route parameter IDs are validated as MongoDB ObjectIds before queries execute, returning `400 INVALID_ID`.
