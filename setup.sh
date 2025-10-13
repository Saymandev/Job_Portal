#!/bin/bash

echo "🚀 Job Portal SaaS - Quick Setup Script"
echo "========================================"
echo ""

# Check if .env files exist
if [ ! -f "apps/backend/.env" ]; then
  echo "📝 Creating backend .env file..."
  cat > apps/backend/.env << 'EOF'
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/job-portal
JWT_SECRET=super-secret-jwt-key-change-this-in-production-min-32-chars
JWT_REFRESH_SECRET=super-secret-refresh-key-change-this-in-production-min-32
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=test@example.com
MAIL_PASSWORD=test-password
MAIL_FROM=noreply@jobportal.com
STRIPE_SECRET_KEY=sk_test_dummy_key
STRIPE_WEBHOOK_SECRET=whsec_dummy_secret
STRIPE_PRICE_ID_BASIC=price_dummy_basic
STRIPE_PRICE_ID_PRO=price_dummy_pro
STRIPE_PRICE_ID_ENTERPRISE=price_dummy_enterprise
MAX_FILE_SIZE=5242880
UPLOAD_DEST=./uploads
EOF
  echo "✅ Backend .env created!"
else
  echo "✅ Backend .env already exists"
fi

if [ ! -f "apps/frontend/.env.local" ]; then
  echo "📝 Creating frontend .env.local file..."
  cat > apps/frontend/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy_key
EOF
  echo "✅ Frontend .env.local created!"
else
  echo "✅ Frontend .env.local already exists"
fi

# Create uploads directory
if [ ! -d "apps/backend/uploads" ]; then
  mkdir -p apps/backend/uploads
  echo "✅ Created uploads directory"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Make sure MongoDB is running (or use MongoDB Atlas)"
echo "2. Run: npm run dev"
echo "3. Visit: http://localhost:3000"
echo ""
echo "📚 Documentation:"
echo "- QUICKSTART.md - Quick start guide"
echo "- SETUP.md - Detailed setup"
echo "- FEATURES.md - All features"
echo ""

