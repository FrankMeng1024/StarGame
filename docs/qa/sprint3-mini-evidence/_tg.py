import mss,mss.tools,sys
r={'top':140,'left':1340,'width':410,'height':880}
with mss.mss() as sct:
    s=sct.grab(r)
    mss.tools.to_png(s.rgb,s.size,output=sys.argv[1])
