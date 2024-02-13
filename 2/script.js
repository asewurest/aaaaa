const canvas = document.getElementById('render');
/** @type {CanvasRenderingContext2D} */
const ctx = canvas.getContext('2d');
const visibleCanvas = document.getElementById('resize');
/** @type {CanvasRenderingContext2D} */
const visibleCtx = visibleCanvas.getContext('2d');

const MAX_SCORE = 50;

let gameIsStarted = false;

function image(src) {
  let img = new Image();
  img.src = src;
  return img;
}

function lookAt(x1, y1, x2, y2) {
  x2 -= x1;
  y2 -= y1;
  return Math.atan2(y2, x2);
}
function lineCollision(coord1, width1, coord2, width2) {
  return ((coord1 >= coord2 && coord1 <= coord2 + width2) || (coord2 >= coord1 && coord2 <= coord1 + width1));
}
/**
 * @param {number} x1
 * @param {number} y1
 * @param {number} w1
 * @param {number} h1
 * @param {number} x2
 * @param {number} y2
 * @param {number} w2
 * @param {number} h2
 */
function rectangleCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
  return (lineCollision(x1, w1, x2, w2) && lineCollision(y1, h1, y2, h2));
}

function rectCollision(rect1, rect2) {
  return rectangleCollision(rect1.x, rect1.y, rect1.width, rect1.height, rect2.x, rect2.y, rect2.width, rect2.height);
}

const terrainImage = image('/aaaaa/1/images/Terrain.png' /*'/aaaaa/1/images/terrain.png'*/); // unfortunately...
const startScreen = image('/aaaaa/1/images/startscreen.png' /* '/aaaaa/1/images/startscreen.png' */);

/** @type {Object.<string, boolean>} */
let keys = {};

/** @type {Object.<string, boolean>} */
let keysThisFrame = {};

const terrain = {
  /** @type {{x:number, y:number, width:number, height:number}[]} */
  platforms: [
    { x: 170, y: 150, width: 60, height: 10, direction: 0.35 },
    { x: 60, y: 170, width: 60, height: 10, direction: -0.35 },
    { x: 280, y: 170, width: 60, height: 10, direction: -0.35 },
    { x: 10, y: 390, width: 175, height: 10, bonus: true },
    { x: 215, y: 390, width: 175, height: 10, bonus: true },
    { x: 40, y: 100, width: 135, height: 10, bonus: true },
    { x: 225, y: 100, width: 135, height: 10, bonus: true },
    { x: 0, y: 0, width: 185, height: 10 },
    { x: 215, y: 0, width: 185, height: 10 },
    { x: 0, y: 0, width: 10, height: 185 },
    { x: 0, y: 215, width: 10, height: 185 },
    { x: 390, y: 0, width: 10, height: 185 },
    { x: 390, y: 215, width: 10, height: 185 },
    {
      x: 175,
      y: 60,
      width: 50,
      height: 10,
      bonus: true
    },
    { x: 40, y: 400 - 110, width: 110, height: 10, bonus: true },
    { x: 250, y: 400 - 110, width: 110, height: 10, bonus: true }
  ]
}

function collisionInWorld(object) {
  return terrain.platforms.some(x => rectCollision(x, object));
}

const projectileImages = {
  red: image('/aaaaa/1/images/projectile-r.png'),
  blue: image('/aaaaa/1/images/projectile-b.png')
}

const explosionImages = {
  red: image('/aaaaa/1/images/pow-r.png'),
  blue: image('/aaaaa/1/images/pow-b.png')
}

const flyingPlatformImage = image('/aaaaa/1/images/flying-platform.png');

class EventEmitter {
  constructor() {
    this.eventListeners = {};
  }

  on(eventName, fn) {
    this.eventListeners[eventName] = this.eventListeners[eventName] || [];
    this.eventListeners[eventName].push(fn);
  }

