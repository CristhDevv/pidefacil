import fs from 'fs';

const file = 'C:/Users/USER/AppData/Local/Google/Chrome/User Data/Default/Local Storage/leveldb/003679.ldb';
const buf = fs.readFileSync(file);
const str = buf.toString('latin1');

const idx = str.indexOf('casToken');
if (idx !== -1) {
  const eyjIdx = str.indexOf('eyJ', idx);
  // JWT tokens contain characters [A-Za-z0-9_\-\.]
  const rawAfter = str.slice(eyjIdx, eyjIdx + 1500);
  const match = rawAfter.match(/^([A-Za-z0-9_\-\.]+)/);
  if (match) {
    const token = match[1];
    console.log('Successfully extracted casToken!');
    console.log('Token length:', token.length);
    console.log('Prefix:', token.slice(0, 30));
    console.log('Suffix:', token.slice(-30));
    fs.writeFileSync('.secrets/cas_token.txt', token);

    // Let's decode payload to inspect claims
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = Buffer.from(parts[1], 'base64').toString('utf8');
      console.log('Payload JSON:', payload);
    }
  } else {
    console.log('Could not regex match JWT:', rawAfter.slice(0, 100));
  }
} else {
  console.log('casToken not found in file');
}
