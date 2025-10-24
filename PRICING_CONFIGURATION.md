# Pricing Configuration

This document explains how to update subscription pricing across the application.

## Centralized Pricing Configuration

Pricing is now centralized in two configuration files:

### Backend Configuration
**File:** `apps/backend/src/common/config/pricing.config.ts`

```typescript
export const PRICING_CONFIG: PricingConfig = {
  basic: 49,      // $49/month
  pro: 149,       // $149/2 months
  enterprise: 499, // $499/3 months
};
```

### Frontend Configuration
**File:** `apps/frontend/src/lib/pricing.config.ts`

```typescript
export const PRICING_CONFIG: PricingConfig = {
  basic: 49,      // $49/month
  pro: 149,       // $149/2 months
  enterprise: 499, // $499/3 months
};
```

## How to Update Pricing

1. **Update both configuration files** with the new prices
2. **Restart the backend** to apply changes
3. **Rebuild the frontend** to apply changes

## What Gets Updated Automatically

When you update the pricing configuration, the following will automatically use the new prices:

- ✅ Revenue calculations in admin dashboard
- ✅ Revenue analytics charts
- ✅ Subscription management pages
- ✅ Pricing page display
- ✅ All revenue-related calculations

## Important Notes

- **Keep both files in sync** - Backend and frontend must have the same prices
- **Test thoroughly** - Verify all revenue calculations work correctly
- **Update Stripe** - If using Stripe, update the price IDs in environment variables
- **Consider existing subscriptions** - Price changes only affect new subscriptions

## Current Pricing Structure

| Plan | Price | Interval | Features |
|------|-------|----------|----------|
| Basic | $49 | Monthly | 25 job posts, 3 boosts, enhanced analytics |
| Pro | $149 | 2 months | 100 job posts, 10 boosts, API access, custom branding |
| Enterprise | $499 | 3 months | Unlimited posts, 50 boosts, white-label, dedicated support |

## Environment Variables (Stripe)

Make sure these environment variables match your Stripe configuration:

```env
STRIPE_PRICE_ID_BASIC=price_xxxxx
STRIPE_PRICE_ID_PRO=price_xxxxx
STRIPE_PRICE_ID_ENTERPRISE=price_xxxxx
```
