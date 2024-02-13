const $ = document.querySelector.bind(document);
/** @type {HTMLCanvasElement} */
const canvas = $('#main');
const ctx = canvas.getContext('2d');
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
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
function throttle(fn, time) {
    let inThrottle = false;
    return function () {
        if (inThrottle) return;
        inThrottle = true;
        fn();
        setTimeout(() => inThrottle = false, time);
    }
}
addEventListener('resize', resizeCanvas);
resizeCanvas();
function mod(a, n) {
    return a - Math.floor(a / n) * n;
}
function angleDifference(x, y) {
    let sourceA = x * 180 / Math.PI;
    let targetA = y * 180 / Math.PI;
    let diff = targetA - sourceA;
    diff = mod((diff + 180), 360) - 180;
    return diff * Math.PI / 180;
}
/** @type {VisualEffect[]} */
let effects = [];
/** @type {Projectile[]} */
let projectiles = [];
/** @type {Particle[]} */
let particles = [];

function addProjectile(projectile) {
    projectiles.push(projectile);
}

function addEffect(effect) {
    effects.push(effect);
}

function addParticle(particle) {
    particles.push(particle);
}

function bang(x, y, time, r, g, b) {
    for (let i = 0; i < 8; i++) {
        let angle = i * Math.PI / 4;
        let dx = Math.cos(angle) * 2;
        let dy = Math.sin(angle) * 2;
        addParticle(new Particle(r, g, b, x, y, dx, dy, time));
    }
}

class Img {
    constructor(src) {
        this.src = src;
        this.img = new Image();
        this.img.src = src;
        this.loaded = false;
        this.cache = {};
        this.width = 0;
        this.height = 0;
        this.img.onload = () => {
            this.loaded = true;
            this.width = this.img.width;
            this.height = this.img.height;
        };
    }

    get image() {
        return this.loaded ? this.img : null;
    }

    colored(r, g, b) {
        if (!this.loaded) return;
        let index = r + ',' + g + ',' + b;
        if (this.cache[index]) {
            return this.cache[index];
        } else {
            const canvas = document.createElement('canvas');
            canvas.width = this.width;
            canvas.height = this.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(this.img, 0, 0);
            const imageData = ctx.getImageData(0, 0, this.width, this.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                let intensity = data[i];
                let R = ((r / 255) * intensity) | 0;
                let G = ((g / 255) * intensity) | 0;
                let B = ((b / 255) * intensity) | 0;
                data[i] = R;
                data[i + 1] = G;
                data[i + 2] = B;
            }
            ctx.putImageData(imageData, 0, 0);
            const img = new Image();
            img.src = canvas.toDataURL();
            this.cache[index] = img;
            return img;
        }
    }
}

CanvasRenderingContext2D.prototype.safeDrawImage = function (image, x, y) {
    if (image && image.width && image.height) {
        this.drawImage(image, x | 0, y | 0);
    }
};

CanvasRenderingContext2D.prototype.safeFillRect = function (x, y, w, h) {
    if (w && h) {
        if (this.fillStyle instanceof CanvasPattern) {
            ctx.translate(x | 0, y | 0);
            ctx.fillRect(0, 0, w | 0, h | 0);
            ctx.translate(-x | 0, -y | 0);
        } else {
            this.fillRect(x | 0, y | 0, w | 0, h | 0);
        }
    }
};

const platformPatterns = [
    new Image(),
    new Image(),
    new Image(),
    new Image(),
    new Image(),
    new Image(),
    new Image(),
    new Image(),
    new Image(),
].map((img, index) => {
    img.src = ['platform_content.png', 'platform_edge_left.png', 'platform_edge_right.png', 'platform_edge_top.png', 'platform_edge_bottom.png', 'platform_corner_left_top.png', 'platform_corner_left_bottom.png', 'platform_corner_right_top.png', 'platform_corner_right_bottom.png'][index];
    img.onload = () => {
        const pattern = ctx.createPattern(img, 'repeat');
        platformPatterns[index] = pattern;
    }
    return '#ff29f5';
});

const playerImages = {
    'walk': [
        new Img('player_w0.png'),
        new Img('player_w1.png'),
        new Img('player_w2.png'),
        new Img('player_w3.png'),
        new Img('player_w4.png')
    ],
    'idle': [new Img('player_i.png')],
};

function rectangleCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.height + rect1.y > rect2.y;
}

class PortalPair {
    /**
     * @param {number} sourceX
     * @param {number} sourceY
     * @param {number} targetX
     * @param {number} targetY
     */
    constructor(sourceX, sourceY, targetX, targetY) {
        this.sourceX = sourceX;
        this.sourceY = sourceY;
        this.targetX = targetX;
        this.targetY = targetY;
        this.name = Symbol(`inPortal:${sourceX},${sourceY},${targetX},${targetY}`);
    }

    /** @param {CanvasRenderingContext2D} ctx */
    draw(ctx) {
        ctx.drawImage(images.portal.colored(255, 0, 255), this.sourceX - 10, this.sourceY - 15);
        ctx.drawImage(images.portal.colored(0, 255, 0), this.targetX - 10, this.targetY - 15);
    }

    sourceRect() {
        return {
            x: this.sourceX - 5,
            y: this.sourceY - 15,
            width: 10,
            height: 30
        };
    }

    targetRect() {
        return {
            x: this.targetX - 5,
            y: this.targetY - 15,
            width: 10,
            height: 30
        };
    }

    /** @param {GameMap} map */
    update(map) {
        let sourceCollider = this.sourceRect();
        let targetCollider = this.targetRect();
        for (let i = 0; i < map.players.length; i++) {
            if (rectangleCollision(sourceCollider, map.players[i]) && map.players[i].y >= this.sourceY - 15 && map.players[i].y <= this.sourceY + 15 && map.players[i].x >= this.sourceX - 7 && map.players[i].x <= this.sourceX - 2) {
                if (!map.players[i][this.name]) {
                    let relativeX = map.players[i].x - this.sourceX;
                    let relativeY = map.players[i].y - this.sourceY;
                    map.players[i].x = this.targetX + relativeX;
                    map.players[i].y = this.targetY + relativeY;
                }
                map.players[i][this.name] = true;
            } else if (rectangleCollision(targetCollider, map.players[i]) && map.players[i].y >= this.targetY - 15 && map.players[i].y <= this.targetY + 15 && map.players[i].x >= this.targetX - 7 && map.players[i].x <= this.targetX - 2) {
                if (!map.players[i][this.name]) {
                    let relativeX = map.players[i].x - this.targetX;
                    let relativeY = map.players[i].y - this.targetY;
                    map.players[i].x = this.sourceX + relativeX;
                    map.players[i].y = this.sourceY + relativeY;
                }
                map.players[i][this.name] = true;
            } else {
                map.players[i][this.name] = false;
            }
        }
        for (let i = 0; i < projectiles.length; i++) {
            if (rectangleCollision(sourceCollider, projectiles[i].collider)) {
                if (!projectiles[i][this.name]) {
                    let relativeX = projectiles[i].x - this.sourceX;
                    let relativeY = projectiles[i].y - this.sourceY;
                    projectiles[i].x = this.targetX + relativeX;
                    projectiles[i].y = this.targetY + relativeY;
                }
                projectiles[i][this.name] = true;
            } else if (rectangleCollision(targetCollider, projectiles[i].collider)) {
                if (!projectiles[i][this.name]) {
                    let relativeX = projectiles[i].x - this.targetX;
                    let relativeY = projectiles[i].y - this.targetY;
                    projectiles[i].x = this.sourceX + relativeX;
                    projectiles[i].y = this.sourceY + relativeY;
                }
                projectiles[i][this.name] = true;
            } else {
                projectiles[i][this.name] = false;
            }
        }
    }
}

class Platform {
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     */
    constructor(x, y, width, height) {
        this.x = this.originalX = x;
        this.y = this.originalY = y;
        this.width = this.originalWidth = width;
        this.height = this.originalHeight = height;
    }

