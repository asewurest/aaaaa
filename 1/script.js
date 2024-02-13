var $ = (sel) => document.querySelector(sel);
var Time = { deltaTime: 0 };
var BOUNCES = 0;
var MAX_SCORE = 25;
var players = 1;
var direction = 0;
var _time = 0;
var perturbation = false;
var dsX = 0, dsY = 0;
var distortion = 0;
const canvas = $('#draw'), ctx = canvas.getContext('2d');
var sz = (window.innerWidth < window.innerHeight ? window.innerWidth : window.innerHeight) - 10;
canvas.width = 400;
canvas.height = 400;
var canvas2 = $('#main'), theSecondContext = canvas2.getContext('2d');
canvas2.width = sz;
canvas2.height = sz;
var particles_on = true;
var WIDTH = 400, HEIGHT = 400;
var slopeMax = 5;
function distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

function circleCollision(x1, y1, radius1, x2, y2, radius2) {
    var dist = distance(x1, y1, x2, y2);
    if (dist < (radius1 + radius2)) return true;
    else return false;
}

function lineCollision(coord1, width1, coord2, width2) {
    return ((coord1 >= coord2 && coord1 <= coord2 + width2) || (coord2 >= coord1 && coord2 <= coord1 + width1));
}

function lookAt(x1, y1, x2, y2) {
    x2 -= x1;
    y2 -= y1;
    return Math.atan2(y2, x2);
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
function squareCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
    return (lineCollision(x1, w1, x2, w2) && lineCollision(y1, h1, y2, h2));
}
/** @type {{x: number, y: number, width: number, height: number, bonus: boolean}[]} */
var platforms = [
    { x: 170, y: 150, width: 60, height: 10, direction: 0.35 },
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
    { x: 40, y: HEIGHT - 110, width: 110, height: 10, bonus: true },
    { x: 250, y: HEIGHT - 110, width: 110, height: 10, bonus: true }
];
var platforms2 = platforms.filter(e => e.bonus);
/** @param {Player|Projectile} obj */
function isColliding(obj) {
    try {
        for (var i = 0; i < platforms.length; i++) {
            if (squareCollision(platforms[i].x, platforms[i].y, platforms[i].width, platforms[i].height, obj.x, obj.y, obj.w, obj.h)) {
                return platforms[i];
            }
        }
    } catch (e) { }
    return false;
}

