import json, socket, struct, base64, sys, time
sys.stdout.reconfigure(encoding='utf-8')

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.connect(('127.0.0.1', 9797))

key = base64.b64encode(b'0123456789abcdef').decode()
h = (f'GET / HTTP/1.1\r\nHost: 127.0.0.1:9797\r\nUpgrade: websocket\r\n'
     f'Connection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n')
sock.send(h.encode())
resp = sock.recv(4096).decode('utf-8', errors='ignore')
print(f"Raw response: {repr(resp[:200])}")
sock.close()
