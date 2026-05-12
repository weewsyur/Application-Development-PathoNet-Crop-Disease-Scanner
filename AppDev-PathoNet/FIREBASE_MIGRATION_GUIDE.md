# Firebase Migration Guide

## Migration Complete ✅

Your project has been successfully configured for Firebase Hosting deployment. Here's what has been updated:

### Files Changed:
1. **firebase.json** - Updated with proper hosting configuration
2. **package.json** - Added Firebase deployment scripts
3. **.firebaserc** - Created for project configuration
4. **api/package.json** - Created for Firebase Functions
5. **api/index.js** - Created as placeholder for API migration

## Next Steps:

### 1. Install Firebase CLI
```bash
npm install -g firebase-tools
```

### 2. Login to Firebase
```bash
firebase login
```

### 3. Initialize Firebase Project
```bash
firebase init
```

### 4. Update Project ID
Edit `.firebaserc` and replace `your_project_id` with your actual Firebase project ID.

### 5. Update Environment Variables
Update your `.env` file with Firebase configuration:
- Get your Firebase config from Firebase Console → Project Settings → General
- Update the Firebase variables in `.env.example` and create your `.env` file

### 6. Deploy Commands
```bash
# Build and deploy hosting only
npm run build:firebase

# Deploy everything (hosting + functions)
npm run deploy

# Deploy only hosting
npm run deploy:hosting

# Deploy only functions
npm run deploy:functions
```

## Important Notes:

### API Migration Required
Your Python API (`api/index.py`) needs to be migrated to work with Firebase Functions. You have two options:

1. **Convert to Node.js** (Recommended for Firebase Functions)
2. **Use Cloud Run** for Python container deployment

### Current API Status
The placeholder API in `api/index.js` returns a 503 error indicating the Python API needs migration.

### Environment Variables
Update your environment variables for Firebase:
- `EXPO_PUBLIC_PRODUCTION_API_URL` should point to your Firebase Functions URL
- Firebase config variables need to be updated with your project details

## Testing After Migration:
1. Run `npm run build:firebase` to test the build process
2. Test locally with `firebase serve`
3. Deploy to staging first before production

## Cleanup:
- Remove `vercel.json` after successful migration
- Update any hardcoded Vercel URLs in your code
- Remove any Vercel-specific configurations