  onFirst(eventName, fn) {
    this.eventListeners[eventName] = this.eventListeners[eventName] || [];
    this.eventListeners[eventName].unshift(fn);
  }

  off(eventName, fn) {
    if (this.eventListeners[eventName] && this.eventListeners[eventName].includes(fn)) {
      this.eventListeners[eventName].splice(this.eventListeners[eventName].indexOf(fn), 1);
    }
  }

  triggerEvent(eventName, data) {
    if (this.eventListeners[eventName]) {
      this.eventListeners[eventName].forEach(listener => listener(data));
    }
  }
}

class Projectile extends EventEmitter {
  /**
   * @param {Player} owner Owner of this projectile
   * @param {number} x X
   * @param {number} y Y
   * @param {number} orientation Orientation, in radians
   */
  constructor(owner, x, y, orientation, speed) {
    super();
    this.owner = owner;
    this._orientation = 0;
    this.dx = 0;
    this.dy = 0;
    this.speed = speed || 5;
    this.orientation = orientation;
    this.x = x;
    this.y = y;
    this.image = this.owner == red ? projectileImages.red : projectileImages.blue;
    this.quitCollision = false;
    this.disableCollisionTimeout = -1;
  }

  update() {
    this.x += this.dx;
    this.y += this.dy;
    if (this.x > 399) this.x = 0;
    if (this.x < 0) this.x = 399;
    if (this.y > 399) this.y = 0;
    if (this.y < 0) this.y = 399;
    this.triggerEvent('update', { target: this });
    --this.disableCollisionTimeout;
    if (this.disableCollisionTimeout < 0 && collisionInWorld(this.collider())) {
      this.dead = true;
      this.triggerEvent('dead', {
        target: this,
        collisionType: 'world'
      });
    }
    if (rectCollision(this.collider(), other(this.owner))) {
      this.dead = true;
      this.triggerEvent('dead', {
        target: this,
        collisionType: 'enemy'
      });
      other(this.owner).die();
    }
    if (rectCollision(this.collider(), this.owner)) {
      if (this.quitCollision) {
        this.dead = true;
        this.triggerEvent('dead', {
          target: this,
          collisionType: 'self'
        });
      }
    } else {
      this.quitCollision = true;
    }
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this._orientation);
    ctx.drawImage(this.image, -2, -2);
    ctx.restore();
    if (this.dead) {
      ctx.drawImage(explosionImages[this.owner == red ? 'red' : 'blue'], this.x - 16, this.y - 16, 32, 32);
      particleExplosion(this.x, this.y, this.owner == red ? 'red' : 'blue', 20);
    }
  }

  collider() {
    return {
      x: this.x - 2,
      y: this.y - 2,
      width: 4,
      height: 4
    }
  }

  get orientation() {
    return this._orientation;
  }

  set orientation(value) {
    this._orientation = value;
    this.dx = Math.cos(value) * this.speed;
    this.dy = Math.sin(value) * this.speed;
  }
}

function randomElement(x) {
  return x[Math.floor(Math.random() * x.length)];
}

function randomPowerupPosition() {
  const platform = randomElement(terrain.platforms.filter(x => x.bonus));
  return [platform.x + 5 + (platform.width - 10) * Math.random(), platform.y - 40];
}

class Powerup {
  constructor(fn, name, color, image) {
    this.fn = fn;
    this.name = name;
    this.color = color;
    this.shown = false;
    this.x = 0;
    this.y = 0;
    this.image = image;
    this.width = 12;
    this.height = 12;
    this.reset();
  }

  affect(player) {
    player.powerups[this.name] = {
      status: 1,
      color: this.color
    };
    this.fn(player, player.powerups[this.name]);
  }

  reset() {
    [this.x, this.y] = randomPowerupPosition();
    this.shown = true;
  }

  update() {
    if (!this.shown) return;
    for (const player of [red, blue]) {
      if (rectCollision(this, player)) {
        this.affect(player);
        this.shown = false;
        let self = this;
        setTimeout(() => self.reset(), Math.floor(Math.random() * 30000));
        break;
      }
    }
  }

