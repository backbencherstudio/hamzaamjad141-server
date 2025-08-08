import { Request, Response } from "express";
import { Storage } from "@google-cloud/storage";
import { getGCSAuth, validateGCSConfig, getGCSEnvTemplate } from "../../../utils/gcsAuth.utils";

export const testGCSConnection = async (req: Request, res: Response) => {
  try {
    // Validate configuration first
    if (!validateGCSConfig()) {
      return res.status(400).json({
        success: false,
        message: "Invalid GCS configuration",
        envTemplate: getGCSEnvTemplate()
      });
    }

    // Test connection
    const storage = new Storage(getGCSAuth());
    
    // Test bucket access
    const bucket = storage.bucket(process.env.GCS_BUCKET!);
    const [exists] = await bucket.exists();
    
    if (!exists) {
      return res.status(404).json({
        success: false,
        message: `Bucket '${process.env.GCS_BUCKET}' not found or not accessible`
      });
    }

    // Test listing files (this will also verify permissions)
    const [files] = await bucket.getFiles({ maxResults: 5 });

    res.json({
      success: true,
      message: "GCS connection successful",
      config: {
        projectId: process.env.GCLOUD_PROJECT,
        bucket: process.env.GCS_BUCKET,
        authMethod: getAuthMethod(),
        filesCount: files.length,
        sampleFiles: files.slice(0, 3).map(file => ({
          name: file.name,
          size: file.metadata.size,
          updated: file.metadata.updated
        }))
      }
    });

  } catch (error: any) {
    console.error("GCS Test Error:", error);
    
    res.status(500).json({
      success: false,
      message: "GCS connection failed",
      error: error.message,
      troubleshooting: {
        suggestions: [
          "Check if GCLOUD_PROJECT is set correctly",
          "Verify GCS_BUCKET exists and is accessible",
          "Ensure service account has proper permissions",
          "Try using environment variables instead of key file"
        ],
        envTemplate: getGCSEnvTemplate()
      }
    });
  }
};

export const getSystemInfo = async (req: Request, res: Response) => {
  try {
    const authMethod = getAuthMethod();
    
    res.json({
      success: true,
      system: {
        nodeEnv: process.env.NODE_ENV,
        gcs: {
          projectId: process.env.GCLOUD_PROJECT || "Not set",
          bucket: process.env.GCS_BUCKET || "Not set",
          authMethod,
          configValid: validateGCSConfig()
        },
        database: {
          url: process.env.DATABASE_URL ? "Set" : "Not set"
        },
        stripe: {
          secretKey: process.env.STRIPE_SECRET_KEY ? "Set" : "Not set",
          priceId: process.env.STRIPE_MONTHLY_PRICE_ID ? "Set" : "Not set",
          webhook: process.env.STRIPE_WEBHOOK_SECRET ? "Set" : "Not set"
        },
        jwt: {
          secret: process.env.JWT_SECRET ? "Set" : "Not set"
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error getting system info",
      error: error.message
    });
  }
};

// Helper function to determine authentication method
const getAuthMethod = (): string => {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    return "Environment Variable (Complete JSON)";
  }
  
  if (process.env.GCS_PRIVATE_KEY && process.env.GCS_CLIENT_EMAIL) {
    return "Environment Variables (Individual fields)";
  }
  
  if (process.env.NODE_ENV === 'production' && !process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    return "Application Default Credentials (ADC)";
  }
  
  return "Key File (Fallback)";
};
