"""
Precise crop of level 1 area from fresh-full.png
"""
from PIL import Image

base = Image.open('docs/qa/sprint2-mini-evidence/fresh-full.png')
print(f"Base size: {base.size}")  # 1920x1200

# The simulator phone is visible in the right portion of the screen
# Looking at the image, the phone appears at physical approximately:
# Left edge of phone content: ~980px
# Top of phone content (below top bar): ~105px
# The level grid header (一游目 + 超凡天下) is at ~y=115-155
# The level grid first row starts at ~y=155

# Crop around the level grid first 2 rows
grid_top = base.crop((975, 155, 1265, 265))
grid_top.save('docs/qa/sprint2-mini-evidence/debug-grid-top.png')
print(f"Grid top 2 rows: {grid_top.size}")

# Just row 1 (first 5 level icons)
row1_full = base.crop((975, 155, 1265, 230))
row1_full.save('docs/qa/sprint2-mini-evidence/debug-row1-full.png')
print(f"Row 1 full: {row1_full.size}")

# Zoom in on level 1 specifically
# In the full image it appears at ~x=985-1040, y=160-225
level1_cell = base.crop((980, 158, 1048, 230))
level1_cell.save('docs/qa/sprint2-mini-evidence/debug-level1-zoom.png')
print(f"Level 1 zoom: {level1_cell.size}")

# A wider area to see the grid
wide = base.crop((975, 100, 1275, 400))
wide.save('docs/qa/sprint2-mini-evidence/debug-wide.png')
print(f"Wide: {wide.size}")
