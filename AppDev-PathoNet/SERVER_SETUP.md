# PathoNet — Running the AI Server

The PathoNet app requires a local Python Flask server for plant disease detection.
**The server must be started manually before using the Scan feature.**

## Quick Start

### macOS / Linux

```bash
bash start_server.sh
```

### Windows

Double-click `start_server.bat`  
OR open Command Prompt in the project folder and run:

```
python run_api_server.py
```

### Using npm

```bash
npm run server
```

## Verify It's Running

Open your browser and go to: http://localhost:5000/health  
You should see: `{"status": "ok", ...}`

## Physical Device Setup

If scanning from a **real phone** (not emulator), your phone and computer must be
on the same Wi-Fi network. Then:

1. Find your computer's local IP address:
   - macOS/Linux: `ifconfig | grep "inet "`
   - Windows: `ipconfig | findstr "IPv4"`

2. Add this to your `.env.local` file:

   ```
   EXPO_PUBLIC_API_URL=http://YOUR_IP_HERE:5000
   ```

   Example: `EXPO_PUBLIC_API_URL=http://192.168.1.42:5000`

3. Restart the Expo dev server after changing `.env.local`

## Emulator vs Physical Device

| Environment      | API URL                                   |
| ---------------- | ----------------------------------------- |
| Android Emulator | `http://10.0.2.2:5000` (auto-detected)    |
| iOS Simulator    | `http://localhost:5000` (auto-detected)   |
| Physical Device  | Set `EXPO_PUBLIC_API_URL` in `.env.local` |

## Troubleshooting

### "Server Offline" message in app

1. Make sure the Flask server is running (check terminal for "Running on..." message)
2. Verify your phone/emulator is on the same network
3. For physical devices, ensure you've set `EXPO_PUBLIC_API_URL` correctly in `.env.local`
4. Tap "Retry" in the app when the server is ready

### Python 3 not found

- macOS: `brew install python3`
- Windows: Download from https://www.python.org/downloads/
- Linux: `apt-get install python3`

### Missing dependencies (torch, flask, PIL)

The `start_server.sh` script auto-installs these. On Windows or macOS:

```bash
pip3 install torch torchvision flask pillow requests
```

### Port 5000 already in use

Change the Flask port in `run_api_server.py` (find `port=5000`), then update
`EXPO_PUBLIC_API_URL` in `.env.local` to match the new port.
