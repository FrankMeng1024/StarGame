"""
Find exact pixel coordinates of level 1 button by cropping debug regions
from mss-game-t01.png (full physical 1917x1200 screenshot)
"""
from PIL import Image

base = Image.open('docs/qa/sprint2-mini-evidence/mss-game-t01.png')
print(f"Base size: {base.size}")  # 1917x1200

# Level grid in the simulator is on the RIGHT side of the screen
# From reading the image: phone frame at approximately physical x=965-1270
# Level 1 (白羊座 X icon) - first item in grid, top-left
#
# The grid starts below the header row (which has 一游目 and 超凡天下 text + ... button)
# Grid cells appear at approximately y=155-230 for row 1
#
# Let's crop several debug regions to pin down exact location

# Full simulator region (cropped from working capture region)
full_sim = base.crop((965, 95, 1275, 760))
full_sim.save('docs/qa/sprint2-mini-evidence/debug-full-sim.png')
print(f"Full sim: {full_sim.size}")

# Top of game canvas (including level grid header and first 2 rows)
top_grid = base.crop((968, 155, 1275, 270))
top_grid.save('docs/qa/sprint2-mini-evidence/debug-top-grid.png')
print(f"Top grid: {top_grid.size}")

# The level 1 cell specifically - let's try a few positions
# Row 1, Col 1 of the level grid
cell_11 = base.crop((968, 155, 1035, 240))
cell_11.save('docs/qa/sprint2-mini-evidence/debug-cell-11.png')
print(f"Cell 1-1: {cell_11.size}")

# Try a wider area for the first row
row1 = base.crop((968, 155, 1275, 245))
row1.save('docs/qa/sprint2-mini-evidence/debug-row1.png')
print(f"Row 1: {row1.size}")

# Also check the header area
header = base.crop((968, 95, 1275, 160))
header.save('docs/qa/sprint2-mini-evidence/debug-header.png')
print(f"Header: {header.size}")
