(function(){
class Vector2 {
  /**
   * @param {number} x
   * @param {number} y
   */
  constructor(x, y){
    this.x = x;
    this.y = y;
  }
  dot(other){
    return new Vector2(this.x * other.x, this.y * other.y);
  }
  dot1D(other){
    return this.x * other.x + this.y * other.y;
  }
  perpendicular(){
    return new Vector2(-this.y, this.x);
  }
  negate(){
    return new Vector2(-this.x, -this.y);
  }
  add(other){
    return new Vector2(this.x+other.x, this.y+other.y);
  }
  substract(other){
    return new Vector2(this.x-other.x, this.y-other.y);
  }
}
class Polygon {
  constructor(...vertices){
    /** @type {Vector2[]} */
    this.vertices = vertices;
    /** @type {[Vector2, Vector2][]} */
    this.edges = [];
    this.calculateEdges();
  }
  calculateEdges(){
    for(var i=0;i<this.vertices.length-1;i++){
      this.edges[i]=([this.vertices[i], this.vertices[i+1]]);
    }
    this.edges[this.vertices.length-1]=([this.vertices[0], this.vertices[this.vertices.length - 1]]);
    for(var i=0;i<this.edges.length;i++){
      this.edges[i].perpendicular = this.edges[i][0].substract(this.edges[i][1]).perpendicular();
    }
  }
}
/**
 * Detects a collision between two polygons.
 * @param {Polygon} polygon1
 * @param {Polygon} polygon2
 */
function detectCollision(polygon1, polygon2){
  /** @type {Vector2} */
  var perpendicularVector = null;
  /** @type {Vector2} */
  var vertex = null;
  /** @type {number[]} */
  var projections1 = [];
  /** @type {number[]} */
  var projections2 = [];
  for(var i = 0;i < polygon1.edges.length;i++){
    perpendicularVector = polygon1.edges[i].perpendicular;
    for(var j = 0;j < polygon1.vertices.length;j++){
      projections1.unshift(polygon1.vertices[j].dot1D(perpendicularVector));
    }
  }
}
})();