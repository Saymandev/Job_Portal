# System Architecture

## Overview

The Job Portal SaaS is built using a modern, scalable monorepo architecture with clear separation between frontend and backend.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │   Browser  │  │   Mobile   │  │   Tablet   │            │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘            │
└────────┼────────────────┼────────────────┼──────────────────┘
         │                │                │
         └────────────────┴────────────────┘
                          │
         ┌────────────────▼────────────────┐
         │      Next.js 15 Frontend        │
         │  ┌──────────────────────────┐   │
         │  │    App Router (Pages)     │   │
         │  ├──────────────────────────┤   │
         │  │   Shadcn/UI Components   │   │
         │  ├──────────────────────────┤   │
         │  │  Zustand State Management│   │
         │  ├──────────────────────────┤   │
         │  │   Axios API Client       │   │
         │  └──────────────────────────┘   │
         └────────────────┬────────────────┘
                          │
         ┌────────────────▼────────────────┐
         │      API Gateway (Nginx)        │
         └────────────────┬────────────────┘
                          │
         ┌────────────────▼────────────────┐
         │      Nest.js Backend API        │
         │  ┌──────────────────────────┐   │
         │  │   Controllers (REST)     │   │
         │  ├──────────────────────────┤   │
         │  │   Services (Business)    │   │
         │  ├──────────────────────────┤   │
         │  │   Guards & Middleware    │   │
         │  ├──────────────────────────┤   │
         │  │   WebSocket Gateway      │   │
         │  └──────────────────────────┘   │
         └────────────────┬────────────────┘
                          │
         ┌────────────────▼────────────────┐
         │      Data Layer                  │
         │  ┌──────────┐  ┌──────────┐     │
         │  │ MongoDB  │  │  Redis   │     │
         │  │ (Primary)│  │ (Cache)  │     │
         │  └──────────┘  └──────────┘     │
         └─────────────────────────────────┘
                          │
         ┌────────────────▼────────────────┐
         │   External Services              │
         │  ┌─────────┐  ┌────────────┐    │
         │  │ Stripe  │  │ Nodemailer │    │
         │  └─────────┘  └────────────┘    │
         └─────────────────────────────────┘
```

## Technology Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: TailwindCSS + Shadcn/UI
- **State**: Zustand
- **HTTP**: Axios
- **Real-time**: Socket.io Client
- **Forms**: React Hook Form + Zod
- **Animations**: Framer Motion

### Backend
- **Framework**: Nest.js
- **Language**: TypeScript
- **Database**: MongoDB + Mongoose
- **Authentication**: Passport JWT
- **Real-time**: Socket.io
- **Email**: Nodemailer
- **Payments**: Stripe
- **Jobs**: @nestjs/schedule (Cron)
- **Validation**: Class Validator
- **Documentation**: Swagger

### Infrastructure
- **Monorepo**: TurboRepo
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Render/Railway
- **Database**: MongoDB Atlas
- **CDN**: Cloudflare (optional)
- **File Storage**: Local/AWS S3

## Module Architecture

### Backend Modules

```
src/
├── modules/
│   ├── auth/                 # Authentication & Authorization
│   │   ├── dto/              # Data Transfer Objects
│   │   ├── guards/           # JWT Guards
│   │   ├── strategies/       # Passport Strategies
│   │   ├── auth.service.ts
│   │   ├── auth.controller.ts
│   │   └── auth.module.ts
│   │
│   ├── users/                # User Management
│   │   ├── schemas/          # Mongoose Schemas
│   │   ├── dto/
│   │   ├── users.service.ts
│   │   ├── users.controller.ts
│   │   └── users.module.ts
│   │
│   ├── jobs/                 # Job Management
│   │   ├── schemas/
│   │   ├── dto/
│   │   ├── jobs.service.ts
│   │   ├── jobs.controller.ts
│   │   └── jobs.module.ts
│   │
│   ├── applications/         # Application System
│   ├── companies/            # Company Profiles
│   ├── subscriptions/        # Stripe Integration
│   ├── chat/                 # Socket.io Chat
│   ├── mail/                 # Email Service
│   ├── upload/               # File Uploads
│   ├── admin/                # Admin Dashboard
│   └── cron/                 # Scheduled Tasks
│
├── common/                   # Shared Resources
│   ├── decorators/           # Custom Decorators
│   ├── filters/              # Exception Filters
│   ├── guards/               # Authorization Guards
│   ├── interceptors/         # Response Interceptors
│   ├── pipes/                # Validation Pipes
│   └── interfaces/           # Shared Interfaces
│
├── config/                   # Configuration
│   └── database.config.ts
│
└── main.ts                   # Application Entry
```

### Frontend Structure

```
src/
├── app/                      # App Router Pages
│   ├── (auth)/               # Auth Group
│   │   ├── login/
│   │   ├── register/
│   │   └── layout.tsx
│   │
│   ├── dashboard/            # User Dashboard
│   ├── jobs/                 # Job Pages
│   ├── profile/              # Profile Pages
│   ├── admin/                # Admin Pages
│   │
│   ├── layout.tsx            # Root Layout
│   ├── page.tsx              # Homepage
│   └── globals.css           # Global Styles
│
├── components/               # React Components
│   ├── ui/                   # Shadcn Components
│   ├── forms/                # Form Components
│   ├── layouts/              # Layout Components
│   └── shared/               # Shared Components
│
├── store/                    # Zustand Stores
│   ├── auth-store.ts
│   ├── jobs-store.ts
│   └── chat-store.ts
│
├── lib/                      # Utilities
│   ├── api.ts                # Axios Instance
│   ├── socket.ts             # Socket.io Client
│   ├── utils.ts              # Helper Functions
│   └── validations.ts        # Zod Schemas
│
└── types/                    # TypeScript Types
    └── index.ts
