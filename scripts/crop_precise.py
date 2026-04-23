"""
Precise crops of all game screens from mss-game-t01.png
Physical pixel coords (device scale 1.5x)
"""
from PIL import Image
import os

OUT_DIR = 'docs/qa/sprint2-mini-evidence'
base = Image.open(f'{OUT_DIR}/mss-game-t01.png')
print(f"Base size: {base.size}")

# Simulator phone content (game canvas) in physical pixels
# Phone starts at approximately: x=1465, y=105, ends x=1882, y=1122
# Game canvas inside phone (no border): x=1468, y=160, x=1880, y=1120
game_canvas = base.crop((1468, 160, 1880, 1120))
game_canvas.save(f'{OUT_DIR}/STORY-00206-01-level-select-game.png')
print(f"Game canvas: {game_canvas.size}")

# Full phone with frame
phone = base.crop((1460, 100, 1892, 1135))
phone.save(f'{OUT_DIR}/STORY-00206-00-level-select-phone.png')
print(f"Phone: {phone.size}")
