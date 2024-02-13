const canvas = document.getElementById('canvas');
const lightCanvas = document.getElementById('light');
const backgroundCanvas = document.getElementById('background');
const generate = document.getElementById('generate');
const ctx = canvas.getContext('2d');
ctx.translate(20, 20);
const ctx_ = generate.getContext('2d');
const lightCtx = lightCanvas.getContext('2d');
const backgroundCtx = backgroundCanvas.getContext('2d');

if (localStorage._currentlyEditing) {
  maps.list.push('|beta|');
  maps['|beta|'] = JSON.parse(localStorage._currentlyEditing);
  maps['|beta|'].lightmap = false;
}

function lineIntersection(startX1, startY1, endX1, endY1, startX2, startY2, endX2, endY2) {
  var det, gamma, lambda;
  det = (endX1 - startX1) * (endY2 - startY2) - (endX2 - startX2) * (endY1 - startY1);
  if (det === 0) {
    return false;
  } else {
    lambda = ((endY2 - startY2) * (endX2 - startX1) + (startX2 - endX2) * (endY2 - startY1)) / det;
    gamma = ((startY1 - endY1) * (endX2 - startX1) + (endX1 - startX1) * (endY2 - startY1)) / det;
    return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
  }
}

function rectangleLineIntersection(rect, startX, startY, endX, endY) {
  return lineIntersection(startX, startY, endX, endY, rect.x, rect.y, rect.x + rect.width, rect.y) ||
    lineIntersection(startX, startY, endX, endY, rect.x + rect.width, rect.y, rect.x + rect.width, rect.y + rect.height) ||
    lineIntersection(startX, startY, endX, endY, rect.x + rect.width, rect.y + rect.height, rect.x, rect.y + rect.height) ||
    lineIntersection(startX, startY, endX, endY, rect.x, rect.y + rect.height, rect.x, rect.y);
}

function ccvrg(value) {
  return value == 7 ? 255 : Math.floor((value / 7) * 256);
}

function ccvb(value) {
  return value == 3 ? 255 : Math.floor((value / 3) * 256);
}

let mapsToPreviews = new Map();

function getPreview(list) {
  if (mapsToPreviews.get(list)) {
    return mapsToPreviews.get(list);
  } else {
    return new Promise(resolve => {
      ctx_.clearRect(0, 0, 60, 60);
      ctx_.fillStyle = '#b6b6aa';
      ctx_.fillRect(0, 0, 60, 60);
      for (let i = 0; i < list.length; i++) {
        for (let j = 0; j < list.length; j++) {
          if (list[i][j]) {
            let [iX, iY] = determineXY(list, i, j);
            ctx_.drawImage(img, 93 + iX * 2 + 36 * (list[i][j] - 1), 60 + iY * 2, 2, 2, i * 2, j * 2, 2, 2);
          }
        }
      }
      loadImage(generate.toDataURL()).then(resolve);
    });
  }
}

function loadImage(src) {
  return new Promise(resolve => {
    const image = new Image();
    image.src = src;
    image.onload = () => resolve(image);
  });
}

let gameModePossibilities = [' H * H ', ' H * B ', 'HB * HB', 'HH * BB', ' H * BB', ' H * B&'];
let shortenedGameModePossibilities = gameModePossibilities.map(x => x.replace(/ /g, ''));