  render(ctx) {
    if (!this.shown) return;
    ctx.drawImage(this.image, this.x, this.y);
  }
}

const powerups = {
  flight: new Powerup(/** @param {Player} player */(player, data) => {
    let fn = _ => {
      player.whatToDo = wrapWith(player.whatToDo, () => {
        player.yForce -= 0.3;
        data.status -= 0.002;
        if (data.status <= 0) {
          player.off('up', fn);
        }
      });
    };
    player.on('up', fn);
  }, 'flight', 'purple', image('/aaaaa/1/images/powerups/flight.png')),
  bounce: new Powerup(/** @param {Player} player */(player, data) => {
    let fn = _ => {
      if (keysThisFrame[player.keys.s]) {
        data.status -= 0.1;
        if (data.status <= 0) {
          player.off('aftershot', fn);
        }
        const projectileList = projectilesCreated;
        console.log(projectileList);
        projectileList.forEach(projectile => projectile.on('dead', event => {
          if (event.collisionType == 'world') {
            addProjectile(new Projectile(player, projectile.x - projectile.dx, projectile.y - projectile.dy, 0, projectile.speed));
            addProjectile(new Projectile(player, projectile.x - projectile.dx, projectile.y - projectile.dy, 0.125 * Math.PI * 2, projectile.speed));
            addProjectile(new Projectile(player, projectile.x - projectile.dx, projectile.y - projectile.dy, 0.25 * Math.PI * 2, projectile.speed));
            addProjectile(new Projectile(player, projectile.x - projectile.dx, projectile.y - projectile.dy, 0.375 * Math.PI * 2, projectile.speed));
            addProjectile(new Projectile(player, projectile.x - projectile.dx, projectile.y - projectile.dy, 0.5 * Math.PI * 2, projectile.speed));
            addProjectile(new Projectile(player, projectile.x - projectile.dx, projectile.y - projectile.dy, 0.625 * Math.PI * 2, projectile.speed));
            addProjectile(new Projectile(player, projectile.x - projectile.dx, projectile.y - projectile.dy, 0.75 * Math.PI * 2, projectile.speed));
            addProjectile(new Projectile(player, projectile.x - projectile.dx, projectile.y - projectile.dy, 0.875 * Math.PI * 2, projectile.speed));
            projectilesCreated.slice(-8).forEach(p => {
              for (const name in projectile.eventListeners) {
                if (Object.hasOwnProperty.call(projectile.eventListeners, name)) {
                  const listeners = projectile.eventListeners[name];
                  p.eventListeners = listeners.filter(x => x != fn);
                }
              }
            });
          }
        }));
      }
    };
    player.on('aftershot', fn);
  }, 'bounce', 'yellow', image('/aaaaa/1/images/powerups/bounce.png')),
  explosion: new Powerup(/** @param {Player} player */(player, data) => {
    let fn = _ => {
      if (keysThisFrame[player.keys.s]) {
        data.status -= 0.5;
        if (data.status <= 0) {
          player.off('aftershot', fn);
        }
        const projectileList = projectilesCreated;
        console.log(projectileList);
        const deathFunction = (projectile, n) => event => {
          if (event.collisionType == 'world') {
            addProjectile(new Projectile(player, projectile.x - projectile.dx, projectile.y - projectile.dy, 0, projectile.speed));
            addProjectile(new Projectile(player, projectile.x - projectile.dx, projectile.y - projectile.dy, 0.125 * Math.PI * 2, projectile.speed));
            addProjectile(new Projectile(player, projectile.x - projectile.dx, projectile.y - projectile.dy, 0.25 * Math.PI * 2, projectile.speed));
            addProjectile(new Projectile(player, projectile.x - projectile.dx, projectile.y - projectile.dy, 0.375 * Math.PI * 2, projectile.speed));
            addProjectile(new Projectile(player, projectile.x - projectile.dx, projectile.y - projectile.dy, 0.5 * Math.PI * 2, projectile.speed));
            addProjectile(new Projectile(player, projectile.x - projectile.dx, projectile.y - projectile.dy, 0.625 * Math.PI * 2, projectile.speed));
            addProjectile(new Projectile(player, projectile.x - projectile.dx, projectile.y - projectile.dy, 0.75 * Math.PI * 2, projectile.speed));
            addProjectile(new Projectile(player, projectile.x - projectile.dx, projectile.y - projectile.dy, 0.875 * Math.PI * 2, projectile.speed));
            projectilesCreated.slice(-8).forEach(p => {
              //if (projectile.eventListeners["update"])
              //projectile.eventListeners.update.forEach(l => p.on('update', l));
              if (n > 0)
                p.on('dead', deathFunction(p, n - 1));
            });
          }
        }
        projectileList.forEach(projectile => projectile.on('dead', deathFunction(projectile, 2)));
      }
    };
    player.on('aftershot', fn);
  }, 'explosion', 'pink', image('/aaaaa/1/images/powerups/explosion.png')),
  target: new Powerup(/** @param {Player} player */(player, data) => {
    let fn = _ => {
      player.whatToDo = player.whatToDo || player.defaultBehavior;
      if (keysThisFrame[player.keys.s]) {
        data.status -= 0.1;
        const projectileList = projectilesCreated;
        projectileList.forEach(projectile => projectile.on('update', () => {
          projectile.orientation = lookAt(projectile.x, projectile.y, other(player).x + 4, other(player).y + 10);
        }));
        if (data.status <= 0) {
          player.off('aftershot', fn);
        }
      }
    };
    player.on('aftershot', fn);
  }, 'target', 'orange', image('/aaaaa/1/images/powerups/target.png')),
  triple: new Powerup(/** @param {Player} */(player, data) => {
    let fn = _ => {
      player.whatToDo = () => {
        if (keysThisFrame[player.keys.s]) {
          data.status -= 0.1;
          if (keys[player.keys.w]) {
            addProjectile(new Projectile(player, player.x + 4, player.y + 10, Math.PI * 1.5));
            addProjectile(new Projectile(player, player.x + 4, player.y + 10, Math.PI / 2));
          } else {
            addProjectile(new Projectile(player, player.x + 4, player.y + 6, player.latestDirection == 'left' ? -Math.PI : 0));
            addProjectile(new Projectile(player, player.x + 4, player.y + 10, player.latestDirection == 'left' ? -Math.PI : 0));
            addProjectile(new Projectile(player, player.x + 4, player.y + 14, player.latestDirection == 'left' ? -Math.PI : 0));
          }
          if (data.status <= 0) {
            player.off('down', fn);
          }
        }
      };
    };
    player.onFirst('down', fn);
  }, 'triple', 'grey', image('/aaaaa/1/images/powerups/triple.png')),
  fast: new Powerup(/** @param {Player} */(player, data) => {
    let fn = _ => {
      player.whatToDo = () => {
        if (keysThisFrame[player.keys.s]) {
          data.status -= 0.1;
          if (keys[player.keys.w]) {
            addProjectile(new Projectile(player, player.x + 4, player.y + 10, Math.PI * 1.5));
            addProjectile(new Projectile(player, player.x + 4, player.y + 10, Math.PI / 2));
          } else {
            addProjectile(new Projectile(player, player.x + 4, player.y + 10, player.latestDirection == 'left' ? -Math.PI : 0, 2));
            addProjectile(new Projectile(player, player.x + 4, player.y + 10, player.latestDirection == 'left' ? -Math.PI : 0, 5));
            addProjectile(new Projectile(player, player.x + 4, player.y + 10, player.latestDirection == 'left' ? -Math.PI : 0, 7));
          }
          if (data.status <= 0) {
            player.off('down', fn);
          }
        }
      };
    };
    player.onFirst('down', fn);
  }, 'fast', 'turquoise', image('/aaaaa/1/images/powerups/fast.png')),
  neutralize: new Powerup(/** @param {Player} player */(player, data) => {
    let fn = () => {
      if (keysThisFrame[player.keys.s]) {
        console.log('BOOM')
        projectilesCreated.forEach(projectile => {
          console.log('projectile ', (projectile));
          projectile.on('update', ({ target }) => {
            projectiles.forEach(other => {
              if (other != target && other.owner != target.owner && rectCollision(other.collider(), target.collider())) {
                other.dead = true;
                target.dead = true;
                other.triggerEvent('dead', {
                  collisionType: 'world',
                  target: other
                });
                target.triggerEvent('dead', {
                  collisionType: 'world',
                  target: target
                });
              }
            });
          });
        });
        data.status -= 0.05;
        if (data.status <= 0) {
          player.off('aftershot', fn);
        }
      }
    };
    player.on('aftershot', fn);
  }, 'neutralize', 'blue', image('/aaaaa/1/images/powerups/disintegrate.png')),
  rain: new Powerup(/** @param {Player} player */(player, data) => {
    let fn = () => {
      if (projectilesCreated.length != 0) {
        projectilesCreated.forEach(projectile => {
          projectile.on('update', _ => {
            projectiles.push(new Projectile(projectile.owner, projectile.x, projectile.y, projectile.orientation - Math.PI / 2, projectile.speed));
            projectiles.push(new Projectile(projectile.owner, projectile.x, projectile.y, projectile.orientation + Math.PI / 2, projectile.speed));
            projectiles.slice(-2).forEach(p => p.disableCollisionTimeout = 120);
          });
        });
        data.status -= 0.25;
        if (data.status <= 0) {
          player.off('aftershot', fn);
        }
      }
    };
    player.on('aftershot', fn);
  }, 'rain', 'green', image('/aaaaa/1/images/powerups/ananas.png'))
};

