# 🚀 Quick Start Guide

Get your Job Portal SaaS up and running in 5 minutes!

## Prerequisites Check

```bash
node --version  # Should be >= 18.0.0
npm --version   # Should be >= 9.0.0
mongod --version # Should be >= 5.0.0 (or use MongoDB Atlas)
```

## 1-Minute Setup

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Setup Environment Variables

**Backend** (`apps/backend/.env`):
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/job-portal
JWT_SECRET=your-secret-key-min-32-characters-long
JWT_REFRESH_SECRET=your-refresh-secret-min-32-characters
FRONTEND_URL=http://localhost:3000

# For testing without email, use any values:
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=test@example.com
MAIL_PASSWORD=test-password
MAIL_FROM=noreply@jobportal.com

# For testing without Stripe, use test keys:
STRIPE_SECRET_KEY=sk_test_51xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRICE_ID_BASIC=price_xxxxx
STRIPE_PRICE_ID_PRO=price_xxxxx
STRIPE_PRICE_ID_ENTERPRISE=price_xxxxx
```

**Frontend** (`apps/frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
```

### Step 3: Run the Application
```bash
npm run dev
```

That's it! 🎉

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Docs**: http://localhost:5000/api-docs

## Test the Application

### 1. Register a New User

Go to: http://localhost:3000/register

- Choose "Find Jobs" for Job Seeker
- Or "Hire Talent" for Employer
- Fill in the form and register

### 2. Login

Go to: http://localhost:3000/login

Use the credentials you just created.

### 3. As a Job Seeker

1. **Update Profile**: Add your skills, resume, and experience
2. **Browse Jobs**: Go to "Browse Jobs" and explore
3. **Apply for Jobs**: Click on any job and apply
4. **Track Applications**: Check your dashboard for application status

### 4. As an Employer

1. **Create Company**: Set up your company profile
2. **Post a Job**: Create your first job listing
3. **View Applicants**: See who applied to your jobs
4. **Manage Applications**: Update application statuses
5. **Chat with Candidates**: Start real-time conversations

## API Testing with Swagger

Visit: http://localhost:5000/api-docs

1. Click "Authorize" button
2. Login via `/auth/login` endpoint
3. Copy the `accessToken` from response
4. Paste in Authorization: `Bearer YOUR_TOKEN`
5. Test all endpoints!

## Common Quick Fixes

### MongoDB Not Running?
```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
net start MongoDB
```

### Port Already in Use?
```bash
# Kill process on port 5000
npx kill-port 5000

# Kill process on port 3000
npx kill-port 3000
```

### Clear Everything and Restart
```bash
# Stop all processes (Ctrl+C)
# Clear node_modules
rm -rf node_modules apps/*/node_modules

# Reinstall
npm install

# Run again
npm run dev
```

## Project Structure at a Glance

```
job-portal-saas/
├── apps/
│   ├── backend/              # Nest.js API
│   │   ├── src/
│   │   │   ├── modules/      # Auth, Jobs, Users, etc.
│   │   │   ├── common/       # Guards, Decorators
│   │   │   └── main.ts
│   │   └── .env              # ← Configure this
│   │
│   └── frontend/             # Next.js 15
│       ├── src/
│       │   ├── app/          # Pages (App Router)
│       │   ├── components/   # UI Components
│       │   ├── store/        # Zustand State
│       │   └── lib/          # Utilities
│       └── .env.local        # ← Configure this
│
├── package.json              # Root package
├── turbo.json               # Monorepo config
└── README.md                # Full documentation
```

## Available Scripts

```bash
# Run everything
npm run dev

# Run backend only
npm run backend:dev

# Run frontend only
npm run frontend:dev

# Build for production
npm run build

# Format code
npm run format

# Lint code
npm run lint
```

## Demo Accounts (After Seeding)

Create these manually via registration:

**Job Seeker:**
- Email: `seeker@example.com`
- Password: Choose your own

**Employer:**
- Email: `employer@example.com`
- Password: Choose your own

**Admin:**
- Email: `admin@jobportal.com`
- Password: `Admin@123` (Change immediately!)

## Key Features to Test

### ✅ Authentication
- [x] Register with email
- [x] Login with credentials
- [x] Password reset flow
- [x] Token refresh

### ✅ Job Seeker Flow
- [x] Complete profile
- [x] Upload resume
- [x] Search jobs
- [x] Apply to jobs
- [x] Track applications
- [x] Chat with employers

### ✅ Employer Flow
- [x] Create company
- [x] Post jobs
- [x] View applicants
- [x] Manage applications
- [x] Schedule interviews
- [x] Chat with candidates

### ✅ Real-time Features
- [x] Socket.io connection
- [x] Real-time messaging
- [x] Typing indicators
- [x] Online status

### ✅ Subscription (Requires Stripe Setup)
- [x] View plans
- [x] Subscribe to plan
- [x] Manage subscription
- [x] Cancel subscription

## Next Steps

1. ✅ **Read SETUP.md** for detailed setup instructions
2. ✅ **Read FEATURES.md** to see all available features
3. ✅ **Read DEPLOYMENT.md** when ready to deploy
4. ✅ Customize theme colors in `tailwind.config.ts`
5. ✅ Add your branding and logo
6. ✅ Configure real email with Gmail App Password
7. ✅ Setup Stripe for payments
8. ✅ Deploy to production!

## Need Help?

- **Setup Issues**: See SETUP.md
- **API Questions**: Visit http://localhost:5000/api-docs
- **Deployment**: Read DEPLOYMENT.md
- **Features**: Check FEATURES.md
- **Bugs**: Open a GitHub issue

## Pro Tips 💡

1. **Use Swagger**: Test all APIs at `/api-docs`
2. **Check Console**: Both frontend and backend log useful info
3. **MongoDB Compass**: Visual tool to inspect your database
4. **Thunder Client**: VS Code extension for API testing
5. **React DevTools**: Inspect Zustand state and component tree

## Performance Tips

- Backend auto-refreshes on changes
- Frontend has Fast Refresh enabled
- First load might be slower (building)
- MongoDB indexes speed up queries
- Socket.io maintains persistent connections

## Security Reminders

- 🔒 Never commit `.env` files
- 🔒 Use strong JWT secrets (32+ characters)
- 🔒 Change default admin password
- 🔒 Use HTTPS in production
- 🔒 Keep dependencies updated

## Troubleshooting One-Liners

```bash
# Clear all caches
npm run clean && npm install

# Reset database (careful!)
mongosh job-portal --eval "db.dropDatabase()"

# Check what's running on ports
lsof -i :5000
lsof -i :3000

# View backend logs
cd apps/backend && npm run dev

# View frontend logs
cd apps/frontend && npm run dev
```

## Success Indicators

You're all set when you see:

**Backend Terminal:**
```
🚀 Server is running!
🔉 Listening on port 5000
📚 API Documentation: http://localhost:5000/api-docs
```

**Frontend Terminal:**
```
✓ Ready in Xms
○ Local:   http://localhost:3000
```

**Browser:**
- Homepage loads correctly
- Dark/Light mode toggle works
- No console errors

## What's Next?

Now that everything is running:

1. Explore the codebase
2. Make your first changes
3. Test all features
4. Customize the design
5. Add your own features
6. Deploy to production

**Happy coding! 🚀**

---

*Built with ❤️ using Next.js 15, Nest.js, MongoDB, Stripe, and Socket.io*