    reset() {
        this.width = this.originalWidth;
        this.height = this.originalHeight;
        this.x = this.originalX;
        this.y = this.originalY;
        this.asArray = [this.x, this.y, this.width, this.height];
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        ctx.fillStyle = platformPatterns[0];
        ctx.safeFillRect(this.x + 2, this.y + 2, this.width - 4, this.height - 4);
        ctx.fillStyle = platformPatterns[1];
        ctx.safeFillRect(this.x, this.y + 2, 2, this.height - 4);
        ctx.fillStyle = platformPatterns[2];
        ctx.safeFillRect(this.x + this.width - 2, this.y + 2, 2, this.height - 4);
        ctx.fillStyle = platformPatterns[3];
        ctx.safeFillRect(this.x + 2, this.y, this.width - 4, 2);
        ctx.fillStyle = platformPatterns[4];
        ctx.safeFillRect(this.x + 2, this.y + this.height - 2, this.width - 4, 2);
        ctx.fillStyle = platformPatterns[5];
        ctx.safeFillRect(this.x, this.y, 2, 2);
        ctx.fillStyle = platformPatterns[6];
        ctx.safeFillRect(this.x, this.y + this.height - 2, 2, 2);
        ctx.fillStyle = platformPatterns[7];
        ctx.safeFillRect(this.x + this.width - 2, this.y, 2, 2);
        ctx.fillStyle = platformPatterns[8];
        ctx.safeFillRect(this.x + this.width - 2, this.y + this.height - 2, 2, 2);
    }

    update() {
    }
}

class MovingPlatform extends Platform {
    constructor(x, y, width, height, maxX, maxY, speedX, speedY) {
        super(x, y, width, height);
        this.maxX = maxX;
        this.maxY = maxY;
        this.speedX = this.originalSpeedX = speedX;
        this.speedY = this.originalSpeedY = speedY;
        this.reset();
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x + this.width >= this.maxX) {
            this.speedX = -this.originalSpeedX;
        } else if (this.x < this.originalX) {
            this.speedX = this.originalSpeedX;
        }
        if (this.y + this.height >= this.maxY) {
            this.speedY = -this.originalSpeedY;
        } else if (this.y < this.originalY) {
            this.speedY = this.originalSpeedY;
        }
        this.asArray[0] = this.x;
        this.asArray[1] = this.y;
        this.asArray[2] = this.width;
        this.asArray[3] = this.height;
    }

    reset() {
        super.reset();
        this.speedX = this.originalSpeedX;
        this.speedY = this.originalSpeedY;
    }

    draw(ctx) {
        ctx.globalAlpha = 0.25;
        this.x -= this.speedX * 2;
        this.y -= this.speedY * 2;
        super.draw(ctx);
        ctx.globalAlpha = 0.5;
        this.x += this.speedX;
        this.y += this.speedY;
        super.draw(ctx);
        this.x += this.speedX;
        this.y += this.speedY;
        ctx.globalAlpha = 1;
        super.draw(ctx);
    }
}

class GameMap {
    /**
     * @param {Platform[]} platforms
     * @param {string} name
     * @param {(keyof typeof allPowerups)[]} powerups
     * @param {PortalPair[]?} portals
     */
    constructor(platforms, name, powerups, portals) {
        this.platforms = platforms;
        this.name = name;
        this.reset();
        /** @type {Player[]} */
        this.players = [];
        /** @type {Powerup[]} */
        this.powerups = [];
        for (let i = 0; i < powerups.length; i++) {
            this.powerups.push(allPowerups[powerups[i]](this));
        }
        /** @type {PortalPair[]} */
        this.portals = portals || [];
    }

    reset() {
        this.platforms.forEach(platform => platform.reset());
        this.players = [];
    }

    update() {
        this.platforms.forEach(platform => platform.update());
        this.powerups.forEach(powerup => powerup.update(this));
        this.portals.forEach(portal => portal.update(this));
    }

    draw(ctx) {
        this.platforms.forEach(platform => platform.draw(ctx));
        this.powerups.forEach(powerup => powerup.draw(ctx));
        this.portals.forEach(portal => portal.draw(ctx));
    }

    hasCollision(player) {
        for (let i = 0; i < this.platforms.length; i++) {
            if (rectangleCollision(this.platforms[i], player)) {
                return this.platforms[i];
            }
        }
        return false;
    }
}

const keys = {};
let pressedKeys = {};
let releasedKeys = {};
addEventListener('keydown', e => {
    if (e.key === 't') {
        let index = (currentMapIndex + 1) % maps.length;
        switchToMap(index);
    } else if (e.key === 'y') {
        let index = (currentMapIndex - 1);
        if (index < 0) {
            index = maps.length - 1;
        }
        switchToMap(index);
    } else if (e.key == 'o') {
        if (window.useShadows) {
            window.useShadows = false;
        } else {
            window.useShadows = true;
        }
    }else if (e.key == 'm') {
      AddPlayers();
    }
    else if (e.key == 'n') {
      AddPlayers(true);
    }else if (e.key == 'u') {
        window.shadowQuality = window.shadowQuality || 1;
        if (window.shadowQuality > 1) {
            window.shadowQuality--;
        }
    } else if (e.key == 'i') {
        if (window.shadowQuality) {
            window.shadowQuality++;
        } else {
            window.shadowQuality = 1;
        }
    }
    if (!keys[e.key.toLowerCase()]) {
        pressedKeys[e.key.toLowerCase()] = true;
    }
    keys[e.key.toLowerCase()] = true;
});
addEventListener('keyup', e => {
    keys[e.key.toLowerCase()] = false;
    releasedKeys[e.key.toLowerCase()] = true;
});

