// Script to verify Python installation before starting the application
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== Python Environment Verification ===');

try {
  // Check Python version
  console.log('\nChecking Python installation:');
  try {
    const pythonVersion = execSync('python3 --version').toString().trim();
    console.log(`Python3 found: ${pythonVersion}`);
  } catch (err) {
    console.log('Python3 command not found, trying python command...');
    try {
      const pythonVersion = execSync('python --version').toString().trim();
      console.log(`Python found: ${pythonVersion}`);
    } catch (err) {
      console.error('ERROR: No Python installation found!');
      console.error('Please ensure Python 3.x is installed and in the PATH');
      process.exit(1);
    }
  }

  // Check Python path
  console.log('\nChecking Python path:');
  const pythonPath = execSync('which python || which python3').toString().trim();
  console.log(`Python path: ${pythonPath}`);

  // Check Python modules
  console.log('\nChecking required Python modules:');
  const requiredModules = ['torch', 'torchaudio', 'numpy', 'librosa', 'soundfile'];
  
  for (const module of requiredModules) {
    try {
      const moduleVersion = execSync(`python3 -c "import ${module}; print(${module}.__version__)"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
      console.log(`✓ ${module}: ${moduleVersion}`);
    } catch (err) {
      console.error(`✗ ${module}: Not found or error importing`);
      console.error(`  Error: ${err.message}`);
    }
  }

  // Check VAD processor script
  console.log('\nChecking VAD processor script:');
  const vadScriptPath = path.join(process.cwd(), 'server', 'vad_processor.py');
  if (fs.existsSync(vadScriptPath)) {
    console.log(`✓ VAD processor script found at: ${vadScriptPath}`);
  } else {
    console.error(`✗ VAD processor script not found at: ${vadScriptPath}`);
  }

  console.log('\n=== Python Environment Verification Complete ===');
} catch (err) {
  console.error('Error during Python environment verification:', err);
  process.exit(1);
}