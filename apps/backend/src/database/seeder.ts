import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { AppModule } from '../app.module';
import { Activity, ActivityType } from '../modules/admin/schemas/activity.schema';
import { Company } from '../modules/companies/schemas/company.schema';
import { Job } from '../modules/jobs/schemas/job.schema';
import { Subscription } from '../modules/subscriptions/schemas/subscription.schema';
import { User } from '../modules/users/schemas/user.schema';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const userModel = app.get<Model<User>>('UserModel');
  const companyModel = app.get<Model<Company>>('CompanyModel');
  const jobModel = app.get<Model<Job>>('JobModel');
  const subscriptionModel = app.get<Model<Subscription>>('SubscriptionModel');
  const activityModel = app.get<Model<Activity>>('ActivityModel');

  console.log('🌱 Starting database seeding...\n');

  try {
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await Promise.all([
      userModel.deleteMany({}),
      companyModel.deleteMany({}),
      jobModel.deleteMany({}),
      subscriptionModel.deleteMany({}),
      activityModel.deleteMany({}),
    ]);
    console.log('✅ Existing data cleared\n');

    // Create Admin User
    console.log('👤 Creating admin user...');
    const admin = await userModel.create({
      email: 'admin@jobportal.com',
      password: await bcrypt.hash('Admin@123', 10),
      fullName: 'Admin User',
      role: 'admin',
      isEmailVerified: true,
      isActive: true,
    });
    console.log('✅ Admin created: admin@jobportal.com / Admin@123\n');

    // Create Job Seekers
    console.log('👥 Creating job seekers...');
    const jobSeekers = await userModel.insertMany([
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
      },
    ]);
    console.log(`✅ Created ${jobSeekers.length} job seekers\n`);

    // Create Employers
    console.log('🏢 Creating employers...');
    const employers = await userModel.insertMany([
      {
        email: 'hr@techcorp.com',
        password: await bcrypt.hash('Password@123', 10),
        fullName: 'Sarah Williams',
        role: 'employer',
        isEmailVerified: true,
        phone: '+1234567893',
      },
      {
        email: 'recruiter@startupxyz.com',
        password: await bcrypt.hash('Password@123', 10),
        fullName: 'David Brown',
        role: 'employer',
        isEmailVerified: true,
        phone: '+1234567894',
      },
      {
        email: 'talent@designstudio.com',
        password: await bcrypt.hash('Password@123', 10),
        fullName: 'Emily Davis',
        role: 'employer',
        isEmailVerified: true,
        phone: '+1234567895',
      },
    ]);
    console.log(`✅ Created ${employers.length} employers\n`);

    // Create Companies
    console.log('🏪 Creating companies...');
    const companies = await companyModel.insertMany([
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
      },
      {
        name: 'StartupXYZ Inc',
        description: 'Fast-growing startup revolutionizing the e-commerce space with AI-powered recommendations and seamless user experiences.',
        website: 'https://startupxyz.com',
        industry: 'E-commerce',
        companySize: '50-100',
        location: 'New York, NY',
        owner: employers[1]._id,
        employees: [employers[1]._id],
        twitterUrl: 'https://twitter.com/startupxyz',
        isVerified: true,
      },
      {
        name: 'Creative Design Studio',
        description: 'Award-winning design agency creating beautiful brands and digital experiences for clients worldwide.',
        website: 'https://designstudio.com',
        industry: 'Design',
        companySize: '10-50',
        location: 'Los Angeles, CA',
        owner: employers[2]._id,
        employees: [employers[2]._id],
        linkedinUrl: 'https://linkedin.com/company/designstudio',
        isVerified: true,
      },
    ]);
    console.log(`✅ Created ${companies.length} companies\n`);

    // Update employers with company references
    await userModel.findByIdAndUpdate(employers[0]._id, { company: companies[0]._id });
    await userModel.findByIdAndUpdate(employers[1]._id, { company: companies[1]._id });
    await userModel.findByIdAndUpdate(employers[2]._id, { company: companies[2]._id });

    // Create Subscriptions for employers
    console.log('💳 Creating subscriptions...');
    await subscriptionModel.insertMany([
      {
        user: employers[0]._id,
        plan: 'pro',
        status: 'active',
        jobPostsLimit: 100,
        jobPostsUsed: 0,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        user: employers[1]._id,
        plan: 'basic',
        status: 'active',
        jobPostsLimit: 25,
        jobPostsUsed: 0,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        user: employers[2]._id,
        plan: 'free',
        status: 'active',
        jobPostsLimit: 5,
        jobPostsUsed: 0,
      },
    ]);
    console.log('✅ Created subscriptions\n');

    // Create Jobs
    console.log('💼 Creating job listings...');
    const jobs = await jobModel.insertMany([
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
        description: `Join our team as a Frontend Developer and help build amazing user interfaces for our e-commerce platform.

What you'll do:
- Build responsive web applications with React
- Collaborate with designers to implement pixel-perfect UIs
- Optimize application performance
- Write unit and integration tests`,
        requirements: `- 3+ years of React experience
- Strong understanding of HTML, CSS, JavaScript
- Experience with Next.js is a plus
- Familiarity with TypeScript
- Understanding of responsive design
- Portfolio of previous work`,
        company: companies[1]._id,
        postedBy: employers[1]._id,
        location: 'New York, NY',
        isRemote: false,
        jobType: 'full-time',
        experienceLevel: 'mid',
        salaryMin: 90000,
        salaryMax: 130000,
        currency: 'USD',
        skills: ['React', 'JavaScript', 'HTML', 'CSS', 'TypeScript', 'Next.js'],
        benefits: ['Health Insurance', 'Gym Membership', 'Free Lunch', 'Learning Budget'],
        status: 'open',
        isFeatured: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'UI/UX Designer',
        description: `Creative Design Studio is looking for a talented UI/UX Designer to join our team and work on exciting client projects.

Role Overview:
- Design beautiful and intuitive user interfaces
- Conduct user research and usability testing
- Create wireframes, prototypes, and high-fidelity designs
- Collaborate with developers to ensure design implementation`,
        requirements: `- 2+ years of UI/UX design experience
- Proficiency in Figma and Adobe Creative Suite
- Strong portfolio demonstrating design skills
- Understanding of user-centered design principles
- Excellent visual design skills
- Good communication skills`,
        company: companies[2]._id,
        postedBy: employers[2]._id,
        location: 'Los Angeles, CA',
        isRemote: true,
        jobType: 'full-time',
        experienceLevel: 'mid',
        salaryMin: 80000,
        salaryMax: 110000,
        currency: 'USD',
        skills: ['Figma', 'Adobe XD', 'UI Design', 'UX Design', 'Prototyping', 'User Research'],
        benefits: ['Health Insurance', 'Remote Work', 'Creative Freedom', 'Conference Budget'],
        status: 'open',
        isFeatured: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Backend Engineer (Node.js)',
        description: `Looking for a skilled Backend Engineer to build and maintain our API services and microservices architecture.`,
        requirements: `- 4+ years of backend development experience
- Expert knowledge of Node.js and Express/Nest.js
- Experience with MongoDB or PostgreSQL
- Understanding of microservices architecture
- Experience with Docker and Kubernetes`,
        company: companies[0]._id,
        postedBy: employers[0]._id,
        location: 'San Francisco, CA',
        isRemote: true,
        jobType: 'full-time',
        experienceLevel: 'senior',
        salaryMin: 130000,
        salaryMax: 170000,
        currency: 'USD',
        skills: ['Node.js', 'Nest.js', 'MongoDB', 'Docker', 'Kubernetes', 'Microservices'],
        benefits: ['Health Insurance', '401k', 'Remote Work', 'Stock Options'],
        status: 'open',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Product Manager',
        description: `We're seeking an experienced Product Manager to lead our product strategy and roadmap.`,
        requirements: `- 3+ years of product management experience
- Strong analytical and strategic thinking skills
- Experience with agile methodologies
- Excellent communication skills
- Technical background preferred`,
        company: companies[1]._id,
        postedBy: employers[1]._id,
        location: 'New York, NY',
        isRemote: false,
        jobType: 'full-time',
        experienceLevel: 'senior',
        salaryMin: 110000,
        salaryMax: 150000,
        currency: 'USD',
        skills: ['Product Management', 'Agile', 'Analytics', 'Strategy', 'Communication'],
        benefits: ['Health Insurance', 'Stock Options', 'Free Lunch'],
        status: 'open',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'DevOps Engineer',
        description: `Join our DevOps team to build and maintain our cloud infrastructure and CI/CD pipelines.`,
        requirements: `- 3+ years of DevOps experience
- Strong knowledge of AWS/GCP/Azure
- Experience with Terraform or CloudFormation
- CI/CD pipeline expertise (Jenkins, GitLab CI, GitHub Actions)
- Container orchestration (Docker, Kubernetes)`,
        company: companies[0]._id,
        postedBy: employers[0]._id,
        location: 'Remote',
        isRemote: true,
        jobType: 'full-time',
        experienceLevel: 'mid',
        salaryMin: 100000,
        salaryMax: 140000,
        currency: 'USD',
        skills: ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD', 'Linux'],
        benefits: ['Health Insurance', 'Remote Work', 'Learning Budget'],
        status: 'open',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Marketing Specialist',
        description: `Looking for a creative Marketing Specialist to drive our growth and brand awareness.`,
        requirements: `- 2+ years of digital marketing experience
- Experience with SEO, SEM, and social media marketing
- Strong analytical skills
- Content creation experience
- Google Analytics and marketing automation tools`,
        company: companies[1]._id,
        postedBy: employers[1]._id,
        location: 'New York, NY',
        isRemote: true,
        jobType: 'full-time',
        experienceLevel: 'entry',
        salaryMin: 60000,
        salaryMax: 85000,
        currency: 'USD',
        skills: ['Digital Marketing', 'SEO', 'Content Marketing', 'Social Media', 'Analytics'],
        benefits: ['Health Insurance', 'Remote Work', 'Flexible Hours'],
        status: 'open',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Graphic Designer Intern',
        description: `Internship opportunity for aspiring graphic designers to work on real client projects.`,
        requirements: `- Currently enrolled in or recent graduate of design program
- Proficiency in Adobe Creative Suite
- Portfolio of design work
- Passion for visual design
- Eagerness to learn`,
        company: companies[2]._id,
        postedBy: employers[2]._id,
        location: 'Los Angeles, CA',
        isRemote: false,
        jobType: 'internship',
        experienceLevel: 'entry',
        salaryMin: 20000,
        salaryMax: 30000,
        currency: 'USD',
        skills: ['Adobe Photoshop', 'Adobe Illustrator', 'Graphic Design', 'Typography'],
        benefits: ['Mentorship', 'Portfolio Building', 'Flexible Schedule'],
        status: 'open',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Mobile Developer (React Native)',
        description: `Build cross-platform mobile applications for our growing user base.`,
        requirements: `- 3+ years of React Native experience
- Published apps on App Store and Play Store
- Strong JavaScript/TypeScript skills
- Experience with mobile app optimization
- Understanding of mobile UI/UX best practices`,
        company: companies[1]._id,
        postedBy: employers[1]._id,
        location: 'Remote',
        isRemote: true,
        jobType: 'full-time',
        experienceLevel: 'mid',
        salaryMin: 95000,
        salaryMax: 135000,
        currency: 'USD',
        skills: ['React Native', 'JavaScript', 'TypeScript', 'Mobile Development', 'iOS', 'Android'],
        benefits: ['Health Insurance', 'Remote Work', 'Equipment Allowance'],
        status: 'open',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Data Analyst',
        description: `Analyze data to drive business decisions and create insightful reports for stakeholders.`,
        requirements: `- 2+ years of data analysis experience
- Proficiency in SQL and Excel
- Experience with data visualization tools (Tableau, Power BI)
- Strong analytical and problem-solving skills
- Ability to communicate insights clearly`,
        company: companies[0]._id,
        postedBy: employers[0]._id,
        location: 'San Francisco, CA',
        isRemote: true,
        jobType: 'full-time',
        experienceLevel: 'entry',
        salaryMin: 70000,
        salaryMax: 95000,
        currency: 'USD',
        skills: ['SQL', 'Excel', 'Tableau', 'Data Analysis', 'Python', 'Statistics'],
        benefits: ['Health Insurance', 'Remote Work', 'Professional Development'],
        status: 'open',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    ]);
    console.log(`✅ Created ${jobs.length} job listings\n`);

    // Create Activity Logs
    console.log('📝 Creating activity logs...');
    const activities = await activityModel.insertMany([
      {
        type: ActivityType.USER_REGISTRATION,
        description: 'New user registered',
        userId: jobSeekers[0]._id,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      {
        type: ActivityType.USER_LOGIN,
        description: 'User logged in',
        userId: employers[0]._id,
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      {
        type: ActivityType.JOB_POSTED,
        description: 'New job posted',
        userId: employers[0]._id,
        jobId: jobs[0]._id,
        ipAddress: '192.168.1.102',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      {
        type: ActivityType.APPLICATION_SUBMITTED,
        description: 'Application submitted',
        userId: jobSeekers[1]._id,
        jobId: jobs[0]._id,
        ipAddress: '192.168.1.103',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      },
      {
        type: ActivityType.SUBSCRIPTION_CREATED,
        description: 'Subscription created',
        userId: employers[1]._id,
        ipAddress: '192.168.1.104',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      {
        type: ActivityType.PROFILE_UPDATED,
        description: 'Profile updated',
        userId: jobSeekers[2]._id,
        ipAddress: '192.168.1.105',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    ]);
    console.log(`✅ Created ${activities.length} activity logs\n`);

    // Summary
    console.log('📊 Seeding Summary:');
    console.log('═══════════════════════════════════');
    console.log(`👤 Admin Users: 1`);
    console.log(`👥 Job Seekers: ${jobSeekers.length}`);
    console.log(`🏢 Employers: ${employers.length}`);
    console.log(`🏪 Companies: ${companies.length}`);
    console.log(`💼 Jobs: ${jobs.length}`);
    console.log(`📝 Activities: ${activities.length}`);
    console.log('═══════════════════════════════════\n');

    console.log('📧 Test Account Credentials:');
    console.log('═══════════════════════════════════');
    console.log('🔐 Admin:');
    console.log('   Email: admin@jobportal.com');
    console.log('   Password: Admin@123\n');
    console.log('👤 Job Seeker:');
    console.log('   Email: john.doe@example.com');
    console.log('   Password: Password@123\n');
    console.log('🏢 Employer:');
    console.log('   Email: hr@techcorp.com');
    console.log('   Password: Password@123\n');
    console.log('═══════════════════════════════════\n');

    console.log('✨ Database seeding completed successfully!');
    console.log('🚀 You can now run: npm run dev');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await app.close();
  }
}

seed();

