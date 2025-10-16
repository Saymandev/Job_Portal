# Deployment Guide: Backend on Render + Frontend on Vercel

This guide will help you deploy your Job Portal application with the backend on Render and frontend on Vercel.

## Prerequisites

- GitHub repository with your code
- MongoDB Atlas account (for database)
- Stripe account (for payments)
- Cloudinary account (for file uploads)
- Email service account (Gmail, SendGrid, etc.)

## Backend Deployment on Render

### 1. Prepare Your Repository

1. Ensure your `apps/backend/render.yaml` file is properly configured
2. Make sure your backend has a proper `package.json` with build scripts
3. Commit and push your changes to GitHub

### 2. Create Render Account and Service

1. Go to [render.com](https://render.com) and sign up
2. Connect your GitHub account
3. Click "New +" → "Web Service"
4. Connect your repository
5. Configure the service:
   - **Name**: `job-portal-backend`
   - **Environment**: `Node`
   - **Build Command**: `cd apps/backend && npm install && npm run build`
   - **Start Command**: `cd apps/backend && npm run start:prod`
   - **Plan**: Choose based on your needs (Starter is free)

### 3. Configure Environment Variables

In Render dashboard, go to your service → Environment tab and add:

#### Required Variables:
```
NODE_ENV=production
PORT=10000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key
FRONTEND_URL=https://your-frontend-url.vercel.app
```

#### Optional Variables (add as needed):
```
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
MAIL_USER=your_email_username
MAIL_PASSWORD=your_email_password
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### 4. Deploy

1. Click "Create Web Service"
2. Wait for the build to complete
3. Note your backend URL (e.g., `https://job-portal-backend.onrender.com`)

## Frontend Deployment on Vercel

### 1. Prepare Your Repository

1. Ensure your `apps/frontend/vercel.json` file is properly configured
2. Make sure your frontend has a proper `package.json` with build scripts
3. Commit and push your changes to GitHub

### 2. Create Vercel Account and Project

1. Go to [vercel.com](https://vercel.com) and sign up
2. Connect your GitHub account
3. Click "New Project"
4. Import your repository
5. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/frontend`
   - **Build Command**: `cd apps/frontend && npm install && npm run build`
   - **Output Directory**: `apps/frontend/.next`

### 3. Configure Environment Variables

In Vercel dashboard, go to your project → Settings → Environment Variables and add:

```
NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com/api
```

### 4. Deploy

1. Click "Deploy"
2. Wait for the build to complete
3. Note your frontend URL (e.g., `https://your-project.vercel.app`)

## Update Backend CORS Configuration

After getting your Vercel URL, update the `FRONTEND_URL` environment variable in Render:

1. Go to your Render service → Environment tab
2. Update `FRONTEND_URL` to your actual Vercel URL
3. Redeploy the service

## Database Setup

### MongoDB Atlas

1. Create a MongoDB Atlas account
2. Create a new cluster
3. Create a database user
4. Whitelist Render's IP addresses (or use 0.0.0.0/0 for all IPs)
5. Get your connection string and add it to Render environment variables

### Database Seeding

After deployment, you can seed your database by:

1. SSH into your Render service (if available)
2. Run: `cd apps/backend && npm run seed`

Or create a separate seeding script that runs after deployment.

## Domain Configuration (Optional)

### Custom Domain for Backend

1. In Render, go to your service → Settings → Custom Domains
2. Add your custom domain
3. Update DNS records as instructed

### Custom Domain for Frontend

1. In Vercel, go to your project → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

## Environment Variables Reference

### Backend (Render)

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment | Yes | `production` |
| `PORT` | Server port | Yes | `10000` |
| `MONGODB_URI` | MongoDB connection string | Yes | `mongodb+srv://...` |
| `JWT_SECRET` | JWT signing secret | Yes | `your-secret-key` |
| `JWT_REFRESH_SECRET` | JWT refresh secret | Yes | `your-refresh-secret` |
| `FRONTEND_URL` | Frontend URL for CORS | Yes | `https://your-app.vercel.app` |
| `STRIPE_SECRET_KEY` | Stripe secret key | No | `sk_test_...` |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | No | `pk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | No | `whsec_...` |
| `MAIL_USER` | Email username | No | `your-email@gmail.com` |
| `MAIL_PASSWORD` | Email password | No | `your-app-password` |
| `MAIL_HOST` | SMTP host | No | `smtp.gmail.com` |
| `MAIL_PORT` | SMTP port | No | `587` |
| `MAIL_SECURE` | Use SSL | No | `false` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | No | `your-cloud-name` |
| `CLOUDINARY_API_KEY` | Cloudinary API key | No | `your-api-key` |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | No | `your-api-secret` |

### Frontend (Vercel)

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | Yes | `https://your-backend.onrender.com/api` |

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure `FRONTEND_URL` in Render matches your Vercel URL exactly
2. **Build Failures**: Check that all dependencies are in `package.json`
3. **Database Connection**: Verify MongoDB Atlas whitelist includes Render IPs
4. **Environment Variables**: Ensure all required variables are set

### Debugging

1. **Backend Logs**: Check Render service logs
2. **Frontend Logs**: Check Vercel deployment logs
3. **Network Issues**: Use browser dev tools to check API calls

## Security Considerations

1. **Environment Variables**: Never commit sensitive data to Git
2. **CORS**: Configure CORS properly for production
3. **HTTPS**: Both Render and Vercel provide HTTPS by default
4. **Database**: Use MongoDB Atlas with proper authentication
5. **API Keys**: Rotate keys regularly

## Monitoring and Maintenance

1. **Uptime**: Monitor service uptime in both platforms
2. **Logs**: Regularly check logs for errors
3. **Updates**: Keep dependencies updated
4. **Backups**: Regular database backups
5. **Performance**: Monitor response times and optimize as needed

## Cost Optimization

### Render
- Free tier: 750 hours/month
- Paid plans start at $7/month
- Consider upgrading for better performance

### Vercel
- Free tier: 100GB bandwidth/month
- Paid plans start at $20/month
- Consider Pro plan for production

## Next Steps

1. Set up monitoring (Sentry, LogRocket, etc.)
2. Configure CDN for static assets
3. Set up automated backups
4. Implement CI/CD pipelines
5. Add performance monitoring
6. Set up error tracking

## Support

- Render Documentation: https://render.com/docs
- Vercel Documentation: https://vercel.com/docs
- MongoDB Atlas Documentation: https://docs.atlas.mongodb.com/
- Stripe Documentation: https://stripe.com/docs
