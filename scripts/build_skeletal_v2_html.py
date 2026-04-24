"""
Build true skeletal animation demo v2.
Body sprite has no arms. Arms are drawn as Canvas bone segments
that rotate around shoulder joints. Pole is a Canvas line.
Keyframe poses define upper/lower arm angles; lerp between them.
"""
import base64, io, os
from PIL import Image

def f2b64(path):
    with open(path, 'rb') as f:
        return 'data:image/png;base64,' + base64.b64encode(f.read()).decode()

body_b64  = f2b64('docs/demo/parts2/body_no_arms.png')
blink_b64 = f2b64('docs/demo/parts2/body_blink.png')

# Build HTML
parts = []
parts.append("""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Skeletal Animation Demo v2</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { background:#0a0a1a; display:flex; flex-direction:column; align-items:center;
       justify-content:center; min-height:100vh; font-family:monospace; color:#aaa; }
h1 { margin-bottom:12px; font-size:13px; color:#555; letter-spacing:2px; text-transform:uppercase; }
canvas { border:1px solid #1a1a2a; background:#0d0d20; }
.controls { margin-top:16px; display:flex; gap:10px; flex-wrap:wrap; justify-content:center; }
button { background:#111127; color:#7788dd; border:1px solid #2a2a44; padding:7px 14px;
         cursor:pointer; font-family:monospace; font-size:12px; border-radius:4px; }
button:hover { background:#1e1e40; color:#fff; }
button.active { background:#1a1a50; color:#aaccff; border-color:#3344aa; }
.info { margin-top:10px; font-size:10px; color:#333; max-width:480px; text-align:center; line-height:1.5; }
.status { margin-top:6px; font-size:10px; color:#3a3a55; }
</style>
</head>
<body>
<h1>Skeletal Animation Demo v2 — Canvas Bones</h1>
<canvas id="c"></canvas>
<div class="controls">
  <button id="btn-idle"    onclick="setState('idle')">Idle</button>
  <button id="btn-throw"   onclick="setState('throw')">Throw</button>
  <button id="btn-catch"   onclick="setState('catch')">Catch</button>
  <button id="btn-retract" onclick="setState('retract')">Retract</button>
  <button id="btn-auto"    onclick="toggleAuto()">&#9654; Auto</button>
</div>
<div class="status" id="status">loading...</div>
<div class="info">
  Body sprite has arms removed. Arms = Canvas bone segments rotating around shoulder joints.
  All transitions are true skeletal interpolation — no sprite switching.
</div>
<script>
// ---- Canvas setup ----
var SCALE = 2;
var FW = 220, FH = 220;
var canvas = document.getElementById('c');
canvas.width  = FW * SCALE;
canvas.height = FH * SCALE;
var ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// ---- Skeleton constants (in sprite pixels, will be scaled) ----
// Body sprite: 220x220px
// Shoulders (sprite coords):
var L_SHX = 90,  L_SHY = 90;   // left shoulder joint
var R_SHX = 130, R_SHY = 90;   // right shoulder joint

// Arm segment lengths (sprite pixels)
var UPPER_LEN = 30;   // upper arm
var LOWER_LEN = 28;   // forearm
var HAND_R    = 7;    // hand circle radius

// Pole length
var POLE_LEN  = 72;

// Skin color
var SKIN_FILL   = '#FFDFC4';
var SKIN_STROKE = '#E8B890';
var POLE_COL    = '#EAB045';
var POLE_STROKE = '#C8882A';
var STAR_COL    = '#FFD700';

// ---- Keyframe poses ----
// Each pose: { lUpper, lLower, rUpper, rLower, poleAngle }
// Angles in DEGREES, measured from vertical downward (0 = straight down)
// Positive = clockwise (toward body center), negative = outward
// Upper arm angle from vertical; lower arm angle relative to upper arm
var POSES = {
  idle: {
    lUpper:  10,  lLower:  -5,   // left arm hangs slightly inward
    rUpper: -10,  rLower:   5,   // right arm hangs slightly inward
    poleAngle: 85,               // pole nearly horizontal at side
    poleHand: 'right',
    bob: true
  },
  throw: {
    lUpper:  35,  lLower:   20,  // left arm slightly forward
    rUpper: -140, rLower: -20,   // right arm raised high
    poleAngle: -55,              // pole angled up-right
    poleHand: 'right',
    bob: false
  },
  catch: {
    lUpper: -130, lLower: -25,   // left arm raised
    rUpper: -140, rLower: -20,   // right arm raised
    poleAngle: -60,
    poleHand: 'right',
    bob: false
  },
  retract: {
    lUpper:  10,  lLower:  -5,
    rUpper: -140, rLower: -20,   // right still raised (holding net)
    poleAngle: -55,
    poleHand: 'right',
    bob: false
  }
};

// ---- State machine ----
var currentPose = 'idle';
var targetPose  = 'idle';
var blendT = 1.0;
var BLEND_MS = 280;

var isBlinking = false;
var blinkTimer = 0;
var BLINK_INTERVAL = 3400;
var BLINK_DURATION = 150;
var bobPhase = 0;
var BOB_SPEED = 0.0016;
var BOB_AMP   = 1.8;  // sprite pixels

var autoMode = false;
var AUTO_SEQ = [
  { pose:'idle',    hold:1500 },
  { pose:'throw',   hold:700  },
  { pose:'catch',   hold:900  },
  { pose:'retract', hold:700  },
  { pose:'idle',    hold:1200 },
];
var autoIdx = 0;
var autoHold = 0;

var lastTime = 0;
var bodyImg = null, blinkImg = null;

function lerp(a, b, t) { return a + (b - a) * t; }

function easeInOut(t) {
  return t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
}

// Interpolate between two poses
function blendPose(src, dst, t) {
  var e = easeInOut(t);
  return {
    lUpper:    lerp(src.lUpper,    dst.lUpper,    e),
    lLower:    lerp(src.lLower,    dst.lLower,    e),
    rUpper:    lerp(src.rUpper,    dst.rUpper,    e),
    rLower:    lerp(src.rLower,    dst.rLower,    e),
    poleAngle: lerp(src.poleAngle, dst.poleAngle, e),
    poleHand:  dst.poleHand,
    bob:       dst.bob
  };
}

function setState(p) {
  if (p === targetPose && blendT >= 1) return;
  if (blendT < 1 && blendT > 0.5) currentPose = targetPose;
  targetPose = p;
  blendT = 0;
  ['idle','throw','catch','retract'].forEach(function(s) {
    var b = document.getElementById('btn-' + s);
    if (b) b.className = (s === p ? 'active' : '');
  });
}

function toggleAuto() {
  autoMode = !autoMode;
  var b = document.getElementById('btn-auto');
  b.textContent = autoMode ? '\u23F9 Stop' : '\u25B6 Auto';
  if (autoMode) {
    autoIdx = 0;
    autoHold = AUTO_SEQ[0].hold;
    setState(AUTO_SEQ[0].pose);
  }
}

// ---- Draw one arm ----
// ox,oy = shoulder joint (canvas coords)
// upperAngleDeg = angle of upper arm from vertical (degrees)
// lowerAngleDeg = angle of lower arm relative to upper arm (degrees)
function drawArm(ctx, ox, oy, upperAngleDeg, lowerAngleDeg, upperLen, lowerLen, handR, s) {
  var uRad = (upperAngleDeg - 90) * Math.PI / 180;  // -90 so 0 = down
  // Actually: 0deg = straight down = angle PI/2 from positive-x axis
  // Let's define 0 = straight down
  var uA = upperAngleDeg * Math.PI / 180;
  // elbow
  var ex = ox + Math.sin(uA) * upperLen * s;
  var ey = oy + Math.cos(uA) * upperLen * s;

  var lA = uA + lowerAngleDeg * Math.PI / 180;
  // wrist
  var wx = ex + Math.sin(lA) * lowerLen * s;
  var wy = ey + Math.cos(lA) * lowerLen * s;

  var thick = 12 * s;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Upper arm
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  ctx.lineTo(ex, ey);
  ctx.strokeStyle = SKIN_STROKE;
  ctx.lineWidth = thick;
  ctx.stroke();
  ctx.strokeStyle = SKIN_FILL;
  ctx.lineWidth = thick - 3*s;
  ctx.stroke();

  // Lower arm
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(wx, wy);
  ctx.strokeStyle = SKIN_STROKE;
  ctx.lineWidth = thick - 2*s;
  ctx.stroke();
  ctx.strokeStyle = SKIN_FILL;
  ctx.lineWidth = thick - 5*s;
  ctx.stroke();

  // Hand circle
  ctx.beginPath();
  ctx.arc(wx, wy, handR * s, 0, Math.PI * 2);
  ctx.fillStyle = SKIN_STROKE;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(wx, wy, (handR - 1.5) * s, 0, Math.PI * 2);
  ctx.fillStyle = SKIN_FILL;
  ctx.fill();

  return { ex: ex, ey: ey, wx: wx, wy: wy };
}

// ---- Draw pole ----
function drawPole(ctx, wx, wy, poleAngleDeg, poleLen, s) {
  var pA = poleAngleDeg * Math.PI / 180;
  var px = wx + Math.sin(pA) * poleLen * s;
  var py = wy + Math.cos(pA) * poleLen * s;

  // Bamboo pole (thick line)
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(wx, wy);
  ctx.lineTo(px, py);
  ctx.strokeStyle = '#C8882A';
  ctx.lineWidth = 7 * s;
  ctx.stroke();
  ctx.strokeStyle = POLE_COL;
  ctx.lineWidth = 5 * s;
  ctx.stroke();

  // Star at tip
  drawStar(ctx, px, py, 8 * s, 5);
}

function drawStar(ctx, cx, cy, r, points) {
  var inner = r * 0.4;
  ctx.beginPath();
  for (var i = 0; i < points * 2; i++) {
    var radius = (i % 2 === 0) ? r : inner;
    var angle  = (i * Math.PI / points) - Math.PI / 2;
    if (i === 0) ctx.moveTo(cx + Math.cos(angle)*radius, cy + Math.sin(angle)*radius);
    else         ctx.lineTo(cx + Math.cos(angle)*radius, cy + Math.sin(angle)*radius);
  }
  ctx.closePath();
  ctx.fillStyle = STAR_COL;
  ctx.fill();
  ctx.strokeStyle = '#C89000';
  ctx.lineWidth = 1;
  ctx.stroke();
}

// ---- Main render ----
function render(now) {
  var dt = Math.min(now - lastTime, 50);
  lastTime = now;

  if (blendT < 1) blendT = Math.min(1, blendT + dt / BLEND_MS);

  bobPhase += BOB_SPEED * dt;
  var bob = 0;

  blinkTimer += dt;
  if (!isBlinking && blinkTimer > BLINK_INTERVAL) { isBlinking = true; blinkTimer = 0; }
  if (isBlinking && blinkTimer > BLINK_DURATION)  { isBlinking = false; blinkTimer = 0; }

  if (autoMode) {
    autoHold -= dt;
    if (autoHold <= 0 && blendT >= 1) {
      autoIdx = (autoIdx + 1) % AUTO_SEQ.length;
      autoHold = AUTO_SEQ[autoIdx].hold;
      setState(AUTO_SEQ[autoIdx].pose);
    }
  }

  var srcP = POSES[currentPose] || POSES.idle;
  var dstP = POSES[targetPose]  || POSES.idle;
  var pose = blendPose(srcP, dstP, blendT);

  if (pose.bob) bob = Math.sin(bobPhase) * BOB_AMP;

  var s = SCALE;
  var CW = canvas.width, CH = canvas.height;

  ctx.clearRect(0, 0, CW, CH);
  ctx.save();
  ctx.translate(0, bob * s);

  // 1. Draw body sprite (no arms)
  var useImg = (isBlinking && blinkT < 1) ? blinkImg : bodyImg;
  if (!useImg) useImg = bodyImg;
  if (useImg) {
    ctx.globalAlpha = 1;
    ctx.drawImage(useImg, 0, 0, CW, CH);
  }

  // 2. Draw left arm (behind body in idle, could layer later)
  var ls = drawArm(ctx, L_SHX*s, L_SHY*s,
    pose.lUpper, pose.lLower,
    UPPER_LEN, LOWER_LEN, HAND_R, s);

  // 3. Draw right arm + pole
  var rs = drawArm(ctx, R_SHX*s, R_SHY*s,
    pose.rUpper, pose.rLower,
    UPPER_LEN, LOWER_LEN, HAND_R, s);

  // Pole attached to right hand wrist
  if (rs) {
    drawPole(ctx, rs.wx, rs.wy, pose.poleAngle, POLE_LEN, s);
  }

  ctx.restore();

  document.getElementById('status').textContent =
    'pose: ' + currentPose + ' > ' + targetPose +
    ' t=' + blendT.toFixed(2) +
    '  lUpper=' + pose.lUpper.toFixed(1) +
    '  rUpper=' + pose.rUpper.toFixed(1);

  requestAnimationFrame(render);
}

function loadImg(src) {
  return new Promise(function(r) {
    var img = new Image();
    img.onload = function() { r(img); };
    img.src = src;
  });
}

Promise.all([
  loadImg('""")

parts.append(body_b64)

parts.append("""'),
  loadImg('""")

parts.append(blink_b64)

parts.append("""'),
]).then(function(imgs) {
  bodyImg  = imgs[0];
  blinkImg = imgs[1];
  lastTime = performance.now();
  setState('idle');
  requestAnimationFrame(render);
});
</script>
</body>
</html>
""")

out = 'docs/demo/skeletal-v2.html'
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, 'w', encoding='utf-8') as f:
    f.write(''.join(parts))
print("Written: %s (%d bytes)" % (out, os.path.getsize(out)))
