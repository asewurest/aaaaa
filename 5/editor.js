const canvas = document.getElementById('canvas');
const mapName = document.getElementById('map-name');
const presets = document.getElementById('load-preset');
const download = document.getElementById('download');
const downloadA = document.getElementById('download-a');
for (let i = 0; i < maps.list.length; i++) {
  const oe = document.createElement('option');
  oe.innerHTML = oe.value = maps.list[i];
  presets.appendChild(oe);
}
const ctx = canvas.getContext('2d');

let ready = false;

function resize() {
  canvas.width = ready ? 300 : window.innerWidth;
  canvas.height = ready ? 300 : window.innerHeight;
  ctx.imageSmoothingEnabled = false;
}
resize();
addEventListener('resize', resize);

// function probe(array, x, y) {
// if (x >= array.length || x < 0 || y < 0 || y > array[x].length) return false;
// return array[x][y];
// }

function modulo(x, d) {
  if (x > 0) {
    return x % d;
  } else {
    while (x < 0) x += d;
    return x;
  }
}

function loadImage(src) {
  let i = new Image();
  i.src = src + '.png';
  return i;
}

let editing = {
  'name': 'dev',
  'terrain': Array(30).fill(0).map(x => Array(30).fill(0)),
  'decorations': Array(30).fill(0).map(x => Array(30).fill(0)),
  'jumpPads': Array(30).fill(0).map(x => Array(30).fill(0)),
  'spawns': []
}; //{
// };

let editingMode = 'terrain',
  subEditingMode = 'torches',
  terrainType = 1;

const gridSquare = loadImage('grid');
const azerty = loadImage('azerty');

const choose = document.getElementById('choose');
const upload = document.getElementById('upload');
const create = document.getElementById('create');
const settingsToggle = document.getElementById('settings-toggle');
const settings = document.getElementById('settings');
const uploadInput = document.getElementById('upload-input');

function createOrUploadClicked({
  target
}) {
  choose.classList.add('hidden');
  if (target == upload) {
    uploadInput.click();
    uploadInput.addEventListener('change', e => {
      const file = uploadInput.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', e => {
        console.log(e.target.result);
        editing = JSON.parse(e.target.result);
        if (!editing.decorations) editing.decorations = Array(30).fill(0).map(x => Array(30).fill(0));
        if (!editing.spawns) editing.spawns = [];
        mapName.value = editing.name;
        canvas.classList.add('ready');
        ready = true;
        resize();
        settingsToggle.classList.remove('hidden');
      });
      reader.readAsText(file);
    });
  } else {
    ready = true;
    mapName.value = editing.name;
    canvas.classList.add('ready');
    resize();
    settingsToggle.classList.remove('hidden');
  }
}

upload.addEventListener('click', createOrUploadClicked);
create.addEventListener('click', createOrUploadClicked);
settingsToggle.addEventListener('click', () => settings.classList.toggle('settings-hidden'));

let mouseX = 0,
  mouseY = 0;

