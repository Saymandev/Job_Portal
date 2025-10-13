@echo off
echo.
echo ╔════════════════════════════════════════╗
echo ║  🚀 Job Portal SaaS - Quick Launcher  ║
echo ╚════════════════════════════════════════╝
echo.

REM Check if .env files exist
if not exist "apps\backend\.env" (
  echo ⚠️  Backend .env file not found!
  echo.
  echo 📝 Running setup script first...
  call setup.bat
  echo.
)

if not exist "apps\frontend\.env.local" (
  echo ⚠️  Frontend .env.local file not found!
  echo.
  echo 📝 Running setup script first...
  call setup.bat
  echo.
)

echo 🔍 Checking MongoDB...
sc query MongoDB | find "RUNNING" >nul
if errorlevel 1 (
  echo 📦 Starting MongoDB service...
  net start MongoDB
  if errorlevel 1 (
    echo.
    echo ⚠️  MongoDB service not found!
    echo.
    echo 💡 Options:
    echo    1. Install MongoDB: https://www.mongodb.com/try/download/community
    echo    2. Use MongoDB Atlas and update MONGODB_URI in .env
    echo.
    pause
    exit /b 1
  )
  echo ✅ MongoDB started!
) else (
  echo ✅ MongoDB is already running
)

echo.
echo 🚀 Starting Job Portal...
echo.
echo 📍 Frontend will be at: http://localhost:3000
echo 📍 Backend API at: http://localhost:5000
echo 📍 API Docs at: http://localhost:5000/api-docs
echo.
echo Press Ctrl+C to stop the servers
echo.

npm run dev

