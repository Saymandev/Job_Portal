# Local Development Setup Guide

Complete guide to set up and run the Job Portal SaaS platform locally.

## Prerequisites

Ensure you have the following installed:

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: v5.0 or higher (local or Atlas)
- **Git**: Latest version

## Installation Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd job-portal-saas
```

### 2. Install Dependencies

Install all dependencies for both frontend and backend:

```bash
npm install
```

This will install dependencies for the monorepo and all workspace packages.

### 3. Setup MongoDB

#### Option A: Local MongoDB

```bash
# Install MongoDB
# macOS
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# Verify MongoDB is running
mongosh
```

#### Option B: MongoDB Atlas (Cloud)

1. Create a free account at https://www.mongodb.com/cloud/atlas
2. Create a new cluster
3. Whitelist your IP address
4. Create a database user
5. Get the connection string

### 4. Configure Environment Variables

#### Backend Environment Variables

Create `apps/backend/.env`:

```bash
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/job-portal
# Or for Atlas: mongodb+srv://username:password@cluster.mongodb.net/job-portal

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars-long
JWT_REFRESH_EXPIRES_IN=7d

# Stripe (Get from https://stripe.com)
STRIPE_SECRET_KEY=sk_test_your_test_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PRICE_ID_BASIC=price_1234567890
STRIPE_PRICE_ID_PRO=price_0987654321
STRIPE_PRICE_ID_ENTERPRISE=price_abcdefghij

# Email (Gmail)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-gmail-app-password
MAIL_FROM=noreply@jobportal.com

# Frontend URL
FRONTEND_URL=http://localhost:3000

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_DEST=./uploads

# Admin Default
ADMIN_EMAIL=admin@jobportal.com
ADMIN_PASSWORD=Admin@123
```

#### Frontend Environment Variables

Create `apps/frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_test_key
```

### 5. Setup Stripe (For Payment Testing)

1. Create a Stripe account at https://stripe.com
2. Get your test API keys from Dashboard
3. Install Stripe CLI for webhook testing:

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:5000/api/subscriptions/webhook
```

4. Copy the webhook signing secret to your `.env` file

### 6. Setup Gmail App Password

1. Enable 2-factor authentication on Gmail
2. Go to: https://myaccount.google.com/apppasswords
3. Generate a new app password for "Mail"
4. Copy the password to your `.env` file

### 7. Create Upload Directory

```bash
mkdir apps/backend/uploads
```

## Running the Application

### Option 1: Run Everything Together

From the root directory:

```bash
npm run dev
```

This starts both frontend and backend simultaneously.

### Option 2: Run Individually

#### Run Backend Only

```bash
npm run backend:dev
```

The backend will start on http://localhost:5000

API Documentation: http://localhost:5000/api-docs

#### Run Frontend Only

```bash
npm run frontend:dev
```

The frontend will start on http://localhost:3000

### Option 3: Run in Separate Terminals

Terminal 1 (Backend):
```bash
cd apps/backend
npm run dev
```

Terminal 2 (Frontend):
```bash
cd apps/frontend
npm run dev
```

Terminal 3 (Stripe Webhooks - Optional):
```bash
stripe listen --forward-to localhost:5000/api/subscriptions/webhook
```

## Verify Installation

### 1. Check Backend

Visit http://localhost:5000/api-docs - You should see Swagger documentation

### 2. Check Frontend

Visit http://localhost:3000 - You should see the homepage

### 3. Test Database Connection

Check backend logs for:
```
🚀 Server is running!
🔉 Listening on port 5000
📚 API Documentation: http://localhost:5000/api-docs
🌍 Environment: development
```

## Default Admin Account

After first run, login with:
- Email: `admin@jobportal.com`
- Password: `Admin@123`

**⚠️ Important**: Change this password immediately!

## Common Issues and Solutions

### Issue: MongoDB Connection Failed

**Solution:**
```bash
# Check if MongoDB is running
mongosh

# Restart MongoDB
brew services restart mongodb-community

# Or check your Atlas connection string
```

### Issue: Port Already in Use

**Solution:**
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Or kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Issue: Email Not Sending

**Solution:**
- Verify Gmail App Password is correct
- Check 2FA is enabled on Gmail
- Ensure no typos in `MAIL_USER` and `MAIL_PASSWORD`

### Issue: Stripe Webhooks Not Working

**Solution:**
```bash
# Make sure Stripe CLI is running
stripe listen --forward-to localhost:5000/api/subscriptions/webhook

# Copy the webhook signing secret to .env
```

### Issue: CORS Error

**Solution:**
- Verify `FRONTEND_URL` in backend `.env`
- Check both frontend and backend are running
- Clear browser cache

## Development Tools

### Recommended VS Code Extensions

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- MongoDB for VS Code
- Thunder Client (API testing)

### Useful Commands

```bash
# Format code
npm run format

# Lint code
npm run lint

# Build for production
npm run build

# Clean build files
npm run clean
```

## Project Structure

```
job-portal-saas/
├── apps/
│   ├── backend/          # Nest.js backend
│   │   ├── src/
│   │   │   ├── modules/  # Feature modules
│   │   │   ├── common/   # Shared utilities
│   │   │   └── main.ts   # Entry point
│   │   └── package.json
│   └── frontend/         # Next.js frontend
│       ├── src/
│       │   ├── app/      # App router pages
│       │   ├── components/
│       │   ├── lib/
│       │   └── store/
│       └── package.json
├── turbo.json
├── package.json
└── README.md
```

## Testing the Features

### 1. User Registration

1. Go to http://localhost:3000/register
2. Fill in the form
3. Check email for verification link

### 2. Job Posting (Employer)

1. Register as employer
2. Create company profile
3. Post a job
4. View applications

### 3. Job Application (Job Seeker)

1. Register as job seeker
2. Browse jobs
3. Apply for jobs
4. Track applications

### 4. Real-time Chat

1. Login as job seeker
2. Apply for a job
3. Start chat with employer
4. Open in two browsers to test real-time

### 5. Stripe Subscription

1. Login as employer
2. Go to subscription page
3. Use test card: 4242 4242 4242 4242
4. Complete checkout

## Next Steps

1. Explore the API documentation
2. Customize the theme colors
3. Add your branding
4. Configure email templates
5. Setup analytics
6. Deploy to production (see DEPLOYMENT.md)

## Getting Help

- Check API docs: http://localhost:5000/api-docs
- Review code comments
- Check GitHub issues
- Read DEPLOYMENT.md for production setup

## Important Notes

- Never commit `.env` files
- Keep dependencies updated
- Use test Stripe keys in development
- Backup your database regularly
- Follow security best practices

Happy coding! 🚀