function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!ready) {
    ctx.fillStyle = '#123456';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    let mid = [canvas.width / 2, canvas.height / 2].map(Math.round);
    // let startX = -Math.ceil(window.innerWidth / 40);
    // let startY = -Math.ceil(window.innerHeight / 40);
    // let endX = Math.ceil(window.innerWidth / 40);
    // let endY = Math.ceil(window.innerHeight / 40);
    for (let i = 0; i <= 30; i++) {
      for (let j = 0; j <= 30; j++) {
        ctx.drawImage(gridSquare, i * 10, j * 10, 10, 10);
      }
    }
    if (editing && editing.terrain) {
      for (let i = 0; i < 30; i++) {
        for (let j = 0; j < 30; j++) {
          if (editing.terrain[i][j]) {
            let [iX, iY] = determineXY(editing.terrain, i, j);
            ctx.drawImage(azerty, 92 + iX * 12 + (editing.terrain[i][j] - 1) * 36, iY * 12, 12, 12, i * 10 - 1, j * 10 - 1, 12, 12);
          } else {
            continue;
            if (safeGet2D(editing.terrain, i, j + 1)) {
              if (!safeGet2D(editing.terrain, i - 1, j)) {
                ctx.strokeStyle = 'red';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(i * 10 + 5, j * 10 + 5);
                ctx.lineTo(i * 10 + 5 - 10, j * 10 + 5);
                ctx.stroke();
              }
              if (!safeGet2D(editing.terrain, i + 1, j)) {
                ctx.strokeStyle = 'red';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(i * 10 + 5, j * 10 + 5);
                ctx.lineTo(i * 10 + 5 + 10, j * 10 + 5);
                ctx.stroke();
              }
              if (!safeGet2D(editing.terrain, i, j - 1)) {
                if (!safeGet2D(editing.terrain, i, j - 2)) {
                  ctx.strokeStyle = 'red';
                  ctx.lineWidth = 1;
                  ctx.beginPath();
                  ctx.moveTo(i * 10 + 5, j * 10 + 5);
                  ctx.lineTo(i * 10 + 5, j * 10 + 5 - 20);
                  ctx.stroke();
                  if (!safeGet2D(editing.terrain, i, j - 3)) {
                    ctx.strokeStyle = 'red';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(i * 10 + 5, j * 10 + 5);
                    ctx.lineTo(i * 10 + 5, j * 10 + 5 - 30);
                    ctx.stroke();
                  }
                }
                ctx.strokeStyle = 'red';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(i * 10 + 5, j * 10 + 5);
                ctx.lineTo(i * 10 + 5, j * 10 + 5 - 10);
                ctx.stroke();
              }
            } else {
              ctx.strokeStyle = 'red';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(i * 10 + 5, j * 10 + 5);
              ctx.lineTo(i * 10 + 5, j * 10 + 5 + 10);
              ctx.stroke();
              if (!safeGet2D(editing.terrain, i - 1, j + 1) && !safeGet2D(editing.terrain, i - 1, j)) {
                ctx.strokeStyle = 'red';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(i * 10 + 5, j * 10 + 5);
                ctx.lineTo(i * 10 + 5 - 10, j * 10 + 5 + 10);
                ctx.stroke();
              }
              if (!safeGet2D(editing.terrain, i + 1, j + 1) && !safeGet2D(editing.terrain, i + 1, j)) {
                ctx.strokeStyle = 'red';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(i * 10 + 5, j * 10 + 5);
                ctx.lineTo(i * 10 + 5 + 10, j * 10 + 5 + 10);
                ctx.stroke();
              }
            }
            if ((safeGet2D(editing.terrain, i - 1, j) || safeGet2D(editing.terrain, i + 1, j)) && !safeGet2D(editing.terrain, i, j - 1)) {
              ctx.strokeStyle = 'red';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(i * 10 + 5, j * 10 + 5);
              ctx.lineTo(i * 10 + 5, j * 10 + 5 - 10);
              ctx.stroke();
            }
          }
        }
      }
      for (let i = 0; i < 30; i++) {
        for (let j = 0; j < 30; j++) {
          if (editing.decorations[i][j]) {
            if (editing.decorations[i][j] < 10) {
              ctx.drawImage(azerty, 74, (editing.decorations[i][j] - 1) * 10 + 10, 10, 10, i * 10, j * 10, 10, 10);
            } else {
              if (editing.decorations[i][j] == 10) {
                ctx.drawImage(azerty, 70, 10, 4, 10, i * 10, j * 10, 4, 10);
              } else {
                ctx.save();
                ctx.translate(i * 10 + 10, j * 10);
                ctx.scale(-1, 1);
                ctx.drawImage(azerty, 70, 10, 4, 10, 0, 0, 4, 10);
                ctx.restore();
              }
            }
          }
        }
      }
      if (editing.jumpPads) {
        for (let i = 0; i < 30; i++) {
          for (let j = 0; j < 30; j++) {
            if (editing.jumpPads[i][j]) {
              ctx.drawImage(azerty, 0, 85, 10, 4, i * 10, j * 10 + 8, 10, 4);
            }
          }
        }
      }
      for (let i = 0; i < editing.spawns.length; i++) {
        ctx.drawImage(azerty, 99, 60 + editing.spawns[i].type * 10, 10, 10, editing.spawns[i].x * 10, editing.spawns[i].y * 10, 10, 10);
      }
    }
    ctx.fillStyle = 'black';
    if (editingMode == 'terrain') {
      ctx.fillRect(mouseX + 2 + 4, mouseY + 2 + 4, 36, 15);
      fillText('terrain', mouseX + 3 + 4, mouseY + 3 + 4);
      fillText('< ' + terrainType, mouseX + 3 + 4, mouseY + 10 + 4);
    } else if (editingMode == 'deco') {
      ctx.fillRect(mouseX + 2 + 4, mouseY + 2 + 4, Math.max(10, subEditingMode.length + 1) * 5 + 1, 15);
      fillText('decoration', mouseX + 3 + 4, mouseY + 3 + 4);
      fillText('<' + subEditingMode, mouseX + 3 + 4, mouseY + 10 + 4);
    } else if (editingMode == 'spawns') {
      ctx.fillRect(mouseX + 2 + 4, mouseY + 2 + 4, Math.max(9, subEditingMode.length + 1) * 5 + 1, 15);
      fillText('positions', mouseX + 3 + 4, mouseY + 3 + 4);
      fillText('<' + subEditingMode, mouseX + 3 + 4, mouseY + 10 + 4);
    } else if (editingMode == 'jumppads') {
      ctx.fillRect(mouseX + 2 + 4, mouseY + 2 + 4, 56, 7);
      fillText('trampolines', mouseX + 3 + 4, mouseY + 3 + 4);
    }
    ctx.fillStyle = 'red';
    ctx.fillRect(mouseX, mouseY, 1, 1);
    ctx.fillRect(mouseX - 1, mouseY - (isDown ? 3 : 5), 3, 1);
    ctx.fillRect(mouseX - 1, mouseY + (isDown ? 3 : 5), 3, 1);
    ctx.fillRect(mouseX - (isDown ? 3 : 5), mouseY - 1, 1, 3);
    ctx.fillRect(mouseX + (isDown ? 3 : 5), mouseY - 1, 1, 3);
    if (isDown) {
      ctx.fillRect(150, 0, 1, 300);
      ctx.fillRect(0, 150, 300, 1);
    }
  }

  let name = editing.name;
  editing.name = '|beta|';
  let json = JSON.stringify(editing);
  editing.name = name;
  if (localStorage._currentlyEditing != json) {
    localStorage._currentlyEditing = json;
  }

  requestAnimationFrame(update);
}
update();

