import fs from 'fs';
import path from 'path';

const levelDbDir = path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/User Data/Default/Local Storage/leveldb');
console.log('Searching in:', levelDbDir);

if (!fs.existsSync(levelDbDir)) {
  console.log('Directory does not exist');
  process.exit(0);
}

const files = fs.readdirSync(levelDbDir);
for (const file of files) {
  if (file.endsWith('.log') || file.endsWith('.ldb')) {
    const fullPath = path.join(levelDbDir, file);
    try {
      const buffer = fs.readFileSync(fullPath);
      const str = buffer.toString('utf8');
      if (str.includes('casToken') || str.includes('dropi_loginResult')) {
        console.log(`\n🎯 Match in ${file}!`);
        // Find casToken
        let idx = str.indexOf('casToken');
        if (idx !== -1) {
          console.log('casToken snippet:\n', str.slice(idx, idx + 300));
        }
        let loginIdx = str.indexOf('dropi_loginResult');
        if (loginIdx !== -1) {
          console.log('dropi_loginResult snippet:\n', str.slice(loginIdx, loginIdx + 500));
        }
      }
    } catch (e: any) {
      // file might be locked, try reading via stream
    }
  }
}