```

## Data Flow

### Authentication Flow

```
1. User submits credentials
   ↓
2. Frontend validates with Zod
   ↓
3. POST /api/auth/login
   ↓
4. Backend validates with Class Validator
   ↓
5. Check credentials in MongoDB
   ↓
6. Generate JWT tokens
   ↓
7. Store refresh token in HTTP-only cookie
   ↓
8. Return access token to frontend
   ↓
9. Store in localStorage + Zustand
   ↓
10. Redirect to dashboard
```

### Job Application Flow

```
1. User clicks "Apply"
   ↓
2. Check authentication (JWT)
   ↓
3. Submit application data
   ↓
4. POST /api/applications
   ↓
5. Validate job exists & user eligible
   ↓
6. Create application in MongoDB
   ↓
7. Increment job application count
   ↓
8. Send confirmation email
   ↓
9. Emit Socket.io event to employer
   ↓
10. Update UI optimistically
```

### Real-time Chat Flow

```
1. User opens chat
   ↓
2. Connect to Socket.io server
   ↓
3. Emit "join" event with userId
   ↓
4. Join conversation room
   ↓
5. User types message
   ↓
6. Emit "sendMessage" event
   ↓
7. Save message to MongoDB
   ↓
8. Broadcast to conversation room
   ↓
9. Other user receives instantly
   ↓
10. Update UI in real-time
```

## Security Architecture

### Authentication Layers

```
┌─────────────────────────────────────────┐
│           User Request                   │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│     1. Rate Limiting (Throttler)        │
│        Max 10 requests/minute           │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│     2. JWT Authentication Guard         │
│        Verify access token              │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│     3. Role-Based Authorization         │
│        Check user permissions           │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│     4. Validation Pipe                  │
│        Validate input data              │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│     5. Business Logic                   │
│        Process request                  │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│     6. Response Interceptor             │
│        Format response                  │
└─────────────────────────────────────────┘
```

### Data Security

- **In Transit**: HTTPS/TLS 1.3
- **At Rest**: MongoDB encryption
- **Passwords**: Bcrypt hashing (10 rounds)
- **Tokens**: JWT with expiration
- **Cookies**: HTTP-only, Secure, SameSite
- **Files**: Type & size validation
- **Input**: Sanitization & validation

## Database Schema

### Core Collections

```javascript
// Users Collection
{
  _id: ObjectId,
  email: String (unique, indexed),
  password: String (hashed),
  fullName: String,
  role: Enum ['admin', 'employer', 'job_seeker'],
  isActive: Boolean (indexed),
  isEmailVerified: Boolean,
  avatar: String,
  resume: String,
  skills: [String],
  company: ObjectId (ref: Company),
  createdAt: Date,
  updatedAt: Date
}

// Jobs Collection
{
  _id: ObjectId,
  title: String (text indexed),
  description: String (text indexed),
  company: ObjectId (ref: Company, indexed),
  postedBy: ObjectId (ref: User, indexed),
  location: String,
  jobType: Enum,
  experienceLevel: Enum,
  salaryMin: Number,
  salaryMax: Number,
  skills: [String] (text indexed),
  status: Enum (indexed),
  applicationsCount: Number,
  viewsCount: Number,
  expiresAt: Date,
  createdAt: Date (indexed),
  updatedAt: Date
}

// Applications Collection
{
  _id: ObjectId,
  job: ObjectId (ref: Job, indexed),
  applicant: ObjectId (ref: User, indexed),
  company: ObjectId (ref: Company, indexed),
  status: Enum (indexed),
  resume: String,
  coverLetter: String,
  interviewDate: Date,
  notes: String,
  feedback: String,
  createdAt: Date (indexed),
  updatedAt: Date
}
```

### Indexes for Performance

```javascript
// User indexes
db.users.createIndex({ email: 1 });
db.users.createIndex({ role: 1 });
db.users.createIndex({ isActive: 1 });

