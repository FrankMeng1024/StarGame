import mss, mss.tools, sys

# Try multiple regions to find correct one
regions = [
    {'top':95, 'left':965, 'width':300, 'height':660, 'name': 'region-a'},
    {'top':95, 'left':985, 'width':280, 'height':650, 'name': 'region-b'},
    {'top':140, 'left':993, 'width':265, 'height':590, 'name': 'region-c-inner'},
]
import os
outdir = os.path.dirname(sys.argv[1])
with mss.mss() as sct:
    for r in regions:
        shot = sct.grab(r)
        mss.tools.to_png(shot.rgb, shot.size, output=os.path.join(outdir, 'CALIB-' + r['name'] + '.png'))
