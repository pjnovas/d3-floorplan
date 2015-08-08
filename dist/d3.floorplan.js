(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports={
  "name": "d3.floorplan",
  "version": "0.1.0",
  "description": "A map-like interactive set of [reusable charts](http://bost.ocks.org/mike/chart/) for layering visualizations on a common local coordinate system like floor plans.",
  "main": "src/index.js",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/dciarletta/d3-floorplan.git"
  },
  "author": "David Ciarletta",
  "license": "Apache License, Version 2.0",
  "bugs": {
    "url": "https://github.com/dciarletta/d3-floorplan/issues"
  },
  "homepage": "https://dciarletta.github.io/d3-floorplan/",
  "dependencies": {
    "d3": "^3.5.6"
  },
  "devDependencies": {
    "babel": "^4.6.3",
    "babel-core": "^5.6.15",
    "babelify": "^5.0.3",
    "browserify": "^10.2.6",
    "grunt": "^0.4.5",
    "grunt-browserify": "^3.8.0",
    "grunt-contrib-less": "^1.0.1",
    "grunt-contrib-uglify": "^0.9.1",
    "load-grunt-config": "^0.17.1",
    "time-grunt": "^1.2.1"
  }
}

},{}],2:[function(require,module,exports){
//
//   Copyright 2012 David Ciarletta
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.
//

"use strict";

module.exports = floorplan;

function floorplan() {
	var layers = [],
	    panZoomEnabled = true,
	    maxZoom = 5,
	    xScale = d3.scale.linear(),
	    yScale = d3.scale.linear();

	function map(g) {
		var width = xScale.range()[1] - xScale.range()[0],
		    height = yScale.range()[1] - yScale.range()[0];

		g.each(function (data) {
			if (!data) return;

			var g = d3.select(this);

			// define common graphical elements
			__init_defs(g.selectAll("defs").data([0]).enter().append("defs"));

			// setup container for layers and area to capture events
			var vis = g.selectAll(".map-layers").data([0]),
			    visEnter = vis.enter().append("g").attr("class", "map-layers"),
			    visUpdate = d3.transition(vis);

			visEnter.append("rect").attr("class", "canvas").attr("pointer-events", "all").style("opacity", 0);

			visUpdate.attr("width", width).attr("height", height).attr("x", xScale.range()[0]).attr("y", yScale.range()[0]);

			// setup map controls
			var controls = g.selectAll(".map-controls").data([0]),
			    controlsEnter = controls.enter().append("g").attr("class", "map-controls");

			__init_controls(controlsEnter);
			var offset = controls.select(".hide").classed("ui-show-hide") ? 95 : 10,
			    panelHt = Math.max(45, 10 + layers.length * 20);
			controls.attr("view-width", width).attr("transform", "translate(" + (width - offset) + ",0)").select("rect").attr("height", panelHt);

			// render and reorder layer controls
			var layerControls = controls.select("g.layer-controls").selectAll("g").data(layers, function (l) {
				return l.id();
			}),
			    layerControlsEnter = layerControls.enter().append("g").attr("class", "ui-active").style("cursor", "pointer").on("click", function (l) {
				var button = d3.select(this);
				var layer = g.selectAll("g." + l.id());
				if (button.classed("ui-active")) {
					layer.style("display", "none");
					button.classed("ui-active", false).classed("ui-default", true);
				} else {
					layer.style("display", "inherit");
					button.classed("ui-active", true).classed("ui-default", false);
				}
			});

			layerControlsEnter.append("rect").attr("x", 0).attr("y", 1).attr("rx", 5).attr("ry", 5).attr("width", 75).attr("height", 18).attr("stroke-width", "1px");

			layerControlsEnter.append("text").attr("x", 10).attr("y", 15).style("font-size", "12px").style("font-family", "Helvetica, Arial, sans-serif").text(function (l) {
				return l.title();
			});

			layerControls.transition().duration(1000).attr("transform", function (d, i) {
				return "translate(0," + (layers.length - (i + 1)) * 20 + ")";
			});

			// render and reorder layers
			var maplayers = vis.selectAll(".maplayer").data(layers, function (l) {
				return l.id();
			});
			maplayers.enter().append("g").attr("class", function (l) {
				return "maplayer " + l.title();
			}).append("g").attr("class", function (l) {
				return l.id();
			}).datum(null);
			maplayers.exit().remove();
			maplayers.order();

			// redraw layers
			maplayers.each(function (layer) {
				d3.select(this).select("g." + layer.id()).datum(data[layer.id()]).call(layer);
			});

			// add pan - zoom behavior
			g.call(d3.behavior.zoom().scaleExtent([1, maxZoom]).on("zoom", function () {
				if (panZoomEnabled) {
					__set_view(g, d3.event.scale, d3.event.translate);
				}
			}));
		});
	}

	map.xScale = function (scale) {
		if (!arguments.length) return xScale;
		xScale = scale;
		layers.forEach(function (l) {
			l.xScale(xScale);
		});
		return map;
	};

	map.yScale = function (scale) {
		if (!arguments.length) return yScale;
		yScale = scale;
		layers.forEach(function (l) {
			l.yScale(yScale);
		});
		return map;
	};

	map.panZoom = function (enabled) {
		if (!arguments.length) return panZoomEnabled;
		panZoomEnabled = enabled;
		return map;
	};

	map.addLayer = function (layer, index) {
		layer.xScale(xScale);
		layer.yScale(yScale);

		if (arguments.length > 1 && index >= 0) {
			layers.splice(index, 0, layer);
		} else {
			layers.push(layer);
		}

		return map;
	};

	function __set_view(g, s, t) {
		if (!g) {
			return;
		}if (s) g.__scale__ = s;
		if (t && t.length > 1) g.__translate__ = t;

		// limit translate to edges of extents
		var minXTranslate = (1 - g.__scale__) * (xScale.range()[1] - xScale.range()[0]);
		var minYTranslate = (1 - g.__scale__) * (yScale.range()[1] - yScale.range()[0]);

		g.__translate__[0] = Math.min(xScale.range()[0], Math.max(g.__translate__[0], minXTranslate));
		g.__translate__[1] = Math.min(yScale.range()[0], Math.max(g.__translate__[1], minYTranslate));
		g.selectAll(".map-layers").attr("transform", "translate(" + g.__translate__ + ")scale(" + g.__scale__ + ")");
	};

	function __init_defs(selection) {
		selection.each(function () {
			var defs = d3.select(this);

			var grad = defs.append("radialGradient").attr("id", "metal-bump").attr("cx", "50%").attr("cy", "50%").attr("r", "50%").attr("fx", "50%").attr("fy", "50%");

			grad.append("stop").attr("offset", "0%").style("stop-color", "rgb(170,170,170)").style("stop-opacity", 0.6);

			grad.append("stop").attr("offset", "100%").style("stop-color", "rgb(204,204,204)").style("stop-opacity", 0.5);

			var grip = defs.append("pattern").attr("id", "grip-texture").attr("patternUnits", "userSpaceOnUse").attr("x", 0).attr("y", 0).attr("width", 3).attr("height", 3);

			grip.append("rect").attr("height", 3).attr("width", 3).attr("stroke", "none").attr("fill", "rgba(204,204,204,0.5)");

			grip.append("circle").attr("cx", 1.5).attr("cy", 1.5).attr("r", 1).attr("stroke", "none").attr("fill", "url(#metal-bump)");
		});
	}

	function __init_controls(selection) {
		selection.each(function () {
			var controls = d3.select(this);

			controls.append("path").attr("class", "ui-show-hide").attr("d", "M10,3 v40 h-7 a3,3 0 0,1 -3,-3 v-34 a3,3 0 0,1 3,-3 Z").attr("fill", "url(#grip-texture)").attr("stroke", "none").style("opacity", 0.5);

			controls.append("path").attr("class", "show ui-show-hide").attr("d", "M2,23 l6,-15 v30 Z").attr("fill", "rgb(204,204,204)").attr("stroke", "none").style("opacity", 0.5);

			controls.append("path").attr("class", "hide").attr("d", "M8,23 l-6,-15 v30 Z").attr("fill", "rgb(204,204,204)").attr("stroke", "none").style("opacity", 0);

			controls.append("path").attr("d", "M10,3 v40 h-7 a3,3 0 0,1 -3,-3 v-34 a3,3 0 0,1 3,-3 Z").attr("pointer-events", "all").attr("fill", "none").attr("stroke", "none").style("cursor", "pointer").on("mouseover", function () {
				controls.selectAll("path.ui-show-hide").style("opacity", 1);
			}).on("mouseout", function () {
				controls.selectAll("path.ui-show-hide").style("opacity", 0.5);
			}).on("click", function () {
				if (controls.select(".hide").classed("ui-show-hide")) {
					controls.transition().duration(1000).attr("transform", "translate(" + (controls.attr("view-width") - 10) + ",0)").each("end", function () {
						controls.select(".hide").style("opacity", 0).classed("ui-show-hide", false);
						controls.select(".show").style("opacity", 1).classed("ui-show-hide", true);
						controls.selectAll("path.ui-show-hide").style("opacity", 0.5);
					});
				} else {
					controls.transition().duration(1000).attr("transform", "translate(" + (controls.attr("view-width") - 95) + ",0)").each("end", function () {
						controls.select(".show").style("opacity", 0).classed("ui-show-hide", false);
						controls.select(".hide").style("opacity", 1).classed("ui-show-hide", true);
						controls.selectAll("path.ui-show-hide").style("opacity", 0.5);
					});
				}
			});

			controls.append("rect").attr("x", 10).attr("y", 0).attr("width", 85).attr("fill", "rgba(204,204,204,0.9)").attr("stroke", "none");

			controls.append("g").attr("class", "layer-controls").attr("transform", "translate(15,5)");
		});
	}

	return map;
}

},{}],3:[function(require,module,exports){
//
//   Copyright 2012 David Ciarletta
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.
//
"use strict";

module.exports = heatmap;

function heatmap() {
	var colors = "RdYlBu",
	    scaleType = "quantile",
	    x = d3.scale.linear(),
	    y = d3.scale.linear(),
	    line = d3.svg.line().x(function (d) {
		return x(d.x);
	}).y(function (d) {
		return y(d.y);
	}),
	    format = d3.format(".4n"),
	    id = "fp-heatmap-" + new Date().valueOf(),
	    name = "heatmap";

	function heatmap(g) {
		g.each(function (data) {
			if (!data || !data.map) return;
			var g = d3.select(this);

			if (!data.units) {
				data.units = "";
			} else if (data.units.charAt(0) != " ") {
				data.units = " " + data.units;
			}

			var values = data.map.map(function (d) {
				return d.value;
			}).sort(d3.ascending),
			    colorScale,
			    thresholds;

			switch (scaleType) {
				case "quantile":
					{
						colorScale = d3.scale.quantile().range([1, 2, 3, 4, 5, 6]).domain(values);
						thresholds = colorScale.quantiles();
						break;
					}
				case "quantized":
					{
						colorScale = d3.scale.quantize().range([1, 2, 3, 4, 5, 6]).domain([values[0], values[values.length - 1]]);
						var incr = (colorScale.domain()[1] - colorScale.domain()[0]) / 6;
						thresholds = [incr, 2 * incr, 3 * incr, 4 * incr, 5 * incr];
						break;
					}
				case "normal":
					{
						var mean = d3.mean(values);
						var sigma = Math.sqrt(d3.sum(values, function (v) {
							return Math.pow(v - mean, 2);
						}) / values.length);
						colorScale = d3.scale.quantile().range([1, 2, 3, 4, 5, 6]).domain([mean - 6 * sigma, mean - 2 * sigma, mean - sigma, mean, mean + sigma, mean + 2 * sigma, mean + 6 * sigma]);
						thresholds = colorScale.quantiles();
						break;
					}
				default:
					{
						// custom
						if (!customThresholds) customThresholds = thresholds;
						var domain = customThresholds;
						domain.push(domain[domain.length - 1]);
						domain.unshift(domain[0]);
						colorScale = d3.scale.quantile().range([1, 2, 3, 4, 5, 6]).domain(domain);
						customThresholds = thresholds = colorScale.quantiles();
						break;
					}
			}

			// setup container for visualization
			var vis = g.selectAll("g.heatmap").data([0]);
			vis.enter().append("g").attr("class", "heatmap");

			if (this.__colors__ && this.__colors__ != colors) {
				vis.classed(this.__colors__, false);
			}
			vis.classed(colors, true);
			this.__colors__ = colors;

			var cells = vis.selectAll("rect").data(data.map.filter(function (d) {
				return !d.points;
			}), function (d) {
				return d.x + "," + d.y;
			}),
			    cellsEnter = cells.enter().append("rect").style("opacity", 0.000001);

			cells.exit().transition().style("opacity", 0.000001).remove();

			cellsEnter.append("title");

			cells.attr("x", function (d) {
				return x(d.x);
			}).attr("y", function (d) {
				return y(d.y);
			}).attr("height", Math.abs(y(data.binSize) - y(0))).attr("width", Math.abs(x(data.binSize) - x(0))).attr("class", function (d) {
				return "d6-" + colorScale(d.value);
			}).select("title").text(function (d) {
				return "value: " + format(d.value) + data.units;
			});

			cellsEnter.transition().style("opacity", 0.6);

			var areas = vis.selectAll("path").data(data.map.filter(function (d) {
				return d.points;
			}), function (d) {
				return JSON.stringify(d.points);
			}),
			    areasEnter = areas.enter().append("path").attr("d", function (d) {
				return line(d.points) + "Z";
			}).style("opacity", 0.000001);

			areas.exit().transition().style("opacity", 0.000001).remove();
			areasEnter.append("title");

			areas.attr("class", function (d) {
				return "d6-" + colorScale(d.value);
			}).select("title").text(function (d) {
				return "value: " + format(d.value) + data.units;
			});
			areasEnter.transition().style("opacity", 0.6);

			var areaLabels = vis.selectAll("text").data(data.map.filter(function (d) {
				return d.points;
			}), function (d) {
				return JSON.stringify(d.points);
			}),
			    areaLabelsEnter = areaLabels.enter().append("text").style("font-weight", "bold").attr("text-anchor", "middle").style("opacity", 0.000001);

			areaLabels.exit().transition().style("opacity", 0.000001).remove();

			areaLabels.attr("transform", function (d) {
				var center = { x: 0, y: 0 };
				var area = 0;
				for (var i = 0; i < d.points.length; ++i) {
					var p1 = d.points[i];
					var p2 = d.points[i + 1] || d.points[0];
					var ai = p1.x * p2.y - p2.x * p1.y;
					center.x += (p1.x + p2.x) * ai;
					center.y += (p1.y + p2.y) * ai;
					area += ai;
				}
				area = area / 2;
				center.x = center.x / (6 * area);
				center.y = center.y / (6 * area);
				return "translate(" + x(center.x) + "," + y(center.y) + ")";
			}).text(function (d) {
				return format(d.value) + data.units;
			});

			areaLabelsEnter.transition().style("opacity", 0.6);
		});
	}

	heatmap.xScale = function (scale) {
		if (!arguments.length) return x;
		x = scale;
		return heatmap;
	};

	heatmap.yScale = function (scale) {
		if (!arguments.length) return y;
		y = scale;
		return heatmap;
	};

	heatmap.colorSet = function (scaleName) {
		if (!arguments.length) return colors;
		colors = scaleName;
		return heatmap;
	};

	heatmap.colorMode = function (mode) {
		if (!arguments.length) return scaleType;
		scaleType = mode;
		return heatmap;
	};

	heatmap.customThresholds = function (vals) {
		if (!arguments.length) return customThresholds;
		customThresholds = vals;
		return heatmap;
	};

	heatmap.id = function () {
		return id;
	};

	heatmap.title = function (n) {
		if (!arguments.length) return name;
		name = n;
		return heatmap;
	};

	return heatmap;
}

},{}],4:[function(require,module,exports){
//
//   Copyright 2012 David Ciarletta
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.
//

"use strict";

module.exports = imagelayer;

function imagelayer() {
	var x = d3.scale.linear(),
	    y = d3.scale.linear(),
	    id = "fp-imagelayer-" + new Date().valueOf(),
	    name = "imagelayer";

	function images(g) {
		g.each(function (data) {
			if (!data) return;
			var g = d3.select(this);

			var imgs = g.selectAll("image").data(data, function (img) {
				return img.url;
			});

			imgs.enter().append("image").attr("xlink:href", function (img) {
				return img.url;
			}).style("opacity", 0.000001);

			imgs.exit().transition().style("opacity", 0.000001).remove();

			imgs.transition().attr("x", function (img) {
				return x(img.x);
			}).attr("y", function (img) {
				return y(img.y);
			}).attr("height", function (img) {
				return y(img.y + img.height) - y(img.y);
			}).attr("width", function (img) {
				return x(img.x + img.width) - x(img.x);
			}).style("opacity", function (img) {
				return img.opacity || 1;
			});
		});
	}

	images.xScale = function (scale) {
		if (!arguments.length) return x;
		x = scale;
		return images;
	};

	images.yScale = function (scale) {
		if (!arguments.length) return y;
		y = scale;
		return images;
	};

	images.id = function () {
		return id;
	};

	images.title = function (n) {
		if (!arguments.length) return name;
		name = n;
		return images;
	};

	return images;
}

},{}],5:[function(require,module,exports){
"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var floorplan = _interopRequire(require("./floorplan"));

var heatmap = _interopRequire(require("./heatmap"));

var imagelayer = _interopRequire(require("./imagelayer"));

var overlays = _interopRequire(require("./overlays"));

var pathplot = _interopRequire(require("./pathplot"));

var vectorfield = _interopRequire(require("./vectorfield"));

if (!window.d3) {
  throw new Error("d3.js is required! > http://d3js.org/");
}

var d3 = window.d3;

d3.floorplan = floorplan;
d3.floorplan.version = require("../package.json").version;

d3.floorplan.heatmap = heatmap;
d3.floorplan.imagelayer = imagelayer;
d3.floorplan.overlays = overlays;
d3.floorplan.pathplot = pathplot;
d3.floorplan.vectorfield = vectorfield;

exports.floorplan = floorplan;
exports.heatmap = heatmap;
exports.imagelayer = imagelayer;
exports.overlays = overlays;
exports.pathplot = pathplot;
exports.vectorfield = vectorfield;

},{"../package.json":1,"./floorplan":2,"./heatmap":3,"./imagelayer":4,"./overlays":6,"./pathplot":7,"./vectorfield":8}],6:[function(require,module,exports){
//
//   Copyright 2012 David Ciarletta
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.
//

"use strict";

module.exports = overlays;

function overlays() {
	var x = d3.scale.linear(),
	    y = d3.scale.linear(),
	    id = "fp-overlays-" + new Date().valueOf(),
	    name = "overlays",
	    canvasCallbacks = [],
	    selectCallbacks = [],
	    moveCallbacks = [],
	    editMode = false,
	    line = d3.svg.line().x(function (d) {
		return x(d.x);
	}).y(function (d) {
		return y(d.y);
	}),
	    dragBehavior = d3.behavior.drag().on("dragstart", __dragItem).on("drag", __mousemove).on("dragend", __mouseup),
	    dragged = null;

	function overlays(g) {
		g.each(function (data) {
			if (!data) return;
			var g = d3.select(this);

			// setup rectangle for capturing events
			var canvas = g.selectAll("rect.overlay-canvas").data([0]);

			canvas.enter().append("rect").attr("class", "overlay-canvas").style("opacity", 0).attr("pointer-events", "all").on("click", function () {
				if (editMode) {
					var p = d3.mouse(this);
					canvasCallbacks.forEach(function (cb) {
						cb(x.invert(p[0]), y.invert(p[1]));
					});
				}
			}).on("mouseup.drag", __mouseup).on("touchend.drag", __mouseup);

			canvas.attr("x", x.range()[0]).attr("y", y.range()[0]).attr("height", y.range()[1] - y.range()[0]).attr("width", x.range()[1] - x.range()[0]);

			// draw polygons (currently only type supported)
			var polygons = g.selectAll("path.polygon").data(data.polygons || [], function (d) {
				return d.id;
			});

			polygons.enter().append("path").attr("class", "polygon").attr("vector-effect", "non-scaling-stroke").attr("pointer-events", "all").on("mousedown", function (d) {
				selectCallbacks.forEach(function (cb) {
					cb(d.id);
				});
			}).call(dragBehavior).append("title");

			polygons.exit().transition().style("opacity", 0.000001).remove();

			polygons.attr("d", function (d) {
				return line(d.points) + "Z";
			}).style("cursor", editMode ? "move" : "pointer").select("title").text(function (d) {
				return d.name || d.id;
			});

			if (editMode) {
				var pointData = [];
				if (data.polygons) {
					data.polygons.forEach(function (polygon) {
						polygon.points.forEach(function (pt, i) {
							pointData.push({ index: i,
								parent: polygon });
						});
					});
				}

				// determine current view scale to make appropriately
				// sized points to drag
				var scale = 1;
				var node = g.node();
				while (node.parentNode) {
					node = node.parentNode;
					if (node.__scale__) {
						scale = node.__scale__;
						break;
					}
				}

				var points = g.selectAll("circle.vertex").data(pointData, function (d) {
					return d.parent.id + "-" + d.index;
				});

				points.exit().transition().attr("r", 0.000001).remove();

				points.enter().append("circle").attr("class", "vertex").attr("pointer-events", "all").attr("vector-effect", "non-scaling-stroke").style("cursor", "move").attr("r", 0.000001).call(dragBehavior);

				points.attr("cx", function (d) {
					return x(d.parent.points[d.index].x);
				}).attr("cy", function (d) {
					return y(d.parent.points[d.index].y);
				}).attr("r", 4 / scale);
			} else {
				g.selectAll("circle.vertex").transition().attr("r", 0.000001).remove();
			}
		});
	}

	overlays.xScale = function (scale) {
		if (!arguments.length) return x;
		x = scale;
		return overlays;
	};

	overlays.yScale = function (scale) {
		if (!arguments.length) return y;
		y = scale;
		return overlays;
	};

	overlays.id = function () {
		return id;
	};

	overlays.title = function (n) {
		if (!arguments.length) return name;
		name = n;
		return overlays;
	};

	overlays.editMode = function (enable) {
		if (!arguments.length) return editMode;
		editMode = enable;
		return overlays;
	};

	overlays.registerCanvasCallback = function (cb) {
		if (arguments.length) canvasCallbacks.push(cb);
		return overlays;
	};

	overlays.registerSelectCallback = function (cb) {
		if (arguments.length) select.Callbacks.push(cb);
		return overlays;
	};

	overlays.registerMoveCallback = function (cb) {
		if (arguments.length) moveCallbacks.push(cb);
		return overlays;
	};

	function __dragItem(d) {
		if (editMode) dragged = d;
	}

	function __mousemove() {
		if (dragged) {
			var dx = x.invert(d3.event.dx) - x.invert(0);
			var dy = y.invert(d3.event.dy) - y.invert(0);
			if (dragged.parent) {
				// a point
				dragged.parent.points[dragged.index].x += dx;
				dragged.parent.points[dragged.index].y += dy;
			} else if (dragged.points) {
				// a composite object
				dragged.points.forEach(function (pt) {
					pt.x += dx;
					pt.y += dy;
				});
			}
			// parent is container for overlays
			overlays(d3.select(this.parentNode));
		}
	}

	function __mouseup() {
		if (dragged) {
			moveCallbacks.forEach(function (cb) {
				dragged.parent ? cb(dragged.parent.id, dragged.parent.points, dragged.index) : cb(dragged.id, dragged.points);
			});
			dragged = null;
		}
	}

	return overlays;
}

},{}],7:[function(require,module,exports){
//
//   Copyright 2012 David Ciarletta
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.
//

"use strict";

module.exports = pathplot;

function pathplot() {
	var x = d3.scale.linear(),
	    y = d3.scale.linear(),
	    line = d3.svg.line().x(function (d) {
		return x(d.x);
	}).y(function (d) {
		return y(d.y);
	}),
	    id = "fp-pathplot-" + new Date().valueOf(),
	    name = "pathplot",
	    pointFilter = function pointFilter(d) {
		return d.points;
	};

	function pathplot(g) {
		g.each(function (data) {
			if (!data) return;

			var g = d3.select(this),
			    paths = g.selectAll("path").data(data, function (d) {
				return d.id;
			});

			paths.exit().transition().style("opacity", 0.000001).remove();

			paths.enter().append("path").attr("vector-effect", "non-scaling-stroke").attr("fill", "none").style("opacity", 0.000001).append("title");

			paths.attr("class", function (d) {
				return d.classes || d.id;
			}).attr("d", function (d, i) {
				return line(pointFilter(d, i));
			}).select("title").text(function (d) {
				return d.title || d.id;
			});

			paths.transition().style("opacity", 1);
		});
	}

	pathplot.xScale = function (scale) {
		if (!arguments.length) return x;
		x = scale;
		return pathplot;
	};

	pathplot.yScale = function (scale) {
		if (!arguments.length) return y;
		y = scale;
		return pathplot;
	};

	pathplot.id = function () {
		return id;
	};

	pathplot.title = function (n) {
		if (!arguments.length) return name;
		name = n;
		return pathplot;
	};

	pathplot.pointFilter = function (fn) {
		if (!arguments.length) return pointFilter;
		pointFilter = fn;
		return pathplot;
	};

	return pathplot;
}

},{}],8:[function(require,module,exports){
//
//   Copyright 2012 David Ciarletta
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.
//

"use strict";

module.exports = vectorfield;

function vectorfield() {
	var x = d3.scale.linear(),
	    y = d3.scale.linear(),
	    line = d3.svg.line().x(function (d) {
		return x(d.x);
	}).y(function (d) {
		return y(d.y);
	}),
	    id = "fp-vectorfield-" + new Date().valueOf(),
	    name = "vectorfield";

	function vectorfield(g) {
		g.each(function (data) {
			if (!data || !data.map) return;

			var g = d3.select(this);

			var cells = g.selectAll("path.vector").data(data.map, function (d) {
				return d.x + "," + d.y;
			});

			cells.exit().transition().style("opacity", 0.000001).remove();

			cells.enter().append("path").attr("class", "vector").attr("vector-effect", "non-scaling-stroke").style("opacity", 0.000001).append("title");

			var scaleFactor = data.binSize / 2 / d3.max(data.map, function (d) {
				return Math.max(Math.abs(d.value.x), Math.abs(d.value.y));
			});

			cells.attr("d", function (d) {
				var v0 = { x: d.x + data.binSize / 2,
					y: d.y + data.binSize / 2 };
				var v1 = { x: v0.x + d.value.x * scaleFactor,
					y: v0.y + d.value.y * scaleFactor };
				return line([v0, v1]);
			}).select("title").text(function (d) {
				return Math.sqrt(d.value.x * d.value.x + d.value.y * d.value.y) + " " + data.units;
			});

			cells.transition().style("opacity", 1);
		});
	}

	vectorfield.xScale = function (scale) {
		if (!arguments.length) return x;
		x = scale;
		return vectorfield;
	};

	vectorfield.yScale = function (scale) {
		if (!arguments.length) return y;
		y = scale;
		return vectorfield;
	};

	vectorfield.id = function () {
		return id;
	};

	vectorfield.title = function (n) {
		if (!arguments.length) return name;
		name = n;
		return images;
	};

	return vectorfield;
}

},{}]},{},[5])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJwYWNrYWdlLmpzb24iLCIvaG9tZS9wam5vdmFzL3Byb2plY3RzL2QzLWZsb29ycGxhbi9zcmMvZmxvb3JwbGFuLmpzIiwiL2hvbWUvcGpub3Zhcy9wcm9qZWN0cy9kMy1mbG9vcnBsYW4vc3JjL2hlYXRtYXAuanMiLCIvaG9tZS9wam5vdmFzL3Byb2plY3RzL2QzLWZsb29ycGxhbi9zcmMvaW1hZ2VsYXllci5qcyIsIi9ob21lL3Bqbm92YXMvcHJvamVjdHMvZDMtZmxvb3JwbGFuL3NyYy9pbmRleC5qcyIsIi9ob21lL3Bqbm92YXMvcHJvamVjdHMvZDMtZmxvb3JwbGFuL3NyYy9vdmVybGF5cy5qcyIsIi9ob21lL3Bqbm92YXMvcHJvamVjdHMvZDMtZmxvb3JwbGFuL3NyYy9wYXRocGxvdC5qcyIsIi9ob21lL3Bqbm92YXMvcHJvamVjdHMvZDMtZmxvb3JwbGFuL3NyYy92ZWN0b3JmaWVsZC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O2lCQ2Z3QixTQUFTOztBQUFsQixTQUFTLFNBQVMsR0FBRztBQUNuQyxLQUFJLE1BQU0sR0FBRyxFQUFFO0tBQ2YsY0FBYyxHQUFHLElBQUk7S0FDckIsT0FBTyxHQUFHLENBQUM7S0FDWCxNQUFNLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUU7S0FDMUIsTUFBTSxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7O0FBRTNCLFVBQVMs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QUFDOztBQUUzQixRQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxVQUFTLENBQUMsRUFBRTtBQUFFLFdBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUFFLENBQUMsQ0FDOUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxVQUFTLENBQUMsRUFBRTtBQUFFLFdBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUFFLENBQUMsQ0FDekMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDaEQsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDL0MsSUFBSSxDQUFDLE9BQU8sRUFBRSxVQUFTLENBQUMsRUFBRTtBQUFFLFdBQU8sS0FBSyxHQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7SUFBRSxDQUFDLENBQy9ELE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FDYixJQUFJLENBQUMsVUFBUyxDQUFDLEVBQUU7QUFDakIsV0FBTyxTQUFTLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO0lBQ2hELENBQUMsQ0FBQzs7QUFFTixhQUFVLENBQUMsVUFBVSxFQUFFLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQzs7QUFFOUMsT0FBSSxLQUFLLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FDL0IsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFVBQVMsQ0FBQyxFQUFFO0FBQUUsV0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDO0lBQUUsQ0FB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QUMsVUFBVSxFQUFFLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztHQUN2QyxDQUFDLENBQUM7RUFDSDs7QUFFRCxZQUFXLENBQUMsTUFBTSxHQUFHLFVBQVMsS0FBSyxFQUFFO0FBQ3BDLE1BQUksQ0FBRSxTQUFTLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQ2pDLEdBQUMsR0FBRyxLQUFLLENBQUM7QUFDVixTQUFPLFdBQVcsQ0FBQztFQUNuQixDQUFDOztBQUVGLFlBQVcsQ0FBQyxNQUFNLEdBQUcsVUFBUyxLQUFLLEVBQUU7QUFDcEMsTUFBSSxDQUFFLFNBQVMsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDakMsR0FBQyxHQUFHLEtBQUssQ0FBQztBQUNWLFNBQU8sV0FBVyxDQUFDO0VBQ25CLENBQUM7O0FBRUYsWUFBVyxDQUFDLEVBQUUsR0FBRyxZQUFXO0FBQzNCLFNBQU8sRUFBRSxDQUFDO0VBQ1YsQ0FBQzs7QUFFRixZQUFXLENBQUMsS0FBSyxHQUFHLFVBQVMsQ0FBQyxFQUFFO0FBQy9CLE1BQUksQ0FBRSxTQUFTLENBQUMsTUFBTSxFQUFFLE9BQU8sSUFBSSxDQUFDO0FBQ3BDLE1BQUksR0FBRyxDQUFDLENBQUM7QUFDVCxTQUFPLE1BQU0sQ0FBQztFQUNkLENBQUM7O0FBRUYsUUFBTyxXQUFXLENBQUM7Q0FDbkIiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwibW9kdWxlLmV4cG9ydHM9e1xuICBcIm5hbWVcIjogXCJkMy5mbG9vcnBsYW5cIixcbiAgXCJ2ZXJzaW9uXCI6IFwiMC4xLjBcIixcbiAgXCJkZXNjcmlwdGlvblwiOiBcIkEgbWFwLWxpa2UgaW50ZXJhY3RpdmUgc2V0IG9mIFtyZXVzYWJsZSBjaGFydHNdKGh0dHA6Ly9ib3N0Lm9ja3Mub3JnL21pa2UvY2hhcnQvKSBmb3IgbGF5ZXJpbmcgdmlzdWFsaXphdGlvbnMgb24gYSBjb21tb24gbG9jYWwgY29vcmRpbmF0ZSBzeXN0ZW0gbGlrZSBmbG9vciBwbGFucy5cIixcbiAgXCJtYWluXCI6IFwic3JjL2luZGV4LmpzXCIsXG4gIFwicmVwb3NpdG9yeVwiOiB7XG4gICAgXCJ0eXBlXCI6IFwiZ2l0XCIsXG4gICAgXCJ1cmxcIjogXCJnaXQraHR0cHM6Ly9naXRodWIuY29tL2RjaWFybGV0dGEvZDMtZmxvb3JwbGFuLmdpdFwiXG4gIH0sXG4gIFwiYXV0aG9yXCI6IFwiRGF2aWQgQ2lhcmxldHRhXCIsXG4gIFwibGljZW5zZVwiOiBcIkFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMFwiLFxuICBcImJ1Z3NcIjoge1xuICAgIFwidXJsXCI6IFwiaHR0cHM6Ly9naXRodWIuY29tL2RjaWFybGV0dGEvZDMtZmxvb3JwbGFuL2lzc3Vlc1wiXG4gIH0sXG4gIFwiaG9tZXBhZ2VcIjogXCJodHRwczovL2RjaWFybGV0dGEuZ2l0aHViLmlvL2QzLWZsb29ycGxhbi9cIixcbiAgXCJkZXBlbmRlbmNpZXNcIjoge1xuICAgIFwiZDNcIjogXCJeMy41LjZcIlxuICB9LFxuICBcImRldkRlcGVuZGVuY2llc1wiOiB7XG4gICAgXCJiYWJlbFwiOiBcIl40LjYuM1wiLFxuICAgIFwiYmFiZWwtY29yZVwiOiBcIl41LjYuMTVcIixcbiAgICBcImJhYmVsaWZ5XCI6IFwiXjUuMC4zXCIsXG4gICAgXCJicm93c2VyaWZ5XCI6IFwiXjEwLjIuNlwiLFxuICAgIFwiZ3J1bnRcIjogXCJeMC40LjVcIixcbiAgICBcImdydW50LWJyb3dzZXJpZnlcIjogXCJeMy44LjBcIixcbiAgICBcImdydW50LWNvbnRyaWItbGVzc1wiOiBcIl4xLjAuMVwiLFxuICAgIFwiZ3J1bnQtY29udHJpYi11Z2xpZnlcIjogXCJeMC45LjFcIixcbiAgICBcImxvYWQtZ3J1bnQtY29uZmlnXCI6IFwiXjAuMTcuMVwiLFxuICAgIFwidGltZS1ncnVudFwiOiBcIl4xLjIuMVwiXG4gIH1cbn1cbiIsIi8vXG4vLyAgIENvcHlyaWdodCAyMDEyIERhdmlkIENpYXJsZXR0YVxuLy9cbi8vICAgTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbi8vICAgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuLy8gICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyAgIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbi8vICAgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuLy8gICBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbi8vICAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuLy8gICBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbi8vXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGZsb29ycGxhbigpIHtcblx0dmFyIGxheWVycyA9IFtdLFxuXHRwYW5ab29tRW5hYmxlZCA9IHRydWUsXG5cdG1heFpvb20gPSA1LFxuXHR4U2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKSxcblx0eVNjYWxlID0gZDMuc2NhbGUubGluZWFyKCk7XG5cblx0ZnVuY3Rpb24gbWFwKGcpIHtcblx0XHR2YXIgd2lkdGggPSB4U2NhbGUucmFuZ2UoKVsxXSAtIHhTY2FsZS5yYW5nZSgpWzBdLFxuXHRcdCAgICBoZWlnaHQgPSB5U2NhbGUucmFuZ2UoKVsxXSAtIHlTY2FsZS5yYW5nZSgpWzBdO1xuXHRcdFxuXHRcdGcuZWFjaChmdW5jdGlvbihkYXRhKXtcblx0XHRcdGlmICghIGRhdGEpIHJldHVybjtcblx0XHRcdFxuXHRcdFx0dmFyIGcgPSBkMy5zZWxlY3QodGhpcyk7XG5cblx0XHRcdC8vIGRlZmluZSBjb21tb24gZ3JhcGhpY2FsIGVsZW1lbnRzXG5cdFx0XHRfX2luaXRfZGVmcyhnLnNlbGVjdEFsbChcImRlZnNcIikuZGF0YShbMF0pLmVudGVyKCkuYXBwZW5kKFwiZGVmc1wiKSk7XG5cblx0XHRcdC8vIHNldHVwIGNvbnRhaW5lciBmb3IgbGF5ZXJzIGFuZCBhcmVhIHRvIGNhcHR1cmUgZXZlbnRzXG5cdFx0XHR2YXIgdmlzID0gZy5zZWxlY3RBbGwoXCIubWFwLWxheWVyc1wiKS5kYXRhKFswXSksXG5cdFx0XHR2aXNFbnRlciA9IHZpcy5lbnRlcigpLmFwcGVuZChcImdcIikuYXR0cihcImNsYXNzXCIsXCJtYXAtbGF5ZXJzXCIpLFxuXHRcdFx0dmlzVXBkYXRlID0gZDMudHJhbnNpdGlvbih2aXMpO1xuXG5cdFx0XHR2aXNFbnRlci5hcHBlbmQoXCJyZWN0XCIpXG5cdFx0XHQuYXR0cihcImNsYXNzXCIsIFwiY2FudmFzXCIpXG5cdFx0XHQuYXR0cihcInBvaW50ZXItZXZlbnRzXCIsXCJhbGxcIilcblx0XHRcdC5zdHlsZShcIm9wYWNpdHlcIiwwKTtcblxuXHRcdFx0dmlzVXBkYXRlLmF0dHIoXCJ3aWR0aFwiLCB3aWR0aClcblx0XHRcdC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodClcblx0XHRcdC5hdHRyKFwieFwiLHhTY2FsZS5yYW5nZSgpWzBdKVxuXHRcdFx0LmF0dHIoXCJ5XCIseVNjYWxlLnJhbmdlKClbMF0pO1xuXG5cdFx0XHQvLyBzZXR1cCBtYXAgY29udHJvbHNcblx0XHRcdHZhciBjb250cm9scyA9IGcuc2VsZWN0QWxsKFwiLm1hcC1jb250cm9sc1wiKS5kYXRhKFswXSksXG5cdFx0XHRjb250cm9sc0VudGVyID0gY29udHJvbHMuZW50ZXIoKVxuXHRcdFx0XHRcdFx0XHQuYXBwZW5kKFwiZ1wiKS5hdHRyKFwiY2xhc3NcIixcIm1hcC1jb250cm9sc1wiKTtcblxuXHRcdFx0X19pbml0X2NvbnRyb2xzKGNvbnRyb2xzRW50ZXIpO1xuXHRcdFx0dmFyIG9mZnNldCA9IGNvbnRyb2xzLnNlbGVjdChcIi5oaWRlXCIpXG5cdFx0XHRcdFx0XHQuY2xhc3NlZChcInVpLXNob3ctaGlkZVwiKSA/IDk1IDogMTAsXG5cdFx0XHRwYW5lbEh0ID0gTWF0aC5tYXgoNDUsIDEwICsgbGF5ZXJzLmxlbmd0aCAqIDIwKTtcblx0XHRcdGNvbnRyb2xzLmF0dHIoXCJ2aWV3LXdpZHRoXCIsIHdpZHRoKVxuXHRcdFx0LmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIrKHdpZHRoLW9mZnNldCkrXCIsMClcIilcblx0XHRcdFx0LnNlbGVjdChcInJlY3RcIilcblx0XHRcdFx0LmF0dHIoXCJoZWlnaHRcIiwgcGFuZWxIdCk7XG5cdFx0XHRcblx0XHRcdFxuXHRcdFx0Ly8gcmVuZGVyIGFuZCByZW9yZGVyIGxheWVyIGNvbnRyb2xzXG5cdFx0XHR2YXIgbGF5ZXJDb250cm9scyA9IGNvbnRyb2xzLnNlbGVjdChcImcubGF5ZXItY29udHJvbHNcIilcblx0XHRcdFx0LnNlbGVjdEFsbChcImdcIikuZGF0YShsYXllcnMsIGZ1bmN0aW9uKGwpIHtyZXR1cm4gbC5pZCgpO30pLFxuXHRcdFx0bGF5ZXJDb250cm9sc0VudGVyID0gbGF5ZXJDb250cm9scy5lbnRlcigpXG5cdFx0XHRcdC5hcHBlbmQoXCJnXCIpLmF0dHIoXCJjbGFzc1wiLCBcInVpLWFjdGl2ZVwiKVxuXHRcdFx0XHQuc3R5bGUoXCJjdXJzb3JcIixcInBvaW50ZXJcIilcblx0XHRcdFx0Lm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24obCkge1xuXHRcdFx0XHRcdHZhciBidXR0b24gPSBkMy5zZWxlY3QodGhpcyk7XG5cdFx0XHRcdFx0dmFyIGxheWVyID0gZy5zZWxlY3RBbGwoXCJnLlwiK2wuaWQoKSk7XG5cdFx0XHRcdFx0aWYgKGJ1dHRvbi5jbGFzc2VkKFwidWktYWN0aXZlXCIpKSB7XG5cdFx0XHRcdFx0XHRsYXllci5zdHlsZShcImRpc3BsYXlcIixcIm5vbmVcIik7XG5cdFx0XHRcdFx0XHRidXR0b24uY2xhc3NlZChcInVpLWFjdGl2ZVwiLGZhbHNlKVxuXHRcdFx0XHRcdFx0XHQuY2xhc3NlZChcInVpLWRlZmF1bHRcIix0cnVlKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0bGF5ZXIuc3R5bGUoXCJkaXNwbGF5XCIsXCJpbmhlcml0XCIpO1xuXHRcdFx0XHRcdFx0YnV0dG9uLmNsYXNzZWQoXCJ1aS1hY3RpdmVcIiwgdHJ1ZSlcblx0XHRcdFx0XHRcdFx0LmNsYXNzZWQoXCJ1aS1kZWZhdWx0XCIsIGZhbHNlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0XG5cdFx0XHRsYXllckNvbnRyb2xzRW50ZXIuYXBwZW5kKFwicmVjdFwiKVxuXHRcdFx0XHQuYXR0cihcInhcIiwgMClcblx0XHRcdFx0LmF0dHIoXCJ5XCIsIDEpXG5cdFx0XHRcdC5hdHRyKFwicnhcIiwgNSlcblx0XHRcdFx0LmF0dHIoXCJyeVwiLCA1KVxuXHRcdFx0XHQuYXR0cihcIndpZHRoXCIsIDc1KVxuXHRcdFx0XHQuYXR0cihcImhlaWdodFwiLCAxOClcblx0XHRcdFx0LmF0dHIoXCJzdHJva2Utd2lkdGhcIiwgXCIxcHhcIik7XG5cdFx0XHRcblx0XHRcdGxheWVyQ29udHJvbHNFbnRlci5hcHBlbmQoXCJ0ZXh0XCIpXG5cdFx0XHRcdC5hdHRyKFwieFwiLCAxMClcblx0XHRcdFx0LmF0dHIoXCJ5XCIsIDE1KVxuXHRcdFx0XHQuc3R5bGUoXCJmb250LXNpemVcIixcIjEycHhcIilcblx0XHRcdFx0LnN0eWxlKFwiZm9udC1mYW1pbHlcIiwgXCJIZWx2ZXRpY2EsIEFyaWFsLCBzYW5zLXNlcmlmXCIpXG5cdFx0XHRcdC50ZXh0KGZ1bmN0aW9uKGwpIHsgcmV0dXJuIGwudGl0bGUoKTsgfSk7XG5cdFx0XHRcblx0XHRcdGxheWVyQ29udHJvbHMudHJhbnNpdGlvbigpLmR1cmF0aW9uKDEwMDApXG5cdFx0XHQuYXR0cihcInRyYW5zZm9ybVwiLCBmdW5jdGlvbihkLGkpIHsgXG5cdFx0XHRcdHJldHVybiBcInRyYW5zbGF0ZSgwLFwiICsgKChsYXllcnMubGVuZ3RoLShpKzEpKSoyMCkgKyBcIilcIjsgXG5cdFx0XHR9KTtcblxuXHRcdFx0Ly8gcmVuZGVyIGFuZCByZW9yZGVyIGxheWVyc1xuXHRcdFx0dmFyIG1hcGxheWVycyA9IHZpcy5zZWxlY3RBbGwoXCIubWFwbGF5ZXJcIilcblx0XHRcdFx0XHRcdFx0LmRhdGEobGF5ZXJzLCBmdW5jdGlvbihsKSB7cmV0dXJuIGwuaWQoKTt9KTtcblx0XHRcdG1hcGxheWVycy5lbnRlcigpXG5cdFx0XHQuYXBwZW5kKFwiZ1wiKVxuXHRcdFx0LmF0dHIoXCJjbGFzc1wiLCBmdW5jdGlvbihsKSB7cmV0dXJuIFwibWFwbGF5ZXIgXCIgKyBsLnRpdGxlKCk7fSlcblx0XHRcdFx0LmFwcGVuZChcImdcIilcblx0XHRcdFx0LmF0dHIoXCJjbGFzc1wiLCBmdW5jdGlvbihsKSB7cmV0dXJuIGwuaWQoKTt9KVxuXHRcdFx0XHQuZGF0dW0obnVsbCk7XG5cdFx0XHRtYXBsYXllcnMuZXhpdCgpLnJlbW92ZSgpO1xuXHRcdFx0bWFwbGF5ZXJzLm9yZGVyKCk7XG5cdFx0XHRcblx0XHRcdC8vIHJlZHJhdyBsYXllcnNcblx0XHRcdG1hcGxheWVycy5lYWNoKGZ1bmN0aW9uKGxheWVyKSB7XG5cdFx0XHRcdGQzLnNlbGVjdCh0aGlzKS5zZWxlY3QoXCJnLlwiICsgbGF5ZXIuaWQoKSkuZGF0dW0oZGF0YVtsYXllci5pZCgpXSkuY2FsbChsYXllcik7XG5cdFx0XHR9KTtcblx0XHRcdFxuXHRcdFx0Ly8gYWRkIHBhbiAtIHpvb20gYmVoYXZpb3Jcblx0XHRcdGcuY2FsbChkMy5iZWhhdmlvci56b29tKCkuc2NhbGVFeHRlbnQoWzEsbWF4Wm9vbV0pXG5cdFx0XHRcdFx0Lm9uKFwiem9vbVwiLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdGlmIChwYW5ab29tRW5hYmxlZCkge1xuXHRcdFx0XHRcdFx0XHRfX3NldF92aWV3KGcsIGQzLmV2ZW50LnNjYWxlLCBkMy5ldmVudC50cmFuc2xhdGUpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pKTtcblxuXHRcdH0pO1xuXHR9XG5cblx0bWFwLnhTY2FsZSA9IGZ1bmN0aW9uKHNjYWxlKSB7XG5cdFx0aWYgKCEgYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHhTY2FsZTtcblx0XHR4U2NhbGUgPSBzY2FsZTtcblx0XHRsYXllcnMuZm9yRWFjaChmdW5jdGlvbihsKSB7IGwueFNjYWxlKHhTY2FsZSk7IH0pO1xuXHRcdHJldHVybiBtYXA7XG5cdH07XG5cdFxuXHRtYXAueVNjYWxlID0gZnVuY3Rpb24oc2NhbGUpIHtcblx0XHRpZiAoISBhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4geVNjYWxlO1xuXHRcdHlTY2FsZSA9IHNjYWxlO1xuXHRcdGxheWVycy5mb3JFYWNoKGZ1bmN0aW9uKGwpIHsgbC55U2NhbGUoeVNjYWxlKTsgfSk7XG5cdFx0cmV0dXJuIG1hcDtcblx0fTtcblx0XG5cdG1hcC5wYW5ab29tID0gZnVuY3Rpb24oZW5hYmxlZCkge1xuXHRcdGlmICghIGFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBwYW5ab29tRW5hYmxlZDtcblx0XHRwYW5ab29tRW5hYmxlZCA9IGVuYWJsZWQ7XG5cdFx0cmV0dXJuIG1hcDtcblx0fTtcblx0XG5cdG1hcC5hZGRMYXllciA9IGZ1bmN0aW9uKGxheWVyLCBpbmRleCkge1xuXHRcdGxheWVyLnhTY2FsZSh4U2NhbGUpO1xuXHRcdGxheWVyLnlTY2FsZSh5U2NhbGUpO1xuXHRcdFxuXHRcdGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSAmJiBpbmRleCA+PTApIHtcblx0XHRcdGxheWVycy5zcGxpY2UoaW5kZXgsIDAsIGxheWVyKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bGF5ZXJzLnB1c2gobGF5ZXIpO1xuXHRcdH1cblx0XHRcblx0XHRyZXR1cm4gbWFwO1xuXHR9O1xuXHRcblx0ZnVuY3Rpb24gX19zZXRfdmlldyhnLCBzLCB0KSB7XG5cdFx0aWYgKCEgZykgcmV0dXJuO1xuXHRcdGlmIChzKSBnLl9fc2NhbGVfXyA9IHM7XG5cdFx0aWYgKHQgJiYgdC5sZW5ndGggPiAxKSBnLl9fdHJhbnNsYXRlX18gPSB0O1xuXG5cdFx0Ly8gbGltaXQgdHJhbnNsYXRlIHRvIGVkZ2VzIG9mIGV4dGVudHNcblx0XHR2YXIgbWluWFRyYW5zbGF0ZSA9ICgxIC0gZy5fX3NjYWxlX18pICogXG5cdFx0XHRcdFx0XHRcdCh4U2NhbGUucmFuZ2UoKVsxXSAtIHhTY2FsZS5yYW5nZSgpWzBdKTtcblx0XHR2YXIgbWluWVRyYW5zbGF0ZSA9ICgxIC0gZy5fX3NjYWxlX18pICogXG5cdFx0XHRcdFx0XHRcdCh5U2NhbGUucmFuZ2UoKVsxXSAtIHlTY2FsZS5yYW5nZSgpWzBdKTtcblxuXHRcdGcuX190cmFuc2xhdGVfX1swXSA9IE1hdGgubWluKHhTY2FsZS5yYW5nZSgpWzBdLCBcblx0XHRcdFx0XHRcdFx0XHRNYXRoLm1heChnLl9fdHJhbnNsYXRlX19bMF0sIG1pblhUcmFuc2xhdGUpKTtcblx0XHRnLl9fdHJhbnNsYXRlX19bMV0gPSBNYXRoLm1pbih5U2NhbGUucmFuZ2UoKVswXSwgXG5cdFx0XHRcdFx0XHRcdFx0TWF0aC5tYXgoZy5fX3RyYW5zbGF0ZV9fWzFdLCBtaW5ZVHJhbnNsYXRlKSk7XG5cdFx0Zy5zZWxlY3RBbGwoXCIubWFwLWxheWVyc1wiKVxuXHRcdFx0LmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXG5cdFx0XHRcdCAgXCJ0cmFuc2xhdGUoXCIgKyBnLl9fdHJhbnNsYXRlX18gKyBcblx0XHRcdFx0ICBcdCBcIilzY2FsZShcIiArIGcuX19zY2FsZV9fICsgXCIpXCIpO1xuXHR9O1xuXG5cdGZ1bmN0aW9uIF9faW5pdF9kZWZzKHNlbGVjdGlvbikge1xuXHRcdHNlbGVjdGlvbi5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGRlZnMgPSBkMy5zZWxlY3QodGhpcyk7XG5cblx0XHRcdHZhciBncmFkID0gZGVmcy5hcHBlbmQoXCJyYWRpYWxHcmFkaWVudFwiKVxuXHRcdFx0LmF0dHIoXCJpZFwiLFwibWV0YWwtYnVtcFwiKVxuXHRcdFx0LmF0dHIoXCJjeFwiLFwiNTAlXCIpXG5cdFx0XHQuYXR0cihcImN5XCIsXCI1MCVcIilcblx0XHRcdC5hdHRyKFwiclwiLFwiNTAlXCIpXG5cdFx0XHQuYXR0cihcImZ4XCIsXCI1MCVcIilcblx0XHRcdC5hdHRyKFwiZnlcIixcIjUwJVwiKTtcblxuXHRcdFx0Z3JhZC5hcHBlbmQoXCJzdG9wXCIpXG5cdFx0XHQuYXR0cihcIm9mZnNldFwiLFwiMCVcIilcblx0XHRcdC5zdHlsZShcInN0b3AtY29sb3JcIixcInJnYigxNzAsMTcwLDE3MClcIilcblx0XHRcdC5zdHlsZShcInN0b3Atb3BhY2l0eVwiLDAuNik7XG5cblx0XHRcdGdyYWQuYXBwZW5kKFwic3RvcFwiKVxuXHRcdFx0LmF0dHIoXCJvZmZzZXRcIixcIjEwMCVcIilcblx0XHRcdC5zdHlsZShcInN0b3AtY29sb3JcIixcInJnYigyMDQsMjA0LDIwNClcIilcblx0XHRcdC5zdHlsZShcInN0b3Atb3BhY2l0eVwiLDAuNSk7XG5cblx0XHRcdHZhciBncmlwID0gZGVmcy5hcHBlbmQoXCJwYXR0ZXJuXCIpXG5cdFx0XHQuYXR0cihcImlkXCIsIFwiZ3JpcC10ZXh0dXJlXCIpXG5cdFx0XHQuYXR0cihcInBhdHRlcm5Vbml0c1wiLCBcInVzZXJTcGFjZU9uVXNlXCIpXG5cdFx0XHQuYXR0cihcInhcIiwwKVxuXHRcdFx0LmF0dHIoXCJ5XCIsMClcblx0XHRcdC5hdHRyKFwid2lkdGhcIiwzKVxuXHRcdFx0LmF0dHIoXCJoZWlnaHRcIiwzKTtcblxuXHRcdFx0Z3JpcC5hcHBlbmQoXCJyZWN0XCIpXG5cdFx0XHQuYXR0cihcImhlaWdodFwiLDMpXG5cdFx0XHQuYXR0cihcIndpZHRoXCIsMylcblx0XHRcdC5hdHRyKFwic3Ryb2tlXCIsXCJub25lXCIpXG5cdFx0XHQuYXR0cihcImZpbGxcIiwgXCJyZ2JhKDIwNCwyMDQsMjA0LDAuNSlcIik7XG5cblx0XHRcdGdyaXAuYXBwZW5kKFwiY2lyY2xlXCIpXG5cdFx0XHQuYXR0cihcImN4XCIsIDEuNSlcblx0XHRcdC5hdHRyKFwiY3lcIiwgMS41KVxuXHRcdFx0LmF0dHIoXCJyXCIsIDEpXG5cdFx0XHQuYXR0cihcInN0cm9rZVwiLCBcIm5vbmVcIilcblx0XHRcdC5hdHRyKFwiZmlsbFwiLCBcInVybCgjbWV0YWwtYnVtcClcIik7XG5cdFx0fSk7XG5cdH1cblxuXHRmdW5jdGlvbiBfX2luaXRfY29udHJvbHMoc2VsZWN0aW9uKSB7XG5cdFx0c2VsZWN0aW9uLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgY29udHJvbHMgPSBkMy5zZWxlY3QodGhpcyk7XG5cblx0XHRcdGNvbnRyb2xzLmFwcGVuZChcInBhdGhcIilcblx0XHRcdC5hdHRyKFwiY2xhc3NcIiwgXCJ1aS1zaG93LWhpZGVcIilcblx0XHRcdC5hdHRyKFwiZFwiLCBcIk0xMCwzIHY0MCBoLTcgYTMsMyAwIDAsMSAtMywtMyB2LTM0IGEzLDMgMCAwLDEgMywtMyBaXCIpXG5cdFx0XHQuYXR0cihcImZpbGxcIixcInVybCgjZ3JpcC10ZXh0dXJlKVwiKVxuXHRcdFx0LmF0dHIoXCJzdHJva2VcIiwgXCJub25lXCIpXG5cdFx0XHQuc3R5bGUoXCJvcGFjaXR5XCIsIDAuNSk7XG5cblx0XHRcdGNvbnRyb2xzLmFwcGVuZChcInBhdGhcIilcblx0XHRcdC5hdHRyKFwiY2xhc3NcIiwgXCJzaG93IHVpLXNob3ctaGlkZVwiKVxuXHRcdFx0LmF0dHIoXCJkXCIsIFwiTTIsMjMgbDYsLTE1IHYzMCBaXCIpXG5cdFx0XHQuYXR0cihcImZpbGxcIixcInJnYigyMDQsMjA0LDIwNClcIilcblx0XHRcdC5hdHRyKFwic3Ryb2tlXCIsIFwibm9uZVwiKVxuXHRcdFx0LnN0eWxlKFwib3BhY2l0eVwiLCAwLjUpO1xuXG5cdFx0XHRjb250cm9scy5hcHBlbmQoXCJwYXRoXCIpXG5cdFx0XHQuYXR0cihcImNsYXNzXCIsIFwiaGlkZVwiKVxuXHRcdFx0LmF0dHIoXCJkXCIsIFwiTTgsMjMgbC02LC0xNSB2MzAgWlwiKVxuXHRcdFx0LmF0dHIoXCJmaWxsXCIsXCJyZ2IoMjA0LDIwNCwyMDQpXCIpXG5cdFx0XHQuYXR0cihcInN0cm9rZVwiLCBcIm5vbmVcIilcblx0XHRcdC5zdHlsZShcIm9wYWNpdHlcIiwgMCk7XG5cblx0XHRcdGNvbnRyb2xzLmFwcGVuZChcInBhdGhcIilcblx0XHRcdC5hdHRyKFwiZFwiLCBcIk0xMCwzIHY0MCBoLTcgYTMsMyAwIDAsMSAtMywtMyB2LTM0IGEzLDMgMCAwLDEgMywtMyBaXCIpXG5cdFx0XHQuYXR0cihcInBvaW50ZXItZXZlbnRzXCIsIFwiYWxsXCIpXG5cdFx0XHQuYXR0cihcImZpbGxcIixcIm5vbmVcIilcblx0XHRcdC5hdHRyKFwic3Ryb2tlXCIsIFwibm9uZVwiKVxuXHRcdFx0LnN0eWxlKFwiY3Vyc29yXCIsXCJwb2ludGVyXCIpXG5cdFx0XHQub24oXCJtb3VzZW92ZXJcIiwgZnVuY3Rpb24oKSB7IFxuXHRcdFx0XHRjb250cm9scy5zZWxlY3RBbGwoXCJwYXRoLnVpLXNob3ctaGlkZVwiKS5zdHlsZShcIm9wYWNpdHlcIiwgMSk7IFxuXHRcdFx0fSlcblx0XHRcdC5vbihcIm1vdXNlb3V0XCIsIGZ1bmN0aW9uKCkgeyBcblx0XHRcdFx0Y29udHJvbHMuc2VsZWN0QWxsKFwicGF0aC51aS1zaG93LWhpZGVcIikuc3R5bGUoXCJvcGFjaXR5XCIsIDAuNSk7IFxuXHRcdFx0fSlcblx0XHRcdC5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRpZiAoY29udHJvbHMuc2VsZWN0KFwiLmhpZGVcIikuY2xhc3NlZChcInVpLXNob3ctaGlkZVwiKSkge1xuXHRcdFx0XHRcdGNvbnRyb2xzLnRyYW5zaXRpb24oKVxuXHRcdFx0XHRcdC5kdXJhdGlvbigxMDAwKVxuXHRcdFx0XHRcdC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiKyhjb250cm9scy5hdHRyKFwidmlldy13aWR0aFwiKS0xMCkrXCIsMClcIilcblx0XHRcdFx0XHQuZWFjaChcImVuZFwiLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdGNvbnRyb2xzLnNlbGVjdChcIi5oaWRlXCIpXG5cdFx0XHRcdFx0XHQuc3R5bGUoXCJvcGFjaXR5XCIsMClcblx0XHRcdFx0XHRcdC5jbGFzc2VkKFwidWktc2hvdy1oaWRlXCIsZmFsc2UpO1xuXHRcdFx0XHRcdFx0Y29udHJvbHMuc2VsZWN0KFwiLnNob3dcIilcblx0XHRcdFx0XHRcdC5zdHlsZShcIm9wYWNpdHlcIiwxKVxuXHRcdFx0XHRcdFx0LmNsYXNzZWQoXCJ1aS1zaG93LWhpZGVcIix0cnVlKTtcblx0XHRcdFx0XHRcdGNvbnRyb2xzLnNlbGVjdEFsbChcInBhdGgudWktc2hvdy1oaWRlXCIpXG5cdFx0XHRcdFx0XHQuc3R5bGUoXCJvcGFjaXR5XCIsMC41KTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRjb250cm9scy50cmFuc2l0aW9uKClcblx0XHRcdFx0XHQuZHVyYXRpb24oMTAwMClcblx0XHRcdFx0XHQuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIisoY29udHJvbHMuYXR0cihcInZpZXctd2lkdGhcIiktOTUpK1wiLDApXCIpXG5cdFx0XHRcdFx0LmVhY2goXCJlbmRcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRjb250cm9scy5zZWxlY3QoXCIuc2hvd1wiKVxuXHRcdFx0XHRcdFx0LnN0eWxlKFwib3BhY2l0eVwiLDApXG5cdFx0XHRcdFx0XHQuY2xhc3NlZChcInVpLXNob3ctaGlkZVwiLGZhbHNlKTtcblx0XHRcdFx0XHRcdGNvbnRyb2xzLnNlbGVjdChcIi5oaWRlXCIpXG5cdFx0XHRcdFx0XHQuc3R5bGUoXCJvcGFjaXR5XCIsMSlcblx0XHRcdFx0XHRcdC5jbGFzc2VkKFwidWktc2hvdy1oaWRlXCIsdHJ1ZSk7XG5cdFx0XHRcdFx0XHRjb250cm9scy5zZWxlY3RBbGwoXCJwYXRoLnVpLXNob3ctaGlkZVwiKVxuXHRcdFx0XHRcdFx0LnN0eWxlKFwib3BhY2l0eVwiLDAuNSk7XG5cdFx0XHRcdFx0fSk7XHRcdFx0XHRcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRcdGNvbnRyb2xzLmFwcGVuZChcInJlY3RcIilcblx0XHRcdC5hdHRyKFwieFwiLDEwKVxuXHRcdFx0LmF0dHIoXCJ5XCIsMClcblx0XHRcdC5hdHRyKFwid2lkdGhcIiwgODUpXG5cdFx0XHQuYXR0cihcImZpbGxcIiwgXCJyZ2JhKDIwNCwyMDQsMjA0LDAuOSlcIilcblx0XHRcdC5hdHRyKFwic3Ryb2tlXCIsIFwibm9uZVwiKTtcblxuXHRcdFx0Y29udHJvbHMuYXBwZW5kKFwiZ1wiKVxuXHRcdFx0LmF0dHIoXCJjbGFzc1wiLCBcImxheWVyLWNvbnRyb2xzXCIpXG5cdFx0XHQuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZSgxNSw1KVwiKTtcblx0XHR9KTtcblx0fVxuXG5cdHJldHVybiBtYXA7XG59O1xuIiwiLy9cbi8vICAgQ29weXJpZ2h0IDIwMTIgRGF2aWQgQ2lhcmxldHRhXG4vL1xuLy8gICBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuLy8gICB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4vLyAgIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vICAgVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuLy8gICBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4vLyAgIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuLy8gICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4vLyAgIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuLy9cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGhlYXRtYXAoKSB7XG5cdHZhciBjb2xvcnMgPSBcIlJkWWxCdVwiLFxuXHRzY2FsZVR5cGUgPSBcInF1YW50aWxlXCIsXG5cdHggPSBkMy5zY2FsZS5saW5lYXIoKSxcblx0eSA9IGQzLnNjYWxlLmxpbmVhcigpLFxuXHRsaW5lID0gZDMuc3ZnLmxpbmUoKVxuXHRcdC54KGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHgoZC54KTsgfSlcblx0XHQueShmdW5jdGlvbihkKSB7IHJldHVybiB5KGQueSk7IH0pLFxuXHRmb3JtYXQgPSBkMy5mb3JtYXQoXCIuNG5cIiksXG5cdGlkID0gXCJmcC1oZWF0bWFwLVwiICsgbmV3IERhdGUoKS52YWx1ZU9mKCksXG5cdG5hbWUgPSBcImhlYXRtYXBcIjtcblxuXHRmdW5jdGlvbiBoZWF0bWFwKGcpIHtcblx0XHRnLmVhY2goZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0aWYgKCEgZGF0YSB8fCAhIGRhdGEubWFwKSByZXR1cm47XG5cdFx0XHR2YXIgZyA9IGQzLnNlbGVjdCh0aGlzKTtcblx0XHRcdFxuXHRcdFx0aWYgKCEgZGF0YS51bml0cykge1xuXHRcdFx0XHRkYXRhLnVuaXRzID0gXCJcIjtcblx0XHRcdH0gZWxzZSBpZiAoZGF0YS51bml0cy5jaGFyQXQoMCkgIT0gJyAnKSB7XG5cdFx0XHRcdGRhdGEudW5pdHMgPSBcIiBcIiArIGRhdGEudW5pdHM7XG5cdFx0XHR9XG5cblx0XHRcdHZhciB2YWx1ZXMgPSBkYXRhLm1hcC5tYXAoZnVuY3Rpb24oZCkge3JldHVybiBkLnZhbHVlO30pXG5cdFx0XHRcdFx0XHRcdC5zb3J0KGQzLmFzY2VuZGluZyksXG5cdFx0XHRcdGNvbG9yU2NhbGUsIHRocmVzaG9sZHM7XG5cdFx0XHRcblx0XHRcdHN3aXRjaCAoc2NhbGVUeXBlKSB7XG5cdFx0XHQgIGNhc2UgXCJxdWFudGlsZVwiOiB7XG5cdFx0XHRcdGNvbG9yU2NhbGUgPSBkMy5zY2FsZS5xdWFudGlsZSgpXG5cdFx0XHRcdFx0XHRcdC5yYW5nZShbMSwyLDMsNCw1LDZdKVxuXHRcdFx0XHRcdFx0XHQuZG9tYWluKHZhbHVlcyk7XG5cdFx0XHRcdHRocmVzaG9sZHMgPSBjb2xvclNjYWxlLnF1YW50aWxlcygpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdCAgfVxuXHRcdFx0ICBjYXNlIFwicXVhbnRpemVkXCI6IHtcblx0XHRcdFx0Y29sb3JTY2FsZSA9IGQzLnNjYWxlLnF1YW50aXplKClcblx0XHRcdFx0XHRcdFx0LnJhbmdlKFsxLDIsMyw0LDUsNl0pXG5cdFx0XHRcdFx0XHRcdC5kb21haW4oW3ZhbHVlc1swXSx2YWx1ZXNbdmFsdWVzLmxlbmd0aC0xXV0pO1xuXHRcdFx0XHR2YXIgaW5jciA9IChjb2xvclNjYWxlLmRvbWFpbigpWzFdIC0gY29sb3JTY2FsZS5kb21haW4oKVswXSkgLyA2O1xuXHRcdFx0XHR0aHJlc2hvbGRzID0gW2luY3IsIDIqaW5jciwgMyppbmNyLCA0KmluY3IsIDUqaW5jcl07XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0ICB9IFxuXHRcdFx0ICBjYXNlIFwibm9ybWFsXCI6IHtcblx0XHRcdFx0dmFyIG1lYW4gPSBkMy5tZWFuKHZhbHVlcyk7XG5cdFx0XHRcdHZhciBzaWdtYSA9IE1hdGguc3FydChkMy5zdW0odmFsdWVzLCBcblx0XHRcdFx0XHRcdGZ1bmN0aW9uKHYpIHtyZXR1cm4gTWF0aC5wb3codi1tZWFuLDIpO30pIC92YWx1ZXMubGVuZ3RoKTtcblx0XHRcdFx0Y29sb3JTY2FsZSA9IGQzLnNjYWxlLnF1YW50aWxlKClcblx0XHRcdFx0XHRcdFx0LnJhbmdlKFsxLDIsMyw0LDUsNl0pXG5cdFx0XHRcdFx0XHRcdC5kb21haW4oW21lYW4tNipzaWdtYSxtZWFuLTIqc2lnbWEsXG5cdFx0XHRcdFx0XHRcdCAgICAgICAgIG1lYW4tc2lnbWEsbWVhbixtZWFuK3NpZ21hLFxuXHRcdFx0XHRcdFx0XHQgICAgICAgICBtZWFuKzIqc2lnbWEsbWVhbis2KnNpZ21hXSk7XG5cdFx0XHRcdHRocmVzaG9sZHMgPSBjb2xvclNjYWxlLnF1YW50aWxlcygpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdCAgfSBcblx0XHRcdCAgZGVmYXVsdDogeyAvLyBjdXN0b21cblx0XHRcdFx0aWYgKCEgY3VzdG9tVGhyZXNob2xkcykgY3VzdG9tVGhyZXNob2xkcyA9IHRocmVzaG9sZHM7XG5cdFx0XHRcdHZhciBkb21haW4gPSBjdXN0b21UaHJlc2hvbGRzO1xuXHRcdFx0XHRkb21haW4ucHVzaChkb21haW5bZG9tYWluLmxlbmd0aC0xXSk7XG5cdFx0XHRcdGRvbWFpbi51bnNoaWZ0KGRvbWFpblswXSk7XG5cdFx0XHRcdGNvbG9yU2NhbGUgPSBkMy5zY2FsZS5xdWFudGlsZSgpXG5cdFx0XHRcdFx0XHRcdC5yYW5nZShbMSwyLDMsNCw1LDZdKVxuXHRcdFx0XHRcdFx0XHQuZG9tYWluKGRvbWFpbik7XG5cdFx0XHRcdGN1c3RvbVRocmVzaG9sZHMgPSB0aHJlc2hvbGRzID0gY29sb3JTY2FsZS5xdWFudGlsZXMoKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHQgIH1cblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0Ly8gc2V0dXAgY29udGFpbmVyIGZvciB2aXN1YWxpemF0aW9uXG5cdFx0XHR2YXIgdmlzID0gZy5zZWxlY3RBbGwoXCJnLmhlYXRtYXBcIikuZGF0YShbMF0pO1xuXHRcdFx0dmlzLmVudGVyKCkuYXBwZW5kKFwiZ1wiKS5hdHRyKFwiY2xhc3NcIixcImhlYXRtYXBcIik7XG5cdFx0XHRcblx0XHRcdGlmICh0aGlzLl9fY29sb3JzX18gJiYgdGhpcy5fX2NvbG9yc19fICE9IGNvbG9ycykge1xuXHRcdFx0XHR2aXMuY2xhc3NlZCh0aGlzLl9fY29sb3JzX18sIGZhbHNlKTtcblx0XHRcdH1cblx0XHRcdHZpcy5jbGFzc2VkKGNvbG9ycywgdHJ1ZSk7XG5cdFx0XHR0aGlzLl9fY29sb3JzX18gPSBjb2xvcnM7XG5cdFx0XHRcdFxuXHRcdFx0dmFyIGNlbGxzID0gdmlzLnNlbGVjdEFsbChcInJlY3RcIilcblx0XHRcdFx0LmRhdGEoZGF0YS5tYXAuZmlsdGVyKGZ1bmN0aW9uKGQpIHsgcmV0dXJuICEgZC5wb2ludHM7IH0pLCBcblx0XHRcdFx0XHRcdGZ1bmN0aW9uKGQpe3JldHVybiBkLnggKyBcIixcIiArIGQueTt9KSxcblx0XHRcdGNlbGxzRW50ZXIgPSBjZWxscy5lbnRlcigpLmFwcGVuZChcInJlY3RcIikuc3R5bGUoXCJvcGFjaXR5XCIsIDFlLTYpO1xuXHRcdFx0XG5cdFx0XHRjZWxscy5leGl0KCkudHJhbnNpdGlvbigpLnN0eWxlKFwib3BhY2l0eVwiLCAxZS02KS5yZW1vdmUoKTtcblx0XHRcdFxuXHRcdFx0Y2VsbHNFbnRlci5hcHBlbmQoXCJ0aXRsZVwiKTtcblx0XHRcdFxuXHRcdFx0Y2VsbHMuYXR0cihcInhcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4geChkLngpOyB9KVxuXHRcdFx0LmF0dHIoXCJ5XCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHkoZC55KTsgfSlcblx0XHRcdC5hdHRyKFwiaGVpZ2h0XCIsIE1hdGguYWJzKHkoZGF0YS5iaW5TaXplKSAtIHkoMCkpKVxuXHRcdFx0LmF0dHIoXCJ3aWR0aFwiLCBNYXRoLmFicyh4KGRhdGEuYmluU2l6ZSkgLSB4KDApKSlcblx0XHRcdC5hdHRyKFwiY2xhc3NcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gXCJkNi1cIitjb2xvclNjYWxlKGQudmFsdWUpOyB9KVxuXHRcdFx0XHQuc2VsZWN0KFwidGl0bGVcIilcblx0XHQgIFx0XHQudGV4dChmdW5jdGlvbihkKSB7IFxuXHRcdCAgXHRcdFx0cmV0dXJuIFwidmFsdWU6IFwiICsgZm9ybWF0KGQudmFsdWUpICsgZGF0YS51bml0czsgXG5cdFx0ICBcdFx0fSk7XG5cdFx0XHRcblx0XHRcdGNlbGxzRW50ZXIudHJhbnNpdGlvbigpLnN0eWxlKFwib3BhY2l0eVwiLCAwLjYpO1xuXHRcdFx0XG5cdFx0XHR2YXIgYXJlYXMgPSB2aXMuc2VsZWN0QWxsKFwicGF0aFwiKVxuXHRcdFx0XHQuZGF0YShkYXRhLm1hcC5maWx0ZXIoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5wb2ludHM7IH0pLCBcblx0XHRcdFx0XHRcdGZ1bmN0aW9uKGQpIHsgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGQucG9pbnRzKTsgfSksXG5cdFx0XHRhcmVhc0VudGVyID0gYXJlYXMuZW50ZXIoKS5hcHBlbmQoXCJwYXRoXCIpXG5cdFx0XHQuYXR0cihcImRcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gbGluZShkLnBvaW50cykgKyBcIlpcIjsgfSlcblx0XHRcdC5zdHlsZShcIm9wYWNpdHlcIiwgMWUtNik7XG5cdFx0XHRcblx0XHRcdGFyZWFzLmV4aXQoKS50cmFuc2l0aW9uKCkuc3R5bGUoXCJvcGFjaXR5XCIsIDFlLTYpLnJlbW92ZSgpO1xuXHRcdFx0YXJlYXNFbnRlci5hcHBlbmQoXCJ0aXRsZVwiKTtcblx0XHRcdFxuXHRcdFx0YXJlYXNcblx0XHRcdC5hdHRyKFwiY2xhc3NcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gXCJkNi1cIitjb2xvclNjYWxlKGQudmFsdWUpOyB9KVxuXHRcdFx0XHQuc2VsZWN0KFwidGl0bGVcIilcblx0XHRcdFx0XHQudGV4dChmdW5jdGlvbihkKSB7IFxuXHRcdFx0XHRcdFx0cmV0dXJuIFwidmFsdWU6IFwiICsgZm9ybWF0KGQudmFsdWUpICsgZGF0YS51bml0czsgXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRhcmVhc0VudGVyLnRyYW5zaXRpb24oKS5zdHlsZShcIm9wYWNpdHlcIiwwLjYpO1xuXHRcdFxuXHRcdFx0dmFyIGFyZWFMYWJlbHMgPSB2aXMuc2VsZWN0QWxsKFwidGV4dFwiKVxuXHRcdFx0XHQuZGF0YShkYXRhLm1hcC5maWx0ZXIoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5wb2ludHM7IH0pLCBcblx0XHRcdFx0XHRcdGZ1bmN0aW9uKGQpIHsgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGQucG9pbnRzKTsgfSksXG5cdFx0XHRhcmVhTGFiZWxzRW50ZXIgPSBhcmVhTGFiZWxzLmVudGVyKCkuYXBwZW5kKFwidGV4dFwiKVxuXHRcdFx0XHRcdFx0XHRcdC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsIFwiYm9sZFwiKVxuXHRcdFx0XHRcdFx0XHRcdC5hdHRyKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIilcblx0XHRcdFx0XHRcdFx0XHQuc3R5bGUoXCJvcGFjaXR5XCIsMWUtNik7XG5cdFx0XHRcblx0XHRcdGFyZWFMYWJlbHMuZXhpdCgpLnRyYW5zaXRpb24oKS5zdHlsZShcIm9wYWNpdHlcIiwxZS02KS5yZW1vdmUoKTtcblx0XHRcdFxuXHRcdFx0YXJlYUxhYmVscy5hdHRyKFwidHJhbnNmb3JtXCIsIGZ1bmN0aW9uKGQpIHsgXG5cdFx0XHRcdFx0dmFyIGNlbnRlciA9IHt4OjAseTowfTtcblx0XHRcdFx0XHR2YXIgYXJlYSA9IDA7XG5cdFx0XHRcdFx0Zm9yICh2YXIgaT0wOyBpPGQucG9pbnRzLmxlbmd0aDsgKytpKSB7XG5cdFx0XHRcdFx0XHR2YXIgcDEgPSBkLnBvaW50c1tpXTtcblx0XHRcdFx0XHRcdHZhciBwMiA9IGQucG9pbnRzW2krMV0gfHwgZC5wb2ludHNbMF07XG5cdFx0XHRcdFx0XHR2YXIgYWkgPSAocDEueCpwMi55IC0gcDIueCpwMS55KTtcblx0XHRcdFx0XHRcdGNlbnRlci54ICs9IChwMS54ICsgcDIueCkqYWk7XG5cdFx0XHRcdFx0XHRjZW50ZXIueSArPSAocDEueSArIHAyLnkpKmFpO1xuXHRcdFx0XHRcdFx0YXJlYSArPSBhaTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0YXJlYSA9IGFyZWEgLyAyO1xuXHRcdFx0XHRcdGNlbnRlci54ID0gY2VudGVyLngvKDYqYXJlYSk7XG5cdFx0XHRcdFx0Y2VudGVyLnkgPSBjZW50ZXIueS8oNiphcmVhKTtcblx0XHRcdFx0XHRyZXR1cm4gXCJ0cmFuc2xhdGUoXCIgKyB4KGNlbnRlci54KSArIFwiLFwiIFxuXHRcdFx0XHRcdFx0XHRcdFx0XHQrIHkoY2VudGVyLnkpICsgXCIpXCI7XG5cdFx0XHRcdH0pXG5cdFx0XHQudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBmb3JtYXQoZC52YWx1ZSkgKyBkYXRhLnVuaXRzOyB9KTtcblx0XHRcdFxuXHRcdFx0YXJlYUxhYmVsc0VudGVyLnRyYW5zaXRpb24oKS5zdHlsZShcIm9wYWNpdHlcIiwwLjYpO1xuXHRcdH0pO1xuXHR9XG5cdFxuXHRoZWF0bWFwLnhTY2FsZSA9IGZ1bmN0aW9uKHNjYWxlKSB7XG5cdFx0aWYgKCEgYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHg7XG5cdFx0eCA9IHNjYWxlO1xuXHRcdHJldHVybiBoZWF0bWFwO1xuXHR9O1xuXHRcblx0aGVhdG1hcC55U2NhbGUgPSBmdW5jdGlvbihzY2FsZSkge1xuXHRcdGlmICghIGFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB5O1xuXHRcdHkgPSBzY2FsZTtcblx0XHRyZXR1cm4gaGVhdG1hcDtcblx0fTtcblx0XG5cdGhlYXRtYXAuY29sb3JTZXQgPSBmdW5jdGlvbihzY2FsZU5hbWUpIHtcblx0XHRpZiAoISBhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gY29sb3JzO1xuXHRcdGNvbG9ycyA9IHNjYWxlTmFtZTtcblx0XHRyZXR1cm4gaGVhdG1hcDtcblx0fTtcblx0XG5cdGhlYXRtYXAuY29sb3JNb2RlID0gZnVuY3Rpb24obW9kZSkge1xuXHRcdGlmICghIGFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBzY2FsZVR5cGU7XG5cdFx0c2NhbGVUeXBlID0gbW9kZTtcblx0XHRyZXR1cm4gaGVhdG1hcDtcblx0fTtcblx0XG5cdGhlYXRtYXAuY3VzdG9tVGhyZXNob2xkcyA9IGZ1bmN0aW9uKHZhbHMpIHtcblx0XHRpZiAoISBhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gY3VzdG9tVGhyZXNob2xkcztcblx0XHRjdXN0b21UaHJlc2hvbGRzID0gdmFscztcblx0XHRyZXR1cm4gaGVhdG1hcDtcblx0fTtcblx0XG5cdGhlYXRtYXAuaWQgPSBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gaWQ7XG5cdH07XG5cdFxuXHRoZWF0bWFwLnRpdGxlID0gZnVuY3Rpb24obikge1xuXHRcdGlmICghIGFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBuYW1lO1xuXHRcdG5hbWUgPSBuO1xuXHRcdHJldHVybiBoZWF0bWFwO1xuXHR9O1xuXHRcblx0cmV0dXJuIGhlYXRtYXA7XG59OyIsIi8vXG4vLyAgIENvcHlyaWdodCAyMDEyIERhdmlkIENpYXJsZXR0YVxuLy9cbi8vICAgTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbi8vICAgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuLy8gICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyAgIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbi8vICAgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuLy8gICBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbi8vICAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuLy8gICBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbi8vXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGltYWdlbGF5ZXIoKSB7XG5cdHZhciB4ID0gZDMuc2NhbGUubGluZWFyKCksXG5cdHkgPSBkMy5zY2FsZS5saW5lYXIoKSxcblx0aWQgPSBcImZwLWltYWdlbGF5ZXItXCIgKyBuZXcgRGF0ZSgpLnZhbHVlT2YoKSxcblx0bmFtZSA9IFwiaW1hZ2VsYXllclwiO1xuXHRcblx0ZnVuY3Rpb24gaW1hZ2VzKGcpIHtcblx0XHRnLmVhY2goZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0aWYgKCEgZGF0YSkgcmV0dXJuO1xuXHRcdFx0dmFyIGcgPSBkMy5zZWxlY3QodGhpcyk7XG5cdFx0XHRcblx0XHRcdHZhciBpbWdzID0gZy5zZWxlY3RBbGwoXCJpbWFnZVwiKVxuXHRcdFx0XHRcdFx0LmRhdGEoZGF0YSwgZnVuY3Rpb24oaW1nKSB7cmV0dXJuIGltZy51cmw7fSk7XG5cdFx0XHRcblx0XHRcdGltZ3MuZW50ZXIoKS5hcHBlbmQoXCJpbWFnZVwiKVxuXHRcdFx0LmF0dHIoXCJ4bGluazpocmVmXCIsIGZ1bmN0aW9uKGltZykge3JldHVybiBpbWcudXJsO30pXG5cdFx0XHQuc3R5bGUoXCJvcGFjaXR5XCIsIDFlLTYpO1xuXHRcdFx0XG5cdFx0XHRpbWdzLmV4aXQoKS50cmFuc2l0aW9uKCkuc3R5bGUoXCJvcGFjaXR5XCIsMWUtNikucmVtb3ZlKCk7XG5cdFx0XHRcblx0XHRcdGltZ3MudHJhbnNpdGlvbigpXG5cdFx0XHQuYXR0cihcInhcIiwgZnVuY3Rpb24oaW1nKSB7cmV0dXJuIHgoaW1nLngpO30pXG5cdFx0XHQuYXR0cihcInlcIiwgZnVuY3Rpb24oaW1nKSB7cmV0dXJuIHkoaW1nLnkpO30pXG5cdFx0XHQuYXR0cihcImhlaWdodFwiLCBmdW5jdGlvbihpbWcpIHtcblx0XHRcdFx0cmV0dXJuIHkoaW1nLnkraW1nLmhlaWdodCkgLSB5KGltZy55KTtcblx0XHRcdH0pXG5cdFx0XHQuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uKGltZykge1xuXHRcdFx0XHRyZXR1cm4geChpbWcueCtpbWcud2lkdGgpIC0geChpbWcueCk7XG5cdFx0XHR9KVxuXHRcdFx0LnN0eWxlKFwib3BhY2l0eVwiLCBmdW5jdGlvbihpbWcpIHtcblx0XHRcdFx0cmV0dXJuIGltZy5vcGFjaXR5IHx8IDEuMDtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9XG5cdFxuXHRpbWFnZXMueFNjYWxlID0gZnVuY3Rpb24oc2NhbGUpIHtcblx0XHRpZiAoISBhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4geDtcblx0XHR4ID0gc2NhbGU7XG5cdFx0cmV0dXJuIGltYWdlcztcblx0fTtcblx0XG5cdGltYWdlcy55U2NhbGUgPSBmdW5jdGlvbihzY2FsZSkge1xuXHRcdGlmICghIGFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB5O1xuXHRcdHkgPSBzY2FsZTtcblx0XHRyZXR1cm4gaW1hZ2VzO1xuXHR9O1xuXG5cdGltYWdlcy5pZCA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiBpZDtcblx0fTtcblx0XG5cdGltYWdlcy50aXRsZSA9IGZ1bmN0aW9uKG4pIHtcblx0XHRpZiAoISBhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gbmFtZTtcblx0XHRuYW1lID0gbjtcblx0XHRyZXR1cm4gaW1hZ2VzO1xuXHR9O1xuXG5cdHJldHVybiBpbWFnZXM7XG59OyIsImltcG9ydCBmbG9vcnBsYW4gZnJvbSBcIi4vZmxvb3JwbGFuXCI7XG5pbXBvcnQgaGVhdG1hcCBmcm9tIFwiLi9oZWF0bWFwXCI7XG5pbXBvcnQgaW1hZ2VsYXllciBmcm9tIFwiLi9pbWFnZWxheWVyXCI7XG5pbXBvcnQgb3ZlcmxheXMgZnJvbSBcIi4vb3ZlcmxheXNcIjtcbmltcG9ydCBwYXRocGxvdCBmcm9tIFwiLi9wYXRocGxvdFwiO1xuaW1wb3J0IHZlY3RvcmZpZWxkIGZyb20gXCIuL3ZlY3RvcmZpZWxkXCI7XG5cbmlmICghd2luZG93LmQzKXtcbiAgdGhyb3cgbmV3IEVycm9yKFwiZDMuanMgaXMgcmVxdWlyZWQhID4gaHR0cDovL2QzanMub3JnL1wiKTtcbn1cblxubGV0IGQzID0gd2luZG93LmQzO1xuXG5kMy5mbG9vcnBsYW4gPSBmbG9vcnBsYW47XG5kMy5mbG9vcnBsYW4udmVyc2lvbiA9IHJlcXVpcmUoJy4uL3BhY2thZ2UuanNvbicpLnZlcnNpb247XG5cbmQzLmZsb29ycGxhbi5oZWF0bWFwID0gaGVhdG1hcDtcbmQzLmZsb29ycGxhbi5pbWFnZWxheWVyID0gaW1hZ2VsYXllcjtcbmQzLmZsb29ycGxhbi5vdmVybGF5cyA9IG92ZXJsYXlzO1xuZDMuZmxvb3JwbGFuLnBhdGhwbG90ID0gcGF0aHBsb3Q7XG5kMy5mbG9vcnBsYW4udmVjdG9yZmllbGQgPSB2ZWN0b3JmaWVsZDtcblxuZXhwb3J0IHtcbiAgZmxvb3JwbGFuLFxuICBoZWF0bWFwLFxuICBpbWFnZWxheWVyLFxuICBvdmVybGF5cyxcbiAgcGF0aHBsb3QsXG4gIHZlY3RvcmZpZWxkXG59OyIsIi8vXG4vLyAgIENvcHlyaWdodCAyMDEyIERhdmlkIENpYXJsZXR0YVxuLy9cbi8vICAgTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbi8vICAgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuLy8gICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyAgIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbi8vICAgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuLy8gICBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbi8vICAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuLy8gICBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbi8vXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIG92ZXJsYXlzKCkge1xuXHR2YXIgeCA9IGQzLnNjYWxlLmxpbmVhcigpLFxuXHR5ID0gZDMuc2NhbGUubGluZWFyKCksXG5cdGlkID0gXCJmcC1vdmVybGF5cy1cIiArIG5ldyBEYXRlKCkudmFsdWVPZigpLFxuXHRuYW1lID0gXCJvdmVybGF5c1wiLFxuXHRjYW52YXNDYWxsYmFja3MgPSBbXSxcblx0c2VsZWN0Q2FsbGJhY2tzID0gW10sXG5cdG1vdmVDYWxsYmFja3MgPSBbXSxcblx0ZWRpdE1vZGUgPSBmYWxzZSxcblx0bGluZSA9IGQzLnN2Zy5saW5lKClcblx0XHQueChmdW5jdGlvbihkKSB7IHJldHVybiB4KGQueCk7IH0pXG5cdFx0LnkoZnVuY3Rpb24oZCkgeyByZXR1cm4geShkLnkpOyB9KSxcblx0ZHJhZ0JlaGF2aW9yID0gZDMuYmVoYXZpb3IuZHJhZygpXG5cdFx0Lm9uKFwiZHJhZ3N0YXJ0XCIsIF9fZHJhZ0l0ZW0pXG5cdFx0Lm9uKFwiZHJhZ1wiLCBfX21vdXNlbW92ZSlcblx0XHQub24oXCJkcmFnZW5kXCIsIF9fbW91c2V1cCksXG5cdGRyYWdnZWQgPSBudWxsO1xuXHRcblx0ZnVuY3Rpb24gb3ZlcmxheXMoZykge1xuXHRcdGcuZWFjaChmdW5jdGlvbihkYXRhKXtcblx0XHRcdGlmICghIGRhdGEpIHJldHVybjtcblx0XHRcdHZhciBnID0gZDMuc2VsZWN0KHRoaXMpO1xuXHRcdFx0XG5cdFx0XHQvLyBzZXR1cCByZWN0YW5nbGUgZm9yIGNhcHR1cmluZyBldmVudHNcblx0XHRcdHZhciBjYW52YXMgPSBnLnNlbGVjdEFsbChcInJlY3Qub3ZlcmxheS1jYW52YXNcIikuZGF0YShbMF0pO1xuXHRcdFx0XG5cdFx0XHRjYW52YXMuZW50ZXIoKS5hcHBlbmQoXCJyZWN0XCIpXG5cdFx0XHQuYXR0cihcImNsYXNzXCIsIFwib3ZlcmxheS1jYW52YXNcIilcblx0XHRcdC5zdHlsZShcIm9wYWNpdHlcIiwgMClcblx0XHRcdC5hdHRyKFwicG9pbnRlci1ldmVudHNcIiwgXCJhbGxcIilcblx0XHRcdC5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRpZiAoZWRpdE1vZGUpIHtcblx0XHRcdFx0XHR2YXIgcCA9IGQzLm1vdXNlKHRoaXMpO1xuXHRcdFx0XHRcdGNhbnZhc0NhbGxiYWNrcy5mb3JFYWNoKGZ1bmN0aW9uKGNiKSB7XG5cdFx0XHRcdFx0XHRjYih4LmludmVydChwWzBdKSwgeS5pbnZlcnQocFsxXSkpO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KVxuXHRcdFx0Lm9uKFwibW91c2V1cC5kcmFnXCIsIF9fbW91c2V1cClcblx0XHRcdC5vbihcInRvdWNoZW5kLmRyYWdcIiwgX19tb3VzZXVwKTtcblx0XHRcdFxuXHRcdFx0Y2FudmFzLmF0dHIoXCJ4XCIsIHgucmFuZ2UoKVswXSlcblx0XHRcdC5hdHRyKFwieVwiLCB5LnJhbmdlKClbMF0pXG5cdFx0XHQuYXR0cihcImhlaWdodFwiLCB5LnJhbmdlKClbMV0gLSB5LnJhbmdlKClbMF0pXG5cdFx0XHQuYXR0cihcIndpZHRoXCIsIHgucmFuZ2UoKVsxXSAtIHgucmFuZ2UoKVswXSk7XG5cdFx0XHRcblx0XHRcdC8vIGRyYXcgcG9seWdvbnMgKGN1cnJlbnRseSBvbmx5IHR5cGUgc3VwcG9ydGVkKVxuXHRcdFx0dmFyIHBvbHlnb25zID0gZy5zZWxlY3RBbGwoXCJwYXRoLnBvbHlnb25cIilcblx0XHRcdFx0LmRhdGEoZGF0YS5wb2x5Z29ucyB8fCBbXSwgZnVuY3Rpb24oZCkge3JldHVybiBkLmlkO30pO1xuXHRcdFx0XG5cdFx0XHRwb2x5Z29ucy5lbnRlcigpLmFwcGVuZChcInBhdGhcIilcblx0XHRcdC5hdHRyKFwiY2xhc3NcIiwgXCJwb2x5Z29uXCIpXG5cdFx0XHQuYXR0cihcInZlY3Rvci1lZmZlY3RcIiwgXCJub24tc2NhbGluZy1zdHJva2VcIilcblx0XHRcdC5hdHRyKFwicG9pbnRlci1ldmVudHNcIiwgXCJhbGxcIilcblx0XHRcdC5vbihcIm1vdXNlZG93blwiLCBmdW5jdGlvbihkKSB7XG5cdFx0XHRcdHNlbGVjdENhbGxiYWNrcy5mb3JFYWNoKGZ1bmN0aW9uKGNiKSB7XG5cdFx0XHRcdFx0Y2IoZC5pZCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSlcblx0XHRcdC5jYWxsKGRyYWdCZWhhdmlvcilcblx0XHRcdC5hcHBlbmQoXCJ0aXRsZVwiKTtcblx0XHRcdFxuXHRcdFx0cG9seWdvbnMuZXhpdCgpLnRyYW5zaXRpb24oKS5zdHlsZShcIm9wYWNpdHlcIiwgMWUtNikucmVtb3ZlKCk7XG5cdFx0XHRcblx0XHRcdHBvbHlnb25zXG5cdFx0XHQuYXR0cihcImRcIiwgZnVuY3Rpb24oZCkge3JldHVybiBsaW5lKGQucG9pbnRzKSArIFwiWlwiO30pXG5cdFx0XHQuc3R5bGUoXCJjdXJzb3JcIiwgZWRpdE1vZGUgPyBcIm1vdmVcIiA6IFwicG9pbnRlclwiKVxuXHRcdFx0XHQuc2VsZWN0KFwidGl0bGVcIilcblx0XHRcdFx0LnRleHQoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5uYW1lIHx8IGQuaWQ7IH0pO1xuXHRcdFx0XG5cdFx0XHRpZiAoZWRpdE1vZGUpIHtcblx0XHRcdFx0dmFyIHBvaW50RGF0YSA9IFtdO1xuXHRcdFx0XHRpZiAoZGF0YS5wb2x5Z29ucykge1xuXHRcdFx0XHRcdGRhdGEucG9seWdvbnMuZm9yRWFjaChmdW5jdGlvbihwb2x5Z29uKSB7XG5cdFx0XHRcdFx0XHRwb2x5Z29uLnBvaW50cy5mb3JFYWNoKGZ1bmN0aW9uKHB0LCBpKSB7XG5cdFx0XHRcdFx0XHRcdHBvaW50RGF0YS5wdXNoKHtcImluZGV4XCI6aSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcInBhcmVudFwiOnBvbHlnb259KTtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHQvLyBkZXRlcm1pbmUgY3VycmVudCB2aWV3IHNjYWxlIHRvIG1ha2UgYXBwcm9wcmlhdGVseVxuXHRcdFx0XHQvLyBzaXplZCBwb2ludHMgdG8gZHJhZ1xuXHRcdFx0XHR2YXIgc2NhbGUgPSAxO1xuXHRcdFx0XHR2YXIgbm9kZSA9IGcubm9kZSgpO1xuXHRcdFx0XHR3aGlsZSAobm9kZS5wYXJlbnROb2RlKSB7XG5cdFx0XHRcdFx0bm9kZSA9IG5vZGUucGFyZW50Tm9kZTtcblx0XHRcdFx0XHRpZiAobm9kZS5fX3NjYWxlX18pIHtcblx0XHRcdFx0XHRcdHNjYWxlID0gbm9kZS5fX3NjYWxlX187XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdHZhciBwb2ludHMgPSBnLnNlbGVjdEFsbChcImNpcmNsZS52ZXJ0ZXhcIilcblx0XHRcdFx0LmRhdGEocG9pbnREYXRhLCBmdW5jdGlvbihkKSB7cmV0dXJuIGQucGFyZW50LmlkICsgXCItXCIgKyBkLmluZGV4O30pO1xuXHRcdFx0XHRcblx0XHRcdFx0cG9pbnRzLmV4aXQoKS50cmFuc2l0aW9uKClcblx0XHRcdFx0LmF0dHIoXCJyXCIsIDFlLTYpLnJlbW92ZSgpO1xuXHRcdFx0XHRcblx0XHRcdFx0cG9pbnRzLmVudGVyKCkuYXBwZW5kKFwiY2lyY2xlXCIpXG5cdFx0XHRcdC5hdHRyKFwiY2xhc3NcIiwgXCJ2ZXJ0ZXhcIilcblx0XHRcdFx0LmF0dHIoXCJwb2ludGVyLWV2ZW50c1wiLCBcImFsbFwiKVxuXHRcdFx0XHQuYXR0cihcInZlY3Rvci1lZmZlY3RcIiwgXCJub24tc2NhbGluZy1zdHJva2VcIilcblx0XHRcdFx0LnN0eWxlKFwiY3Vyc29yXCIsIFwibW92ZVwiKVxuXHRcdFx0XHQuYXR0cihcInJcIiwgMWUtNilcblx0XHRcdFx0LmNhbGwoZHJhZ0JlaGF2aW9yKTtcblx0XHRcdFx0XG5cdFx0XHRcdHBvaW50c1xuXHRcdFx0XHQuYXR0cihcImN4XCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHgoZC5wYXJlbnQucG9pbnRzW2QuaW5kZXhdLngpOyB9KVxuXHRcdFx0XHQuYXR0cihcImN5XCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHkoZC5wYXJlbnQucG9pbnRzW2QuaW5kZXhdLnkpOyB9KVxuXHRcdFx0XHQuYXR0cihcInJcIiwgNC9zY2FsZSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRnLnNlbGVjdEFsbChcImNpcmNsZS52ZXJ0ZXhcIikudHJhbnNpdGlvbigpXG5cdFx0XHRcdC5hdHRyKFwiclwiLCAxZS02KS5yZW1vdmUoKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdG92ZXJsYXlzLnhTY2FsZSA9IGZ1bmN0aW9uKHNjYWxlKSB7XG5cdFx0aWYgKCEgYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHg7XG5cdFx0eCA9IHNjYWxlO1xuXHRcdHJldHVybiBvdmVybGF5cztcblx0fTtcblx0XG5cdG92ZXJsYXlzLnlTY2FsZSA9IGZ1bmN0aW9uKHNjYWxlKSB7XG5cdFx0aWYgKCEgYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHk7XG5cdFx0eSA9IHNjYWxlO1xuXHRcdHJldHVybiBvdmVybGF5cztcblx0fTtcblxuXHRvdmVybGF5cy5pZCA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiBpZDtcblx0fTtcblx0XG5cdG92ZXJsYXlzLnRpdGxlID0gZnVuY3Rpb24obikge1xuXHRcdGlmICghIGFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBuYW1lO1xuXHRcdG5hbWUgPSBuO1xuXHRcdHJldHVybiBvdmVybGF5cztcblx0fTtcblx0XG5cdG92ZXJsYXlzLmVkaXRNb2RlID0gZnVuY3Rpb24oZW5hYmxlKSB7XG5cdFx0aWYgKCEgYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGVkaXRNb2RlO1xuXHRcdGVkaXRNb2RlID0gZW5hYmxlO1xuXHRcdHJldHVybiBvdmVybGF5cztcblx0fTtcblx0XG5cdG92ZXJsYXlzLnJlZ2lzdGVyQ2FudmFzQ2FsbGJhY2sgPSBmdW5jdGlvbihjYikge1xuXHRcdGlmIChhcmd1bWVudHMubGVuZ3RoKSBjYW52YXNDYWxsYmFja3MucHVzaChjYik7XG5cdFx0cmV0dXJuIG92ZXJsYXlzO1xuXHR9O1xuXHRcblx0b3ZlcmxheXMucmVnaXN0ZXJTZWxlY3RDYWxsYmFjayA9IGZ1bmN0aW9uKGNiKSB7XG5cdFx0aWYgKGFyZ3VtZW50cy5sZW5ndGgpIHNlbGVjdC5DYWxsYmFja3MucHVzaChjYik7XG5cdFx0cmV0dXJuIG92ZXJsYXlzO1xuXHR9O1xuXHRcblx0b3ZlcmxheXMucmVnaXN0ZXJNb3ZlQ2FsbGJhY2sgPSBmdW5jdGlvbihjYikge1xuXHRcdGlmIChhcmd1bWVudHMubGVuZ3RoKSBtb3ZlQ2FsbGJhY2tzLnB1c2goY2IpO1xuXHRcdHJldHVybiBvdmVybGF5cztcblx0fTtcblx0XG5cdGZ1bmN0aW9uIF9fZHJhZ0l0ZW0oZCkge1xuXHRcdGlmIChlZGl0TW9kZSkgZHJhZ2dlZCA9IGQ7XG5cdH1cblx0XG5cdGZ1bmN0aW9uIF9fbW91c2Vtb3ZlKCkge1xuXHRcdGlmIChkcmFnZ2VkKSB7XG5cdFx0XHR2YXIgZHggPSB4LmludmVydChkMy5ldmVudC5keCkgLSB4LmludmVydCgwKTtcblx0XHRcdHZhciBkeSA9IHkuaW52ZXJ0KGQzLmV2ZW50LmR5KSAtIHkuaW52ZXJ0KDApO1xuXHRcdFx0aWYgKGRyYWdnZWQucGFyZW50KSB7IC8vIGEgcG9pbnRcblx0XHRcdFx0ZHJhZ2dlZC5wYXJlbnQucG9pbnRzW2RyYWdnZWQuaW5kZXhdLnggKz0gZHg7XG5cdFx0XHRcdGRyYWdnZWQucGFyZW50LnBvaW50c1tkcmFnZ2VkLmluZGV4XS55ICs9IGR5O1xuXHRcdFx0fSBlbHNlIGlmIChkcmFnZ2VkLnBvaW50cykgeyAvLyBhIGNvbXBvc2l0ZSBvYmplY3Rcblx0XHRcdFx0ZHJhZ2dlZC5wb2ludHMuZm9yRWFjaChmdW5jdGlvbihwdCkge1xuXHRcdFx0XHRcdHB0LnggKz0gZHg7XG5cdFx0XHRcdFx0cHQueSArPSBkeTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHQvLyBwYXJlbnQgaXMgY29udGFpbmVyIGZvciBvdmVybGF5c1xuXHRcdFx0b3ZlcmxheXMoZDMuc2VsZWN0KHRoaXMucGFyZW50Tm9kZSkpO1xuXHRcdH1cblx0fVxuXHRcblx0ZnVuY3Rpb24gX19tb3VzZXVwKCkge1xuXHRcdGlmIChkcmFnZ2VkKSB7XG5cdFx0XHRtb3ZlQ2FsbGJhY2tzLmZvckVhY2goZnVuY3Rpb24oY2IpIHtcblx0XHRcdFx0ZHJhZ2dlZC5wYXJlbnQgPyBjYihkcmFnZ2VkLnBhcmVudC5pZCwgZHJhZ2dlZC5wYXJlbnQucG9pbnRzLCBkcmFnZ2VkLmluZGV4KSA6XG5cdFx0XHRcdFx0Y2IoZHJhZ2dlZC5pZCwgZHJhZ2dlZC5wb2ludHMpO1xuXHRcdFx0fSk7XG5cdFx0XHRkcmFnZ2VkID0gbnVsbDtcblx0XHR9XG5cdH1cblx0XG5cdHJldHVybiBvdmVybGF5cztcbn07IiwiLy9cbi8vICAgQ29weXJpZ2h0IDIwMTIgRGF2aWQgQ2lhcmxldHRhXG4vL1xuLy8gICBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuLy8gICB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4vLyAgIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vICAgVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuLy8gICBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4vLyAgIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuLy8gICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4vLyAgIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuLy9cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcGF0aHBsb3QoKSB7XG5cdHZhciB4ID0gZDMuc2NhbGUubGluZWFyKCksXG5cdHkgPSBkMy5zY2FsZS5saW5lYXIoKSxcblx0bGluZSA9IGQzLnN2Zy5saW5lKClcblx0XHQueChmdW5jdGlvbihkKSB7IHJldHVybiB4KGQueCk7IH0pXG5cdFx0LnkoZnVuY3Rpb24oZCkgeyByZXR1cm4geShkLnkpOyB9KSxcblx0aWQgPSBcImZwLXBhdGhwbG90LVwiICsgbmV3IERhdGUoKS52YWx1ZU9mKCksXG5cdG5hbWUgPSBcInBhdGhwbG90XCIsXG5cdHBvaW50RmlsdGVyID0gZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5wb2ludHM7IH07XG5cdFxuXHRmdW5jdGlvbiBwYXRocGxvdChnKSB7XG5cdFx0Zy5lYWNoKGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdGlmICghZGF0YSkgcmV0dXJuO1xuXHRcdFx0XG5cdFx0XHR2YXIgZyA9IGQzLnNlbGVjdCh0aGlzKSxcblx0XHRcdHBhdGhzID0gZy5zZWxlY3RBbGwoXCJwYXRoXCIpXG5cdFx0XHRcdC5kYXRhKGRhdGEsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuaWQ7IH0pO1xuXHRcdFx0XG5cdFx0XHRwYXRocy5leGl0KCkudHJhbnNpdGlvbigpXG5cdFx0XHQuc3R5bGUoXCJvcGFjaXR5XCIsIDFlLTYpLnJlbW92ZSgpO1xuXHRcdFx0XG5cdFx0XHRwYXRocy5lbnRlcigpLmFwcGVuZChcInBhdGhcIilcblx0XHRcdC5hdHRyKFwidmVjdG9yLWVmZmVjdFwiLCBcIm5vbi1zY2FsaW5nLXN0cm9rZVwiKVxuXHRcdFx0LmF0dHIoXCJmaWxsXCIsIFwibm9uZVwiKVxuXHRcdFx0LnN0eWxlKFwib3BhY2l0eVwiLCAxZS02KVxuXHRcdFx0XHQuYXBwZW5kKFwidGl0bGVcIik7XG5cdFx0XHRcblx0XHRcdHBhdGhzXG5cdFx0XHQuYXR0cihcImNsYXNzXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuY2xhc3NlcyB8fCBkLmlkOyB9KVxuXHRcdFx0LmF0dHIoXCJkXCIsIGZ1bmN0aW9uKGQsaSkgeyByZXR1cm4gbGluZShwb2ludEZpbHRlcihkLGkpKTsgfSlcblx0XHRcdFx0LnNlbGVjdChcInRpdGxlXCIpXG5cdFx0XHRcdC50ZXh0KGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudGl0bGUgfHwgZC5pZDsgfSk7XG5cdFx0XHRcblx0XHRcdHBhdGhzLnRyYW5zaXRpb24oKS5zdHlsZShcIm9wYWNpdHlcIiwgMSk7XG5cdFx0fSk7XG5cdH1cblx0XG5cdHBhdGhwbG90LnhTY2FsZSA9IGZ1bmN0aW9uKHNjYWxlKSB7XG5cdFx0aWYgKCEgYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHg7XG5cdFx0eCA9IHNjYWxlO1xuXHRcdHJldHVybiBwYXRocGxvdDtcblx0fTtcblx0XG5cdHBhdGhwbG90LnlTY2FsZSA9IGZ1bmN0aW9uKHNjYWxlKSB7XG5cdFx0aWYgKCEgYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHk7XG5cdFx0eSA9IHNjYWxlO1xuXHRcdHJldHVybiBwYXRocGxvdDtcblx0fTtcblxuXHRwYXRocGxvdC5pZCA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiBpZDtcblx0fTtcblx0XG5cdHBhdGhwbG90LnRpdGxlID0gZnVuY3Rpb24obikge1xuXHRcdGlmICghIGFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBuYW1lO1xuXHRcdG5hbWUgPSBuO1xuXHRcdHJldHVybiBwYXRocGxvdDtcblx0fTtcblxuXHRwYXRocGxvdC5wb2ludEZpbHRlciA9IGZ1bmN0aW9uKGZuKSB7XG5cdFx0aWYgKCEgYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHBvaW50RmlsdGVyO1xuXHRcdHBvaW50RmlsdGVyID0gZm47XG5cdFx0cmV0dXJuIHBhdGhwbG90O1xuXHR9O1xuXHRcblx0cmV0dXJuIHBhdGhwbG90O1xufTsiLCIvL1xuLy8gICBDb3B5cmlnaHQgMjAxMiBEYXZpZCBDaWFybGV0dGFcbi8vXG4vLyAgIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4vLyAgIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbi8vICAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gICBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4vLyAgIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbi8vICAgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4vLyAgIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbi8vICAgbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4vL1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiB2ZWN0b3JmaWVsZCgpIHtcblx0dmFyIHggPSBkMy5zY2FsZS5saW5lYXIoKSxcblx0eSA9IGQzLnNjYWxlLmxpbmVhcigpLFxuXHRsaW5lID0gZDMuc3ZnLmxpbmUoKVxuXHRcdC54KGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHgoZC54KTsgfSlcblx0XHQueShmdW5jdGlvbihkKSB7IHJldHVybiB5KGQueSk7IH0pLFxuXHRpZCA9IFwiZnAtdmVjdG9yZmllbGQtXCIgKyBuZXcgRGF0ZSgpLnZhbHVlT2YoKSxcblx0bmFtZSA9IFwidmVjdG9yZmllbGRcIjtcblx0XG5cdGZ1bmN0aW9uIHZlY3RvcmZpZWxkKGcpIHtcblx0XHRnLmVhY2goZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0aWYgKCEgZGF0YSB8fCAhIGRhdGEubWFwKSByZXR1cm47XG5cdFx0XHRcblx0XHRcdHZhciBnID0gZDMuc2VsZWN0KHRoaXMpO1xuXHRcdFx0XG5cdFx0XHR2YXIgY2VsbHMgPSBnLnNlbGVjdEFsbChcInBhdGgudmVjdG9yXCIpXG5cdFx0XHRcdC5kYXRhKGRhdGEubWFwLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLngrXCIsXCIrZC55OyB9KTtcblx0XHRcdFxuXHRcdFx0Y2VsbHMuZXhpdCgpLnRyYW5zaXRpb24oKVxuXHRcdFx0LnN0eWxlKFwib3BhY2l0eVwiLCAxZS02KS5yZW1vdmUoKTtcblx0XHRcdFxuXHRcdFx0Y2VsbHMuZW50ZXIoKS5hcHBlbmQoXCJwYXRoXCIpXG5cdFx0XHQuYXR0cihcImNsYXNzXCIsIFwidmVjdG9yXCIpXG5cdFx0XHQuYXR0cihcInZlY3Rvci1lZmZlY3RcIiwgXCJub24tc2NhbGluZy1zdHJva2VcIilcblx0XHRcdC5zdHlsZShcIm9wYWNpdHlcIiwgMWUtNilcblx0XHRcdC5hcHBlbmQoXCJ0aXRsZVwiKTtcblx0XHRcdFxuXHRcdFx0dmFyIHNjYWxlRmFjdG9yID0gZGF0YS5iaW5TaXplLyAyIC9cblx0XHRcdGQzLm1heChkYXRhLm1hcCwgZnVuY3Rpb24oZCkge1xuXHRcdFx0XHRyZXR1cm4gTWF0aC5tYXgoTWF0aC5hYnMoZC52YWx1ZS54KSxNYXRoLmFicyhkLnZhbHVlLnkpKTtcblx0XHRcdH0pO1xuXHRcdFx0XG5cdFx0XHRjZWxscy5hdHRyKFwiZFwiLCBmdW5jdGlvbihkKSB7XG5cdFx0XHRcdHZhciB2MCA9IHt4OiAoZC54ICsgZGF0YS5iaW5TaXplLzIpLCBcblx0XHRcdFx0XHRcdCAgeTogKGQueSArIGRhdGEuYmluU2l6ZS8yKX07XG5cdFx0XHRcdHZhciB2MSA9IHt4OiAodjAueCArIGQudmFsdWUueCpzY2FsZUZhY3RvciksIFxuXHRcdFx0XHRcdFx0ICB5OiAodjAueSArIGQudmFsdWUueSpzY2FsZUZhY3Rvcil9O1xuXHRcdFx0XHRyZXR1cm4gbGluZShbdjAsdjFdKTtcblx0XHRcdH0pXG5cdFx0XHRcdC5zZWxlY3QoXCJ0aXRsZVwiKVxuXHRcdFx0XHQudGV4dChmdW5jdGlvbihkKSB7IFxuXHRcdFx0XHRcdHJldHVybiBNYXRoLnNxcnQoZC52YWx1ZS54KmQudmFsdWUueCArIGQudmFsdWUueSpkLnZhbHVlLnkpXG5cdFx0XHRcdFx0KyBcIiBcIiArIGRhdGEudW5pdHM7IFxuXHRcdFx0XHR9KTtcblx0XHRcdFxuXHRcdFx0Y2VsbHMudHJhbnNpdGlvbigpLnN0eWxlKFwib3BhY2l0eVwiLCAxKTtcblx0XHR9KTtcblx0fVxuXHRcblx0dmVjdG9yZmllbGQueFNjYWxlID0gZnVuY3Rpb24oc2NhbGUpIHtcblx0XHRpZiAoISBhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4geDtcblx0XHR4ID0gc2NhbGU7XG5cdFx0cmV0dXJuIHZlY3RvcmZpZWxkO1xuXHR9O1xuXHRcblx0dmVjdG9yZmllbGQueVNjYWxlID0gZnVuY3Rpb24oc2NhbGUpIHtcblx0XHRpZiAoISBhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4geTtcblx0XHR5ID0gc2NhbGU7XG5cdFx0cmV0dXJuIHZlY3RvcmZpZWxkO1xuXHR9O1xuXG5cdHZlY3RvcmZpZWxkLmlkID0gZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIGlkO1xuXHR9O1xuXHRcblx0dmVjdG9yZmllbGQudGl0bGUgPSBmdW5jdGlvbihuKSB7XG5cdFx0aWYgKCEgYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIG5hbWU7XG5cdFx0bmFtZSA9IG47XG5cdFx0cmV0dXJuIGltYWdlcztcblx0fTtcblx0XG5cdHJldHVybiB2ZWN0b3JmaWVsZDtcbn07Il19
