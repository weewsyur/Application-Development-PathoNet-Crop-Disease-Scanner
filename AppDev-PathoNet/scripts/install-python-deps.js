/**
 * Install Python Dependencies Script
 * Automatically creates virtual environment and installs dependencies
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const isWindows = os.platform() === 'win32';
const projectRoot = path.join(__dirname, '..');

console.log('========================================');
console.log('  PathoNet Python Dependencies Setup');
console.log('========================================\n');

// Check Python availability
function checkPython() {
  return new Promise((resolve, reject) => {
    const pythonCmd = isWindows ? 'python' : 'python3';
    const proc = spawn(pythonCmd, ['--version']);
    let output = '';
    
    proc.stdout.on('data', (data) => { output += data.toString(); });
    proc.stderr.on('data', (data) => { output += data.toString(); });
    
    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`✓ Python found: ${output.trim()}`);
        resolve(true);
      } else {
        console.error('✗ Python not found or not in PATH');
        console.error('  Please install Python 3.8+ from https://python.org');
        resolve(false);
      }
    });
  });
}

// Create virtual environment
function createVenv() {
  return new Promise((resolve, reject) => {
    const venvDir = path.join(projectRoot, '.venv');
    
    if (fs.existsSync(venvDir)) {
      console.log('✓ Virtual environment already exists');
      resolve(true);
      return;
    }

    console.log('Creating virtual environment...');
    const pythonCmd = isWindows ? 'python' : 'python3';
    const proc = spawn(pythonCmd, ['-m', 'venv', '.venv'], {
      cwd: projectRoot,
      stdio: 'inherit'
    });

    proc.on('close', (code) => {
      if (code === 0) {
        console.log('✓ Virtual environment created');
        resolve(true);
      } else {
        console.error('✗ Failed to create virtual environment');
        resolve(false);
      }
    });
  });
}

// Install dependencies
function installDependencies() {
  return new Promise((resolve, reject) => {
    const pythonExe = isWindows 
      ? path.join(projectRoot, '.venv', 'Scripts', 'python.exe')
      : path.join(projectRoot, '.venv', 'bin', 'python');

    if (!fs.existsSync(pythonExe)) {
      console.error('✗ Python executable not found in venv');
      resolve(false);
      return;
    }

    console.log('Installing dependencies...');
    const proc = spawn(pythonExe, ['-m', 'pip', 'install', '-r', 'requirements.txt'], {
      cwd: projectRoot,
      stdio: 'inherit'
    });

    proc.on('close', (code) => {
      if (code === 0) {
        console.log('✓ Dependencies installed successfully');
        resolve(true);
      } else {
        console.error('✗ Failed to install dependencies');
        resolve(false);
      }
    });
  });
}

// Verify installation
function verifyInstallation() {
  return new Promise((resolve, reject) => {
    const pythonExe = isWindows 
      ? path.join(projectRoot, '.venv', 'Scripts', 'python.exe')
      : path.join(projectRoot, '.venv', 'bin', 'python');

    const proc = spawn(pythonExe, ['-c', 'import numpy; import torch; import flask; print("All dependencies OK")'], {
      cwd: projectRoot,
      stdio: 'pipe'
    });

    let output = '';
    proc.stdout.on('data', (data) => { output += data.toString(); });
    proc.stderr.on('data', (data) => { output += data.toString(); });

    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`✓ ${output.trim()}`);
        resolve(true);
      } else {
        console.error('✗ Dependency verification failed');
        console.error(output);
        resolve(false);
      }
    });
  });
}

// Main execution
async function main() {
  const pythonOk = await checkPython();
  if (!pythonOk) {
    process.exit(1);
  }

  const venvOk = await createVenv();
  if (!venvOk) {
    process.exit(1);
  }

  const depsOk = await installDependencies();
  if (!depsOk) {
    process.exit(1);
  }

  const verifyOk = await verifyInstallation();
  if (!verifyOk) {
    process.exit(1);
  }

  console.log('\n========================================');
  console.log('  Setup Complete!');
  console.log('========================================\n');
  console.log('To start the API server:');
  console.log('  npm start');
  console.log('  npm run web');
  console.log('  npm run android\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
