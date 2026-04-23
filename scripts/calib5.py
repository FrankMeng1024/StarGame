import mss, mss.tools, os, sys
sys.stdout.reconfigure(encoding='utf-8')

# Simulator phone at physical x=1260..1900, y=130..760+ 
# Let's try to get full height
GAME_PHYS = {"top": 85, "left": 1255, "width": 660, "height": 820}

outpath = r'C:\ClaudeCodeProjects\StarGame\docs\qa\sprint3-mini-evidence\game-calib5.png'
with mss.mss() as sct:
    shot = sct.grab(GAME_PHYS)
    mss.tools.to_png(shot.rgb, shot.size, output=outpath)
    print(f"Saved {shot.size} -> {outpath}")
