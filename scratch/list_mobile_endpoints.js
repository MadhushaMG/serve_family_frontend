const fs = require('fs');
const path = require('path');

const mobileEndpoints = new Set();

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (!['node_modules', '.git', '.expo', 'dist'].includes(f)) walk(full);
    } else if (/\.(js|jsx|ts|tsx)$/.test(f)) {
      const content = fs.readFileSync(full, 'utf8');
      const matches = content.match(/['"`](\/(taxi|api|circle|auth|profile|subscription|tracker|qr|referral)[^'"`\s\?]+)['"`]/g);
      if (matches) {
        matches.forEach(m => {
          const clean = m.slice(1, -1).replace(/\$\{[^}]+\}/g, ':id');
          mobileEndpoints.add(clean);
        });
      }
    }
  }
}

walk(path.join(__dirname, '../servefamilyapp-main/src'));
walk(path.join(__dirname, '../servefamilyapp-main/app'));

console.log('Mobile App Endpoints (' + mobileEndpoints.size + '):');
Array.from(mobileEndpoints).sort().forEach(e => console.log('  ' + e));
