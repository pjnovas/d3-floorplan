var
  floorplan = require("./floorplan"),
  heatmap = require("./heatmap"),
  imagelayer = require("./imagelayer"),
  overlays = require("./overlays"),
  pathplot = require("./pathplot"),
  vectorfield = require("./vectorfield");

floorplan.heatmap = heatmap;
floorplan.imagelayer = imagelayer;
floorplan.overlays = overlays;
floorplan.pathplot = pathplot;
floorplan.vectorfield = vectorfield;

module.exports = floorplan;