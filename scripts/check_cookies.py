import sqlite3, os, shutil

cookie_file = r'C:\Users\USER\AppData\Local\Google\Chrome\User Data\Default\Network\Cookies'
if os.path.exists(cookie_file):
    try:
        shutil.copy(cookie_file, 'tmp_cookies.sqlite')
        conn = sqlite3.connect('tmp_cookies.sqlite')
        c = conn.cursor()
        c.execute("SELECT host_key, name, value, encrypted_value FROM cookies WHERE host_key LIKE '%dropi%'")
        rows = c.fetchall()
        print('Found cookies count:', len(rows))
        for r in rows:
            print(r[0], r[1], 'val_len:', len(r[2]), 'enc_len:', len(r[3]))
        conn.close()
        os.remove('tmp_cookies.sqlite')
    except Exception as e:
        print('Error:', e)
else:
    print('No Cookies file')
