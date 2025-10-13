# Deployment Guide

This guide will help you deploy the Job Portal SaaS application to production.

## Prerequisites

- MongoDB Atlas account
- Stripe account
- Gmail account with App Password
- Vercel account (for frontend)
- Render or Railway account (for backend)

## Backend Deployment (Render/Railway)

### 1. Setup MongoDB Atlas

1. Create a free MongoDB Atlas cluster at https://www.mongodb.com/cloud/atlas
2. Whitelist all IP addresses (0.0.0.0/0) for development
3. Create a database user with read/write permissions
4. Get your connection string

### 2. Setup Stripe

1. Create a Stripe account at https://stripe.com
2. Get your API keys from the Dashboard
3. Create products and pricing in Stripe Dashboard
4. Setup webhook endpoint pointing to your backend URL

### 3. Setup Gmail App Password

1. Enable 2-factor authentication on your Gmail account
2. Go to Google Account > Security > App passwords
3. Generate a new app password for "Mail"

### 4. Deploy to Render

1. Push your code to GitHub
2. Go to Render Dashboard
3. Click "New +" > "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Root Directory**: `apps/backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`
6. Add environment variables:
   ```
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_super_secret_jwt_key
   JWT_REFRESH_SECRET=your_refresh_token_secret
   JWT_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_ID_BASIC=price_...
   STRIPE_PRICE_ID_PRO=price_...
   STRIPE_PRICE_ID_ENTERPRISE=price_...
   MAIL_HOST=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USER=your-email@gmail.com
   MAIL_PASSWORD=your_app_password
   MAIL_FROM=noreply@jobportal.com
   FRONTEND_URL=https://your-app.vercel.app
   ```
7. Click "Create Web Service"

### Alternative: Deploy to Railway

1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Initialize: `railway init`
4. Add environment variables: `railway variables set MONGODB_URI=...`
5. Deploy: `railway up`

## Frontend Deployment (Vercel)

### 1. Prepare Environment Variables

Create a `.env.production` file in `apps/frontend`:

```env
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
NEXT_PUBLIC_SOCKET_URL=https://your-backend.onrender.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### 2. Deploy to Vercel

#### Option 1: Vercel Dashboard

1. Go to https://vercel.com
2. Click "Add New" > "Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
5. Add environment variables from `.env.production`
6. Click "Deploy"

#### Option 2: Vercel CLI

```bash
cd apps/frontend
npm install -g vercel
vercel login
vercel --prod
```

### 3. Configure Custom Domain (Optional)

1. Go to your project settings in Vercel
2. Navigate to "Domains"
3. Add your custom domain
4. Update DNS records as instructed

## Post-Deployment Configuration

### 1. Update Stripe Webhook

1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://your-backend.onrender.com/api/subscriptions/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy the webhook signing secret and update `STRIPE_WEBHOOK_SECRET`

### 2. Update CORS Settings

Update the `FRONTEND_URL` in your backend environment variables to match your Vercel deployment URL.

### 3. Test the Application

1. Visit your frontend URL
2. Test user registration and login
3. Test job posting and applications
4. Test Stripe subscription flow
5. Test real-time chat functionality

## Monitoring and Maintenance

### Backend Monitoring

- Render Dashboard provides automatic logs and metrics
- Setup alerts for downtime
- Monitor MongoDB Atlas metrics

### Frontend Monitoring

- Vercel Analytics provides performance insights
- Monitor Core Web Vitals
- Setup error tracking with Sentry (optional)

### Database Backups

1. Enable automatic backups in MongoDB Atlas
2. Schedule regular backup exports
3. Test restoration procedures

## Scaling Considerations

### Backend Scaling

- Upgrade Render plan for more resources
- Implement Redis for caching (optional)
- Use CDN for static assets

### Frontend Scaling

- Vercel automatically scales
- Optimize images with Next.js Image component
- Implement ISR for dynamic pages

### Database Scaling

- Upgrade MongoDB Atlas tier
- Implement database indexing
- Setup read replicas for high traffic

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Verify `FRONTEND_URL` is correctly set
   - Check CORS configuration in `main.ts`

2. **Database Connection**
   - Verify MongoDB connection string
   - Check IP whitelist in MongoDB Atlas

3. **Email Not Sending**
   - Verify Gmail App Password
   - Check SMTP settings

4. **Stripe Webhooks Failing**
   - Verify webhook endpoint URL
   - Check webhook signing secret

### Health Checks

Backend health endpoint: `https://your-backend.onrender.com/api/health`

## Security Checklist

- [ ] Change default admin password
- [ ] Use strong JWT secrets
- [ ] Enable HTTPS only
- [ ] Set secure cookie flags
- [ ] Implement rate limiting
- [ ] Sanitize user inputs
- [ ] Keep dependencies updated
- [ ] Regular security audits

## Support

For issues and questions:
- GitHub Issues: [your-repo/issues]
- Email: support@jobportal.com
- Documentation: [your-docs-url]

