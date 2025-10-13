# Environment Variables Setup

## Quick Setup for Your Configuration

Based on your credentials, here's how to set up the environment files:

### 1. Backend Environment (`apps/backend/.env`)

Create this file with your exact configuration:

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

# Email (Gmail) - Your credentials
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

# Stripe - Your credentials
STRIPE_SECRET_KEY=sk_test_51SGfaGEXxPt5mNMca5wRusDVQbmu69TMHZqMBXSEXMrZuAOmxFBcSqTKqOe0KrFc9Hlv50Gn5VcgpHJUSIToj35a00wt45MA5m
STRIPE_PUBLISHABLE_KEY=pk_test_51SGfaGEXxPt5mNMcBDOzepM5RBnqFfrUQUQfTkGGoSkmjbDoFGzht2OEzIFYS7pPecn1bFgU5YIBKFej2VmicggG00yoFZAuXx
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_from_stripe_cli

# Stripe Price IDs (create these in Stripe Dashboard)
STRIPE_PRICE_ID_BASIC=price_basic_plan_id
STRIPE_PRICE_ID_PRO=price_pro_plan_id
STRIPE_PRICE_ID_ENTERPRISE=price_enterprise_plan_id

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_DEST=./uploads
```

### 2. Frontend Environment (`apps/frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51SGfaGEXxPt5mNMcBDOzepM5RBnqFfrUQUQfTkGGoSkmjbDoFGzht2OEzIFYS7pPecn1bFgU5YIBKFej2VmicggG00yoFZAuXx
```

## 🔐 Important Security Notes

1. **Never commit these .env files to Git** (they're already in .gitignore)
2. **Change JWT secrets in production** - use long random strings
3. **Gmail App Password** is already configured - you're good to go!
4. **Cloudinary** is set up for cloud file storage (resumes, avatars, logos)
5. **Stripe** is in test mode - perfect for development

## ✅ What's Already Configured

- ✅ **Email**: Gmail SMTP with your credentials
- ✅ **File Storage**: Cloudinary for cloud uploads
- ✅ **Payments**: Stripe test mode
- ✅ **Database**: MongoDB local instance

## 🚀 Next Step

After creating these files, just run:

```bash
npm run dev
```

## 📝 Stripe Webhook Setup (Optional for now)

To test Stripe webhooks locally:

```bash
# Install Stripe CLI
# Then run:
stripe listen --forward-to localhost:5000/api/subscriptions/webhook

# Copy the webhook signing secret to your .env file
```

## 🎯 Create Stripe Products (When Ready)

1. Go to Stripe Dashboard: https://dashboard.stripe.com/test/products
2. Create 3 products:
   - **Basic Plan** - $29/month
   - **Pro Plan** - $79/month  
   - **Enterprise Plan** - $199/month
3. Copy the Price IDs to your `.env` file

## ✨ You're All Set!

Your environment is ready with:
- ✅ Real Gmail integration (emails will actually send!)
- ✅ Cloudinary for file uploads (no local storage needed)
- ✅ Stripe for payments
- ✅ MongoDB for database

Just create the two `.env` files and run `npm run dev`! 🎉

