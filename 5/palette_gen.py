import math

def ccvrg(value):
    return 255 if value == 7 else math.floor((value / 7) * 256)

def ccvb(value):
    return 255 if value == 3 else math.floor((value / 3) * 256)

for i in range(4):
    print(ccvb(i))

exit()

with open('8bit.gpl', mode='w') as F:
    print('GIMP Palette\nName: 8bit\n#', file=F)
    x=' '
    f=range
    [[[print(f"{str(ccvrg(r)).rjust(3,x)}{str(ccvrg(g)).rjust(4,x)}{str(ccvb(b)).rjust(4,x)}",file=F)for b in f(4)]for g in f(8)]for r in f(8)]
    # for r in range(8):
        # for g in range(8):
            # for b in range(4):
                # print(f"{str(ccvrg(r)).rjust(3, ' ')}{str(ccvrg(g)).rjust(4, ' ')}{str(ccvb(b)).rjust(4, ' ')}", file=file)
