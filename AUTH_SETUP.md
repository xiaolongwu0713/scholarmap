# Authentication Setup Guide

## Overview

The ScholarMap application now requires user authentication. All users must register and login to use the service.

## Features Implemented

1. **User Registration**
   - Email-based registration
   - Email verification code system
   - Password strength validation (minimum 8 characters, must include letters, numbers, and special characters)
   - Password confirmation

2. **User Login**
   - Email and password authentication
   - JWT token-based session management
   - Token stored in localStorage

3. **Email Verification**
   - Verification code sent to user's email
   - 10-minute expiration
   - 6-digit numeric codes

4. **API Protection**
   - All project/run APIs require authentication
   - JWT token validation middleware
   - User-specific data isolation (users can only access their own projects)

## Configuration

### Email Configuration (SendGrid)

The system uses SendGrid API to send verification codes. SendGrid is required for production deployments on Render, as Render blocks direct SMTP connections.

**Setup Instructions**:

1. **Create SendGrid Account** (if not already done):
   - Go to https://sendgrid.com and create an account
   - Verify your email address

2. **Create API Key**:
   - Go to SendGrid Dashboard → Settings → API Keys
   - Click "Create API Key"
   - Name: "ScholarMap Email Service"
   - Permissions: Select "Full Access" or "Mail Send" (minimum required)
   - Click "Create & View"
   - **Important**: Copy the API key immediately (it won't be shown again)

3. **For Local Development**: Add the API key to `.env` file in the project root or `backend/.env`:
   ```bash
   SENDGRID_API_KEY=SG.your-sendgrid-api-key-here
   ```

4. **For Render Deployment**: Add `SENDGRID_API_KEY` as an environment variable in Render dashboard:
   - Go to your Backend service → Environment → Add Environment Variable
   - Key: `SENDGRID_API_KEY`
   - Value: Your SendGrid API Key (starts with `SG.`)

**Email Configuration**:
- Service: SendGrid API (via SDK)
- From Email: `xiaolongwu0713@gmail.com` (hardcoded)
- API Key: Set via `SENDGRID_API_KEY` environment variable

**Development Mode**: If `SENDGRID_API_KEY` is empty or not set (in `.env` file or environment variable), verification codes will be printed to the console instead of being sent via email. This is useful for local development.

**Production Mode**: If `SENDGRID_API_KEY` is set, the system **must** successfully send the email via SendGrid API. If sending fails, an error will be raised and the registration will fail. This ensures email delivery in production.

**Render Platform Notes**:
- Render blocks direct SMTP connections, so SendGrid API is required
- SendGrid API uses HTTPS, which is always allowed on Render
- No network restrictions or firewall issues with SendGrid
- SendGrid free tier allows 100 emails per day (sufficient for development/testing)

### JWT Secret Key

For production, set a secure JWT secret key:
```bash
export JWT_SECRET_KEY="your-secure-random-secret-key"
```

## Database Changes

The database schema has been updated:
- New `users` table (user_id, email, password_hash, email_verified, created_at)
- New `email_verification_codes` table
- `projects` table now includes `user_id` foreign key
- All existing data should be cleared (as per user requirement)

## Frontend Routes

- `/auth/login` - Login page
- `/auth/register` - Registration page
- `/` - Home page (protected, redirects to login if not authenticated)
- `/projects/[projectId]` - Project page (protected)
- `/projects/[projectId]/runs/[runId]` - Run page (protected)

## Usage Flow

1. **Registration**:
   - User enters email
   - Clicks "Send Code" button
   - Enters 6-digit verification code
   - Sets password (with confirmation)
   - Submits form
   - Automatically logged in and redirected to home

2. **Login**:
   - User enters email and password
   - Submits form
   - Token stored in localStorage
   - Redirected to home page

3. **Protected Routes**:
   - All protected routes automatically redirect to `/auth/login` if user is not authenticated
   - Token is included in all API requests via `Authorization: Bearer <token>` header

## API Endpoints

### Public Endpoints
- `POST /api/auth/send-verification-code` - Send verification code
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Protected Endpoints (require authentication)
- All `/api/projects/*` endpoints
- All `/api/projects/{project_id}/runs/*` endpoints

## Testing

1. **Start the backend server**:
   ```bash
   cd backend
   python -m app.db.init_db  # Initialize database with new schema
   ./start_local.sh
   ```

2. **Start the frontend server**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Test Registration**:
   - Navigate to http://localhost:3000
   - Should redirect to /auth/login
   - Click "Register here"
   - Enter email, click "Send Code"
   - Check console (if SMTP not configured) or email for verification code
   - Enter code, set password, submit

4. **Test Login**:
   - After registration, you should be automatically logged in
   - Logout and test login flow

## Notes

- Password requirements are enforced both client-side and server-side
- Email verification codes expire after 10 minutes
- JWT tokens expire after 7 days (configurable)
- All API requests automatically include the authentication token
- Users can only access their own projects and runs

