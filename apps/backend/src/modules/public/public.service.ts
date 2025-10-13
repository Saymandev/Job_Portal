import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Application, ApplicationDocument } from '../applications/schemas/application.schema';
import { Company, CompanyDocument } from '../companies/schemas/company.schema';
import { Job, JobDocument } from '../jobs/schemas/job.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class PublicService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
  ) {}

  async getPublicStats() {
    const [
      totalUsers,
      activeJobs,
      totalApplications,
      totalCompanies,
    ] = await Promise.all([
      this.userModel.countDocuments({ isActive: true }),
      this.jobModel.countDocuments({ status: 'open' }),
      this.applicationModel.countDocuments(),
      this.companyModel.countDocuments(),
    ]);

    // Get job seekers vs employers count
    const usersByRole = await this.userModel.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);

    const jobSeekers = usersByRole.find(u => u._id === 'job_seeker')?.count || 0;
    const employers = usersByRole.find(u => u._id === 'employer')?.count || 0;

    return {
      totalUsers,
      activeJobs,
      totalApplications,
      totalCompanies,
      jobSeekers,
      employers,
    };
  }
}
