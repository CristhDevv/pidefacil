import re

with open('scripts/extracted_decompressed.bin', 'rb') as f:
    data = f.read()

idx = data.find(b'casToken')
rest = data[idx:]
print('Len from casToken to end of block:', len(rest))

m = re.search(b'\"(eyJ[A-Za-z0-9_\\-\\.]+)', rest)
if m:
    tok = m.group(1).decode('latin1')
    print('Token found in this block!')
    print('Length:', len(tok))
    print('Token ends with:', tok[-30:])
    parts = tok.split('.')
    print('Num parts:', len(parts))
    if len(parts) == 3:
        print('Complete 3-part JWT!')
        with open('.secrets/cas_token.txt', 'w') as out_f:
            out_f.write(tok)
    else:
        print('Partial JWT (needs next block)')
else:
    print('Regex failed on rest:', rest[:200])
