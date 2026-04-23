import json, socket, struct, base64, sys, time
sys.stdout.reconfigure(encoding='utf-8')

def make_frame(data_bytes):
    frame = bytearray([0x81])
    l = len(data_bytes)
    if l < 126:
        frame.append(0x80 | l)
    else:
        frame.extend([0x80 | 126] + list(struct.pack('>H', l)))
    mask = b'\x12\x34\x56\x78'
    frame.extend(mask)
    for i, b in enumerate(data_bytes):
        frame.append(b ^ mask[i % 4])
    return bytes(frame)

def recv_frame(sock, timeout=5):
    sock.settimeout(timeout)
    try:
        header = b''
        while len(header) < 2:
            header += sock.recv(4096)
        plen = header[1] & 0x7F
        offset = 2
        if plen == 126:
            while len(header) < 4:
                header += sock.recv(4096)
            plen = struct.unpack('>H', header[2:4])[0]
            offset = 4
        payload = header[offset:]
        while len(payload) < plen:
            payload += sock.recv(65536)
        return json.loads(payload[:plen].decode('utf-8'))
    except Exception as e:
        return {'error': str(e)}

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.connect(('127.0.0.1', 9423))

# Handshake
key = base64.b64encode(b'0123456789abcdef').decode()
h = (f'GET / HTTP/1.1\r\nHost: 127.0.0.1:9423\r\nUpgrade: websocket\r\n'
     f'Connection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n')
sock.send(h.encode())
resp = sock.recv(4096).decode('utf-8', errors='ignore')
print(f"Handshake: {'OK' if '101' in resp else 'FAIL'}")

# Try Tool.getInfo first (known to work)
msg = {'cmd': 'Tool.getInfo'}
sock.send(make_frame(json.dumps(msg).encode()))
result = recv_frame(sock, 3)
print(f"getInfo: {result}")

time.sleep(0.5)

# Try Tool.callFunction with console eval
cmd = sys.argv[1] if len(sys.argv) > 1 else "wx.__navigate('levelSelect')"
msg2 = {'cmd': 'Tool.callFunction', 'args': {'name': cmd, 'args': []}, 'id': 99}
sock.send(make_frame(json.dumps(msg2).encode()))
result2 = recv_frame(sock, 3)
print(f"callFunction: {result2}")

sock.close()
