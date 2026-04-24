"""Build skeletal animation demo HTML — embeds sprite frame PNGs as base64."""
import base64, os

def f2b64(path):
    with open(path, 'rb') as f:
        return 'data:image/png;base64,' + base64.b64encode(f.read()).decode()

idle_b64  = f2b64('docs/demo/parts/idle.png')
blink_b64 = f2b64('docs/demo/parts/blink.png')
throw_b64 = f2b64('docs/demo/parts/throw.png')
catch_b64 = f2b64('docs/demo/parts/catch.png')

# Build HTML with embedded images — no external dependencies
html_parts = []
html_parts.append("""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Skeletal Animation Demo</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { background:#0a0a1a; display:flex; flex-direction:column; align-items:center;
       justify-content:center; min-height:100vh; font-family:monospace; color:#aaa; }
h1 { margin-bottom:16px; font-size:13px; color:#555; letter-spacing:2px; text-transform:uppercase; }
canvas { border:1px solid #1a1a2a; image-rendering:pixelated; }
.controls { margin-top:18px; display:flex; gap:10px; flex-wrap:wrap; justify-content:center; }
button { background:#111127; color:#7788dd; border:1px solid #2a2a44; padding:7px 14px;
         cursor:pointer; font-family:monospace; font-size:12px; border-radius:4px; transition:all .15s; }
button:hover { background:#1e1e40; color:#fff; }
button.active { background:#1a1a50; color:#aaccff; border-color:#3344aa; }
.info { margin-top:14px; font-size:10px; color:#3a3a5a; max-width:480px; text-align:center;
        line-height:1.6; }
.status { margin-top:8px; font-size:11px; color:#333; }
</style>
</head>
<body>
<h1>Girl Character — Pose Blend Demo</h1>
<canvas id="c"></canvas>
<div class="controls">
  <button id="btn-idle"    onclick="setState('idle')">Idle</button>
  <button id="btn-throw"   onclick="setState('throw')">Throw</button>
  <button id="btn-catch"   onclick="setState('catch')">Catch</button>
  <button id="btn-retract" onclick="setState('retract')">Retract</button>
  <button id="btn-auto"    onclick="toggleAuto()">&#9654; Auto Demo</button>
</div>
<div class="status" id="status">Loading...</div>
<div class="info">
  Pose blending: cross-fades between 4 sprite keyframes (idle/blink/throw/catch)
  with eased alpha transitions. Idle adds a gentle breathing bob.
  Blink cycles automatically. Retract holds the throw pose until complete.
</div>
<script>
var SCALE = 2;
var FW = 220, FH = 220;
var canvas = document.getElementById('c');
canvas.width = FW * SCALE;
canvas.height = FH * SCALE;
var ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// Pose -> frame image key
var POSE_FRAME = { idle:'idle', blink:'blink', throw:'throw', catch:'catch', retract:'throw' };

// State
var currentPose = 'idle';
var targetPose  = 'idle';
var blendT = 1.0;
var BLEND_MS = 220;

var isBlinking = false;
var blinkTimer = 0;
var BLINK_INTERVAL = 3200;
var BLINK_DURATION = 140;

var bobPhase = 0;
var BOB_SPEED = 0.0018;
var BOB_AMP = 2.0;

var autoMode = false;
var AUTO_SEQ = [
  { pose:'idle',    hold:1400 },
  { pose:'throw',   hold:700  },
  { pose:'catch',   hold:900  },
  { pose:'retract', hold:700  },
  { pose:'idle',    hold:1100 },
];
var autoIdx = 0;
var autoHold = 0;

var imgs = {};
var lastTime = 0;

function easeInOut(t) {
  return t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
}

function setState(p) {
  if (p === targetPose && blendT >= 1) return;
  if (blendT < 1) {
    // Snap current to wherever blend is
    if (blendT > 0.5) currentPose = targetPose;
  }
  targetPose = p;
  blendT = 0;
  ['idle','throw','catch','retract'].forEach(function(s) {
    var b = document.getElementById('btn-' + s);
    if (b) b.className = (s === p) ? 'active' : '';
  });
}

function toggleAuto() {
  autoMode = !autoMode;
  var b = document.getElementById('btn-auto');
  b.textContent = autoMode ? '\u23F9 Stop' : '\u25B6 Auto Demo';
  if (autoMode) {
    autoIdx = 0;
    autoHold = AUTO_SEQ[0].hold;
    setState(AUTO_SEQ[0].pose);
  }
}

function tick(now) {
  var dt = Math.min(now - lastTime, 50);
  lastTime = now;

  // Blend progress
  if (blendT < 1) blendT = Math.min(1, blendT + dt / BLEND_MS);

  // Bob
  bobPhase += BOB_SPEED * dt;
  var bobScale = (targetPose === 'idle' && blendT > 0.8) ? 1.0 :
                 (targetPose === 'idle') ? blendT : (1 - blendT * 0.7);
  var bob = Math.sin(bobPhase) * BOB_AMP * SCALE * bobScale;

  // Blink
  blinkTimer += dt;
  if (!isBlinking && blinkTimer > BLINK_INTERVAL) { isBlinking = true; blinkTimer = 0; }
  if (isBlinking && blinkTimer > BLINK_DURATION)  { isBlinking = false; blinkTimer = 0; }

  // Auto sequence
  if (autoMode) {
    autoHold -= dt;
    if (autoHold <= 0 && blendT >= 1) {
      autoIdx = (autoIdx + 1) % AUTO_SEQ.length;
      autoHold = AUTO_SEQ[autoIdx].hold;
      setState(AUTO_SEQ[autoIdx].pose);
    }
  }

  // Resolve frame keys
  var srcKey = POSE_FRAME[currentPose] || 'idle';
  var dstKey = POSE_FRAME[targetPose]  || 'idle';
  // Blink override
  if (isBlinking && currentPose === 'idle' && targetPose === 'idle') srcKey = 'blink';

  var srcImg = imgs[srcKey];
  var dstImg = imgs[dstKey];
  var t = easeInOut(blendT);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(0, bob);

  if (!srcImg || !dstImg) {
    ctx.restore();
    requestAnimationFrame(tick);
    return;
  }

  if (blendT >= 1 || srcKey === dstKey) {
    ctx.globalAlpha = 1;
    ctx.drawImage(dstImg, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.globalAlpha = 1 - t;
    ctx.drawImage(srcImg, 0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = t;
    ctx.drawImage(dstImg, 0, 0, canvas.width, canvas.height);
  }

  ctx.restore();

  document.getElementById('status').textContent =
    'pose: ' + currentPose + ' \u2192 ' + targetPose +
    ' | blend: ' + blendT.toFixed(2) +
    (isBlinking ? ' | *blink*' : '');

  requestAnimationFrame(tick);
}

function loadImg(key, src) {
  return new Promise(function(resolve) {
    var img = new Image();
    img.onload = function() { imgs[key] = img; resolve(); };
    img.src = src;
  });
}

Promise.all([
  loadImg('idle',  '""")
html_parts.append(idle_b64)
html_parts.append("""'),
  loadImg('blink', '""")
html_parts.append(blink_b64)
html_parts.append("""'),
  loadImg('throw', '""")
html_parts.append(throw_b64)
html_parts.append("""'),
  loadImg('catch', '""")
html_parts.append(catch_b64)
html_parts.append("""'),
]).then(function() {
  lastTime = performance.now();
  setState('idle');
  requestAnimationFrame(tick);
});
</script>
</body>
</html>
""")

out = os.path.join('docs', 'demo', 'skeleton-demo.html')
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, 'w', encoding='utf-8') as f:
    f.write(''.join(html_parts))
print(f"Written: {out} ({os.path.getsize(out):,} bytes)")
