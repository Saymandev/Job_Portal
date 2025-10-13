// Simple Node.js script to seed the database
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/job_portal';

async function seed() {
  try {
    console.log('🌱 Starting database seeding...\n');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Define schemas
    const UserSchema = new mongoose.Schema({
      email: String,
      password: String,
      fullName: String,
      role: String,
      phone: String,
      location: String,
      bio: String,
      skills: [String],
      experience: String,
      education: String,
      portfolioUrl: String,
      linkedinUrl: String,
      githubUrl: String,
      isEmailVerified: Boolean,
      isActive: Boolean,
      company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    }, { timestamps: true });

    const CompanySchema = new mongoose.Schema({
      name: String,
      description: String,
      website: String,
      industry: String,
      companySize: String,
      location: String,
      owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      employees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      linkedinUrl: String,
      twitterUrl: String,
      isVerified: Boolean,
      isActive: Boolean,
    }, { timestamps: true });

    const JobSchema = new mongoose.Schema({
      title: String,
      description: String,
      requirements: String,
      company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
      postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      location: String,
      isRemote: Boolean,
      jobType: String,
      experienceLevel: String,
      salaryMin: Number,
      salaryMax: Number,
      currency: String,
      skills: [String],
      benefits: [String],
      status: String,
      applicationsCount: { type: Number, default: 0 },
      viewsCount: { type: Number, default: 0 },
      isFeatured: { type: Boolean, default: false },
      expiresAt: Date,
    }, { timestamps: true });

    const SubscriptionSchema = new mongoose.Schema({
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      plan: String,
      status: String,
      jobPostsLimit: Number,
      jobPostsUsed: Number,
      currentPeriodStart: Date,
      currentPeriodEnd: Date,
    }, { timestamps: true });

    const ActivitySchema = new mongoose.Schema({
      type: { type: String, required: true },
      description: { type: String, required: true },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
      applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
      companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
      metadata: { type: Object },
      ipAddress: { type: String, required: true },
      userAgent: { type: String, required: true },
    }, { timestamps: true });

    const User = mongoose.model('User', UserSchema);
    const Company = mongoose.model('Company', CompanySchema);
    const Job = mongoose.model('Job', JobSchema);
    const Subscription = mongoose.model('Subscription', SubscriptionSchema);
    const Activity = mongoose.model('Activity', ActivitySchema);

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Company.deleteMany({});
    await Job.deleteMany({});
    await Subscription.deleteMany({});
    await Activity.deleteMany({});
    console.log('✅ Existing data cleared\n');

    // Create Admin
    console.log('👤 Creating admin user...');
    const admin = await User.create({
      email: 'admin@jobportal.com',
      password: await bcrypt.hash('Admin@123', 10),
      fullName: 'Admin User',
      role: 'admin',
      isEmailVerified: true,
      isActive: true,
    });
    console.log('✅ Admin: admin@jobportal.com / Admin@123\n');

    // Create Job Seekers
    console.log('👥 Creating job seekers...');
    const jobSeekers = await User.insertMany([
      {
        email: 'john.doe@example.com',
        password: await bcrypt.hash('Password@123', 10),
        fullName: 'John Doe',
        role: 'job_seeker',
        isEmailVerified: true,
        phone: '+1234567890',
        location: 'San Francisco, CA',
        bio: 'Experienced full-stack developer passionate about building scalable applications',
        skills: ['JavaScript', 'React', 'Node.js', 'TypeScript', 'MongoDB', 'AWS'],
        experience: '5 years of experience in web development',
        education: 'BS Computer Science, Stanford University',
        portfolioUrl: 'https://johndoe.dev',
        linkedinUrl: 'https://linkedin.com/in/johndoe',
        githubUrl: 'https://github.com/johndoe',
        isActive: true,
      },
      {
        email: 'jane.smith@example.com',
        password: await bcrypt.hash('Password@123', 10),
        fullName: 'Jane Smith',
        role: 'job_seeker',
        isEmailVerified: true,
        phone: '+1234567891',
        location: 'New York, NY',
        bio: 'UI/UX Designer with a passion for creating beautiful user experiences',
        skills: ['Figma', 'Adobe XD', 'UI Design', 'UX Research', 'Prototyping'],
        experience: '3 years of design experience',
        education: 'BA Design, Parsons School of Design',
        portfolioUrl: 'https://janesmith.design',
        linkedinUrl: 'https://linkedin.com/in/janesmith',
        isActive: true,
      },
      {
        email: 'mike.johnson@example.com',
        password: await bcrypt.hash('Password@123', 10),
        fullName: 'Mike Johnson',
        role: 'job_seeker',
        isEmailVerified: true,
        phone: '+1234567892',
        location: 'Austin, TX',
        bio: 'Data Scientist specializing in machine learning and AI',
        skills: ['Python', 'TensorFlow', 'Machine Learning', 'Data Analysis', 'SQL'],
        experience: '4 years in data science',
        education: 'MS Data Science, MIT',
        githubUrl: 'https://github.com/mikejohnson',
        isActive: true,
      },
    ]);
    console.log(`✅ Created ${jobSeekers.length} job seekers\n`);

    // Create Employers
    console.log('🏢 Creating employers...');
    const employers = await User.insertMany([
      {
        email: 'hr@techcorp.com',
        password: await bcrypt.hash('Password@123', 10),
        fullName: 'Sarah Williams',
        role: 'employer',
        isEmailVerified: true,
        phone: '+1234567893',
        isActive: true,
      },
      {
        email: 'recruiter@startupxyz.com',
        password: await bcrypt.hash('Password@123', 10),
        fullName: 'David Brown',
        role: 'employer',
        isEmailVerified: true,
        phone: '+1234567894',
        isActive: true,
      },
      {
        email: 'talent@designstudio.com',
        password: await bcrypt.hash('Password@123', 10),
        fullName: 'Emily Davis',
        role: 'employer',
        isEmailVerified: true,
        phone: '+1234567895',
        isActive: true,
      },
    ]);
    console.log(`✅ Created ${employers.length} employers\n`);

    // Create Companies
    console.log('🏪 Creating companies...');
    const companies = await Company.insertMany([
      {
        name: 'TechCorp Solutions',
        description: 'Leading technology company specializing in enterprise software solutions. We help businesses transform digitally with cutting-edge technology.',
        website: 'https://techcorp.com',
        industry: 'Technology',
        companySize: '500-1000',
        location: 'San Francisco, CA',
        owner: employers[0]._id,
        employees: [employers[0]._id],
        linkedinUrl: 'https://linkedin.com/company/techcorp',
        isVerified: true,
        isActive: true,
      },
      {
        name: 'StartupXYZ Inc',
        description: 'Fast-growing startup revolutionizing the e-commerce space with AI-powered recommendations.',
        website: 'https://startupxyz.com',
        industry: 'E-commerce',
        companySize: '50-100',
        location: 'New York, NY',
        owner: employers[1]._id,
        employees: [employers[1]._id],
        twitterUrl: 'https://twitter.com/startupxyz',
        isVerified: true,
        isActive: true,
      },
      {
        name: 'Creative Design Studio',
        description: 'Award-winning design agency creating beautiful brands and digital experiences.',
        website: 'https://designstudio.com',
        industry: 'Design',
        companySize: '10-50',
        location: 'Los Angeles, CA',
        owner: employers[2]._id,
        employees: [employers[2]._id],
        linkedinUrl: 'https://linkedin.com/company/designstudio',
        isVerified: true,
        isActive: true,
      },
    ]);
    console.log(`✅ Created ${companies.length} companies\n`);

    // Update employers with companies
    await User.findByIdAndUpdate(employers[0]._id, { company: companies[0]._id });
    await User.findByIdAndUpdate(employers[1]._id, { company: companies[1]._id });
    await User.findByIdAndUpdate(employers[2]._id, { company: companies[2]._id });

    // Create Subscriptions
    console.log('💳 Creating subscriptions...');
    await Subscription.insertMany([
      {
        user: employers[0]._id,
        plan: 'pro',
        status: 'active',
        jobPostsLimit: 100,
        jobPostsUsed: 4,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        user: employers[1]._id,
        plan: 'basic',
        status: 'active',
        jobPostsLimit: 25,
        jobPostsUsed: 5,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        user: employers[2]._id,
        plan: 'free',
        status: 'active',
        jobPostsLimit: 5,
        jobPostsUsed: 1,
      },
    ]);
    console.log('✅ Created subscriptions\n');

    // Create Jobs
    console.log('💼 Creating job listings...');
    const jobsData = [
      {
        title: 'Senior Full Stack Developer',
        description: `We are looking for an experienced Full Stack Developer to join our engineering team. You will work on building scalable web applications using modern technologies.

Key Responsibilities:
- Design and develop full-stack web applications
- Collaborate with product and design teams
- Write clean, maintainable code
- Mentor junior developers
- Participate in code reviews`,
        requirements: `- 5+ years of experience in full-stack development
- Strong proficiency in JavaScript/TypeScript
- Experience with React, Node.js, and MongoDB
- Knowledge of AWS or other cloud platforms
- Excellent problem-solving skills
- Strong communication skills`,
        company: companies[0]._id,
        postedBy: employers[0]._id,
        location: 'San Francisco, CA',
        isRemote: true,
        jobType: 'full-time',
        experienceLevel: 'senior',
        salaryMin: 120000,
        salaryMax: 180000,
        currency: 'USD',
        skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'MongoDB', 'AWS'],
        benefits: ['Health Insurance', '401k', 'Remote Work', 'Flexible Hours', 'Stock Options'],
        status: 'open',
        isFeatured: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Frontend Developer (React)',
        description: `Join our team as a Frontend Developer and help build amazing user interfaces for our e-commerce platform.`,
        requirements: `- 3+ years of React experience
- Strong understanding of HTML, CSS, JavaScript
- Experience with Next.js is a plus
- Familiarity with TypeScript`,
        company: companies[1]._id,
        postedBy: employers[1]._id,
        location: 'New York, NY',
        isRemote: false,
        jobType: 'full-time',
        experienceLevel: 'mid',
        salaryMin: 90000,
        salaryMax: 130000,
        skills: ['React', 'JavaScript', 'HTML', 'CSS', 'TypeScript', 'Next.js'],
        benefits: ['Health Insurance', 'Gym Membership', 'Free Lunch'],
        status: 'open',
        isFeatured: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'UI/UX Designer',
        description: `Creative Design Studio is looking for a talented UI/UX Designer to join our team.`,
        requirements: `- 2+ years of UI/UX design experience
- Proficiency in Figma and Adobe Creative Suite
- Strong portfolio demonstrating design skills`,
        company: companies[2]._id,
        postedBy: employers[2]._id,
        location: 'Los Angeles, CA',
        isRemote: true,
        jobType: 'full-time',
        experienceLevel: 'mid',
        salaryMin: 80000,
        salaryMax: 110000,
        skills: ['Figma', 'Adobe XD', 'UI Design', 'UX Design', 'Prototyping'],
        benefits: ['Health Insurance', 'Remote Work', 'Creative Freedom'],
        status: 'open',
        isFeatured: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Backend Engineer (Node.js)',
        description: `Build and maintain our API services and microservices architecture.`,
        requirements: `- 4+ years of backend development
- Expert knowledge of Node.js
- Experience with MongoDB`,
        company: companies[0]._id,
        postedBy: employers[0]._id,
        location: 'San Francisco, CA',
        isRemote: true,
        jobType: 'full-time',
        experienceLevel: 'senior',
        salaryMin: 130000,
        salaryMax: 170000,
        skills: ['Node.js', 'Nest.js', 'MongoDB', 'Docker', 'Kubernetes'],
        benefits: ['Health Insurance', 'Remote Work', 'Stock Options'],
        status: 'open',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Product Manager',
        description: `Lead our product strategy and roadmap.`,
        requirements: `- 3+ years of product management experience
- Strong analytical skills
- Technical background preferred`,
        company: companies[1]._id,
        postedBy: employers[1]._id,
        location: 'New York, NY',
        isRemote: false,
        jobType: 'full-time',
        experienceLevel: 'senior',
        salaryMin: 110000,
        salaryMax: 150000,
        skills: ['Product Management', 'Agile', 'Analytics', 'Strategy'],
        benefits: ['Health Insurance', 'Stock Options', 'Free Lunch'],
        status: 'open',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'DevOps Engineer',
        description: `Build and maintain cloud infrastructure and CI/CD pipelines.`,
        requirements: `- 3+ years of DevOps experience
- AWS/GCP/Azure knowledge
- Container orchestration`,
        company: companies[0]._id,
        postedBy: employers[0]._id,
        location: 'Remote',
        isRemote: true,
        jobType: 'full-time',
        experienceLevel: 'mid',
        salaryMin: 100000,
        salaryMax: 140000,
        skills: ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD'],
        benefits: ['Health Insurance', 'Remote Work', 'Learning Budget'],
        status: 'open',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Marketing Specialist',
        description: `Drive our growth and brand awareness.`,
        requirements: `- 2+ years of digital marketing
- SEO, SEM, social media expertise
- Google Analytics experience`,
        company: companies[1]._id,
        postedBy: employers[1]._id,
        location: 'New York, NY',
        isRemote: true,
        jobType: 'full-time',
        experienceLevel: 'entry',
        salaryMin: 60000,
        salaryMax: 85000,
        skills: ['Digital Marketing', 'SEO', 'Content Marketing', 'Social Media'],
        benefits: ['Health Insurance', 'Remote Work'],
        status: 'open',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Graphic Designer Intern',
        description: `Internship opportunity for aspiring graphic designers.`,
        requirements: `- Currently enrolled in design program
- Adobe Creative Suite proficiency
- Portfolio required`,
        company: companies[2]._id,
        postedBy: employers[2]._id,
        location: 'Los Angeles, CA',
        isRemote: false,
        jobType: 'internship',
        experienceLevel: 'entry',
        salaryMin: 20000,
        salaryMax: 30000,
        skills: ['Adobe Photoshop', 'Adobe Illustrator', 'Graphic Design'],
        benefits: ['Mentorship', 'Portfolio Building'],
        status: 'open',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Mobile Developer (React Native)',
        description: `Build cross-platform mobile applications.`,
        requirements: `- 3+ years of React Native experience
- Published apps on stores
- Strong JavaScript/TypeScript skills`,
        company: companies[1]._id,
        postedBy: employers[1]._id,
        location: 'Remote',
        isRemote: true,
        jobType: 'full-time',
        experienceLevel: 'mid',
        salaryMin: 95000,
        salaryMax: 135000,
        skills: ['React Native', 'JavaScript', 'TypeScript', 'Mobile Development'],
        benefits: ['Health Insurance', 'Remote Work', 'Equipment Allowance'],
        status: 'open',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Data Analyst',
        description: `Analyze data to drive business decisions.`,
        requirements: `- 2+ years of data analysis
- SQL and Excel proficiency
- Data visualization tools experience`,
        company: companies[0]._id,
        postedBy: employers[0]._id,
        location: 'San Francisco, CA',
        isRemote: true,
        jobType: 'full-time',
        experienceLevel: 'entry',
        salaryMin: 70000,
        salaryMax: 95000,
        skills: ['SQL', 'Excel', 'Tableau', 'Data Analysis', 'Python'],
        benefits: ['Health Insurance', 'Remote Work'],
        status: 'open',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    ];

    await Job.insertMany(jobsData);
    console.log(`✅ Created ${jobsData.length} job listings\n`);

    // Create Activity Logs
    console.log('📝 Creating activity logs...');
    const activities = await Activity.insertMany([
      {
        type: 'user_registration',
        description: 'New user registered',
        userId: jobSeekers[0]._id,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      {
        type: 'user_login',
        description: 'User logged in',
        userId: employers[0]._id,
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      {
        type: 'job_posted',
        description: 'New job posted',
        userId: employers[0]._id,
        jobId: jobsData[0]._id,
        ipAddress: '192.168.1.102',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      {
        type: 'application_submitted',
        description: 'Application submitted',
        userId: jobSeekers[1]._id,
        jobId: jobsData[0]._id,
        ipAddress: '192.168.1.103',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      },
      {
        type: 'subscription_created',
        description: 'Subscription created',
        userId: employers[1]._id,
        ipAddress: '192.168.1.104',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      {
        type: 'profile_updated',
        description: 'Profile updated',
        userId: jobSeekers[2]._id,
        ipAddress: '192.168.1.105',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    ]);
    console.log(`✅ Created ${activities.length} activity logs\n`);

    // Create Subscriptions
    console.log('💳 Creating subscriptions...');
    await Subscription.insertMany([
      {
        user: employers[0]._id,
        plan: 'pro',
        status: 'active',
        jobPostsLimit: 100,
        jobPostsUsed: 4,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        user: employers[1]._id,
        plan: 'basic',
        status: 'active',
        jobPostsLimit: 25,
        jobPostsUsed: 5,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        user: employers[2]._id,
        plan: 'free',
        status: 'active',
        jobPostsLimit: 5,
        jobPostsUsed: 1,
      },
    ]);
    console.log('✅ Created subscriptions\n');

    console.log('═══════════════════════════════════════');
    console.log('📊 Seeding Summary:');
    console.log('═══════════════════════════════════════');
    console.log(`👤 Admin Users: 1`);
    console.log(`👥 Job Seekers: ${jobSeekers.length}`);
    console.log(`🏢 Employers: ${employers.length}`);
    console.log(`🏪 Companies: ${companies.length}`);
    console.log(`💼 Jobs: ${jobsData.length}`);
    console.log(`📝 Activities: ${activities.length}`);
    console.log('═══════════════════════════════════════\n');

    console.log('📧 Test Account Credentials:');
    console.log('═══════════════════════════════════════');
    console.log('🔐 ADMIN:');
    console.log('   Email: admin@jobportal.com');
    console.log('   Password: Admin@123\n');
    console.log('👤 JOB SEEKER:');
    console.log('   Email: john.doe@example.com');
    console.log('   Password: Password@123\n');
    console.log('🏢 EMPLOYER:');
    console.log('   Email: hr@techcorp.com');
    console.log('   Password: Password@123\n');
    console.log('═══════════════════════════════════════\n');

    console.log('✨ Database seeded successfully!');
    console.log('🚀 Run: npm run dev\n');

  } catch (error) {
    console.error('❌ Seeding error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

seed();

