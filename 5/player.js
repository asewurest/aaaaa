function LOS(a, b, terrain) {
  let diffX = b[0] - a[0];
  for (let i = a[0]; i < b[0]; i += Math.sign(diffX)) {
    if (safeGet2D(terrain, i, a[1])) return false;
  }
  return true;
}

function mby10(x) {
  return { x: x.x * 10, y: x.y * 10, __ref: x };
}

class Player {
  constructor(team, isBot) {
    this.team = team;
    this.x = 0;
    this.y = 0;
    this.w = 5;
    this.h = 9;
    this.fx = 0;
    this.fy = 0;
    this.onGround = false;
    this.lastDirection = 'left';
    this.isBot = isBot;
    this.keys = {};
    this.groundContactLastFrame = false;
    this.downLastFrame = false;
    this.powerups = {};
    this.movementPowerup = '';
    this.projectilePowerup = '';
    this.canDoubleJump = false;
    this.shots = [0];
    if (this.isBot) this.lastCellYShot = 0;
    if (this.isBot) this.lastCellXShot = 0;
  }

  respawn(spawns, players) {
    let bestSpawn = spawns.map(new_ => {
      let dist = Math.min(...players.filter(x => x.team != this.team).map(p => distance(p.x + 2, p.y + 5, new_.x * 10 + 5, new_.y * 10 + 5)));
      return [new_, dist]
    }).sort((old, new_) => {
      return new_[1] - old[1];
    })[Math.floor((Math.random() ** 2) * spawns.length)][0];
    this.x = bestSpawn.x * 10 + 2;
    this.y = bestSpawn.y * 10 + 1;
    this.fx = this.fy = 0;
  }

  botUpdate(players, terrain, spawns) {
    try {
      let stuffToPick = spawns.filter(x => x.content);
      let enemies = players.filter(x => x.team != this.team);
      this.keys.u = this.keys.d = this.keys.l = this.keys.r = false;
      let cellY = Math.floor(this.y / 10);
      if (performance.now() - this.lastCellYShot >= 250) {
        let shouldReturn = false;
        enemies.forEach(({ x, y }) => {
          if (Math.floor(y / 10) == cellY) {
            this.keys[x > this.x ? 'r' : 'l'] = true;
            this.keys.d = true;
            shouldReturn = true;
            this.lastCellYShot = performance.now();
          }
        });
        if (shouldReturn) return;
      }
      if (performance.now() - this.lastCellXShot >= 250) {
        let cellX = Math.floor(this.x / 10);
        let shouldReturn = false;
        enemies.forEach(({ x, y }) => {
          if (Math.floor(x / 10) == cellX) {
            // this.keys[y > this.x ? 'r' : 'l'] = true;
            this.keys.u = true;
            this.keys.d = true;
            shouldReturn = true;
            this.lastCellXShot = performance.now();
          }
        });
        if (shouldReturn) return;
      }
      let recalculate = true;

      if (this.currentTarget) {
        let targetCellX = Math.floor(this.currentTarget.x / 10);
        let targetCellY = Math.floor(this.currentTarget.y / 10);

        if (
          (enemies.map(x => Math.floor(x.x / 10) * 10 * 300 + Math.floor(x.y / 10) * 10).includes(this.currentTarget.x * 300 + this.currentTarget.y))
          || (enemies.map(x => [Math.floor(x.x / 10), Math.floor(x.y / 10)]).some(x => x[1] == targetCellY && LOS([targetCellX, targetCellY], x, terrain)))
          || (this.currentTarget.__ref && this.currentTarget.__ref.content)
        ) recalculate = false;
        if (heuristic({ x: targetCellX, y: targetCellY }, { x: this.currentPath[this.positionInCurrentPath][0], y: this.currentPath[this.positionInCurrentPath][1] }) >= 2) recalculate = true;
      }

      if (recalculate) {
        let enemyIndex = Math.floor(Math.random() * enemies.length);
        this.currentTarget = stuffToPick.length > 0 && Math.random() > 0.5 ? mby10(stuffToPick[Math.floor(Math.random() * stuffToPick.length)]) : { x: Math.floor(enemies[enemyIndex].x / 10) * 10, y: Math.floor(enemies[enemyIndex].y / 10) * 10 + 1 };
        this.currentPath = findPath([this.x, this.y + 1], [this.currentTarget.x, this.currentTarget.y], terrain);
        this.positionInCurrentPath = 0;
      }
      let cellY2 = Math.floor((this.y + 1) / 10);
      let cellX = Math.floor(this.x / 10);
      if (cellX == this.currentPath[this.positionInCurrentPath + 1][0] && cellY2 == this.currentPath[this.positionInCurrentPath + 1][1]) {
        this.positionInCurrentPath++;
      }
      let nextCellX = this.currentPath[this.positionInCurrentPath + 1][0];
      let nextCellY = this.currentPath[this.positionInCurrentPath + 1][1];
      ctx.strokeStyle = 'red';
      ctx.fillStyle = 'white';
      // this.currentPath.forEach((e, i) => {
      //   if (i >= this.positionInCurrentPath) {
      //     ctx.strokeRect(e[0] * 10, e[1] * 10, 10, 10);
      //     ctx.fillText(i.toString(), e[0] * 10, e[1] * 10);
      //   }
      // });
      if (cellX == nextCellX) {
        this.keys[this.x / 10 + this.w / 20 < cellX + 0.5 ? 'r' : 'l'] = true;
        throw 'questionable use of the exception system';
      }
      if (cellY2 == nextCellY || true) {
        let diff = nextCellY - cellY2;
        let diffX = nextCellX - cellX;
        if (Math.abs(diffX) > 1) {
          this.keys[diffX > 0 ? 'l' : 'r'] = true;
        } else {
          this.keys[diffX > 0 ? 'r' : 'l'] = true;
        }
        throw 'questionable use of the exception system';
      }
    } catch (e) { }
    if (this.effectiveXMovement == 0 && this.effectiveYMovement == 0 && (this.keys.l || this.keys.r)) {
      this.keys[this.keys.l ? 'r' : 'l'] = true;
    } else if (this.effectiveYMovement == 0 && this.currentTarget && this.currentTarget.__ref && this.currentTarget.__ref.x == Math.floor(this.x / 10)) {
      this.keys.u = true;
    }
  }

