import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('chunk-product-service.js', 'r', encoding='utf-8') as f:
    code = f.read()

idx = code.find('getProductById(e)')
# Look for export at bottom
print('End of file preview:')
print(code[-1000:])
