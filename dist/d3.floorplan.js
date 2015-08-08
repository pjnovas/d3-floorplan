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

module.exports = {
  floorplan: floorplan,
  heatmap: heatmap,
  imagelayer: imagelayer,
  overlays: overlays,
  pathplot: pathplot,
  vectorfield: vectorfield
};

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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJwYWNrYWdlLmpzb24iLCIvaG9tZS9wam5vdmFzL3Byb2plY3RzL2QzLWZsb29ycGxhbi9zcmMvZmxvb3JwbGFuLmpzIiwiL2hvbWUvcGpub3Zhcy9wcm9qZWN0cy9kMy1mbG9vcnBsYW4vc3JjL2hlYXRtYXAuanMiLCIvaG9tZS9wam5vdmFzL3Byb2plY3RzL2QzLWZsb29ycGxhbi9zcmMvaW1hZ2VsYXllci5qcyIsIi9ob21lL3Bqbm92YXMvcHJvamVjdHMvZDMtZmxvb3JwbGFuL3NyYy9pbmRleC5qcyIsIi9ob21lL3Bqbm92YXMvcHJvamVjdHMvZDMtZmxvb3JwbGFuL3NyYy9vdmVybGF5cy5qcyIsIi9ob21lL3Bqbm92YXMvcHJvamVjdHMvZDMtZmxvb3JwbGFuL3NyYy9wYXRocGxvdC5qcyIsIi9ob21lL3Bqbm92YXMvcHJvamVjdHMvZDMtZmxvb3JwbGFuL3NyYy92ZWN0b3JmaWVsZC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O2lCQ2Z3QixTQUFTOztBQUFsQixTQUFTLFNBQVMsR0FBRztBQUNuQyxLQUFJLE1BQU0sR0FBRyxFQUFFO0tBQ2YsY0FBYyxHQUFHLElBQUk7S0FDckIsT0FBTyxHQUFHLENBQUM7S0FDWCxNQUFNLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUU7S0FDMUIsTUFBTSxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7O0FBRTNCLFVBQVMs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QUFDOztBQUUzQixRQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxVQUFTLENBQUMsRUFBRTtBQUFFLFdBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUFFLENBQUMsQ0FDOUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxVQUFTLENBQUMsRUFBRTtBQUFFLFdBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUFFLENBQUMsQ0FDekMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDaEQsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDL0MsSUFBSSxDQUFDLE9BQU8sRUFBRSxVQUFTLENBQUMsRUFBRTtBQUFFLFdBQU8sS0FBSyxHQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7SUFBRSxDQUFDLENBQy9ELE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FDYixJQUFJLENBQUMsVUFBUyxDQUFDLEVBQUU7QUFDakIsV0FBTyxTQUFTLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO0lBQ2hELENBQUMsQ0FBQzs7QUFFTixhQUFVLENBQUMsVUFBVSxFQUFFLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQzs7QUFFOUMsT0FBSSxLQUFLLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FDL0IsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFVBQVMsQ0FBQyxFQUFFO0FBQUUsV0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDO0lBQUUsQ0FB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QUM7SUFDbkIsQ0FBQyxDQUFDOztBQUVKLFFBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO0dBQ3ZDLENBQUMsQ0FBQztFQUNIOztBQUVELFlBQVcsQ0FBQyxNQUFNLEdBQUcsVUFBUyxLQUFLLEVBQUU7QUFDcEMsTUFBSSxDQUFFLFNBQVMsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDakMsR0FBQyxHQUFHLEtBQUssQ0FBQztBQUNWLFNBQU8sV0FBVyxDQUFDO0VBQ25CLENBQUM7O0FBRUYsWUFBVyxDQUFDLE1BQU0sR0FBRyxVQUFTLEtBQUssRUFBRTtBQUNwQyxNQUFJLENBQUUsU0FBUyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztBQUNqQyxHQUFDLEdBQUcsS0FBSyxDQUFDO0FBQ1YsU0FBTyxXQUFXLENBQUM7RUFDbkIsQ0FBQzs7QUFFRixZQUFXLENBQUMsRUFBRSxHQUFHLFlBQVc7QUFDM0IsU0FBTyxFQUFFLENBQUM7RUFDVixDQUFDOztBQUVGLFlBQVcsQ0FBQyxLQUFLLEdBQUcsVUFBUyxDQUFDLEVBQUU7QUFDL0IsTUFBSSxDQUFFLFNBQVMsQ0FBQyxNQUFNLEVBQUUsT0FBTyxJQUFJLENBQUM7QUFDcEMsTUFBSSxHQUFHLENBQUMsQ0FBQztBQUNULFNBQU8sTUFBTSxDQUFDO0VBQ2QsQ0FBQzs7QUFFRixRQUFPLFdBQVcsQ0FBQztDQUNuQiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJtb2R1bGUuZXhwb3J0cz17XG4gIFwibmFtZVwiOiBcImQzLmZsb29ycGxhblwiLFxuICBcInZlcnNpb25cIjogXCIwLjEuMFwiLFxuICBcImRlc2NyaXB0aW9uXCI6IFwiQSBtYXAtbGlrZSBpbnRlcmFjdGl2ZSBzZXQgb2YgW3JldXNhYmxlIGNoYXJ0c10oaHR0cDovL2Jvc3Qub2Nrcy5vcmcvbWlrZS9jaGFydC8pIGZvciBsYXllcmluZyB2aXN1YWxpemF0aW9ucyBvbiBhIGNvbW1vbiBsb2NhbCBjb29yZGluYXRlIHN5c3RlbSBsaWtlIGZsb29yIHBsYW5zLlwiLFxuICBcIm1haW5cIjogXCJzcmMvaW5kZXguanNcIixcbiAgXCJyZXBvc2l0b3J5XCI6IHtcbiAgICBcInR5cGVcIjogXCJnaXRcIixcbiAgICBcInVybFwiOiBcImdpdCtodHRwczovL2dpdGh1Yi5jb20vZGNpYXJsZXR0YS9kMy1mbG9vcnBsYW4uZ2l0XCJcbiAgfSxcbiAgXCJhdXRob3JcIjogXCJEYXZpZCBDaWFybGV0dGFcIixcbiAgXCJsaWNlbnNlXCI6IFwiQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wXCIsXG4gIFwiYnVnc1wiOiB7XG4gICAgXCJ1cmxcIjogXCJodHRwczovL2dpdGh1Yi5jb20vZGNpYXJsZXR0YS9kMy1mbG9vcnBsYW4vaXNzdWVzXCJcbiAgfSxcbiAgXCJob21lcGFnZVwiOiBcImh0dHBzOi8vZGNpYXJsZXR0YS5naXRodWIuaW8vZDMtZmxvb3JwbGFuL1wiLFxuICBcImRlcGVuZGVuY2llc1wiOiB7XG4gICAgXCJkM1wiOiBcIl4zLjUuNlwiXG4gIH0sXG4gIFwiZGV2RGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcImJhYmVsXCI6IFwiXjQuNi4zXCIsXG4gICAgXCJiYWJlbC1jb3JlXCI6IFwiXjUuNi4xNVwiLFxuICAgIFwiYmFiZWxpZnlcIjogXCJeNS4wLjNcIixcbiAgICBcImJyb3dzZXJpZnlcIjogXCJeMTAuMi42XCIsXG4gICAgXCJncnVudFwiOiBcIl4wLjQuNVwiLFxuICAgIFwiZ3J1bnQtYnJvd3NlcmlmeVwiOiBcIl4zLjguMFwiLFxuICAgIFwiZ3J1bnQtY29udHJpYi1sZXNzXCI6IFwiXjEuMC4xXCIsXG4gICAgXCJncnVudC1jb250cmliLXVnbGlmeVwiOiBcIl4wLjkuMVwiLFxuICAgIFwibG9hZC1ncnVudC1jb25maWdcIjogXCJeMC4xNy4xXCIsXG4gICAgXCJ0aW1lLWdydW50XCI6IFwiXjEuMi4xXCJcbiAgfVxufVxuIiwiLy9cbi8vICAgQ29weXJpZ2h0IDIwMTIgRGF2aWQgQ2lhcmxldHRhXG4vL1xuLy8gICBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuLy8gICB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4vLyAgIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vICAgVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuLy8gICBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4vLyAgIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuLy8gICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4vLyAgIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuLy9cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZmxvb3JwbGFuKCkge1xuXHR2YXIgbGF5ZXJzID0gW10sXG5cdHBhblpvb21FbmFibGVkID0gdHJ1ZSxcblx0bWF4Wm9vbSA9IDUsXG5cdHhTY2FsZSA9IGQzLnNjYWxlLmxpbmVhcigpLFxuXHR5U2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKTtcblxuXHRmdW5jdGlvbiBtYXAoZykge1xuXHRcdHZhciB3aWR0aCA9IHhTY2FsZS5yYW5nZSgpWzFdIC0geFNjYWxlLnJhbmdlKClbMF0sXG5cdFx0ICAgIGhlaWdodCA9IHlTY2FsZS5yYW5nZSgpWzFdIC0geVNjYWxlLnJhbmdlKClbMF07XG5cdFx0XG5cdFx0Zy5lYWNoKGZ1bmN0aW9uKGRhdGEpe1xuXHRcdFx0aWYgKCEgZGF0YSkgcmV0dXJuO1xuXHRcdFx0XG5cdFx0XHR2YXIgZyA9IGQzLnNlbGVjdCh0aGlzKTtcblxuXHRcdFx0Ly8gZGVmaW5lIGNvbW1vbiBncmFwaGljYWwgZWxlbWVudHNcblx0XHRcdF9faW5pdF9kZWZzKGcuc2VsZWN0QWxsKFwiZGVmc1wiKS5kYXRhKFswXSkuZW50ZXIoKS5hcHBlbmQoXCJkZWZzXCIpKTtcblxuXHRcdFx0Ly8gc2V0dXAgY29udGFpbmVyIGZvciBsYXllcnMgYW5kIGFyZWEgdG8gY2FwdHVyZSBldmVudHNcblx0XHRcdHZhciB2aXMgPSBnLnNlbGVjdEFsbChcIi5tYXAtbGF5ZXJzXCIpLmRhdGEoWzBdKSxcblx0XHRcdHZpc0VudGVyID0gdmlzLmVudGVyKCkuYXBwZW5kKFwiZ1wiKS5hdHRyKFwiY2xhc3NcIixcIm1hcC1sYXllcnNcIiksXG5cdFx0XHR2aXNVcGRhdGUgPSBkMy50cmFuc2l0aW9uKHZpcyk7XG5cblx0XHRcdHZpc0VudGVyLmFwcGVuZChcInJlY3RcIilcblx0XHRcdC5hdHRyKFwiY2xhc3NcIiwgXCJjYW52YXNcIilcblx0XHRcdC5hdHRyKFwicG9pbnRlci1ldmVudHNcIixcImFsbFwiKVxuXHRcdFx0LnN0eWxlKFwib3BhY2l0eVwiLDApO1xuXG5cdFx0XHR2aXNVcGRhdGUuYXR0cihcIndpZHRoXCIsIHdpZHRoKVxuXHRcdFx0LmF0dHIoXCJoZWlnaHRcIiwgaGVpZ2h0KVxuXHRcdFx0LmF0dHIoXCJ4XCIseFNjYWxlLnJhbmdlKClbMF0pXG5cdFx0XHQuYXR0cihcInlcIix5U2NhbGUucmFuZ2UoKVswXSk7XG5cblx0XHRcdC8vIHNldHVwIG1hcCBjb250cm9sc1xuXHRcdFx0dmFyIGNvbnRyb2xzID0gZy5zZWxlY3RBbGwoXCIubWFwLWNvbnRyb2xzXCIpLmRhdGEoWzBdKSxcblx0XHRcdGNvbnRyb2xzRW50ZXIgPSBjb250cm9scy5lbnRlcigpXG5cdFx0XHRcdFx0XHRcdC5hcHBlbmQoXCJnXCIpLmF0dHIoXCJjbGFzc1wiLFwibWFwLWNvbnRyb2xzXCIpO1xuXG5cdFx0XHRfX2luaXRfY29udHJvbHMoY29udHJvbHNFbnRlcik7XG5cdFx0XHR2YXIgb2Zmc2V0ID0gY29udHJvbHMuc2VsZWN0KFwiLmhpZGVcIilcblx0XHRcdFx0XHRcdC5jbGFzc2VkKFwidWktc2hvdy1oaWRlXCIpID8gOTUgOiAxMCxcblx0XHRcdHBhbmVsSHQgPSBNYXRoLm1heCg0NSwgMTAgKyBsYXllcnMubGVuZ3RoICogMjApO1xuXHRcdFx0Y29udHJvbHMuYXR0cihcInZpZXctd2lkdGhcIiwgd2lkdGgpXG5cdFx0XHQuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIisod2lkdGgtb2Zmc2V0KStcIiwwKVwiKVxuXHRcdFx0XHQuc2VsZWN0KFwicmVjdFwiKVxuXHRcdFx0XHQuYXR0cihcImhlaWdodFwiLCBwYW5lbEh0KTtcblx0XHRcdFxuXHRcdFx0XG5cdFx0XHQvLyByZW5kZXIgYW5kIHJlb3JkZXIgbGF5ZXIgY29udHJvbHNcblx0XHRcdHZhciBsYXllckNvbnRyb2xzID0gY29udHJvbHMuc2VsZWN0KFwiZy5sYXllci1jb250cm9sc1wiKVxuXHRcdFx0XHQuc2VsZWN0QWxsKFwiZ1wiKS5kYXRhKGxheWVycywgZnVuY3Rpb24obCkge3JldHVybiBsLmlkKCk7fSksXG5cdFx0XHRsYXllckNvbnRyb2xzRW50ZXIgPSBsYXllckNvbnRyb2xzLmVudGVyKClcblx0XHRcdFx0LmFwcGVuZChcImdcIikuYXR0cihcImNsYXNzXCIsIFwidWktYWN0aXZlXCIpXG5cdFx0XHRcdC5zdHlsZShcImN1cnNvclwiLFwicG9pbnRlclwiKVxuXHRcdFx0XHQub24oXCJjbGlja1wiLCBmdW5jdGlvbihsKSB7XG5cdFx0XHRcdFx0dmFyIGJ1dHRvbiA9IGQzLnNlbGVjdCh0aGlzKTtcblx0XHRcdFx0XHR2YXIgbGF5ZXIgPSBnLnNlbGVjdEFsbChcImcuXCIrbC5pZCgpKTtcblx0XHRcdFx0XHRpZiAoYnV0dG9uLmNsYXNzZWQoXCJ1aS1hY3RpdmVcIikpIHtcblx0XHRcdFx0XHRcdGxheWVyLnN0eWxlKFwiZGlzcGxheVwiLFwibm9uZVwiKTtcblx0XHRcdFx0XHRcdGJ1dHRvbi5jbGFzc2VkKFwidWktYWN0aXZlXCIsZmFsc2UpXG5cdFx0XHRcdFx0XHRcdC5jbGFzc2VkKFwidWktZGVmYXVsdFwiLHRydWUpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRsYXllci5zdHlsZShcImRpc3BsYXlcIixcImluaGVyaXRcIik7XG5cdFx0XHRcdFx0XHRidXR0b24uY2xhc3NlZChcInVpLWFjdGl2ZVwiLCB0cnVlKVxuXHRcdFx0XHRcdFx0XHQuY2xhc3NlZChcInVpLWRlZmF1bHRcIiwgZmFsc2UpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHRcblx0XHRcdGxheWVyQ29udHJvbHNFbnRlci5hcHBlbmQoXCJyZWN0XCIpXG5cdFx0XHRcdC5hdHRyKFwieFwiLCAwKVxuXHRcdFx0XHQuYXR0cihcInlcIiwgMSlcblx0XHRcdFx0LmF0dHIoXCJyeFwiLCA1KVxuXHRcdFx0XHQuYXR0cihcInJ5XCIsIDUpXG5cdFx0XHRcdC5hdHRyKFwid2lkdGhcIiwgNzUpXG5cdFx0XHRcdC5hdHRyKFwiaGVpZ2h0XCIsIDE4KVxuXHRcdFx0XHQuYXR0cihcInN0cm9rZS13aWR0aFwiLCBcIjFweFwiKTtcblx0XHRcdFxuXHRcdFx0bGF5ZXJDb250cm9sc0VudGVyLmFwcGVuZChcInRleHRcIilcblx0XHRcdFx0LmF0dHIoXCJ4XCIsIDEwKVxuXHRcdFx0XHQuYXR0cihcInlcIiwgMTUpXG5cdFx0XHRcdC5zdHlsZShcImZvbnQtc2l6ZVwiLFwiMTJweFwiKVxuXHRcdFx0XHQuc3R5bGUoXCJmb250LWZhbWlseVwiLCBcIkhlbHZldGljYSwgQXJpYWwsIHNhbnMtc2VyaWZcIilcblx0XHRcdFx0LnRleHQoZnVuY3Rpb24obCkgeyByZXR1cm4gbC50aXRsZSgpOyB9KTtcblx0XHRcdFxuXHRcdFx0bGF5ZXJDb250cm9scy50cmFuc2l0aW9uKCkuZHVyYXRpb24oMTAwMClcblx0XHRcdC5hdHRyKFwidHJhbnNmb3JtXCIsIGZ1bmN0aW9uKGQsaSkgeyBcblx0XHRcdFx0cmV0dXJuIFwidHJhbnNsYXRlKDAsXCIgKyAoKGxheWVycy5sZW5ndGgtKGkrMSkpKjIwKSArIFwiKVwiOyBcblx0XHRcdH0pO1xuXG5cdFx0XHQvLyByZW5kZXIgYW5kIHJlb3JkZXIgbGF5ZXJzXG5cdFx0XHR2YXIgbWFwbGF5ZXJzID0gdmlzLnNlbGVjdEFsbChcIi5tYXBsYXllclwiKVxuXHRcdFx0XHRcdFx0XHQuZGF0YShsYXllcnMsIGZ1bmN0aW9uKGwpIHtyZXR1cm4gbC5pZCgpO30pO1xuXHRcdFx0bWFwbGF5ZXJzLmVudGVyKClcblx0XHRcdC5hcHBlbmQoXCJnXCIpXG5cdFx0XHQuYXR0cihcImNsYXNzXCIsIGZ1bmN0aW9uKGwpIHtyZXR1cm4gXCJtYXBsYXllciBcIiArIGwudGl0bGUoKTt9KVxuXHRcdFx0XHQuYXBwZW5kKFwiZ1wiKVxuXHRcdFx0XHQuYXR0cihcImNsYXNzXCIsIGZ1bmN0aW9uKGwpIHtyZXR1cm4gbC5pZCgpO30pXG5cdFx0XHRcdC5kYXR1bShudWxsKTtcblx0XHRcdG1hcGxheWVycy5leGl0KCkucmVtb3ZlKCk7XG5cdFx0XHRtYXBsYXllcnMub3JkZXIoKTtcblx0XHRcdFxuXHRcdFx0Ly8gcmVkcmF3IGxheWVyc1xuXHRcdFx0bWFwbGF5ZXJzLmVhY2goZnVuY3Rpb24obGF5ZXIpIHtcblx0XHRcdFx0ZDMuc2VsZWN0KHRoaXMpLnNlbGVjdChcImcuXCIgKyBsYXllci5pZCgpKS5kYXR1bShkYXRhW2xheWVyLmlkKCldKS5jYWxsKGxheWVyKTtcblx0XHRcdH0pO1xuXHRcdFx0XG5cdFx0XHQvLyBhZGQgcGFuIC0gem9vbSBiZWhhdmlvclxuXHRcdFx0Zy5jYWxsKGQzLmJlaGF2aW9yLnpvb20oKS5zY2FsZUV4dGVudChbMSxtYXhab29tXSlcblx0XHRcdFx0XHQub24oXCJ6b29tXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0aWYgKHBhblpvb21FbmFibGVkKSB7XG5cdFx0XHRcdFx0XHRcdF9fc2V0X3ZpZXcoZywgZDMuZXZlbnQuc2NhbGUsIGQzLmV2ZW50LnRyYW5zbGF0ZSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSkpO1xuXG5cdFx0fSk7XG5cdH1cblxuXHRtYXAueFNjYWxlID0gZnVuY3Rpb24oc2NhbGUpIHtcblx0XHRpZiAoISBhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4geFNjYWxlO1xuXHRcdHhTY2FsZSA9IHNjYWxlO1xuXHRcdGxheWVycy5mb3JFYWNoKGZ1bmN0aW9uKGwpIHsgbC54U2NhbGUoeFNjYWxlKTsgfSk7XG5cdFx0cmV0dXJuIG1hcDtcblx0fTtcblx0XG5cdG1hcC55U2NhbGUgPSBmdW5jdGlvbihzY2FsZSkge1xuXHRcdGlmICghIGFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB5U2NhbGU7XG5cdFx0eVNjYWxlID0gc2NhbGU7XG5cdFx0bGF5ZXJzLmZvckVhY2goZnVuY3Rpb24obCkgeyBsLnlTY2FsZSh5U2NhbGUpOyB9KTtcblx0XHRyZXR1cm4gbWFwO1xuXHR9O1xuXHRcblx0bWFwLnBhblpvb20gPSBmdW5jdGlvbihlbmFibGVkKSB7XG5cdFx0aWYgKCEgYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHBhblpvb21FbmFibGVkO1xuXHRcdHBhblpvb21FbmFibGVkID0gZW5hYmxlZDtcblx0XHRyZXR1cm4gbWFwO1xuXHR9O1xuXHRcblx0bWFwLmFkZExheWVyID0gZnVuY3Rpb24obGF5ZXIsIGluZGV4KSB7XG5cdFx0bGF5ZXIueFNjYWxlKHhTY2FsZSk7XG5cdFx0bGF5ZXIueVNjYWxlKHlTY2FsZSk7XG5cdFx0XG5cdFx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxICYmIGluZGV4ID49MCkge1xuXHRcdFx0bGF5ZXJzLnNwbGljZShpbmRleCwgMCwgbGF5ZXIpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsYXllcnMucHVzaChsYXllcik7XG5cdFx0fVxuXHRcdFxuXHRcdHJldHVybiBtYXA7XG5cdH07XG5cdFxuXHRmdW5jdGlvbiBfX3NldF92aWV3KGcsIHMsIHQpIHtcblx0XHRpZiAoISBnKSByZXR1cm47XG5cdFx0aWYgKHMpIGcuX19zY2FsZV9fID0gcztcblx0XHRpZiAodCAmJiB0Lmxlbmd0aCA+IDEpIGcuX190cmFuc2xhdGVfXyA9IHQ7XG5cblx0XHQvLyBsaW1pdCB0cmFuc2xhdGUgdG8gZWRnZXMgb2YgZXh0ZW50c1xuXHRcdHZhciBtaW5YVHJhbnNsYXRlID0gKDEgLSBnLl9fc2NhbGVfXykgKiBcblx0XHRcdFx0XHRcdFx0KHhTY2FsZS5yYW5nZSgpWzFdIC0geFNjYWxlLnJhbmdlKClbMF0pO1xuXHRcdHZhciBtaW5ZVHJhbnNsYXRlID0gKDEgLSBnLl9fc2NhbGVfXykgKiBcblx0XHRcdFx0XHRcdFx0KHlTY2FsZS5yYW5nZSgpWzFdIC0geVNjYWxlLnJhbmdlKClbMF0pO1xuXG5cdFx0Zy5fX3RyYW5zbGF0ZV9fWzBdID0gTWF0aC5taW4oeFNjYWxlLnJhbmdlKClbMF0sIFxuXHRcdFx0XHRcdFx0XHRcdE1hdGgubWF4KGcuX190cmFuc2xhdGVfX1swXSwgbWluWFRyYW5zbGF0ZSkpO1xuXHRcdGcuX190cmFuc2xhdGVfX1sxXSA9IE1hdGgubWluKHlTY2FsZS5yYW5nZSgpWzBdLCBcblx0XHRcdFx0XHRcdFx0XHRNYXRoLm1heChnLl9fdHJhbnNsYXRlX19bMV0sIG1pbllUcmFuc2xhdGUpKTtcblx0XHRnLnNlbGVjdEFsbChcIi5tYXAtbGF5ZXJzXCIpXG5cdFx0XHQuYXR0cihcInRyYW5zZm9ybVwiLCBcblx0XHRcdFx0ICBcInRyYW5zbGF0ZShcIiArIGcuX190cmFuc2xhdGVfXyArIFxuXHRcdFx0XHQgIFx0IFwiKXNjYWxlKFwiICsgZy5fX3NjYWxlX18gKyBcIilcIik7XG5cdH07XG5cblx0ZnVuY3Rpb24gX19pbml0X2RlZnMoc2VsZWN0aW9uKSB7XG5cdFx0c2VsZWN0aW9uLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgZGVmcyA9IGQzLnNlbGVjdCh0aGlzKTtcblxuXHRcdFx0dmFyIGdyYWQgPSBkZWZzLmFwcGVuZChcInJhZGlhbEdyYWRpZW50XCIpXG5cdFx0XHQuYXR0cihcImlkXCIsXCJtZXRhbC1idW1wXCIpXG5cdFx0XHQuYXR0cihcImN4XCIsXCI1MCVcIilcblx0XHRcdC5hdHRyKFwiY3lcIixcIjUwJVwiKVxuXHRcdFx0LmF0dHIoXCJyXCIsXCI1MCVcIilcblx0XHRcdC5hdHRyKFwiZnhcIixcIjUwJVwiKVxuXHRcdFx0LmF0dHIoXCJmeVwiLFwiNTAlXCIpO1xuXG5cdFx0XHRncmFkLmFwcGVuZChcInN0b3BcIilcblx0XHRcdC5hdHRyKFwib2Zmc2V0XCIsXCIwJVwiKVxuXHRcdFx0LnN0eWxlKFwic3RvcC1jb2xvclwiLFwicmdiKDE3MCwxNzAsMTcwKVwiKVxuXHRcdFx0LnN0eWxlKFwic3RvcC1vcGFjaXR5XCIsMC42KTtcblxuXHRcdFx0Z3JhZC5hcHBlbmQoXCJzdG9wXCIpXG5cdFx0XHQuYXR0cihcIm9mZnNldFwiLFwiMTAwJVwiKVxuXHRcdFx0LnN0eWxlKFwic3RvcC1jb2xvclwiLFwicmdiKDIwNCwyMDQsMjA0KVwiKVxuXHRcdFx0LnN0eWxlKFwic3RvcC1vcGFjaXR5XCIsMC41KTtcblxuXHRcdFx0dmFyIGdyaXAgPSBkZWZzLmFwcGVuZChcInBhdHRlcm5cIilcblx0XHRcdC5hdHRyKFwiaWRcIiwgXCJncmlwLXRleHR1cmVcIilcblx0XHRcdC5hdHRyKFwicGF0dGVyblVuaXRzXCIsIFwidXNlclNwYWNlT25Vc2VcIilcblx0XHRcdC5hdHRyKFwieFwiLDApXG5cdFx0XHQuYXR0cihcInlcIiwwKVxuXHRcdFx0LmF0dHIoXCJ3aWR0aFwiLDMpXG5cdFx0XHQuYXR0cihcImhlaWdodFwiLDMpO1xuXG5cdFx0XHRncmlwLmFwcGVuZChcInJlY3RcIilcblx0XHRcdC5hdHRyKFwiaGVpZ2h0XCIsMylcblx0XHRcdC5hdHRyKFwid2lkdGhcIiwzKVxuXHRcdFx0LmF0dHIoXCJzdHJva2VcIixcIm5vbmVcIilcblx0XHRcdC5hdHRyKFwiZmlsbFwiLCBcInJnYmEoMjA0LDIwNCwyMDQsMC41KVwiKTtcblxuXHRcdFx0Z3JpcC5hcHBlbmQoXCJjaXJjbGVcIilcblx0XHRcdC5hdHRyKFwiY3hcIiwgMS41KVxuXHRcdFx0LmF0dHIoXCJjeVwiLCAxLjUpXG5cdFx0XHQuYXR0cihcInJcIiwgMSlcblx0XHRcdC5hdHRyKFwic3Ryb2tlXCIsIFwibm9uZVwiKVxuXHRcdFx0LmF0dHIoXCJmaWxsXCIsIFwidXJsKCNtZXRhbC1idW1wKVwiKTtcblx0XHR9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIF9faW5pdF9jb250cm9scyhzZWxlY3Rpb24pIHtcblx0XHRzZWxlY3Rpb24uZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdHZhciBjb250cm9scyA9IGQzLnNlbGVjdCh0aGlzKTtcblxuXHRcdFx0Y29udHJvbHMuYXBwZW5kKFwicGF0aFwiKVxuXHRcdFx0LmF0dHIoXCJjbGFzc1wiLCBcInVpLXNob3ctaGlkZVwiKVxuXHRcdFx0LmF0dHIoXCJkXCIsIFwiTTEwLDMgdjQwIGgtNyBhMywzIDAgMCwxIC0zLC0zIHYtMzQgYTMsMyAwIDAsMSAzLC0zIFpcIilcblx0XHRcdC5hdHRyKFwiZmlsbFwiLFwidXJsKCNncmlwLXRleHR1cmUpXCIpXG5cdFx0XHQuYXR0cihcInN0cm9rZVwiLCBcIm5vbmVcIilcblx0XHRcdC5zdHlsZShcIm9wYWNpdHlcIiwgMC41KTtcblxuXHRcdFx0Y29udHJvbHMuYXBwZW5kKFwicGF0aFwiKVxuXHRcdFx0LmF0dHIoXCJjbGFzc1wiLCBcInNob3cgdWktc2hvdy1oaWRlXCIpXG5cdFx0XHQuYXR0cihcImRcIiwgXCJNMiwyMyBsNiwtMTUgdjMwIFpcIilcblx0XHRcdC5hdHRyKFwiZmlsbFwiLFwicmdiKDIwNCwyMDQsMjA0KVwiKVxuXHRcdFx0LmF0dHIoXCJzdHJva2VcIiwgXCJub25lXCIpXG5cdFx0XHQuc3R5bGUoXCJvcGFjaXR5XCIsIDAuNSk7XG5cblx0XHRcdGNvbnRyb2xzLmFwcGVuZChcInBhdGhcIilcblx0XHRcdC5hdHRyKFwiY2xhc3NcIiwgXCJoaWRlXCIpXG5cdFx0XHQuYXR0cihcImRcIiwgXCJNOCwyMyBsLTYsLTE1IHYzMCBaXCIpXG5cdFx0XHQuYXR0cihcImZpbGxcIixcInJnYigyMDQsMjA0LDIwNClcIilcblx0XHRcdC5hdHRyKFwic3Ryb2tlXCIsIFwibm9uZVwiKVxuXHRcdFx0LnN0eWxlKFwib3BhY2l0eVwiLCAwKTtcblxuXHRcdFx0Y29udHJvbHMuYXBwZW5kKFwicGF0aFwiKVxuXHRcdFx0LmF0dHIoXCJkXCIsIFwiTTEwLDMgdjQwIGgtNyBhMywzIDAgMCwxIC0zLC0zIHYtMzQgYTMsMyAwIDAsMSAzLC0zIFpcIilcblx0XHRcdC5hdHRyKFwicG9pbnRlci1ldmVudHNcIiwgXCJhbGxcIilcblx0XHRcdC5hdHRyKFwiZmlsbFwiLFwibm9uZVwiKVxuXHRcdFx0LmF0dHIoXCJzdHJva2VcIiwgXCJub25lXCIpXG5cdFx0XHQuc3R5bGUoXCJjdXJzb3JcIixcInBvaW50ZXJcIilcblx0XHRcdC5vbihcIm1vdXNlb3ZlclwiLCBmdW5jdGlvbigpIHsgXG5cdFx0XHRcdGNvbnRyb2xzLnNlbGVjdEFsbChcInBhdGgudWktc2hvdy1oaWRlXCIpLnN0eWxlKFwib3BhY2l0eVwiLCAxKTsgXG5cdFx0XHR9KVxuXHRcdFx0Lm9uKFwibW91c2VvdXRcIiwgZnVuY3Rpb24oKSB7IFxuXHRcdFx0XHRjb250cm9scy5zZWxlY3RBbGwoXCJwYXRoLnVpLXNob3ctaGlkZVwiKS5zdHlsZShcIm9wYWNpdHlcIiwgMC41KTsgXG5cdFx0XHR9KVxuXHRcdFx0Lm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmIChjb250cm9scy5zZWxlY3QoXCIuaGlkZVwiKS5jbGFzc2VkKFwidWktc2hvdy1oaWRlXCIpKSB7XG5cdFx0XHRcdFx0Y29udHJvbHMudHJhbnNpdGlvbigpXG5cdFx0XHRcdFx0LmR1cmF0aW9uKDEwMDApXG5cdFx0XHRcdFx0LmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIrKGNvbnRyb2xzLmF0dHIoXCJ2aWV3LXdpZHRoXCIpLTEwKStcIiwwKVwiKVxuXHRcdFx0XHRcdC5lYWNoKFwiZW5kXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0Y29udHJvbHMuc2VsZWN0KFwiLmhpZGVcIilcblx0XHRcdFx0XHRcdC5zdHlsZShcIm9wYWNpdHlcIiwwKVxuXHRcdFx0XHRcdFx0LmNsYXNzZWQoXCJ1aS1zaG93LWhpZGVcIixmYWxzZSk7XG5cdFx0XHRcdFx0XHRjb250cm9scy5zZWxlY3QoXCIuc2hvd1wiKVxuXHRcdFx0XHRcdFx0LnN0eWxlKFwib3BhY2l0eVwiLDEpXG5cdFx0XHRcdFx0XHQuY2xhc3NlZChcInVpLXNob3ctaGlkZVwiLHRydWUpO1xuXHRcdFx0XHRcdFx0Y29udHJvbHMuc2VsZWN0QWxsKFwicGF0aC51aS1zaG93LWhpZGVcIilcblx0XHRcdFx0XHRcdC5zdHlsZShcIm9wYWNpdHlcIiwwLjUpO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGNvbnRyb2xzLnRyYW5zaXRpb24oKVxuXHRcdFx0XHRcdC5kdXJhdGlvbigxMDAwKVxuXHRcdFx0XHRcdC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiKyhjb250cm9scy5hdHRyKFwidmlldy13aWR0aFwiKS05NSkrXCIsMClcIilcblx0XHRcdFx0XHQuZWFjaChcImVuZFwiLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdGNvbnRyb2xzLnNlbGVjdChcIi5zaG93XCIpXG5cdFx0XHRcdFx0XHQuc3R5bGUoXCJvcGFjaXR5XCIsMClcblx0XHRcdFx0XHRcdC5jbGFzc2VkKFwidWktc2hvdy1oaWRlXCIsZmFsc2UpO1xuXHRcdFx0XHRcdFx0Y29udHJvbHMuc2VsZWN0KFwiLmhpZGVcIilcblx0XHRcdFx0XHRcdC5zdHlsZShcIm9wYWNpdHlcIiwxKVxuXHRcdFx0XHRcdFx0LmNsYXNzZWQoXCJ1aS1zaG93LWhpZGVcIix0cnVlKTtcblx0XHRcdFx0XHRcdGNvbnRyb2xzLnNlbGVjdEFsbChcInBhdGgudWktc2hvdy1oaWRlXCIpXG5cdFx0XHRcdFx0XHQuc3R5bGUoXCJvcGFjaXR5XCIsMC41KTtcblx0XHRcdFx0XHR9KTtcdFx0XHRcdFxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdFx0Y29udHJvbHMuYXBwZW5kKFwicmVjdFwiKVxuXHRcdFx0LmF0dHIoXCJ4XCIsMTApXG5cdFx0XHQuYXR0cihcInlcIiwwKVxuXHRcdFx0LmF0dHIoXCJ3aWR0aFwiLCA4NSlcblx0XHRcdC5hdHRyKFwiZmlsbFwiLCBcInJnYmEoMjA0LDIwNCwyMDQsMC45KVwiKVxuXHRcdFx0LmF0dHIoXCJzdHJva2VcIiwgXCJub25lXCIpO1xuXG5cdFx0XHRjb250cm9scy5hcHBlbmQoXCJnXCIpXG5cdFx0XHQuYXR0cihcImNsYXNzXCIsIFwibGF5ZXItY29udHJvbHNcIilcblx0XHRcdC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKDE1LDUpXCIpO1xuXHRcdH0pO1xuXHR9XG5cblx0cmV0dXJuIG1hcDtcbn07XG4iLCIvL1xuLy8gICBDb3B5cmlnaHQgMjAxMiBEYXZpZCBDaWFybGV0dGFcbi8vXG4vLyAgIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4vLyAgIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbi8vICAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gICBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4vLyAgIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbi8vICAgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4vLyAgIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbi8vICAgbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4vL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaGVhdG1hcCgpIHtcblx0dmFyIGNvbG9ycyA9IFwiUmRZbEJ1XCIsXG5cdHNjYWxlVHlwZSA9IFwicXVhbnRpbGVcIixcblx0eCA9IGQzLnNjYWxlLmxpbmVhcigpLFxuXHR5ID0gZDMuc2NhbGUubGluZWFyKCksXG5cdGxpbmUgPSBkMy5zdmcubGluZSgpXG5cdFx0LngoZnVuY3Rpb24oZCkgeyByZXR1cm4geChkLngpOyB9KVxuXHRcdC55KGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHkoZC55KTsgfSksXG5cdGZvcm1hdCA9IGQzLmZvcm1hdChcIi40blwiKSxcblx0aWQgPSBcImZwLWhlYXRtYXAtXCIgKyBuZXcgRGF0ZSgpLnZhbHVlT2YoKSxcblx0bmFtZSA9IFwiaGVhdG1hcFwiO1xuXG5cdGZ1bmN0aW9uIGhlYXRtYXAoZykge1xuXHRcdGcuZWFjaChmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRpZiAoISBkYXRhIHx8ICEgZGF0YS5tYXApIHJldHVybjtcblx0XHRcdHZhciBnID0gZDMuc2VsZWN0KHRoaXMpO1xuXHRcdFx0XG5cdFx0XHRpZiAoISBkYXRhLnVuaXRzKSB7XG5cdFx0XHRcdGRhdGEudW5pdHMgPSBcIlwiO1xuXHRcdFx0fSBlbHNlIGlmIChkYXRhLnVuaXRzLmNoYXJBdCgwKSAhPSAnICcpIHtcblx0XHRcdFx0ZGF0YS51bml0cyA9IFwiIFwiICsgZGF0YS51bml0cztcblx0XHRcdH1cblxuXHRcdFx0dmFyIHZhbHVlcyA9IGRhdGEubWFwLm1hcChmdW5jdGlvbihkKSB7cmV0dXJuIGQudmFsdWU7fSlcblx0XHRcdFx0XHRcdFx0LnNvcnQoZDMuYXNjZW5kaW5nKSxcblx0XHRcdFx0Y29sb3JTY2FsZSwgdGhyZXNob2xkcztcblx0XHRcdFxuXHRcdFx0c3dpdGNoIChzY2FsZVR5cGUpIHtcblx0XHRcdCAgY2FzZSBcInF1YW50aWxlXCI6IHtcblx0XHRcdFx0Y29sb3JTY2FsZSA9IGQzLnNjYWxlLnF1YW50aWxlKClcblx0XHRcdFx0XHRcdFx0LnJhbmdlKFsxLDIsMyw0LDUsNl0pXG5cdFx0XHRcdFx0XHRcdC5kb21haW4odmFsdWVzKTtcblx0XHRcdFx0dGhyZXNob2xkcyA9IGNvbG9yU2NhbGUucXVhbnRpbGVzKCk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0ICB9XG5cdFx0XHQgIGNhc2UgXCJxdWFudGl6ZWRcIjoge1xuXHRcdFx0XHRjb2xvclNjYWxlID0gZDMuc2NhbGUucXVhbnRpemUoKVxuXHRcdFx0XHRcdFx0XHQucmFuZ2UoWzEsMiwzLDQsNSw2XSlcblx0XHRcdFx0XHRcdFx0LmRvbWFpbihbdmFsdWVzWzBdLHZhbHVlc1t2YWx1ZXMubGVuZ3RoLTFdXSk7XG5cdFx0XHRcdHZhciBpbmNyID0gKGNvbG9yU2NhbGUuZG9tYWluKClbMV0gLSBjb2xvclNjYWxlLmRvbWFpbigpWzBdKSAvIDY7XG5cdFx0XHRcdHRocmVzaG9sZHMgPSBbaW5jciwgMippbmNyLCAzKmluY3IsIDQqaW5jciwgNSppbmNyXTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHQgIH0gXG5cdFx0XHQgIGNhc2UgXCJub3JtYWxcIjoge1xuXHRcdFx0XHR2YXIgbWVhbiA9IGQzLm1lYW4odmFsdWVzKTtcblx0XHRcdFx0dmFyIHNpZ21hID0gTWF0aC5zcXJ0KGQzLnN1bSh2YWx1ZXMsIFxuXHRcdFx0XHRcdFx0ZnVuY3Rpb24odikge3JldHVybiBNYXRoLnBvdyh2LW1lYW4sMik7fSkgL3ZhbHVlcy5sZW5ndGgpO1xuXHRcdFx0XHRjb2xvclNjYWxlID0gZDMuc2NhbGUucXVhbnRpbGUoKVxuXHRcdFx0XHRcdFx0XHQucmFuZ2UoWzEsMiwzLDQsNSw2XSlcblx0XHRcdFx0XHRcdFx0LmRvbWFpbihbbWVhbi02KnNpZ21hLG1lYW4tMipzaWdtYSxcblx0XHRcdFx0XHRcdFx0ICAgICAgICAgbWVhbi1zaWdtYSxtZWFuLG1lYW4rc2lnbWEsXG5cdFx0XHRcdFx0XHRcdCAgICAgICAgIG1lYW4rMipzaWdtYSxtZWFuKzYqc2lnbWFdKTtcblx0XHRcdFx0dGhyZXNob2xkcyA9IGNvbG9yU2NhbGUucXVhbnRpbGVzKCk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0ICB9IFxuXHRcdFx0ICBkZWZhdWx0OiB7IC8vIGN1c3RvbVxuXHRcdFx0XHRpZiAoISBjdXN0b21UaHJlc2hvbGRzKSBjdXN0b21UaHJlc2hvbGRzID0gdGhyZXNob2xkcztcblx0XHRcdFx0dmFyIGRvbWFpbiA9IGN1c3RvbVRocmVzaG9sZHM7XG5cdFx0XHRcdGRvbWFpbi5wdXNoKGRvbWFpbltkb21haW4ubGVuZ3RoLTFdKTtcblx0XHRcdFx0ZG9tYWluLnVuc2hpZnQoZG9tYWluWzBdKTtcblx0XHRcdFx0Y29sb3JTY2FsZSA9IGQzLnNjYWxlLnF1YW50aWxlKClcblx0XHRcdFx0XHRcdFx0LnJhbmdlKFsxLDIsMyw0LDUsNl0pXG5cdFx0XHRcdFx0XHRcdC5kb21haW4oZG9tYWluKTtcblx0XHRcdFx0Y3VzdG9tVGhyZXNob2xkcyA9IHRocmVzaG9sZHMgPSBjb2xvclNjYWxlLnF1YW50aWxlcygpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdCAgfVxuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHQvLyBzZXR1cCBjb250YWluZXIgZm9yIHZpc3VhbGl6YXRpb25cblx0XHRcdHZhciB2aXMgPSBnLnNlbGVjdEFsbChcImcuaGVhdG1hcFwiKS5kYXRhKFswXSk7XG5cdFx0XHR2aXMuZW50ZXIoKS5hcHBlbmQoXCJnXCIpLmF0dHIoXCJjbGFzc1wiLFwiaGVhdG1hcFwiKTtcblx0XHRcdFxuXHRcdFx0aWYgKHRoaXMuX19jb2xvcnNfXyAmJiB0aGlzLl9fY29sb3JzX18gIT0gY29sb3JzKSB7XG5cdFx0XHRcdHZpcy5jbGFzc2VkKHRoaXMuX19jb2xvcnNfXywgZmFsc2UpO1xuXHRcdFx0fVxuXHRcdFx0dmlzLmNsYXNzZWQoY29sb3JzLCB0cnVlKTtcblx0XHRcdHRoaXMuX19jb2xvcnNfXyA9IGNvbG9ycztcblx0XHRcdFx0XG5cdFx0XHR2YXIgY2VsbHMgPSB2aXMuc2VsZWN0QWxsKFwicmVjdFwiKVxuXHRcdFx0XHQuZGF0YShkYXRhLm1hcC5maWx0ZXIoZnVuY3Rpb24oZCkgeyByZXR1cm4gISBkLnBvaW50czsgfSksIFxuXHRcdFx0XHRcdFx0ZnVuY3Rpb24oZCl7cmV0dXJuIGQueCArIFwiLFwiICsgZC55O30pLFxuXHRcdFx0Y2VsbHNFbnRlciA9IGNlbGxzLmVudGVyKCkuYXBwZW5kKFwicmVjdFwiKS5zdHlsZShcIm9wYWNpdHlcIiwgMWUtNik7XG5cdFx0XHRcblx0XHRcdGNlbGxzLmV4aXQoKS50cmFuc2l0aW9uKCkuc3R5bGUoXCJvcGFjaXR5XCIsIDFlLTYpLnJlbW92ZSgpO1xuXHRcdFx0XG5cdFx0XHRjZWxsc0VudGVyLmFwcGVuZChcInRpdGxlXCIpO1xuXHRcdFx0XG5cdFx0XHRjZWxscy5hdHRyKFwieFwiLCBmdW5jdGlvbihkKSB7IHJldHVybiB4KGQueCk7IH0pXG5cdFx0XHQuYXR0cihcInlcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4geShkLnkpOyB9KVxuXHRcdFx0LmF0dHIoXCJoZWlnaHRcIiwgTWF0aC5hYnMoeShkYXRhLmJpblNpemUpIC0geSgwKSkpXG5cdFx0XHQuYXR0cihcIndpZHRoXCIsIE1hdGguYWJzKHgoZGF0YS5iaW5TaXplKSAtIHgoMCkpKVxuXHRcdFx0LmF0dHIoXCJjbGFzc1wiLCBmdW5jdGlvbihkKSB7IHJldHVybiBcImQ2LVwiK2NvbG9yU2NhbGUoZC52YWx1ZSk7IH0pXG5cdFx0XHRcdC5zZWxlY3QoXCJ0aXRsZVwiKVxuXHRcdCAgXHRcdC50ZXh0KGZ1bmN0aW9uKGQpIHsgXG5cdFx0ICBcdFx0XHRyZXR1cm4gXCJ2YWx1ZTogXCIgKyBmb3JtYXQoZC52YWx1ZSkgKyBkYXRhLnVuaXRzOyBcblx0XHQgIFx0XHR9KTtcblx0XHRcdFxuXHRcdFx0Y2VsbHNFbnRlci50cmFuc2l0aW9uKCkuc3R5bGUoXCJvcGFjaXR5XCIsIDAuNik7XG5cdFx0XHRcblx0XHRcdHZhciBhcmVhcyA9IHZpcy5zZWxlY3RBbGwoXCJwYXRoXCIpXG5cdFx0XHRcdC5kYXRhKGRhdGEubWFwLmZpbHRlcihmdW5jdGlvbihkKSB7IHJldHVybiBkLnBvaW50czsgfSksIFxuXHRcdFx0XHRcdFx0ZnVuY3Rpb24oZCkgeyByZXR1cm4gSlNPTi5zdHJpbmdpZnkoZC5wb2ludHMpOyB9KSxcblx0XHRcdGFyZWFzRW50ZXIgPSBhcmVhcy5lbnRlcigpLmFwcGVuZChcInBhdGhcIilcblx0XHRcdC5hdHRyKFwiZFwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBsaW5lKGQucG9pbnRzKSArIFwiWlwiOyB9KVxuXHRcdFx0LnN0eWxlKFwib3BhY2l0eVwiLCAxZS02KTtcblx0XHRcdFxuXHRcdFx0YXJlYXMuZXhpdCgpLnRyYW5zaXRpb24oKS5zdHlsZShcIm9wYWNpdHlcIiwgMWUtNikucmVtb3ZlKCk7XG5cdFx0XHRhcmVhc0VudGVyLmFwcGVuZChcInRpdGxlXCIpO1xuXHRcdFx0XG5cdFx0XHRhcmVhc1xuXHRcdFx0LmF0dHIoXCJjbGFzc1wiLCBmdW5jdGlvbihkKSB7IHJldHVybiBcImQ2LVwiK2NvbG9yU2NhbGUoZC52YWx1ZSk7IH0pXG5cdFx0XHRcdC5zZWxlY3QoXCJ0aXRsZVwiKVxuXHRcdFx0XHRcdC50ZXh0KGZ1bmN0aW9uKGQpIHsgXG5cdFx0XHRcdFx0XHRyZXR1cm4gXCJ2YWx1ZTogXCIgKyBmb3JtYXQoZC52YWx1ZSkgKyBkYXRhLnVuaXRzOyBcblx0XHRcdFx0XHR9KTtcblx0XHRcdGFyZWFzRW50ZXIudHJhbnNpdGlvbigpLnN0eWxlKFwib3BhY2l0eVwiLDAuNik7XG5cdFx0XG5cdFx0XHR2YXIgYXJlYUxhYmVscyA9IHZpcy5zZWxlY3RBbGwoXCJ0ZXh0XCIpXG5cdFx0XHRcdC5kYXRhKGRhdGEubWFwLmZpbHRlcihmdW5jdGlvbihkKSB7IHJldHVybiBkLnBvaW50czsgfSksIFxuXHRcdFx0XHRcdFx0ZnVuY3Rpb24oZCkgeyByZXR1cm4gSlNPTi5zdHJpbmdpZnkoZC5wb2ludHMpOyB9KSxcblx0XHRcdGFyZWFMYWJlbHNFbnRlciA9IGFyZWFMYWJlbHMuZW50ZXIoKS5hcHBlbmQoXCJ0ZXh0XCIpXG5cdFx0XHRcdFx0XHRcdFx0LnN0eWxlKFwiZm9udC13ZWlnaHRcIiwgXCJib2xkXCIpXG5cdFx0XHRcdFx0XHRcdFx0LmF0dHIoXCJ0ZXh0LWFuY2hvclwiLCBcIm1pZGRsZVwiKVxuXHRcdFx0XHRcdFx0XHRcdC5zdHlsZShcIm9wYWNpdHlcIiwxZS02KTtcblx0XHRcdFxuXHRcdFx0YXJlYUxhYmVscy5leGl0KCkudHJhbnNpdGlvbigpLnN0eWxlKFwib3BhY2l0eVwiLDFlLTYpLnJlbW92ZSgpO1xuXHRcdFx0XG5cdFx0XHRhcmVhTGFiZWxzLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgZnVuY3Rpb24oZCkgeyBcblx0XHRcdFx0XHR2YXIgY2VudGVyID0ge3g6MCx5OjB9O1xuXHRcdFx0XHRcdHZhciBhcmVhID0gMDtcblx0XHRcdFx0XHRmb3IgKHZhciBpPTA7IGk8ZC5wb2ludHMubGVuZ3RoOyArK2kpIHtcblx0XHRcdFx0XHRcdHZhciBwMSA9IGQucG9pbnRzW2ldO1xuXHRcdFx0XHRcdFx0dmFyIHAyID0gZC5wb2ludHNbaSsxXSB8fCBkLnBvaW50c1swXTtcblx0XHRcdFx0XHRcdHZhciBhaSA9IChwMS54KnAyLnkgLSBwMi54KnAxLnkpO1xuXHRcdFx0XHRcdFx0Y2VudGVyLnggKz0gKHAxLnggKyBwMi54KSphaTtcblx0XHRcdFx0XHRcdGNlbnRlci55ICs9IChwMS55ICsgcDIueSkqYWk7XG5cdFx0XHRcdFx0XHRhcmVhICs9IGFpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRhcmVhID0gYXJlYSAvIDI7XG5cdFx0XHRcdFx0Y2VudGVyLnggPSBjZW50ZXIueC8oNiphcmVhKTtcblx0XHRcdFx0XHRjZW50ZXIueSA9IGNlbnRlci55Lyg2KmFyZWEpO1xuXHRcdFx0XHRcdHJldHVybiBcInRyYW5zbGF0ZShcIiArIHgoY2VudGVyLngpICsgXCIsXCIgXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCsgeShjZW50ZXIueSkgKyBcIilcIjtcblx0XHRcdFx0fSlcblx0XHRcdC50ZXh0KGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGZvcm1hdChkLnZhbHVlKSArIGRhdGEudW5pdHM7IH0pO1xuXHRcdFx0XG5cdFx0XHRhcmVhTGFiZWxzRW50ZXIudHJhbnNpdGlvbigpLnN0eWxlKFwib3BhY2l0eVwiLDAuNik7XG5cdFx0fSk7XG5cdH1cblx0XG5cdGhlYXRtYXAueFNjYWxlID0gZnVuY3Rpb24oc2NhbGUpIHtcblx0XHRpZiAoISBhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4geDtcblx0XHR4ID0gc2NhbGU7XG5cdFx0cmV0dXJuIGhlYXRtYXA7XG5cdH07XG5cdFxuXHRoZWF0bWFwLnlTY2FsZSA9IGZ1bmN0aW9uKHNjYWxlKSB7XG5cdFx0aWYgKCEgYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHk7XG5cdFx0eSA9IHNjYWxlO1xuXHRcdHJldHVybiBoZWF0bWFwO1xuXHR9O1xuXHRcblx0aGVhdG1hcC5jb2xvclNldCA9IGZ1bmN0aW9uKHNjYWxlTmFtZSkge1xuXHRcdGlmICghIGFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBjb2xvcnM7XG5cdFx0Y29sb3JzID0gc2NhbGVOYW1lO1xuXHRcdHJldHVybiBoZWF0bWFwO1xuXHR9O1xuXHRcblx0aGVhdG1hcC5jb2xvck1vZGUgPSBmdW5jdGlvbihtb2RlKSB7XG5cdFx0aWYgKCEgYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHNjYWxlVHlwZTtcblx0XHRzY2FsZVR5cGUgPSBtb2RlO1xuXHRcdHJldHVybiBoZWF0bWFwO1xuXHR9O1xuXHRcblx0aGVhdG1hcC5jdXN0b21UaHJlc2hvbGRzID0gZnVuY3Rpb24odmFscykge1xuXHRcdGlmICghIGFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBjdXN0b21UaHJlc2hvbGRzO1xuXHRcdGN1c3RvbVRocmVzaG9sZHMgPSB2YWxzO1xuXHRcdHJldHVybiBoZWF0bWFwO1xuXHR9O1xuXHRcblx0aGVhdG1hcC5pZCA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiBpZDtcblx0fTtcblx0XG5cdGhlYXRtYXAudGl0bGUgPSBmdW5jdGlvbihuKSB7XG5cdFx0aWYgKCEgYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIG5hbWU7XG5cdFx0bmFtZSA9IG47XG5cdFx0cmV0dXJuIGhlYXRtYXA7XG5cdH07XG5cdFxuXHRyZXR1cm4gaGVhdG1hcDtcbn07IiwiLy9cbi8vICAgQ29weXJpZ2h0IDIwMTIgRGF2aWQgQ2lhcmxldHRhXG4vL1xuLy8gICBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuLy8gICB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4vLyAgIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vICAgVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuLy8gICBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4vLyAgIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuLy8gICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4vLyAgIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuLy9cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaW1hZ2VsYXllcigpIHtcblx0dmFyIHggPSBkMy5zY2FsZS5saW5lYXIoKSxcblx0eSA9IGQzLnNjYWxlLmxpbmVhcigpLFxuXHRpZCA9IFwiZnAtaW1hZ2VsYXllci1cIiArIG5ldyBEYXRlKCkudmFsdWVPZigpLFxuXHRuYW1lID0gXCJpbWFnZWxheWVyXCI7XG5cdFxuXHRmdW5jdGlvbiBpbWFnZXMoZykge1xuXHRcdGcuZWFjaChmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRpZiAoISBkYXRhKSByZXR1cm47XG5cdFx0XHR2YXIgZyA9IGQzLnNlbGVjdCh0aGlzKTtcblx0XHRcdFxuXHRcdFx0dmFyIGltZ3MgPSBnLnNlbGVjdEFsbChcImltYWdlXCIpXG5cdFx0XHRcdFx0XHQuZGF0YShkYXRhLCBmdW5jdGlvbihpbWcpIHtyZXR1cm4gaW1nLnVybDt9KTtcblx0XHRcdFxuXHRcdFx0aW1ncy5lbnRlcigpLmFwcGVuZChcImltYWdlXCIpXG5cdFx0XHQuYXR0cihcInhsaW5rOmhyZWZcIiwgZnVuY3Rpb24oaW1nKSB7cmV0dXJuIGltZy51cmw7fSlcblx0XHRcdC5zdHlsZShcIm9wYWNpdHlcIiwgMWUtNik7XG5cdFx0XHRcblx0XHRcdGltZ3MuZXhpdCgpLnRyYW5zaXRpb24oKS5zdHlsZShcIm9wYWNpdHlcIiwxZS02KS5yZW1vdmUoKTtcblx0XHRcdFxuXHRcdFx0aW1ncy50cmFuc2l0aW9uKClcblx0XHRcdC5hdHRyKFwieFwiLCBmdW5jdGlvbihpbWcpIHtyZXR1cm4geChpbWcueCk7fSlcblx0XHRcdC5hdHRyKFwieVwiLCBmdW5jdGlvbihpbWcpIHtyZXR1cm4geShpbWcueSk7fSlcblx0XHRcdC5hdHRyKFwiaGVpZ2h0XCIsIGZ1bmN0aW9uKGltZykge1xuXHRcdFx0XHRyZXR1cm4geShpbWcueStpbWcuaGVpZ2h0KSAtIHkoaW1nLnkpO1xuXHRcdFx0fSlcblx0XHRcdC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24oaW1nKSB7XG5cdFx0XHRcdHJldHVybiB4KGltZy54K2ltZy53aWR0aCkgLSB4KGltZy54KTtcblx0XHRcdH0pXG5cdFx0XHQuc3R5bGUoXCJvcGFjaXR5XCIsIGZ1bmN0aW9uKGltZykge1xuXHRcdFx0XHRyZXR1cm4gaW1nLm9wYWNpdHkgfHwgMS4wO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH1cblx0XG5cdGltYWdlcy54U2NhbGUgPSBmdW5jdGlvbihzY2FsZSkge1xuXHRcdGlmICghIGFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB4O1xuXHRcdHggPSBzY2FsZTtcblx0XHRyZXR1cm4gaW1hZ2VzO1xuXHR9O1xuXHRcblx0aW1hZ2VzLnlTY2FsZSA9IGZ1bmN0aW9uKHNjYWxlKSB7XG5cdFx0aWYgKCEgYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHk7XG5cdFx0eSA9IHNjYWxlO1xuXHRcdHJldHVybiBpbWFnZXM7XG5cdH07XG5cblx0aW1hZ2VzLmlkID0gZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIGlkO1xuXHR9O1xuXHRcblx0aW1hZ2VzLnRpdGxlID0gZnVuY3Rpb24obikge1xuXHRcdGlmICghIGFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBuYW1lO1xuXHRcdG5hbWUgPSBuO1xuXHRcdHJldHVybiBpbWFnZXM7XG5cdH07XG5cblx0cmV0dXJuIGltYWdlcztcbn07IiwiaW1wb3J0IGZsb29ycGxhbiBmcm9tIFwiLi9mbG9vcnBsYW5cIjtcbmltcG9ydCBoZWF0bWFwIGZyb20gXCIuL2hlYXRtYXBcIjtcbmltcG9ydCBpbWFnZWxheWVyIGZyb20gXCIuL2ltYWdlbGF5ZXJcIjtcbmltcG9ydCBvdmVybGF5cyBmcm9tIFwiLi9vdmVybGF5c1wiO1xuaW1wb3J0IHBhdGhwbG90IGZyb20gXCIuL3BhdGhwbG90XCI7XG5pbXBvcnQgdmVjdG9yZmllbGQgZnJvbSBcIi4vdmVjdG9yZmllbGRcIjtcblxuaWYgKCF3aW5kb3cuZDMpe1xuICB0aHJvdyBuZXcgRXJyb3IoXCJkMy5qcyBpcyByZXF1aXJlZCEgPiBodHRwOi8vZDNqcy5vcmcvXCIpO1xufVxuXG5sZXQgZDMgPSB3aW5kb3cuZDM7XG5cbmQzLmZsb29ycGxhbiA9IGZsb29ycGxhbjtcbmQzLmZsb29ycGxhbi52ZXJzaW9uID0gcmVxdWlyZSgnLi4vcGFja2FnZS5qc29uJykudmVyc2lvbjtcblxuZDMuZmxvb3JwbGFuLmhlYXRtYXAgPSBoZWF0bWFwO1xuZDMuZmxvb3JwbGFuLmltYWdlbGF5ZXIgPSBpbWFnZWxheWVyO1xuZDMuZmxvb3JwbGFuLm92ZXJsYXlzID0gb3ZlcmxheXM7XG5kMy5mbG9vcnBsYW4ucGF0aHBsb3QgPSBwYXRocGxvdDtcbmQzLmZsb29ycGxhbi52ZWN0b3JmaWVsZCA9IHZlY3RvcmZpZWxkO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgZmxvb3JwbGFuLFxuICBoZWF0bWFwLFxuICBpbWFnZWxheWVyLFxuICBvdmVybGF5cyxcbiAgcGF0aHBsb3QsXG4gIHZlY3RvcmZpZWxkXG59O1xuIiwiLy9cbi8vICAgQ29weXJpZ2h0IDIwMTIgRGF2aWQgQ2lhcmxldHRhXG4vL1xuLy8gICBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuLy8gICB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4vLyAgIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vICAgVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuLy8gICBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4vLyAgIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuLy8gICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4vLyAgIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuLy9cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gb3ZlcmxheXMoKSB7XG5cdHZhciB4ID0gZDMuc2NhbGUubGluZWFyKCksXG5cdHkgPSBkMy5zY2FsZS5saW5lYXIoKSxcblx0aWQgPSBcImZwLW92ZXJsYXlzLVwiICsgbmV3IERhdGUoKS52YWx1ZU9mKCksXG5cdG5hbWUgPSBcIm92ZXJsYXlzXCIsXG5cdGNhbnZhc0NhbGxiYWNrcyA9IFtdLFxuXHRzZWxlY3RDYWxsYmFja3MgPSBbXSxcblx0bW92ZUNhbGxiYWNrcyA9IFtdLFxuXHRlZGl0TW9kZSA9IGZhbHNlLFxuXHRsaW5lID0gZDMuc3ZnLmxpbmUoKVxuXHRcdC54KGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHgoZC54KTsgfSlcblx0XHQueShmdW5jdGlvbihkKSB7IHJldHVybiB5KGQueSk7IH0pLFxuXHRkcmFnQmVoYXZpb3IgPSBkMy5iZWhhdmlvci5kcmFnKClcblx0XHQub24oXCJkcmFnc3RhcnRcIiwgX19kcmFnSXRlbSlcblx0XHQub24oXCJkcmFnXCIsIF9fbW91c2Vtb3ZlKVxuXHRcdC5vbihcImRyYWdlbmRcIiwgX19tb3VzZXVwKSxcblx0ZHJhZ2dlZCA9IG51bGw7XG5cdFxuXHRmdW5jdGlvbiBvdmVybGF5cyhnKSB7XG5cdFx0Zy5lYWNoKGZ1bmN0aW9uKGRhdGEpe1xuXHRcdFx0aWYgKCEgZGF0YSkgcmV0dXJuO1xuXHRcdFx0dmFyIGcgPSBkMy5zZWxlY3QodGhpcyk7XG5cdFx0XHRcblx0XHRcdC8vIHNldHVwIHJlY3RhbmdsZSBmb3IgY2FwdHVyaW5nIGV2ZW50c1xuXHRcdFx0dmFyIGNhbnZhcyA9IGcuc2VsZWN0QWxsKFwicmVjdC5vdmVybGF5LWNhbnZhc1wiKS5kYXRhKFswXSk7XG5cdFx0XHRcblx0XHRcdGNhbnZhcy5lbnRlcigpLmFwcGVuZChcInJlY3RcIilcblx0XHRcdC5hdHRyKFwiY2xhc3NcIiwgXCJvdmVybGF5LWNhbnZhc1wiKVxuXHRcdFx0LnN0eWxlKFwib3BhY2l0eVwiLCAwKVxuXHRcdFx0LmF0dHIoXCJwb2ludGVyLWV2ZW50c1wiLCBcImFsbFwiKVxuXHRcdFx0Lm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmIChlZGl0TW9kZSkge1xuXHRcdFx0XHRcdHZhciBwID0gZDMubW91c2UodGhpcyk7XG5cdFx0XHRcdFx0Y2FudmFzQ2FsbGJhY2tzLmZvckVhY2goZnVuY3Rpb24oY2IpIHtcblx0XHRcdFx0XHRcdGNiKHguaW52ZXJ0KHBbMF0pLCB5LmludmVydChwWzFdKSk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cdFx0XHQub24oXCJtb3VzZXVwLmRyYWdcIiwgX19tb3VzZXVwKVxuXHRcdFx0Lm9uKFwidG91Y2hlbmQuZHJhZ1wiLCBfX21vdXNldXApO1xuXHRcdFx0XG5cdFx0XHRjYW52YXMuYXR0cihcInhcIiwgeC5yYW5nZSgpWzBdKVxuXHRcdFx0LmF0dHIoXCJ5XCIsIHkucmFuZ2UoKVswXSlcblx0XHRcdC5hdHRyKFwiaGVpZ2h0XCIsIHkucmFuZ2UoKVsxXSAtIHkucmFuZ2UoKVswXSlcblx0XHRcdC5hdHRyKFwid2lkdGhcIiwgeC5yYW5nZSgpWzFdIC0geC5yYW5nZSgpWzBdKTtcblx0XHRcdFxuXHRcdFx0Ly8gZHJhdyBwb2x5Z29ucyAoY3VycmVudGx5IG9ubHkgdHlwZSBzdXBwb3J0ZWQpXG5cdFx0XHR2YXIgcG9seWdvbnMgPSBnLnNlbGVjdEFsbChcInBhdGgucG9seWdvblwiKVxuXHRcdFx0XHQuZGF0YShkYXRhLnBvbHlnb25zIHx8IFtdLCBmdW5jdGlvbihkKSB7cmV0dXJuIGQuaWQ7fSk7XG5cdFx0XHRcblx0XHRcdHBvbHlnb25zLmVudGVyKCkuYXBwZW5kKFwicGF0aFwiKVxuXHRcdFx0LmF0dHIoXCJjbGFzc1wiLCBcInBvbHlnb25cIilcblx0XHRcdC5hdHRyKFwidmVjdG9yLWVmZmVjdFwiLCBcIm5vbi1zY2FsaW5nLXN0cm9rZVwiKVxuXHRcdFx0LmF0dHIoXCJwb2ludGVyLWV2ZW50c1wiLCBcImFsbFwiKVxuXHRcdFx0Lm9uKFwibW91c2Vkb3duXCIsIGZ1bmN0aW9uKGQpIHtcblx0XHRcdFx0c2VsZWN0Q2FsbGJhY2tzLmZvckVhY2goZnVuY3Rpb24oY2IpIHtcblx0XHRcdFx0XHRjYihkLmlkKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KVxuXHRcdFx0LmNhbGwoZHJhZ0JlaGF2aW9yKVxuXHRcdFx0LmFwcGVuZChcInRpdGxlXCIpO1xuXHRcdFx0XG5cdFx0XHRwb2x5Z29ucy5leGl0KCkudHJhbnNpdGlvbigpLnN0eWxlKFwib3BhY2l0eVwiLCAxZS02KS5yZW1vdmUoKTtcblx0XHRcdFxuXHRcdFx0cG9seWdvbnNcblx0XHRcdC5hdHRyKFwiZFwiLCBmdW5jdGlvbihkKSB7cmV0dXJuIGxpbmUoZC5wb2ludHMpICsgXCJaXCI7fSlcblx0XHRcdC5zdHlsZShcImN1cnNvclwiLCBlZGl0TW9kZSA/IFwibW92ZVwiIDogXCJwb2ludGVyXCIpXG5cdFx0XHRcdC5zZWxlY3QoXCJ0aXRsZVwiKVxuXHRcdFx0XHQudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLm5hbWUgfHwgZC5pZDsgfSk7XG5cdFx0XHRcblx0XHRcdGlmIChlZGl0TW9kZSkge1xuXHRcdFx0XHR2YXIgcG9pbnREYXRhID0gW107XG5cdFx0XHRcdGlmIChkYXRhLnBvbHlnb25zKSB7XG5cdFx0XHRcdFx0ZGF0YS5wb2x5Z29ucy5mb3JFYWNoKGZ1bmN0aW9uKHBvbHlnb24pIHtcblx0XHRcdFx0XHRcdHBvbHlnb24ucG9pbnRzLmZvckVhY2goZnVuY3Rpb24ocHQsIGkpIHtcblx0XHRcdFx0XHRcdFx0cG9pbnREYXRhLnB1c2goe1wiaW5kZXhcIjppLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFwicGFyZW50XCI6cG9seWdvbn0pO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdC8vIGRldGVybWluZSBjdXJyZW50IHZpZXcgc2NhbGUgdG8gbWFrZSBhcHByb3ByaWF0ZWx5XG5cdFx0XHRcdC8vIHNpemVkIHBvaW50cyB0byBkcmFnXG5cdFx0XHRcdHZhciBzY2FsZSA9IDE7XG5cdFx0XHRcdHZhciBub2RlID0gZy5ub2RlKCk7XG5cdFx0XHRcdHdoaWxlIChub2RlLnBhcmVudE5vZGUpIHtcblx0XHRcdFx0XHRub2RlID0gbm9kZS5wYXJlbnROb2RlO1xuXHRcdFx0XHRcdGlmIChub2RlLl9fc2NhbGVfXykge1xuXHRcdFx0XHRcdFx0c2NhbGUgPSBub2RlLl9fc2NhbGVfXztcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0dmFyIHBvaW50cyA9IGcuc2VsZWN0QWxsKFwiY2lyY2xlLnZlcnRleFwiKVxuXHRcdFx0XHQuZGF0YShwb2ludERhdGEsIGZ1bmN0aW9uKGQpIHtyZXR1cm4gZC5wYXJlbnQuaWQgKyBcIi1cIiArIGQuaW5kZXg7fSk7XG5cdFx0XHRcdFxuXHRcdFx0XHRwb2ludHMuZXhpdCgpLnRyYW5zaXRpb24oKVxuXHRcdFx0XHQuYXR0cihcInJcIiwgMWUtNikucmVtb3ZlKCk7XG5cdFx0XHRcdFxuXHRcdFx0XHRwb2ludHMuZW50ZXIoKS5hcHBlbmQoXCJjaXJjbGVcIilcblx0XHRcdFx0LmF0dHIoXCJjbGFzc1wiLCBcInZlcnRleFwiKVxuXHRcdFx0XHQuYXR0cihcInBvaW50ZXItZXZlbnRzXCIsIFwiYWxsXCIpXG5cdFx0XHRcdC5hdHRyKFwidmVjdG9yLWVmZmVjdFwiLCBcIm5vbi1zY2FsaW5nLXN0cm9rZVwiKVxuXHRcdFx0XHQuc3R5bGUoXCJjdXJzb3JcIiwgXCJtb3ZlXCIpXG5cdFx0XHRcdC5hdHRyKFwiclwiLCAxZS02KVxuXHRcdFx0XHQuY2FsbChkcmFnQmVoYXZpb3IpO1xuXHRcdFx0XHRcblx0XHRcdFx0cG9pbnRzXG5cdFx0XHRcdC5hdHRyKFwiY3hcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4geChkLnBhcmVudC5wb2ludHNbZC5pbmRleF0ueCk7IH0pXG5cdFx0XHRcdC5hdHRyKFwiY3lcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4geShkLnBhcmVudC5wb2ludHNbZC5pbmRleF0ueSk7IH0pXG5cdFx0XHRcdC5hdHRyKFwiclwiLCA0L3NjYWxlKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGcuc2VsZWN0QWxsKFwiY2lyY2xlLnZlcnRleFwiKS50cmFuc2l0aW9uKClcblx0XHRcdFx0LmF0dHIoXCJyXCIsIDFlLTYpLnJlbW92ZSgpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0b3ZlcmxheXMueFNjYWxlID0gZnVuY3Rpb24oc2NhbGUpIHtcblx0XHRpZiAoISBhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4geDtcblx0XHR4ID0gc2NhbGU7XG5cdFx0cmV0dXJuIG92ZXJsYXlzO1xuXHR9O1xuXHRcblx0b3ZlcmxheXMueVNjYWxlID0gZnVuY3Rpb24oc2NhbGUpIHtcblx0XHRpZiAoISBhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4geTtcblx0XHR5ID0gc2NhbGU7XG5cdFx0cmV0dXJuIG92ZXJsYXlzO1xuXHR9O1xuXG5cdG92ZXJsYXlzLmlkID0gZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIGlkO1xuXHR9O1xuXHRcblx0b3ZlcmxheXMudGl0bGUgPSBmdW5jdGlvbihuKSB7XG5cdFx0aWYgKCEgYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIG5hbWU7XG5cdFx0bmFtZSA9IG47XG5cdFx0cmV0dXJuIG92ZXJsYXlzO1xuXHR9O1xuXHRcblx0b3ZlcmxheXMuZWRpdE1vZGUgPSBmdW5jdGlvbihlbmFibGUpIHtcblx0XHRpZiAoISBhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gZWRpdE1vZGU7XG5cdFx0ZWRpdE1vZGUgPSBlbmFibGU7XG5cdFx0cmV0dXJuIG92ZXJsYXlzO1xuXHR9O1xuXHRcblx0b3ZlcmxheXMucmVnaXN0ZXJDYW52YXNDYWxsYmFjayA9IGZ1bmN0aW9uKGNiKSB7XG5cdFx0aWYgKGFyZ3VtZW50cy5sZW5ndGgpIGNhbnZhc0NhbGxiYWNrcy5wdXNoKGNiKTtcblx0XHRyZXR1cm4gb3ZlcmxheXM7XG5cdH07XG5cdFxuXHRvdmVybGF5cy5yZWdpc3RlclNlbGVjdENhbGxiYWNrID0gZnVuY3Rpb24oY2IpIHtcblx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCkgc2VsZWN0LkNhbGxiYWNrcy5wdXNoKGNiKTtcblx0XHRyZXR1cm4gb3ZlcmxheXM7XG5cdH07XG5cdFxuXHRvdmVybGF5cy5yZWdpc3Rlck1vdmVDYWxsYmFjayA9IGZ1bmN0aW9uKGNiKSB7XG5cdFx0aWYgKGFyZ3VtZW50cy5sZW5ndGgpIG1vdmVDYWxsYmFja3MucHVzaChjYik7XG5cdFx0cmV0dXJuIG92ZXJsYXlzO1xuXHR9O1xuXHRcblx0ZnVuY3Rpb24gX19kcmFnSXRlbShkKSB7XG5cdFx0aWYgKGVkaXRNb2RlKSBkcmFnZ2VkID0gZDtcblx0fVxuXHRcblx0ZnVuY3Rpb24gX19tb3VzZW1vdmUoKSB7XG5cdFx0aWYgKGRyYWdnZWQpIHtcblx0XHRcdHZhciBkeCA9IHguaW52ZXJ0KGQzLmV2ZW50LmR4KSAtIHguaW52ZXJ0KDApO1xuXHRcdFx0dmFyIGR5ID0geS5pbnZlcnQoZDMuZXZlbnQuZHkpIC0geS5pbnZlcnQoMCk7XG5cdFx0XHRpZiAoZHJhZ2dlZC5wYXJlbnQpIHsgLy8gYSBwb2ludFxuXHRcdFx0XHRkcmFnZ2VkLnBhcmVudC5wb2ludHNbZHJhZ2dlZC5pbmRleF0ueCArPSBkeDtcblx0XHRcdFx0ZHJhZ2dlZC5wYXJlbnQucG9pbnRzW2RyYWdnZWQuaW5kZXhdLnkgKz0gZHk7XG5cdFx0XHR9IGVsc2UgaWYgKGRyYWdnZWQucG9pbnRzKSB7IC8vIGEgY29tcG9zaXRlIG9iamVjdFxuXHRcdFx0XHRkcmFnZ2VkLnBvaW50cy5mb3JFYWNoKGZ1bmN0aW9uKHB0KSB7XG5cdFx0XHRcdFx0cHQueCArPSBkeDtcblx0XHRcdFx0XHRwdC55ICs9IGR5O1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdC8vIHBhcmVudCBpcyBjb250YWluZXIgZm9yIG92ZXJsYXlzXG5cdFx0XHRvdmVybGF5cyhkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKSk7XG5cdFx0fVxuXHR9XG5cdFxuXHRmdW5jdGlvbiBfX21vdXNldXAoKSB7XG5cdFx0aWYgKGRyYWdnZWQpIHtcblx0XHRcdG1vdmVDYWxsYmFja3MuZm9yRWFjaChmdW5jdGlvbihjYikge1xuXHRcdFx0XHRkcmFnZ2VkLnBhcmVudCA/IGNiKGRyYWdnZWQucGFyZW50LmlkLCBkcmFnZ2VkLnBhcmVudC5wb2ludHMsIGRyYWdnZWQuaW5kZXgpIDpcblx0XHRcdFx0XHRjYihkcmFnZ2VkLmlkLCBkcmFnZ2VkLnBvaW50cyk7XG5cdFx0XHR9KTtcblx0XHRcdGRyYWdnZWQgPSBudWxsO1xuXHRcdH1cblx0fVxuXHRcblx0cmV0dXJuIG92ZXJsYXlzO1xufTsiLCIvL1xuLy8gICBDb3B5cmlnaHQgMjAxMiBEYXZpZCBDaWFybGV0dGFcbi8vXG4vLyAgIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4vLyAgIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbi8vICAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gICBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4vLyAgIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbi8vICAgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4vLyAgIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbi8vICAgbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4vL1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBwYXRocGxvdCgpIHtcblx0dmFyIHggPSBkMy5zY2FsZS5saW5lYXIoKSxcblx0eSA9IGQzLnNjYWxlLmxpbmVhcigpLFxuXHRsaW5lID0gZDMuc3ZnLmxpbmUoKVxuXHRcdC54KGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHgoZC54KTsgfSlcblx0XHQueShmdW5jdGlvbihkKSB7IHJldHVybiB5KGQueSk7IH0pLFxuXHRpZCA9IFwiZnAtcGF0aHBsb3QtXCIgKyBuZXcgRGF0ZSgpLnZhbHVlT2YoKSxcblx0bmFtZSA9IFwicGF0aHBsb3RcIixcblx0cG9pbnRGaWx0ZXIgPSBmdW5jdGlvbihkKSB7IHJldHVybiBkLnBvaW50czsgfTtcblx0XG5cdGZ1bmN0aW9uIHBhdGhwbG90KGcpIHtcblx0XHRnLmVhY2goZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0aWYgKCFkYXRhKSByZXR1cm47XG5cdFx0XHRcblx0XHRcdHZhciBnID0gZDMuc2VsZWN0KHRoaXMpLFxuXHRcdFx0cGF0aHMgPSBnLnNlbGVjdEFsbChcInBhdGhcIilcblx0XHRcdFx0LmRhdGEoZGF0YSwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5pZDsgfSk7XG5cdFx0XHRcblx0XHRcdHBhdGhzLmV4aXQoKS50cmFuc2l0aW9uKClcblx0XHRcdC5zdHlsZShcIm9wYWNpdHlcIiwgMWUtNikucmVtb3ZlKCk7XG5cdFx0XHRcblx0XHRcdHBhdGhzLmVudGVyKCkuYXBwZW5kKFwicGF0aFwiKVxuXHRcdFx0LmF0dHIoXCJ2ZWN0b3ItZWZmZWN0XCIsIFwibm9uLXNjYWxpbmctc3Ryb2tlXCIpXG5cdFx0XHQuYXR0cihcImZpbGxcIiwgXCJub25lXCIpXG5cdFx0XHQuc3R5bGUoXCJvcGFjaXR5XCIsIDFlLTYpXG5cdFx0XHRcdC5hcHBlbmQoXCJ0aXRsZVwiKTtcblx0XHRcdFxuXHRcdFx0cGF0aHNcblx0XHRcdC5hdHRyKFwiY2xhc3NcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5jbGFzc2VzIHx8IGQuaWQ7IH0pXG5cdFx0XHQuYXR0cihcImRcIiwgZnVuY3Rpb24oZCxpKSB7IHJldHVybiBsaW5lKHBvaW50RmlsdGVyKGQsaSkpOyB9KVxuXHRcdFx0XHQuc2VsZWN0KFwidGl0bGVcIilcblx0XHRcdFx0LnRleHQoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC50aXRsZSB8fCBkLmlkOyB9KTtcblx0XHRcdFxuXHRcdFx0cGF0aHMudHJhbnNpdGlvbigpLnN0eWxlKFwib3BhY2l0eVwiLCAxKTtcblx0XHR9KTtcblx0fVxuXHRcblx0cGF0aHBsb3QueFNjYWxlID0gZnVuY3Rpb24oc2NhbGUpIHtcblx0XHRpZiAoISBhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4geDtcblx0XHR4ID0gc2NhbGU7XG5cdFx0cmV0dXJuIHBhdGhwbG90O1xuXHR9O1xuXHRcblx0cGF0aHBsb3QueVNjYWxlID0gZnVuY3Rpb24oc2NhbGUpIHtcblx0XHRpZiAoISBhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4geTtcblx0XHR5ID0gc2NhbGU7XG5cdFx0cmV0dXJuIHBhdGhwbG90O1xuXHR9O1xuXG5cdHBhdGhwbG90LmlkID0gZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIGlkO1xuXHR9O1xuXHRcblx0cGF0aHBsb3QudGl0bGUgPSBmdW5jdGlvbihuKSB7XG5cdFx0aWYgKCEgYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIG5hbWU7XG5cdFx0bmFtZSA9IG47XG5cdFx0cmV0dXJuIHBhdGhwbG90O1xuXHR9O1xuXG5cdHBhdGhwbG90LnBvaW50RmlsdGVyID0gZnVuY3Rpb24oZm4pIHtcblx0XHRpZiAoISBhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gcG9pbnRGaWx0ZXI7XG5cdFx0cG9pbnRGaWx0ZXIgPSBmbjtcblx0XHRyZXR1cm4gcGF0aHBsb3Q7XG5cdH07XG5cdFxuXHRyZXR1cm4gcGF0aHBsb3Q7XG59OyIsIi8vXG4vLyAgIENvcHlyaWdodCAyMDEyIERhdmlkIENpYXJsZXR0YVxuLy9cbi8vICAgTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbi8vICAgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuLy8gICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyAgIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbi8vICAgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuLy8gICBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbi8vICAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuLy8gICBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbi8vXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHZlY3RvcmZpZWxkKCkge1xuXHR2YXIgeCA9IGQzLnNjYWxlLmxpbmVhcigpLFxuXHR5ID0gZDMuc2NhbGUubGluZWFyKCksXG5cdGxpbmUgPSBkMy5zdmcubGluZSgpXG5cdFx0LngoZnVuY3Rpb24oZCkgeyByZXR1cm4geChkLngpOyB9KVxuXHRcdC55KGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHkoZC55KTsgfSksXG5cdGlkID0gXCJmcC12ZWN0b3JmaWVsZC1cIiArIG5ldyBEYXRlKCkudmFsdWVPZigpLFxuXHRuYW1lID0gXCJ2ZWN0b3JmaWVsZFwiO1xuXHRcblx0ZnVuY3Rpb24gdmVjdG9yZmllbGQoZykge1xuXHRcdGcuZWFjaChmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRpZiAoISBkYXRhIHx8ICEgZGF0YS5tYXApIHJldHVybjtcblx0XHRcdFxuXHRcdFx0dmFyIGcgPSBkMy5zZWxlY3QodGhpcyk7XG5cdFx0XHRcblx0XHRcdHZhciBjZWxscyA9IGcuc2VsZWN0QWxsKFwicGF0aC52ZWN0b3JcIilcblx0XHRcdFx0LmRhdGEoZGF0YS5tYXAsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQueCtcIixcIitkLnk7IH0pO1xuXHRcdFx0XG5cdFx0XHRjZWxscy5leGl0KCkudHJhbnNpdGlvbigpXG5cdFx0XHQuc3R5bGUoXCJvcGFjaXR5XCIsIDFlLTYpLnJlbW92ZSgpO1xuXHRcdFx0XG5cdFx0XHRjZWxscy5lbnRlcigpLmFwcGVuZChcInBhdGhcIilcblx0XHRcdC5hdHRyKFwiY2xhc3NcIiwgXCJ2ZWN0b3JcIilcblx0XHRcdC5hdHRyKFwidmVjdG9yLWVmZmVjdFwiLCBcIm5vbi1zY2FsaW5nLXN0cm9rZVwiKVxuXHRcdFx0LnN0eWxlKFwib3BhY2l0eVwiLCAxZS02KVxuXHRcdFx0LmFwcGVuZChcInRpdGxlXCIpO1xuXHRcdFx0XG5cdFx0XHR2YXIgc2NhbGVGYWN0b3IgPSBkYXRhLmJpblNpemUvIDIgL1xuXHRcdFx0ZDMubWF4KGRhdGEubWFwLCBmdW5jdGlvbihkKSB7XG5cdFx0XHRcdHJldHVybiBNYXRoLm1heChNYXRoLmFicyhkLnZhbHVlLngpLE1hdGguYWJzKGQudmFsdWUueSkpO1xuXHRcdFx0fSk7XG5cdFx0XHRcblx0XHRcdGNlbGxzLmF0dHIoXCJkXCIsIGZ1bmN0aW9uKGQpIHtcblx0XHRcdFx0dmFyIHYwID0ge3g6IChkLnggKyBkYXRhLmJpblNpemUvMiksIFxuXHRcdFx0XHRcdFx0ICB5OiAoZC55ICsgZGF0YS5iaW5TaXplLzIpfTtcblx0XHRcdFx0dmFyIHYxID0ge3g6ICh2MC54ICsgZC52YWx1ZS54KnNjYWxlRmFjdG9yKSwgXG5cdFx0XHRcdFx0XHQgIHk6ICh2MC55ICsgZC52YWx1ZS55KnNjYWxlRmFjdG9yKX07XG5cdFx0XHRcdHJldHVybiBsaW5lKFt2MCx2MV0pO1xuXHRcdFx0fSlcblx0XHRcdFx0LnNlbGVjdChcInRpdGxlXCIpXG5cdFx0XHRcdC50ZXh0KGZ1bmN0aW9uKGQpIHsgXG5cdFx0XHRcdFx0cmV0dXJuIE1hdGguc3FydChkLnZhbHVlLngqZC52YWx1ZS54ICsgZC52YWx1ZS55KmQudmFsdWUueSlcblx0XHRcdFx0XHQrIFwiIFwiICsgZGF0YS51bml0czsgXG5cdFx0XHRcdH0pO1xuXHRcdFx0XG5cdFx0XHRjZWxscy50cmFuc2l0aW9uKCkuc3R5bGUoXCJvcGFjaXR5XCIsIDEpO1xuXHRcdH0pO1xuXHR9XG5cdFxuXHR2ZWN0b3JmaWVsZC54U2NhbGUgPSBmdW5jdGlvbihzY2FsZSkge1xuXHRcdGlmICghIGFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB4O1xuXHRcdHggPSBzY2FsZTtcblx0XHRyZXR1cm4gdmVjdG9yZmllbGQ7XG5cdH07XG5cdFxuXHR2ZWN0b3JmaWVsZC55U2NhbGUgPSBmdW5jdGlvbihzY2FsZSkge1xuXHRcdGlmICghIGFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB5O1xuXHRcdHkgPSBzY2FsZTtcblx0XHRyZXR1cm4gdmVjdG9yZmllbGQ7XG5cdH07XG5cblx0dmVjdG9yZmllbGQuaWQgPSBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gaWQ7XG5cdH07XG5cdFxuXHR2ZWN0b3JmaWVsZC50aXRsZSA9IGZ1bmN0aW9uKG4pIHtcblx0XHRpZiAoISBhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gbmFtZTtcblx0XHRuYW1lID0gbjtcblx0XHRyZXR1cm4gaW1hZ2VzO1xuXHR9O1xuXHRcblx0cmV0dXJuIHZlY3RvcmZpZWxkO1xufTsiXX0=
