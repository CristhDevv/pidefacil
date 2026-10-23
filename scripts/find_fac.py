with open('chunk-product-details.js', 'r', encoding='utf-8') as f:
    code = f.read()

idx = code.find('Qn=')
if idx == -1:
    idx = code.find('class Qn')
if idx == -1:
    idx = code.find('Qn')
print('Qn location:', idx)

# Search for \u0275fac before 54911
fac_idx = code.rfind('\u0275fac', 0, 54911)
print('fac_idx:', fac_idx)
print(code[fac_idx-100:fac_idx+300])
