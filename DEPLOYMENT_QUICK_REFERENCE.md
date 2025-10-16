# Quick Deployment Reference

## 🚀 Quick Start Commands

### Backend (Render)
1. **Repository**: Connect your GitHub repo to Render
2. **Build Command**: `cd apps/backend && npm install && npm run build`
3. **Start Command**: `cd apps/backend && npm run start:prod`
4. **Port**: `10000`

### Frontend (Vercel)
1. **Repository**: Connect your GitHub repo to Vercel
2. **Root Directory**: `apps/frontend`
3. **Build Command**: `cd apps/frontend && npm install && npm run build`
4. **Output Directory**: `apps/frontend/.next`

## 🔧 Essential Environment Variables

### Backend (Render) - Required
```
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
JWT_SECRET=your-jwt-secret-key
JWT_REFRESH_SECRET=your-jwt-refresh-secret-key
FRONTEND_URL=https://your-app.vercel.app
```

### Frontend (Vercel) - Required
```
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
```

## 📋 Deployment Checklist

### Before Deployment
- [ ] MongoDB Atlas cluster created
- [ ] Database user created
- [ ] IP whitelist configured
- [ ] Stripe account set up (if using payments)
- [ ] Cloudinary account set up (if using file uploads)
- [ ] Email service configured (if using notifications)

### Backend Deployment (Render)
- [ ] Create new Web Service
- [ ] Connect GitHub repository
- [ ] Set build and start commands
- [ ] Add all environment variables
- [ ] Deploy and test health endpoint

### Frontend Deployment (Vercel)
- [ ] Create new project
- [ ] Connect GitHub repository
- [ ] Set root directory to `apps/frontend`
- [ ] Add environment variables
- [ ] Deploy and test

### Post-Deployment
- [ ] Update `FRONTEND_URL` in Render with actual Vercel URL
- [ ] Test API connectivity
- [ ] Test authentication flow
- [ ] Test file uploads (if applicable)
- [ ] Test payment flow (if applicable)
- [ ] Set up monitoring

## 🔗 Important URLs

### Render Dashboard
- **URL**: https://dashboard.render.com
- **Service**: Your backend service name

### Vercel Dashboard
- **URL**: https://vercel.com/dashboard
- **Project**: Your frontend project name

### Health Check
- **Backend**: `https://your-backend.onrender.com/api/health`
- **API Docs**: `https://your-backend.onrender.com/api-docs`

## 🛠️ Troubleshooting

### Common Issues
1. **CORS Error**: Check `FRONTEND_URL` in Render matches Vercel URL
2. **Build Failed**: Check build logs for missing dependencies
3. **Database Connection**: Verify MongoDB Atlas whitelist
4. **Environment Variables**: Ensure all required vars are set

### Debug Commands
```bash
# Check backend logs in Render dashboard
# Check frontend logs in Vercel dashboard
# Test API endpoint: curl https://your-backend.onrender.com/api/health
```

## 📞 Support Resources

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **MongoDB Atlas**: https://docs.atlas.mongodb.com/
- **Stripe Docs**: https://stripe.com/docs
- **Cloudinary Docs**: https://cloudinary.com/documentation

## 💰 Cost Overview

### Render (Backend)
- **Free Tier**: 750 hours/month
- **Paid Plans**: Starting at $7/month

### Vercel (Frontend)
- **Free Tier**: 100GB bandwidth/month
- **Paid Plans**: Starting at $20/month

### MongoDB Atlas
- **Free Tier**: 512MB storage
- **Paid Plans**: Starting at $9/month

## 🔄 Update Process

### Backend Updates
1. Push changes to GitHub
2. Render auto-deploys from main branch
3. Check deployment logs

### Frontend Updates
1. Push changes to GitHub
2. Vercel auto-deploys from main branch
3. Check deployment logs

### Environment Variable Updates
1. Update in respective platform dashboard
2. Redeploy service/project
3. Test changes
