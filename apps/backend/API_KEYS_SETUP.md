# 🔑 API Keys Setup Guide

## **Free APIs (Recommended for Development)**

### **1. Adzuna API (1000 requests/month free)**

**Steps to get API key:**
1. Visit [Adzuna Developer Portal](https://developer.adzuna.com/)
2. Click "Get Started" and sign up
3. Verify your email
4. Go to "My Account" → "API Keys"
5. Copy your `APP_ID` and `APP_KEY`

**Add to `.env`:**
```bash
ADZUNA_APP_ID=your_app_id_here
ADZUNA_APP_KEY=your_app_key_here
```

---

### **2. Indeed API (Free via RapidAPI)**

**Steps to get API key:**
1. Visit [Indeed API on RapidAPI](https://rapidapi.com/letscrape-6bRBa3QguO5/api/indeed12/)
2. Sign up for RapidAPI account
3. Subscribe to Indeed API (free plan available)
4. Get your RapidAPI key
5. Get Indeed Publisher ID from [Indeed for Publishers](https://ads.indeed.com/jobroll/xmlfeed)

**Add to `.env`:**
```bash
RAPIDAPI_KEY=your_rapidapi_key_here
INDEED_PUBLISHER_ID=your_publisher_id_here
```

---

### **3. OpenSalary API (Free)**

**Steps to get API key:**
1. Visit [OpenSalary API](https://opensalary.com/api)
2. Sign up for free account
3. Get your API key from dashboard

**Add to `.env`:**
```bash
OPENSALARY_API_KEY=your_api_key_here
```

---

## **Premium APIs (For Production)**

### **4. Glassdoor API**

**Steps to get API key:**
1. Visit [Glassdoor API Documentation](https://www.glassdoor.com/developer/index.htm)
2. Fill out partnership application
3. Wait for approval (2-4 weeks)
4. Sign partnership agreement
5. Get API credentials

**Add to `.env`:**
```bash
GLASSDOOR_API_KEY=your_api_key_here
GLASSDOOR_PARTNER_ID=your_partner_id_here
```

---

### **5. PayScale API**

**Steps to get API key:**
1. Visit [PayScale API](https://www.payscale.com/api)
2. Contact sales team
3. Request enterprise API access
4. Sign enterprise agreement
5. Get API credentials

**Add to `.env`:**
```bash
PAYSCALE_API_KEY=your_api_key_here
```

---

### **6. LinkedIn Salary Insights API**

**Steps to get API key:**
1. Visit [LinkedIn Marketing Developer Platform](https://www.linkedin.com/developers/)
2. Create LinkedIn app
3. Request Marketing API access
4. Apply for salary insights access
5. Get API credentials

**Add to `.env`:**
```bash
LINKEDIN_API_KEY=your_api_key_here
```

---

## **Environment Variables Template**

Create a `.env` file in your backend directory:

```bash
# Free APIs (Start with these)
ADZUNA_APP_ID=your_adzuna_app_id
ADZUNA_APP_KEY=your_adzuna_app_key
RAPIDAPI_KEY=your_rapidapi_key
INDEED_PUBLISHER_ID=your_indeed_publisher_id
OPENSALARY_API_KEY=your_opensalary_key

# Premium APIs (Add when available)
GLASSDOOR_API_KEY=your_glassdoor_key
GLASSDOOR_PARTNER_ID=your_glassdoor_partner_id
PAYSCALE_API_KEY=your_payscale_key
LINKEDIN_API_KEY=your_linkedin_key

# Other existing variables...
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
# ... etc
```

---

## **Testing API Keys**

After adding your API keys, test them:

```bash
# Test salary data endpoint
curl -X GET "http://localhost:3000/api/analytics/salary-insights?position=Software Engineer&location=San Francisco&experienceLevel=Mid-level" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## **API Priority Order**

The system tries APIs in this order:
1. **Adzuna** (Free, 1000/month)
2. **Indeed** (Free via RapidAPI)
3. **Glassdoor** (Premium, requires approval)
4. **PayScale** (Premium, enterprise)
5. **LinkedIn** (Premium, requires approval)
6. **Fallback** (Mock data if all APIs fail)

---

## **Rate Limits**

| API | Free Tier | Paid Tier |
|-----|-----------|-----------|
| Adzuna | 1,000/month | 10,000+/month |
| Indeed | 100/day | 1,000+/day |
| Glassdoor | Varies | Varies |
| PayScale | Enterprise only | Enterprise |
| LinkedIn | Varies | Varies |

---

## **Troubleshooting**

### **API Not Working?**
1. Check if API key is correctly set in `.env`
2. Verify API key is active and not expired
3. Check rate limits haven't been exceeded
4. Look at backend logs for specific error messages

### **No Data Returned?**
1. System will fallback to mock data
2. Check if position/location combination exists
3. Try different position names (e.g., "Software Developer" vs "Software Engineer")

### **Rate Limit Exceeded?**
1. Wait for reset period
2. Upgrade to paid plan
3. Implement better caching
4. Use multiple API keys (rotation)

---

## **Production Recommendations**

1. **Start with free APIs** for development
2. **Add premium APIs** as you scale
3. **Implement API key rotation** for high volume
4. **Use Redis caching** for better performance
5. **Monitor API usage** and costs
6. **Set up alerts** for API failures
