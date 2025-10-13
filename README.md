# 🚀 Job Portal SaaS Platform

A modern, scalable Job Portal SaaS platform built with Next.js 15, Nest.js, MongoDB, and Stripe.

## ⚡ **Quick Start** → Read **[GETTING_STARTED.md](GETTING_STARTED.md)** or **[START_HERE.md](START_HERE.md)**

## 📋 Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)

## ✨ Features

### 👔 Job Seeker Features
- ✅ Complete profile management with resume upload
- 🔍 Advanced job search with filters (location, salary, type)
- 📝 Easy job application with status tracking
- 🔖 Bookmark favorite jobs
- 💬 Real-time chat with employers
- 📧 Email notifications for application updates

### 🏢 Employer Features
- 🏪 Company profile management
- 📋 Post, edit, and delete job listings
- 👥 View and manage applicants
- 📅 Interview scheduling
- 💬 Real-time chat with candidates
- 💳 Subscription management (Stripe)

### 👨‍💼 Admin Features
- 📊 Comprehensive analytics dashboard
- 👥 User and company management
- 💰 Payment and subscription tracking
- 🔄 Automated job expiry via cron jobs
- 📈 Revenue and usage reports

### 🎨 System Features
- 🌓 Dark/Light mode toggle
- 📱 Fully responsive mobile-first design
- ⚡ Lightning-fast performance with ISR
- 🔒 JWT authentication with refresh tokens
- 🎭 Beautiful UI with Shadcn/UI components
- ♿ WCAG-compliant accessibility
- 🚀 SEO optimized for search engines

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **UI Components**: Shadcn/UI
- **Animations**: Framer Motion
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Forms**: React Hook Form + Zod

### Backend
- **Framework**: Nest.js
- **Language**: TypeScript
- **Database**: MongoDB + Mongoose
- **Authentication**: JWT + Refresh Tokens
- **Real-time**: Socket.io
- **Email**: Nodemailer
- **Payments**: Stripe
- **Task Scheduling**: Cron Jobs
- **Validation**: Class Validator

### DevOps
- **Monorepo**: TurboRepo
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Render/Railway
- **Database**: MongoDB Atlas
- **File Storage**: AWS S3 (or local)

## 📁 Project Structure

```
job-portal-saas/
├── apps/
│   ├── backend/          # Nest.js Backend API
│   │   ├── src/
│   │   │   ├── modules/  # Feature modules
│   │   │   ├── common/   # Shared utilities
│   │   │   ├── config/   # Configuration
│   │   │   └── main.ts   # Entry point
│   │   └── package.json
│   └── frontend/         # Next.js Frontend
│       ├── src/
│       │   ├── app/      # App Router pages
│       │   ├── components/ # React components
│       │   ├── lib/      # Utilities
│       │   └── store/    # Zustand stores
│       └── package.json
├── packages/             # Shared packages
│   └── typescript-config/
├── turbo.json           # TurboRepo config
└── package.json         # Root package.json
```

## 🚀 Getting Started

### ⚡ Fastest Way (Windows)

**Just run this:**
```bash
setup.bat
npm run dev
```

The script automatically creates `.env` files with your credentials!

### 📖 Manual Setup

See **[GETTING_STARTED.md](GETTING_STARTED.md)** for step-by-step instructions.

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- MongoDB (local or Atlas)
- Stripe Account (you have test keys!)
- Gmail with App Password (already configured!)

### Quick Installation

1. **Install dependencies**
```bash
npm install
```

2. **Run setup script** (Windows)
```bash
setup.bat
```

3. **Start MongoDB**
```bash
net start MongoDB
```

4. **Run the app**
```bash
npm run dev
```

5. **Visit** http://localhost:3000

### Environment Variables (Automated)

**Backend** (`apps/backend/.env`):
```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/job-portal

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_REFRESH_EXPIRES_IN=7d

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_BASIC=price_...
STRIPE_PRICE_ID_PRO=price_...

# Email
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=noreply@jobportal.com

# Frontend URL
FRONTEND_URL=http://localhost:3000

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_DEST=./uploads
```

**Frontend** (`apps/frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

4. **Run the development servers**

```bash
# Run both frontend and backend
npm run dev

# Or run individually
npm run backend:dev
npm run frontend:dev
```

5. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Docs: http://localhost:5000/api-docs

## 🔐 Default Admin Account

After first run, use these credentials to access the admin panel:
- Email: `admin@jobportal.com`
- Password: `Admin@123`

**⚠️ Important**: Change the admin password immediately in production!

## 📚 Environment Variables

### Backend Required Variables
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `JWT_REFRESH_SECRET`: Secret key for refresh tokens
- `STRIPE_SECRET_KEY`: Stripe secret API key
- `MAIL_USER`: Gmail account for sending emails
- `MAIL_PASSWORD`: Gmail app password

### Frontend Required Variables
- `NEXT_PUBLIC_API_URL`: Backend API endpoint
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Stripe publishable key

## 🚢 Deployment

### Frontend (Vercel)
1. Push code to GitHub
2. Import project in Vercel
3. Set root directory to `apps/frontend`
4. Add environment variables
5. Deploy

### Backend (Render/Railway)
1. Create new Web Service
2. Set root directory to `apps/backend`
3. Build command: `npm install && npm run build`
4. Start command: `npm run start:prod`
5. Add environment variables
6. Deploy

## 📖 API Documentation

Once the backend is running, visit `http://localhost:5000/api-docs` for interactive Swagger documentation.

### Key Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user

#### Jobs
- `GET /api/jobs` - Get all jobs (with filters)
- `POST /api/jobs` - Create job (Employer only)
- `GET /api/jobs/:id` - Get job details
- `PATCH /api/jobs/:id` - Update job
- `DELETE /api/jobs/:id` - Delete job

#### Applications
- `POST /api/applications` - Apply for job
- `GET /api/applications` - Get user's applications
- `PATCH /api/applications/:id` - Update application status

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Nest.js team for the robust backend framework
- Shadcn for beautiful UI components
- All open-source contributors

---

Built with ❤️ by [Your Name]

