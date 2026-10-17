export const TRIAL_DAYS = Number(process.env.TRIAL_DAYS) || 14;

export type SubscriptionStatus = 'trial' | 'active' | 'suspended';

export const TRIAL_EXPIRED_CODE = 'TRIAL_EXPIRED';

export const TRIAL_EXPIRED_MESSAGE =
  'Your 14 day free trial is completed. To continue the service, contact our sales team.';

export const DEFAULT_PLATFORM_ADMIN_EMAIL = 'raj2732005@gmail.com';