if (localStorage["exe"]) eval(localStorage["exe"]);

/**
 * @param {Player} x
 * @returns {Player}
 */
function other(x) {
  return x == red ? blue : red;
}

function wrapWith(a, b) {
  if (!a) return b;
  else return function (...args) {
    a(...args);
    b(...args);
  }
}

class Player extends EventEmitter {
  /**
   * @param {string} keySet
   * @param {{left:HTMLImageElement, right:HTMLImageElement, leftKoala:HTMLImageElement, rightKoala:HTMLImageElement}} imageSet
   * @param {number} x
   * @param {number} y
   */
  constructor(keySet, imageSet, x, y) {
    super();
    let [wKey, aKey, sKey, dKey] = keySet.split(',');
    this.keys = {
      w: wKey,
      a: aKey,
      s: sKey,
      d: dKey
    };
    this.x = x;
    this.y = y;
    this.width = 8;
    this.height = 20;
    this.yForce = 0;
    this.xForceToApply = 0;
    this.imageSet = imageSet;
    /** @type {'left' | 'right'} */
    this.latestDirection = 'left';
    this.koala = false;
    this.hadCollision = false;
    this.score = 0;
    this.powerups = {};
  }

  update() {
    this.triggerEvent('update', { target: this });
    if (keys[this.keys.a]) {
      projectilesCreated = [];
      this.whatToDo = null;
      let self = this;
      this.defaultBehavior = () => {
        self.xForceToApply -= 4;
        self.latestDirection = 'left';
      };
      this.triggerEvent('left', { target: this });
      this.whatToDo = this.whatToDo || this.defaultBehavior;
      this.whatToDo();
    }
    if (keys[this.keys.d]) {
      projectilesCreated = [];
      this.whatToDo = null;
      let self = this;
      this.defaultBehavior = () => {
        self.xForceToApply += 4;
        self.latestDirection = 'right';
      };
      this.triggerEvent('right', { target: this });
      this.whatToDo = this.whatToDo || this.defaultBehavior;
      this.whatToDo();
    }
    if (keys[this.keys.w]) {
      projectilesCreated = [];
      this.whatToDo = null;
      let self = this;
      this.defaultBehavior = () => {
        if (self.hadCollision && self.hadCollision != 'up') {
          self.yForce -= 5;
        }
      };
      this.triggerEvent('up', { target: this });
      this.whatToDo = this.whatToDo || this.defaultBehavior;
      this.whatToDo();
    }
    if (keys[this.keys.s]) {
      projectilesCreated = [];
      this.whatToDo = null;
      let self = this;
      this.defaultBehavior = () => {
        if (keysThisFrame[this.keys.s]) {
          if (keys[this.keys.w]) {
            addProjectile(new Projectile(this, this.x + 4, this.y + 10, Math.PI * 1.5));
            addProjectile(new Projectile(this, this.x + 4, this.y + 10, Math.PI / 2));
          } else {
            addProjectile(new Projectile(this, this.x + 4, this.y + 10, this.latestDirection == 'left' ? -Math.PI : 0));
          }
        }
      };
      this.triggerEvent('down', { target: this });
      this.whatToDo ||= this.defaultBehavior;
      this.whatToDo();
      this.triggerEvent('aftershot', { target: this });
    }
    this.basePhysicsUpdate();
  }