function toggleOrSet(toggle, value) {
  if (editingMode == 'terrain') {
    return editing.terrain[Math.floor(mouseX / 10)][Math.floor(mouseY / 10)] = toggle ? (!editing.terrain[Math.floor(mouseX / 10)][Math.floor(mouseY / 10)] ? terrainType : 0) : value;
  } else if (editingMode == 'deco') {
    if (['vigne1', 'vigne2', 'motif1', 'motif2'].includes(subEditingMode)) {
      let val = editing.decorations[Math.floor(mouseX / 10)][Math.floor(mouseY / 10)];
      if (toggle) {
        return editing.decorations[Math.floor(mouseX / 10)][Math.floor(mouseY / 10)] = val ? 0 : value;
      } else {
        return editing.decorations[Math.floor(mouseX / 10)][Math.floor(mouseY / 10)] = value;
      }
    } else {
      let x = Math.floor(mouseX / 10);
      let y = Math.floor(mouseY / 10);
      let side = Math.floor(mouseX / 5) - Math.floor(mouseX / 10) * 2 > 0;
      if (editing.decorations[x][y]) {
        editing.decorations[x][y] = 0;
      } else {
        editing.decorations[x][y] = ((safeGet2D(editing.terrain, x - 1, y) && safeGet2D(editing.terrain, x + 1, y)) ? side : (safeGet2D(editing.terrain, x - 1, y) ? false : true)) ? 11 : 10;
      }
    }
  }
}

let isDown = false,
  value = false;