class Player {
    constructor(r, g, b, keys) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.images = {};
        this.keys = keys || {
            'left': 'arrowleft',
            'right': 'arrowright',
            'up': 'arrowup',
            'down': 'arrowdown',
            'switch': 'shift'
        };
        for (const key in playerImages) {
            if (Object.hasOwnProperty.call(playerImages, key)) {
                this.images[key] = playerImages[key].map(img => img.colored(this.r, this.g, this.b));
            }
        }
        this.speedX = 0;
        this.speedSignX = 1;
        this.speedY = 0;
        this.x = 15;
        this.y = 15;
        this.width = 11;
        this.height = 20;
        this.score = 0;
        /** @type {Effect[]} */
        this.powerupStack = [];
    }

    /** @param {CanvasRenderingContext2D} ctx */
    draw(ctx) {
        const imageSet = this.images[this.speedX == 0 ? 'idle' : 'walk'];
        const image = imageSet[(Math.floor(Date.now() / 100)) % imageSet.length];
        // console.log((Math.floor(Date.now() / 100)) % imageSet.length);
        if (this.speedSignX == -1) {
            ctx.save();
            ctx.translate((this.x | 0) + this.width, this.y | 0);
            ctx.scale(-1, 1);
            ctx.drawImage(image, 0, 0);
            ctx.restore();
        } else {
            // console.log(image);
            ctx.safeDrawImage(image, this.x, this.y);
        }
        let totalSize = this.powerupStack.reduce((quantity, item) => quantity + item.quantity, 0) * 6;
        for (let i = this.powerupStack.length - 1, k = 0; i >= 0; i--) {
            for (let j = 0; j < this.powerupStack[i].quantity; j++, k++) {
                ctx.drawImage(this.powerupStack[i].image.colored(this.r, this.g, this.b), this.x + this.width / 2 - totalSize / 2 + k * 6, this.y - 6);
            }
        }
    }

    /**
     * @param {GameMap} map
     * @param {Object.<string, boolean>} keys
     */
    update(map, keys) {
        if (pressedKeys[this.keys['switch']] && this.powerupStack.length > 1) {
            this.powerupStack.unshift(this.powerupStack.pop());
        }
        if (releasedKeys[this.keys.down]) {
            let angle = 0;
            // if (!keys[this.keys.up]) {
            angle = this.speedSignX == -1 ? Math.PI * 1.1 : -Math.PI * 0.1;
            // } else {
            // angle = this.speedSignX == -1 ? 0.785398 : -0.785398;
            // }
            addProjectile(new Projectile(this, this.x + 4, this.y + 10, keys[this.keys.up] ? 8 : 6, angle));
            if (keys[this.keys.up]) {
                projectiles[projectiles.length - 1].bounces = 1;
            }
            if (this.powerupStack.length > 0) {
                this.powerupStack[this.powerupStack.length - 1].shot(this, projectiles[projectiles.length - 1]);
                projectiles[projectiles.length - 1].effect = this.powerupStack[this.powerupStack.length - 1];
            }
        }
        if (this.powerupStack.length > 0) {
            this.powerupStack[this.powerupStack.length - 1].periodic(this);
            if (this.powerupStack[this.powerupStack.length - 1].dead) {
                this.powerupStack.pop();
            }
        }
        this.y += this.speedY;
        this.y |= 0;
        let sign = Math.sign(this.speedY);
        let hit = false;
        while (map.hasCollision(this)) {
            hit = true;
            this.speedY = 0;
            this.y -= sign || -1;
        }
        if (!hit) {
            this.speedY += 0.25;
        }
        this.speedX = keys[this.keys.left] ? -3 : keys[this.keys.right] ? 3 : 0;
        if (this.speedX != 0) {
            this.speedSignX = Math.sign(this.speedX);
        }
        this.x += this.speedX;
        this.x |= 0;
        let xSign = Math.sign(this.speedX);
        let slopeWorks = false;
        for (let i = 0; i < 4; i++) {
            this.y += 1;
            if (!map.hasCollision(this)) {
                slopeWorks = true;
                break;
            }
        }
        let grabbing = false;
        if (!slopeWorks) {
            this.y -= 4;
            for (let i = 0; i < 4; i++) {
                this.y -= 1;
                if (!map.hasCollision(this)) {
                    slopeWorks = true;
                    break;
                }
            }
            if (!slopeWorks) {
                this.y += 4;
                while (map.hasCollision(this)) {
                    grabbing = true;
                    this.speedX = 0;
                    this.speedY = 0;
                    this.x -= xSign || 1;
                }
            }
        }
        let jumpedOnSomebodysHead = false;
        map.players.forEach(other => {
            if (other === this) {
                return;
            }
            if (rectangleCollision(this, other) && this.speedY > 0 && (other.y - this.y) >= 15 && Math.abs(this.x - other.x) < 8) {
                addEffect(new VisualEffect(other.x + other.width / 2, other.y + other.height / 2, other.r, other.g, other.b, 15, 'vaporize'));
                other.die(this, map);
                jumpedOnSomebodysHead = true;
            }
        });
        let canJump = (hit && sign != -1) || (grabbing) || jumpedOnSomebodysHead;
        if (canJump && keys[this.keys.up] && !keys[this.keys.down]) {
            this.speedY = -5;
        }
        if (this.x < 0) {
            this.x += 400;
        }
        if (this.x >= 400) {
            this.x -= 400;
        }
        if (this.y < 0) {
            this.y += 400;
        }
        if (this.y >= 400) {
            this.y -= 400;
        }
    }

    /**
     * @param {Player} attribution
     * @param {GameMap} map
     */
    die(attribution, map) {
        if (attribution) {
            attribution.score++;
        } else {
            map.players.forEach(player => {
                if (player !== this) {
                    player.score++;
                }
            });
        }
        do {
            this.x = Math.floor(Math.random() * 400);
            this.y = Math.floor(Math.random() * 400);
        } while (map.hasCollision(this));
    }
}

function collide(r1, r2) {
    var dx = (r1.x + r1.width / 2) - (r2.x + r2.width / 2);
    var dy = (r1.y + r1.height / 2) - (r2.y + r2.height / 2);
    var width = (r1.width + r2.width) / 2;
    var height = (r1.height + r2.height) / 2;
    var crossWidth = width * dy;
    var crossHeight = height * dx;
    var collision = 'none';
    if (Math.abs(dx) <= width && Math.abs(dy) <= height) {
        if (crossWidth > crossHeight) {
            collision = (crossWidth > (-crossHeight)) ? 'bottom' : 'left';
        } else {
            collision = (crossWidth > -(crossHeight)) ? 'right' : 'top';
        }
    }
    return collision;
}

class Projectile {
    /**
     * @param {Player} owner
     * @param {number} x
     * @param {number} y
     * @param {number} speed
     * @param {number} angle
     * @param {Effect} effect
     */
    constructor(owner, x, y, speed, angle, effect) {
        this.owner = owner;
        this.x = x;
        this.y = y;
        this.collider = {
            x: x,
            y: y,
            width: 4,
            height: 4
        }
        this.speedX = Math.cos(angle) * speed;
        this.speedY = Math.sin(angle) * speed;
        this.isStillCollidingWithOwner = true;
        this.effect = effect;
    }

    get angle() {
        return Math.atan2(this.speedY, this.speedX);
    }

    set angle(angle) {
        let speed = this.speed;
        this.speedX = Math.cos(angle) * speed;
        this.speedY = Math.sin(angle) * speed;
    }

    get speed() {
        return Math.sqrt(this.speedX * this.speedX + this.speedY * this.speedY);
    }

    set speed(speed) {
        let angle = this.angle;
        this.speedX = Math.cos(angle) * speed;
        this.speedY = Math.sin(angle) * speed;
    }

    /** @param {CanvasRenderingContext2D} ctx */
    draw(ctx) {
        if (this.dead) {
            return;
        }
        let angle = Math.atan2(this.speedY, this.speedX);
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);
        let magnitude = Math.sqrt(this.speedX * this.speedX + this.speedY * this.speedY);
        // ctx.drawImage(images['projectile'].colored(this.owner.r, this.owner.g, this.owner.b), -2, -2);
        ctx.globalAlpha = 0.25;
        ctx.scale(0.25, 0.25);
        // ctx.drawImage(images['projectile'].colored(this.owner.r, this.owner.g, this.owner.b), -(2 + magnitude / 2) * 4, -2 * 4);
        ctx.globalAlpha = 0.5;
        ctx.scale(2, 2);
        // ctx.drawImage(images['projectile'].colored(this.owner.r, this.owner.g, this.owner.b), -(2 + magnitude / 4) * 2, -2 * 2);
        ctx.globalAlpha = 1;
        ctx.scale(2, 2);
        ctx.drawImage(images['projectile'].colored(this.owner.r, this.owner.g, this.owner.b), -8, -2);
        ctx.restore();
    }

    /**
     * @param {GameMap} map
     */
    update(map) {
        if (this.dead) return;
        if (this.effect) {
            this.effect.projectilePeriodic(this, map);
        }
        for (let q = 0; q < 10; q++) {
            this.x += this.speedX / 10;
            this.y += this.speedY / 10;
            this.collider.x = this.x - 2;
            this.collider.y = this.y - 2;
            let collided;
            if (collided = map.hasCollision(this.collider)) {
                let value;
                if (this.effect) {
                    value = this.effect.hit(this.owner, this, map);
                }
                if (this.bounces) {
                    this.bounces--;
                    switch (collide(this.collider, collided)) {
                        case 'top':
                        case 'bottom':
                            this.speedY *= -1;
                            this.y += this.speedY;
                            break;
                        case 'left':
                        case 'right':
                            this.speedX *= -1;
                            this.x += this.speedX;
                            break;
                        default:
                            console.log('?? ...');
                    }
                    return;
                } else {
                    if (value !== 'survive') {
                        this.dead = true;
                        addEffect(new VisualEffect(this.x, this.y, this.owner.r, this.owner.g, this.owner.b, 15, 'hit', 'logarithmic'));
                        bang(this.x, this.y, 5, this.owner.r, this.owner.g, this.owner.b);
                        effects[effects.length - 1].rotation = Math.atan2(this.speedY, this.speedX);
                    }
                    return;
                }
            }
            if (this.x < 0) {
                this.x += 400;
            }
            if (this.x >= 400) {
                this.x -= 400;
            }
            if (this.y < 0) {
                this.y += 400;
            }
            if (this.y >= 400) {
                this.y -= 400;
            }
            if (!rectangleCollision(this.owner, this.collider) && this.isStillCollidingWithOwner) {
                this.isStillCollidingWithOwner = false;
            }
            map.players.forEach(player => {
                if (player === this.owner) {
                    if (this.isStillCollidingWithOwner || true) {
                        return;
                    }
                }
                if (rectangleCollision(this.collider, player)) {
                    // if (player === this.owner) {
                    // player.score -= 2;
                    // }
                    if (this.effect) {
                        if (this.effect.hitPlayer(this.owner, this, player)) {
                            return;
                        }
                    }
                    addEffect(new VisualEffect(player.x + player.width / 2, player.y + player.height / 2, player.r, player.g, player.b, 15, 'explosion', 'logarithmic'));
                    player.die(this.owner, map);
                    this.dead = true;
                }
            });
            projectiles.forEach(projectile => {
                if (projectile === this || projectile.owner === this.owner) {
                    return;
                }
                if (rectangleCollision(this.collider, projectile.collider)) {
                    addEffect(new VisualEffect(this.collider.x, this.collider.y, this.owner.r, this.owner.g, this.owner.b, 15, 'explosion-1', 'logarithmic'));
                    addEffect(new VisualEffect(this.collider.x, this.collider.y, projectile.owner.r, projectile.owner.g, projectile.owner.b, 15, 'explosion-2', 'logarithmic'));
                    switch (collide(this.collider, projectile.collider)) {
                        case 'top':
                        case 'bottom':
                            this.speedY *= -1;
                            this.y += this.speedY;
                            projectile.speedY *= -1;
                            projectile.y += projectile.speedY;
                            break;
                        case 'left':
                        case 'right':
                            this.speedX *= -1;
                            this.x += this.speedX;
                            projectile.speedX *= -1;
                            projectile.x += projectile.speedX;
                            break;
                        default:
                            console.log('?? ...');
                    }
                }
            });
        }
        this.speedY += 0.25;
    }
}

