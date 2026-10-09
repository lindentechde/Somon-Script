// import = require and namespaces imported by name
import util = require('util');
import path = require('path');

console.log(util.format('%s-%d', 'a', 1), path.posix.join('a', 'b'));

namespace Shapes {
  export const sides = { triangle: 3, square: 4 };
}
import Sides = Shapes.sides;
console.log(Sides.triangle + Sides.square);
