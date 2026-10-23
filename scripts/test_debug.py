import os, time, json, base64, re
from extract_chrome_token import snappy_decompress

fpath = r'C:\Users\USER\AppData\Local\Google\Chrome\User Data\Default\Local Storage\leveldb\003691.ldb'
with open(fpath, 'rb') as fp:
    content = fp.read()

pos = content.find(b'DROPI_token')
print('pos:', pos)
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
                print('SUCCESS! Valid token at start:', start)
                print('payload:', payload)
                print('Valid?', payload.get('exp') > int(time.time()))
                break
