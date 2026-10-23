with open('main.js', 'r', encoding='utf-8') as f:
    code = f.read()

idx = code.find('path:"dashboard"')
if idx != -1:
    print(code[idx:idx+400])
