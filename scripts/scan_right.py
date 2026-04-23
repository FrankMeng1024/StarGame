"""
Crop right portion of fresh screenshot to find simulator
"""
from PIL import Image

base = Image.open('docs/qa/sprint2-mini-evidence/fresh-full.png')
print(f"Base size: {base.size}")  # 1920x1200

# Let's systematically scan the right half
# Crop right half first
right_half = base.crop((960, 0, 1920, 1200))
right_half.save('docs/qa/sprint2-mini-evidence/debug-right-half.png')
print(f"Right half: {right_half.size}")

# Also crop quarter strips to locate simulator
strip1 = base.crop((1200, 0, 1450, 800))
strip1.save('docs/qa/sprint2-mini-evidence/debug-strip1.png')
strip2 = base.crop((1400, 0, 1700, 800))
strip2.save('docs/qa/sprint2-mini-evidence/debug-strip2.png')
strip3 = base.crop((1600, 0, 1920, 800))
strip3.save('docs/qa/sprint2-mini-evidence/debug-strip3.png')
print("Strips saved")
