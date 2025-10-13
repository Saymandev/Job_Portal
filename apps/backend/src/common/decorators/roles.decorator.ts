import { SetMetadata } from '@nestjs/common';

export enum Role {
  ADMIN = 'admin',
  EMPLOYER = 'employer',
  JOB_SEEKER = 'job_seeker',
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

