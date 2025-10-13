# 🎯 START HERE - Complete Setup in 3 Steps

## You're almost ready to run the Job Portal! Follow these 3 simple steps:

---

## ✅ Step 1: Create Backend Environment File

**Create this file**: `apps/backend/.env`

**Paste this exact content** (uses your actual credentials):

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

# Email (Gmail) - Your real credentials!
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

# Stripe - Your test keys
STRIPE_SECRET_KEY=sk_test_51SGfaGEXxPt5mNMca5wRusDVQbmu69TMHZqMBXSEXMrZuAOmxFBcSqTKqOe0KrFc9Hlv50Gn5VcgpHJUSIToj35a00wt45MA5m
STRIPE_PUBLISHABLE_KEY=pk_test_51SGfaGEXxPt5mNMcBDOzepM5RBnqFfrUQUQfTkGGoSkmjbDoFGzht2OEzIFYS7pPecn1bFgU5YIBKFej2VmicggG00yoFZAuXx
STRIPE_WEBHOOK_SECRET=whsec_temp
STRIPE_PRICE_ID_BASIC=price_basic
STRIPE_PRICE_ID_PRO=price_pro
STRIPE_PRICE_ID_ENTERPRISE=price_enterprise

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_DEST=./uploads
```

---

## ✅ Step 2: Create Frontend Environment File

**Create this file**: `apps/frontend/.env.local`

**Paste this exact content**:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51SGfaGEXxPt5mNMcBDOzepM5RBnqFfrUQUQfTkGGoSkmjbDoFGzht2OEzIFYS7pPecn1bFgU5YIBKFej2VmicggG00yoFZAuXx
```

---

## ✅ Step 3: Run the Application

```bash
npm run dev
```

**That's it!** 🎉

---

## 🌐 Access Your Application

Once running, visit:

- **Homepage**: http://localhost:3000
- **API Documentation**: http://localhost:5000/api-docs
- **Backend Health**: http://localhost:5000

---

## 📝 What's Special About Your Setup

✅ **Real Email Integration**: Emails will actually send via your Gmail!  
✅ **Cloud File Storage**: Files upload to Cloudinary (no local storage mess)  
✅ **Stripe Payments**: Real payment processing (test mode)  
✅ **MongoDB**: Local database ready  

---

## ⚠️ Important: MongoDB Must Be Running

**Check if MongoDB is running:**
```bash
mongosh
```

**If MongoDB is not running:**
```bash
# Start MongoDB service
net start MongoDB
```

**Don't have MongoDB?**
- Use MongoDB Atlas (free cloud database)
- Update `MONGODB_URI` in `.env` with Atlas connection string

---

## 🎯 Test Your Setup

### 1. Register a New User
- Go to: http://localhost:3000/register
- Choose "Find Jobs" or "Hire Talent"
- Fill in the form
- **Check your email** - you'll get a real verification email!

### 2. Explore the API
- Go to: http://localhost:5000/api-docs
- Try the endpoints
- All documented with Swagger

### 3. Test Features
- Login to dashboard
- Browse jobs
- Post a job (if employer)
- Apply to jobs (if job seeker)

---

## 🚀 You're Ready!

Your Job Portal has:
- ✅ 11 backend modules
- ✅ Complete authentication
- ✅ Real-time chat
- ✅ Stripe payments
- ✅ Email notifications (LIVE!)
- ✅ Cloud file storage
- ✅ Beautiful UI with dark mode
- ✅ Mobile responsive
- ✅ Production-ready architecture

---

## 📚 Learn More

- **QUICKSTART.md** - Quick reference
- **FEATURES.md** - All 300+ features
- **DEPLOYMENT.md** - Deploy to production
- **ARCHITECTURE.md** - How it works

---

## 🆘 Need Help?

**Issue: Port in use**
```bash
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

**Issue: MongoDB connection**
```bash
net start MongoDB
```

**Issue: Module not found**
```bash
npm install
```

---

**Happy Coding! 🎉**

*Everything is configured with your real credentials - just create the .env files and run!*

