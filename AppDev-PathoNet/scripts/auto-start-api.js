const { spawn } = require("child_process");
const path = require("path");

// Auto-start API server as background process
const SCRIPT_PATH = path.resolve(__dirname, "start_api.js");
const PID_FILE = path.resolve(__dirname, "..", ".api-pid");

console.log("[Auto-Start] Starting PathoNet API server automatically...");

function startAPI() {
  const apiProcess = spawn("node", [SCRIPT_PATH], {
    detached: true,
    stdio: "ignore",
    env: {
      ...process.env,
      FLASK_ENV: "production",
      PYTHONUTF8: "1",
      PYTHONIOENCODING: "utf-8",
    },
  });

  // Save PID for later management
  require("fs").writeFileSync(PID_FILE, apiProcess.pid.toString());

  console.log(`[Auto-Start] API server started with PID: ${apiProcess.pid}`);
  
  // Detach from parent process
  apiProcess.unref();
  
  return apiProcess;
}

// Check if API is already running
function checkAPIRunning() {
  try {
    const fs = require("fs");
    if (fs.existsSync(PID_FILE)) {
      const pid = parseInt(fs.readFileSync(PID_FILE, "utf8"));
      try {
        process.kill(pid, 0); // Check if process exists
        console.log(`[Auto-Start] API already running with PID: ${pid}`);
        return true;
      } catch (e) {
        // Process doesn't exist, remove stale PID file
        fs.unlinkSync(PID_FILE);
      }
    }
  } catch (error) {
    // PID file doesn't exist or can't be read
  }
  return false;
}

// Main execution
if (!checkAPIRunning()) {
  startAPI();
}

// Export for use in other scripts
module.exports = { startAPI, checkAPIRunning };
