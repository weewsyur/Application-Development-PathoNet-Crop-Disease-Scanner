# Quick Reference — Firebase Auth Fixes

## 🔴 Issues Fixed

- ✅ auth/invalid-credential error
- ✅ Email verification not working
- ✅ Firestore user data not saving
- ✅ AsyncStorage session not persisting

## ⚡ What to Do NOW

### 1. Deploy Firestore Rules (REQUIRED)

```bash
firebase deploy --only firestore:rules
```

### 2. Setup Email Templates (REQUIRED)

Firebase Console → Authentication → Email Templates → Configure

### 3. Test Signup

- Create account
- Check email for verification link
- Click link
- Tap "Continue"

## 📁 New Documentation Files

- `FIREBASE_SETUP_GUIDE.md` — Complete setup
- `AUTH_TROUBLESHOOTING.md` — Common issues
- `FIREBASE_FIXES_SUMMARY.md` — What was fixed

## 🧪 Key Tests

1. Can signup with email
2. Verification email arrives
3. Can verify and signin
4. Firestore has user data
5. App stays logged in after restart

## ❌ Common Issues

| Problem                  | Solution                                    |
| ------------------------ | ------------------------------------------- |
| Invalid credential       | Check password/email are correct            |
| No verification email    | Resend from app or check spam folder        |
| No Firestore data        | Deploy security rules first                 |
| Logged out after restart | Restart app again (AsyncStorage catches it) |

## 💾 Firestore Rules Location

In your project root, file: `firestore.rules`
(Already created, just need to deploy)

## 📝 Code Changes

- `app/_layout.tsx` — Auth state + AsyncStorage check
- `app/(auth)/SignIn.tsx` — Signin only (signup redirects to SignUp.tsx)
- `app/(auth)/SignUp.tsx` — Better error handling + Firestore saves

## 🚀 Next Step

Deploy rules and test signup!
