const fs = require('fs');
const path = require('path');

const requiredKeys = [
    // Database
    'MONGODB_URI',

    // Auth
    'JWT_SECRET',

    // API
    'NEXT_PUBLIC_API_URL',

    // Email (if using verify-email/forgot-password)
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASS',

    // AI (if using chat)
    'OPENAI_API_KEY',

    // Billing (if using Upgrade)
    'PAYSTACK_SECRET_KEY'
];

const envPath = path.join(__dirname, '../.env.local');

if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local file not found!');
    process.exit(1);
}

const content = fs.readFileSync(envPath, 'utf8');
const lines = content.split('\n');
const env = {};

lines.forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        env[key] = value;
    }
});

console.log('🔍 Checking Environment Variables in .env.local...\n');

let missing = [];
let warnings = [];

requiredKeys.forEach(key => {
    if (!env[key]) {
        missing.push(key);
    } else {
        // Specific checks
        if (key === 'NEXT_PUBLIC_API_URL') {
            if (!env[key].startsWith('http')) {
                warnings.push(`⚠️  NEXT_PUBLIC_API_URL should start with http:// or https:// (Current: ${env[key]})`);
            }
            if (env[key].includes('localhost')) {
                warnings.push(`⚠️  NEXT_PUBLIC_API_URL is set to localhost. For Mobile Build, this MUST be your production URL (e.g. https://your-app.vercel.app).`);
            }
        }
    }
});

if (missing.length > 0) {
    console.error('❌ Missing Required Keys:');
    missing.forEach(k => console.error(`   - ${k}`));
} else {
    console.log('✅ All required keys match expected list.');
}

if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(w => console.log(w));
}

console.log('\nℹ️  Note: Ensure these same variables are set in your Vercel Project Settings for the backend to work!');
