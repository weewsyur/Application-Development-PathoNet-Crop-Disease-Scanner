# Firebase Authentication Without Email Verification

Complete implementation guide for your Expo + React Native + Firebase setup.

---

## Overview [target]

This guide covers **three authentication methods** for passwordless/verification-free login:

1. **Email/Password (Recommended)** - Direct login after signup
2. **Anonymous Auth** - Guest/trial access
3. **Custom Token** - Backend-controlled authentication

All methods skip `sendEmailVerification()` entirely and grant immediate access.

---

## Prerequisites [list]

- Firebase SDK v9+ (modular API)
- Expo with React Native
- AsyncStorage for persistence
- Firestore for user profiles

**Verify your firebase.ts:**

```typescript
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

---

## 🔐 Method 1: Email/Password (No Verification)

### Overview

- User signs up with email/password
- Account created immediately
- No verification email sent
- User gains instant access
- **Best for:** Most applications

### Setup

**1. Remove verification imports from your auth screens:**

```typescript
// ❌ Remove these
import { sendEmailVerification, updateDoc } from "firebase/auth";

// ✅ Keep only these
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
```

**2. Update your Firestore user schema** (remove emailVerified):

```typescript
// OLD SCHEMA (with verification)
{
  uid: "user123",
  email: "user@example.com",
  username: "johnsmith",
  createdAt: Timestamp,
  emailVerified: false,  // [close-circle] REMOVE THIS
  profileComplete: false,
}

// NEW SCHEMA (without verification)
{
  uid: "user123",
  email: "user@example.com",
  username: "johnsmith",
  createdAt: Timestamp,
  profileComplete: false,  // [checkmark] Keep this
  isAnonymous: false,
}
```

**3. Sign Up Handler:**

```typescript
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";

const handleSignUp = async (
  email: string,
  password: string,
  username: string,
) => {
  try {
    // Step 1: Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email.trim(),
      password,
    );
    const user = userCredential.user;

    // Step 2: Create user profile in Firestore
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      username: username.trim(),
      createdAt: serverTimestamp(),
      profileComplete: false,
      isAnonymous: false,
    });

    // Step 3: Store UID locally
    await AsyncStorage.setItem("pathonet_uid", user.uid);

    // Step 4: Navigate to app
    router.replace("/(tabs)/Home");
  } catch (error: any) {
    // Handle errors gracefully
    if (error.code === "auth/email-already-in-use") {
      setError("This email is already registered.");
    } else if (error.code === "auth/weak-password") {
      setError("Password must be at least 6 characters.");
    } else {
      setError("Signup failed: " + error.message);
    }
  }
};
```

**4. Sign In Handler:**

```typescript
import { signInWithEmailAndPassword } from "firebase/auth";

const handleSignIn = async (email: string, password: string) => {
  try {
    // Step 1: Sign in user
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email.trim(),
      password,
    );
    const user = userCredential.user;

    // Step 2: Store UID locally
    await AsyncStorage.setItem("pathonet_uid", user.uid);

    // Step 3: Navigate to app
    router.replace("/(tabs)/Home");
  } catch (error: any) {
    if (error.code === "auth/user-not-found") {
      setError("No account found. Please sign up.");
    } else if (error.code === "auth/wrong-password") {
      setError("Incorrect password.");
    } else {
      setError("Sign in failed: " + error.message);
    }
  }
};
```

**5. Remove all verification-related code:**

```typescript
// ❌ DELETE THIS ENTIRE SECTION
if (showVerificationBanner && (
  <View style={styles.verificationBanner}>
    <Text>A verification email has been sent...</Text>
    <TouchableOpacity onPress={handleVerifyAndContinue}>
      <Text>I've Verified — Continue</Text>
    </TouchableOpacity>
    {/* ... resend logic ... */}
  </View>
))

// ❌ DELETE THESE FUNCTIONS
const handleVerifyAndContinue = async () => { ... }
const handleResendEmail = async () => { ... }

// ❌ REMOVE STATE
const [showVerificationBanner, setShowVerificationBanner] = useState(false);
const [canResendEmail, setCanResendEmail] = useState(true);
const [resendCooldown, setResendCooldown] = useState(0);
```

---

## 👤 Method 2: Anonymous Authentication

### Overview

- User signs in without credentials
- Account auto-created as anonymous
- Perfect for guest/trial access
- User can upgrade to permanent account later
- **Best for:** Trying before committing

### Implementation

```typescript
import { signInAnonymously } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

const handleGuestAccess = async () => {
  try {
    // Step 1: Sign in anonymously
    const userCredential = await signInAnonymously(auth);
    const user = userCredential.user;

    // Step 2: Create anonymous user profile
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: null,
      username: `guest_${user.uid.slice(0, 8)}`,
      createdAt: serverTimestamp(),
      profileComplete: false,
      isAnonymous: true, // Mark as anonymous
    });

    // Step 3: Store UID
    await AsyncStorage.setItem("pathonet_uid", user.uid);

    // Step 4: Navigate
    router.replace("/(tabs)/Home");

    // Show message
    Alert.alert(
      "Guest Access",
      "You're using guest access. Create an account anytime.",
    );
  } catch (error: any) {
    setError("Guest sign-in failed: " + error.message);
  }
};
```

### Upgrade Anonymous to Permanent Account

```typescript
import {
  linkWithCredential,
  EmailAuthProvider,
  signOut,
  signInWithEmailAndPassword,
} from "firebase/auth";