var images = ['r-l-1', 'r-r-1', 'b-l-1', 'b-r-1', 'projectile-r', 'projectile-b', 'pow-r', 'pow-b', 'Terrain', 'b-rk-1', 'b-lk-1', 'r-rk-1', 'r-lk-1', 'startscreen', 'powerups/explosion', 'powerups/triple', 'powerups/flight', 'powerups/bounce', 'powerups/target', 'powerups/autoaim', 'powerups/invisible', 'powerups/fast', 'powerups/ananas', 'powerups/disintegrate', 'powerups/mine'];
/** @type {Object.<string, HTMLImageElement>} */
var imageTable = {};
/** @type {Projectile[]} */
var projectiles = [];
/** @type {Particle[]} */
var particles = [];
var hamster = false;
class Projectile {
    /**
     * @param {Player} owner
     * @param {number} x
     * @param {number} y
     * @param {number} ox
     * @param {number} oy
     */
    constructor(x, y, ox, oy, owner) {
        this.bounces = BOUNCES;
        this.x = x;
        this.y = y;
        this.w = 4;
        this.h = 4;
        this.dx = ox;
        this.dy = oy;
        this.heading = lookAt(0, 0, ox, oy);
        this.owner = owner;
        projectiles.push(this);
    }
    /**
     * @param {Player} red
     * @param {Player} blue
     */
    update(red, blue) {
        if (this.__d) return 'hit';
        this.x += this.dx;
        this.y += this.dy;
        if (this.x > WIDTH) this.x = 0;
        if (this.x < 0) this.x = WIDTH;
        if (this.y > HEIGHT) this.y = 0;
        if (this.y < 0) this.y = HEIGHT;
        if (this.specialUpdate) this.specialUpdate(this);
        var collider = null
        if (!this.disableCollision && (collider = isColliding({ x: this.x - 2, y: this.y - 2, w: this.w, h: this.h }))) {
            this.bounces--;
            this.dx = -this.dx;
            this.dy = -this.dy;
            this.heading = lookAt(0, 0, this.dx, this.dy);
            if (this.bounces <= 0) {
                this.oncollide && this.oncollide(this, collider);
                return 'hit';
            }
            else return 'none';
        }
        else if (squareCollision(this.x - 2, this.y - 2, this.w, this.h, red.x, red.y, red.w, red.h) && (!this.noSelf || (this.owner == blue))) {
            this.oncollide && this.oncollide(this);
            return 'red';
        }
        else if (squareCollision(this.x - 2, this.y - 2, this.w, this.h, blue.x, blue.y, blue.w, blue.h) && (!this.noSelf || (this.owner == red))) {
            this.oncollide && this.oncollide(this);
            return 'blue';
        } else {
            if (this.collideWithOthers) {
                for (var i = 0; i < projectiles.length; i++) {
                    if (projectiles[i] !== this && projectiles[i].owner !== this.owner && squareCollision(this.x - 2, this.y - 2, this.w, this.h, projectiles[i].x - 2, projectiles[i].y - 2, projectiles[i].w, projectiles[i].h)) {
                        projectiles[i].__d = true;
                        this.oncollide && this.oncollide(this);
                        return 'hit';
                    }
                }
            }
        }
        return 'none';
    }
    /** @param {!CanvasRenderingContext2D} ctx */
    draw(ctx) {
        if (this.invisible) return;
        ctx.save();
        ctx.translate(Math.floor(this.x), Math.floor(this.y));
        ctx.rotate(this.heading);
        ctx.drawImage(imageTable['projectile-' + this.owner.color], -2, -2);
        ctx.restore();
    }
}
class Particle {
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} mx - X Movement
     * @param {number} my - Y Movement
     * @param {[number, number, number, number]} color - Color of the particle
     * @param {number} lifetime
     */
    constructor(x, y, mx, my, color, lifetime) {
        this.x = x;
        this.mx = mx;
        this.y = y;
        this.my = my;
        this.color = color;
        this.lifetime = lifetime;
    }
    update() {
        this._update && this._update();
        this.x += this.mx;
        this.y += this.my;
        if (this.x > WIDTH) this.x = 0;
        if (this.x < 0) this.x = WIDTH;
        if (this.y > HEIGHT) this.y = 0;
        if (this.y < 0) this.y = HEIGHT;
        this.lifetime--;
        if (this.lifetime < 0) return true;
        return false;
    }
    draw(ctx) {
        ctx.fillStyle = `rgba(${this.color[0]},${this.color[1]},${this.color[2]},${this.color[3] || 1})`;
        ctx.fillRect(Math.floor(this.x - 2), Math.floor(this.y - 2), 4, 4);
    }
}
class Effect {
    /** @param {function(Player, boolean, boolean, boolean, boolean)} efn - Effect of the effect.
     * @param {number} duration
     * @param {{shoot: boolean, shots: number, fn: function(Player)}} options
     */
    constructor(name, efn, duration, options) {
        this.name = name;
        this.duration = duration;
        this.effect = efn;
        if (options && options.shoot) {
            this.bang = true;
            this.shots = options.shots || 10;
            this.fn = options.fn || (player => {
                new Projectile(player.x + (
                    player.lastDirection == 'left' ? (-6) : (14)
                ), player.y + 8, keys[(player.color == 'r' ? 'up' : 'w')] ? 0 : (player.lastDirection == 'left' ? -3.5 : 3.5), (keys[(player.color == 'r' ? 'up' : 'w')] * -3.5), player);
            });
        }
    }
}
var effects = {
    flight: new Effect('flight', (player, up, down, left, right, self) => {
        if (up) player.fy -= 0.4; else self.special_timeout++;
    }, 600),
    bang: new Effect('', (player, up, down, left, right) => {
        var isBlue = player == blue;
        var other = isBlue ? red : blue;
        var direction = lookAt(player.x + player.w / 2, player.y + player.h / 2, other.x + other.w / 2, other.y + other.h / 2);
        if (Math.random() < 0.05) {
            var p = new Projectile(player.x + Math.cos(direction) * 10, player.y + Math.sin(direction) * 10, Math.cos(direction) * 3.5, Math.sin(direction) * 3.5, player);
            p.noSelf = true;
        }
    }, 500),
    autoaim: new Effect('', () => { }, Infinity, {
        shoot: true,
        shots: 10,
        fn: (player) => {
            var isBlue = player == blue;
            var other = isBlue ? red : blue;
            var direction = lookAt(player.x + player.w / 2, player.y + player.h / 2, other.x + other.w / 2, other.y + other.h / 2) + (Math.random() - 0.5) * Math.PI / 10;
            var p = new Projectile(player.x + Math.cos(direction) * 10, player.y + Math.sin(direction) * 10, Math.cos(direction) * 3.5, Math.sin(direction) * 3.5, player);
            p.noSelf = true;
        }
    }),
    multiple: new Effect('', () => { }, Infinity, {
        shoot: true,
        shots: 10,
        fn: (player => {
            var p = new Projectile(player.x + (
                player.lastDirection == 'left' ? (-6) : (14)
            ), player.y + 8, keys[(player.color == 'r' ? 'up' : 'w')] ? 0 : (player.lastDirection == 'left' ? -3.5 : 3.5), (keys[(player.color == 'r' ? 'up' : 'w')] * -3.5), player);
            p.oncollide = (projectile) => {
                [new Projectile(projectile.x + projectile.dx, projectile.y + projectile.dy, -3.5, 0, projectile.owner),
                new Projectile(projectile.x + projectile.dx, projectile.y + projectile.dy, 3.5, 0, projectile.owner),
                new Projectile(projectile.x + projectile.dx, projectile.y + projectile.dy, 0, -3.5, projectile.owner),
                new Projectile(projectile.x + projectile.dx, projectile.y + projectile.dy, 0, 3.5, projectile.owner),
                new Projectile(projectile.x + projectile.dx, projectile.y + projectile.dy, -3.5, -3.5, projectile.owner),
                new Projectile(projectile.x + projectile.dx, projectile.y + projectile.dy, 3.5, 3.5, projectile.owner),
                new Projectile(projectile.x + projectile.dx, projectile.y + projectile.dy, 3.5, -3.5, projectile.owner),
                new Projectile(projectile.x + projectile.dx, projectile.y + projectile.dy, -3.5, 3.5, projectile.owner)].map(p => p.noSelf = true);
            };
        })
    }),
    disintegrate: new Effect('', () => { }, Infinity, {
        shoot: true,
        shots: 2,
        fn: (player => {
            var p = new Projectile(player.x + (
                player.lastDirection == 'left' ? (-6) : (14)
            ), player.y + 8, keys[(player.color == 'r' ? 'up' : 'w')] ? 0 : (player.lastDirection == 'left' ? -3.5 : 3.5), (keys[(player.color == 'r' ? 'up' : 'w')] * -3.5), player);
            p.specialUpdate = _ => {
                if (Math.random() < 0.4) {
                    if (p.dx != 0) {
                        new Projectile(p.x, p.y, 0, 4, p.owner).noSelf = true;
                        new Projectile(p.x, p.y, 0, -4, p.owner).noSelf = true;
                    } else {
                        new Projectile(p.x, p.y, 4, 0, p.owner).noSelf = true;
                        new Projectile(p.x, p.y, -4, 0, p.owner).noSelf = true;
                    }
                }


            };
            // p.oncollide = (projectile, platform) => {

            // if (platform == platforms[0]) return;
            // platforms.splice(platforms.indexOf(platform), 1);
            // setTimeout(() => {
            //   platforms.push(platform);
            // }, 5000);
            // };
        })
    }),
    shield: new Effect('', () => { }, Infinity, {
        shoot: true,
        shots: 1,
        fn: (player => {
            let _p = new Projectile(player.x, player.y, 0, 0, player);
            _p.noSelf = true;
            player.hasShield = true;
            _p.specialUpdate = _ => {
                _p.x = 0;
                _p.y = 0;
                let number = 16;
                for (let i = 0; i < number; i++) {
                    let n = 0;
                    let p = new Projectile(player.x + (
                        player.lastDirection == 'left' ? (-6) : (14)
                    ), player.y + 8, 0, 0, player);
                    const period = 2000;
                    let start = (i / number) + (Date.now() % period) / period;
                    p.noSelf = true;
                    p.collideWithOthers = true;
                    p.specialUpdate = _ => {
                        n++;
                        let orientation = (((Date.now() % period) / period) + start) * Math.PI * 2;
                        p.x = p.owner.x + 4 + Math.cos(orientation) * 20;
                        p.y = p.owner.y + 10 + Math.sin(orientation) * 20;
                        p.heading = lookAt(p.x, p.y, p.owner.x + 4, p.owner.y + 10) + Math.PI;
                        if (n > 800) {
                            player.hasShield = false;
                            p.dx = Math.cos(p.heading) * 3.5;
                            p.dy = Math.sin(p.heading) * 3.5;
                            p.specialUpdate = _ => {
                                bang(p.x, p.y, [p.owner == red ? 100 : 0, 0, p.owner == red ? 0 : 100, 0.7], 5);
                                particles.slice(particles.length - 8).forEach(particle => {
                                    particle._update = _ => {
                                        particle.color[0] *= 1.1;
                                        particle.color[2] *= 1.1;
                                    };
                                });
                            };
                            p.disableCollision = false;
                            // setTimeout(() => { p.disableCollision = false; }, 10000)
                        }
                    };
                    p.disableCollision = true;
                }
            }
        })
    }),
    block: new Effect('shield', () => { }, Infinity, {
        shoot: true,
        shots: 10,
        fn: (player => {
            let _p = new Projectile(player.x + (
                player.lastDirection == 'left' ? (-6) : (14)
            ), player.y + 8, keys[(player.color == 'r' ? 'up' : 'w')] ? 0 : (player.lastDirection == 'left' ? -3.5 : 3.5), (keys[(player.color == 'r' ? 'up' : 'w')] * -3.5), player);
            _p.noSelf = true;
            _p.specialUpdate = _ => {
                _p.specialUpdate = null;
                ///_p.x = 0;
                ///_p.y = 0;
                let number = 16;
                for (let i = 0; i < number; i++) {
                    let n = 0;
                    let p = new Projectile(player.x + (
                        player.lastDirection == 'left' ? (-6) : (14)
                    ), player.y + 8, 0, 0, player);
                    const period = 2000;
                    let start = (i / number) + (Date.now() % period) / period;
                    p.noSelf = true;
                    p.collideWithOthers = true;
                    p.specialUpdate = _ => {
                        n++;
                        let orientation = (((Date.now() % period) / period) + start) * Math.PI * 2;
                        p.x = _p.x + Math.cos(orientation) * 5;
                        p.y = _p.y + Math.sin(orientation) * 5;
                        p.heading = lookAt(p.x, p.y, _p.x, _p.y) + Math.PI;
                        if (n > 400) {
                            p.dx = Math.cos(p.heading) * 3.5;
                            p.dy = Math.sin(p.heading) * 3.5;
                            p.specialUpdate = _ => {
                                bang(p.x, p.y, [p.owner == red ? 100 : 0, 0, p.owner == red ? 0 : 100, 0.7], 5);
                                particles.slice(particles.length - 8).forEach(particle => {
                                    particle._update = _ => {
                                        particle.color[0] *= 1.1;
                                        particle.color[2] *= 1.1;
                                    };
                                });
                            };
                            p.disableCollision = false;
                            // setTimeout(() => { p.disableCollision = false; }, 10000)
                        }
                    };
                    p.disableCollision = true;
                }
            }
        })
    }),
    explosion: new Effect('', () => { }, Infinity, {
        shoot: true,
        shots: 2,
        fn: (player => {
            var projectile = player;
            player.owner = player;
            [new Projectile(projectile.x, projectile.y, -3.5, 0, projectile.owner),
            new Projectile(projectile.x, projectile.y, 3.5, 0, projectile.owner),
            new Projectile(projectile.x, projectile.y, 0, -3.5, projectile.owner),
            new Projectile(projectile.x, projectile.y, 0, 3.5, projectile.owner),
            new Projectile(projectile.x, projectile.y, -3.5, -3.5, projectile.owner),
            new Projectile(projectile.x, projectile.y, 3.5, 3.5, projectile.owner),
            new Projectile(projectile.x, projectile.y, 3.5, -3.5, projectile.owner),
            new Projectile(projectile.x, projectile.y, -3.5, 3.5, projectile.owner)].map(p => {
                p.noSelf = true;
                p.oncollide = (projectile) => {
                    [new Projectile(projectile.x + projectile.dx, projectile.y + projectile.dy, -3.5, 0, projectile.owner),
                    new Projectile(projectile.x + projectile.dx, projectile.y + projectile.dy, 3.5, 0, projectile.owner),
                    new Projectile(projectile.x + projectile.dx, projectile.y + projectile.dy, 0, -3.5, projectile.owner),
                    new Projectile(projectile.x + projectile.dx, projectile.y + projectile.dy, 0, 3.5, projectile.owner),
                    new Projectile(projectile.x + projectile.dx, projectile.y + projectile.dy, -3.5, -3.5, projectile.owner),
                    new Projectile(projectile.x + projectile.dx, projectile.y + projectile.dy, 3.5, 3.5, projectile.owner),
                    new Projectile(projectile.x + projectile.dx, projectile.y + projectile.dy, 3.5, -3.5, projectile.owner),
                    new Projectile(projectile.x + projectile.dx, projectile.y + projectile.dy, -3.5, 3.5, projectile.owner)].map(p => p.noSelf = true);
                };
            })
        })
    }),
    triplestrike: new Effect('', () => { }, Infinity, {
        shoot: true,
        shots: 10,
        fn: (player => {
            new Projectile(player.x + (
                player.lastDirection == 'left' ? (-6) : (14)
            ), player.y + 8, keys[(player.color == 'r' ? 'up' : 'w')] ? 0 : (player.lastDirection == 'left' ? -3.5 : 3.5), (keys[(player.color == 'r' ? 'up' : 'w')] * -3.5), player);
            new Projectile(player.x + (
                player.lastDirection == 'left' ? (-6) : (14)
            ), player.y + 13, keys[(player.color == 'r' ? 'up' : 'w')] ? 0 : (player.lastDirection == 'left' ? -3.5 : 3.5), (keys[(player.color == 'r' ? 'up' : 'w')] * -3.5), player);
            new Projectile(player.x + (
                player.lastDirection == 'left' ? (-6) : (14)
            ), player.y + 3, keys[(player.color == 'r' ? 'up' : 'w')] ? 0 : (player.lastDirection == 'left' ? -3.5 : 3.5), (keys[(player.color == 'r' ? 'up' : 'w')] * -3.5), player);
        })
    }),
    invisible: new Effect('', () => { }, Infinity, {
        shoot: true,
        shots: 5,
        fn: (player => {
            new Projectile(player.x + (
                player.lastDirection == 'left' ? (-6) : (14)
            ), player.y + 8, keys[(player.color == 'r' ? 'up' : 'w')] ? 0 : (player.lastDirection == 'left' ? -5 : 5), (keys[(player.color == 'r' ? 'up' : 'w')] * -5), player).invisible = true;
        })
    }),
    fast: new Effect('', () => { }, Infinity, {
        shoot: true,
        shots: 10,
        fn: (player => {
            new Projectile(player.x + (
                player.lastDirection == 'left' ? (-6) : (14)
            ), player.y + 8, keys[(player.color == 'r' ? 'up' : 'w')] ? 0 : (player.lastDirection == 'left' ? -7 : 7), (keys[(player.color == 'r' ? 'up' : 'w')] * -7), player).noSelf = true;
            new Projectile(player.x + (
                player.lastDirection == 'left' ? (-6) : (14)
            ), player.y + 8, keys[(player.color == 'r' ? 'up' : 'w')] ? 0 : (player.lastDirection == 'left' ? -5 : 5), (keys[(player.color == 'r' ? 'up' : 'w')] * -5), player).noSelf = true;
            new Projectile(player.x + (
                player.lastDirection == 'left' ? (-6) : (14)
            ), player.y + 8, keys[(player.color == 'r' ? 'up' : 'w')] ? 0 : (player.lastDirection == 'left' ? -3.5 : 3.5), (keys[(player.color == 'r' ? 'up' : 'w')] * -3.5), player).noSelf = true;
        })
    }),
    magic: new Effect('', () => { }, Infinity, {
        shoot: true,
        shots: 5,
        fn: (player => {
            var target = player == blue ? red : blue;
            var projectile = new Projectile(player.x + (
                player.lastDirection == 'left' ? (-6) : (14)
            ), player.y + 8, keys[(player.color == 'r' ? 'up' : 'w')] ? 0 : (player.lastDirection == 'left' ? -3.5 : 3.5), (keys[(player.color == 'r' ? 'up' : 'w')] * -3.5), player);
            projectile.noSelf = true;
            projectile.specialUpdate = _ => {
                projectile.heading = lookAt(projectile.x, projectile.y, target.x, target.y);
                projectile.dx = Math.cos(projectile.heading) * 3.5;
                projectile.dy = Math.sin(projectile.heading) * 3.5;
            };
        })
    })
}
class Player {
    constructor(x, y, name) {
        this.x = x;
        this.y = y;
        this.w = 8;
        this.h = 20;
        this.name = name;
        this.fx = 0;
        this.fy = 0;
        this.onGround = false;
        this.lastDirection = "left";
        this.color = name.startsWith('R') ? 'r' : 'b';
        this.score = 0;
        /** @type {?Effect} */
        this.special = null;
        this.special_timeout = 0;
        this.effect_color = 'green';
    }
    update(u, d, l, r) {
        this.xForce = l ? -4 : 4;
        this.special_timeout--;
        if (this.special_timeout <= 0) {
            if (this.onend && this.special) this.onend();
            this.special = null;
        }
        if (this.special && !this.special.name == 'flight') this.special.effect(this, u, d, l, r, this);
        var lateralContact = false;
        this.onGround = false;
        this.x += this.fx;
        if (isColliding(this)) {

            let originalPosition = this.y;
            var slope = 0;
            while (slope < slopeMax && isColliding(this)) {
                this.y--;
                slope++;
            }
            if (slope++ >= slopeMax) {
                this.y = originalPosition;
            }
        }
        this.x -= this.fx;
        if (this.fx != 0) {
            this.x += this.fx;
            if (this.fx > 0) {
                while (isColliding(this)) {
                    this.x -= 1;
                    this.fx = 0;
                    this.fy = 0;
                    this.onGround = "right";
                    lateralContact = true;
                }
            } else {
                while (isColliding(this)) {
                    this.x += 1;
                    this.fx = 0;
                    this.fy = 0;
                    this.onGround = "left";
                    lateralContact = true;
                }
            }
        }
        if (this.fy != 0) {
            this.y += this.fy;
            if (this.fy < 0) {
                while (isColliding(this)) {
                    this.y++;
                    this.fy = 0;
                    this.onGround = lateralContact ? this.onGround : "top"
                }
            } else {
                while (isColliding(this)) {
                    this.y--;
                    this.fy = 0;
                    this.onGround = lateralContact ? this.onGround : "ground"
                }
            }
        }
        if (!this.onGround) {
            this.fy += 0.2;
        }
        this.fy *= 0.9;
        this.fx *= 0.7;
        if (l) {
            this.lastDirection = "left";
            this.fx -= 1;
        }
        if (r) {
            this.lastDirection = "right";
            this.fx += 1;
        }
        if (u && this.onGround && (this.onGround != "top") && !d) {
            this.fy -= 7;
        }
        if (this.special && this.special.name == 'flight') this.special.effect(this, u, d, l, r, this);
        if (this.x > WIDTH) this.x = 0;
        if (this.x < 0) this.x = WIDTH;
        if (this.y > HEIGHT) this.y = 0;
        if (this.y < 0) this.y = HEIGHT;
    }
    /** @param {!CanvasRenderingContext2D} ctx */
    draw(ctx) {
        var image = imageTable[`${this.color}-${this.lastDirection[0] + ((this.onGround == 'left' || this.onGround == 'right') ? 'k' : '')}-1`];
        ctx.drawImage(image, Math.round(this.x), Math.round(this.y));
        ctx.drawImage(image, Math.round(this.x) - 400, Math.round(this.y));
        ctx.drawImage(image, Math.round(this.x), Math.round(this.y) - 400);
        ctx.drawImage(image, Math.round(this.x) + 400, Math.round(this.y));
        ctx.drawImage(image, Math.round(this.x), Math.round(this.y) + 400);
        if (this.special) {
            ctx.fillStyle = this.effect_color;
            var s = this.special_timeout;
            this.special_timeout = this.onshoot ? this.duration2 : s;
            ctx.fillRect(Math.floor(this.x), Math.floor(this.y - 4), Math.floor((this.special_timeout / this.special_timeout_original) * this.w), 2);
            ctx.fillStyle = 'red';
            ctx.fillRect(Math.floor(this.x) + Math.floor((this.special_timeout / this.special_timeout_original) * this.w), Math.floor(this.y - 4), this.w - Math.floor((this.special_timeout / this.special_timeout_original) * this.w), 2);
            this.special_timeout = s;
        }
    }
    /** @param {!Effect} e */
    setEffect(e, onend) {
        if (this.special && this.onend) this.onend();
        this.onend = null;
        this.special = e;
        this.special_timeout = e.duration;
        this.special_timeout_original = e.bang ? e.shots : e.duration;
        var _this = this;
        this.duration2 = e.bang ? e.shots : 0;
        this.onshoot = e.bang ? (player) => {
            _this.duration2--;
            if (_this.duration2 <= 0) {
                if (_this.onend && _this.special) _this.onend();
                _this.onend = null;
                _this.special = null;
                _this.onshoot = null;
            }
            e.fn(player);
        } : null;
        this.onend = onend;
    }
}
/** @type {{x: number, y: number, effect: Effect, color: string}[]} */
var balls = [
    {
        x: 200,
        y: 200,
        effect: effects.flight,
        color: 'purple',
        image: 'flight'
    },
    { x: 200, y: 300, effect: effects.autoaim, color: 'green', image: 'autoaim' },
    { x: 200, y: 170, effect: effects.multiple, color: 'yellow', image: 'bounce' },
    { x: 200, y: 390, effect: effects.triplestrike, color: 'grey', image: 'triple' },
    { x: 200, y: 250, effect: effects.magic, color: 'orange', image: 'target' },
    { x: 200, y: 100, effect: effects.explosion, color: 'pink', image: 'explosion' },
    { x: 200, y: 50, effect: effects.invisible, color: 'black', image: 'invisible' },
    { x: 200, y: 350, effect: effects.fast, color: 'turquoise', image: 'fast' },
    { x: 200, y: 0, effect: effects.disintegrate, color: 'brown', image: 'ananas' },
    { x: 200, y: 200, effect: effects.shield, color: 'blue', image: 'disintegrate' },
    { x: 250, y: 200, effect: effects.block, color: 'gold', image: 'mine' }
];
/** @param {{x: number, y: number, effect: Effect, color: string}} ball
 * @param {!CanvasRenderingContext2D} ctx
 */