class VisualEffect {
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} r
     * @param {number} g
     * @param {number} b
     * @param {number} duration
     * @param {keyof typeof images} img
     */
    constructor(x, y, r, g, b, duration, img, fallout) {
        this.x = x;
        this.y = y;
        this.r = r;
        this.g = g;
        this.b = b;
        this.duration = duration;
        this.time = this.duration;
        this.img = images[img];
        this.fallout = fallout || 'linear';
        this.rotation = 0;
    }

    /** @param {CanvasRenderingContext2D} ctx */
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.fallout == 'linear' ? (this.time / this.duration) : (Math.exp(this.time) / Math.exp(this.duration));
        ctx.safeDrawImage(this.img.colored(this.r, this.g, this.b), -this.img.width / 2, -this.img.height / 2);
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    update() {
        this.time--;
    }
}

class Effect {
    constructor() {
        this.image = images['hit'];
        this.quantity = 3;
    }
    periodic(player) { }
    shot(player, projectile) { }
    hit(player, projectile, target) { }
    hitPlayer(player, projectile, target) { }
    projectilePeriodic(projectile, map) { }
}

class Powerup {
    /**
     * @param {Platform} attachedPlatform
     * @param {GameMap} map
     * @param {keyof typeof images} image
     * @param {typeof Effect} effect
     */
    constructor(attachedPlatform, map, image, effect) {
        this.platform = attachedPlatform;
        this.x = 0;
        this.y = 0;
        this.width = 16;
        this.height = 16;
        this.offsetX = Math.random() * (this.platform.width - this.width);
        this.offsetY = -40;
        this.map = map;
        this.reset();
        this.image = images[image];
        this.color = [0, 0, 0].map(_ => Math.floor(Math.random() * 255));
        this.effect = effect;
    }

    /** @param {CanvasRenderingContext2D} ctx */
    draw(ctx) {
        if (this.hidden) return;
        ctx.safeDrawImage(this.image.colored(this.color[0], this.color[1], this.color[2]), this.x, this.y);
    }

    /** @param {GameMap} map */
    update(map) {
        this.x = this.platform.x + this.offsetX;
        this.y = this.platform.y + this.offsetY;
        this.map = map;
        if (!this.hidden) {
            map.players.forEach(player => {
                if (rectangleCollision(player, this)) {
                    addEffect(new VisualEffect(this.x + this.width / 2, this.y + this.height / 2, this.color[0], this.color[1], this.color[2], 15, 'vaporize'));
                    this.reset();
                    player.powerupStack.push(new this.effect());
                }
            });
        }
    }

    reset() {
        this.platform = this.map.platforms[Math.floor(Math.random() * this.map.platforms.length)];
        this.offsetX = Math.random() * (this.platform.width - this.width);
        this.offsetY = -40;
        this.x = this.platform.x + this.offsetX;
        this.y = this.platform.y + this.offsetY;
        if (this.map.hasCollision(this) || this.x < 0 || (this.y < 0 && !(this.platform instanceof MovingPlatform)) || this.x + this.width > 400 || this.y + this.height > 400) {
            this.reset();
        } else {
            this.hidden = true;
            setTimeout(() => this.hidden = false, Math.floor(Math.random() * 30 * 1000));
        }
    }
}

class Particle {
    constructor(r, g, b, x, y, dx, dy, lifetime) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.rgb = `rgb(${this.r}, ${this.g}, ${this.b})`;
        this.x = x;
        this.y = y;
        this.dx = dx;
        this.dy = dy;
        this.lifetime = lifetime;
    }

    update() {
        this.x += this.dx;
        this.y += this.dy;
        this.lifetime--;
        if (this.lifetime <= 0) {
            this.dead = true;
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.rgb;
        ctx.fillRect(this.x - 2, this.y - 2, 4, 4);
    }
}

const images = {
    'vaporize': new Img('vaporize.png'),
    'projectile': new Img('projectile.png'),
    'explosion': new Img('explosion.png'),
    'explosion-1': new Img('explosion-1.png'),
    'explosion-2': new Img('explosion-2.png'),
    'hit': new Img('hit.png'),
    'effect.bounce': new Img('effect-bounce.png'),
    'bounce': new Img('bounce.png'),
    'effect.straight': new Img('effect-straight.png'),
    'straight': new Img('straight.png'),
    'effect.follow': new Img('effect-follow.png'),
    'follow': new Img('follow.png'),
    'effect.explode': new Img('effect-explode.png'),
    'explode': new Img('explode.png'),
    'flight': new Img('flight.png'),
    'effect.flight': new Img('effect-flight.png'),
    'rain': new Img('rain.png'),
    'effect.rain': new Img('effect-rain.png'),
    'shield': new Img('shield.png'),
    'effect.shield': new Img('effect-shield.png'),
    'mine': new Img('mine.png'),
    'effect.mine': new Img('effect-mine.png'),
    'teleport': new Img('teleport.png'),
    'effect.teleport': new Img('effect-teleport.png'),
    'findpowerup': new Img('findpowerup.png'),
    'effect.findpowerup': new Img('effect-findpowerup.png'),
    'portal': new Img('portal.png'),
};

const img = new Img('icon.png');
const background = new Img('background.png');
const backgroundShaded = new Img('background-shaded.png');
let player;
let otherPlayer;
let players = [];
players.push([
        255, 0, 0
      ])
// players.push({
  // 0, 0, 255, {
        // 'up': 'w',
        // 'down': 's',
        // 'left': 'a',
        // 'right': 'd',
        // 'switch': 'q'
    // }
// })
class BounceEffect extends Effect {
    constructor() {
        super();
        this.image = images['effect.bounce'];
        this.quantity = 3;
    }

    shot(player, projectile) {
        projectile.bounces = 3;
        this.quantity--;
        if (this.quantity <= 0) {
            this.dead = true;
        }
    }
}

class StraightEffect extends Effect {
    constructor() {
        super();
        this.image = images['effect.straight'];
        this.quantity = 3;
    }

    projectilePeriodic(projectile, map) {
        projectile.speedY = 0;
    }

    shot(player, projectile) {
        this.quantity--;
        if (this.quantity <= 0) {
            this.dead = true;
        }
        let angle = Math.atan2(projectile.speedY, projectile.speedX);
        if (Math.abs(angle - Math.PI) < Math.abs(angle - Math.PI * 2)) {
            projectile.speedY = 0;
            // projectile.speedX = pr;
        } else {
            projectile.speedY = 0;
            // projectile.speedX =pr;
        }
    }
}

class FollowEffect extends Effect {
    constructor() {
        super();
        this.image = images['effect.follow'];
        this.quantity = 3;
    }

    shot(player, projectile) {
        this.quantity--;
        if (this.quantity <= 0) {
            this.dead = true;
        }
    }

