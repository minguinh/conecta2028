from collections import deque
from pathlib import Path
from PIL import Image

root = Path(__file__).parent
image = Image.open(root / 'public/branding/logo-minguinho.png').convert('RGBA')
pixels = image.load()
width, height = image.size
seen = bytearray(width * height)
queue = deque([(0, 0)])
while queue:
    x, y = queue.popleft()
    index = y * width + x
    if seen[index]:
        continue
    seen[index] = 1
    r, g, b, a = pixels[x, y]
    if min(r, g, b) < 225:
        continue
    pixels[x, y] = (r, g, b, 0)
    for nx, ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
        if 0 <= nx < width and 0 <= ny < height and not seen[ny * width + nx]:
            queue.append((nx, ny))
# Remove only exterior-connected white; preserve the white lettering.
image.save(root / 'public/branding/logo-minguinho-transparente.png')
assert image.getpixel((0, 0))[3] == 0
print('Transparent logo saved; original preserved.')