function drawBall(ball, ctx) {
    if (ball.image) {
        ctx.drawImage(imageTable[`powerups/${ball.image}`], ball.x - 6, ball.y - 6);
    } else {
        ctx.fillStyle = ball.color;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}
var blue = new Player(20, 40, 'Bleu'), red = new Player(WIDTH - 28, 40, 'Rouge');
let shootTime = 0;
let automationData = {
    ['lastTimeSinceUp']: 0,
    [blue.name + 'lastTimeSinceUp']: 0
};
function simulateKeyup(keyId) {
    dispatchEvent(new KeyboardEvent('keyup', { key: keyId }));
}
function simulateKeydown(keyId, who) {
    dispatchEvent(new KeyboardEvent('keydown', { key: keyId }));
    if (keyId == 'arrowup' || keyId == 'w') {
        automationData['lastTimeSinceUp'] = 0;
    }
}
function simulateKeypress(keyId, who) {
    simulateKeydown(keyId, who);
    simulateKeyup(keyId);
}
function automation(who) {
  let red = who;
  let blue = (who == window.red) ? window.blue : window.red;
  let [arrowdown, arrowup, arrowleft, arrowright] = who == window.red ? ['arrowdown', 'arrowup', 'arrowleft', 'arrowright'] : ['s','w','l','r'];
  // simulateKeypress(arrowdown);
  if (window.climbing) {
        simulateKeydown(arrowup);
        simulateKeyup(window.climbing == arrowleft ? arrowright : arrowleft);
    
    if (!window.delay) window.delay = 1;
    window.delay++;
    if (window.delay > 19) {
      if (window.delay >= 24 && isColliding({x: red.x + (window.climbing == arrowright ? 4 : -4), y: red.y, w: red.w, h: red.h})) {
        window.delay = 0;
        simulateKeyup(window.climbing);
        simulateKeyup(window.climbing);simulateKeypress(window.climbing == arrowleft ? arrowright : arrowleft);simulateKeypress(arrowdown);
        return;
      } else
        simulateKeydown(window.climbing);
    }
    if (isColliding({x: red.x, y: red.y - 5, w: red.w, h: red.h}) || blue.y - 5 > red.y) window.climbing = false;
    return;
  }
  if (blue.y + 10 < red.y) {
    window.climbing = blue.x > red.x ? arrowright: arrowleft;
    [arrowleft, arrowright, arrowup].forEach(key => simulateKeyup(key));
    }
    if (shootTime++ >= 30) {
        shootTime = 0;
        simulateKeypress(who == red ? arrowdown : 's', who);
    }
    if (!keys.up && red.special && red.special.name == 'flight') {
        simulateKeydown(arrowup);
    } else if (keys.up && !(red.special && red.special.name == 'flight') && automationData.lastTimeSinceUp++ > 0) {
        simulateKeyup(arrowup);
    }
    balls.forEach(ball => {
        if (squareCollision(red.x, red.y - 10, red.w, red.h, ball.x, ball.y, 4, 4)) {
            simulateKeydown(arrowup);
        }
    });
    projectiles.forEach(projectile => {
        if (projectile.owner != red && Math.abs(red.x - projectile.x) > Math.abs(red.x - (projectile.x + projectile.dx)) && squareCollision(red.x, red.y, red.w, red.h, projectile.x + projectile.dx * 7, projectile.y + projectile.dy, 4, 4)) {
            simulateKeydown(arrowup);
        }
    });
    if (squareCollision(blue.x, blue.y, blue.w, blue.h, red.x - 4, red.y - 4, red.w + 8, red.h + 8)) {
        if (!squareCollision(blue.x, blue.y, blue.w, blue.h, red.x - 4, red.y - 4, red.w + 8, red.h + 8)) {
            let direction = blue.x > red.x ? 1 : -1;
            if (direction == 1) {
                simulateKeydown(arrowright);
                simulateKeyup(arrowleft);
            } else {
                simulateKeydown(arrowleft);
                simulateKeyup(arrowright);
            }
            simulateKeypress(arrowdown);
        } else {
            let direction = blue.x > red.x ? -1 : 1;
            if (direction == 1) {
                simulateKeydown(arrowright);
                simulateKeyup(arrowleft);
            } else {
                simulateKeydown(arrowleft);
                simulateKeyup(arrowright);
            }
        }
    } else {
        if ((blue.y - 2 > red.y) && isColliding({ x: red.x, y: red.y + 5, w: red.w, h: red.h })) {
            let shortestDirection = 1;
            for (let d = 2; d < 80; d += 2) {
                if (!isColliding({ x: red.x - d, y: red.y + 5, w: red.w, h: red.h }) && red.x >= 0) {
                    shortestDirection = -1;
                    break;
                } else if (!isColliding({ x: red.x + d, y: red.y + 5, w: red.w, h: red.h }) && red.x + red.w <= WIDTH) {
                    shortestDirection = 1;
                    break;
                }
            }
            if (shortestDirection == 1) {
                simulateKeydown(arrowright);
                simulateKeyup(arrowleft);
            } else {
                simulateKeydown(arrowleft);
                simulateKeyup(arrowright);
            }
        } else {
            if (Math.abs(red.x - blue.x) > 10) {
                if ((blue.hasShield && distance(red.x + red.w / 2, red.y + red.h / 2, blue.x + blue.w / 2, blue.y + blue.h / 2) < 70 && (simulateKeypress(arrowdown) || true)) ? (red.x > blue.x) : (blue.x > red.x)) {
                    if (keys.left) {
                        simulateKeyup(arrowleft);
                    }
                    if (!isColliding({ x: red.x + 5, y: red.y, w: red.w, h: red.h }))
                        simulateKeydown(arrowright);
                    else
                        simulateKeyup(arrowright);
                } else {
                    if (keys.right) {
                        simulateKeyup(arrowright);
                    }
                    if (!isColliding({ x: red.x - 5, y: red.y, w: red.w, h: red.h }))
                        simulateKeydown(arrowleft);
                    else
                        simulateKeyup(arrowleft);
                }
            } else {
                simulateKeyup(arrowleft);
                simulateKeyup(arrowright);
            }
        }
    }
}
var keyTable = {
    87: 'w',
    83: 's',
    65: 'a',
    68: 'd',
    38: 'up',
    40: 'down',
    37: 'left',
    39: 'right',
    'w': 'w',
    's': 's',
    'a': 'a',
    'd': 'd',
    'arrowup': 'up',
    'arrowdown': 'down',
    'arrowleft': 'left',
    'arrowright': 'right',
}, keys = { w: false, up: false };
addEventListener('keydown', e => {
    if (e.key.toLowerCase() == 'x') perturbation = !perturbation;
    if (!stopped) {
        switch (keyTable[e.key.toLowerCase()]) {
            case 's':
                if (!keys.s) {
                    if (!blue.onshoot)
                        new Projectile(blue.x + (
                            blue.lastDirection == 'left' ? (-6) : (14)
                        ), blue.y + 8, keys['w'] ? 0 : (blue.lastDirection == 'left' ? -3.5 : 3.5), (keys['w'] * -3.5), blue);
                    else
                        blue.onshoot(blue);
                }
                break;
            case 'down':
                if (!keys.down) {
                    if (!red.onshoot)
                        new Projectile(red.x + (
                            red.lastDirection == 'left' ? (-6) : (14)
                        ), red.y + 8, keys['up'] ? 0 : (red.lastDirection == 'left' ? -3.5 : 3.5), (keys['up'] * -3.5), red);
                    else red.onshoot(red);
                }
                break;
        }
    }
    keys[keyTable[e.key.toLowerCase()]] = true;
});
addEventListener('keyup', e => {
    keys[keyTable[e.key.toLowerCase()]] = false;
});
canvas2.addEventListener('click', function () {
    if (!stopped) return;
    projectiles = [];
    blue.onend && blue.onend();
    red.onend && red.onend();
    blue = new Player(20, 40, 'Bleu'), red = new Player(WIDTH - 28, 40, 'Rouge');
    stopped = false;
});
function bang(x, y, c, d) {
    for (var deg = 0; deg < Math.PI * 2; deg += (Math.PI / 4)) {
        particles.push(new Particle(x, y, Math.cos(deg) * 1.5, Math.sin(deg) * 1.5, c, d));
    }
}
var stopped = false;
var filter = 20, frameTime = 0, lastFrame = Date.now(), thisFrame;
function render() {
    if (players < 2) automation(red);
    if (players == 0) automation(blue);
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    theSecondContext.clearRect(0, 0, sz, sz);
    ctx.drawImage(imageTable['Terrain'], 0, 0);
    ctx.fillStyle = 'grey';
    ctx.strokeStyle = '#333';
    ctx.fillRect(Math.floor(platforms[0].x), Math.floor(platforms[0].y), platforms[0].width, platforms[0].height);
    ctx.strokeRect(Math.floor(platforms[0].x), Math.floor(platforms[0].y), platforms[0].width, platforms[0].height);
    ctx.fillStyle = '#00be00';
    ctx.fillRect(Math.floor(platforms[0].x) + 1, Math.floor(platforms[0].y) - 1, platforms[0].width - 2, 1);
    if (!stopped) {
        blue.update(keys.w, keys.s, keys.a, keys.d);
        red.update(keys.up, keys.down, keys.left, keys.right);
    }
    blue.draw(ctx);
    red.draw(ctx);
    for (var i = 0; i < projectiles.length; i++) {
        var result = projectiles[i].update(red, blue);
        projectiles[i].draw(ctx);
        if (result == 'red') {
            //red.x = WIDTH - 28;
            //red.y = 40;
            do {
                red.x = Math.floor(Math.random() * (WIDTH - red.w));
                red.y = Math.floor(Math.random() * (HEIGHT - red.h));
            } while (isColliding(red));
            if (projectiles[i].owner == blue) blue.score++; else if (!projectiles[i].noSelf && false) red.score--;
            ctx.drawImage(imageTable['pow-r'], projectiles[i].x - 12, projectiles[i].y - 10, 32, 32);
        } else if (result == 'blue') {
            //blue.x = 20;
            //blue.y = 40;
            do {
                blue.x = Math.floor(Math.random() * (WIDTH - blue.w));
                blue.y = Math.floor(Math.random() * (HEIGHT - blue.h));
            } while (isColliding(blue));
            if (projectiles[i].owner == red) red.score++; else if (!projectiles[i].noSelf && false) blue.score--;
            ctx.drawImage(imageTable['pow-b'], projectiles[i].x - 12, projectiles[i].y - 10, 32, 32);
        }
        if (result != 'none') {
            if (particles_on) bang(projectiles[i].x, projectiles[i].y, projectiles[i].owner.color == 'r' ? [255, 0, 0, 1] : [0, 0, 255, 1], 10);
            projectiles.splice(i, 1);
            i--;
        }
    }


    for (var i = 0; i < particles.length; i++) {
        if (particles[i].update()) {
            particles.splice(i, 1);
            i--;
            continue;
        } else {
            particles[i].draw(ctx);
        }
    }
    for (var i = 0; i < balls.length; i++) {
        let b = balls[i];
        drawBall(b, ctx);
        for (var p of [blue, red]) {
            if (squareCollision(p.x, p.y, p.w, p.h, b.x - 4, b.y - 4, 8, 8)) {
                p.setEffect(b.effect, () => {
                    var platf = platforms2[Math.floor(Math.random() * platforms2.length)];
                    var x = platf.x + Math.floor(Math.random() * platf.width);
                    var y = platf.y - 30;
                    setTimeout(() => {
                        balls.push({
                            effect: b.effect,
                            x: x,
                            y: y,
                            color: b.color,
                            image: b.image
                        });
                    }, Math.random() * 4.5e4);
                });
                p.effect_color = b.color;
                balls.splice(i, 1);
                i--;

            }
        }
    }
    platforms[0].y += platforms[0].direction;
    if (platforms[0].y > 240 || platforms[0].y < 150) {
        platforms[0].direction *= -1;
    }
    ctx.fillStyle = 'blue';
    ctx.fillText(blue.score, 25, 25);
    ctx.fillStyle = 'red';
    ctx.fillText(red.score, WIDTH - 25, 25);
    if ((red.score >= MAX_SCORE || blue.score >= MAX_SCORE)) {
        if (red.score >= MAX_SCORE && blue.score >= MAX_SCORE) {
            let c;
            bang(200, 200, [c = Math.min(255 * Math.random() * 2, 255), 0, c, 1], 100);
        } else {
            bang(200, 200, red.score > blue.score ? [Math.min(255 * Math.random() * 2, 255), 0, 0, 1] : [0, 0, Math.min(255 * Math.random() * 2, 255), 1], 100);
        }
        stopped = true;
        ctx.fillStyle = 'green';
        ctx.font = '40px Georgia';
        ctx.fillText('↻', 200, 380);
        ctx.font = '20px Georgia';
    }
    if (!perturbation) {
        theSecondContext.save();
        if (window.rotate90) { theSecondContext.rotate(direction); }
        // theSecondContext.drawImage(canvas, 0, 0, distortion, HEIGHT, (1.0 - (distortion / WIDTH)) * sz, 0, (distortion / WIDTH) * sz, sz);
        // theSecondContext.drawImage(canvas, distortion, 0, WIDTH - distortion, HEIGHT, 0, 0, (1.0 - (distortion / WIDTH)) * sz, sz);
        theSecondContext.drawImage(canvas, 0, 0, WIDTH, HEIGHT, 0, 0, sz, sz);
        theSecondContext.restore();
    } else {

        let tsctx = theSecondContext, simg = canvas;
        tsctx.drawImage(simg, dsX, dsY, WIDTH - dsX, HEIGHT - dsY, 0, 0, (WIDTH - dsX) / WIDTH * sz, (HEIGHT - dsY) / HEIGHT * sz); // Top Left
        tsctx.drawImage(simg,
            dsX,                      // Source X
            0,                        // Source Y
            WIDTH - dsX,                // Source Largeur
            dsY,                      // Source Hauteur
            0,                        // Destination X
            (HEIGHT - dsY) / HEIGHT * sz,          // Destination Y
            (WIDTH - dsX) / WIDTH * sz, // Destination Largeur
            (dsY) / HEIGHT * sz         // Destination Hauteur
        ); // Bottom Left
        tsctx.drawImage(simg,
            0,                      // Source X
            dsY,                        // Source Y
            dsX,                // Source Largeur
            HEIGHT - dsY,                      // Source Hauteur
            (WIDTH - dsX) / WIDTH * sz,                        // Destination X
            0,          // Destination Y
            dsX / WIDTH * sz, // Destination Largeur
            (HEIGHT - dsY) / HEIGHT * sz         // Destination Hauteur
        ); // Top Right
        tsctx.drawImage(simg,
            0,                      // Source X
            0,                        // Source Y
            dsX,                // Source Largeur
            dsY,                      // Source Hauteur
            (WIDTH - dsX) / WIDTH * sz,                        // Destination X
            (HEIGHT - dsY) / HEIGHT * sz,          // Destination Y
            dsX / WIDTH * sz, // Destination Largeur
            dsY / HEIGHT * sz         // Destination Hauteur
        ); // Bottom Right

    }
    if (perturbation) {
        _time--;
        if (_time <= 0) {
            _time = 500;
            direction = Math.random() * Math.PI * 2;
            dsX = Math.floor(dsX);
            dsY = Math.floor(dsY);
        }
        dsX += Math.sin(direction);
        if (dsX <= 0) dsX += 400;
        dsX %= 400;
        dsY += Math.cos(direction);
        if (dsY <= 0) dsY += 400;
        dsY %= 400;
    }
    var thisFrameTime = (thisFrame = Date.now()) - lastFrame;
    frameTime += (thisFrameTime - frameTime) / filter;
    lastFrame = thisFrame;
    Time.deltaTime = frameTime;
    requestAnimationFrame(render);
}

function main() {
    theSecondContext.imageSmoothingEnabled = true;
    ctx.imageSmoothingEnabled = false;
    var shortest = (window.innerWidth < window.innerHeight ? window.innerWidth : window.innerHeight) - 10;
    ctx.font = '20px Georgia';
    ctx.textAlign = 'center';
    //ctx.scale(shortest / WIDTH, shortest / HEIGHT);
    render();
}

var loadedImagesCount = 0;
for (var i = 0; i < images.length; i++) {
    var image = images[i], imageName = './images/' + image + '.png';
    imageTable[image] = new Image();
    imageTable[image].onload = function () {
        loadedImagesCount++;
        theSecondContext.clearRect(sz / 2 - 50, sz / 2 + 25, 100, 10);
        theSecondContext.fillStyle = 'darkgrey';
        theSecondContext.strokeRect(sz / 2 - 50, sz / 2 + 25, 100, 10);
        theSecondContext.fillStyle = 'red';
        theSecondContext.fillRect(sz / 2 - 48, sz / 2 + 27, (loadedImagesCount / images.length) * 96, 6);
        theSecondContext.font = '10px Georgia';
        theSecondContext.fillStyle = 'grey';
        theSecondContext.fillText(((loadedImagesCount / images.length) * 100).toFixed(0) + '%', sz / 2, sz / 2 + 33);
        if (loadedImagesCount == images.length) {
            var act = true;
            addEventListener('click', e => {
                if (act) {
                    act = false;
                    if (e.pageY > window.innerHeight * 0.7) location.href = './apocalypse/index.html'
                    players = e.pageY > window.innerHeight / 3 ? 2 : 1;
                    //if (e.altKey) players = 0;
                    main();
                }
            });
            theSecondContext.clearRect(0, 0, sz, sz);
            theSecondContext.imageSmoothingEnabled = false;
            theSecondContext.drawImage(imageTable['startscreen'], 0, 0, sz, sz);
            theSecondContext.font = '30px Georgia';
            theSecondContext.fillStyle = 'grey';
            theSecondContext.fillText('CLIQUER POUR COMMENCER', sz / 2, sz * 0.75);
            theSecondContext.font = '15px Georgia';
            theSecondContext.fillText('©2020 Olie Auger', sz / 2, sz * 0.9);
            theSecondContext.fillStyle = 'limegreen';
            theSecondContext.font = '15px Georgia';
            theSecondContext.fillText('1 joueur', sz / 2, sz * 0.20);
            theSecondContext.fillText('2 joueurs', sz / 2, sz * 0.50);
            theSecondContext.fillText('Apocalypse', sz / 2, sz * 0.80);
            // theSecondContext.fillRect(sz / 2 - 50, sz / 2 - 2, 100, 4);
        }
    }
    imageTable[image].src = imageName;
}
theSecondContext.fillStyle = 'blue';
theSecondContext.font = '20px Georgia';
theSecondContext.textAlign = 'center';
theSecondContext.fillText('CHARGEMENT EN COURS...', sz / 2, sz / 2);

addEventListener('resize', e => {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.drawImage(canvas2, 0, 0, WIDTH, HEIGHT);
    sz = (window.innerWidth < window.innerHeight ? window.innerWidth : window.innerHeight) - 10;
    canvas2.width = sz;
    canvas2.height = sz;
    theSecondContext.clearRect(0, 0, sz, sz);
    theSecondContext.drawImage(canvas, 0, 0, sz, sz);
});