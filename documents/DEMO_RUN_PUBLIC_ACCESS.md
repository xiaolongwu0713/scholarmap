# Demo Run Public Access Implementation

## Overview
This document describes the implementation of public access to a specific demo run, allowing users to explore the product without registration.

## Demo Run Details
- **Project ID**: `6af7ac1b6254`
- **Run ID**: `53e099cdb74e`
- **Access**: Public (read-only)
- **URL**: `/projects/6af7ac1b6254/runs/53e099cdb74e`

## Changes Made

### 1. Frontend Changes

#### 1.1 Hero Component (`frontend/src/components/landing/Hero.tsx`)
- **Modified**: Watch Demo button
- **Change**: Now opens the demo run in a new tab
- **Code**:
  ```typescript
  onClick={() => {
    window.open("/projects/6af7ac1b6254/runs/53e099cdb74e", "_blank");
  }}
  ```

#### 1.2 Run Page (`frontend/src/app/projects/[projectId]/runs/[runId]/page.tsx`)
- **Modified**: Page export function
- **Change**: Bypasses AuthGuard for demo run
- **Logic**: 
  - Checks if the project and run IDs match the demo run
  - If yes, renders RunPageContent directly without authentication
  - Otherwise, wraps with AuthGuard as usual

### 2. Backend Changes

#### 2.1 Authentication Middleware (`backend/app/auth/middleware.py`)
- **Modified**: AuthMiddleware class
- **Changes**:
  - Added `DEMO_PROJECT_ID` and `DEMO_RUN_ID` constants
  - Added special logic to allow GET requests to demo run without authentication
  - Uses special user ID `"demo_user"` for demo access tracking
- **Security**: Only GET requests are allowed (read-only access)

#### 2.2 Database Store (`backend/app/db/service.py`)
- **Modified**: `get_project` method
- **Change**: Added special handling for demo user
- **Logic**:
  - Checks if user is `"demo_user"` and accessing demo project
  - If yes, bypasses user ownership check
  - Allows demo user to access the demo project without authentication

## Security Considerations

1. **Read-Only Access**: Only GET requests are allowed for unauthenticated users
2. **Limited Scope**: Access is restricted to a specific project and run
3. **No Modifications**: Demo users cannot create, update, or delete any data
4. **Tracking**: Demo access is tracked with a special `"demo_user"` identifier

## Usage

### For End Users
1. Visit the landing page
2. Click the "Watch Demo" button
3. Explore the complete run workflow including:
   - Research description parsing
   - Retrieval framework generation
   - Query execution results
   - Interactive 3D map visualization

### For Developers
To change the demo run:
1. Update `DEMO_PROJECT_ID` and `DEMO_RUN_ID` in:
   - `backend/app/auth/middleware.py`
   - `backend/app/db/service.py`
   - `frontend/src/app/projects/[projectId]/runs/[runId]/page.tsx`
   - `frontend/src/components/landing/Hero.tsx`

## Testing

To test the demo run access:
1. Open the landing page without logging in
2. Click "Watch Demo"
3. Verify that the run page loads without authentication
4. Try to interact with the map and view results
5. Confirm that modification actions (if any) are blocked

## Future Enhancements

Potential improvements:
- Add a banner indicating this is a demo run
- Implement rate limiting for demo access
- Add analytics to track demo usage
- Create multiple demo runs for different use cases
