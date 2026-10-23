with open('chunk-v.js', 'r', encoding='utf-8') as f:
    code = f.read()

idx = 0
while True:
    idx = code.find('apiUrl', idx)
    if idx == -1: break
    print(f'=== apiUrl at {idx} ===')
    print(code[max(0, idx - 50):min(len(code), idx + 200)])
    idx += 6
