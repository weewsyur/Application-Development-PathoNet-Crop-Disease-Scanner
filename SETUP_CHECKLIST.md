# 🎯 Setup Verification Checklist

Use this checklist to verify your setup is complete and working correctly.

## ✅ Pre-Setup Requirements

- [ ] Node.js installed (`node --version`)
- [ ] Python installed (`python --version`)
- [ ] npm installed (`npm --version`)
- [ ] Git (optional but recommended)

---

## ✅ File Structure Verification

### In `AppDev-PathoNet/`:

```
☐ package.json (modified with new scripts)
☐ scripts/run-api.js (cross-platform Python launcher)
☐ scripts/kill-processes.js (process cleanup)
☐ scripts/start-all.js (alternative Node.js runner)
☐ .env.example (environment template)
☐ QUICK_START.md (beginner guide)
☐ API_EXPO_SETUP.md (full setup guide)
☐ SETUP_COMPLETE.md (summary)
```

### In parent directory `ApplicationDevelopment/`:

```
☐ .venv/ folder (Python virtual environment)
☐ run_api_server.py (API entry point)
☐ SETUP_METHODS.md (4 setup approaches)
☐ USING_THE_API.md (API integration guide)
```

---

## ✅ Initial Setup

### Step 1: Install Node Dependencies

```bash
cd AppDev-PathoNet
npm install
```

- [ ] Command completed without errors
- [ ] `node_modules/` folder created
- [ ] `concurrently` is installed (check: `npm list concurrently`)

### Step 2: Create Python Virtual Environment

```bash
# From parent directory
python -m venv .venv
```

- [ ] `.venv/` folder created
- [ ] `Scripts/` folder exists (Windows) or `bin/` folder exists (Mac/Linux)

### Step 3: Activate Virtual Environment

```bash
# Windows
.venv\Scripts\activate

# Mac/Linux
source .venv/bin/activate
```

- [ ] Terminal shows `(.venv)` prefix
- [ ] `pip --version` shows correct Python path

### Step 4: Install Python Dependencies

```bash
pip install -r AppDev-PathoNet/requirements.txt
```

- [ ] No errors during installation
- [ ] All packages installed (check: `pip list`)

### Step 5: Create .env File (Optional)

```bash
# Copy template
cp .env.example .env
```

- [ ] `.env` file created (or will use defaults)
- [ ] Contains `API_PORT=5000`

---

## ✅ Verification Tests

### Test 1: Check Python Access

```bash
# From parent directory, with venv activated
python run_api_server.py
```

- [ ] API server starts
- [ ] Shows "Flask server on http://localhost:5000"
- [ ] No import errors
- [ ] Can press Ctrl+C to stop it

### Test 2: Verify npm Scripts

```bash
# Check available scripts
npm run
```

- [ ] See `start-api` script
- [ ] See `start-expo` script
- [ ] See `start` script
- [ ] See `kill-processes` script

### Test 3: Port Availability

```bash
# Check port 5000 is free
# Windows:
netstat -ano | findstr :5000

# Mac/Linux:
lsof -i :5000
```

- [ ] Port 5000 is free (no results shown)

### Test 4: Full Startup

```bash
npm start
```

- [ ] Python API starts (first output)
- [ ] Expo starts (shows Metro bundler)
- [ ] No errors in either service
- [ ] Both services show active output

### Test 5: API Health Check

```bash
# In another terminal
curl http://localhost:5000/health
```

- [ ] Returns JSON response
- [ ] Response includes `"status": "ok"` or similar

### Test 6: Expo Connection

From terminal running `npm start`:

- [ ] Shows QR code
- [ ] Shows instructions for scanning
- [ ] Can connect with Expo Go app or emulator

---

## ✅ Features Verification

### Cross-Platform Detection

