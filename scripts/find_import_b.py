with open('chunk-v.js', 'r', encoding='utf-8') as f:
    code = f.read()

import re
matches = re.findall(r'import\s*\{[^}]*\bb\b[^}]*\}\s*from\s*[\'\"`][^\'\"`]+[\'\"`]', code[:2000])
print('Matches:', matches)
