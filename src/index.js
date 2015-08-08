import floorplan from "./floorplan";
import heatmap from "./heatmap";
import imagelayer from "./imagelayer";
import overlays from "./overlays";
import pathplot from "./pathplot";
import vectorfield from "./vectorfield";

if (!window.d3){
  throw new Error("d3.js is required! > http://d3js.org/");
}

let d3 = window.d3;

d3.floorplan = floorplan;
d3.floorplan.version = require('../package.json').version;

d3.floorplan.heatmap = heatmap;
d3.floorplan.imagelayer = imagelayer;
d3.floorplan.overlays = overlays;
d3.floorplan.pathplot = pathplot;
d3.floorplan.vectorfield = vectorfield;

export {
  floorplan,
  heatmap,
  imagelayer,
  overlays,
  pathplot,
  vectorfield
};

export default floorplan;