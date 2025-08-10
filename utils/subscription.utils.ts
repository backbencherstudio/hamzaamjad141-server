// Subscription utility constants
export const SUBSCRIPTION_DURATION_MS = 1 * 24 * 60 * 60 * 1000;  // 30 days in milliseconds
export const TRIAL_PERIOD_DAYS = 0; // 3 days trial period

// Helper function to calculate subscription end date
export const calculateSubscriptionEndDate = (startDate?: Date): Date => {
  const start = startDate || new Date();
  return new Date(start.getTime() + SUBSCRIPTION_DURATION_MS);
};

// Helper function to calculate trial end date
export const calculateTrialEndDate = (userCreationDate: Date): Date => {
  const trialEndDate = new Date(userCreationDate);
  trialEndDate.setDate(userCreationDate.getDate() + TRIAL_PERIOD_DAYS);
  return trialEndDate;
};

// Helper function to check if subscription is expired
export const isSubscriptionExpired = (endDate: Date): boolean => {
  return endDate <= new Date();
};
