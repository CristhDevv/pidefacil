import re

with open('chunk-dashboard.js', 'r', encoding='utf-8') as f:
    code = f.read()

idx = code.find('product-details')
if idx != -1:
    print('Found product-details in chunk-dashboard.js!')
    print(code[max(0, idx - 100):min(len(code), idx + 300)])
else:
    print('product-details not found in chunk-dashboard.js')
    routes = re.findall(r'path:\"([^\"]+)\"', code)
    print('Routes in dashboard:', routes)
    chunks = re.findall(r'import\(\"(\./chunk-[A-Za-z0-9]+\.js)\"\)', code)
    print('Lazy chunks in dashboard:', len(chunks), chunks[:10])
