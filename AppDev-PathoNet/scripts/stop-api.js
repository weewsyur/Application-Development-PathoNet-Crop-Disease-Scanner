const fs = require("fs");
const path = require("path");

const PID_FILE = path.resolve(__dirname, "..", ".api-pid");

function stopAPI() {
  try {
    if (fs.existsSync(PID_FILE)) {
      const pid = parseInt(fs.readFileSync(PID_FILE, "utf8"));
      console.log(`[Stop-API] Stopping API server with PID: ${pid}`);
      
      // Try graceful shutdown first
      try {
        process.kill(pid, "SIGTERM");
        
        // Wait a bit and force kill if still running
        setTimeout(() => {
          try {
            process.kill(pid, 0); // Check if still running
            console.log("[Stop-API] Force killing API server...");
            process.kill(pid, "SIGKILL");
          } catch (e) {
            // Process already terminated
          }
        }, 3000);
      } catch (error) {
        console.log("[Stop-API] API process not found, cleaning up PID file");
      }
      
      // Remove PID file
      fs.unlinkSync(PID_FILE);
      console.log("[Stop-API] API server stopped");
    } else {
      console.log("[Stop-API] No API server running (no PID file found)");
    }
  } catch (error) {
    console.error("[Stop-API] Error stopping API:", error.message);
  }
}

// Run if called directly
if (require.main === module) {
  stopAPI();
}

module.exports = { stopAPI };
