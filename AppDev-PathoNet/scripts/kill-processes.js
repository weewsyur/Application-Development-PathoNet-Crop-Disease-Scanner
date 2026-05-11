#!/usr/bin/env node

/**
 * Process killer - Stops all PathoNet processes gracefully
 * Works on Windows, macOS, and Linux
 */

const os = require('os');
const { exec } = require('child_process');
const isWindows = os.platform() === 'win32';

console.log('🛑 Killing PathoNet processes...\n');

let killed = false;

// Kill by port (more reliable)
function killByPort() {
  const port = 5000;

  if (isWindows) {
    // Windows: Use netstat and taskkill
    exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
      const lines = stdout.split('\n');
      lines.forEach((line) => {
        const match = line.match(/\s+(\d+)\s*$/);
        if (match) {
          const pid = match[1];
          exec(`taskkill /PID ${pid} /F`, (err) => {
            if (!err) {
              console.log(`✓ Killed process ${pid}`);
              killed = true;
            }
          });
        }
      });
    });
  } else {
    // macOS/Linux: Use lsof and kill
    exec(`lsof -i :${port} -t`, (error, stdout) => {
      if (stdout.trim()) {
        const pid = stdout.trim().split('\n')[0];
        exec(`kill -9 ${pid}`, (err) => {
          if (!err) {
            console.log(`✓ Killed process ${pid}`);
            killed = true;
          }
        });
      }
    });
  }
}

// Kill Python processes
function killPythonProcesses() {
  if (isWindows) {
    exec('taskkill /IM python.exe /F', (error) => {
      if (!error) console.log('✓ Killed Python processes');
      killed = true;
    });
  } else {
    exec('pkill -f "python.*run_api_server"', (error) => {
      if (!error) console.log('✓ Killed Python processes');
      killed = true;
    });
  }
}

killByPort();
killPythonProcesses();

setTimeout(() => {
  if (killed) {
    console.log('\n✅ All processes stopped');
  } else {
    console.log('\n⚠️  No processes found to kill');
  }
  process.exit(0);
}, 1000);