- [ ] Scripts detect Windows vs Unix
- [ ] Python executable found correctly
- [ ] Paths use correct separators (`\` on Windows, `/` on Unix)

### Error Handling

```bash
# Test missing Python (rename .venv temporarily to test)
npm start
```

- [ ] Shows helpful error message
- [ ] Doesn't crash silently
- [ ] Suggests solutions

### Process Management

```bash
# While npm start is running
npm run kill-processes
```

- [ ] Both services stop
- [ ] No zombie processes left
- [ ] Can restart successfully

---

## ✅ Documentation Review

- [ ] Read [QUICK_START.md](./QUICK_START.md)
- [ ] Read [API_EXPO_SETUP.md](./API_EXPO_SETUP.md)
- [ ] Read [SETUP_METHODS.md](../SETUP_METHODS.md)
- [ ] Read [USING_THE_API.md](../USING_THE_API.md)
- [ ] Understand when to use each method

---

## ✅ API Integration Test

### Create Simple Test File

`AppDev-PathoNet/test-api.ts`:

```typescript
import apiService from "./app/services/api";

async function testAPI() {
  // Test 1: Health check
  const health = await apiService.health();
  console.log("✓ Health check passed:", health);

  // Test 2: Get classes
  const classes = await apiService.getClasses();
  console.log("✓ Classes retrieved:", classes.data);
}

testAPI().catch(console.error);
```

- [ ] Create the test file
- [ ] Run with `npx ts-node test-api.ts`
- [ ] Both API calls succeed

---

## ✅ Common Fixes Applied

After completing setup, verify these known issues are fixed:

- [ ] Windows path support in npm scripts
- [ ] Cross-platform Python detection
- [ ] Graceful Ctrl+C handling
- [ ] Process cleanup on exit
- [ ] Error messages are helpful
- [ ] Both services in same terminal

---

## ✅ Performance Checks

```bash
# Startup time
time npm start
```

Expected performance:

- [ ] API starts in < 5 seconds
- [ ] Expo starts in < 10 seconds
- [ ] Both running concurrently (not sequentially)

---

## ✅ Troubleshooting Readiness

If something fails, verify:

**Python Issues:**

- [ ] .venv folder exists
- [ ] venv is activated
- [ ] requirements.txt is up to date
- [ ] No Python import errors

**npm Issues:**

- [ ] `npm install` ran without errors
- [ ] `concurrently` is in package.json
- [ ] scripts/run-api.js is executable
- [ ] scripts/kill-processes.js exists

**Port Issues:**

- [ ] Port 5000 is not in use
- [ ] No other Flask apps running
- [ ] kill-processes script worked

**Expo Issues:**

- [ ] Metro bundler not hung
- [ ] npm cache clean if issues
- [ ] expo package version matches

---

## ✅ Production Readiness

When you deploy to production:

- [ ] Remove .env file with sensitive data
- [ ] Update API_URL to production server
- [ ] Remove localhost references
- [ ] Test with production Python API server
- [ ] Use proper error logging
- [ ] Implement retry logic

---

## 📊 Completion Summary

### Files Created:

- ✅ `scripts/run-api.js` (Cross-platform launcher)
- ✅ `scripts/kill-processes.js` (Process killer)
- ✅ `scripts/start-all.js` (Node.js alternative)
- ✅ `.env.example` (Configuration template)
- ✅ Multiple documentation files

### Files Modified:

- ✅ `package.json` (Updated scripts)

### Documentation Created:

- ✅ QUICK_START.md (Beginner guide)
- ✅ API_EXPO_SETUP.md (Full setup guide)
- ✅ SETUP_METHODS.md (4 approaches)
- ✅ USING_THE_API.md (API integration)
- ✅ SETUP_COMPLETE.md (This file)

---

## 🎉 You're Ready!

When all checkboxes are complete:

1. ✅ Run `npm start`
2. ✅ Scan QR code with Expo Go
3. ✅ Start building your app! 🌱

---

## 📞 Quick Support

### Reset Everything:

```bash
npm run kill-processes
npm cache clean --force
rm -rf node_modules
npm install
npm start
```

### Check Logs:

```bash
# API logs
npm run start-api

# Expo logs
npm run start-expo
```

### Manual Testing:

```bash
# API health
curl http://localhost:5000/health

# Get classes
curl http://localhost:5000/classes

# Test prediction
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{"image": "test"}'
```

---

**Congratulations! Your setup is complete! 🚀**

See [QUICK_START.md](./QUICK_START.md) to begin development.
