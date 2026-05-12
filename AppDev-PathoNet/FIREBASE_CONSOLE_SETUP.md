# Firebase Console Setup Guide

## Fix reCAPTCHA Authentication Error

The reCAPTCHA error occurs when Firebase Auth is not properly configured for web applications.

## Required Firebase Console Settings

### 1. Enable Email/Password Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `appdev---pathonet`
3. Navigate to **Authentication** → **Sign-in method**
4. Enable **Email/Password** provider
5. Click **Save**

### 2. Configure Authorized Domains

1. In Firebase Console, go to **Authentication** → **Settings**
2. Scroll down to **Authorized domains**
3. Add these domains:
   - `localhost`
   - `127.0.0.1`
   - `localhost:8081`
   - Your production domain when deployed

### 3. reCAPTCHA Configuration

1. In **Authentication** → **Sign-in method** → **Email/Password**
2. Expand **Advanced settings**
3. Ensure **reCAPTCHA** is enabled
4. For development, you can use invisible reCAPTCHA

### 4. Web App Configuration

1. Go to **Project Settings** → **General**
2. Under **Your apps**, find your web app
3. Ensure the **App ID** matches: `1:41661844235:web:764d5f91bcd8908302700e`
4. Verify **Web API Key** is correct

## Common reCAPTCHA Issues and Solutions

### Issue: "reCAPTCHA verification failed"
**Solution**: 
- Check network connection
- Ensure browser allows third-party cookies
- Clear browser cache and try again

### Issue: "App verification disabled"
**Solution**:
- Verify authorized domains in Firebase Console
- Check that Firebase project ID matches configuration

### Issue: CORS errors with reCAPTCHA
**Solution**:
- Add development domain to authorized domains
- Ensure Firebase SDK version is up to date

## Testing Authentication

### Test with Firebase Emulator (Optional)
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Start auth emulator
firebase emulators:start --only auth
```

### Test with Real Firebase
1. Create a test user in Firebase Console
2. Try signing in with those credentials
3. Check browser console for detailed error messages

## Production Deployment Checklist

- [ ] Add production domain to authorized domains
- [ ] Enable reCAPTCHA for production
- [ ] Test authentication in production environment
- [ ] Monitor Firebase usage and errors
- [ ] Set up Firebase security rules

## Debugging Tips

### Check Firebase Initialization
```javascript
import { getFirebaseStatus } from '@/lib/firebase';

console.log('Firebase Status:', getFirebaseStatus());
```

### Monitor Auth Errors
```javascript
import { getAuth } from 'firebase/auth';

const auth = getAuth();
auth.onAuthStateChanged((user) => {
  console.log('Auth state changed:', user);
});
```

### Network Issues
- Check firewall settings
- Verify no ad-blockers are blocking Firebase
- Test with different browsers

## Support

If issues persist:
1. Check Firebase Console for project status
2. Verify all environment variables are set correctly
3. Review Firebase error logs in Console
4. Test with a different Firebase project if needed