    /**
     * @param {Projectile} projectile
     * @param {GameMap} map
     */
    projectilePeriodic(projectile, map) {
        let nearestPlayer = map.players.reduce((previous, current) => {
            if (current === projectile.owner) {
                return previous;
            }
            if (previous === null) {
                return current;
            }
            if (((current.x - projectile.x) ** 2 + (current.y - projectile.y) ** 2) < ((previous.x - projectile.x) ** 2 + (previous.y - projectile.y) ** 2)) {
                return current;
            }
            return previous;
        }, null);
        if (nearestPlayer !== null) {
            let targetAngle = Math.atan2(nearestPlayer.y - projectile.y, nearestPlayer.x - projectile.x);
            let currentDifference = Math.abs(angleDifference(projectile.angle, targetAngle));
            projectile.speed = 6;
            projectile.angle += Math.PI / 18;
            // alert(JSON.stringify(nearestPlayer));
            if (!(Math.abs(angleDifference(projectile.angle, targetAngle)) < currentDifference)) {
                projectile.angle -= Math.PI / 9;
            }
        }
    }
}

class FindPowerupEffect extends Effect {
    constructor() {
        super();
        this.image = images['effect.findpowerup'];
        this.quantity = 2;
    }

    shot(player, projectile) {
        this.quantity--;
        if (this.quantity <= 0) {
            this.dead = true;
        }
    }

    /**
     * @param {Projectile} projectile
     * @param {GameMap} map
     */
    projectilePeriodic(projectile, map) {
        let nearestPowerup = map.powerups.reduce((previous, current) => {
            if (current.hidden) {
                return previous;
            }
            if (previous === null || previous.hidden) {
                return current;
            }
            if (((current.x - projectile.x) ** 2 + (current.y - projectile.y) ** 2) < ((previous.x - projectile.x) ** 2 + (previous.y - projectile.y) ** 2)) {
                return current;
            }
            return previous;
        }, null);
        if (nearestPowerup !== null) {
            let targetAngle = Math.atan2((nearestPowerup.y + nearestPowerup.height) - projectile.y, (nearestPowerup.x + nearestPowerup.width) - projectile.x);
            let currentDifference = Math.abs(angleDifference(projectile.angle, targetAngle));
            projectile.speed = 6;
            projectile.angle += Math.PI / 18;
            // alert(JSON.stringify(nearestPlayer));
            if (!(Math.abs(angleDifference(projectile.angle, targetAngle)) < currentDifference)) {
                projectile.angle -= Math.PI / 9;
            }
            if (rectangleCollision(projectile.collider, nearestPowerup)) {
                projectile.owner.powerupStack.push(new nearestPowerup.effect());
                nearestPowerup.reset();
            }
        }
    }
}

class RainEffect extends Effect {
    constructor() {
        super();
        this.image = images['effect.rain'];
        this.quantity = 2;
    }

    shot(player, projectile) {
        this.quantity--;
        if (this.quantity <= 0) {
            this.dead = true;
        }
    }

    /**
     * @param {Projectile} projectile
     * @param {GameMap} map
     */
    projectilePeriodic(projectile, map) {
        let perpendicular = projectile.angle + Math.PI / 2;
        addProjectile(new Projectile(projectile.owner, projectile.x, projectile.y, projectile.speed, perpendicular));
        perpendicular += Math.PI;
        addProjectile(new Projectile(projectile.owner, projectile.x, projectile.y, projectile.speed, perpendicular));
    }
}

class ExplodeEffect extends Effect {
    constructor() {
        super();
        this.image = images['effect.explode'];
        this.quantity = 3;
    }

    shot(player, projectile) {
        this.quantity--;
        if (this.quantity <= 0) {
            this.dead = true;
        }
    }

    /**
     * @param {Player} player
     * @param {Projectile} projectile
     */
    hit(player, projectile) {
        for (let i = 0; i < 10; i++) {
            let angle = i / 10 * Math.PI * 2;
            addProjectile(new Projectile(player, projectile.x - projectile.speedX, projectile.y - projectile.speedY, 6, angle));
        }
    }
}

class EffectEffect extends Effect {
    constructor() {
        super();
        this.image = images['effect.teleport'];
        this.quantity = 3;
    }

    shot(player, projectile) {
        this.quantity--;
        if (this.quantity <= 0) {
            this.dead = true;
        }
    }

    /**
     * @param {Player} player
     * @param {Projectile} projectile
     */
    hit(player, projectile) {
        for (let i = 0; i < 6; i++) {
            let angle = i / 6 * Math.PI * 2;
            addProjectile(new Projectile(player, projectile.x - projectile.speedX, projectile.y - projectile.speedY, 4, angle));
        }
      
    }

  /**
     * @param {Projectile} projectile
     * @param {GameMap} map
     */
    projectilePeriodic(projectile, map) {
      if (Math.random() > 0.85) {
        let perpendicular = projectile.angle + Math.PI *Math.random()*2;
        addProjectile(new Projectile(projectile.owner, projectile.x, projectile.y, projectile.speed, perpendicular));
        perpendicular += Math.PI;
        addProjectile(new Projectile(projectile.owner, projectile.x, projectile.y, projectile.speed, perpendicular));
      }
    }
}

class FlightEffect extends Effect {
    constructor() {
        super();
        this.image = images['effect.flight'];
        this.quantity = 3;
        this.amount = 99 * 2;
    }

    periodic(player) {
        this.quantity = Math.ceil(this.amount / 66);
        if (this.amount <= 0) {
            this.dead = true;
        }
        if (keys[player.keys.up]) {
            player.speedY -= 0.4;
            this.amount--;
        }
    }
}

class ShieldEffect extends Effect {
    constructor() {
        super();
        this.image = images['effect.shield'];
        this.quantity = 1;
    }

    shot(player, projectile) {
        this.quantity--;
        this.dead = true;
        projectile.dead = true;
        for (let i = 0; i < 12; i++) {
            let projectile = new Projectile(player, player.x + player.width / 2, player.y + player.height / 2, 1, i / 12 * Math.PI * 2, this);
            projectile.index = i;
            projectile.timeout = 400;
            addProjectile(projectile);
        }
    }

    projectilePeriodic(projectile, map) {
        projectile.timeout--;
        if (projectile.timeout > 0) {
            projectile.x = projectile.owner.x + player.width / 2 + Math.cos(projectile.index / 12 * Math.PI * 2 + (((Date.now() / 50) % 18) / 18) * Math.PI) * 20;
            projectile.y = projectile.owner.y + player.height / 2 + Math.sin(projectile.index / 12 * Math.PI * 2 + (((Date.now() / 50) % 18) / 18) * Math.PI) * 20;
            projectile.speedX = Math.cos(projectile.index / 12 * Math.PI * 2 + Math.PI / 2 + (((Date.now() / 50) % 18) / 18) * Math.PI) * 6;
            projectile.speedY = Math.sin(projectile.index / 12 * Math.PI * 2 + Math.PI / 2 + (((Date.now() / 50) % 18) / 18) * Math.PI) * 6;
        }
    }

    hit(player, projectile) {
        if (projectile.timeout > 0) {
            return 'survive';
        }
    }
}

class MineEffect extends Effect {
    constructor() {
        super();
        this.image = images['effect.mine'];
        this.quantity = 2;
    }

    shot(player, projectile) {
        this.quantity--;
        if (this.quantity <= 0) {
            this.dead = true;
        }
    }

    hit(player, originalProjectile, target) {
        if (originalProjectile.isChild) {
            if (originalProjectile.timeout > 0) {
                return 'survive';
            } else {
                return;
            }
        }
        originalProjectile.x -= originalProjectile.speedX;
        originalProjectile.y -= originalProjectile.speedY;
        for (let i = 0; i < 12; i++) {
            let projectile = new Projectile(player, originalProjectile.x, originalProjectile.y, 1, i / 12 * Math.PI * 2);
            projectile.positionAndRotation = [originalProjectile.x, originalProjectile.y, i / 12 * Math.PI * 2];
            projectile.timeout = 400;
            projectile.isChild = true;
            projectile.effect = this;
            addProjectile(projectile);
        }
    }

    projectilePeriodic(projectile, map) {
        if (projectile.isChild) {
            projectile.timeout--;
            if (projectile.timeout > 0) {
                [projectile.x, projectile.y, projectile.angle] = projectile.positionAndRotation;
                projectile.speed = 8;
            }
        }
    }
}

class TeleportEffect extends Effect {
    constructor() {
        super();
        this.image = images['effect.teleport'];
        this.quantity = 2;
    }

