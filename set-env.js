const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config();

// Determine if we're in production mode
const isProduction = process.env.NODE_ENV === 'production';

// Ensure the environments directory exists
const envDir = path.join(__dirname, 'src', 'environments');
if (!fs.existsSync(envDir)) {
  fs.mkdirSync(envDir, { recursive: true });
  console.log(`Created directory: ${envDir}`);
}

// Ensure all required environment variables are present
const requiredEnvVars = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('Error: Missing required environment variables:');
  missingVars.forEach(varName => console.error(`- ${varName}`));
  console.error('\nPlease create a .env file in the project root with these variables.');
  console.error('For GitHub Actions, ensure these secrets are set in your repository settings.');
  process.exit(1);
}

// Create the environment.ts file content
const environmentFile = `import { Environment } from './environment.d';

export const environment: Environment = {
  production: ${isProduction},
  firebase: {
    apiKey: "${process.env.FIREBASE_API_KEY}",
    authDomain: "${process.env.FIREBASE_AUTH_DOMAIN}",
    projectId: "${process.env.FIREBASE_PROJECT_ID}",
    storageBucket: "${process.env.FIREBASE_STORAGE_BUCKET}",
    messagingSenderId: "${process.env.FIREBASE_MESSAGING_SENDER_ID}",
    appId: "${process.env.FIREBASE_APP_ID}"
  }
};`;

// Write the file
const envFilePath = path.join(envDir, 'environment.ts');
fs.writeFileSync(envFilePath, environmentFile);
console.log(`Environment file generated successfully: ${envFilePath}`);
console.log(`Mode: ${isProduction ? 'Production' : 'Development'}`);
