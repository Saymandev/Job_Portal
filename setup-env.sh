#!/bin/bash

# Environment Variables Setup Script
# This script helps you set up environment variables for both Render and Vercel

echo "🚀 Job Portal Deployment Environment Setup"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to prompt for input
prompt_input() {
    local prompt="$1"
    local var_name="$2"
    local is_secret="$3"
    
    if [ "$is_secret" = "true" ]; then
        read -s -p "$prompt: " value
        echo
    else
        read -p "$prompt: " value
    fi
    
    echo "$var_name=$value"
}

echo -e "${YELLOW}📝 Backend Environment Variables for Render${NC}"
echo "Copy these to your Render service environment variables:"
echo ""

# Required variables
echo "# Required Variables"
prompt_input "MongoDB URI (mongodb+srv://...)" "MONGODB_URI" "true"
prompt_input "JWT Secret (generate a strong random string)" "JWT_SECRET" "true"
prompt_input "JWT Refresh Secret (generate a strong random string)" "JWT_REFRESH_SECRET" "true"
prompt_input "Frontend URL (https://your-app.vercel.app)" "FRONTEND_URL" "false"

echo ""
echo "# Optional Variables (add if you're using these services)"
echo "STRIPE_SECRET_KEY=sk_test_..."
echo "STRIPE_PUBLISHABLE_KEY=pk_test_..."
echo "STRIPE_WEBHOOK_SECRET=whsec_..."
echo "MAIL_USER=your-email@gmail.com"
echo "MAIL_PASSWORD=your-app-password"
echo "MAIL_HOST=smtp.gmail.com"
echo "MAIL_PORT=587"
echo "MAIL_SECURE=false"
echo "CLOUDINARY_CLOUD_NAME=your-cloud-name"
echo "CLOUDINARY_API_KEY=your-api-key"
echo "CLOUDINARY_API_SECRET=your-api-secret"

echo ""
echo -e "${YELLOW}📝 Frontend Environment Variables for Vercel${NC}"
echo "Copy this to your Vercel project environment variables:"
echo ""

prompt_input "Backend API URL (https://your-backend.onrender.com/api)" "NEXT_PUBLIC_API_URL" "false"

echo ""
echo -e "${GREEN}✅ Environment variables collected!${NC}"
echo ""
echo "Next steps:"
echo "1. Deploy backend to Render with the environment variables above"
echo "2. Deploy frontend to Vercel with the environment variable above"
echo "3. Update FRONTEND_URL in Render with your actual Vercel URL"
echo "4. Test your deployment!"
echo ""
echo -e "${YELLOW}📚 For detailed instructions, see DEPLOYMENT_GUIDE.md${NC}"