    shot(player, projectile) {
        this.quantity--;
        if (this.quantity <= 0) {
            this.dead = true;
        }
    }

    projectilePeriodic(projectile, map) {
        this.map = map;
    }

    hit(player, projectile) {
        player.x = projectile.x;
        player.y = projectile.y;
        while (this.map.hasCollision(player)) {
            player.x -= projectile.speedX / 5;
            player.y -= projectile.speedY / 5;
        }
    }
}

/** @type {HTMLCanvasElement} */
const glCanvas = document.getElementById('gl');
const gl = glCanvas.getContext('webgl');
if (!gl) {
    console.log('WebGL is not available, falling back to CPU light calculations (might be slow).');
    /** @param {ImageData} data */
    function shade(data) {
        const array = data.data;
        const quality = window.shadowQuality || 2;
        let lightSources = [
            [14, 44, 255, 255, 0, 7.5],
            [383, 52, 255, 255, 0, 7.5],
            [player.x + player.width / 2, player.y + player.height / 2, player.r, player.g, player.b, 7.5],
            [otherPlayer.x + otherPlayer.width / 2, otherPlayer.y + otherPlayer.height / 2, otherPlayer.r, otherPlayer.g, otherPlayer.b, 7.5],
        ];
        for (let i = 0; i < effects.length; i++) {
            lightSources.push([effects[i].x, effects[i].y, effects[i].r, effects[i].g, effects[i].b, effects[i].time]);
        }
        for (let i = 0; i < projectiles.length; i++) {
            lightSources.push([projectiles[i].x, projectiles[i].y, projectiles[i].owner.r, projectiles[i].owner.g, projectiles[i].owner.b, projectiles[i].speed / 2]);
        }
        for (let i = 0; i < currentMap.portals.length; i++) {
            const angle = (Date.now() / 50) % 50 / 50 * Math.PI * 2 + (i * Math.PI / 2.45);
            const intensity = Math.sin(angle) + 2;
            lightSources.push([currentMap.portals[i].sourceX, currentMap.portals[i].sourceY, 255, 0, 255, intensity]);
            lightSources.push([currentMap.portals[i].targetX, currentMap.portals[i].targetY, 0, 255, 0, intensity]);
        }
      
        for (let i = 0; i < 400 / quality; i++) {
            for (let j = 0; j < 400 / quality; j++) {
                for (let l = 0; l < lightSources.length; l++) {
                    let shadowed = false;
                    for (let k = 0; k < currentMap.platforms.length; k++) {
                        if (rectangleLineIntersection(currentMap.platforms[k], i * quality, j * quality, lightSources[l][0], lightSources[l][1])) {
                            shadowed = true;
                            break;
                        }
                    }
                    if (!shadowed) {
                        let amount = lightSources[l][5] / (Math.sqrt((i * quality - lightSources[l][0]) ** 2 + (j * quality - lightSources[l][1]) ** 2));
                        for (let u = 0; u < quality; u++) {
                            for (let v = 0; v < quality; v++) {
                                let index = ((j * quality + v) * 400 + (i * quality + u)) * 4;
                                array[index] += lightSources[l][2] * amount;
                                array[index + 1] += lightSources[l][3] * amount;
                                array[index + 2] += lightSources[l][4] * amount;
                            }
                        }
                    }
                }
            }
        }
    }
    window.shade = shade;
} else {
    const intermediateCanvas = document.getElementById('intermediate');
    const intermediateContext = intermediateCanvas.getContext('2d');
    const MAX_LIGHTS = 40;
    const MAX_PLATFORMS = 21;
    const vertexShaderSource = `
    attribute vec4 a_position;
    #pragma vscode_glsllint_stage : frag
    varying vec2 v_pixel;

    void main() {
        gl_Position = a_position;
        v_pixel = a_position.xy * 0.5 + 0.5;
    }
    `;
    const fragmentShaderSource = `
    precision mediump float;

    #pragma vscode_glsllint_stage : vert
    uniform sampler2D u_texture;
    uniform float lights[${MAX_LIGHTS * 6}];
    uniform int lightCount;
    uniform float platforms[${MAX_PLATFORMS * 4}];
    uniform int platformCount;
    varying vec2 v_pixel;

    bool lineIntersection(float startX1, float startY1, float endX1, float endY1, float startX2, float startY2, float endX2, float endY2) {
        float det, gamma, lambda;
        det = (endX1 - startX1) * (endY2 - startY2) - (endX2 - startX2) * (endY1 - startY1);
        return (det <= 0.00000001 && det >= -0.00000001) ? false : (0.0 < (lambda = ((endY2 - startY2) * (endX2 - startX1) + (startX2 - endX2) * (endY2 - startY1)) / det) && lambda < 1.0) && (0.0 < (gamma = ((startY1 - endY1) * (endX2 - startX1) + (endX1 - startX1) * (endY2 - startY1)) / det) && gamma < 1.0);
        // if (det <= 0.00000001 && det >= -0.00000001) {
            // return false;
        // } else {
            // lambda = ((endY2 - startY2) * (endX2 - startX1) + (startX2 - endX2) * (endY2 - startY1)) / det;
            // gamma = ((startY1 - endY1) * (endX2 - startX1) + (endX1 - startX1) * (endY2 - startY1)) / det;
            // return (0.0 < lambda && lambda < 1.0) && (0.0 < gamma && gamma < 1.0);
        // }
    }
    bool rectangleLineIntersection(float rectX, float rectY, float rectWidth, float rectHeight, float startX, float startY, float endX, float endY) {
        return lineIntersection(startX, startY, endX, endY, rectX, rectY, rectX + rectWidth, rectY) ||
            lineIntersection(startX, startY, endX, endY, rectX + rectWidth, rectY, rectX + rectWidth, rectY + rectHeight) ||
            lineIntersection(startX, startY, endX, endY, rectX + rectWidth, rectY + rectHeight, rectX, rectY + rectHeight) ||
            lineIntersection(startX, startY, endX, endY, rectX, rectY + rectHeight, rectX, rectY);
    }
    void main() {
        vec4 color = texture2D(u_texture, vec2(v_pixel.x, 1.0 - v_pixel.y));
        vec2 pix = vec2(v_pixel.x, 1.0 - v_pixel.y);
        for (int i = 0; i < ${MAX_LIGHTS}; i++) {
            if (i < lightCount) {
                float light_x = lights[i * 6];
                float light_y = lights[i * 6 + 1];
                float light_r = lights[i * 6 + 2];
                float light_g = lights[i * 6 + 3];
                float light_b = lights[i * 6 + 4];
                float light_intensity = lights[i * 6 + 5];
                bool lighted = true;
                for (int j = 0; j < ${MAX_PLATFORMS}; j++) {
                    if (i < platformCount) {
                        if (rectangleLineIntersection(platforms[j * 4], platforms[j * 4 + 1], platforms[j * 4 + 2], platforms[j * 4 + 3], pix.x * 400.0, pix.y * 400.0, light_x, light_y)) {
                            lighted = false;
                            break;
                        }
                    } else {
                        break;
                    }
                }
                if (lighted) {
                    float distance = sqrt(pow(light_x - pix.x * 400.0, 2.0) + pow(light_y - pix.y * 400.0, 2.0));
                    color.r += (light_r / 255.0) * light_intensity / distance;
                    color.g += (light_g / 255.0) * light_intensity / distance;
                    color.b += (light_b / 255.0) * light_intensity / distance;
                }
            } else {
                break;
            }
        }
        gl_FragColor = color;
    }
    `;
    /**
     * @param {WebGLRenderingContext} gl
     * @param {number} type
     * @param {string} source
     */
    function createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        if (success) {
            return shader;
        }

        throw gl.getShaderInfoLog(shader);
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!success) {
        throw gl.getProgramInfoLog(program);
    }
    const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
    const lightsUniformLocation = gl.getUniformLocation(program, 'lights');

    const platformsUniformLocation = gl.getUniformLocation(program, 'platforms');

    const platformCountUniformLocation = gl.getUniformLocation(program, 'platformCount');

    const lightCountUniformLocation = gl.getUniformLocation(program, 'lightCount');

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [
        -1, -1,
        1, -1,
        -1, 1,
        -1, 1,
        1, -1,
        1, 1,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    const texture = gl.createTexture();
    const lightArray = new Float32Array(MAX_LIGHTS * 6);
    const platformArray = new Float32Array(MAX_PLATFORMS * 4);
    function shade() {
        intermediateContext.drawImage(canvas, 0, 0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, intermediateCanvas);
        let lightSources = [
            14, 44, 255, 255, 0, 6,
            383, 52, 255, 255, 0, 6,
            // player.x + player.width / 2, player.y + player.height / 2, player.r, player.g, player.b, 5,
            // otherPlayer.x + otherPlayer.width / 2, otherPlayer.y + otherPlayer.height / 2, otherPlayer.r, otherPlayer.g, otherPlayer.b, 5,
        ];
        for (let i = 0; i < currentMap.players.length; i++) {
          lightSources.push(currentMap.players[i].x + currentMap.players[i].width/2);
          lightSources.push(currentMap.players[i].y + currentMap.players[i].height/2);
          lightSources.push(currentMap.players[i].r);
          lightSources.push(currentMap.players[i].g);
          lightSources.push(currentMap.players[i].b);
          lightSources.push(5);
        }
        for (let i = 0; i < effects.length; i++) {
            lightSources.push(effects[i].x, effects[i].y, effects[i].r, effects[i].g, effects[i].b, effects[i].time / 1.5);
        }
        for (let i = 0; i < projectiles.length; i++) {
            lightSources.push(projectiles[i].x, projectiles[i].y, projectiles[i].owner.r, projectiles[i].owner.g, projectiles[i].owner.b, projectiles[i].speed / 3);
        }
        for (let i = 0; i < currentMap.portals.length; i++) {
            const angle = (Date.now() / 50) % 50 / 50 * Math.PI * 2 + (i * Math.PI / 2.45);
            const intensity = Math.sin(angle) + 2;
            lightSources.push(currentMap.portals[i].sourceX, currentMap.portals[i].sourceY, 255, 0, 255, intensity);
            lightSources.push(currentMap.portals[i].targetX, currentMap.portals[i].targetY, 0, 255, 0, intensity);
        }
        for (let i = 0; i < MAX_LIGHTS; i++) {
            if (i < lightSources.length / 6) {
                lightArray[i * 6] = lightSources[i * 6];
                lightArray[i * 6 + 1] = lightSources[i * 6 + 1];
                lightArray[i * 6 + 2] = lightSources[i * 6 + 2];
                lightArray[i * 6 + 3] = lightSources[i * 6 + 3];
                lightArray[i * 6 + 4] = lightSources[i * 6 + 4];
                lightArray[i * 6 + 5] = lightSources[i * 6 + 5];
            } else {
                lightArray[i * 6] = 0;
                lightArray[i * 6 + 1] = 0;
                lightArray[i * 6 + 2] = 0;
                lightArray[i * 6 + 3] = 0;
                lightArray[i * 6 + 4] = 0;
                lightArray[i * 6 + 5] = 0;
            }
        }
        for (let i = 0; i < MAX_PLATFORMS; i++) {
            if (i < currentMap.platforms.length) {
                platformArray[i * 4] = currentMap.platforms[i].x;
                platformArray[i * 4 + 1] = currentMap.platforms[i].y;
                platformArray[i * 4 + 2] = currentMap.platforms[i].width;
                platformArray[i * 4 + 3] = currentMap.platforms[i].height;
            } else {
                platformArray[i * 4] = 0;
                platformArray[i * 4 + 1] = 0;
                platformArray[i * 4 + 2] = 0;
                platformArray[i * 4 + 3] = 0;
            }
        }
        gl.uniform1fv(lightsUniformLocation, lightArray);
        gl.uniform1i(lightCountUniformLocation, lightSources.length / 6);
        gl.uniform1fv(platformsUniformLocation, platformArray);
        gl.uniform1i(platformCountUniformLocation, currentMap.platforms.length);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        ctx.drawImage(glCanvas, 0, 0);
        return true;
    }
    window.shade = shade;
    window.isWebGL = true;
}


