# Firebase Auth - Quick Code Snippets

Copy-paste ready code for common authentication scenarios.

---

## Email/Password Sign Up [lock-closed]

```typescript
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";

async function handleSignUp(email: string, password: string, username: string) {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email.trim(),
      password,
    );

    const user = userCredential.user;

    // Save user profile to Firestore
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      username: username.trim(),
      createdAt: serverTimestamp(),
      profileComplete: false,
      isAnonymous: false,
    });

    // Store session locally
    await AsyncStorage.setItem("pathonet_uid", user.uid);

    console.log("[checkmark] User created:", user.uid);
    // Navigate to app
    router.replace("/(tabs)/Home");
  } catch (error: any) {
    console.error("[close-circle] Signup error:", error.code);
    if (error.code === "auth/email-already-in-use") {
      Alert.alert("Error", "Email already registered");
    } else if (error.code === "auth/weak-password") {
      Alert.alert("Error", "Password too weak");
    } else {
      Alert.alert("Error", error.message);
    }
  }
}
```

---

## Email/Password Sign In [key]

```typescript
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";

async function handleSignIn(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email.trim(),
      password,
    );

    const user = userCredential.user;

    // Store session
    await AsyncStorage.setItem("pathonet_uid", user.uid);

    console.log("[checkmark] Signed in:", user.uid);
    // Navigate to app
    router.replace("/(tabs)/Home");
  } catch (error: any) {
    console.error("[close-circle] Signin error:", error.code);
    if (error.code === "auth/user-not-found") {
      Alert.alert("Error", "Account not found");
    } else if (error.code === "auth/wrong-password") {
      Alert.alert("Error", "Wrong password");
    } else {
      Alert.alert("Error", error.message);
    }
  }
}
```

---

## Anonymous Sign In - Guest Access [person]

```typescript
import { signInAnonymously } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";

async function handleGuestAccess() {
  try {
    const userCredential = await signInAnonymously(auth);
    const user = userCredential.user;

    // Create anonymous user profile
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: null,
      username: `guest_${user.uid.slice(0, 8)}`,
      createdAt: serverTimestamp(),
      profileComplete: false,
      isAnonymous: true,
    });

    // Store session
    await AsyncStorage.setItem("pathonet_uid", user.uid);

    console.log("[checkmark] Guest access granted:", user.uid);
    Alert.alert("Guest", "You're using guest access");
    router.replace("/(tabs)/Home");
  } catch (error: any) {
    console.error("❌ Guest signin error:", error.message);
    Alert.alert("Error", "Failed to access as guest");
  }
}
```

---

## Upgrade Anonymous to Permanent Account [refresh]

```typescript
import { linkWithCredential, EmailAuthProvider } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

async function upgradeGuestAccount(email: string, password: string) {
  try {
    const user = auth.currentUser;

    if (!user?.isAnonymous) {
      Alert.alert("Error", "User must be anonymous");
      return;
    }

    // Create email/password credential
    const credential = EmailAuthProvider.credential(email, password);

    // Link to anonymous account
    await linkWithCredential(user, credential);

    // Update Firestore
    await updateDoc(doc(db, "users", user.uid), {
      email: email,
      isAnonymous: false,
      profileComplete: true,
    });

    console.log("[checkmark] Account upgraded:", user.uid);
    Alert.alert("Success", "Your account has been upgraded");
  } catch (error: any) {
    console.error("❌ Upgrade error:", error.code);
    if (error.code === "auth/email-already-in-use") {
      Alert.alert("Error", "Email already in use");
    } else {
      Alert.alert("Error", error.message);
    }
  }
}
```

---

## Custom Token Sign In - Backend Integration [ticket]

### Backend (Node.js)

```javascript
// Your backend endpoint
const admin = require("firebase-admin");
const express = require("express");
const app = express();

app.post("/api/auth/custom-token", async (req, res) => {
  try {
    const { uid } = req.body;

    // Generate custom token
    const customToken = await admin.auth().createCustomToken(uid, {
      // Optional: custom claims
      role: "user",
    });

    res.json({ token: customToken });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Mobile (React Native)

```typescript
import { signInWithCustomToken } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

