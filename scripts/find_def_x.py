with open('chunk-product-details.js', 'r', encoding='utf-8') as f:
    code = f.read()

import re
matches = re.findall(r'(?:var|let|const|class)\s+X\b[^;{]+', code)
print('Matches for definition of X:', matches)

imports = re.findall(r'import\s*\{[^}]*\bX\b[^}]*\}\s*from\s*[\'\"`][^\'\"`]+[\'\"`]', code)
print('Matches for import of X:', imports)
