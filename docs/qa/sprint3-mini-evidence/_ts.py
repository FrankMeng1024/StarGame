import mss,mss.tools,sys
r={'top':650,'left':200,'width':640,'height':400}
with mss.mss() as sct:
    s=sct.grab(r)
    mss.tools.to_png(s.rgb,s.size,output=sys.argv[1])
