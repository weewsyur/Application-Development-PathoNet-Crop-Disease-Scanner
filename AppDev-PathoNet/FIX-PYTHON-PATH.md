# Fix Python/Pip Not Found Error

## Problem
Both `python` and `pip` commands are not recognized on your Windows system.

## Solution: Add Python to System PATH

### Option 1: Add Python to PATH (Recommended)

1. **Find Python Installation Location**
   - Open Windows Settings
   - Search for "Python"
   - Click on "App execution aliases" or "Manage app execution aliases"
   - Look for Python installation path (usually: `C:\Users\YourUsername\AppData\Local\Programs\Python\Python3xx\`)

2. **Add to System PATH**
   - Press `Win + R`, type `sysdm.cpl`, press Enter
   - Click "Advanced" tab
   - Click "Environment Variables"
   - Under "System variables", find "Path", click "Edit"
   - Click "New" and add:
     - `C:\Users\YourUsername\AppData\Local\Programs\Python\Python3xx\`
     - `C:\Users\YourUsername\AppData\Local\Programs\Python\Python3xx\Scripts\`
   - Click "OK" on all dialogs
   - **Restart your terminal/command prompt**

3. **Verify Installation**
   ```bash
   python --version
   pip --version
   ```

### Option 2: Use Full Path to Python

If you know where Python is installed, use the full path:

```bash
"C:\Users\YourUsername\AppData\Local\Programs\Python\Python3xx\python.exe" -m pip install -r requirements.txt
```

### Option 3: Install Python (If Not Installed)

1. Download Python from https://www.python.org/downloads/
2. Run the installer
3. **IMPORTANT:** Check "Add Python to PATH" during installation
4. Complete installation
5. Restart your terminal

### Option 4: Use Microsoft Store Python

Windows Store Python may be installed but not in PATH:

1. Open Windows PowerShell as Administrator
2. Run:
   ```powershell
   # Find Python installation
   where.exe python
   ```
3. If found, add that path to your system PATH (see Option 1)

## After Fixing PATH

Once Python is in your PATH, install the requirements:

```bash
cd C:\Users\2060\Desktop\ApplicationDevelopment\AppDev-PathoNet
pip install -r requirements.txt
```

## Verify Installation

```bash
python test-setup.py
```

## Quick Test

Try these commands after fixing PATH:
```bash
python --version
pip --version
python -m pip --version
```

If all three work, Python is properly configured.
