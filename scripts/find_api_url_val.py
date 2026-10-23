with open('chunk-v.js', 'r', encoding='utf-8') as f:
    code = f.read()

import re
matches = re.findall(r'apiUrl[:\s=]+[\'\"`][^\'\"`]+[\'\"`]', code)
print('Matches in chunk-v.js:', matches)

with open('main.js', 'r', encoding='utf-8') as f:
    code2 = f.read()
matches2 = re.findall(r'apiUrl[:\s=]+[\'\"`][^\'\"`]+[\'\"`]', code2)
print('Matches in main.js:', matches2)
