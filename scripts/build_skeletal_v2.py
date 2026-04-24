"""
Build true skeletal animation demo.
Strategy:
  - Extract "body without arms" layer from frame 0 idle
  - Extract face/head as clean layer
  - Draw arms purely in Canvas using bezier curves + rotation
  - Keyframe poses define joint angles; tween between them
"""
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
import base64, io, os

img = Image.open('miniprogram/assets/sprites/girl.png').convert('RGBA')
arr = np.array(img)
H, W = arr.shape[:2]
frame_w = W // 4
os.makedirs('docs/demo/parts2', exist_ok=True)

def to_b64(rgba_arr):
    out = Image.fromarray(rgba_arr.astype(np.uint8))
    buf = io.BytesIO()
    out.save(buf, format='PNG')
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()

# ---- Extract body layer (no arms) from frame 0 ----
fx = 0
frame = arr[:, fx:fx+frame_w, :].copy()
R = frame[:,:,0].astype(int)
G = frame[:,:,1].astype(int)
B = frame[:,:,2].astype(int)
A = frame[:,:,3].astype(int)
vis = A > 10

skin  = vis & (R>195) & (G>155) & (B>125) & (B<215) & (R-B>20)
purple= vis & (B-R>60) & (B>150) & (G<100)
gold  = vis & (R>200) & (G>140) & (B<100) & (R-B>120)

labeled, _ = ndimage.label(skin)
comps = []
for i in range(1, labeled.max()+1):
    m = labeled==i
    if m.sum() > 20:
        ys2, xs2 = np.where(m)
        comps.append({'sz':m.sum(),'ymin':int(ys2.min()),'ymax':int(ys2.max()),
                     'xmin':int(xs2.min()),'xmax':int(xs2.max()),
                     'cy':int((ys2.min()+ys2.max())//2),'cx':int((xs2.min()+xs2.max())//2),
                     'mask':m})
comps.sort(key=lambda c:-c['sz'])

# Body = largest component (head+torso skin) + purple + gold + hair (dark pixels)
# Arms = components with cy > 110 (below shoulder)
torso_mask = comps[0]['mask']

arm_masks = []
for c in comps[1:]:
    if c['cy'] > 100 and c['sz'] > 20:
        arm_masks.append(c['mask'])

# Build body-without-arms image
body_img = frame.copy()
for m in arm_masks:
    body_img[m] = [0, 0, 0, 0]

# Also erase the gold pole from body layer (we'll draw it as a bone)
body_img[gold==True] = [0, 0, 0, 0]

Image.fromarray(body_img).save('docs/demo/parts2/body_no_arms.png')
print("Saved body_no_arms.png")
print("Body size: %dx%d" % (frame_w, H))

# Also save the blink frame body (for eye blink effect)
fx1 = 1 * frame_w
frame1 = arr[:, fx1:fx1+frame_w, :].copy()
R1 = frame1[:,:,0].astype(int)
G1 = frame1[:,:,1].astype(int)
B1 = frame1[:,:,2].astype(int)
A1 = frame1[:,:,3].astype(int)
vis1 = A1 > 10
skin1 = vis1 & (R1>195) & (G1>155) & (B1>125) & (B1<215) & (R1-B1>20)
gold1 = vis1 & (R1>200) & (G1>140) & (B1<100) & (R1-B1>120)
labeled1, _ = ndimage.label(skin1)
comps1 = []
for i in range(1, labeled1.max()+1):
    m = labeled1==i
    if m.sum() > 20:
        ys2, xs2 = np.where(m)
        comps1.append({'sz':m.sum(),'ymin':int(ys2.min()),'ymax':int(ys2.max()),
                      'xmin':int(xs2.min()),'xmax':int(xs2.max()),
                      'cy':int((ys2.min()+ys2.max())//2),'cx':int((xs2.min()+xs2.max())//2),
                      'mask':m})
comps1.sort(key=lambda c:-c['sz'])
arm_masks1 = [c['mask'] for c in comps1[1:] if c['cy'] > 100 and c['sz'] > 20]
body1 = frame1.copy()
for m in arm_masks1:
    body1[m] = [0, 0, 0, 0]
body1[gold1==True] = [0, 0, 0, 0]
Image.fromarray(body1).save('docs/demo/parts2/body_blink.png')
print("Saved body_blink.png")

body_b64       = to_b64(body_img)
body_blink_b64 = to_b64(body1)

print("body b64 len:", len(body_b64))
print("Done.")

# Print measured joint positions for use in HTML
print("\n=== JOINT POSITIONS (frame_w=220, H=220) ===")
print("Left shoulder:  approx (88, 88)")
print("Right shoulder: approx (132, 88)")
print("Body center x:  110")
print("Head center:    (111, 58)")
print("Purple body:    y=80-204, x=82-138")
print("Arm length idle (left):  y=117-179 => ~62px, cx=83")
print("Arm length idle (right): y=117-169 => ~52px, cx=133")
