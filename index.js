module.exports = (function(root) {
  root = root || {};

  if (!root.d3){
    throw new Error("d3.js is required! > http://d3js.org/");
  }

  var floorplan = require('./src/index');
  floorplan.version = require('./package.json').version;

  root.d3.floorplan = floorplan;

  return floorplan;

})(window);