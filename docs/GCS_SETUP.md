# Google Cloud Storage Setup Guide

This guide explains how to configure Google Cloud Storage authentication to avoid key expiration issues.

## Problem
The current setup uses a static `gcs-key.json` file that expires periodically, requiring manual regeneration.

## Solutions

### 🚀 Recommended: Environment Variables (Production)

Use environment variables to store your service account credentials. This method:
- ✅ Avoids key file expiration issues
- ✅ More secure (no files in codebase)
- ✅ Easier deployment management
- ✅ Works with any hosting platform

#### Method 1: Complete JSON Credentials

```bash
# Add to your .env file
GCLOUD_PROJECT=your-project-id
GCS_BUCKET=your-bucket-name
GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account","project_id":"your-project","private_key_id":"xxx","private_key":"-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n","client_email":"your-service@project.iam.gserviceaccount.com","client_id":"xxx","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/your-service%40project.iam.gserviceaccount.com","universe_domain":"googleapis.com"}'
```

#### Method 2: Individual Environment Variables

```bash
# Add to your .env file
GCLOUD_PROJECT=your-project-id
GCS_BUCKET=your-bucket-name
GCS_PRIVATE_KEY_ID=your-private-key-id
GCS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
GCS_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GCS_CLIENT_ID=your-client-id
GCS_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40project.iam.gserviceaccount.com
```

### 🔄 Auto-Refresh: Application Default Credentials (ADC)

When running on Google Cloud Platform (Cloud Run, App Engine, Compute Engine):
- Set `NODE_ENV=production`
- Remove the `GOOGLE_APPLICATION_CREDENTIALS_JSON` variable
- The system will automatically use service account attached to the compute resource

### 📄 Fallback: Key File (Development Only)

For local development, the system will automatically fall back to using `config/gcs-key.json`.

## Setup Instructions

### Step 1: Get Service Account Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **IAM & Admin** → **Service Accounts**
3. Create a new service account or use existing one
4. Click on the service account
5. Go to **Keys** tab
6. Click **Add Key** → **Create New Key** → **JSON**
7. Download the JSON file

### Step 2: Configure Environment Variables

Choose one of the methods above and add the variables to your `.env` file.

#### For Method 1 (Complete JSON):
```bash
# Copy the entire content of your downloaded JSON file
GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account",...}'
```

#### For Method 2 (Individual fields):
Extract each field from your JSON file and set them individually.

### Step 3: Set Required Variables

Always set these regardless of authentication method:
```bash
GCLOUD_PROJECT=your-project-id
GCS_BUCKET=your-bucket-name
```

### Step 4: Remove or Secure Key File

If using environment variables:
1. Delete `config/gcs-key.json` (it's already in .gitignore)
2. Or keep it only for local development

## Deployment Configurations

### Vercel
```bash
# Add these to Vercel environment variables
GCLOUD_PROJECT=your-project-id
GCS_BUCKET=your-bucket-name
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
```

### Heroku
```bash
# Add these to Heroku config vars
heroku config:set GCLOUD_PROJECT=your-project-id
heroku config:set GCS_BUCKET=your-bucket-name
heroku config:set GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account",...}'
```

### Docker
```bash
# In your docker-compose.yml or Dockerfile
environment:
  - GCLOUD_PROJECT=your-project-id
  - GCS_BUCKET=your-bucket-name
  - GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
```

### Google Cloud Run
```bash
# Deploy with environment variables
gcloud run deploy your-app \
  --set-env-vars GCLOUD_PROJECT=your-project-id,GCS_BUCKET=your-bucket-name \
  --set-env-vars GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account",...}'

# Or use Cloud Run service account (recommended)
gcloud run deploy your-app \
  --set-env-vars GCLOUD_PROJECT=your-project-id,GCS_BUCKET=your-bucket-name,NODE_ENV=production
```

## Security Best Practices

1. **Never commit service account keys to version control**
2. **Use environment variables for production**
3. **Rotate service account keys regularly**
4. **Use minimal required permissions for the service account**
5. **Monitor service account usage**

## Required IAM Permissions

Your service account needs these Cloud Storage permissions:
- `storage.objects.create`
- `storage.objects.delete`
- `storage.objects.get`
- `storage.objects.list`

Or use predefined role: **Storage Object Admin**

## Troubleshooting

### Common Issues

1. **"Invalid key file" error**
   - Check if key file exists and is valid JSON
   - Try using environment variables instead

2. **"Permission denied" error**
   - Verify service account has correct IAM permissions
   - Check if bucket name is correct

3. **"Project not found" error**
   - Verify `GCLOUD_PROJECT` is set correctly
   - Ensure project ID (not name) is used

4. **Environment variable not working**
   - Ensure no extra spaces in JSON
   - Check for properly escaped quotes
   - Verify environment variables are loaded

### Testing Configuration

Add this test endpoint to verify GCS setup:
```typescript
app.get('/test-gcs', async (req, res) => {
  try {
    const { getGCSAuth } = require('./utils/gcsAuth.utils');
    const { Storage } = require('@google-cloud/storage');
    
    const storage = new Storage(getGCSAuth());
    const [buckets] = await storage.getBuckets();
    
    res.json({ 
      success: true, 
      message: 'GCS connection successful',
      buckets: buckets.map(b => b.name)
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});
```

## Migration Steps

1. **Backup current setup**
2. **Choose authentication method**
3. **Set environment variables**
4. **Update deployment configuration**
5. **Test thoroughly**
6. **Remove old key file** (optional)

This setup will eliminate the need to regenerate keys manually and provide a more robust authentication system.