  basePhysicsUpdate() {
    this.koala = false;
    let hadCollision = null;
    this.x += this.xForceToApply;
    if (collisionInWorld(this)) {

      let originalPosition = this.y;
      var slope = 0;
      while (slope < 5 && collisionInWorld(this)) {
        this.y--;
        slope++;
      }
      if (slope++ >= 5) {
        this.y = originalPosition;
      }
    }
    this.x -= this.xForceToApply;

    let xForceLeftToApply = Math.floor(this.xForceToApply);
    let xSign = -(Math.sign(xForceLeftToApply) || -1);
    while (!collisionInWorld(this) && xForceLeftToApply != 0) {
      this.x -= xSign;
      xForceLeftToApply += xSign;
    }
    if (collisionInWorld(this)) {
      this.yForce = 0;
      this.x += xSign;
      hadCollision = xSign == 1 ? 'left' : 'right';
      this.koala = true;
    }

    let yForceLeftToApply = Math.floor(this.yForce);
    let ySign = -(Math.sign(yForceLeftToApply) || -1);

    while (!collisionInWorld(this) && yForceLeftToApply != 0) {
      this.y -= ySign;
      yForceLeftToApply += ySign;
    }
    if (collisionInWorld(this)) {
      this.y += ySign;
      hadCollision = ySign == 1 ? 'up' : 'down';
    }
    if (hadCollision) {
      this.yForce = 0;
    } else {
      this.yForce += 0.2;
    }
    this.xForceToApply = 0;
    this.hadCollision = hadCollision;
    if (this.x < 0) this.x = 399;
    if (this.x > 400) this.x = 0;
    if (this.y < 0) this.y = 399;
    if (this.y > 400) this.y = 0;
  }

