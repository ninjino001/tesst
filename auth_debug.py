import json
import urllib.request
import urllib.error

url = 'http://localhost:3000/api/auth/login/'
data = json.dumps({'username': 'admin@aimos.ma', 'password': 'aimos123'}).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req) as res:
        print('STATUS', res.status)
        print('HEADERS', res.getheaders())
        print(res.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print('STATUS', e.code)
    print('HEADERS', list(e.headers.items()))
    print(e.read().decode('utf-8'))
