import re

with open('main.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Look for routes and lazy chunks
lazy_chunks = re.findall(r'import\(\"(\./chunk-[A-Za-z0-9]+\.js)\"\)', code)
print('Total lazy chunks referenced in main.js:', len(lazy_chunks))
print('Sample chunks:', lazy_chunks[:15])

# Also look for path: "..." definitions
routes = re.findall(r'path:\"([^\"]+)\"', code)
print('Routes in main.js:', routes[:30])
