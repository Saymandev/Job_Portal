import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Company, CompanyDocument } from './schemas/company.schema';

@Injectable()
export class CompaniesService {
  constructor(@InjectModel(Company.name) private companyModel: Model<CompanyDocument>) {}

  async create(userId: string, createCompanyDto: CreateCompanyDto): Promise<CompanyDocument> {
    const company = await this.companyModel.create({
      ...createCompanyDto,
      owner: userId,
      employees: [userId],
    });

    return company;
  }

  async findAll(filters?: any): Promise<CompanyDocument[]> {
    const query: any = { isActive: true };

    if (filters?.industry) {
      query.industry = filters.industry;
    }

    return this.companyModel.find(query).populate('owner', 'fullName email');
  }

  async findById(id: string): Promise<CompanyDocument> {
    const company = await this.companyModel.findById(id).populate('owner', 'fullName email');

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  async findByOwner(userId: string): Promise<CompanyDocument> {
    return this.companyModel.findOne({ owner: userId });
  }

  async update(
    id: string,
    userId: string,
    updateCompanyDto: UpdateCompanyDto,
  ): Promise<CompanyDocument> {
    const company = await this.companyModel.findById(id);

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (company.owner.toString() !== userId) {
      throw new ForbiddenException('You do not have permission to update this company');
    }

    Object.assign(company, updateCompanyDto);
    await company.save();

    return company;
  }

  async delete(id: string, userId: string): Promise<void> {
    const company = await this.companyModel.findById(id);

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (company.owner.toString() !== userId) {
      throw new ForbiddenException('You do not have permission to delete this company');
    }

    company.isActive = false;
    await company.save();
  }

  async uploadLogo(id: string, userId: string, logoPath: string): Promise<CompanyDocument> {
    const company = await this.companyModel.findById(id);

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (company.owner.toString() !== userId) {
      throw new ForbiddenException('You do not have permission to update this company');
    }

    company.logo = logoPath;
    await company.save();

    return company;
  }
}

