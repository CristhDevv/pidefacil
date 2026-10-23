import sys

def snappy_decompress(data):
    pos = 0
    uncompressed_len = 0
    shift = 0
    while pos < len(data):
        b = data[pos]
        pos += 1
        uncompressed_len |= (b & 0x7f) << shift
        if not (b & 0x80):
            break
        shift += 7
    
    if uncompressed_len > 10 * 1024 * 1024 or uncompressed_len == 0:
        return None
        
    out = bytearray()
    try:
        while pos < len(data) and len(out) < uncompressed_len:
            tag_byte = data[pos]
            pos += 1
            tag_type = tag_byte & 0x03
            
            if tag_type == 0: # literal
                length = (tag_byte >> 2) + 1
                if length > 60:
                    extra_bytes = length - 60
                    if pos + extra_bytes > len(data): return None
                    length = int.from_bytes(data[pos:pos+extra_bytes], 'little') + 1
                    pos += extra_bytes
                if pos + length > len(data): return None
                out.extend(data[pos:pos+length])
                pos += length
            elif tag_type == 1: # 1-byte offset copy
                length = 4 + ((tag_byte >> 2) & 0x07)
                if pos >= len(data): return None
                offset = ((tag_byte >> 5) << 8) | data[pos]
                pos += 1
                if offset == 0 or offset > len(out): return None
                for _ in range(length):
                    out.append(out[-offset])
            elif tag_type == 2: # 2-byte offset copy
                length = 1 + (tag_byte >> 2)
                if pos + 2 > len(data): return None
                offset = int.from_bytes(data[pos:pos+2], 'little')
                pos += 2
                if offset == 0 or offset > len(out): return None
                for _ in range(length):
                    out.append(out[-offset])
            elif tag_type == 3: # 4-byte offset copy
                length = 1 + (tag_byte >> 2)
                if pos + 4 > len(data): return None
                offset = int.from_bytes(data[pos:pos+4], 'little')
                pos += 4
                if offset == 0 or offset > len(out): return None
                for _ in range(length):
                    out.append(out[-offset])
        return bytes(out)
    except Exception as e:
        return None

with open(r'C:\Users\USER\AppData\Local\Google\Chrome\User Data\Default\Local Storage\leveldb\003679.ldb', 'rb') as f:
    full_data = f.read()

target_pos = full_data.find(b'casToken')
print(f"Target pos: {target_pos}")

# Try potential block starts backwards from target_pos
for start in range(target_pos, max(0, target_pos - 8000), -1):
    chunk = full_data[start:target_pos + 4000]
    decomp = snappy_decompress(chunk)
    if decomp and b'casToken' in decomp:
        print(f"SUCCESS! Found block start at {start}")
        print(f"Decompressed length: {len(decomp)}")
        idx = decomp.find(b'casToken')
        # Print surrounding text
        snippet = decomp[idx:idx+1000]
        print("Raw decompressed snippet around casToken:")
        print(snippet[:500])
        with open('scripts/extracted_decompressed.bin', 'wb') as out_f:
            out_f.write(decomp)
        break