const upgradeGuestAccount = async (email: string, password: string) => {
  try {
    const user = auth.currentUser;
    if (!user || !user.isAnonymous) {
      throw new Error("User must be anonymous to upgrade");
    }

    // Create credential
    const credential = EmailAuthProvider.credential(email, password);

    // Link email/password to anonymous account
    await linkWithCredential(user, credential);

    // Update Firestore
    await updateDoc(doc(db, "users", user.uid), {
      email: email,
      isAnonymous: false,
      profileComplete: true,
    });

    Alert.alert("Success", "Your guest account has been upgraded!");
  } catch (error: any) {
    setError("Failed to upgrade account: " + error.message);
  }
};
```

---

## 🔑 Method 3: Custom Token Authentication

### Overview

- Backend generates auth tokens
- Client signs in with token
- Server-side control over authentication
- Perfect for enterprise/existing user management
- **Best for:** Migrating from custom auth systems

### Backend Setup (Node.js Example)

```javascript
// Your Node.js backend
const admin = require("firebase-admin");

app.post("/api/auth/custom-token", async (req, res) => {
  const { uid } = req.body;

  try {
    // Generate custom token from Firebase Admin SDK
    const customToken = await admin.auth().createCustomToken(uid, {
      // Optional: add custom claims
      role: "user",
      permissions: ["read", "write"],
    });

    res.json({ token: customToken });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Mobile/Frontend Setup

```typescript
import { signInWithCustomToken } from "firebase/auth";

const handleCustomTokenSignIn = async (userID: string) => {
  try {
    // Step 1: Get custom token from your backend
    const response = await fetch(
      "https://your-backend.com/api/auth/custom-token",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: userID }),
      },
    );

    const { token } = await response.json();

    // Step 2: Sign in with custom token
    const userCredential = await signInWithCustomToken(auth, token);
    const user = userCredential.user;

    // Step 3: Create/update user profile
    await setDoc(
      doc(db, "users", user.uid),
      {
        uid: user.uid,
        email: user.email,
        createdAt: serverTimestamp(),
        profileComplete: true,
        isAnonymous: false,
      },
      { merge: true },
    );

    // Step 4: Store UID
    await AsyncStorage.setItem("pathonet_uid", user.uid);

    // Step 5: Navigate
    router.replace("/(tabs)/Home");
  } catch (error: any) {
    setError("Custom auth failed: " + error.message);
  }
};
```

---

## 🛡️ Firebase Security Rules

Update your Firestore rules to prevent verification checks:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    // Admin can manage all users
    match /users/{userId} {
      allow read, write: if request.auth.token.admin == true;
    }

    // Scans collection - user's own scans only
    match /scans/{document=**} {
      allow read, write: if request.auth.uid == resource.data.uid;
    }
  }
}
```

---

## ✅ Error Handling Best Practices

```typescript
export function getAuthErrorMessage(code: string): string {
  const errors: Record<string, string> = {
    "auth/email-already-in-use": "Email already registered",
    "auth/weak-password": "Password too weak (min 6 chars)",
    "auth/invalid-email": "Invalid email format",
    "auth/user-not-found": "Account doesn't exist",
    "auth/wrong-password": "Wrong password",
    "auth/too-many-requests": "Too many attempts. Try later",
    "auth/network-request-failed": "Network error",
  };

  return errors[code] || "Authentication failed";
}

// Usage
try {
  await signInWithEmailAndPassword(auth, email, password);
} catch (error: any) {
  const message = getAuthErrorMessage(error.code);
  Alert.alert("Error", message);
}
```

---

## 🔄 Session Persistence

Check session on app load:

```typescript
import { useEffect } from "react";
import { auth } from "@/lib/firebase";

export function RootLayout() {
  const [authState, setAuthState] = useState("loading");

  useEffect(() => {
    // Firebase auto-restores session from device
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setAuthState("authenticated");
        // Navigate to app
      } else {
        setAuthState("unauthenticated");
        // Navigate to login
      }
    });

    return () => unsubscribe();
  }, []);

  return authState === "loading" ? <SplashScreen /> : <MainApp />;
}
```

---

## 📱 Complete Sign-Up Component (Email/Password)

See your updated [SignUp.tsx](<../../app/(auth)/SignUp.tsx>) file in the repository.

Key changes:

- ✅ Removed `sendEmailVerification()` import
- ✅ Removed verification banner state
- ✅ Direct navigation after signup
- ✅ Simplified error handling

---

## 🧪 Testing

Test all authentication flows:

```bash
# Test email/password
Email: test@example.com
Password: Test123456

# Test anonymous (should auto-create guest account)
# Test error cases: wrong password, account exists, etc.
```

---

## ⚠️ Common Issues

### Issue: "Unverified users can't access Firestore"

**Solution:** Update security rules to allow unverified users, OR remove `emailVerified` checks from your rules.

### Issue: "Email verification banner still showing"

**Solution:** Remove `showVerificationBanner` state and all related conditions.

### Issue: "Custom token expired"

**Solution:** Tokens expire in 1 hour. Refresh before expiry using Firebase Admin SDK.

---

## 📚 Firebase Documentation

- [Email/Password Auth](https://firebase.google.com/docs/auth/web/start#web-version-9)
- [Anonymous Auth](https://firebase.google.com/docs/auth/web/anonymous-auth)
- [Custom Token Auth](https://firebase.google.com/docs/auth/web/custom-auth)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/start)

---

## ✨ Summary

**Your implementation now:**

- ✅ Creates user account immediately
- ✅ Skips email verification entirely
- ✅ Stores user profile in Firestore
- ✅ Maintains session with AsyncStorage
- ✅ Handles errors gracefully
- ✅ Supports three auth methods
