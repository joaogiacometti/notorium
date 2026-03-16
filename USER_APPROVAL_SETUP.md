# User Approval System Setup

This guide explains how to set up and manage the user approval system in Notorium.

## Overview

Notorium uses an admin approval system to prevent spam and ensure only authorized users can access the application. All new users start with "pending" status and must be approved by an admin.

## User Status Types

- **pending**: New registration, awaiting admin approval
- **approved**: User can access all features
- **blocked**: User is denied access (used for spam/abuse)

## First-Time Admin Setup

### 1. Install and Start Notorium

Follow the setup instructions in [README.md](./README.md) to get Notorium running locally.

### 2. Create Your Account

1. Navigate to `http://localhost:3000`
2. Sign up with your email and password
3. Your account will have "pending" status

### 3. Promote Yourself to Admin

```bash
# Connect to database
psql $DATABASE_URL

# Make yourself an admin and approve your account
UPDATE "user" 
SET "isAdmin" = true, "accessStatus" = 'approved' 
WHERE email = 'your-email@example.com';
```

### 4. Log In and Manage Users

Now you can:
- Log in with your admin account
- View pending users in the admin interface
- Approve or block other users

## Admin User Management

### Approving Users

1. Log in as an admin
2. Navigate to the admin/user management section
3. Review pending users
4. Approve legitimate users, block suspicious ones

### Blocking Users

If you identify spam or abuse:

1. Log in as an admin
2. Navigate to the admin/user management section
3. Find the user you want to block
4. Change their status from "approved" to "blocked"
5. Save the changes

The user will immediately lose access to the application.

### Viewing User Statistics

The admin panel provides built-in user management features:

1. Log in as an admin
2. Navigate to the admin/user management section
3. View user statistics including:
   - Total number of users by status (pending/approved/blocked)
   - Recent user registrations
   - User activity and details
   - Search and filter capabilities

The admin interface provides real-time user data without needing database queries.

## Production Considerations

### Security Best Practices

1. **Regular Monitoring**: Check pending users regularly
2. **Rate Limiting**: Ensure rate limiting is properly configured

### Automated Approval (Optional)

For trusted environments, you can modify the registration process to auto-approve users from specific domains:

```sql
-- Auto-approve users from trusted domains
UPDATE "user" 
SET "accessStatus" = 'approved' 
WHERE email LIKE '%@trusted-domain.com' 
AND accessStatus = 'pending';
```