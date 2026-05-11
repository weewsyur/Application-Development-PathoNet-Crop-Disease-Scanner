# Firebase Authentication Troubleshooting Guide

## Common Issues & Solutions

### Issue: "auth/invalid-credential" Error

**Symptoms:**

- Sign in fails with "Invalid email or password"
- Error appears even with correct credentials
- Works for some users but not others

**Solutions (in order):**

1. **Check Email Verification Status**

   ```typescript
   // In console logs, you'll see:
   // [SignIn] Error: auth/invalid-credential
   ```

   - For NEW accounts: This is normal if email hasn't been verified yet
   - Solution: Verify email first, then try signing in

2. **Verify Firebase is Initialized**
   - Check `.env.local` has all 6 Firebase keys with real values (not placeholders)
   - Test with: `curl -s http://localhost:5000/health`

3. **Check Email Exists in Firebase**
   - Firebase Console → Authentication
   - Look for the email address
   - If not there, user needs to sign up first

4. **Check Password**
   - Passwords are case-sensitive
   - Minimum 6 characters required
   - No spaces trimmed (leading/trailing spaces removed)

5. **Rate Limiting**
   - After 5 failed attempts, Firebase blocks sign-in for 15 minutes
   - Solution: Wait and try again

---

### Issue: "No account found with this email"

**Symptoms:**

- User tries to sign in but account doesn't exist
- They swear they created it

**Solutions:**

1. **Check if Account Was Created**
   - Firebase Console → Authentication → Users
   - Search for the email address
   - If not there, signup failed (check error message)

2. **Check Email Typo**
   - Common typos: gmail.com vs gamil.com, @com vs .com
   - Have user try different email variations

3. **Check Wrong Firebase Project**
   - Verify `.env.local` points to correct Firebase project
   - Firebase Console project ID should match `EXPO_PUBLIC_FIREBASE_PROJECT_ID`

---

### Issue: Verification Emails Not Received

**Symptoms:**

- User completes signup
- No verification email arrives
- App shows banner "Please verify your email"

**Solutions (in order):**

1. **Check Spam/Promotions Folder**
   - Gmail: Check "Promotions" or "Social" tabs
   - Outlook: Check "Junk" folder
   - Mark as "Not Spam"

2. **Resend Verification Email**
   - App has "Resend Verification Email" button
   - Wait 30 seconds between resends
   - Try up to 3 times

3. **Check Email Templates in Firebase**
   - Firebase Console → Authentication → Email Templates
   - "Email Address Verification" template should be configured
   - Click "Send Test Email" to test

4. **Check Custom Domain**
   - Firebase Console → Authentication → Email Templates → Sender
   - Should have Custom Domain enabled
   - If not: Click "Verify" next to your domain

5. **Check from Firebase Console**
   ```
   1. Go to Firebase Console
   2. Select your project
   3. Authentication → Users
   4. Find user → Click user ID
   5. Check if "Email Verified" is checked or unchecked
   ```

---

### Issue: User Data Not in Firestore

**Symptoms:**

- User signs up successfully
- But data doesn't appear in Firestore database
- Firebase Console shows no user documents

**Solutions (in order):**

1. **Check Firestore Security Rules**

   ```bash
   Firebase Console → Firestore → Rules
   ```

   - Paste the rules from `FIREBASE_SETUP_GUIDE.md`
   - Click "Publish"

2. **Verify Collection Structure**

   ```
   Firestore should have:
   ├── users
       └── {uid}
           ├── uid: string
           ├── email: string
           ├── username: string
           ├── createdAt: timestamp
           ├── emailVerified: boolean
           └── profileComplete: boolean
   ```

3. **Check User UID**
   - Get UID from: Firebase Console → Authentication → Users
   - Should match the document name in Firestore users collection
   - Example: if Auth shows uid `abc123`, Firestore should have `/users/abc123`

4. **Check Browser Console**
   - Open DevTools (F12) → Console
   - Look for errors like: `[SignUp] Firestore save error`
   - These will tell you what's wrong

5. **Test Manual Save**
   ```typescript
   // In your app's console:
   const { db } = await import("@/lib/firebase");
   const { doc, setDoc } = await import("firebase/firestore");
   await setDoc(doc(db, "users", "test123"), {
     email: "test@example.com",
   });
   ```

   - If this works, your rules and connection are fine
   - If it fails, check your Firestore permissions

