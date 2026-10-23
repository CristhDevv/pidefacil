import fs from 'fs';

const file = 'C:/Users/USER/AppData/Local/Google/Chrome/User Data/Default/Local Storage/leveldb/003679.ldb';
const buf = fs.readFileSync(file);
const str = buf.toString('latin1');

const idx = str.indexOf('casToken');
console.log('Index:', idx);
const slice = str.slice(idx, idx + 400);
console.log('Raw slice length:', slice.length);
console.log('Hex representation:');
console.log(Buffer.from(slice).toString('hex'));
console.log('Printable characters:');
console.log(slice.replace(/[^\x20-\x7E]/g, '.'));
