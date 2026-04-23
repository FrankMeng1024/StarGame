import mss, mss.tools, os, sys
sys.stdout.reconfigure(encoding='utf-8')

# From the fullscreen screenshot, simulator panel appears to be at roughly:
# physical x: ~965 to ~1260, y: ~100 to ~740
# Let's try a wider crop to confirm
GAME_PHYS = {"top": 90, "left": 955, "width": 320, "height": 700}

outpath = r'C:\ClaudeCodeProjects\StarGame\docs\qa\sprint3-mini-evidence\game-calib.png'
with mss.mss() as sct:
    shot = sct.grab(GAME_PHYS)
    mss.tools.to_png(shot.rgb, shot.size, output=outpath)
    print(f"Saved {shot.size} -> {outpath}")