addEventListener('mousedown', e => {
  if (e.target == canvas) {
    let isLargeEnough = window.innerWidth >= 600 && window.innerHeight >= 600;
    let w = isLargeEnough ? 300 : 150;
    let eClientX = e.clientX - (window.innerWidth / 2 - w);
    let eClientY = e.clientY - (window.innerHeight / 2 - w);
    mouseX = Math.floor(eClientX / (isLargeEnough ? 2 : 1));
    mouseY = Math.floor(eClientY / (isLargeEnough ? 2 : 1));
  }

  if (ready && e.target == canvas) {
    isDown = true;
    if (editingMode != 'spawns') {
      if (editingMode != 'jumppads') {
        value = toggleOrSet(true, editingMode == 'deco' ? ['', 'vigne1', 'vigne2', 'motif1', 'motif2'].indexOf(subEditingMode) : terrainType);
      } else {
        let x = Math.floor(mouseX / 10);
        let y = Math.floor(mouseY / 10);
        if (!editing.jumpPads) editing.jumpPads = Array(30).fill(0).map(x => Array(30).fill(0));
        editing.jumpPads[x][y] = 1 - editing.jumpPads[x][y];
      }
    } else {
      let x = Math.floor(mouseX / 10);
      let y = Math.floor(mouseY / 10);
      let type = subEditingMode == 'trucs' ? 0 : 1
      let index = editing.spawns.indexOf(editing.spawns.find(x_ => x_.x == x && x_.y == y && x_.type == type));
      if (index >= 0) {
        editing.spawns.splice(index, 1);
      } else {
        editing.spawns.push({
          x,
          y,
          type
        });
      }
    }
  }
});

addEventListener('mouseup', e => {
  isDown = false;
});

addEventListener('mousemove', e => {
  if (e.target == canvas) {
    let isLargeEnough = window.innerWidth >= 600 && window.innerHeight >= 600;
    let w = isLargeEnough ? 300 : 150;
    let eClientX = e.clientX - (window.innerWidth / 2 - w);
    let eClientY = e.clientY - (window.innerHeight / 2 - w);
    mouseX = Math.floor(eClientX / (isLargeEnough ? 2 : 1));
    mouseY = Math.floor(eClientY / (isLargeEnough ? 2 : 1));
  }
  if (isDown && e.target == canvas && editingMode != 'spawns') {
    toggleOrSet(false, value);
  }
})

mapName.addEventListener('input', e => {
  mapName.value = mapName.value.toLowerCase();
  editing.name = mapName.value;
})

mapName.addEventListener('keydown', e => {
  if (e.key == 'Enter') mapName.blur();
});

presets.addEventListener('change', e => {
  if (presets.value != '-load') {
    editing = maps[presets.value];
    if (!editing.spawns) editing.spawns = [];
    mapName.value = editing.name + ' v2';
    presets.value = '-load';
  }
});

download.addEventListener('click', () => {
  editing.terrain = editing.terrain.map(x => x.map(x => x ? x : 0))
  let jsonAsDataURL = btoa(JSON.stringify(editing));
  downloadA.href = 'data:application/json;base64,' + jsonAsDataURL;
  downloadA.download = `${editing.name.replace(/[^A-Za-z0-9_-]/, '-')}.json`;
  downloadA.click();
});

addEventListener('keydown', e => {
  if (e.key == 'Enter') {
    editingMode = {
      'terrain': 'deco',
      'deco': 'spawns',
      'spawns': 'jumppads',
      'jumppads': 'terrain'
    }[editingMode];
    if (editingMode == 'deco') subEditingMode = 'torches';
    else subEditingMode = 'joueurs';
  }
  if (editingMode == 'deco' && e.key == ' ') {
    subEditingMode = {
      'torches': 'vigne1',
      'vigne1': 'vigne2',
      'vigne2': 'motif1',
      'motif1': 'motif2',
      'motif2': 'torches'
    }[subEditingMode];
  }
  if (editingMode == 'spawns' && e.key == ' ') {
    subEditingMode = {
      'trucs': 'joueurs',
      'joueurs': 'trucs'
    }[subEditingMode];
  }
  if (editingMode == 'terrain' && e.key == ' ') {
    terrainType++;
    if (terrainType == 4) terrainType = 1;
  }
});
