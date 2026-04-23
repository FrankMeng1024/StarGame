"""
Crop simulator precisely from the full screenshot
The full window is 1917x1200, simulator at ~x=960-1275, y=88-745
"""
from PIL import Image
import sys

# Load the full window screenshot
full = Image.open('docs/qa/sprint2-mini-evidence/STORY-00206-00-full.png')
print(f"Full screenshot size: {full.size}")

# Crop simulator panel only (phone frame)
# Based on visual inspection of the screenshot:
# Phone appears at approximately x=965-1268, y=88-748 in the window screenshot
# (The window starts at screen (1,0) so these are both window and screen relative coords)
sim = full.crop((965, 88, 1268, 748))
sim.save('docs/qa/sprint2-mini-evidence/STORY-00206-02-level-select-crop.png')
print(f"Saved level select crop: {sim.size}")

# Also crop just the game area (inside the phone frame, excluding the phone chrome)
# Phone chrome is about 30px top, 10px sides, 30px bottom
game_area = full.crop((980, 115, 1252, 740))
game_area.save('docs/qa/sprint2-mini-evidence/STORY-00206-03-level-select-game.png')
print(f"Saved game area crop: {game_area.size}")
