import mss, mss.tools, os, sys
sys.stdout.reconfigure(encoding='utf-8')

# From the full screenshot, the simulator appears at right side
# Full screen 1920x1200
# DevTools title bar top ~y=0, simulator right panel at x~965-1265, y~90-740
# The game phone frame visible in screenshot at roughly: x=975..1257, y=88..745

GAME_PHYS = {"top": 85, "left": 975, "width": 290, "height": 660}

outpath = r'C:\ClaudeCodeProjects\StarGame\docs\qa\sprint3-mini-evidence\game-calib2.png'
with mss.mss() as sct:
    shot = sct.grab(GAME_PHYS)
    mss.tools.to_png(shot.rgb, shot.size, output=outpath)
    print(f"Saved {shot.size} -> {outpath}")
