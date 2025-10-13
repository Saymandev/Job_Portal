# 🌱 Database Seeding Guide

## Quick Seed

Run this command to populate your database with sample data:

```bash
cd apps/backend
npm run seed
```

---

## 📊 What Gets Created

### Users (7 total)

#### 1. Admin User
- **Email**: `admin@jobportal.com`
- **Password**: `Admin@123`
- **Role**: Admin

#### 2-4. Job Seekers (3)
1. **John Doe**
   - Email: `john.doe@example.com`
   - Password: `Password@123`
   - Skills: JavaScript, React, Node.js, TypeScript, MongoDB, AWS
   - Experience: 5 years full-stack development
   - Location: San Francisco, CA

2. **Jane Smith**
   - Email: `jane.smith@example.com`
   - Password: `Password@123`
   - Skills: Figma, Adobe XD, UI Design, UX Research
   - Experience: 3 years design
   - Location: New York, NY

3. **Mike Johnson**
   - Email: `mike.johnson@example.com`
   - Password: `Password@123`
   - Skills: Python, TensorFlow, Machine Learning
   - Experience: 4 years data science
   - Location: Austin, TX

#### 5-7. Employers (3)
1. **Sarah Williams** (TechCorp)
   - Email: `hr@techcorp.com`
   - Password: `Password@123`
   - Company: TechCorp Solutions

2. **David Brown** (StartupXYZ)
   - Email: `recruiter@startupxyz.com`
   - Password: `Password@123`
   - Company: StartupXYZ Inc

3. **Emily Davis** (Design Studio)
   - Email: `talent@designstudio.com`
   - Password: `Password@123`
   - Company: Creative Design Studio

---

### Companies (3 total)

1. **TechCorp Solutions**
   - Industry: Technology
   - Size: 500-1000 employees
   - Location: San Francisco, CA
   - Subscription: Pro Plan

2. **StartupXYZ Inc**
   - Industry: E-commerce
   - Size: 50-100 employees
   - Location: New York, NY
   - Subscription: Basic Plan

3. **Creative Design Studio**
   - Industry: Design
   - Size: 10-50 employees
   - Location: Los Angeles, CA
   - Subscription: Free Plan

---

### Jobs (10 total)

1. **Senior Full Stack Developer** - TechCorp ($120k-$180k)
2. **Frontend Developer (React)** - StartupXYZ ($90k-$130k)
3. **UI/UX Designer** - Design Studio ($80k-$110k)
4. **Backend Engineer (Node.js)** - TechCorp ($130k-$170k)
5. **Product Manager** - StartupXYZ ($110k-$150k)
6. **DevOps Engineer** - TechCorp ($100k-$140k)
7. **Marketing Specialist** - StartupXYZ ($60k-$85k)
8. **Graphic Designer Intern** - Design Studio ($20k-$30k)
9. **Mobile Developer (React Native)** - StartupXYZ ($95k-$135k)
10. **Data Analyst** - TechCorp ($70k-$95k)

---

## 🎯 Test Scenarios

### Test as Job Seeker:
```
Email: john.doe@example.com
Password: Password@123
```
- Browse 10 available jobs
- Apply to jobs
- Track application status
- Update profile (already has skills/experience)

### Test as Employer:
```
Email: hr@techcorp.com
Password: Password@123
```
- View your 4 posted jobs
- Post new jobs
- View applicants (when someone applies)
- Manage applications
- Pro subscription active (100 job posts)

### Test as Admin:
```
Email: admin@jobportal.com
Password: Admin@123
```
- View dashboard (real statistics!)
- See 7 users, 10 jobs, 3 companies
- Monitor system activity
- Track revenue

---

## 🔄 Re-seed Database

To clear and re-seed:

```bash
cd apps/backend
npm run seed
```

This will:
1. Clear all existing data
2. Create fresh sample data
3. Show summary of what was created

---

## 📝 Manual Seeding (Alternative)

If the script doesn't work, you can use MongoDB Compass or mongosh:

```bash
mongosh job_portal
db.dropDatabase()
```

Then run the app and create users manually via the registration page.

---

## ✨ After Seeding

1. **Visit**: http://localhost:3000
2. **Login as**:
   - Job Seeker: `john.doe@example.com` / `Password@123`
   - Employer: `hr@techcorp.com` / `Password@123`
   - Admin: `admin@jobportal.com` / `Admin@123`
3. **Browse Jobs**: You'll see 10 real jobs!
4. **Test Features**: Apply, post jobs, manage applications

---

## 🎊 Sample Data Includes

✅ Realistic job descriptions
✅ Proper salary ranges
✅ Relevant skills for each role
✅ Company profiles with details
✅ Active subscriptions
✅ Verified email addresses (no verification needed)
✅ Complete user profiles

---

**Happy Testing! 🚀**

