#!/usr/bin/env node

/**
 * Cross-platform Python API Server Runner
 * Automatically detects Python environment and starts the Flask API
 * Works on Windows, macOS, and Linux
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const isWindows = os.platform() === 'win32';
const projectRoot = path.join(__dirname, '..');
const parentRoot = path.join(projectRoot, '..');
const apiPort = process.env.API_PORT || 5000;

/**
 * Find Python executable
 * Priority: venv > system python
 */
function findPythonExecutable() {
  // Virtual environment paths
  const venvPaths = [
    // From app root
    path.join(projectRoot, '.venv', isWindows ? 'Scripts\\python.exe' : 'bin/python'),
    // From parent root (if app is in subfolder)
    path.join(parentRoot, '.venv', isWindows ? 'Scripts\\python.exe' : 'bin/python'),
  ];

  // Check venv executables first
  for (const venvPath of venvPaths) {
    if (fs.existsSync(venvPath)) {
      console.log(`✓ Found venv Python: ${venvPath}`);
      return venvPath;
    }
  }

  // Fall back to system python
  console.log('ℹ No venv found, using system Python');
  return isWindows ? 'python' : 'python3';
}

/**
 * Run the Python API server
 */
function startAPI() {
  const pythonExe = findPythonExecutable();
  const scriptPath = path.join(parentRoot, 'run_api_server.py');

  if (!fs.existsSync(scriptPath)) {
    console.error(`❌ Error: API script not found at ${scriptPath}`);
    console.error('📁 Current working directory:', process.cwd());
    console.error('📁 Looking for:', scriptPath);
    process.exit(1);
  }

  console.log('\n' + '='.repeat(70));
  console.log('  🌱 PathoNet API Server Launcher');
  console.log('='.repeat(70));
  console.log(`📍 Python: ${pythonExe}`);
  console.log(`📍 Script: ${scriptPath}`);
  console.log(`📍 Port: ${apiPort}`);
  console.log(`📍 Health Check: http://localhost:${apiPort}/health`);
  console.log('='.repeat(70) + '\n');

  // Spawn the Python process
  const apiProcess = spawn(pythonExe, [scriptPath], {
    stdio: 'inherit', // Inherit stdio to show Python output directly
    shell: true, // Use shell on Windows for better compatibility
    cwd: parentRoot,
    env: {
      ...process.env,
      PYTHONUNBUFFERED: '1', // Prevent Python buffering
      API_PORT: apiPort,
    },
  });

  // Handle process exit
  apiProcess.on('error', (error) => {
    console.error(`\n❌ Error starting API server:`, error.message);
    console.error('💡 Tip: Make sure Python is installed and added to PATH');
    console.error('💡 Or activate your virtual environment: .venv\\Scripts\\activate (Windows) or source .venv/bin/activate (Mac/Linux)');
    process.exit(1);
  });

  apiProcess.on('exit', (code) => {
    if (code !== null && code !== 0) {
      console.error(`\n❌ API server exited with code ${code}`);
    }
  });

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log('\n⏹ Stopping API server...');
    apiProcess.kill();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n⏹ Stopping API server...');
    apiProcess.kill();
    process.exit(0);
  });
}

// Start the API
startAPI();
