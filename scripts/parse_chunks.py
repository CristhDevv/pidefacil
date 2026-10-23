import re

with open('dropi_index.html', 'r', encoding='utf-8') as f:
    html = f.read()

chunks = re.findall(r'href=[\"\'](chunk-[A-Za-z0-9]+\.js)[\"\']', html)
chunks += re.findall(r'src=[\"\']([A-Za-z0-9\-_]+\.js)[\"\']', html)
print('Total scripts/chunks in index.html:', len(chunks))
for c in chunks:
    print('Chunk:', c)