async function handleCustomTokenSignIn(userId: string) {
  try {
    // Get token from backend
    const response = await fetch("https://your-api.com/api/auth/custom-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: userId }),
    });

    const { token } = await response.json();

    // Sign in with custom token
    const userCredential = await signInWithCustomToken(auth, token);
    const user = userCredential.user;

    // Create/update user profile
    await setDoc(
      doc(db, "users", user.uid),
      {
        uid: user.uid,
        email: user.email,
        createdAt: serverTimestamp(),
        isAnonymous: false,
      },
      { merge: true },
    );

    // Store session
    await AsyncStorage.setItem("pathonet_uid", user.uid);

    console.log("[checkmark] Custom token auth successful:", user.uid);
    router.replace("/(tabs)/Home");
  } catch (error: any) {
    console.error("[close-circle] Custom token error:", error.message);
    Alert.alert("Error", "Authentication failed");
  }
}
```

---

## Sign Out [exit]

```typescript
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";

async function handleSignOut() {
  try {
    await signOut(auth);
    await AsyncStorage.removeItem("pathonet_uid");

    console.log("[checkmark] Signed out");
    router.replace("/(auth)/SignUp");
  } catch (error: any) {
    console.error("[close-circle] Signout error:", error.message);
    Alert.alert("Error", "Failed to sign out");
  }
}
```

---

## Get Current User [phone-portrait]

```typescript
import { auth } from "@/lib/firebase";

// Get current authenticated user
const currentUser = auth.currentUser;

if (currentUser) {
  console.log("User ID:", currentUser.uid);
  console.log("Email:", currentUser.email);
  console.log("Anonymous:", currentUser.isAnonymous);
}
```

---

## Check Session Persistence [save]

```typescript
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function useAuthState() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to auth state changes
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        // User is logged in
        setUser(currentUser);
        await AsyncStorage.setItem("pathonet_uid", currentUser.uid);
      } else {
        // User is logged out
        setUser(null);
        await AsyncStorage.removeItem("pathonet_uid");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading };
}

// Usage in component
export default function MyComponent() {
  const { user, loading } = useAuthState();

  if (loading) return <LoadingScreen />;
  if (!user) return <LoginScreen />;

  return <AppScreen userId={user.uid} />;
}
```

---

## Get Offline User ID [search]

```typescript
import AsyncStorage from "@react-native-async-storage/async-storage";

async function getOfflineUserId() {
  try {
    const uid = await AsyncStorage.getItem("pathonet_uid");
    if (uid) {
      console.log("User ID from storage:", uid);
      return uid;
    }
  } catch (error) {
    console.error("Error reading storage:", error);
  }
  return null;
}
```

---

## Error Formatting [target]

```typescript
function getAuthErrorMessage(errorCode: string): string {
  const errors: Record<string, string> = {
    "auth/email-already-in-use": "This email is already registered",
    "auth/weak-password": "Password must be at least 6 characters",
    "auth/invalid-email": "Please enter a valid email",
    "auth/user-not-found": "No account found with this email",
    "auth/wrong-password": "Incorrect password",
    "auth/too-many-requests": "Too many attempts. Try again later",
    "auth/network-request-failed": "Network error. Check your connection",
    "auth/user-disabled": "This account has been disabled",
    "auth/invalid-credential": "Invalid email or password",
  };

  return errors[errorCode] || "Authentication failed. Please try again.";
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

## Firestore Security Rules [shield]

Allow authenticated users without verification:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    // User scans - only their own
    match /scans/{document=**} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }
  }
}
```

---

## 📚 All Methods Reference

| Method         | Use Case       | Verification | Best For          |
| -------------- | -------------- | ------------ | ----------------- |
| Email/Password | Standard login | ❌ None      | Most apps         |
| Anonymous      | Guest access   | ❌ None      | Trial/preview     |
| Custom Token   | Backend auth   | ❌ None      | Enterprise        |
| Phone          | OTP based      | ✅ SMS OTP   | Security critical |

---

**Note:** All examples skip email verification entirely. Add `sendEmailVerification()` if you need it later.
