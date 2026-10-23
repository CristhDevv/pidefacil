with open('chunk-product-service.js', 'r', encoding='utf-8') as f:
    code = f.read()

idx = code.find('getProductById(e)')
# Search backwards for constructor
c_idx = code.rfind('constructor(', 0, idx)
print(f'Constructor at {c_idx}:')
print(code[c_idx:c_idx+500])
