import mss, mss.tools, sys
r = {'top':0,'left':0,'width':1920,'height':1200}
with mss.mss() as sct:
    shot = sct.grab(r)
    mss.tools.to_png(shot.rgb, shot.size, output=sys.argv[1])