  update(deltaTime, players, projectiles, jumpPads, terrain, spawns) {
    if (this.isBot) this.botUpdate(players, terrain, spawns);
    let originalX = this.x, originalY = this.y;
    for (let key in this.powerups) {
      if (this.powerups[key].quantity <= 0) {
        if (key == this.movementPowerup) this.movementPowerup = '';
        if (key == this.projectilePowerup) this.projectilePowerup = '';
        if (key == 'shield') {
          this.powerups[key].projectiles.forEach(x => {
            x.collisionProtection = x.isStatic = false;
            x.timeToLive = 5;
          });
        }
        delete this.powerups[key];
        continue;
      }
      if (key == 'shield') {
        this.powerups[key].quantity -= deltaTime;
        this.powerups[key].projectiles.forEach((x, index) => {
          let angle = (index / 16 * Math.PI * 2) + (Date.now() % 1500) / 1500 * Math.PI * 2;
          let cos = Math.cos(angle);
          let sin = Math.sin(angle);
          x.dx = cos * 3.5;
          x.dy = sin * 3.5;
          x.x = this.x + 2.5 + cos * 15;
          x.y = this.y + 5 + sin * 15;
        });
      }
    }
    deltaTime *= 60;
    this.freeFalling = false;
    let { u, d, l, r } = this.keys;
    // this.special_timeout--;
    // if (this.special_timeout <= 0) {
    // if (this.onend && this.special) this.onend();
    // this.special = null;
    // }
    // if (this.special && !this.special.name == 'flight') this.special.effect(this, u, d, l, r, this);
    var lateralContact = false;
    this.onGround = false;
    this.x += this.fx * deltaTime;
    if (isColliding(this)) {
      let originalPosition = this.y;
      var slope = 0;
      while (slope < 5 && isColliding(this)) {
        this.y--;
        slope++;
      }
      if (slope++ >= 5) {
        this.y = originalPosition;
      }
    }
    this.x -= this.fx * deltaTime;
    if (this.fx != 0) {
      this.x += this.fx * deltaTime;
      if (isColliding(this)) {
        this.x -= this.fx * deltaTime;
        if (this.fx > 0) {
          this.onGround = 'right';
          this.x = Math.ceil(this.x / 10) * 10 - 5;
        } else {
          this.onGround = 'left';
          this.x = Math.floor(this.x / 10) * 10;
        }
        lateralContact = true;
        this.fx = this.fy = 0;
      }
      // if (this.fx > 0) {
      //   while (isColliding(this)) {
      //     this.x -= 1;
      //     this.fx = 0;
      //     this.fy = 0;
      //     this.onGround = 'right';
      //     lateralContact = true;
      //   }
      // } else {
      //   while (isColliding(this)) {
      //     this.x += 1;
      //     this.fx = 0;
      //     this.fy = 0;
      //     this.onGround = 'left';
      //     lateralContact = true;
      //   }
      // }
    }
    if (this.fy != 0) {
      // let Y = this.y;
      this.y += this.fy * deltaTime;//2 * deltaTime;
      // let fy = this.fy;
      if (this.fy < 0) {
        while (isColliding(this)) {
          this.y = Math.ceil(this.y / 10) * 10;
          this.fy = 0;
          this.onGround = lateralContact ? this.onGround : 'top'
          // console.log('muffin', this.y, Y, fy);
        }
      } else {
        while (isColliding(this)) {
          this.y = Math.floor(this.y / 10) * 10 + 1;
          this.fy = 0;
          this.onGround = lateralContact ? this.onGround : 'ground'
          this.onIce = this.__onIce;
        }
      }
      // this.y -= fy * deltaTime;
    }
    if (this.onGround == 'top' || lateralContact) this.onIce = false;
    if (!this.onGround) {
      if (!this.groundContactLastFrame) this.freeFalling = true;
      this.fy += 0.2 * deltaTime;
    }
    this.fy *= 0.9 ** deltaTime;
    this.fx *= (this.onIce ? (((l && this.fx < 0) || (r && this.fx > 0)) ? 0.7 : 1) : 0.7) ** deltaTime;
    if (l) {
      this.lastDirection = 'left';
      if (this.powerups.speed) {
        this.powerups.speed.quantity -= deltaTime / 60;
        this.fx -= 0.8 * deltaTime;
      } else {
        this.fx -= 0.5 * deltaTime;
      }
    }
    if (r) {
      this.lastDirection = 'right';
      if (this.powerups.speed) {
        this.powerups.speed.quantity -= deltaTime / 60;
        this.fx += 0.8 * deltaTime;
      } else {
        this.fx += 0.5 * deltaTime;
      }
    }
    let projectile = null;
    if (u && this.onGround && (this.onGround != 'top') && !d) {
      this.fy -= 6;
    } else if (u && !this.onGround && !this.groundContactLastFrame && !d && this.canDoubleJump && (this.powerups.doublejump || this.powerups.djws) && this.fy >= 0) {
      this.fy -= 9;
      (this.powerups.doublejump || this.powerups.djws).quantity--;
      this.canDoubleJump = false;
      if (this.powerups.doublejump) {
        projectile = createProjectile(this.x + 2.5, this.y + 5, 0, 3.5, this.team, this);
        projectile.hsplit = true;
      }
    }
    if (this.powerups.flight && u) {
      this.fy -= 0.3 * deltaTime;
      this.powerups.flight.quantity -= deltaTime / 60;
    }
    // if (this.special && this.special.name == 'flight') this.special.effect(this, u, d, l, r, this);
    if (this.x > 300) this.x -= 300;
    if (this.x < 0) this.x += 300;
    if (this.y > 300) this.y -= 300;
    if (this.y < 0) this.y += 300;
    this.groundContactLastFrame = this.onGround;
    if (this.onGround && (this.onGround != 'top')) {
      this.canDoubleJump = true;
    }
    // this.team = this.onGround ? 'red' : 'blue';
    let projectilesCreated = projectile ? [projectile] : [];
    if (!this.downLastFrame && this.keys.d) {
      this.shots[this.shots.length - 1] += 1;
      if (this.powerups.invert) {
        projectiles.forEach(p => {
          if (p.team != this.team) {
            p.team = this.team == 'blue' ? 'blue' : 'red';
            p.dx = -p.dx;
            p.dy = -p.dy;
          }
        });
        this.powerups.invert.quantity = 0;
      }
      if (this.powerups.mine) this.powerups.mine.quantity--;
      if (this.keys.u && !this.powerups.aim) {
        projectilesCreated.push(createProjectile(this.x + 2.5, this.y + 5, 0, -3.5, this.team, this));
        projectilesCreated.push(createProjectile(this.x + 2.5, this.y + 5, 0, 3.5, this.team, this));
        if (this.powerups.triple) {
          this.powerups.triple.quantity--;
          projectilesCreated.push(createProjectile(this.x + 2.5, this.y + 5, 0, -3.5 * 1.5, this.team, this));
          projectilesCreated.push(createProjectile(this.x + 2.5, this.y + 5, 0, 3.5 * 1.5, this.team, this));
          projectilesCreated.push(createProjectile(this.x + 2.5, this.y + 5, 0, -3.5 / 1.5, this.team, this));
          projectilesCreated.push(createProjectile(this.x + 2.5, this.y + 5, 0, 3.5 / 1.5, this.team, this));
        }
      } else {
        if (this.powerups.aim) {
          this.powerups.aim.quantity--;
          let player = players.filter(x => x.team != this.team).sort((a, b) => (((a.x - this.x) ** 2) + ((a.y - this.y) ** 2)) - (((b.x - this.x) ** 2) + ((b.y - this.y) ** 2)))[0];
          let angle = Math.atan2(player.y - this.y, player.x - this.x);
          let object = {
            player,
            nextUpdate: 0.25
          }
          let projectile = createProjectile(this.x + 2.5, this.y + 5, Math.cos(angle) * 3.5, Math.sin(angle) * 3.5, this.team, this);
          projectilesCreated.push(projectile);
          projectile.update = deltaTime => {
            object.nextUpdate -= deltaTime;
            if (object.nextUpdate <= 0) {
              object.nextUpdate = 0.25;
              let angle = Math.atan2(player.y + 5 - projectile.y, player.x + 2.5 - projectile.x);
              projectile.dx = Math.cos(angle) * 3.5;
              projectile.dy = Math.sin(angle) * 3.5;
            }
          }
        } else {
          projectilesCreated.push(createProjectile(this.x + 2.5, this.y + 5, this.lastDirection == 'left' ? -3.5 : 3.5, 0, this.team, this));
          if (this.powerups.triple) {
            this.powerups.triple.quantity--;
            projectilesCreated.push(createProjectile(this.x + 2.5, this.y + 5, this.lastDirection == 'left' ? -3.5 * 1.5 : 3.5 * 1.5, 0, this.team, this));
            projectilesCreated.push(createProjectile(this.x + 2.5, this.y + 5, this.lastDirection == 'left' ? -3.5 / 1.5 : 3.5 / 1.5, 0, this.team, this));
          }
        }
      }
    }
    if (this.powerups.mine) {
      for (let i = 0; i < projectilesCreated.length; i++) {
        let children = [];
        for (let j = 0; j < 16; j++) {
          children.push(createProjectile(projectilesCreated[i].x, projectilesCreated[i].y, Math.cos(j / 8 * Math.PI) * 3.5, Math.sin(j / 8 * Math.PI) * 3.5, this.team, this));
          children[j].collisionProtection = children[j].isStatic = true;
          children[j].timeToLive = Infinity;
          children[j].shouldRotate = 8;
          children[j].rotationOrigin = projectilesCreated[i];
          children[j].childIndex = j;
        }
        projectilesCreated[i].isMine = true;
        projectilesCreated[i].children = children;
      }
    }
    if ((this.onGround || this.fy >= 0) && jumpPads != null) {
      let ry = Math.floor(this.y - Math.floor(this.y / 10) * 10);
      if (ry == 0 || ry == 1 || ry >= 8) {
        let p1 = [Math.floor(this.x / 10), Math.floor((this.y + (ry < 8 ? 0 : 10)) / 10)];
        let p2 = [Math.floor((this.x + 4) / 10), Math.floor((this.y + (ry < 8 ? 0 : 10)) / 10)];
        if (p1[0] < 0) p1[0] += 30;
        if (p2[0] < 0) p2[0] += 30;
        if (p1[1] < 0) p1[1] += 30;
        if (p2[1] < 0) p2[1] += 30;
        if (p1[0] > 29) p1[0] -= 30;
        if (p2[0] > 29) p2[0] -= 30;
        if (p1[1] > 29) p1[1] -= 30;
        if (p2[1] > 29) p2[1] -= 30;
        try {
          if (jumpPads[p1[0]][p1[1]] || jumpPads[p2[0]][p2[1]]) {
            this.fy = -8;
          }
        } catch (e) {
          console.log(p1, p2);
        }
      }
    }
    this.downLastFrame = this.keys.d;
    this.effectiveXMovement = (this.x - originalX) / (deltaTime / 60);
    this.effectiveYMovement = (this.y - originalY) / (deltaTime / 60);
  }
}
