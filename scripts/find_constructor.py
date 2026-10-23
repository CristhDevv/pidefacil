with open('chunk-product-details.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Find constructor of ProductDetailsComponent
idx = code.find('ProductDetailsComponent')
print('ProductDetailsComponent at:', idx)
print(code[max(0, idx - 500):min(len(code), idx + 1000)])
