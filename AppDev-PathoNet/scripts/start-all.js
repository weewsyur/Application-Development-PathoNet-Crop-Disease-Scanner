#!/usr/bin/env node

/**
 * Alternative Simple Startup Script (No concurrently needed)
 * 
 * Usage: node scripts/start-all.js
 * This script starts both API and Expo sequentially or in separate processes
 * 
 * Pros: No dependencies, simpler logic
 * Cons: Processes don't share same terminal, harder to stop both at once
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const net = require('net');

const isWindows = os.platform() === 'win32';
const projectRoot = path.join(__dirname, '..');
const parentRoot = path.join(projectRoot, '..');

// ============================================================
// 1. Find Python Executable
// ============================================================
function findPythonExecutable() {
  const venvPaths = [
    path.join(projectRoot, '.venv', isWindows ? 'Scripts\\python.exe' : 'bin/python'),
    path.join(parentRoot, '.venv', isWindows ? 'Scripts\\python.exe' : 'bin/python'),
  ];

  for (const venvPath of venvPaths) {
    if (fs.existsSync(venvPath)) {
      return venvPath;
    }
  }

  return isWindows ? 'python' : 'python3';
}

// ============================================================
// 2. Check Port Availability
// ============================================================
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(true);
      }
    });
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, 'localhost');
  });
}

// ============================================================
// 3. Start API Server
// ============================================================
function startAPI() {
  return new Promise((resolve, reject) => {
    const pythonExe = findPythonExecutable();
    const scriptPath = path.join(parentRoot, 'run_api_server.py');

    console.log('🌱 Starting Python API Server...');
    console.log(`   Python: ${pythonExe}`);
    console.log(`   Script: ${scriptPath}\n`);

    const apiProcess = spawn(pythonExe, [scriptPath], {
      stdio: 'pipe',
      shell: true,
      cwd: parentRoot,
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    });

    let output = '';

    apiProcess.stdout.on('data', (data) => {
      output += data.toString();
      process.stdout.write(data);
    });

    apiProcess.stderr.on('data', (data) => {
      process.stderr.write(data);
    });

    // Check if API started successfully
    setTimeout(() => {
      isPortAvailable(5000).then((available) => {
        if (!available) {
          console.log('✅ API Server is running on port 5000\n');
          resolve(apiProcess);
        }
      });
    }, 3000);

    apiProcess.on('error', reject);
  });
}

// ============================================================
// 4. Start Expo
// ============================================================
function startExpo() {
  return new Promise((resolve, reject) => {
    console.log('📱 Starting Expo Dev Server...\n');

    const expoProcess = spawn('expo', ['start'], {
      stdio: 'inherit',
      cwd: projectRoot,
    });

    expoProcess.on('error', reject);
    resolve(expoProcess);
  });
}

// ============================================================
// 5. Main Startup Orchestrator
// ============================================================
async function main() {
  console.log('=' .repeat(70));
  console.log('  PathoNet: Expo + Python API Startup');
  console.log('='.repeat(70) + '\n');

  let apiProcess = null;
  let expoProcess = null;

  try {
    // Start API first
    apiProcess = await startAPI();

    // Then start Expo
    expoProcess = await startExpo();

    console.log('\n✅ Both services are running!');
    console.log('📝 Press Ctrl+C to stop all services\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (apiProcess) apiProcess.kill();
    if (expoProcess) expoProcess.kill();
    process.exit(1);
  }

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    if (apiProcess) apiProcess.kill();
    if (expoProcess) expoProcess.kill();
    process.exit(0);
  });
}

// Run
main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
