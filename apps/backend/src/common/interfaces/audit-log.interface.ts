export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

export enum AuditAction {
  CREATE_JOB = 'CREATE_JOB',
  UPDATE_JOB = 'UPDATE_JOB',
  DELETE_JOB = 'DELETE_JOB',
  CREATE_APPLICATION = 'CREATE_APPLICATION',
  UPDATE_SUBSCRIPTION = 'UPDATE_SUBSCRIPTION',
  SUBSCRIPTION_CANCELLED_BY_ADMIN = 'SUBSCRIPTION_CANCELLED_BY_ADMIN',
  SUBSCRIPTION_REACTIVATED_BY_ADMIN = 'SUBSCRIPTION_REACTIVATED_BY_ADMIN',
  UPDATE_USER_PROFILE = 'UPDATE_USER_PROFILE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  ADMIN_ACTION = 'ADMIN_ACTION',
}

export enum AuditResource {
  JOB = 'JOB',
  APPLICATION = 'APPLICATION',
  SUBSCRIPTION = 'SUBSCRIPTION',
  USER = 'USER',
  COMPANY = 'COMPANY',
}
