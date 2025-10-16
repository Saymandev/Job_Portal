@echo off
REM Environment Variables Setup Script for Windows
REM This script helps you set up environment variables for both Render and Vercel

echo 🚀 Job Portal Deployment Environment Setup
echo ==========================================

echo.
echo 📝 Backend Environment Variables for Render
echo Copy these to your Render service environment variables:
echo.

REM Required variables
echo # Required Variables
set /p MONGODB_URI="MongoDB URI (mongodb+srv://...): "
set /p JWT_SECRET="JWT Secret (generate a strong random string): "
set /p JWT_REFRESH_SECRET="JWT Refresh Secret (generate a strong random string): "
set /p FRONTEND_URL="Frontend URL (https://your-app.vercel.app): "

echo.
echo MONGODB_URI=%MONGODB_URI%
echo JWT_SECRET=%JWT_SECRET%
echo JWT_REFRESH_SECRET=%JWT_REFRESH_SECRET%
echo FRONTEND_URL=%FRONTEND_URL%

echo.
echo # Optional Variables (add if you're using these services)
echo STRIPE_SECRET_KEY=sk_test_...
echo STRIPE_PUBLISHABLE_KEY=pk_test_...
echo STRIPE_WEBHOOK_SECRET=whsec_...
echo MAIL_USER=your-email@gmail.com
echo MAIL_PASSWORD=your-app-password
echo MAIL_HOST=smtp.gmail.com
echo MAIL_PORT=587
echo MAIL_SECURE=false
echo CLOUDINARY_CLOUD_NAME=your-cloud-name
echo CLOUDINARY_API_KEY=your-api-key
echo CLOUDINARY_API_SECRET=your-api-secret

echo.
echo 📝 Frontend Environment Variables for Vercel
echo Copy this to your Vercel project environment variables:
echo.

set /p NEXT_PUBLIC_API_URL="Backend API URL (https://your-backend.onrender.com/api): "
echo NEXT_PUBLIC_API_URL=%NEXT_PUBLIC_API_URL%

echo.
echo ✅ Environment variables collected!
echo.
echo Next steps:
echo 1. Deploy backend to Render with the environment variables above
echo 2. Deploy frontend to Vercel with the environment variable above
echo 3. Update FRONTEND_URL in Render with your actual Vercel URL
echo 4. Test your deployment!
echo.
echo 📚 For detailed instructions, see DEPLOYMENT_GUIDE.md

pause
