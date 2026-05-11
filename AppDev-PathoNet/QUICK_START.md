# ⚡ Quick Start Guide

## 🎯 One-Command Setup

Follow these steps to get both your Expo app and Python API running:

### Step 1: Install Everything

```bash
cd AppDev-PathoNet
npm install
```

### Step 2: Set Up Python (One time only)

```bash
# From parent directory (ApplicationDevelopment/)
python -m venv .venv

# Activate it
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r AppDev-PathoNet/requirements.txt
```

### Step 3: Run Everything at Once

```bash
# From AppDev-PathoNet/ folder
npm start
```

✅ Done! Both services are running:

- API: `http://localhost:5000`
- Expo: Check terminal for QR code

---

## 📱 How to Connect Your App

In your Expo components, use the API like this:

```typescript
// Example: Send image to API for plant disease prediction
async function predictDisease(imageBase64: string) {
  try {
    const response = await fetch("http://localhost:5000/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageBase64 }),
    });

    const result = await response.json();
    console.log("Prediction:", result);
    return result;
  } catch (error) {
    console.error("API Error:", error);
  }
}
```

For Android emulator, use: `http://10.0.2.2:5000` (instead of localhost)

---

## 🛑 Stop Everything

Simply press `Ctrl+C` in the terminal where you ran `npm start`

Or run:

```bash
npm run kill-processes
```

---

## 🚀 Alternative: Run Services Separately

If you need more control, run in separate terminals:

**Terminal 1:**

```bash
npm run start-api
```

**Terminal 2:**

```bash
npm run start-expo
```

---

## 🐛 Troubleshooting

### Problem: "Python not found"

```bash
# Make sure venv is activated
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Mac/Linux
```

### Problem: "Port 5000 already in use"

```bash
npm run kill-processes
# Then try again
npm start
```

### Problem: "Module not found" (Python)

```bash
pip install -r requirements.txt
```

### Problem: "expo start fails"

```bash
npm cache clean --force
npm install
npm start
```

---

## 📊 What's Running?

When you run `npm start`, you get:

```
┌─────────────────────────────────────┐
│  Terminal with Both Services        │
├──────────────────┬──────────────────┤
│  Python API      │  Expo Dev Server │
│  Port: 5000      │  Port: 19000     │
│  localhost:5000  │  [QR Code]       │
└──────────────────┴──────────────────┘
```

Both output shows in the same terminal with color coding.

---

## 📝 Environment Variables

Create `.env` in `AppDev-PathoNet/`:

```env
API_PORT=5000
NODE_ENV=development
REACT_APP_API_URL=http://localhost:5000
```

---

## 📖 For More Details

See [API_EXPO_SETUP.md](./API_EXPO_SETUP.md) for:

- Full project structure
- All available npm scripts
- Detailed troubleshooting
- Advanced configuration
