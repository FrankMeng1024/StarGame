import mss, mss.tools, sys
r = {'top':550,'left':305,'width':540,'height':280}
with mss.mss() as sct:
    shot = sct.grab(r)
    mss.tools.to_png(shot.rgb, shot.size, output=sys.argv[1])
