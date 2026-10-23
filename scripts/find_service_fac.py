import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('chunk-product-service.js', 'r', encoding='utf-8') as f:
    code = f.read()

idx = code.find('getProductById(e)')
f_idx = code.find('\u0275fac', idx)
print(f'fac at {f_idx}:')
print(code[f_idx-50:f_idx+250])
