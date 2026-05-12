const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

// Windows service installation script
function installWindowsService() {
  console.log("[Service] Installing PathoNet API as Windows service...");
  
  const serviceScript = `
@echo off
cd /d "${path.resolve(__dirname, "..")}"
node scripts/auto-start-api.js
`;
  
  const servicePath = path.resolve(__dirname, "..", "pathonet-api-service.bat");
  fs.writeFileSync(servicePath, serviceScript);
  
  // Create startup shortcut
  const startupFolder = path.join(process.env.APPDATA, "Microsoft", "Windows", "Start Menu", "Programs", "Startup");
  const shortcutPath = path.join(startupFolder, "PathoNet-API.lnk");
  
  console.log(`[Service] Created service script: ${servicePath}`);
  console.log(`[Service] To auto-start on boot, copy this file to: ${startupFolder}`);
  console.log("[Service] Or run 'npm run service:install' as administrator for full service installation");
}

// Linux/macOS service installation
function installUnixService() {
  console.log("[Service] Installing PathoNet API as systemd service...");
  
  const serviceContent = `[Unit]
Description=PathoNet API Server
After=network.target

[Service]
Type=simple
User=${process.env.USER}
WorkingDirectory=${path.resolve(__dirname, "..")}
ExecStart=/usr/bin/node ${path.resolve(__dirname, "auto-start-api.js")}
Restart=always
RestartSec=10
Environment=FLASK_ENV=production
Environment=PYTHONUTF8=1
Environment=PYTHONIOENCODING=utf-8

[Install]
WantedBy=multi-user.target
`;
  
  const servicePath = "/etc/systemd/system/pathonet-api.service";
  console.log(`[Service] To install as systemd service:`);
  console.log(`[Service] 1. Copy this content to ${servicePath}:`);
  console.log(serviceContent);
  console.log(`[Service] 2. Run: sudo systemctl daemon-reload`);
  console.log(`[Service] 3. Run: sudo systemctl enable pathonet-api`);
  console.log(`[Service] 4. Run: sudo systemctl start pathonet-api`);
}

// Main installation
if (process.platform === "win32") {
  installWindowsService();
} else {
  installUnixService();
}
