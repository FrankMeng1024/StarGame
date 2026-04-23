import json, socket, struct, hashlib, base64, sys, time
sys.stdout.reconfigure(encoding='utf-8')

# miniprogram-automator WebSocket on port 9423
# Use raw WebSocket to send console eval

def ws_handshake(sock, host, port, path='/'):
    key = base64.b64encode(b'0123456789abcdef').decode()
    handshake = (
        f'GET {path} HTTP/1.1\r\n'
        f'Host: {host}:{port}\r\n'
        f'Upgrade: websocket\r\n'
        f'Connection: Upgrade\r\n'
        f'Sec-WebSocket-Key: {key}\r\n'
        f'Sec-WebSocket-Version: 13\r\n\r\n'
    )
    sock.send(handshake.encode())
    resp = sock.recv(4096).decode('utf-8', errors='ignore')
    return '101' in resp

def ws_send(sock, msg):
    data = json.dumps(msg).encode('utf-8')
    frame = bytearray()
    frame.append(0x81)  # FIN + text frame
    if len(data) < 126:
        frame.append(0x80 | len(data))  # MASK bit + length
    else:
        frame.append(0x80 | 126)
        frame.extend(struct.pack('>H', len(data)))
    mask = b'\x12\x34\x56\x78'
    frame.extend(mask)
    for i, b in enumerate(data):
        frame.append(b ^ mask[i % 4])
    sock.send(bytes(frame))

def ws_recv(sock, timeout=5):
    sock.settimeout(timeout)
    try:
        data = sock.recv(65536)
        if len(data) < 2:
            return None
        fin = (data[0] & 0x80) != 0
        opcode = data[0] & 0x0F
        masked = (data[1] & 0x80) != 0
        plen = data[1] & 0x7F
        offset = 2
        if plen == 126:
            plen = struct.unpack('>H', data[2:4])[0]
            offset = 4
        payload = data[offset:offset+plen]
        return json.loads(payload.decode('utf-8'))
    except Exception as e:
        return None

command = sys.argv[1] if len(sys.argv) > 1 else "wx.__navigate('levelSelect')"

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.connect(('127.0.0.1', 9423))
if ws_handshake(sock, '127.0.0.1', 9423):
    print("WS connected")
    # Try Tool.callFunction or similar
    msg = {"cmd": "Tool.callFunction", "args": {"name": "eval", "args": [command]}, "id": 1}
    ws_send(sock, msg)
    resp = ws_recv(sock, timeout=3)
    print(f"Response: {resp}")
else:
    print("WS handshake failed")
sock.close()
