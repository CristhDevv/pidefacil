import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('chunk-v.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Find export of V or k
idx = code.rfind('as V')
if idx != -1:
    print('Export of V at:', idx)
    print(code[idx-50:idx+50])

# Find class that has get(url, params)
idx = 0
while True:
    idx = code.find('get(', idx)
    if idx == -1: break
    print(f'\n=== get( at {idx} ===')
    print(code[max(0, idx - 100):min(len(code), idx + 300)])
    idx += 4