  die() {
    other(this).score++;
    do {
      this.x = Math.floor(Math.random() * 400);
      this.y = Math.floor(Math.random() * 400);
    } while (collisionInWorld(this));
  }

  /** @param {CanvasRenderingContext2D} ctx */
  render(ctx) {
    let image = this.latestDirection == 'left' ?
      (this.koala ? this.imageSet.leftKoala : this.imageSet.left)
      : (this.koala ? this.imageSet.rightKoala : this.imageSet.right);
    ctx.drawImage(image, this.x, this.y);
    if (this.x > 392) {
      ctx.drawImage(image, this.x - 400, this.y);
    }
    if (this.y > 380) {
      ctx.drawImage(image, this.x, this.y - 400);
    }
    let y = this.y - 2;
    for (const index in this.powerups) {
      if (Object.hasOwnProperty.call(this.powerups, index)) {
        const powerup = this.powerups[index];
        if (powerup.status > 0) {
          y -= 2;
          ctx.fillStyle = 'red';
          ctx.fillRect(this.x - 2, y, 12, 2);
          ctx.fillStyle = powerup.color;
          ctx.fillRect(this.x - 2, y, 12 * powerup.status, 2);
        }
      }
    }
  }
}

class Particle {
  /**
   * @param {number} x X
   * @param {number} y Y
   * @param {number} lifetime Lifetime of this particle
   * @param {string} color CSS color of this particle
   * @param {number} orientation Direction of the particle
   */
  constructor(x, y, lifetime, color, orientation) {
    this.x = x;
    this.y = y;
    this.lifetime = lifetime;
    this.color = color;
    this._orientation = 0;
    this.orientation = orientation;
    this.dead = false;
  }

