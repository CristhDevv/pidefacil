with open('chunk-product-details.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Look for imports at top or definitions of X
# In ES modules, imports are at top
top = code[:2000]
print('Top of chunk-product-details.js:')
print(top)
