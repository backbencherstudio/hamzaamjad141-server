// Subscription utility constants
export const SUBSCRIPTION_DURATION_MS = 1 * 24 * 60 * 60 * 1000; // 1 day in milliseconds
export const TRIAL_PERIOD_MS = 2 * 60 * 1000; // 5 minutes trial period in milliseconds

// Helper function to calculate subscription end date
export const calculateSubscriptionEndDate = (startDate?: Date): Date => {
  const start = startDate || new Date();
  return new Date(start.getTime() + SUBSCRIPTION_DURATION_MS);
};

// Helper function to calculate trial end date
export const calculateTrialEndDate = (userCreationDate: Date): Date => {
  return new Date(userCreationDate.getTime() + TRIAL_PERIOD_MS);
};

// Helper function to check if subscription is expired
export const isSubscriptionExpired = (endDate: Date): boolean => {
  return endDate <= new Date();
};

// Helper function to check if user is in trial period
export const isUserInTrial = (userCreationDate: Date): boolean => {
  const trialEndDate = calculateTrialEndDate(userCreationDate);
  return new Date() < trialEndDate;
};

// Helper function to get remaining trial time in milliseconds
export const getRemainingTrialTime = (userCreationDate: Date): number => {
  const trialEndDate = calculateTrialEndDate(userCreationDate);
  const now = new Date();
  return Math.max(0, trialEndDate.getTime() - now.getTime());
};

// Helper function to determine if user should have premium access
export const shouldUserHavePremiumAccess = (userCreationDate: Date, activeSubscription?: any): boolean => {
  // Check if user is in trial period
  if (isUserInTrial(userCreationDate)) {
    return true;
  }
  
  // Check if user has valid subscription
  if (activeSubscription && activeSubscription.status === "ACTIVE" && activeSubscription.endDate > new Date()) {
    return true;
  }
  
  return false;
};
