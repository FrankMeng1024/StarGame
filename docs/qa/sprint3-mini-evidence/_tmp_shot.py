import mss,mss.tools,sys
r={'top':140,'left':1340,'width':410,'height':880}
with mss.mss() as sct:
    shot=sct.grab(r)
    mss.tools.to_png(shot.rgb,shot.size,output=sys.argv[1])
