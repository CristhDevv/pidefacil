with open(r'C:\Users\USER\AppData\Local\Google\Chrome\User Data\Default\Local Storage\leveldb\003679.ldb', 'rb') as f:
    data = f.read()

pos = data.find(b'casToken')
print(f"casToken pos: {pos}")

# Let's search backwards for the start of this block or look at the surrounding 20KB
start = max(0, pos - 10000)
end = min(len(data), pos + 10000)
print(f"Slice around casToken: {start} to {end}")