const allPowerups = {
    'bounce': map => new Powerup(map.platforms[0], map, 'bounce', BounceEffect),
    'straight': map => new Powerup(map.platforms[0], map, 'straight', StraightEffect),
    'follow': map => new Powerup(map.platforms[0], map, 'follow', FollowEffect),
    'explode': map => new Powerup(map.platforms[0], map, 'explode', ExplodeEffect),
    'flight': map => new Powerup(map.platforms[0], map, 'flight', FlightEffect),
    'rain': map => new Powerup(map.platforms[0], map, 'rain', RainEffect),
    'shield': map => new Powerup(map.platforms[0], map, 'shield', ShieldEffect),
    'mine': map => new Powerup(map.platforms[0], map, 'mine', MineEffect),
    'teleport': map => new Powerup(map.platforms[0], map, 'teleport', TeleportEffect),
    'findpowerup': map => new Powerup(map.platforms[0], map, 'findpowerup', FindPowerupEffect),
    'effect': map => new Powerup(map.platforms[0], map, 'effect.teleport', EffectEffect)
};
const maps = [
    new GameMap([
        new Platform(0, 0, 185, 10),
        new Platform(215, 0, 185, 10),
        new Platform(0, 10, 10, 175),
        new Platform(0, 215, 10, 175),
        new Platform(0, 390, 185, 10),
        new Platform(215, 390, 185, 10),
        new Platform(390, 10, 10, 175),
        new Platform(390, 215, 10, 175),
        new MovingPlatform(170, 150, 60, 10, 170, 240, 0, 0.35),
        new Platform(175, 60, 50, 10),
        new Platform(40, 290, 110, 10),
        new Platform(250, 290, 110, 10),
        new Platform(40, 100, 135, 10),
        new Platform(225, 100, 135, 10)
    ], 'qwerty', ['explode', 'follow', 'straight', 'flight', 'rain', 'shield', 'mine', 'findpowerup', 'effect']),
    new GameMap([
        new Platform(0, 0, 185, 10),
        new Platform(215, 0, 185, 10),
        new Platform(0, 10, 10, 175),
        new Platform(0, 215, 10, 175),
        new Platform(0, 390, 185, 10),
        new Platform(215, 390, 185, 10),
        new Platform(390, 10, 10, 175),
        new Platform(390, 215, 10, 175),
        new MovingPlatform(60, 60, 50, 10, 340, 340, 1, 0.5),
        new MovingPlatform(60, 60, 50, 10, 340, 340, 1, 0.5),
        new MovingPlatform(10, 10, 100, 10, 390, 390, 2, 1),
        new Platform(170, 280, 60, 10)
    ], 'qwerty3', ['effect', 'bounce', 'explode', 'follow', 'straight', 'flight', 'rain', 'shield', 'mine', 'teleport']),
    new GameMap([
        new Platform(0, 0, 185, 10),
        new Platform(215, 0, 185, 10),
        new Platform(0, 10, 10, 175),
        new Platform(0, 215, 10, 175),
        new Platform(0, 390, 185, 10),
        new Platform(215, 390, 185, 10),
        new Platform(390, 10, 10, 175),
        new Platform(390, 215, 10, 175),
        new Platform(40, 40, 140, 10),
        new Platform(220, 40, 140, 10),
        new Platform(40, 90, 140 * 2 + 40, 10),
        new Platform(40, 140, 140, 10),
        new Platform(220, 140, 140, 10),
        new Platform(40, 190, 140 * 2 + 40, 10),
        new Platform(40, 240, 140, 10),
        new Platform(220, 240, 140, 10),
        new Platform(40, 290, 140 * 2 + 40, 10),
        new Platform(40, 340, 140, 10),
        new Platform(220, 340, 140, 10),
        new MovingPlatform(40, 10, 10, 100, 40, 390, 0, 2),
        new MovingPlatform(350, 10, 10, 100, 40, 390, 0, 2),
        // new Platform(40, 390, 140 * 2 + 40, 10),
    ], 'labyrinthe', ['bounce', 'explode', 'straight', 'flight', 'rain', 'shield', 'mine']),
    new GameMap([
        new MovingPlatform(-60, 190, 20, 20, 20, 390, 1, 0),
        new MovingPlatform(380, 190, 20, 20, 460, 0, 1, 0),
        new Platform(190, 20, 20, 360),
        new Platform(20, 190, 360, 20),
    ], 'inverse', ['bounce', 'bounce', 'rain', 'shield', 'mine', 'mine']),
    new GameMap([
        new MovingPlatform(0, 0, 50, 10, 0, 400, 0, 1),
        new MovingPlatform(50, 0, 50, 10, 0, 400, 0, 1.05),
        new MovingPlatform(100, 0, 50, 10, 0, 400, 0, 1.1),
        new MovingPlatform(150, 0, 50, 10, 0, 400, 0, 1.15),
        new MovingPlatform(200, 0, 50, 10, 0, 400, 0, 1.2),
        new MovingPlatform(250, 0, 50, 10, 0, 400, 0, 1.25),
        new MovingPlatform(300, 0, 50, 10, 0, 400, 0, 1.3),
        new MovingPlatform(350, 0, 50, 10, 0, 400, 0, 1.35),
    ], '?', ['mine', 'follow', 'explode', 'mine']),
    new GameMap([
        new Platform(0, 0, 400, 10),
        new Platform(0, 390, 400, 10),
        new Platform(0, 0, 10, 390),
        new Platform(390, 0, 10, 390),
    ], 'sandbox', ['bounce', 'straight', 'follow', 'explode', 'flight', 'rain', 'shield', 'mine', 'teleport'],
    [
        new PortalPair(40, 350, 350, 350)
    ]),
    new GameMap([
        new Platform(0, 0, 400, 10),
        new Platform(0, 390, 400, 10),
        new Platform(0, 0, 10, 390),
        new Platform(390, 0, 10, 390),
        new Platform(40, 100, 320, 10),
        new Platform(40, 350, 320, 10),
    ], 'portails', ['bounce', 'straight', 'follow', 'explode', 'flight', 'rain', 'shield', 'mine', 'teleport'], [
        new PortalPair(40, 85, 350, 335),
        new PortalPair(40, 335, 350, 85),
        new PortalPair(200, 85, 200, 335),
    ])
];