// Job indexes
db.jobs.createIndex({ title: 'text', description: 'text', skills: 'text' });
db.jobs.createIndex({ company: 1 });
db.jobs.createIndex({ postedBy: 1 });
db.jobs.createIndex({ status: 1 });
db.jobs.createIndex({ createdAt: -1 });

// Application indexes
db.applications.createIndex({ job: 1, applicant: 1 }, { unique: true });
db.applications.createIndex({ applicant: 1 });
db.applications.createIndex({ company: 1 });
db.applications.createIndex({ status: 1 });
```

## API Architecture

### RESTful Endpoints

```
Authentication:
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me

Users:
GET    /api/users/profile
PUT    /api/users/profile
POST   /api/users/change-password
POST   /api/users/upload-resume
POST   /api/users/upload-avatar

Jobs:
GET    /api/jobs
GET    /api/jobs/:id
POST   /api/jobs
PUT    /api/jobs/:id
DELETE /api/jobs/:id
GET    /api/jobs/my-jobs

Applications:
GET    /api/applications
POST   /api/applications
GET    /api/applications/:id
PUT    /api/applications/:id/status
DELETE /api/applications/:id

Companies:
GET    /api/companies
GET    /api/companies/:id
POST   /api/companies
PUT    /api/companies/:id
DELETE /api/companies/:id

Subscriptions:
POST   /api/subscriptions/checkout
GET    /api/subscriptions/my-subscription
POST   /api/subscriptions/cancel
POST   /api/subscriptions/webhook

Chat:
GET    /api/chat/conversations
GET    /api/chat/conversations/:id
GET    /api/chat/conversations/:id/messages
POST   /api/chat/conversations
POST   /api/chat/conversations/:id/read

Admin:
GET    /api/admin/dashboard
GET    /api/admin/users
GET    /api/admin/jobs
GET    /api/admin/applications
GET    /api/admin/revenue
PUT    /api/admin/users/:id/toggle-status
```

### WebSocket Events

```javascript
// Client → Server
socket.emit('join', userId);
socket.emit('joinConversation', conversationId);
socket.emit('sendMessage', { conversationId, senderId, content });
socket.emit('typing', { conversationId, userId, isTyping });
socket.emit('markAsRead', { conversationId, userId });

// Server → Client
socket.on('newMessage', (message) => {});
socket.on('userTyping', ({ userId, isTyping }) => {});
socket.on('messagesRead', (conversationId) => {});
```

## Deployment Architecture

### Production Setup

```
┌─────────────────────────────────────────────┐
│              Users / Clients                 │
└───────────────────┬─────────────────────────┘
                    │
┌───────────────────▼─────────────────────────┐
│          Cloudflare CDN (Optional)           │
│         - Static assets caching              │
│         - DDoS protection                    │
└───────────────────┬─────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
┌───────▼──────────┐   ┌────────▼─────────┐
│  Vercel (Frontend) │   │ Render (Backend) │
│  - Auto scaling    │   │ - Auto scaling   │
│  - Edge functions  │   │ - Health checks  │
│  - CDN             │   │ - Auto deploy    │
└────────────────────┘   └──────┬───────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
        ┌───────────▼──────┐   ┌───────────▼──────┐
        │ MongoDB Atlas     │   │ AWS S3 (Files)   │
        │ - Replica sets    │   │ - Backups        │
        │ - Auto backups    │   │ - CDN delivery   │
        └───────────────────┘   └──────────────────┘
```

### Scaling Strategy

1. **Horizontal Scaling**: Add more server instances
2. **Database Scaling**: Sharding + Read replicas
3. **Caching**: Redis for frequently accessed data
4. **CDN**: Static assets delivery
5. **Load Balancing**: Distribute traffic
6. **Queue System**: Background job processing

## Monitoring & Observability

### Metrics to Track

- **Performance**: Response times, throughput
- **Availability**: Uptime, error rates
- **Usage**: Active users, API calls
- **Business**: Conversions, revenue
- **Database**: Query performance, connections
- **Security**: Failed login attempts, rate limits

### Logging

```javascript
// Structured logging
{
  timestamp: '2024-01-01T00:00:00Z',
  level: 'info',
  message: 'User logged in',
  context: {
    userId: 'xxx',
    ip: '192.168.1.1',
    userAgent: 'Mozilla/...'
  }
}
```

## Best Practices Implemented

1. **Separation of Concerns**: Clear module boundaries
2. **DRY Principle**: Reusable components and services
3. **SOLID Principles**: Clean architecture
4. **Type Safety**: TypeScript throughout
5. **Error Handling**: Global exception filters
6. **Validation**: Input validation at every layer
7. **Security**: Defense in depth
8. **Testing**: Unit, integration, e2e ready
9. **Documentation**: Swagger, JSDoc, README
10. **Version Control**: Git with semantic versioning

---

*This architecture is designed to be scalable, maintainable, and production-ready.*

