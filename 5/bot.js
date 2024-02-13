const PFS = Symbol('pathfinding'), Useless = {};

function unwind(node) {
    let path = [];
    console.log(node);
    while (node.parent) {
        path.unshift([node.x, node.y]);
        node = node.parent;
    }
    path.unshift([node.x, node.y]);
    // if (path.length == 1) debugger;
    return path;
}

function heuristic(a, b) {
    let regularX = Math.abs(a.x - b.x);
    let aOffsetX = Math.abs((a.x + 30) - b.x);
    let bOffsetX = Math.abs(a.x - (b.x + 30));
    let regularY = Math.abs(a.y - b.y);
    let aOffsetY = Math.abs((a.y + 30) - b.y);
    let bOffsetY = Math.abs(a.y - (b.y + 30));
    return Math.sqrt(Math.min(regularX, aOffsetX, bOffsetX) ** 2 + Math.min(regularY, aOffsetY, bOffsetY) ** 2);
}

function findPath([startX, startY], [targetX, targetY], terrain) {
    if (!terrain[PFS]) {
        let nodes = [];
        let map = {
            get _() {
                return new Proxy(Useless, {
                    get(_, x_property) {
                        return new Proxy(Useless, {
                            get(_, y_property) {
                                return map[parseInt(x_property) * 30 + parseInt(y_property)];
                            },

                            set(_, y_property, value) {
                                return map[parseInt(x_property) * 30 + parseInt(y_property)] = value;
                            }
                        })
                    }
                })
            }
        };
        map.get = (x, y) => map[x * 30 + y];
        map.set = (x, y, v) => map[x * 30 + y] = v;
        for (let i = 0; i < 30; i++) {
            for (let j = 0; j < 30; j++) {
                if (!terrain[i][j]) {
                    nodes.unshift({ x: i, y: j, links: {} });
                    map._[i][j] = nodes[0];
                }
            }
        }
        for (let i = 0; i < 30; i++) {
            for (let j = 0; j < 30; j++) {
                if (map._[i][j]) {
                    let downY = j + 1;
                    downY %= 30;
                    if (map._[i][downY]) {
                        map._[i][j].links.down = map._[i][downY];
                    }

                    let leftX = i - 1;
                    if (leftX < 0) leftX += 30;
                    if (map._[leftX][j] && (!safeGet2D(map._, leftX, j + 1) || !safeGet2D(map._, i, j + 1))) {
                        map._[i][j].links.left = map._[leftX][j];
                    }

                    let rightX = i + 1;
                    rightX %= 30;
                    if (map._[rightX][j] && (!safeGet2D(map._, rightX, j + 1) || !safeGet2D(map._, i, j + 1))) {
                        map._[i][j].links.right = map._[rightX][j];
                    }

                    let leftDown = safeGet2D(map._, i - 1, j + 1);
                    let rightDown = safeGet2D(map._, i + 1, j - 1);
                    if (leftDown && safeGet2D(map._, i - 1, j) && safeGet2D(map._, i, j + 1)) {
                        map._[i][j].links.leftDown = leftDown;
                    }
                    if (rightDown && safeGet2D(map._, i + 1, j) && safeGet2D(map._, i, j + 1)) {
                        map._[i][j].links.rightDown = rightDown;
                    }
                }
            }
        }
        terrain[PFS] = { nodes, map };
    }

    let { nodes, map } = terrain[PFS];
    for (let i = 0; i < nodes.length; i++) nodes[i].inOpenList = (nodes[i].g = Infinity, nodes[i].h = 0, nodes[i].f = Infinity, false);
    let startNode = nodes.find(({ x, y }) => Math.floor(startX / 10) == x && Math.floor(startY / 10) == y);
    let targetNode = nodes.find(({ x, y }) => Math.floor(targetX / 10) == x && Math.floor(targetY / 10) == y);

    let openList = [startNode];
    startNode.inOpenList = true;
    startNode.parent = null;
    startNode.g = startNode.h = startNode.f = 0;
    let iters = 0;
    while (openList.length > 0) {
        iters++;
        let current = openList[0];
        for (let i = 1; i < openList.length; i++) {
            if (openList[i].f < current.f) current = openList[i];
        }
        // ctx.strokeStyle = 'green';
        // ctx.strokeRect(current.x * 10, current.y * 10, 10, 10);
        // if (iters % 1 == 0) await delay(0);

        if (current == targetNode) {
            return unwind(current);
        }

        openList.splice(openList.indexOf(current), 1);
        for (let key of ['down', 'left', 'right', 'leftDown', 'rightDown']) {
            if (current.links[key]) {
                let neighbor = current.links[key];
                let gScore = current.g + 1;
                if (gScore < neighbor.g) {
                    neighbor.parent = current;
                    neighbor.g = gScore;
                    // if (neighbor.y < current.y) {
                    // neighbor.h = Math.sqrt((neighbor.x - current.x) ** 2 + ((neighbor.y + 30) - current.y) ** 2);
                    // } else {
                    neighbor.h = heuristic(current, neighbor) * 100;
                    // }
                    neighbor.f = neighbor.g + neighbor.h;
                    if (!neighbor.inOpenList) {
                        neighbor.inOpenList = true;
                        openList.push(neighbor);
                    }
                }
            }
        }

        if (openList.length == 0) {
            return unwind(current);
        }
    }

    console.log('failed to find a path :(');
    return [];
}