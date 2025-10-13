@echo off
echo 🚀 Job Portal SaaS - Quick Setup Script
echo ========================================
echo.

REM Check if backend .env exists
if not exist "apps\backend\.env" (
  echo 📝 Creating backend .env file with your credentials...
  (
    echo NODE_ENV=development
    echo PORT=5000
    echo MONGODB_URI=mongodb://localhost:27017/job_portal
    echo JWT_SECRET=job_portal_secret_key_change_this_in_production_2024
    echo JWT_EXPIRES_IN=7d
    echo JWT_REFRESH_SECRET=job_portal_refresh_secret_key_change_this_2024
    echo JWT_REFRESH_EXPIRES_IN=7d
    echo FRONTEND_URL=http://localhost:3000
    echo ADMIN_EMAIL=admin@jobportal.com
    echo ADMIN_PASSWORD=Admin@123
    echo EMAIL_SERVICE=gmail
    echo EMAIL_HOST=smtp.gmail.com
    echo EMAIL_PORT=587
    echo EMAIL_USER=devrabbi255@gmail.com
    echo EMAIL_PASSWORD=zfdvjhgifahdupmo
    echo MAIL_FROM=noreply@jobportal.com
    echo CLOUDINARY_CLOUD_NAME=dy9yjhmex
    echo CLOUDINARY_API_KEY=772254686166278
    echo CLOUDINARY_API_SECRET=Wshh1KCt4Lf-LYftukpHCEGGico
    echo STRIPE_SECRET_KEY=sk_test_51SGfaGEXxPt5mNMca5wRusDVQbmu69TMHZqMBXSEXMrZuAOmxFBcSqTKqOe0KrFc9Hlv50Gn5VcgpHJUSIToj35a00wt45MA5m
    echo STRIPE_PUBLISHABLE_KEY=pk_test_51SGfaGEXxPt5mNMcBDOzepM5RBnqFfrUQUQfTkGGoSkmjbDoFGzht2OEzIFYS7pPecn1bFgU5YIBKFej2VmicggG00yoFZAuXx
    echo STRIPE_WEBHOOK_SECRET=whsec_temp
    echo STRIPE_PRICE_ID_BASIC=price_basic
    echo STRIPE_PRICE_ID_PRO=price_pro
    echo STRIPE_PRICE_ID_ENTERPRISE=price_enterprise
    echo MAX_FILE_SIZE=5242880
    echo UPLOAD_DEST=./uploads
  ) > apps\backend\.env
  echo ✅ Backend .env created with your actual credentials!
) else (
  echo ✅ Backend .env already exists
)

REM Check if frontend .env.local exists
if not exist "apps\frontend\.env.local" (
  echo 📝 Creating frontend .env.local file...
  (
    echo NEXT_PUBLIC_API_URL=http://localhost:5000/api
    echo NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
    echo NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51SGfaGEXxPt5mNMcBDOzepM5RBnqFfrUQUQfTkGGoSkmjbDoFGzht2OEzIFYS7pPecn1bFgU5YIBKFej2VmicggG00yoFZAuXx
  ) > apps\frontend\.env.local
  echo ✅ Frontend .env.local created with Stripe key!
) else (
  echo ✅ Frontend .env.local already exists
)

REM Create uploads directory
if not exist "apps\backend\uploads" (
  mkdir apps\backend\uploads
  echo ✅ Created uploads directory
)

echo.
echo 🎉 Setup complete!
echo.
echo ✨ Your credentials are configured:
echo    ✅ Gmail: devrabbi255@gmail.com (Real emails will send!)
echo    ✅ Cloudinary: dy9yjhmex (Cloud file storage!)
echo    ✅ Stripe: Test mode (Payments ready!)
echo    ✅ MongoDB: localhost:27017/job_portal
echo.
echo 📋 Next steps:
echo 1. Make sure MongoDB is running: net start MongoDB
echo 2. Run the app: npm run dev
echo 3. Visit: http://localhost:3000
echo 4. Check API docs: http://localhost:5000/api-docs
echo.
echo 📧 Test Email: Register a user and check your inbox!
echo 📁 Files upload to Cloudinary automatically
echo 💳 Use test card: 4242 4242 4242 4242 for Stripe
echo.
echo 📚 Read GETTING_STARTED.md for more details
echo.
pause

