with open('chunk-product-details.js', 'r', encoding='utf-8') as f:
    code = f.read()

for term in ['getProductDetails', 'getProductById', 'fetchProduct']:
    idx = 0
    while True:
        idx = code.find(term, idx)
        if idx == -1: break
        print(f'=== Term: {term} at {idx} ===')
        print(code[max(0, idx - 100):min(len(code), idx + 350)])
        idx += len(term)
