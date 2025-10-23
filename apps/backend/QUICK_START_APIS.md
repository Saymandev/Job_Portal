# 🚀 Quick Start: Get Free API Keys in 5 Minutes

## **Step 1: Adzuna API (Easiest - 1000 requests/month free)**

1. **Go to:** https://developer.adzuna.com/
2. **Click:** "Get Started" 
3. **Sign up** with email
4. **Verify email** (check inbox)
5. **Login** and go to "My Account" → "API Keys"
6. **Copy** your `APP_ID` and `APP_KEY`

**Add to your `.env` file:**
```bash
ADZUNA_APP_ID=your_app_id_here
ADZUNA_APP_KEY=your_app_key_here
```

---

## **Step 2: Indeed API (Via RapidAPI - Free tier)**

1. **Go to:** https://rapidapi.com/letscrape-6bRBa3QguO5/api/indeed12/
2. **Click:** "Subscribe to Test" (free plan)
3. **Sign up** for RapidAPI account
4. **Subscribe** to Indeed API (free tier)
5. **Go to:** "My Apps" → "Default Application" → "API Key"
6. **Copy** your RapidAPI key

**Get Indeed Publisher ID:**
1. **Go to:** https://ads.indeed.com/jobroll/xmlfeed
2. **Sign up** for Indeed for Publishers
3. **Get** your Publisher ID

**Add to your `.env` file:**
```bash
RAPIDAPI_KEY=your_rapidapi_key_here
INDEED_PUBLISHER_ID=your_publisher_id_here
```

---

## **Step 3: Test Your Setup**

1. **Start your backend:**
   ```bash
   npm run start:dev
   ```

2. **Test the API:**
   ```bash
   curl -X GET "http://localhost:3000/api/analytics/salary-insights?position=Software Engineer&location=San Francisco&experienceLevel=Mid-level"
   ```

3. **Check the response** - you should see real salary data!

---

## **What You Get:**

✅ **Real salary data** from job postings  
✅ **1000+ requests/month** free  
✅ **Automatic fallback** if APIs fail  
✅ **Caching** for better performance  
✅ **Multiple data sources** for accuracy  

---

## **Next Steps (Optional):**

### **For Production:**
- Apply for Glassdoor API (2-4 weeks approval)
- Contact PayScale for enterprise access
- Set up LinkedIn Marketing API

### **For More Data:**
- Add OpenSalary API (free)
- Implement API key rotation
- Set up Redis caching

---

## **Troubleshooting:**

**❌ "No API key configured"**
- Check your `.env` file has the correct variable names
- Restart your backend server after adding keys

**❌ "API rate limit exceeded"**
- Wait for the reset period (usually monthly)
- Check your usage in the API dashboard

**❌ "No data returned"**
- Try different position names (e.g., "Developer" instead of "Engineer")
- Check if the location exists in the API's database

---

## **Success! 🎉**

Once you have these APIs working, your salary insights will show:
- Real market data instead of mock data
- Data source information (Adzuna, Indeed, etc.)
- Confidence scores for data quality
- Automatic updates with fresh data

**Your job portal now has enterprise-grade salary insights!**
