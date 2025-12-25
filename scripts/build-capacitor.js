const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const apiPath = path.join(__dirname, '../src/app/api');
const hiddenApiPath = path.join(__dirname, '../src/app/.api-hidden');

console.log('🚀 Starting Capacitor-specific build...');

// 1. Hide API folder
if (fs.existsSync(apiPath)) {
    console.log('📦 Hiding API routes to allow static export...');
    fs.renameSync(apiPath, hiddenApiPath);
}

try {
    // 2. Run Next.js build with export output
    console.log('🏗️ Building static frontend...');
    execSync('npx next build --webpack', {
        stdio: 'inherit',
        env: { ...process.env, NEXT_OUTPUT: 'export' }
    });
    console.log('✅ Static build complete!');
} catch (error) {
    console.error('❌ Build failed:', error.message);
} finally {
    // 3. Always restore API folder
    if (fs.existsSync(hiddenApiPath)) {
        console.log('📂 Restoring API routes...');
        fs.renameSync(hiddenApiPath, apiPath);
    }
}
