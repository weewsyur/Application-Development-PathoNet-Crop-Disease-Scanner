# Firebase & Authentication Fixes — Complete Guide

## 🔧 What Was Fixed

### 1. **Auth/invalid-credential Error** ✅

**Problem:** Users getting "invalid-credential" errors even with correct passwords
**Root Cause:**

- `SignIn.tsx` had a fake `handleSignUp` that wasn't calling Firebase
- Email verification was being enforced, blocking sign-in

**Fixed:**

- Removed signup mode from SignIn.tsx (signup is now in SignUp.tsx only)
- Users can now sign in even if email isn't verified (with warning)
- Better error categorization with emoji indicators for different error types

---

### 2. **Email Verification Not Working** ✅

**Problem:** Verification emails not being sent or not working
**Root Cause:**

- Firebase wasn't configured properly in your project
- Verification email needs Firebase Email Templates setup

**Fixed:**

- Improved error handling in SignUp.tsx with try-catch for email operations
- Firestore saves happen BEFORE verification email is sent
- User can retry verification email with cooldown timer

**Required Firebase Setup:**

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project → Authentication → Email Templates
3. Configure the "Email address verification" template
4. Make sure "Custom Domain" is enabled for email links to work

---

### 3. **Firestore Not Storing User Data** ✅

**Problem:** User data not appearing in Firestore after signup
**Root Cause:**

- Default Firestore security rules block all writes
- Firestore saves were happening after email verification (which might fail)

**Fixed:**

- User data is now saved to Firestore IMMEDIATELY after auth account creation
- Save failures don't block the signup process
- Added `profileComplete` field for future profile setup

**Required Setup:**
See "Firestore Security Rules" section below

---

### 4. **AsyncStorage Session Not Persisting** ✅

**Problem:** User session lost after app restart
**Root Cause:**

- `_layout.tsx` wasn't checking AsyncStorage on app boot
- Only checking Firebase auth state wasn't enough

**Fixed:**

- `_layout.tsx` now checks AsyncStorage for stored UID on app startup
- Users stay logged in even if Firebase auth listener hasn't fired yet
- Proper cleanup of auth listeners

---

## 📋 Firestore Security Rules

Create/update `firestore.rules` file in your project root:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users collection — user can only access their own data
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;

      // Nested scans collection
      match /scans/{scanId} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }

    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**Deploy rules:**

```bash
firebase deploy --only firestore:rules
```

Or manually in Firebase Console:

1. Firestore → Rules tab
2. Paste the rules above
3. Click "Publish"

---

## 🔐 Enable Email/Password Authentication

In Firebase Console:

1. Authentication → Sign-in Method
2. Enable "Email/Password"
3. Make sure both "Email/Password" and "Email link (passwordless sign-in)" are configured

---

## 📁 File Changes Summary

| File                    | Changed | What                                                                       |
| ----------------------- | ------- | -------------------------------------------------------------------------- |
| `app/_layout.tsx`       | ✅      | Better auth state management + AsyncStorage check                          |
| `app/(auth)/SignIn.tsx` | ✅      | Removed signup mode, better error messages, allow unverified email sign-in |
| `app/(auth)/SignUp.tsx` | ✅      | Improved Firestore save + email verification error handling                |
| `lib/firebase.ts`       | ✅      | (Already correct)                                                          |
| `firestore.rules`       | ✅      | NEW - Security rules (deploy manually)                                     |
| `firebase.json`         | ✅      | (Already exists)                                                           |

---

## 🚀 Testing Checklist

1. **Test Signup:**
   - [ ] Create new account with valid email/password
   - [ ] Check Firestore → users collection for new user document
   - [ ] Verify verification email arrives in inbox
   - [ ] Click verification link

2. **Test SignIn (Unverified):**
   - [ ] Sign in with unverified email
   - [ ] Should show warning: "📧 Your email hasn't been verified yet..."
   - [ ] Should still navigate to Home after 2 seconds
   - [ ] Check UID stored in AsyncStorage

3. **Test SignIn (Verified):**
   - [ ] Verify your email from the link
   - [ ] Sign in again
   - [ ] Should go directly to Home with no warning

4. **Test Session Persistence:**
   - [ ] Sign in
   - [ ] Close and restart the app
   - [ ] Should still be logged in

5. **Test Error Handling:**
   - [ ] Try signing in with non-existent email → "No account found"
   - [ ] Try with wrong password → "Incorrect password"
   - [ ] Try with invalid email format → "Invalid email"
   - [ ] Try signup with existing email → "Already registered"

---

## 🆘 Troubleshooting

### "Invalid credential" error on signin

**Solution:**

- Check email address is spelled correctly
- Check password is correct
- Wait a moment and try again (rate limiting)

### Verification email not received

**Solution:**

- Check spam/promotions folder
- Go to Firebase Console → Email Templates → click "Send test email"
- Verify the custom domain is set up in Firebase

### User data not in Firestore

**Solution:**

- Check Firestore security rules are deployed (see above)
- Check user UID matches in auth and Firestore
- Check network request in browser DevTools

### Users can't stay logged in

**Solution:**

- Check AsyncStorage is working: `await AsyncStorage.getItem("pathonet_uid")`
- Verify Firebase Auth SDK is properly initialized
- Check `.env.local` has all Firebase keys

---

## 🎯 Next Steps

1. **Deploy Firestore Rules:**

   ```bash
   firebase deploy --only firestore:rules
   ```

2. **Setup Email Templates:**
   - Firebase Console → Authentication → Email Templates
   - Customize email content as needed

3. **Test the complete flow:**
   - Use the checklist above

4. **Monitor Production:**
   - Set up error logging (Sentry/LogRocket)
   - Monitor Firebase Auth usage
   - Check Firestore reads/writes in real-time

---

## 📚 Related Files

- [Firestore Rules Documentation](https://firebase.google.com/docs/firestore/security/start)
- [Firebase Auth Error Codes](https://firebase.google.com/docs/auth/manage-users#retrieve_user_data)
- [Email Verification Setup](https://firebase.google.com/docs/auth/custom-email-handler)
