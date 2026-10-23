import os
import re
import sys
import base64
import json
import time

def snappy_decompress(data):
    pos = 0
    uncompressed_len = 0
    shift = 0
    while pos < len(data):
        b = data[pos]
        pos += 1
        uncompressed_len |= (b & 0x7f) << shift
        if not (b & 0x80): break
        shift += 7

    if uncompressed_len > 10 * 1024 * 1024 or uncompressed_len == 0:
        return None

    out = bytearray()
    try:
        while pos < len(data) and len(out) < uncompressed_len:
            tag_byte = data[pos]
            pos += 1
            tag_type = tag_byte & 0x03

            if tag_type == 0:
                length = (tag_byte >> 2) + 1
                if length > 60:
                    extra_bytes = length - 60
                    if pos + extra_bytes > len(data): return None
                    length = int.from_bytes(data[pos:pos+extra_bytes], 'little') + 1
                    pos += extra_bytes
                if pos + length > len(data): return None
                out.extend(data[pos:pos+length])
                pos += length
            elif tag_type == 1:
                length = 4 + ((tag_byte >> 2) & 0x07)
                if pos >= len(data): return None
                offset = ((tag_byte >> 5) << 8) | data[pos]
                pos += 1
                if offset == 0 or offset > len(out): return None
                for _ in range(length):
                    out.append(out[-offset])
            elif tag_type == 2:
                length = 1 + (tag_byte >> 2)
                if pos + 2 > len(data): return None
                offset = int.from_bytes(data[pos:pos+2], 'little')
                pos += 2
                if offset == 0 or offset > len(out): return None
                for _ in range(length):
                    out.append(out[-offset])
            elif tag_type == 3:
                length = 1 + (tag_byte >> 2)
                if pos + 4 > len(data): return None
                offset = int.from_bytes(data[pos:pos+4], 'little')
                pos += 4
                if offset == 0 or offset > len(out): return None
                for _ in range(length):
                    out.append(out[-offset])
        return bytes(out)
    except:
        return None

def extract_latest_token():
    dir_path = os.path.join(os.environ.get('USERPROFILE', 'C:\\Users\\USER'), 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Local Storage', 'leveldb')
    if not os.path.exists(dir_path):
        return None

    files = []
    for f in os.listdir(dir_path):
        if f.endswith('.ldb') or f.endswith('.log'):
            fp = os.path.join(dir_path, f)
            try:
                files.append((fp, os.path.getmtime(fp)))
            except:
                pass
    files.sort(key=lambda x: x[1], reverse=True)

    now_epoch = int(time.time())

    for fpath, mtime in files:
        try:
            with open(fpath, 'rb') as fp:
                content = fp.read()

            pos = 0
            while True:
                pos = content.find(b'DROPI_token', pos)
                if pos == -1: break

                for start in range(pos, max(0, pos - 8000), -1):
                    chunk = content[start:start + 12000]
                    decomp = snappy_decompress(chunk)
                    if decomp and b'DROPI_token' in decomp:
                        idx = decomp.find(b'DROPI_token')
                        m = re.search(b'\"(eyJ[A-Za-z0-9_\\-\\.]+)', decomp[idx:])
                        if m:
                            tok = m.group(1).decode('latin1')
                            parts = tok.split('.')
                            if len(parts) == 3:
                                pad = len(parts[1]) % 4
                                b64 = parts[1] + '=' * (4 - pad if pad else 0)
                                payload = json.loads(base64.b64decode(b64).decode('utf-8'))
                                if payload.get('aud') == 'DROPI' and payload.get('exp', 0) > now_epoch:
                                    return tok
                        # Continue searching backwards if this block didn't have a valid full token
                pos += 11
        except:
            pass

    return None

if __name__ == '__main__':
    tok = extract_latest_token()
    if tok:
        print('SUCCESS_TOKEN:' + tok)
        try:
            with open('.secrets/dropi_token.txt', 'w') as f:
                f.write(tok)
            env_path = '.env.local'
            if os.path.exists(env_path):
                with open(env_path, 'r', encoding='utf-8') as f:
                    env_content = f.read()
                env_content = re.sub(r'^DROPI_TOKEN=.*$', f'DROPI_TOKEN={tok}', env_content, flags=re.MULTILINE)
                with open(env_path, 'w', encoding='utf-8') as f:
                    f.write(env_content)
        except:
            pass
    else:
        print('NO_VALID_TOKEN')
