import re

with open('chunk-product-details.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Look for http calls: get, post, api endpoints
endpoints = set(re.findall(r'[\'\"`](/[a-zA-Z0-9_\-\./\?=&]+)[\'\"`]', code))
print('Endpoints found in ProductDetailsComponent:')
for ep in sorted(endpoints):
    if any(k in ep.lower() for k in ['prod', 'detail', 'show', 'item', 'get', 'v1', 'v2', 'api', 'search']):
        print('  ', ep)

# Also look for service method calls like .get( or .post( or getProduct
service_calls = re.findall(r'(\.[a-zA-Z0-9_]+\([^\)]*\))', code)
matches = [c for c in service_calls if any(k in c.lower() for k in ['product', 'detail', 'get'])]
print('\nSample method calls:')
for m in matches[:25]:
    print('  ', m)
