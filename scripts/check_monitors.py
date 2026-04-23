import mss, mss.tools, os, sys
sys.stdout.reconfigure(encoding='utf-8')

with mss.mss() as sct:
    print(f"Monitor count: {len(sct.monitors)}")
    for i, m in enumerate(sct.monitors):
        print(f"Monitor {i}: {m}")
    
    # Take screenshot of each monitor
    for i in range(1, len(sct.monitors)):
        outpath = rf'C:\ClaudeCodeProjects\StarGame\docs\qa\sprint3-mini-evidence\monitor-{i}.png'
        shot = sct.grab(sct.monitors[i])
        mss.tools.to_png(shot.rgb, shot.size, output=outpath)
        print(f"Saved monitor {i} {shot.size} -> {outpath}")
