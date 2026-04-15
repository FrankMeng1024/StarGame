import mss,mss.tools,sys
r={'top':1000,'left':305,'width':535,'height':200}
with mss.mss() as sct:
    s=sct.grab(r)
    mss.tools.to_png(s.rgb,s.size,output=sys.argv[1])
