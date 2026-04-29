# 🔄 Setup Methods & Comparison

This document shows **4 different ways** to set up Expo + Python API. Choose based on your preference.

---

## Method 1: **Concurrently (Recommended) ✅**

### What You Get

- ✅ Both services in one terminal
- ✅ Synchronized color-coded output
- ✅ One command to start/stop both
- ✅ Cross-platform compatible
- ✅ Best for beginners

### How It Works

```bash
npm start
```

### What's Running Behind the Scenes

```
concurrently runs:
├── npm run start-api   → node scripts/run-api.js   → python run_api_server.py
└── npm run start-expo  → expo start
```

### Files Used

- `package.json` - npm scripts configuration
- `scripts/run-api.js` - Python detection & launching
- `scripts/kill-processes.js` - Cleanup utility

### Pros

- Single command
- Easy to read output
- Clean shutdown
- Best error handling

### Cons

- Requires 2 separate node scripts
- Slightly more setup

---

## Method 2: **Direct Python Command (Simplest)**

### What You Get

- ✅ Works immediately
- ✅ No extra scripts
- ✅ Windows + Mac compatible

### How It Works

#### Option A: From Parent Directory

```bash
# Terminal 1 - API
.venv\Scripts\python.exe run_api_server.py  # Windows
# or
.venv/bin/python run_api_server.py  # Mac/Linux

# Terminal 2 - Expo
cd AppDev-PathoNet
expo start
```

#### Option B: Update package.json

```json
{
  "scripts": {
    "start": "concurrently \"npm:start-api\" \"npm:start-expo\"",
    "start-api": "cd .. && python run_api_server.py",
    "start-expo": "expo start"
  }
}
```

Then:

```bash
npm start
```

### Pros

- ✅ No complicated scripts
- ✅ Direct control
- ✅ Easy to debug

### Cons

- ❌ Python path must be correct
- ❌ Breaks if .venv location changes
- ❌ Not cross-platform (hardcoded paths)

---

## Method 3: **Alternative Node.js Script (No Concurrently)**

### What You Get

- ✅ Full Node.js control
- ✅ No npm package dependencies
- ✅ Sequential or parallel startup

### How It Works

```bash
node scripts/start-all.js
```

### What's Running Behind the Scenes

```
Node script automatically:
1. Finds Python executable
2. Checks if port 5000 is available
3. Starts Python API
4. Starts Expo
5. Manages both processes
```

### Files Used

- `scripts/start-all.js` - Complete startup orchestrator

### Pros

- ✅ No `concurrently` package needed
- ✅ Full control over process timing
- ✅ Smart port detection

### Cons

- ❌ Slower startup (sequential)
- ❌ More complex code
- ❌ Less unified output

---

## Method 4: **Separate Terminals (Manual Control)**

### What You Get

- ✅ Maximum flexibility
- ✅ Easy to debug individual services
- ✅ Can restart one service independently

### How It Works

**Terminal 1 - Python API:**

```bash
# From parent directory (ApplicationDevelopment/)
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Mac/Linux
python run_api_server.py
```

**Terminal 2 - Expo:**

```bash
# From AppDev-PathoNet/
expo start
```

### Pros

- ✅ Full visibility into each service
- ✅ Can debug one service at a time
- ✅ Easy to restart

### Cons

- ❌ 2 terminals to manage
- ❌ Manual synchronization
- ❌ Need to remember commands

---

## 🎯 Recommendation Matrix

| Need            | Best Method             | Reason                    |
| --------------- | ----------------------- | ------------------------- |
| Beginner        | Method 1 (Concurrently) | Simple, one command       |
| Cross-platform  | Method 1 (Concurrently) | Handles all OS variations |
| Debugging       | Method 4 (Separate)     | See each service output   |
| No dependencies | Method 3 (Node script)  | Only Node required        |
| Quick testing   | Method 2 (Direct)       | Fastest to set up         |
| Production-like | Method 1 (Concurrently) | Professional setup        |

---

## 📦 Installation Comparison

### Method 1 (Concurrently)

```bash
npm install  # Already installed!
# concurrently is in package.json
```

### Method 2 (Direct Python)

```bash
# No npm packages needed
# Just activate .venv and run Python
```

### Method 3 (Node Script)

```bash
# No npm packages needed
# Uses Node built-ins only
```

### Method 4 (Separate Terminals)

```bash
# No setup needed
# Just open terminals and run
```

---

## 🔧 Configuration Comparison

### Method 1: Concurrently

```json
{
  "scripts": {
    "start": "concurrently \"npm:start-api\" \"npm:start-expo\"",
    "start-api": "node scripts/run-api.js",
    "start-expo": "expo start"
  }
}
```

### Method 2: Direct

```json
{
  "scripts": {
    "start": "concurrently \"npm:start-api\" \"npm:start-expo\"",
    "start-api": "cd .. && .venv\\Scripts\\python.exe run_api_server.py",
    "start-expo": "expo start"
  }
}
```

### Method 3: Node Script

```json
{
  "scripts": {
    "start": "node scripts/start-all.js"
  }
}
```

### Method 4: Manual

```bash
# No JSON needed, just run in terminals
.venv\Scripts\python run_api_server.py
expo start
```

---

## ⚡ Startup Speed Comparison

| Method           | Startup Time  | Output Sync  | Flexibility  |
| ---------------- | ------------- | ------------ | ------------ |
| 1. Concurrently  | ⚡ Parallel   | ✅ Excellent | ✅ Good      |
| 2. Direct Python | ⚡ Parallel   | ✅ Excellent | ❌ Poor      |
| 3. Node Script   | 🐢 Sequential | ❌ Poor      | ✅ Good      |
| 4. Separate      | ⚡ Parallel   | ⚠️ Manual    | ✅ Excellent |

---

## 🚀 Quick Setup for Each Method

### Method 1: Concurrently (Current Setup)

```bash
cd AppDev-PathoNet
npm start
```

### Method 2: Direct Python

```bash
# Terminal 1
python run_api_server.py

# Terminal 2
cd AppDev-PathoNet
expo start
```

### Method 3: Node Script

```bash
cd AppDev-PathoNet
node scripts/start-all.js
```

### Method 4: Separate Terminals

```bash
# Terminal 1 (activate .venv first)
.venv\Scripts\python run_api_server.py

# Terminal 2
cd AppDev-PathoNet
expo start
```

---

## 💡 Switching Between Methods

If you want to switch methods:

1. **From Method 1 → Method 2:**
   - Update `package.json` `start-api` script
   - Keep `concurrently` in dependencies

2. **From Method 1 → Method 3:**
   - Change `start` script to `node scripts/start-all.js`
   - Remove `concurrently` (optional)

3. **From Method 1 → Method 4:**
   - Just open two terminals
   - No code changes needed

---

## 🔍 Troubleshooting by Method

### Method 1 Issues

- `concurrently not found` → `npm install`
- `Port already in use` → `npm run kill-processes`

### Method 2 Issues

- `Python not found` → Update path in `package.json`
- `Cross-platform fails` → Use Method 1 instead

### Method 3 Issues

- `Process hangs` → Check if port 5000 is in use
- `Async timing issues` → Review `start-all.js` delays

### Method 4 Issues

- `Forgot to activate venv` → Run `activate` script first
- `Can't find command` → Check working directory

---

## 🎯 My Recommendation

**Start with Method 1 (Concurrently)** because:

- ✅ Simplest one-command startup
- ✅ Already configured in your project
- ✅ Works on all operating systems
- ✅ Best for team projects
- ✅ Easy to extend with more services

If you have issues, fall back to Method 4 (separate terminals) for debugging.