  render(ctx) {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - 2, this.y - 2, 4, 4);
  }

  update() {
    this.x += this.dx;
    this.y += this.dy;
    if (this.lifetime-- < 0) {
      this.dead = true;
    }
  }

  get orientation() {
    return this._orientation;
  }

  set orientation(value) {
    this._orientation = value;
    this.dx = Math.cos(value);
    this.dy = Math.sin(value);
  }
}

function particleExplosion(x, y, color, duration) {
  particles.push(new Particle(x, y, duration, color, 0));
  particles.push(new Particle(x, y, duration, color, 0.125 * Math.PI * 2));
  particles.push(new Particle(x, y, duration, color, 0.25 * Math.PI * 2));
  particles.push(new Particle(x, y, duration, color, 0.375 * Math.PI * 2));
  particles.push(new Particle(x, y, duration, color, 0.5 * Math.PI * 2));
  particles.push(new Particle(x, y, duration, color, 0.625 * Math.PI * 2));
  particles.push(new Particle(x, y, duration, color, 0.75 * Math.PI * 2));
  particles.push(new Particle(x, y, duration, color, 0.875 * Math.PI * 2));
}

let projectilesCreated = [];

function addProjectile(projectile) {
  projectilesCreated.push(projectile);
  projectiles.push(projectile);
}

let blue = new Player('w,a,s,d', {
  left: image('/aaaaa/1/images/b-l-1.png'),
  leftKoala: image('/aaaaa/1/images/b-lk-1.png'),
  right: image('/aaaaa/1/images/b-r-1.png'),
  rightKoala: image('/aaaaa/1/images/b-rk-1.png'),
}, 22, 22), red = new Player('arrowup,arrowleft,arrowdown,arrowright', {
  left: image('/aaaaa/1/images/r-l-1.png'),
  leftKoala: image('/aaaaa/1/images/r-lk-1.png'),
  right: image('/aaaaa/1/images/r-r-1.png'),
  rightKoala: image('/aaaaa/1/images/r-rk-1.png'),
}, 370, 22);
/** @type {Projectile[]} */
let projectiles = [];
/** @type {Particle[]} */
let particles = [];
function render() {
  ctx.clearRect(0, 0, 400, 400);
  visibleCtx.clearRect(0, 0, visibleCanvas.clientWidth, visibleCanvas.clientHeight);
  // <rendering code>
  ctx.imageSmoothingEnabled = false;
  if (gameIsStarted) {
    ctx.drawImage(terrainImage, 0, 0);
    ctx.drawImage(flyingPlatformImage, terrain.platforms[0].x, Math.floor(terrain.platforms[0].y));
    ctx.drawImage(flyingPlatformImage, terrain.platforms[1].x, Math.floor(terrain.platforms[1].y));
    ctx.drawImage(flyingPlatformImage, terrain.platforms[2].x, Math.floor(terrain.platforms[2].y));
    blue.render(ctx);
    red.render(ctx);
    projectiles.forEach(projectile => projectile.render(ctx));
    ctx.font = '20px Georgia';
    for (const powerupID in powerups) {
      if (Object.hasOwnProperty.call(powerups, powerupID)) {
        const powerup = powerups[powerupID];
        powerup.render(ctx);
      }
    }
  } else {
    ctx.drawImage(flyingPlatformImage, terrain.platforms[0].x, Math.floor(terrain.platforms[0].y));
    ctx.drawImage(flyingPlatformImage, terrain.platforms[1].x, Math.floor(terrain.platforms[1].y));
    ctx.drawImage(flyingPlatformImage, terrain.platforms[2].x, Math.floor(terrain.platforms[2].y));
    blue.render(ctx);
    red.render(ctx);
    projectiles.forEach(projectile => projectile.render(ctx));
    ctx.drawImage(terrainImage, 0, 0);
    ctx.drawImage(startScreen, 0, 0, 400, 400);
  }
  if (blue.score > 0) {
    ctx.fillStyle = 'blue';
    ctx.fillText(blue.score, 30, 30);
  }
  if (red.score > 0) {
    ctx.fillStyle = 'red';
    ctx.fillText(red.score, 360, 30);
  }
  particles.forEach(particle => particle.render(ctx));
  // </rendering code>
  visibleCtx.imageSmoothingEnabled = false;
  visibleCtx.drawImage(canvas, 0, 0, visibleCanvas.clientWidth, visibleCanvas.clientHeight);
}

