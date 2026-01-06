# E-commerce API
MERN backend (Express + MongoDB/Mongoose). Work in progress.

## Requirements
- Node.js 20+
- MongoDB (Atlas or local)

## Run locally
1. npm install
2. npm run dev

## Implemented so far
- MongoDB connection (Mongoose)
- Server bootstrap (Express)
- Health endpoints:
  - GET /api/v1/healthz (liveness)
  - GET /api/v1/readyz (readiness: checks Mongo connection)
- Central error handling middleware
- Utilities: async handler wrapper, API error/response helpers and HttpError handler 

## Environment variables
Create a `.env` file in the project root (do not commit it):

- PORT=3000
- MONGODB_URL=sample
- DB_NAME=sample
- CORS_ORIGIN=sample

## Verify
- http://localhost:3000/api/v1/healthz
- http://localhost:3000/api/v1/readyz