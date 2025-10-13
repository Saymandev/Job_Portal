# 🚀 Getting Started - Job Portal SaaS

## ⚡ Quick Start (3 Minutes)

### Step 1: Create Environment Files

You need to create **2 files** with your credentials:

#### File 1: `apps/backend/.env`

Right-click on `apps/backend` folder → New File → Name it `.env`

Then paste this (your actual credentials are included!):

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/job_portal
JWT_SECRET=job_portal_secret_key_change_this_in_production_2024
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=job_portal_refresh_secret_key_change_this_2024
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
ADMIN_EMAIL=admin@jobportal.com
ADMIN_PASSWORD=Admin@123
EMAIL_SERVICE=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=devrabbi255@gmail.com
EMAIL_PASSWORD=zfdvjhgifahdupmo
MAIL_FROM=noreply@jobportal.com
CLOUDINARY_CLOUD_NAME=dy9yjhmex
CLOUDINARY_API_KEY=772254686166278
CLOUDINARY_API_SECRET=Wshh1KCt4Lf-LYftukpHCEGGico
STRIPE_SECRET_KEY=sk_test_51SGfaGEXxPt5mNMca5wRusDVQbmu69TMHZqMBXSEXMrZuAOmxFBcSqTKqOe0KrFc9Hlv50Gn5VcgpHJUSIToj35a00wt45MA5m
STRIPE_PUBLISHABLE_KEY=pk_test_51SGfaGEXxPt5mNMcBDOzepM5RBnqFfrUQUQfTkGGoSkmjbDoFGzht2OEzIFYS7pPecn1bFgU5YIBKFej2VmicggG00yoFZAuXx
STRIPE_WEBHOOK_SECRET=whsec_temp
STRIPE_PRICE_ID_BASIC=price_basic
STRIPE_PRICE_ID_PRO=price_pro
STRIPE_PRICE_ID_ENTERPRISE=price_enterprise
MAX_FILE_SIZE=5242880
UPLOAD_DEST=./uploads
```

#### File 2: `apps/frontend/.env.local`

Right-click on `apps/frontend` folder → New File → Name it `.env.local`

Then paste this:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51SGfaGEXxPt5mNMcBDOzepM5RBnqFfrUQUQfTkGGoSkmjbDoFGzht2OEzIFYS7pPecn1bFgU5YIBKFej2VmicggG00yoFZAuXx
```

---

### Step 2: Make Sure MongoDB is Running

**Option A - If MongoDB is installed locally:**
```bash
net start MongoDB
```

**Option B - Use MongoDB Atlas (Recommended):**
- Your current `MONGODB_URI` points to localhost
- If you prefer cloud, get connection string from MongoDB Atlas
- Update the `MONGODB_URI` in `.env`

---

### Step 3: Run the Application

```bash
npm run dev
```

**Wait for:**
```
✓ Ready on http://localhost:3000
🚀 Server is running on port 5000
```

---

## 🎉 Success! Access Your App

- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:5000/api-docs
- **Backend**: http://localhost:5000

---

## 🧪 Test Everything

### 1. Register Your First User
- Go to http://localhost:3000/register
- Choose "Find Jobs" (Job Seeker) or "Hire Talent" (Employer)
- Fill the form and register
- **Check your email** - You'll get a REAL verification email! 📧

### 2. Login
- Use your credentials
- Access your dashboard

### 3. Test Job Features
- **As Job Seeker**: Browse jobs, apply, track applications
- **As Employer**: Create company, post jobs, manage applicants

### 4. Test Admin Panel
- Login with: `admin@jobportal.com` / `Admin@123`
- View analytics dashboard

---

## ✨ What's Working Out of the Box

✅ **Real Email Sending** - Your Gmail is configured!  
✅ **Cloud File Uploads** - Cloudinary is ready!  
✅ **Stripe Payments** - Test mode active!  
✅ **Real-time Chat** - Socket.io connected!  
✅ **JWT Authentication** - Secure login system!  
✅ **Dark/Light Mode** - Beautiful UI!  

---

## 📊 Your Credentials Are Active

🟢 **Gmail**: devrabbi255@gmail.com  
🟢 **Cloudinary**: dy9yjhmex cloud  
🟢 **Stripe**: Test keys configured  
🟢 **MongoDB**: localhost:27017  

---

## 🐛 Quick Troubleshooting

### MongoDB Not Running?
```bash
# Start MongoDB
net start MongoDB

# Check status
sc query MongoDB
```

### Port Already in Use?
```bash
# Kill port 5000
netstat -ano | findstr :5000
taskkill /PID <number> /F

# Kill port 3000
netstat -ano | findstr :3000
taskkill /PID <number> /F
```

### Dependencies Issue?
```bash
npm install
```

---

## 📚 Full Documentation

- **START_HERE.md** ← You are here
- **WINDOWS_SETUP.md** - Windows-specific guide
- **QUICKSTART.md** - 5-minute setup
- **SETUP.md** - Detailed setup guide
- **FEATURES.md** - All features (300+)
- **DEPLOYMENT.md** - Production deployment
- **ARCHITECTURE.md** - Technical architecture

---

## 🎯 What You Built

A **complete Job Portal SaaS** with:

### Backend (Nest.js)
- ✅ Authentication & Authorization
- ✅ User Management
- ✅ Job Listings (CRUD + Search)
- ✅ Application System
- ✅ Real-time Chat (Socket.io)
- ✅ Stripe Subscriptions
- ✅ Email Notifications
- ✅ Admin Dashboard
- ✅ Cron Jobs
- ✅ File Uploads (Cloudinary)
- ✅ API Documentation (Swagger)

### Frontend (Next.js 15)
- ✅ Modern UI (Shadcn/UI)
- ✅ Dark/Light Themes
- ✅ Responsive Design
- ✅ Form Validation (Zod)
- ✅ State Management (Zustand)
- ✅ Real-time Updates
- ✅ SEO Optimized
- ✅ Accessible (ARIA)
- ✅ Animated (Framer Motion)

---

## 🎊 Ready to Code!

Just create those 2 `.env` files and run:

```bash
npm run dev
```

Then visit http://localhost:3000 and start exploring!

**You have everything you need to build and launch a production-ready Job Portal!** 🚀

---

*Questions? Check the documentation or run the setup.bat script for automatic configuration.*

