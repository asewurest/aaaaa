import math

def ccvrg(value):
    return 255 if value == 7 else math.floor((value / 7) * 256)

def ccvb(value):
    return 255 if value == 3 else math.floor((value / 3) * 256)

colors = []

x=' '
f=range
[[[colors.append([(ccvrg(r)), (ccvrg(g)), (ccvb(b))]) for b in f(4)]for g in f(8)]for r in f(8)]
# for r in range(8):
# for g in range(8):
# for b in range(4):
# print(f"{str(ccvrg(r)).rjust(3, ' ')}{str(ccvrg(g)).rjust(4, ' ')}{str(ccvb(b)).rjust(4, ' ')}", file=file)
for color in colors:
    avg = (color[0] + color[1] + color[2]) / 3
    dist_r = (color[0] - avg) ** 2
    dist_g = (color[1] - avg) ** 2
    dist_b = (color[2] - avg) ** 2
    color.append(dist_r + dist_g + dist_b)

print(sorted(colors, key=lambda x:x[3]))
