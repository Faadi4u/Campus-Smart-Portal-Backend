# Campus Smart Portal API

MERN backend (Express + MongoDB/Mongoose). Work in progress.

## Project Goal

Centralized campus portal for **room booking and resource management** with role-based access (student, faculty, admin) and basic analytics.

---

## Requirements

- Node.js 20+
- MongoDB (Atlas or local)

---

## Run locally

1. `npm install`
2. Copy `.env.example` → `.env` and fill values
3. `npm run dev`

Server runs at: `http://localhost:3000`

---

## Implemented so far

- ✅ **Core Backend**
  - MongoDB connection (Mongoose)
  - Express server bootstrap
  - Health endpoints:
    - `GET /api/v1/healthz` (liveness)
    - `GET /api/v1/readyz` (readiness: checks Mongo connection)
  - Central error handling middleware
  - Utilities: async handler wrapper, API error/response helpers

- ✅ **Authentication & Users**
  - User model:
    - `fullName`, `email`, `password`, `role` (`student`/`faculty`/`admin`), `department`, `registrationNumber`, `semester`, `section`, `designation`, `avatarUrl`, `isActive`
  - Password hashing with bcrypt (pre-save hook, `SALT_ROUNDS`)
  - JWT helpers on the model:
    - `generateAccessToken()`
    - `generateRefreshToken()`
  - Methods: `isPasswordCorrect(password)`
  - Routes:
    - `POST /api/v1/auth/register`
    - `POST /api/v1/auth/login`
    - `GET  /api/v1/auth/me` (requires `Authorization: Bearer <token>`)

- ✅ **Rooms Module**
  - Room model:
    - `name`, `type` (`classroom`/`lab`/`hall`/`meeting_room`), `capacity`, `features[]`, `location`, `isActive`
  - Admin-only:
    - `POST /api/v1/rooms` – create room
  - Any authenticated user:
    - `GET  /api/v1/rooms` – list active rooms
    - `GET  /api/v1/rooms/search` – search active rooms

- ✅ **Bookings Module**
  - Booking model:
    - `user`, `room`, `startTime`, `endTime`, `purpose`, `status` (`pending`/`approved`/`rejected`/`cancelled`), `adminComment`
  - Validation:
    - Required fields: `roomId`, `startTime`, `endTime`, `purpose`
    - `startTime < endTime` check
    - Prevent booking in the past
    - Conflict detection (no overlapping bookings for same room when status is `pending` or `approved`)
  - User routes (auth required):
    - `POST /api/v1/bookings` – create booking request
    - `GET  /api/v1/bookings/my-bookings` – list own bookings
    - `GET  /api/v1/bookings/my-stats` – simple stats (pending/approved/rejected/cancelled/total)
    - `PATCH /api/v1/bookings/:id/cancel` – cancel own pending/approved booking

  - Calendar & Availability:
    - `GET /api/v1/bookings/calendar` – to maek calendar booking
    - `GET /api/v1/bookings/availability` – checking availability of rooms for booking
    
  - Admin routes (auth + admin role):
    - `GET  /api/v1/bookings/all` – list all bookings
    - `PATCH /api/v1/bookings/:id/status` – approve/reject a booking
    - `GET  /api/v1/bookings/dashboard` – dashboard stats (overview + status summary, etc.)
    - `GET  /api/v1/bookings/dashboard` – dashboard stats (overview + status summary, etc.)
    - `GET  /api/v1/bookings/search` – Search all bookings

  - Update Password , UserName and Email , Delete Account :
    - `router.route("/update-account").patch(auth, updateAccountDetails)`
    - `router.route("/change-password").patch(auth, changeCurrentPassword)`
    - `router.route("/delete-account").delete(auth, deleteAccount);`

- ✅ **Advanced Features**
  - Calendar API: Formatted data for frontend calendar views.
  - Availability Check: Check specific room slots.
  - Email Notifications: Automated emails via Nodemailer when booking status changes.
---

## Environment variables

Create a `.env` file in the project root (do not commit it):

- PORT=3000
- MONGODB_URL=sample
- DB_NAME=sample
- CORS_ORIGIN=sample
- ACCESS_TOKEN_SECRET=yourSecret
- ACCESS_TOKEN_EXPIRY=15m
- REFRESH_TOKEN_SECRET=yourSecret
- REFRESH_TOKEN_EXPIRY=14d
- SMTP_HOST=smtp.gmail.com
- SMTP_PORT=587
- SMTP_USER=your-email@gmail.com
- SMTP_PASS=xxxx xxxx xxxx xxxx  # The 16-digit App Password

---

## Verify
## Verify API Endpoints

 Basic health
```bash
- GET http://localhost:3000/api/v1/healthz
- GET http://localhost:3000/api/v1/readyz

### Auth
- POST http://localhost:3000/api/v1/auth/register
- POST http://localhost:3000/api/v1/auth/login
- GET http://localhost:3000/api/v1/auth/me  
  (with `Authorization: Bearer <token>`)

### Rooms
- POST http://localhost:3000/api/v1/rooms (admin)
- GET http://localhost:3000/api/v1/rooms (any logged-in user)
- POST http://localhost:3000/api/v1/rooms/search (search active rooms)

### Bookings
- POST http://localhost:3000/api/v1/booking (student/faculty)
- GET http://localhost:3000/api/v1/booking/my-bookings
- GET http://localhost:3000/api/v1/booking/my-stats
- GET http://localhost:3000/api/v1/booking/calendar
- GET http://localhost:3000/api/v1/booking/availability

### Admin Operations 
- GET http://localhost:3000/api/v1/booking/all 
- GET http://localhost:3000/api/v1/booking/search 
- GET http://localhost:3000/api/v1/booking/dashboard 
- GET http://localhost:3000/api/v1/booking/:id/status  (Triggers Email)

### Update Profile
- GET http://localhost:3000/api/v1/update-account
- GET http://localhost:3000/api/v1/change-password
- GET http://localhost:3000/api/v1/delete-account

