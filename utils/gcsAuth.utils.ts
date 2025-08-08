import path from "path";

export interface GCSAuthConfig {
  projectId?: string;
  credentials?: any;
  keyFilename?: string;
}

/**
 * Get Google Cloud Storage authentication configuration
 * Supports multiple authentication methods with automatic fallback
 */
export const getGCSAuth = (): GCSAuthConfig => {
  // Option 1: Use environment variables for credentials (recommended for production)
  // This method allows you to set the entire service account key as an environment variable
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try {
      const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      return {
        projectId: process.env.GCLOUD_PROJECT,
        credentials
      };
    } catch (error) {
      console.error("Error parsing GOOGLE_APPLICATION_CREDENTIALS_JSON:", error);
      // Fall through to next method
    }
  }
  
  // Option 2: Use individual environment variables for service account details
  if (process.env.GCS_PRIVATE_KEY && process.env.GCS_CLIENT_EMAIL) {
    const credentials = {
      type: "service_account",
      project_id: process.env.GCLOUD_PROJECT,
      private_key_id: process.env.GCS_PRIVATE_KEY_ID,
      private_key: process.env.GCS_PRIVATE_KEY.replace(/\\n/g, '\n'), // Handle escaped newlines
      client_email: process.env.GCS_CLIENT_EMAIL,
      client_id: process.env.GCS_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.GCS_CLIENT_X509_CERT_URL,
      universe_domain: "googleapis.com"
    };
    
    return {
      projectId: process.env.GCLOUD_PROJECT,
      credentials
    };
  }
  
  // Option 3: Use Application Default Credentials (ADC) when running on GCP
  // This works automatically when running on Google Cloud Platform services
  if (process.env.NODE_ENV === 'production' && !process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    return {
      projectId: process.env.GCLOUD_PROJECT
      // No credentials needed - ADC will be used automatically
    };
  }
  
  // Option 4: Fallback to key file for local development
  const keyFilePath = path.join(__dirname, "../config/gcs-key.json");
  console.warn("⚠️  Using fallback GCS key file. Consider using environment variables for production.");
  
  return {
    projectId: process.env.GCLOUD_PROJECT,
    keyFilename: keyFilePath
  };
};

/**
 * Validate GCS configuration
 */
export const validateGCSConfig = (): boolean => {
  if (!process.env.GCLOUD_PROJECT) {
    console.error("❌ GCLOUD_PROJECT environment variable is required");
    return false;
  }
  
  if (!process.env.GCS_BUCKET) {
    console.error("❌ GCS_BUCKET environment variable is required");
    return false;
  }
  
  return true;
};

/**
 * Get environment variables template for GCS setup
 */
export const getGCSEnvTemplate = (): string => {
  return `
# Google Cloud Storage Configuration
GCLOUD_PROJECT=your-project-id
GCS_BUCKET=your-bucket-name

# Method 1: Complete service account JSON (recommended for production)
GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"...","universe_domain":"googleapis.com"}'

# Method 2: Individual service account fields (alternative)
GCS_PRIVATE_KEY_ID=your-private-key-id
GCS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"
GCS_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GCS_CLIENT_ID=your-client-id
GCS_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40project.iam.gserviceaccount.com
  `.trim();
};
