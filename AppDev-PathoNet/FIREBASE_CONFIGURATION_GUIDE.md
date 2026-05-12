# Firebase Configuration Guide

## Overview

This application uses Firebase for authentication and Firestore for data storage. The Firebase configuration is designed to be production-ready with graceful fallbacks for development environments.

## Environment Variables

The following environment variables must be set in your `.env` file:

```bash
# Required Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Setup Instructions

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Enable Authentication (Email/Password)
4. Create Firestore Database

### 2. Get Configuration

1. In Firebase Console, go to Project Settings
2. Under "Your apps", add a Web app
3. Copy the `firebaseConfig` object
4. Add the values to your `.env` file

### 3. Environment Files

- `.env` - Local development (gitignored)
- `.env.example` - Template file (tracked in git)
- `.env.production` - Production environment (gitignored)

## Graceful Degradation

The Firebase configuration includes graceful fallbacks:

- **Missing Config**: App continues to run with mock implementations
- **Initialization Error**: App continues with warning messages
- **Runtime Errors**: Auth operations return mock data instead of crashing

## Helper Functions

### `isFirebaseAvailable()`

Returns `true` if Firebase is properly configured and initialized.

```typescript
import { isFirebaseAvailable } from '@/lib/firebase';

if (isFirebaseAvailable()) {
  // Firebase features are available
} else {
  // Show configuration warning or fallback UI
}
```

### `getFirebaseStatus()`

Returns detailed status information:

```typescript
import { getFirebaseStatus } from '@/lib/firebase';

const status = getFirebaseStatus();
console.log(status); // { isAvailable: boolean, missingKeys: string[], appInitialized: boolean }
```

## Production Deployment

### Environment Variables in Production

1. Set environment variables in your hosting platform
2. Ensure `EXPO_PUBLIC_` prefix is maintained
3. Verify all required keys are present

### Security Considerations

- Never commit `.env` files to version control
- Use different Firebase projects for development and production
- Enable Firebase security rules for Firestore
- Configure proper authentication methods

## Troubleshooting

### Common Issues

1. **"Missing Firebase configuration"**
   - Check `.env` file exists
   - Verify `EXPO_PUBLIC_` prefix
   - Restart the development server

2. **"Firebase Auth is not available"**
   - Environment variables are missing
   - Check console for warning messages
   - Use `getFirebaseStatus()` to diagnose

3. **TypeScript Errors**
   - Firebase types should work with mock implementations
   - Use type assertions if needed: `auth as Auth`

### Debug Mode

Enable debug logging by checking the console for Firebase-related messages:

```bash
[Firebase] Missing required config keys: apiKey, projectId, appId
[Firebase] Please set EXPO_PUBLIC_FIREBASE_* environment variables in .env
[Firebase] Running in development mode without Firebase - some features will be limited
```

## Best Practices

1. **Always check Firebase availability** before using Firebase features
2. **Provide fallback UI** for when Firebase is not configured
3. **Use environment-specific configurations**
4. **Monitor Firebase usage** in production
5. **Keep Firebase SDK updated** to latest version

## Example Usage

```typescript
import { auth, db, isFirebaseAvailable } from '@/lib/firebase';

// Check availability before using Firebase
if (isFirebaseAvailable()) {
  // Use Firebase features
  const user = await signInWithEmailAndPassword(auth, email, password);
  const doc = await getDoc(doc(db, 'users', user.uid));
} else {
  // Show configuration warning
  Alert.alert('Firebase Not Configured', 'Please set up Firebase credentials');
}
```
