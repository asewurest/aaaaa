function safeGet2D(list, x, y) {
  if (x < 0) x += 30;
  if (y < 0) y += 30;
  if (x >= 30) x -= 30;
  if (y >= 30) y -= 30;
  return list[x][y];
}

function determineXY(list, x, y) {
  let left = !!safeGet2D(list, x - 1, y);
  let right = !!safeGet2D(list, x + 1, y);
  let up = !!safeGet2D(list, x, y - 1);
  let down = !!safeGet2D(list, x, y + 1);
  let summary = (left << 3) | (right << 2) | (up << 1) | down;
  let index = [
    0b0100, 0b1100, 0b1000,
    0b0001, 0b0011, 0b0010,
    0b1001, 0b0101, 0b0110,
    0b1010, 0b1101, 0b1011,
    0b0111, 0b1110, 0b1111,
    0xFFFF, 0xFFFF, 0b0000
  ].indexOf(summary);
  // if (index == 14) debugger;
  return [index % 3, Math.floor(index / 3)];
}

function fillText(text, x, y, underlined, centered) {
  let Img = typeof img === 'undefined' ? azerty : img;
  let firstRow = '0123456789<>èàÈÀ*|HB«¬V^ø`~:¨»&\'¢√°,';
  let secondRow = 'abcdefghijklmnopqrstuvwxyz/.\uFFFF ()';
  let offsetX = 0;
  let offsetY = 0;
  if (centered) {
    if (centered == 'prefix') {
      offsetX -= Math.ceil((text.length - 2) * 5 / 2);
    } else {
      offsetX -= Math.ceil(text.length * 5 / 2);
    }
  }
  for (let i = 0; i < text.length; i++) {
    let character = text[i];
    if (character == '\n') {
      offsetY += 10;
      offsetX = 0;
      continue;
    }
    let targetX = x + offsetX;
    let targetY = y + offsetY;
    let sourceX, sourceY;
    if (firstRow.includes(character)) {
      sourceX = firstRow.indexOf(character) * 4;
      sourceY = 118;
    } else {
      let index = secondRow.indexOf(character);
      if (index < 0) {
        index = 28;
      }
      sourceX = index * 4;
      sourceY = 123;
    }
    if (character != '~' && character != '`' && character != '¨') offsetX += character == '(' ? 4 : (character == ')') ? 6 : 5;
    ctx.drawImage(Img, sourceX, sourceY, 4, 5, targetX, targetY - ((character == '~' || character == '`' || character == '¨') ? 4 : 0), 4, 5);
    let underline = false;
    if (Array.isArray(underlined)) {
      underline = underlined[i];
    } else underline = underlined;
    if (underline) {
      ctx.fillStyle = 'white';
      ctx.fillRect(targetX - 1, targetY + 6, 6, 1);
    }
  }
}

function distance(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}
