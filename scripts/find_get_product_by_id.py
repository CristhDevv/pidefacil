with open('chunk-product-service.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Find export of c
idx = code.rfind('as X')
if idx != -1:
    print('Export of X at:', idx)
    print(code[idx-50:idx+50])

# Find getProductById inside this file
idx = 0
while True:
    idx = code.find('getProductById', idx)
    if idx == -1: break
    print(f'\n=== getProductById at {idx} ===')
    print(code[max(0, idx - 100):min(len(code), idx + 400)])
    idx += 14
