with open('chunk-api-service.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Look for get( method or url constructions
idx = 0
while True:
    idx = code.find('get(', idx)
    if idx == -1: break
    print(f'\n=== get( at {idx} ===')
    print(code[max(0, idx - 100):min(len(code), idx + 300)])
    idx += 4

# Also find createAuthorizationHeader or headers
for term in ['createAuthorizationHeader', 'headers', 'baseUrl', 'endpoint']:
    idx = code.find(term)
    if idx != -1:
        print(f'\n=== Term: {term} at {idx} ===')
        print(code[max(0, idx - 100):min(len(code), idx + 300)])