function update() {
  blue.update();
  red.update();
  terrain.platforms[0].y += terrain.platforms[0].direction;
  if (terrain.platforms[0].y > 260 || terrain.platforms[0].y < 150) terrain.platforms[0].direction *= -1;
  terrain.platforms[1].y += terrain.platforms[1].direction;
  if (terrain.platforms[1].y > 260 || terrain.platforms[1].y < 150) terrain.platforms[1].direction *= -1;
  terrain.platforms[2].y += terrain.platforms[2].direction;
  if (terrain.platforms[2].y > 260 || terrain.platforms[2].y < 150) terrain.platforms[2].direction *= -1;
  for (const index in powerups) {
    if (Object.hasOwnProperty.call(powerups, index)) {
      const powerup = powerups[index];
      powerup.update();
    }
  }
  keysThisFrame = {};
  if (blue.score >= MAX_SCORE || red.score >= MAX_SCORE) {
    gameIsStarted = false;
  }
}

function resize() {
  let minDimension = Math.min(window.innerWidth, window.innerHeight);
  visibleCanvas.width = minDimension;
  visibleCanvas.height = minDimension;
  render();
}

function main() {
  if (gameIsStarted) {
    update();
  } else {
    if (blue.score >= MAX_SCORE || red.score >= MAX_SCORE) {
      let brightness = Math.random();
      let color = blue.score >= MAX_SCORE ? (red.score >= MAX_SCORE ? `rgb(${255 * brightness}, 0, ${255 * brightness})` : `rgb(0, 0, ${255 * brightness})`) : `rgb(${255 * brightness}, 0, 0)`;
      particleExplosion(200, 200, color, 100);
    }
  }
  projectiles.forEach(projectile => projectile.update());
  render();
  particles.forEach(particle => particle.update());
  projectiles = projectiles.filter(projectile => !projectile.dead);
  particles = particles.filter(particle => !particle.dead);
  requestAnimationFrame(main);
}

resize();
requestAnimationFrame(main);

addEventListener('resize', resize);

addEventListener('click', e => {
  if (!gameIsStarted) {
    gameIsStarted = true;
    red.score = 0;
    blue.score = 0;
    projectiles = [];
  }
});

addEventListener('keydown', e => {
  const key = e.key.toLowerCase();
  if (!keys[key]) keysThisFrame[key] = true;
  keys[key] = true;
});

addEventListener('keyup', e => {
  const key = e.key.toLowerCase();
  keys[key] = false;
});