Promise.all(['azerty.png', 'start.png', 'modeselect.png', 'background.png', 'points.png', 'settings-background.png', 'settings-background-not8bit.png'].map(loadImage)).then(([img, startScreenImage, modeScreenImage, backgroundImage, pointsImage, settingsBackground8bit, settingsBackgroundNot8bit]) => {
  window.img = img;
  let previews = {};
  let last = Date.now();
  let screen_ = 'start';
  let startButtonSelected = 'play';
  let selectedMap = 'qwerty';
  let selectedMode = 'H*H';
  let startLastButtonSelected = 'points';
  let mapTarget = [0, 0];
  let lightCalcXY = [0, 0];
  let lightCalcTorches = [];
  let players = [];
  let player1, player2;
  let imageData = null;
  let projectiles = [];
  let shootbots = [];
  let explosions = [];
  let pointsToWin = 25;
  let redScore = 0;
  let blueScore = 0;
  let isPressed = {};
  let gameEnded = false;
  let spawnPowerupsIn = 3;
  let spawns = [];
  let eightBit = true;
  let selectedSetting = 'light';
  let arrowsForP1 = true;
  let econome = false;
  let p1Ready = false, p2Ready = false;
  let enabledPowerups = {};
  for (const key of powerups.list) enabledPowerups[key] = true;
  function createProjectile(x, y, dx, dy, team, author) {
    let q = {
      x,
      y,
      dx,
      dy,
      team,
      timeToLive: 5
    };
    q.author = author;
    projectiles.push(q);
    return q;
  }
  window.createProjectile = createProjectile;

  function explode(x, y, team) {
    explosions.push({
      x,
      y,
      team,
      time: Date.now()
    })
  }
  window.explode = explode;

  if (location.href.includes('#m')) {
    let ael = addEventListener;

    let in_roll = 0;
    ael('wheel', e => {
      e.preventDefault();
      // in_roll = Math.sign(e.deltaY);
      let key = e.deltaY > 0 ? 'ArrowUp': 'ArrowDown';
      if (!in_roll) {
        in_roll = true;
        __down({ key });
        setTimeout(() => {
          __up({ key });
          in_roll = false
        }, 20);
      }
    });

    addEventListener = function (event, handler, ...options) {
      if (event == 'keydown') {
        ael('mousedown', e => {
          let button = e.button;
          if (button == 0) {
            handler({ key: 'ArrowLeft' });
          }

          if (button == 1) {
            handler({ key: 'ArrowUp' });
            handler({ key: 'ArrowDown' });
            e.preventDefault();
            e.stopPropagation();
          }

          if (button == 2) {
            handler({ key: 'ArrowRight' });
            e.preventDefault();
            e.stopPropagation();
          }
        });

        window.__down = handler;
      }

      if (event == 'keyup') {
        ael('mouseup', e => {
          let button = e.button;
          if (button == 0) {
            handler({ key: 'ArrowLeft' });
          }

          if (button == 1) {
            handler({ key: 'ArrowUp' });
            handler({ key: 'ArrowDown' });
            e.preventDefault();
          }

          if (button == 2) {
            handler({ key: 'ArrowRight' });
            e.preventDefault();
          }
        })

        window.__up = handler;
      }
      ael(event, handler, ...options);
    };
  }

  addEventListener('keydown', e => {
    isPressed[e.key] = true;
    if (screen_ == 'start') {
      if (e.key == 'ArrowLeft') {
        if (startButtonSelected != 'mode') {
          startButtonSelected = startLastButtonSelected = 'map';
        } else {
          startButtonSelected = startLastButtonSelected = 'points';
        }
      } else if (e.key == 'ArrowRight') {
        if (startButtonSelected != 'map') {
          startButtonSelected = startLastButtonSelected = 'mode';
        } else {
          startButtonSelected = startLastButtonSelected = 'points';
        }
      } else if (e.key == 'ArrowUp') {
        if (startButtonSelected != 'settings') {
          startButtonSelected = 'play';
        } else {
          startButtonSelected = startLastButtonSelected;
        }
      } else if (e.key == 'ArrowDown') {
        if (startButtonSelected == 'play') {
          startButtonSelected = startLastButtonSelected;
        } else startButtonSelected = 'settings';
      } else if (e.key == 'Enter') {
        if (startButtonSelected == 'play') {
          screen_ = 'lightcalc';
          lightCalcXY = [0, 0];
          lightCalcTorches = [];
          lightCtx.clearRect(0, 0, 300, 300);
        } else {
          screen_ = startButtonSelected;
        }
      }
    } else if (screen_ == 'settings') {
      if (e.key == 'ArrowLeft') {
        if (selectedSetting == 'light') eightBit = true;
        else if (selectedSetting == 'controls') arrowsForP1 = false;
        else if (selectedSetting == 'econome') econome = true;
        else if (powerups.list.includes(selectedSetting.slice(2))) enabledPowerups[selectedSetting.slice(2)] = true;
      } else if (e.key == 'ArrowRight') {
        if (selectedSetting == 'light') eightBit = false;
        else if (selectedSetting == 'controls') arrowsForP1 = true;
        else if (selectedSetting == 'econome') econome = false;
        else if (powerups.list.includes(selectedSetting.slice(2))) enabledPowerups[selectedSetting.slice(2)] = false;
      } else if (e.key == 'Enter') {
        screen_ = 'start';
      } else if (e.key == 'ArrowDown') {
        if (selectedSetting == 'light') selectedSetting = 'controls';
        else if (selectedSetting == 'controls') selectedSetting = 'econome';
        else if (selectedSetting == 'econome') selectedSetting = 'p!' + powerups.list[0];
        else if (selectedSetting.slice(2) != powerups.list[powerups.list.length - 1]) selectedSetting = 'p!' + powerups.list[powerups.list.indexOf(selectedSetting.slice(2)) + 1];
      } else if (e.key == 'ArrowUp') {
        if (selectedSetting == 'econome') selectedSetting = 'controls';
        else if (selectedSetting == 'controls') selectedSetting = 'light';
        else if (selectedSetting.slice(2) == powerups.list[0]) selectedSetting = 'econome';
        else if (powerups.list.includes(selectedSetting.slice(2))) selectedSetting = 'p!' + powerups.list[powerups.list.indexOf(selectedSetting.slice(2)) - 1];
      }
    } else if (screen_ == 'points') {
      if (e.key == 'ArrowDown') {
        pointsToWin = Math.max(1, pointsToWin - 1);
      } else if (e.key == 'ArrowUp') {
        pointsToWin++;
      } else if (e.key == 'Enter') {
        screen_ = 'start';
      }
    } else if (screen_ == 'mode') {
      if (e.key == 'ArrowUp') {
        let index = shortenedGameModePossibilities.indexOf(selectedMode);
        if (index != 0) {
          selectedMode = shortenedGameModePossibilities[index - 1];
        } else {
          selectedMode = shortenedGameModePossibilities[shortenedGameModePossibilities.length - 1];
        }
      } else if (e.key == 'ArrowDown') {
        let index = shortenedGameModePossibilities.indexOf(selectedMode);
        if (index != gameModePossibilities.length - 1) {
          selectedMode = shortenedGameModePossibilities[index + 1];
        } else {
          selectedMode = shortenedGameModePossibilities[0];
        }
      } else if (e.key == 'Enter') {
        screen_ = 'start';
      }
    } else if (screen_ == 'map') {
      if (e.key == 'ArrowUp') {
        if (mapTarget[1] > 0) {
          mapTarget[1]--;
        } else mapTarget = [0, 0];
      } else if (e.key == 'ArrowDown') {
        let index = mapTarget[1] * 4 + mapTarget[0];
        index += 4;
        index = Math.min(index, maps.list.length - 1);
        mapTarget[1] = Math.floor(index / 4);
        mapTarget[0] = index % 4;
      } else if (e.key == 'ArrowRight') {
        let index = mapTarget[1] * 4 + mapTarget[0];
        index++;
        index = Math.min(index, maps.list.length - 1);
        mapTarget[1] = Math.floor(index / 4);
        mapTarget[0] = index % 4;
      } else if (e.key == 'ArrowLeft') {
        let index = mapTarget[1] * 4 + mapTarget[0];
        index--;
        index = Math.max(index, 0);
        mapTarget[1] = Math.floor(index / 4);
        mapTarget[0] = index % 4;
      } else if (e.key == 'Enter') {
        let index = mapTarget[1] * 4 + mapTarget[0];
        selectedMap = maps.list[index];
        screen_ = 'start';
      }
    } else if (screen_ == 'play' || screen_ == 'msel') {
      let player_1 = player1, player_2 = player2;
      if (!arrowsForP1) {
        [player_2, player_1] = [player1, player2];
      }
      if (e.key == ' ') {
        screen_ = 'paused';
        if (player1) player1.keys = {};
        if (player2) player2.keys = {};
      } else if (player_1 && e.key == 'ArrowLeft') {
        player_1.keys.l = true;
      } else if (player_1 && e.key == 'ArrowRight') {
        player_1.keys.r = true;
      } else if (player_1 && e.key == 'ArrowUp') {
        player_1.keys.u = true;
      } else if (player_1 && e.key == 'ArrowDown') {
        player_1.keys.d = true;
      } else if (player_2 && e.key == 'a') {
        player_2.keys.l = true;
      } else if (player_2 && e.key == 'd') {
        player_2.keys.r = true;
      } else if (player_2 && e.key == 'w') {
        player_2.keys.u = true;
      } else if (player_2 && e.key == 's') {
        player_2.keys.d = true;
      }
    } else if (screen_ == 'paused') {
      if (e.key == ' ' && !gameEnded) {
        screen_ = 'play';
      } else if (e.key == 'Enter') {
        screen_ = 'start';
      }
    } else if (screen_ == 'lightcalc') {
      if (e.key == ' ') {
        screen_ = 'start';
      }
    }
  });

  addEventListener('keyup', e => {
    isPressed[e.key] = false;
    if (screen_ == 'play') {
      let player_1 = player1, player_2 = player2;
      if (!arrowsForP1) {
        [player_2, player_1] = [player1, player2];
      }
      if (player_1 && e.key == 'ArrowLeft') {
        player_1.keys.l = false;
      } else if (player_1 && e.key == 'ArrowRight') {
        player_1.keys.r = false;
      } else if (player_1 && e.key == 'ArrowUp') {
        player_1.keys.u = false;
      } else if (player_1 && e.key == 'ArrowDown') {
        player_1.keys.d = false;
      } else if (player_2 && e.key == 'a') {
        player_2.keys.l = false;
      } else if (player_2 && e.key == 'd') {
        player_2.keys.r = false;
      } else if (player_2 && e.key == 'w') {
        player_2.keys.u = false;
      } else if (player_2 && e.key == 's') {
        player_2.keys.d = false;
      }
    }
  });

  function lineCollision(coord1, width1, coord2, width2) {
    return ((coord1 >= coord2 && coord1 <= coord2 + width2) || (coord2 >= coord1 && coord2 <= coord1 + width1));
  }

  function squareCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
    return (lineCollision(x1, w1, x2, w2) && lineCollision(y1, h1, y2, h2));
  }
  window.isColliding = box => {
    let mx = Math.floor((box.x - 1) / 10);
    let Mx = Math.ceil((box.x + box.w + 1) / 10);
    let my = Math.floor((box.y - 1) / 10);
    let My = Math.ceil((box.y + box.h + 1) / 10);
    for (let i = mx; i < Mx; i++) {
      for (let j = my; j < My; j++) {
        if (safeGet2D(maps[selectedMap].terrain, i, j) && squareCollision(i * 10 + 0.001, j * 10 + 0.001, 9.998, 9.998, box.x, box.y, box.w, box.h)) return (box.__onIce = safeGet2D(maps[selectedMap].terrain, i, j) == 3), true;
      }
    }
  }

  function target_(value, yesorno) {
    return yesorno ? '> ' + value + ' «' : value;
  }

  function update() {
    requestAnimationFrame(update);
    ctx.imageSmoothingEnabled = false;
    let now = Date.now();
    let deltaTime = (now - last) / 1000;
    last = now;
    if (deltaTime > 0.5) deltaTime = 1 / 60;
    ctx.clearRect(-20, -20, canvas.width, canvas.height);
    let paused = false;
    switch (screen_) {
      case 'settings':
        ctx.drawImage(eightBit ? settingsBackground8bit : settingsBackgroundNot8bit, 0, 0);
        fillText('param`etres', 150, 50, false, true);
        fillText((selectedSetting == 'light' ? '>' : '<') + ' lumi`ere: 8bit 32bit', 150, 70, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, eightBit, eightBit, eightBit, eightBit, false, !eightBit, !eightBit, !eightBit, !eightBit, !eightBit], true);
        fillText((selectedSetting == 'controls' ? '>' : '<') + ' contr¨oles: j1Èwasd j2À^V<» | j1È^V<» j2Àwasd', 150, 80, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, !arrowsForP1, !arrowsForP1, !arrowsForP1, !arrowsForP1, !arrowsForP1, !arrowsForP1, !arrowsForP1, !arrowsForP1, !arrowsForP1, !arrowsForP1, !arrowsForP1, !arrowsForP1, !arrowsForP1, !arrowsForP1, !arrowsForP1, 0, 0, 0, arrowsForP1, arrowsForP1, arrowsForP1, arrowsForP1, arrowsForP1, arrowsForP1, arrowsForP1, arrowsForP1, arrowsForP1, arrowsForP1, arrowsForP1, arrowsForP1, arrowsForP1, arrowsForP1, arrowsForP1], true);
        fillText((selectedSetting == 'econome' ? '>' : '<') + ' \'~econome\': on | off', 150, 90, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, econome, econome, 0, 0, 0, !econome, !econome, !econome], true);
        let i = 0;
        for (let powerup of powerups.list) {
          fillText((selectedSetting == 'p!' + powerup ? '>' : '<') + ' ' + (enabledPowerups[powerup] ? '√' : '¢'), 25, 100 + i * 10, false, false);
          ctx.drawImage(img, powerups[powerup].image * 4, 81, 4, 4, 45, 101 + i * 10, 4, 4);
          if (selectedSetting == 'p!' + powerup) {
            let text = '√ | ¢ ' + powerups[powerup].description;
            let array = Array(text.length).fill(false);
            array[enabledPowerups[powerup] ? 0 : 4] = true;
            fillText(text, 25, 210, array, false);
          }
          i++
        }
        break;
      case 'points':
        ctx.drawImage(pointsImage, 0, 0);
        let array = [isPressed['ArrowUp'], false];
        let length = pointsToWin.toString().length;
        for (let i = 0; i < length; i++) {
          array.push(false);
        }
        array.push(false, isPressed['ArrowDown']);
        fillText('^ ' + pointsToWin + ' V', 150, 148, array, true);
        break;
      case 'start':
        ctx.drawImage(startScreenImage, 0, 0);
        fillText('qwerty 5.2.0 / () olie auger 2023', 2, 293);
        fillText((startButtonSelected == 'play' ? '>' : '<') + ' jouer', 150, 150, startButtonSelected == 'play', true);
        if (!previews[selectedMap]) {
          previews[selectedMap] = 1;
          getPreview(maps[selectedMap].terrain).then(i => previews[selectedMap] = i);
        } else {
          if (previews[selectedMap] != 1) {
            ctx.fillStyle = 'black';
            ctx.fillRect(43, 171, 64, 64);
            ctx.drawImage(previews[selectedMap], 45, 173, 60, 60);
          }
        }
        fillText((startButtonSelected == 'map' ? '>' : '<') + ' ' + selectedMap, 75, 200, startButtonSelected == 'map', true);
        let expandedSelectedMode = gameModePossibilities[shortenedGameModePossibilities.indexOf(selectedMode)];
        fillText(expandedSelectedMode, 225, 200, false, true);
        let selectedModeStart = 225 - Math.ceil(expandedSelectedMode.length * 5 / 2);
        fillText((startButtonSelected == 'mode' ? '>' : '<') + ' ', selectedModeStart - 10, 200, startButtonSelected == 'mode', false);
        fillText((startButtonSelected == 'points' ? '>' : '<') + ' ' + pointsToWin + (pointsToWin == 1 ? ' pt' : ' pts'), 150, 200, startButtonSelected == 'points', true);
        fillText((startButtonSelected == 'settings' ? '>' : '<') + ' param`etres', 150, 230, startButtonSelected == 'settings', true);
        break;
      case 'mode':
        ctx.drawImage(modeScreenImage, 0, 0);
        let totalHeight = gameModePossibilities.length * 10;
        let startX = 150;
        let startY = 150 - Math.ceil(totalHeight / 2);
        for (let i = 0; i < gameModePossibilities.length; i++) {
          let isSelected = shortenedGameModePossibilities[i] == selectedMode;
          fillText((isSelected ? '> ' : '< ') + gameModePossibilities[i], startX, startY + i * 10, isSelected, true);
        }
        break;
      case 'lightcalc':
        if (maps[selectedMap].lightmap && maps[selectedMap].lightmap[eightBit ? 0 : 1]) {
          let map = selectedMap;
          const lmImg = new Image();
          lmImg.onload = () => {
            if (screen_ == 'lightcalc' && map == selectedMap) {
              lightCtx.drawImage(lmImg, 0, 0);
              screen_ = 'playinit';
            }
          };
          lmImg.src = 'lightmap-' + map + (eightBit ? '-8bit' : '') + '.png';
          let angle = Math.PI * 2 * (Date.now() % 5000) / 5000;
          let squareX = Math.cos(angle) * 25;
          let squareY = Math.sin(angle) * 25;
          ctx.fillStyle = 'white';
          ctx.fillRect(Math.round(squareX) - 3 + 150, Math.round(squareY) - 3 + 150, 6, 6);
          ctx.fillRect(Math.round(-squareX) - 3 + 150, Math.round(-squareY) - 3 + 150, 6, 6);
          ctx.fillRect(Math.round(squareY) - 3 + 150, Math.round(-squareX) - 3 + 150, 6, 6);
          ctx.fillRect(Math.round(-squareY) - 3 + 150, Math.round(squareX) - 3 + 150, 6, 6);
        } else {
          if (lightCalcTorches.length == 0) {
            if (maps[selectedMap].decorations) {
              for (let i = 0; i < 30; i++) {
                for (let j = 0; j < 30; j++) {
                  if (maps[selectedMap].decorations[i][j] == 10) {
                    lightCalcTorches.push([i * 10 + 2, j * 10 + 6]);
                  } else if (maps[selectedMap].decorations[i][j] == 11) {
                    lightCalcTorches.push([i * 10 + 8, j * 10 + 6]);
                  }
                }
              }
            }
            backgroundCtx.drawImage(backgroundImage, 0, 0);
            imageData = backgroundCtx.getImageData(0, 0, 300, 300).data;
            if (lightCalcTorches.length == 0) {
              lightCtx.drawImage(backgroundCanvas, 0, 0);
              screen_ = 'playinit';
            }
          }

          for (let i = 0; i < 300; i++) {
            lightCalcXY[0]++;
            if (lightCalcXY[0] == 300) {
              lightCalcXY[0] = 0;
              lightCalcXY[1]++;
              if (lightCalcXY[1] == 300) {
                for (let i = 0; i < 30; i++) {
                  for (let j = 0; j < 30; j++) {
                    if (maps[selectedMap].terrain[i][j]) {
                      let [iX, iY] = determineXY(maps[selectedMap].terrain, i, j);
                      lightCtx.drawImage(img, iX * 12 + 92 + (maps[selectedMap].terrain[i][j] - 1) * 36, iY * 12, 12, 12, i * 10 - 1, j * 10 - 1, 12, 12);
                    }
                  }
                }
                for (let i = 0; i < 30; i++) {
                  for (let j = 0; j < 30; j++) {
                    if (maps[selectedMap].jumpPads && maps[selectedMap].jumpPads[i][j]) {
                      lightCtx.drawImage(img, 0, 85, 10, 4, i * 10, j * 10 + 8, 10, 4);
                    }
                    if (maps[selectedMap].decorations) {
                      if (maps[selectedMap].decorations[i][j]) {
                        if (maps[selectedMap].decorations[i][j] < 10) {
                          lightCtx.drawImage(img, 74, (maps[selectedMap].decorations[i][j] - 1) * 10 + 10, 10, 10, i * 10, j * 10, 10, 10);
                        } else {
                          if (maps[selectedMap].decorations[i][j] == 10) {
                            // lightCtx.drawImage(img, 70, 10, 4, 10, i * 10, j * 10, 4, 10);
                          } else {
                            // lightCtx.save();
                            // lightCtx.translate(i * 10 + 10, j * 10);
                            // lightCtx.scale(-1, 1);
                            // lightCtx.drawImage(img, 70, 10, 4, 10, 0, 0, 4, 10);
                            // lightCtx.restore();
                          }
                        }
                      }
                    }
                  }
                }
                screen_ = 'playinit';
                break;
              }
            }
            let [x, y] = lightCalcXY;
            let [r, g, b] = imageData.slice((y * 300 + x) * 4, (y * 300 + x) * 4 + 3);
            let lightLevel = 0;
            if (!maps[selectedMap].terrain[Math.floor(x / 10)][Math.floor(y / 10)]) {
              for (let j = 0; j < lightCalcTorches.length; j++) {
                let intersection = false;
                let rect1 = {
                  x: 0,
                  y: 0,
                  width: 10,
                  height: 8
                };
                let rect2 = {
                  x: 0,
                  y: 0,
                  width: 8,
                  height: 10
                };
                outer: for (let a = 0; a < 30; a++) {
                  for (let b = 0; b < 30; b++) {
                    rect1.x = a * 10;
                    rect1.y = b * 10 + 1;
                    rect2.x = a * 10 + 1;
                    rect2.y = b * 10;
                    if (maps[selectedMap].terrain[a][b] && (rectangleLineIntersection(rect2, ...lightCalcTorches[j], x, y))) {
                      intersection = true;
                      break outer;
                    }
                  }
                }
                if (!intersection) {
                  let additionalLight = 255 * 9 / Math.pow((x - lightCalcTorches[j][0]) ** 2 + (y - lightCalcTorches[j][1]) ** 2, 1 / 2);
                  if (eightBit) additionalLight = ccvrg(Math.floor(Math.min(additionalLight, 255) / 32));
                  lightLevel += additionalLight;
                }
              }
            }
            if (eightBit) lightLevel = ccvrg(Math.floor(Math.min(lightLevel, 255) / 32));
            lightCtx.fillStyle = 'rgb(' + Math.min(lightLevel + r, 255) + ',' + Math.min(lightLevel + g, 255) + ',' + b + ')';
            lightCtx.fillRect(x, y, 1, 1);
          }
          ctx.fillStyle = 'white';
          ctx.fillRect(102, 147, Math.floor((lightCalcXY[1] * 300 + lightCalcXY[0]) / (300 * 300) * 96), 6);
          ctx.fillRect(100, 145, 100, 1);
          ctx.fillRect(100, 154, 100, 1);
          ctx.fillRect(100, 145, 1, 10);
          ctx.fillRect(199, 145, 1, 10);
        }
        break;
      case 'map':
        ctx.fillStyle = '#494955';
        ctx.fillRect(0, 0, 300, 300);
        let offsetX = 0;
        let offsetY = 0;
        let target = mapTarget;
        let currentMap = null;
        for (let i = 0; i < maps.list.length; i++) {
          window.previews = previews;
          if (!previews[maps.list[i]]) {
            let mapName = maps.list[i];
            previews[maps.list[i]] = 1;
            getPreview(maps[maps.list[i]].terrain).then(i => previews[mapName] = i);
          } else {
            if (previews[maps.list[i]] != 1) {
              ctx.fillStyle = 'black';
              ctx.fillRect(offsetX * 72 + 10, offsetY * 72 + 10, 64, 64);
              ctx.drawImage(previews[maps.list[i]], offsetX * 72 + 12, offsetY * 72 + 12, 60, 60);
            }
          }
          fillText(target_(typeof previews[maps.list[i]] === 'object' ? maps.list[i] : '...', offsetX == target[0] && offsetY == target[1]), offsetX * 72 + 42, offsetY * 72 + 40, offsetX == target[0] && offsetY == target[1], true);
          if (offsetX == target[0] && offsetY == target[1]) currentMap = maps[maps.list[i]];
          offsetX++;
          if (offsetX == 4) {
            offsetY++;
            offsetX = 0;
          }
        }
        if (currentMap && currentMap.author && currentMap.author != 'astroide' && isPressed['Shift']) {
          fillText('par ' + currentMap.author, 150, 292, false, true);
        }
        break;
      case 'msel':
        {
          if (p1Ready && p2Ready) screen_ = 'play';

          ctx.fillStyle = '#494955';
          ctx.fillRect(0, 0, 300, 300);

          let player_1 = player1, player_2 = player2;
          if (!arrowsForP1) {
            [player_2, player_1] = [player1, player2];
          }
          if (!p1Ready) {
            if (player_1.keys.u) {
              p1Ready = true;
              player_1.eco = true;

            }
            if (player_1.keys.d) {
              p1Ready = true;
              player_1.keys.d = false;
            }
          }
          if (!p2Ready) {
            if (player_2.keys.u) {
              p2Ready = true;
              player_2.eco = true;
            }
            if (player_2.keys.d) {
              p2Ready = true;
              player_2.keys.d = false;
            }
          }
          // let array = [isPressed['ArrowUp'], false];
          // let length = pointsToWin.toString().length;
          // for (let i = 0; i < length; i++) {
          // array.push(false);
          // }
          // array.push(false, isPressed['ArrowDown']);
          // fillText('^ ' + pointsToWin + ' V', 150, 148, array, true);
          let ws = !(arrowsForP1 ? p2Ready : p1Ready) ? (arrowsForP1 ? 'À' : 'È') + 'ws' : '';
          let ud = !(arrowsForP1 ? p1Ready : p2Ready) ? (arrowsForP1 ? 'È' : 'À') + '^V' : '';
          fillText('en attente... ' + (ws && ud ? `${ws} et ${ud}` : (ws ? ws : ud)), 150, 148, false, true);
        }
        break;
      case 'playinit':
        p1Ready = p2Ready = false;
        screen_ = econome ? 'msel' : 'play';
        players = [];
        projectiles = [];
        shootbots = [];
        explosions = [];
        player1 = player2 = null;
        redScore = blueScore = 0;
        gameEnded = false;
        spawnPowerupsIn = 3;
        powerups.list.forEach(x => powerups[x].taken = false);
        maps[selectedMap].spawns.forEach(x => {
          if (x.type == 0) {
            x.content = null;
          }
        });
        spawns = maps[selectedMap].spawns.filter(x => !x.type);
        let spawnPlayer = (...args) => {
          players.push(new Player(...args));
          players[players.length - 1].respawn(maps[selectedMap].spawns, players);
          return players[players.length - 1];
        }
        switch (selectedMode) {
          case 'H*H':
            player1 = spawnPlayer('blue', false);
            player2 = spawnPlayer('red', false);
            break;
          case 'H*B':
            player1 = spawnPlayer('blue', false);
            spawnPlayer('red', true);
            break;
          case 'H*BB':
            player1 = spawnPlayer('blue', false);
            spawnPlayer('red', true);
            spawnPlayer('red', true);
            break;
          case 'HB*HB':
            player1 = spawnPlayer('blue', false);
            spawnPlayer('blue', true);
            player2 = spawnPlayer('red', false);
            spawnPlayer('red', true);
            break;
          case 'HH*BB':
            player1 = spawnPlayer('blue', false);
            player2 = spawnPlayer('blue', false);
            spawnPlayer('red', true);
            spawnPlayer('red', true);
            break;
          case 'H*B&':
            player1 = spawnPlayer('blue', false);
            spawnPlayer('red', true);
            spawnPlayer('red', true);
            spawnPlayer('red', true);
            spawnPlayer('red', true);
            break;
        }
        // spawn players...
        break;
      case 'paused':
        paused = true;
      case 'play':
        if (!document.hasFocus()) {
          screen_ = 'paused';
        }
        ctx.drawImage(lightCanvas, 0, 0);
        for (let i = 0; i < 30; i++) {
          for (let j = 0; j < 30; j++) {
            if (maps[selectedMap].decorations) {
              if (maps[selectedMap].decorations[i][j]) {
                if (maps[selectedMap].decorations[i][j] == 10) {
                  ctx.drawImage(img, 70, 10 + (Math.floor((Date.now() % 300) / 100)) * 10, 4, 10, i * 10, j * 10, 4, 10);
                } else if (maps[selectedMap].decorations[i][j] == 11) {
                  ctx.save();
                  ctx.translate(i * 10 + 10, j * 10);
                  ctx.scale(-1, 1);
                  // ctx.drawImage(img, 70, 10, 4, 10, 0, 0, 4, 10);
                  ctx.drawImage(img, 70, 10 + (Math.floor((Date.now() % 300) / 100)) * 10, 4, 10, 0, 0, 4, 10);
                  ctx.restore();
                }
              }
            }
          }
        }
        //lightCtx.drawImage(img, 70, 10, 4, 10, i * 10, j * 10, 4, 10);
        // console.log(deltaTime);
        if (!paused) {
          spawnPowerupsIn -= deltaTime;
          if (spawnPowerupsIn <= 0) {
            let spawn = spawns.sort(() => Math.random() - 0.5).find(x => !x.content);
            if (spawn) {
              let list = powerups.list.filter(x => enabledPowerups[x]).map(x => powerups[x]).filter(x => !x.taken);
              let powerup = list[Math.floor(Math.random() * list.length)];
              if (powerup) {
                powerup.taken = true;
                spawn.content = powerup;
              }
            }
            spawnPowerupsIn = Math.random() * 15 + 1;
          }
        }
        for (let i = 0; i < shootbots.length; i++) shootbots[i].reachable = true;

        for (let i = 0; i < players.length; i++) {
          ctx.save();
          ctx.translate((players[i].lastDirection == 'left' ? 5 : 0) + Math.floor(players[i].x), Math.floor(players[i].y - 1));
          if (players[i].lastDirection == 'left') {
            ctx.scale(-1, 1);
          }
          ctx.drawImage(img, (players[i].team == 'blue' ? 5 : 0) + (players[i].isBot ? 40 : 0) + (players[i].freeFalling ? 20 : 0) + ((players[i].keys.d && !players[i].freeFalling) ? 30 : 0), (players[i].freeFalling ? Math.floor((Date.now() % 300) / 100) * 10 : 0), 5, 10, 0, 0, 5, 10);
          ctx.restore();
          let verticality = 0
          if (players[i].projectilePowerup && players[i].powerups[players[i].projectilePowerup].quantity > 0) {
            ctx.fillStyle = '#' + powerups[players[i].projectilePowerup].color;
            ctx.fillRect(Math.floor(players[i].x - 1), Math.floor(players[i].y - 3), Math.round(6 * players[i].powerups[players[i].projectilePowerup].quantity / players[i].powerups[players[i].projectilePowerup].maxQuantity), 1);
            verticality += 1;
          }
          if (players[i].movementPowerup && players[i].powerups[players[i].movementPowerup].quantity > 0) {
            ctx.fillStyle = '#' + powerups[players[i].movementPowerup].color;
            ctx.fillRect(Math.floor(players[i].x - 1), Math.floor(players[i].y - (3 + verticality)), Math.round(6 * players[i].powerups[players[i].movementPowerup].quantity / players[i].powerups[players[i].movementPowerup].maxQuantity), 1);
          }
          if (!paused) {
            players[i].update(deltaTime, players, projectiles, maps[selectedMap].jumpPads, maps[selectedMap].terrain, spawns);
            for (let j = 0; j < spawns.length; j++) {
              if (spawns[j].content && squareCollision(players[i].x, players[i].y, players[i].w, players[i].h, spawns[j].x * 10 + 3, spawns[j].y * 10 + 3, 4, 4)) {
                let powerup = spawns[j].content;
                // console.log(powerup);
                explode(spawns[j].x * 10 + 5, spawns[j].y * 10 + 5, 'yellow');
                powerup.taken = false;
                spawns[j].content = null;
                if (powerup.name == 'bot') {
                  setTimeout(() => {
                    shootbots.push(
                      { x: Math.round(players[i].x + players[i].w / 2), y: Math.round(players[i].y + players[i].h / 2), timeUntilReady: 2, team: players[i].team, charges: 3, author: players[i] }
                    )
                  }, 2000);
                  continue;
                }
                let extra = 0;
                if (players[i][powerup.type + 'Powerup']) {
                  if (players[i][powerup.type + 'Powerup'] == powerup.name) {
                    extra = players[i].powerups[players[i][powerup.type + 'Powerup']].quantity;
                  }
                  if (players[i][powerup.type + 'Powerup'] == 'shield') {
                    players[i].powerups.shield.projectiles.forEach(x => {
                      x.collisionProtection = x.isStatic = false;
                      x.timeToLive = 5;
                    });
                  }
                  delete players[i].powerups[players[i][powerup.type + 'Powerup']];
                }
                players[i][powerup.type + 'Powerup'] = powerup.name;
                players[i].powerups[powerup.name] = {
                  quantity: powerup.quantity + extra,
                  maxQuantity: powerup.quantity + extra
                }
                if (powerup.name == 'shield') {
                  players[i].powerups.shield.projectiles = Array(16).fill(0).map(x => {
                    let p = createProjectile(players[i].x + 2, players[i].y + 2, Math.random(), Math.random(), players[i].team, players[i]);
                    p.isStatic = p.collisionProtection = true;
                    return p;
                  });
                }
              }
            }
          }
          // ctx.beginPath();
          // ctx.moveTo(players[i].x + players[i].w / 2, players[i].y + players[i].h / 2);
          // ctx.lineTo(players[i].x + players[i].w / 2 + players[i].fx, players[i].y + players[i].h / 2 + players[i].fy);
          // ctx.strokeStyle = 'red';
          // ctx.stroke();
        }
        let o = { w: 4, h: 4 };
        for (let i = 0; i < projectiles.length; i++) {
          let projectile = projectiles[i];
          if (!projectile.isStatic && (!paused || gameEnded)) {
            projectile.x += projectile.dx * deltaTime * 60;
            projectile.y += projectile.dy * deltaTime * 60;
            projectile.timeToLive -= deltaTime;
          }
          if ((!paused || gameEnded) && projectile.update) {
            projectile.update(deltaTime);
          }
          o.x = projectile.x - 2;
          o.y = projectile.y - 2;
          let touchingPlayers = false;
          for (let i = 0; i < players.length; i++) {
            let isCrouched = players[i].keys.d;
            if (players[i].team != projectile.team && squareCollision(players[i].x + (isCrouched ? 3 : 0), players[i].y, players[i].w, players[i].h - (isCrouched ? 3 : 0), o.x, o.y, o.w, o.h)) {
              if (!touchingPlayers && projectile.author) {
                let efficiency = 0;
                projectile.author.shots.slice(-3).forEach(x => efficiency += x);
                efficiency /= 3;
                projectile.author.efficiency = efficiency;
                projectile.author.shots.push(0);
              }
              touchingPlayers = true;
              let amount = projectile.author && projectile.author.eco ? (projectile.author.efficiency <= 1.2 ? 3 : (Math.round(Math.random()))) : 1;
              if (players[i].team == 'red') {
                blueScore += amount;
              } else {
                redScore += amount;
              }
              if (blueScore >= pointsToWin || redScore >= pointsToWin) {
                paused = gameEnded = true;
                screen_ = 'paused';
              }
              players[i].respawn(maps[selectedMap].spawns, players);
            }
          }
          for (let i = 0; i < shootbots.length; i++) {
            if (shootbots[i].team != projectile.team && shootbots[i].reachable && squareCollision(o.x, o.y, o.w, o.h, shootbots[i].x - 2, shootbots[i].y - 2, 5, 5)) {
              shootbots[i].charges--;
              shootbots[i].reachable = false;
              projectile.shouldDie = true;
              createProjectile(shootbots[i].x, shootbots[i].y, -3.5, 0, shootbots[i].team, shootbots[i].author);
              createProjectile(shootbots[i].x, shootbots[i].y, 3.5, 0, shootbots[i].team, shootbots[i].author);
              createProjectile(shootbots[i].x, shootbots[i].y, 0, 3.5, shootbots[i].team, shootbots[i].author);
              createProjectile(shootbots[i].x, shootbots[i].y, 0, -3.5, shootbots[i].team, shootbots[i].author);
              // createProjectile(shootbots[i].x, shootbots[i].y, 2.4748737341529163, 2.4748737341529163, projectile.team, projectile.author);
              // createProjectile(shootbots[i].x, shootbots[i].y, -2.4748737341529163, -2.4748737341529163, projectile.team, projectile.author);
              // createProjectile(shootbots[i].x, shootbots[i].y, 2.4748737341529163, -2.4748737341529163, projectile.team, projectile.author);
              // createProjectile(shootbots[i].x, shootbots[i].y, -2.4748737341529163, 2.4748737341529163, projectile.team, projectile.author);
            }
          }
          for (let i = 0; i < projectiles.length; i++) {
            if (projectile.team != projectiles[i].team && !projectiles[i].shouldDie && !projectile.shouldDie) {
              if (squareCollision(o.x, o.y, o.w, o.h, projectiles[i].x - 2, projectiles[i].y - 2)) {
                touchingPlayers = projectiles[i].shouldDie = true;
              }
            }
          }
          if (projectile.isMine) projectile.children.forEach(x => x.shouldRotate = 5);
          if (projectile.shouldRotate) projectile.shouldRotate -= deltaTime;
          if ((!projectiles[i].collisionProtection && (isColliding(o) || projectile.timeToLive <= 0)) || touchingPlayers || projectile.shouldDie) {
            projectile.isDead = true;
            projectiles.splice(i--, 1);
            explode(projectile.x, projectile.y, projectile.team);
            if (projectile.hsplit) {
              projectiles.push(createProjectile(projectile.x, projectile.y - projectile.dy, 3.5, 0, projectile.team, projectile.author));
              projectiles.push(createProjectile(projectile.x, projectile.y - projectile.dy, -3.5, 0, projectile.team, projectile.author));
            }
            continue;
          }
          if (projectile.shouldRotate) {
            if (projectile.shouldRotate > 0) {
              let angle = (projectile.childIndex / 16 * Math.PI * 2) + (Date.now() % 1500) / 1500 * Math.PI * 2;
              let cos = Math.cos(angle);
              let sin = Math.sin(angle);
              projectile.dx = cos * 3.5;
              projectile.dy = sin * 3.5;
              projectile.x = projectile.rotationOrigin.x - projectile.rotationOrigin.dx + cos * 7.5;
              projectile.y = projectile.rotationOrigin.y - projectile.rotationOrigin.dy + sin * 7.5;
            } else {
              projectile.isStatic = projectile.collisionProtection = false;
              projectile.timeToLive = 5;
            }
          }
          if (projectile.x >= 300) projectile.x -= 300;
          if (projectile.x < 0) projectile.x += 300;
          if (projectile.y >= 300) projectile.y -= 300;
          if (projectile.y < 0) projectile.y += 300;
          let ratio = projectile.dy / projectile.dx;
          let Ratio = projectile.dx / projectile.dy;
          let teamTranslation = projectile.team == 'blue' ? 1 : 0;
          let frame = Math.floor((Date.now() % 200) / 100);
          let isNearHorizontal = (ratio > 0 && ratio < 0.25) || (ratio < 0 && ratio > -0.25);
          let isNearVertical = (Ratio > 0 && Ratio < 0.25) || (Ratio < 0 && Ratio > -0.25);
          if (ratio == 0 || isNearHorizontal) {
            let isNegative = projectile.dx < 0;
            ctx.save();
            ctx.translate(Math.floor(projectile.x), Math.floor(projectile.y));
            if (isNegative) {
              // ctx.scale(-1, 1);
              ctx.rotate(Math.PI);
            }
            // console.log(teamTranslation);
            ctx.drawImage(img, teamTranslation * 7, 10 + frame * 4, 7, 4, -5, -2, 7, 4);
            ctx.restore();
          } else if (!isFinite(ratio) || isNearVertical) {
            let isNegative = projectile.dy < 0;
            ctx.save();
            ctx.translate(Math.floor(projectile.x), Math.floor(projectile.y));
            ctx.rotate(isNegative ? -Math.PI / 2 : Math.PI / 2);
            ctx.drawImage(img, teamTranslation * 7, 10 + frame * 4, 7, 4, -5, -2, 7, 4);
            ctx.restore();
          } else {
            // ctx.fillStyle = projectile.team;
            // ctx.fillRect(o.x, o.y, o.w, o.h);
            let angle = Math.atan2(projectile.dy, projectile.dx);
            if (angle > Math.PI / 2) {
              ctx.save();
              ctx.translate(Math.floor(projectile.x), Math.floor(projectile.y));
              ctx.rotate(Math.PI * 1.5);
              ctx.drawImage(img, 30 + teamTranslation * 6, 10 + frame * 6, 6, 6, -1, -1, 6, 6);
              ctx.restore();
            } else if (angle > 0) {
              ctx.save();
              ctx.translate(Math.floor(projectile.x), Math.floor(projectile.y));
              ctx.rotate(Math.PI);
              ctx.drawImage(img, 30 + teamTranslation * 6, 10 + frame * 6, 6, 6, -1, -1, 6, 6);
              ctx.restore();
            } else if (angle > -Math.PI / 2) {
              ctx.save();
              ctx.translate(Math.floor(projectile.x), Math.floor(projectile.y));
              ctx.rotate(Math.PI / 2);
              ctx.drawImage(img, 30 + teamTranslation * 6, 10 + frame * 6, 6, 6, -1, -1, 6, 6);
              ctx.restore();
            } else {
              ctx.save();
              ctx.translate(Math.floor(projectile.x), Math.floor(projectile.y));
              ctx.drawImage(img, 30 + teamTranslation * 6, 10 + frame * 6, 6, 6, -1, -1, 6, 6);
              ctx.restore();
            }
          }
        }
        // console.log(shootbots);
        for (let i = 0; i < shootbots.length; i++) {
          // console.log('!!');
          let bot = shootbots[i];
          if (!paused) {
            bot.timeUntilReady -= deltaTime;
          }
          ctx.drawImage(img, 0, 89, 5, 5, bot.x - 2, bot.y - 2, 5, 5);
          if (bot.timeUntilReady <= 0) {
            ctx.drawImage(img, 29 + (performance.now() % 200 < 100 ? 5 : 0), 89, 5, 5, bot.x - 2, bot.y - 2, 5, 5);
            if (!paused) {
              for (const player of players) {
                if (player.team != bot.team && ((player.x - bot.x) ** 2 + (player.y - bot.y) ** 2) < 10000) {
                  bot.timeUntilReady = 3;
                  bot.charges--;
                  let diffX = (player.x + player.w / 2) - bot.x;
                  let diffY = (player.y + player.h / 2) - bot.y;
                  const angle = Math.atan2(diffY, diffX);
                  createProjectile(bot.x, bot.y, Math.cos(angle) * 3.5, Math.sin(angle) * 3.5, bot.team, bot.author);
                  let a = Math.sqrt(diffX ** 2 + diffY ** 2);
                  let projectedX = player.x + player.effectiveXMovement * 0.5 + player.w / 2;
                  let projectedY = player.y + player.effectiveYMovement * 0.5 + player.h / 2;
                  // explode(projectedX, projectedY, 'yellow');
                  ctx.fillStyle = 'red';
                  ctx.fillRect(projectedX, projectedY, 2, 2);
                  // explode(projectedX, projectedY, 'yellow');
                  // explode(projectedX, projectedY, 'yellow');
                  let differenceX = projectedX - bot.x;
                  let differenceY = projectedY - bot.y;
                  createProjectile(bot.x, bot.y, differenceX / 30, differenceY / 30, bot.team, bot.author);
                  break;
                }
              }
            }
          }
          ctx.drawImage(img, 5 + bot.charges * 3 + (bot.team == 'blue' ? 12 : 0), 90, 3, 3, bot.x - 1, bot.y - 1, 3, 3);

          if (bot.charges <= 0) {
            explode(bot.x, bot.y, bot.team);
            shootbots.splice(i--, 1);
          }
          // console.log(bot);
        }
        for (let i = 0; i < spawns.length; i++) {
          if (spawns[i].content) {
            ctx.drawImage(img, spawns[i].content.image * 4, 81, 4, 4, spawns[i].x * 10 + 3, spawns[i].y * 10 + 3, 4, 4);
          }
        }
        let now = Date.now();
        let indices = {
          'blue': 9,
          'red': 0,
          'yellow': 42
        }
        for (let i = 0; i < explosions.length; i++) {
          let frame = Math.floor((now - explosions[i].time) / (35.71 * (gameEnded ? 3 : 1)));
          if (frame == 7) {
            explosions.splice(i--, 1);
            continue;
          }
          ctx.drawImage(img, indices[explosions[i].team], 18 + frame * 9, 9, 9, Math.floor(explosions[i].x) - 4, Math.floor(explosions[i].y) - 4, 9, 9);
        }
        if (redScore > blueScore) {
          let redScorePixels = Math.floor(150 * redScore / pointsToWin);
          if (redScorePixels != 0) {
            ctx.fillStyle = 'rgb(36, 0, 0)';
            ctx.fillRect(0, 1, redScorePixels, 4);
            ctx.fillRect(0, 4, (redScore.toString().length * 5) + 7, 7);
            fillText('À' + redScore, 1, 5);
            ctx.drawImage(img, 0, 10, 7, 4, redScorePixels - 5, 1, 7, 4);
          }
          let blueScorePixels = Math.floor(150 * blueScore / pointsToWin);
          if (blueScorePixels != 0) {
            ctx.fillStyle = 'rgb(0, 0, 85)';
            ctx.fillRect(300 - blueScorePixels, 1, blueScorePixels, 4);
            let textLength = blueScore.toString().length + 1;
            ctx.fillRect(300 - (textLength * 5 + 2), 4, (textLength * 5 + 2), 7);
            fillText(blueScore + 'È', 299 - textLength * 5, 5);
            ctx.save();
            ctx.translate(300 - blueScorePixels, 5);
            ctx.rotate(Math.PI);
            ctx.drawImage(img, 7, 10, 7, 4, -5, 0, 7, 4);
            ctx.restore();
          }
        } else {
          let blueScorePixels = Math.floor(150 * blueScore / pointsToWin);
          if (blueScorePixels != 0) {
            ctx.fillStyle = 'rgb(0, 0, 85)';
            ctx.fillRect(300 - blueScorePixels, 1, blueScorePixels, 4);
            let textLength = blueScore.toString().length + 1;
            ctx.fillRect(300 - (textLength * 5 + 2), 4, (textLength * 5 + 2), 7);
            fillText(blueScore + 'È', 299 - textLength * 5, 5);
            ctx.save();
            ctx.translate(300 - blueScorePixels, 5);
            ctx.rotate(Math.PI);
            ctx.drawImage(img, 7, 10, 7, 4, -5, 0, 7, 4);
            ctx.restore();
          }
          let redScorePixels = Math.floor(150 * redScore / pointsToWin);
          if (redScorePixels != 0) {
            ctx.fillStyle = 'rgb(36, 0, 0)';
            ctx.fillRect(0, 1, redScorePixels, 4);
            ctx.fillRect(0, 4, (redScore.toString().length * 5) + 7, 7);
            fillText('À' + redScore, 1, 5);
            ctx.drawImage(img, 0, 10, 7, 4, redScorePixels - 5, 1, 7, 4);
          }
        }

        if (gameEnded) {
          let angle = (Date.now() % 500) / 500 * Math.PI * 2;
          for (let i = 0, q = 0; i < Math.PI * 2; i += Math.PI / 3, q++) {
            let cos = Math.cos(angle + i);
            let sin = Math.sin(angle + i);
            let color = redScore == blueScore ? ['red', 'blue'][q % 2] : (redScore > blueScore ? 'red' : 'blue');
            explode(150 + cos * angle * 20, 150 + sin * angle * 20, color);
          }
        }

        if (paused && !gameEnded) {
          fillText('sur pause', 150, 148, false, true);
          fillText('espace pour continuer / ¬ pour quitter', 150, 154, false, true);
        }
        break;
    }
    ctx.drawImage(canvas, 0, 20, 20, 300, 280, 0, 20, 300);
    ctx.drawImage(canvas, 320, 20, 20, 300, 0, 0, 20, 300);
    ctx.drawImage(canvas, 20, 0, 300, 20, 0, 280, 300, 20);
    ctx.drawImage(canvas, 20, 320, 300, 20, 0, 0, 300, 20);
    ctx.clearRect(-20, -20, 20, 320);
    ctx.clearRect(-20, -20, 320, 20);
    ctx.clearRect(300, 0, 20, 320);
    ctx.clearRect(0, 300, 320, 20);
  }
  update();
});
