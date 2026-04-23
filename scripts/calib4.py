import mss, mss.tools, os, sys
sys.stdout.reconfigure(encoding='utf-8')

# DevTools logical (1,0,1279,800) → physical with 150% DPI: (1,0,1918,1200)
# In the fullscreen screenshot (1920x1200 physical), DevTools occupies almost whole screen
# Simulator (right panel) visible in screenshot at x~1385-1263 ... let me re-examine
# In the fullscreen.png, I could see:
#   - Left file tree: physical ~0-440
#   - Middle code: physical ~440-1265  
#   - Right simulator panel: physical ~1265-1390 (the narrow preview)
#   Wait no - the full screenshot showed the simulator much wider on the right

# Let me just try the far right: x=1260-1900, y=130-760
GAME_PHYS = {"top": 130, "left": 1260, "width": 640, "height": 630}

outpath = r'C:\ClaudeCodeProjects\StarGame\docs\qa\sprint3-mini-evidence\game-calib4.png'
with mss.mss() as sct:
    shot = sct.grab(GAME_PHYS)
    mss.tools.to_png(shot.rgb, shot.size, output=outpath)
    print(f"Saved {shot.size} -> {outpath}")
