# Firebase Setup Guide for gennetex-erp

## Problem
The `/api/public-site` endpoint returns 500 errors because Firebase is not configured in your Vercel deployment.

## Solution

### Step 1: Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (gennetex)
3. Go to **Project Settings** (gear icon) → **Service Accounts**
4. Click **Generate New Private Key**
5. Save the JSON file safely

### Step 2: Add Environment Variable to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (gennetex)
3. Go to **Settings** → **Environment Variables**
4. Add new variable:
   - **Name:** `FIREBASE_SERVICE_ACCOUNT_JSON`
   - **Value:** Paste the entire JSON content from the service account key file
   - **Environments:** Check Production, Preview, Development

### Step 3: Set Up Firestore Collections

Make sure these Firestore collections exist:

#### `publicSiteContent` Collection
- **Document ID:** `main`
- **Fields:**
  ```json
  {
    "content": { /* your site content object */ },
    "updatedAt": "timestamp"
  }
  ```

#### `jobApplications` Collection
- Created automatically when first application is submitted
- **Fields stored:**
  ```json
  {
    "name": "string",
    "last_name": "string|null",
    "phone": "string|null",
    "email": "string|null",
    "position": "string|null",
    "source": "web",
    "status": "new",
    "form_data": { /* complete form object */ },
    "signature_svg": "string|null",
    "signed_at": "string (ISO)",
    "photo_attached": "boolean",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
  ```

### Step 4: Redeploy

1. Push your changes to GitHub:
   ```bash
   git push
   ```
2. Vercel will automatically redeploy
3. The `/api/public-site` endpoint should now work

## Testing

### Test GET Request
```bash
curl https://gennetex-as-vercel.app/api/public-site
```

Expected response:
```json
{
  "content": null,
  "updatedAt": null
}
```

### Test POST Request (Job Application)
```bash
curl -X POST https://gennetex-as-vercel.app/api/public-site \
  -H "Content-Type: application/json" \
  -d '{
    "form": {
      "general": {"firstName": "Test"},
      "personal": {},
      "jobInterest": {}
    },
    "signatureSvg": null,
    "signedAt": "2024-08-06T13:00:00Z",
    "photoAttached": false
  }'
```

## Troubleshooting

### If you still get 500 errors:
1. Check Vercel logs: Go to project → Deployments → Latest → Function logs
2. Verify `FIREBASE_SERVICE_ACCOUNT_JSON` is set correctly (no line breaks in middle of JSON)
3. Make sure the JSON is valid (use JSONLint.com)
4. Check that your Firebase project is active

### If you need to debug locally:
```bash
export FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
node -e "require('./api/public-site.js')"
```

## API Endpoints

### GET /api/public-site
Fetches the main site content.
- **Response:** `{ content: object|null, updatedAt: string|null }`

### POST /api/public-site
Submits a job application.
- **Body:** 
  ```json
  {
    "form": { /* JobApplicationFormData */ },
    "signatureSvg": "string|null",
    "signedAt": "string",
    "photoAttached": "boolean"
  }
  ```
- **Response:** `{ ok: true, id: "docId" }`

## Notes
- Images are not stored (photoAttached flag only)
- All data is stored in Firestore
- No Supabase required anymore
