# Windows Setup Guide

## Step-by-Step Setup for Windows

### 1. Create Backend Environment File

Create a new file: `apps\backend\.env`

Copy and paste this content:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/job_portal

# JWT Configuration
JWT_SECRET=job_portal_secret_key_change_this_in_production_2024
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=job_portal_refresh_secret_key_change_this_2024
JWT_REFRESH_EXPIRES_IN=7d

# Frontend
FRONTEND_URL=http://localhost:3000

# Admin
ADMIN_EMAIL=admin@jobportal.com
ADMIN_PASSWORD=Admin@123

# Email (Gmail) - Your credentials are already here!
EMAIL_SERVICE=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=devrabbi255@gmail.com
EMAIL_PASSWORD=zfdvjhgifahdupmo
MAIL_FROM=noreply@jobportal.com

# Cloudinary (File Storage) - Your credentials
CLOUDINARY_CLOUD_NAME=dy9yjhmex
CLOUDINARY_API_KEY=772254686166278
CLOUDINARY_API_SECRET=Wshh1KCt4Lf-LYftukpHCEGGico

# Stripe - Your test credentials
STRIPE_SECRET_KEY=sk_test_51SGfaGEXxPt5mNMca5wRusDVQbmu69TMHZqMBXSEXMrZuAOmxFBcSqTKqOe0KrFc9Hlv50Gn5VcgpHJUSIToj35a00wt45MA5m
STRIPE_PUBLISHABLE_KEY=pk_test_51SGfaGEXxPt5mNMcBDOzepM5RBnqFfrUQUQfTkGGoSkmjbDoFGzht2OEzIFYS7pPecn1bFgU5YIBKFej2VmicggG00yoFZAuXx
STRIPE_WEBHOOK_SECRET=whsec_dummy_for_local_testing
STRIPE_PRICE_ID_BASIC=price_basic_plan_id
STRIPE_PRICE_ID_PRO=price_pro_plan_id
STRIPE_PRICE_ID_ENTERPRISE=price_enterprise_plan_id

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_DEST=./uploads
```

### 2. Create Frontend Environment File

Create a new file: `apps\frontend\.env.local`

Copy and paste this content:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51SGfaGEXxPt5mNMcBDOzepM5RBnqFfrUQUQfTkGGoSkmjbDoFGzht2OEzIFYS7pPecn1bFgU5YIBKFej2VmicggG00yoFZAuXx
```

### 3. Install MongoDB (if not installed)

**Option A: Install MongoDB Community Edition**

1. Download from: https://www.mongodb.com/try/download/community
2. Run the installer
3. Choose "Complete" installation
4. Install as a Windows Service
5. Start MongoDB:
   ```cmd
   net start MongoDB
   ```

**Option B: Use MongoDB Atlas (Easier!)**

1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account and cluster
3. Get connection string
4. Replace `MONGODB_URI` in `.env` with your Atlas connection string

### 4. Install Dependencies

```bash
npm install
```

### 5. Run the Application

```bash
npm run dev
```

## ✅ Verify Everything Works

Open these URLs:

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Docs: http://localhost:5000/api-docs

## 🎯 What's Already Configured

✅ **Gmail SMTP** - Your real Gmail is configured! Emails will actually send!  
✅ **Cloudinary** - File uploads will go to cloud storage  
✅ **Stripe** - Payment system ready (test mode)  
✅ **MongoDB** - Just needs to be running  

## 🐛 Troubleshooting

### Port Already in Use?

```cmd
# Find what's using port 5000
netstat -ano | findstr :5000

# Kill the process (replace <PID> with actual number)
taskkill /PID <PID> /F

# Or for port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### MongoDB Not Connecting?

```cmd
# Check if MongoDB service is running
sc query MongoDB

# Start MongoDB
net start MongoDB

# Or use MongoDB Atlas connection string instead
```

### Module Not Found Error?

```cmd
# Clear everything and reinstall
rmdir /s /q node_modules
rmdir /s /q apps\backend\node_modules
rmdir /s /q apps\frontend\node_modules
npm install
```

## 📧 Test Email Functionality

Your Gmail is configured with an App Password, so emails will work immediately!

To test:
1. Register a new user
2. Check your email for verification link
3. Click to verify

## 💳 Setup Stripe Products (Optional)

1. Go to: https://dashboard.stripe.com/test/products
2. Create 3 products:
   - Basic: $29/month
   - Pro: $79/month
   - Enterprise: $199/month
3. Copy Price IDs and update in `.env`

## 🎉 You're Ready!

Everything is configured with your actual credentials:
- ✅ Real email sending via Gmail
- ✅ Real file uploads via Cloudinary
- ✅ Real payments via Stripe (test mode)

Just run `npm run dev` and start building! 🚀

---

**Need help?** Check QUICKSTART.md or SETUP.md for more details.

