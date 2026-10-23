import fs from 'fs';
import path from 'path';

function snappyDecompress(data: Buffer): Buffer | null {
  let pos = 0;
  let uncompressedLen = 0;
  let shift = 0;
  while (pos < data.length) {
    const b = data[pos++];
    uncompressedLen |= (b & 0x7f) << shift;
    if (!(b & 0x80)) break;
    shift += 7;
  }

  if (uncompressedLen > 10 * 1024 * 1024 || uncompressedLen === 0) {
    return null;
  }

  const out = Buffer.alloc(uncompressedLen);
  let outPos = 0;

  try {
    while (pos < data.length && outPos < uncompressedLen) {
      const tagByte = data[pos++];
      const tagType = tagByte & 0x03;

      if (tagType === 0) {
        let len = (tagByte >> 2) + 1;
        if (len > 60) {
          const extraBytes = len - 60;
          if (pos + extraBytes > data.length) return null;
          len = data.readUIntLE(pos, extraBytes) + 1;
          pos += extraBytes;
        }
        if (pos + len > data.length || outPos + len > uncompressedLen) return null;
        data.copy(out, outPos, pos, pos + len);
        pos += len;
        outPos += len;
      } else if (tagType === 1) {
        const len = 4 + ((tagByte >> 2) & 0x07);
        if (pos >= data.length) return null;
        const offset = ((tagByte >> 5) << 8) | data[pos++];
        if (offset === 0 || offset > outPos) return null;
        for (let i = 0; i < len; i++) {
          out[outPos] = out[outPos - offset];
          outPos++;
        }
      } else if (tagType === 2) {
        const len = 1 + (tagByte >> 2);
        if (pos + 2 > data.length) return null;
        const offset = data.readUInt16LE(pos);
        pos += 2;
        if (offset === 0 || offset > outPos) return null;
        for (let i = 0; i < len; i++) {
          out[outPos] = out[outPos - offset];
          outPos++;
        }
      } else if (tagType === 3) {
        const len = 1 + (tagByte >> 2);
        if (pos + 4 > data.length) return null;
        const offset = data.readUInt32LE(pos);
        pos += 4;
        if (offset === 0 || offset > outPos) return null;
        for (let i = 0; i < len; i++) {
          out[outPos] = out[outPos - offset];
          outPos++;
        }
      }
    }
    return out.subarray(0, outPos);
  } catch {
    return null;
  }
}

export function extractDropiTokenFromChrome(): string | null {
  const leveldbDir = path.join(
    process.env.USERPROFILE || 'C:\\Users\\USER',
    'AppData\\Local\\Google\\Chrome\\User Data\\Default\\Local Storage\\leveldb'
  );

  if (!fs.existsSync(leveldbDir)) {
    return null;
  }

  const files = fs.readdirSync(leveldbDir)
    .filter((f) => f.endsWith('.log') || f.endsWith('.ldb'))
    .map((f) => ({
      name: f,
      fullPath: path.join(leveldbDir, f),
      mtime: fs.statSync(path.join(leveldbDir, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.mtime - a.mtime); // Newest first

  const nowSec = Math.floor(Date.now() / 1000);
  let bestToken: { token: string; exp: number } | null = null;

  for (const file of files) {
    try {
      const buf = fs.readFileSync(file.fullPath);

      // Strategy 1: Direct regex in raw buffer (for .log files or uncompressed sections)
      const rawStr = buf.toString('latin1');
      const directMatches = rawStr.match(/eyJ[A-Za-z0-9_\-\.]{50,}/g) || [];
      for (const tok of directMatches) {
        checkToken(tok);
      }

      // Strategy 2: Decompress blocks if .ldb
      if (file.name.endsWith('.ldb')) {
        let searchPos = 0;
        while ((searchPos = buf.indexOf(Buffer.from('DROPI_token'), searchPos)) !== -1) {
          for (let start = searchPos; start >= Math.max(0, searchPos - 8000); start -= 100) {
            const chunk = buf.subarray(start, searchPos + 4000);
            const decomp = snappyDecompress(chunk);
            if (decomp && decomp.includes('DROPI_token')) {
              const decompStr = decomp.toString('latin1');
              const decompMatches = decompStr.match(/eyJ[A-Za-z0-9_\-\.]{50,}/g) || [];
              for (const tok of decompMatches) {
                checkToken(tok);
              }
              break;
            }
          }
          searchPos += 11;
        }
      }
    } catch {
      // Ignore file read locks
    }
  }

  function checkToken(tok: string) {
    const parts = tok.split('.');
    if (parts.length === 3) {
      try {
        const pad = (4 - (parts[1].length % 4)) % 4;
        const b64 = parts[1] + '='.repeat(pad);
        const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
        if (payload.aud === 'DROPI' || payload.token_type === 'DROPI' || payload.casBusiness) {
          console.log('Found Dropi JWT payload:', { aud: payload.aud, sub: payload.sub, exp: payload.exp, now: nowSec, valid: payload.exp > nowSec });
        }
        if (payload.aud === 'DROPI' && payload.exp && payload.exp > nowSec) {
          if (!bestToken || payload.exp > bestToken.exp) {
            bestToken = { token: tok, exp: payload.exp };
          }
        }
      } catch {}
    }
  }

  if (bestToken) {
    const t = (bestToken as any).token;
    // Persist to .secrets and .env.local
    try {
      fs.writeFileSync('.secrets/dropi_token.txt', t);
      const envPath = '.env.local';
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf8');
        envContent = envContent.replace(/^DROPI_TOKEN=.*$/m, `DROPI_TOKEN=${t}`);
        fs.writeFileSync(envPath, envContent);
      }
    } catch {}
    return t;
  }

  return null;
}

// Test runner if executed directly
if (require.main === module) {
  console.log('Extracting token from Chrome LevelDB...');
  const tok = extractDropiTokenFromChrome();
  if (tok) {
    console.log('🎉 Token found! Prefix:', tok.slice(0, 30), 'Length:', tok.length);
  } else {
    console.log('No valid active token found in Chrome storage.');
  }
}
