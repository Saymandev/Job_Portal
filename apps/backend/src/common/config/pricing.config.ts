export interface PricingConfig {
  basic: number;
  pro: number;
  enterprise: number;
}

export const PRICING_CONFIG: PricingConfig = {
  basic: 49,
  pro: 149,
  enterprise: 499,
};

export const getPlanPrice = (plan: string): number => {
  switch (plan) {
    case 'basic':
      return PRICING_CONFIG.basic;
    case 'pro':
      return PRICING_CONFIG.pro;
    case 'enterprise':
      return PRICING_CONFIG.enterprise;
    default:
      return 0;
  }
};