let currentMap = maps[0];
let currentMapIndex = 1;
function switchToMap(index) {
    currentMap.players = [];
    currentMap = maps[index];
    currentMapIndex = index;
    currentMap.reset();
    maps[1].platforms[maps[1].platforms.length - 3].x = 200;
    maps[1].platforms[maps[1].platforms.length - 3].y = 200;
    maps[2].platforms.slice(-1)[0].y = 200;
    // for (let i = 0; i < players.length; i++) {
      // currentMap.players.push(new Player(players[i][0]))
    // }
    currentMap.players.push(player = new Player(255, 0, 0));
    currentMap.players.push(otherPlayer = new Player(0, 0, 255, {
        'up': 'w',
        'down': 's',
        'left': 'a',
        'right': 'd',
        'switch': 'q'
    }));
    currentMap.players[1].x = 200;
}
let isStarted = false;
let stopped = false;
const main = function () {
    if (!isStarted && playerImages.walk.every(image => image.loaded) && playerImages.idle.every(image => image.loaded)) {
        isStarted = true;
        switchToMap(0);
    }
    if (isStarted) {
      let bestPlayer = currentMap.players.sort((a, b) => b.score - a.score)[0]
        if (bestPlayer.score >= 30) {
            if (!stopped) {
                addEventListener('click', () => {
                    let current = currentMapIndex;
                    switchToMap(current == 0 ? 1 : 0);
                    switchToMap(current);
                    stopped = false;
                });
            }
            stopped = true;
            let intensity = Math.random();
          // console.log('...');
            bang(200, 200, 200, Math.floor(intensity * bestPlayer.r), Math.floor(intensity * bestPlayer.g), Math.floor(intensity * bestPlayer.b));
        }
        // ctx.imageSmoothingEnabled = false;
        // ctx.mozImageSmoothingEnabled = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.safeDrawImage(window.useShadows ? backgroundShaded.image : background.image, 0, 0);
        currentMap.draw(ctx);
        currentMap.update();
        if (bestPlayer.score < 30) {
            // player.update(currentMap, keys);
            // otherPlayer.update(currentMap, keys);
          currentMap.players.forEach (p => p.update(currentMap, keys));
        }
        // player.draw(ctx);
        // otherPlayer.draw(ctx);
      currentMap.players.forEach (p => p.draw(ctx));
        effects.forEach(effect => effect.draw(ctx));
        effects.forEach(effect => effect.update());
        effects = effects.filter(effect => effect.time > 0);
        projectiles.forEach(projectile => projectile.update(currentMap));
        projectiles.forEach(projectile => projectile.draw(ctx));
        projectiles = projectiles.filter(projectile => !projectile.dead);
        particles.forEach(particle => particle.update());
        particles.forEach(particle => particle.draw(ctx));
        particles = particles.filter(particle => !particle.dead);
        pressedKeys = {};
        releasedKeys = {};
        ctx.font = '12px Menlo';
        ctx.fillStyle = 'red';
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        // ctx.fillText(`${player.score}`, 15, 15);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'blue';
        // ctx.fillText(`${otherPlayer.score}`, 385, 15);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ccc';
        let availableSpace = 400 - (20*2);
        let padLeft = 20;
        for (let i = 0; i < currentMap.players.length; i++) {
          ctx.fillStyle = `rgb(${currentMap.players[i].r}, ${currentMap.players[i].g}, ${currentMap.players[i].b})`;
          ctx.fillText(currentMap.players[i].score, padLeft + (availableSpace / currentMap.players.length * i) + availableSpace / (currentMap.players.length * 2), 15)
        }
      ctx.textAlign = 'center';
        ctx.fillStyle = '#ccc';
        // ctx.fillText(currentMap.name + `${window.useShadows ? (window.isWebGL ? ' GPU' : ' CPU Q' + (window.shadowQuality || 2)) : ''}`, 200, 350);
        if (window.useShadows) {
            const imageData = ctx.getImageData(0, 0, 400, 400);
            if (!shade(imageData)) {
                ctx.putImageData(imageData, 0, 0);
            }
        }
        let minDimension = Math.min(canvas.width, canvas.height);
        let widthIsLargest = canvas.width > canvas.height;
        let targetWidth = (canvas.width / 400) * minDimension;
        let targetHeight = (canvas.height / 400) * minDimension;
        ctx.drawImage(canvas, widthIsLargest ? (canvas.width / 2 - minDimension / 2) : 0, widthIsLargest ? 0 : (canvas.height / 2 - minDimension / 2), targetWidth, targetHeight);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, widthIsLargest ? canvas.width / 2 - minDimension / 2 : canvas.width, widthIsLargest ? canvas.height : canvas.height / 2 - minDimension / 2);
        ctx.fillRect(widthIsLargest ? canvas.width / 2 + minDimension / 2 : 0, widthIsLargest ? 0 : canvas.height / 2 + minDimension / 2, widthIsLargest ? canvas.width / 2 - minDimension / 2 : canvas.width, widthIsLargest ? canvas.height : canvas.height / 2 - minDimension / 2);
    }
}
function draw() {
    main();
    requestAnimationFrame(draw);
}

draw();

function AddPlayers(x) {
  let id = prompt('id');
  console.log('!!!');
  const socket = new WebSocket('wss://qwerty-server.astroide.repl.co/');
  socket.addEventListener('open', e => {
  socket.send(id);
  socket.send(id);
  });
  socket.addEventListener('message', data => {
    data = data.data;
    console.log(data);
    let type = data[0];
    let key = data.slice(1);
    if (type == 'U') {
      keys[key] = false;
      releasedKeys[key] = true
    } else {
      if (!keys[key]) {
        pressedKeys[key] = true;
    }
      keys[key] = true;
      
    }
  })
  currentMap.players.push(new Player(Math.random()*255, Math.random()*255, Math.random()*255, {
    'up': id+'-w',
        'down': id+'-s',
        'left': id+'-a',
        'right': id+'-d',
        'switch': id+'-q'
  }))
  if(!x) {
  currentMap.players.push(new Player(Math.random()*255, Math.random()*255, Math.random()*255, {
    'up': id+'-ArrowUp',
        'down': id+'-ArrowDown',
        'left': id+'-ArrowLeft',
        'right': id+'-ArrowRight',
        'switch': id+'-Shift'
  }))
  }
}
