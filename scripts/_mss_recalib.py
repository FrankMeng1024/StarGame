import mss, mss.tools, sys
# New calibrated region based on full physical screenshot analysis
# Simulator appears at physical x=975-1265, y=90-740 in 1920x1200
r = {'top':90,'left':975,'width':290,'height':650}
with mss.mss() as sct:
    shot = sct.grab(r)
    mss.tools.to_png(shot.rgb, shot.size, output=sys.argv[1])
