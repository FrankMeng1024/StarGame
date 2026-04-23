import mss, mss.tools, os, sys
sys.stdout.reconfigure(encoding='utf-8')

# DevTools window: left=1, top=0, right=1279, bottom=800
# In the full monitor screenshot (1920x1200), the simulator was on the right side
# The screenshot showed the simulator phone at approx x=970-1260, y=88-745
# But mss captures entire 1920x1200 screen
# Let me reconsider: the monitor is 1920x1200 at left=0
# DevTools: left=1, right=1279 → within 0-1920 range

# From the screenshot I saw:
# - Left panel (file tree): x~1..305 
# - Middle panel (code view): x~305..845
# - Right panel (simulator): x~845..1279 in DevTools
# The simulator phone frame within that right panel

# Let me try: simulator at x=960..1270, y=85..760
GAME_PHYS = {"top": 85, "left": 960, "width": 310, "height": 680}

outpath = r'C:\ClaudeCodeProjects\StarGame\docs\qa\sprint3-mini-evidence\game-calib3.png'
with mss.mss() as sct:
    shot = sct.grab(GAME_PHYS)
    mss.tools.to_png(shot.rgb, shot.size, output=outpath)
    print(f"Saved {shot.size} -> {outpath}")
