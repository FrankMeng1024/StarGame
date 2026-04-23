import json, socket, struct, base64, sys, time
sys.stdout.reconfigure(encoding='utf-8')

def ws_handshake(sock, host, port, path='/'):
    key = base64.b64encode(b'0123456789abcdef').decode()
    h = (f'GET {path} HTTP/1.1\r\nHost: {host}:{port}\r\nUpgrade: websocket\r\n'
         f'Connection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n')
    sock.send(h.encode())
    resp = sock.recv(4096).decode('utf-8', errors='ignore')
    return '101' in resp

def ws_send(sock, msg):
    data = json.dumps(msg).encode('utf-8')
    frame = bytearray([0x81])
    if len(data) < 126:
        frame.append(0x80 | len(data))
    else:
        frame.extend([0x80 | 126] + list(struct.pack('>H', len(data))))
    mask = b'\x12\x34\x56\x78'
    frame.extend(mask)
    for i, b in enumerate(data):
        frame.append(b ^ mask[i % 4])
    sock.send(bytes(frame))

def ws_recv(sock, timeout=5):
    sock.settimeout(timeout)
    try:
        data = b''
        while len(data) < 2:
            chunk = sock.recv(65536)
            if not chunk:
                return None
            data += chunk
        plen = data[1] & 0x7F
        offset = 2
        if plen == 126:
            while len(data) < 4:
                data += sock.recv(1024)
            plen = struct.unpack('>H', data[2:4])[0]
            offset = 4
        while len(data) < offset + plen:
            data += sock.recv(65536)
        return json.loads(data[offset:offset+plen].decode('utf-8'))
    except Exception as e:
        print(f"recv error: {e}", file=sys.stderr)
        return None

# Try different command formats
commands_to_try = [
    {"cmd": "Tool.getInfo"},
    {"cmd": "App.callFunction", "args": {"name": "eval", "args": ["1+1"]}},
    {"cmd": "Console.evaluate", "args": {"expression": "1+1"}},
    {"cmd": "eval", "args": {"expression": "1+1"}},
]

for cmd in commands_to_try:
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.connect(('127.0.0.1', 9423))
        if ws_handshake(sock, '127.0.0.1', 9423):
            ws_send(sock, cmd)
            resp = ws_recv(sock, timeout=3)
            print(f"cmd={cmd.get('cmd')} resp={resp}")
        sock.close()
        time.sleep(0.5)
    except Exception as e:
        print(f"cmd={cmd.get('cmd')} error={e}")
