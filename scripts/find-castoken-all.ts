import fs from 'fs';
import path from 'path';

const dir = 'C:/Users/USER/AppData/Local/Google/Chrome/User Data/Default/Local Storage/leveldb';
const files = fs.readdirSync(dir);

for (const file of files) {
  const fullPath = path.join(dir, file);
  try {
    const buf = fs.readFileSync(fullPath);
    const str = buf.toString('latin1');
    let pos = 0;
    while ((pos = str.indexOf('casToken', pos)) !== -1) {
      console.log(`Found 'casToken' in ${file} at pos ${pos}`);
      const snippet = str.slice(pos, pos + 200).replace(/[^\x20-\x7E]/g, '.');
      console.log('   Snippet:', snippet);
      pos += 8;
    }
  } catch (e) {
    console.error(`Error reading ${file}:`, e);
  }
}
