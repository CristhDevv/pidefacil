with open('chunk-product-details.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Let's search for all .get( or .post( or all fetch/http calls in chunk-product-details.js
import re
calls = re.findall(r'\b[a-zA-Z0-9_\.]+\((?:[^\(\)]*)\)', code)
http_related = [c for c in calls if any(k in c.lower() for k in ['http', 'api', 'service', 'product', 'get', 'post', 'show'])]
print('Total matching calls:', len(http_related))
for c in http_related[:40]:
    print('  ', c)
