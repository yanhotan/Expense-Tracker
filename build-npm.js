// Simple script to ensure we use npm for installation and building
const { execSync } = require('child_process');

// Remove any existing pnpm lock file if it exists
try {
  console.log('Checking for and removing pnpm-lock.yaml...');
  execSync('if exist pnpm-lock.yaml del pnpm-lock.yaml', { stdio: 'inherit' });
} catch (error) {
  console.log('No pnpm-lock.yaml found or error removing it.');
}

// Install dependencies with npm
console.log('Installing dependencies with npm...');
execSync('npm install --legacy-peer-deps', { stdio: 'inherit' });

// Build the project with npm
console.log('Building the project...');
execSync('npm run build', { stdio: 'inherit' });

console.log('Build completed successfully!');