---

### Issue: Users Keep Getting Logged Out

**Symptoms:**

- User signs in and can browse
- App refreshes or closes
- User is logged out

**Solutions (in order):**

1. **Check AsyncStorage**

   ```
   React Native Debugger → AsyncStorage
   Should see "pathonet_uid" key with user's UID as value
   ```

2. **Check \_layout.tsx**
   - Should have `onAuthStateChanged` listener
   - Should check AsyncStorage on app startup
   - Should call `setIsReady(true)` when done

3. **Check Auth State Listener**

   ```typescript
   // _layout.tsx should have this:
   useEffect(() => {
     const unsubscribe = onAuthStateChanged(auth, (user) => {
       // Handle user
     });
     return unsubscribe; // Cleanup
   }, []);
   ```

4. **Clear Cache and Reinstall**
   ```bash
   npx expo start --clear
   npm install
   ```

---

### Issue: "Too Many Requests" Error

**Symptoms:**

- After several failed sign-in attempts
- Error: "⏱️ Too many failed attempts"
- User can't sign in for 15 minutes

**Explanation:**

- Firebase blocks sign-in attempts for security
- This is NORMAL and GOOD (prevents password brute-forcing)

**Solution:**

- Wait 15 minutes
- Check password is correct
- Make sure CAPS LOCK isn't on

---

### Issue: "Passwords do not match" on Signup

**Symptoms:**

- User types same password twice
- Still gets "Passwords do not match" error

**Solutions:**

1. **Check for Spaces**
   - Remove leading/trailing spaces
   - Make sure no extra spaces in the middle

2. **Check CAPS LOCK**
   - Passwords are case-sensitive
   - Make sure not accidentally holding CAPS

3. **Check Paste Issues**
   - If copy/pasting from another app
   - Make sure entire password was pasted
   - Try typing manually

4. **Browser Cache**
   - Clear browser cache/cookies
   - Close and reopen app

---

### Issue: "Session Expired" Error

**Symptoms:**

- User is logged in
- Tries to verify email or resend
- Error: "Session expired. Please sign in again"

**Explanation:**

- Firebase Auth session ended
- Usually means app was backgrounded too long or crashed

**Solution:**

- Sign in again
- Session typically lasts until manually signed out or 24+ hours

---

## Debug Logging

To see detailed logs, check the React Native console:

```typescript
// Look for these prefixes:
[SignIn] ...      // Sign-in related logs
[SignUp] ...      // Sign-up related logs
[RootLayout] ...  // App startup and auth state
```

**Enable Extended Logging:**

```typescript
// In firebase.ts
import { enableLogging } from "firebase/auth";
enableLogging(true); // Shows all Firebase auth calls
```

---

## When All Else Fails

1. **Check Firebase Console Status**
   - Is Firebase service up? Check [status.firebase.google.com](https://status.firebase.google.com)

2. **Check Internet Connection**
   - Open a random website
   - Try WiFi and mobile data
   - Make sure not behind restrictive firewall

3. **Verify Environment Variables**
   - Print all 6 Firebase keys from `.env.local`
   - Compare with Firebase Console → Project Settings
   - Paste exact values (no extra spaces)

4. **Rebuild and Clear Everything**

   ```bash
   rm -rf node_modules
   npm install
   npx expo start --clear
   npx expo start -c
   ```

5. **Contact Firebase Support**
   - Firebase Console → Help → Create Issue
   - Provide error message and project ID

---

## Quick Reference

| Error                  | Likely Cause                   | Quick Fix                        |
| ---------------------- | ------------------------------ | -------------------------------- |
| invalid-credential     | Wrong email/password           | Check credentials                |
| user-not-found         | No account with that email     | Sign up first                    |
| wrong-password         | Incorrect password             | Retype password                  |
| email-already-in-use   | Email used for another account | Sign in or use different email   |
| weak-password          | Password < 6 characters        | Use longer password              |
| too-many-requests      | Rate limited                   | Wait 15 minutes                  |
| network-request-failed | No internet or Firebase down   | Check connection                 |
| operation-not-allowed  | Firebase not configured        | Setup email/password in Firebase |
