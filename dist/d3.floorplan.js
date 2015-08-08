(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

module.exports = function floorplan() {
	var layers = [],
	panZoomEnabled = true,
	maxZoom = 5,
	xScale = d3.scale.linear(),
	yScale = d3.scale.linear();

	function map(g) {
		var width = xScale.range()[1] - xScale.range()[0],
		    height = yScale.range()[1] - yScale.range()[0];
		
		g.each(function(data){
			if (! data) return;
			
			var g = d3.select(this);

			// define common graphical elements
			__init_defs(g.selectAll("defs").data([0]).enter().append("defs"));

			// setup container for layers and area to capture events
			var vis = g.selectAll(".map-layers").data([0]),
			visEnter = vis.enter().append("g").attr("class","map-layers"),
			visUpdate = d3.transition(vis);

			visEnter.append("rect")
			.attr("class", "canvas")
			.attr("pointer-events","all")
			.style("opacity",0);

			visUpdate.attr("width", width)
			.attr("height", height)
			.attr("x",xScale.range()[0])
			.attr("y",yScale.range()[0]);

			// setup map controls
			var controls = g.selectAll(".map-controls").data([0]),
			controlsEnter = controls.enter()
							.append("g").attr("class","map-controls");

			__init_controls(controlsEnter);
			var offset = controls.select(".hide")
						.classed("ui-show-hide") ? 95 : 10,
			panelHt = Math.max(45, 10 + layers.length * 20);
			controls.attr("view-width", width)
			.attr("transform", "translate("+(width-offset)+",0)")
				.select("rect")
				.attr("height", panelHt);
			
			
			// render and reorder layer controls
			var layerControls = controls.select("g.layer-controls")
				.selectAll("g").data(layers, function(l) {return l.id();}),
			layerControlsEnter = layerControls.enter()
				.append("g").attr("class", "ui-active")
				.style("cursor","pointer")
				.on("click", function(l) {
					var button = d3.select(this);
					var layer = g.selectAll("g."+l.id());
					if (button.classed("ui-active")) {
						layer.style("display","none");
						button.classed("ui-active",false)
							.classed("ui-default",true);
					} else {
						layer.style("display","inherit");
						button.classed("ui-active", true)
							.classed("ui-default", false);
					}
				});
			
			layerControlsEnter.append("rect")
				.attr("x", 0)
				.attr("y", 1)
				.attr("rx", 5)
				.attr("ry", 5)
				.attr("width", 75)
				.attr("height", 18)
				.attr("stroke-width", "1px");
			
			layerControlsEnter.append("text")
				.attr("x", 10)
				.attr("y", 15)
				.style("font-size","12px")
				.style("font-family", "Helvetica, Arial, sans-serif")
				.text(function(l) { return l.title(); });
			
			layerControls.transition().duration(1000)
			.attr("transform", function(d,i) { 
				return "translate(0," + ((layers.length-(i+1))*20) + ")"; 
			});

			// render and reorder layers
			var maplayers = vis.selectAll(".maplayer")
							.data(layers, function(l) {return l.id();});
			maplayers.enter()
			.append("g")
			.attr("class", function(l) {return "maplayer " + l.title();})
				.append("g")
				.attr("class", function(l) {return l.id();})
				.datum(null);
			maplayers.exit().remove();
			maplayers.order();
			
			// redraw layers
			maplayers.each(function(layer) {
				d3.select(this).select("g." + layer.id()).datum(data[layer.id()]).call(layer);
			});
			
			// add pan - zoom behavior
			g.call(d3.behavior.zoom().scaleExtent([1,maxZoom])
					.on("zoom", function() {
						if (panZoomEnabled) {
							__set_view(g, d3.event.scale, d3.event.translate);
						}
					}));

		});
	}

	map.xScale = function(scale) {
		if (! arguments.length) return xScale;
		xScale = scale;
		layers.forEach(function(l) { l.xScale(xScale); });
		return map;
	};
	
	map.yScale = function(scale) {
		if (! arguments.length) return yScale;
		yScale = scale;
		layers.forEach(function(l) { l.yScale(yScale); });
		return map;
	};
	
	map.panZoom = function(enabled) {
		if (! arguments.length) return panZoomEnabled;
		panZoomEnabled = enabled;
		return map;
	};
	
	map.addLayer = function(layer, index) {
		layer.xScale(xScale);
		layer.yScale(yScale);
		
		if (arguments.length > 1 && index >=0) {
			layers.splice(index, 0, layer);
		} else {
			layers.push(layer);
		}
		
		return map;
	};
	
	function __set_view(g, s, t) {
		if (! g) return;
		if (s) g.__scale__ = s;
		if (t && t.length > 1) g.__translate__ = t;

		// limit translate to edges of extents
		var minXTranslate = (1 - g.__scale__) * 
							(xScale.range()[1] - xScale.range()[0]);
		var minYTranslate = (1 - g.__scale__) * 
							(yScale.range()[1] - yScale.range()[0]);

		g.__translate__[0] = Math.min(xScale.range()[0], 
								Math.max(g.__translate__[0], minXTranslate));
		g.__translate__[1] = Math.min(yScale.range()[0], 
								Math.max(g.__translate__[1], minYTranslate));
		g.selectAll(".map-layers")
			.attr("transform", 
				  "translate(" + g.__translate__ + 
				  	 ")scale(" + g.__scale__ + ")");
	};

	function __init_defs(selection) {
		selection.each(function() {
			var defs = d3.select(this);

			var grad = defs.append("radialGradient")
			.attr("id","metal-bump")
			.attr("cx","50%")
			.attr("cy","50%")
			.attr("r","50%")
			.attr("fx","50%")
			.attr("fy","50%");

			grad.append("stop")
			.attr("offset","0%")
			.style("stop-color","rgb(170,170,170)")
			.style("stop-opacity",0.6);

			grad.append("stop")
			.attr("offset","100%")
			.style("stop-color","rgb(204,204,204)")
			.style("stop-opacity",0.5);

			var grip = defs.append("pattern")
			.attr("id", "grip-texture")
			.attr("patternUnits", "userSpaceOnUse")
			.attr("x",0)
			.attr("y",0)
			.attr("width",3)
			.attr("height",3);

			grip.append("rect")
			.attr("height",3)
			.attr("width",3)
			.attr("stroke","none")
			.attr("fill", "rgba(204,204,204,0.5)");

			grip.append("circle")
			.attr("cx", 1.5)
			.attr("cy", 1.5)
			.attr("r", 1)
			.attr("stroke", "none")
			.attr("fill", "url(#metal-bump)");
		});
	}

	function __init_controls(selection) {
		selection.each(function() {
			var controls = d3.select(this);

			controls.append("path")
			.attr("class", "ui-show-hide")
			.attr("d", "M10,3 v40 h-7 a3,3 0 0,1 -3,-3 v-34 a3,3 0 0,1 3,-3 Z")
			.attr("fill","url(#grip-texture)")
			.attr("stroke", "none")
			.style("opacity", 0.5);

			controls.append("path")
			.attr("class", "show ui-show-hide")
			.attr("d", "M2,23 l6,-15 v30 Z")
			.attr("fill","rgb(204,204,204)")
			.attr("stroke", "none")
			.style("opacity", 0.5);

			controls.append("path")
			.attr("class", "hide")
			.attr("d", "M8,23 l-6,-15 v30 Z")
			.attr("fill","rgb(204,204,204)")
			.attr("stroke", "none")
			.style("opacity", 0);

			controls.append("path")
			.attr("d", "M10,3 v40 h-7 a3,3 0 0,1 -3,-3 v-34 a3,3 0 0,1 3,-3 Z")
			.attr("pointer-events", "all")
			.attr("fill","none")
			.attr("stroke", "none")
			.style("cursor","pointer")
			.on("mouseover", function() { 
				controls.selectAll("path.ui-show-hide").style("opacity", 1); 
			})
			.on("mouseout", function() { 
				controls.selectAll("path.ui-show-hide").style("opacity", 0.5); 
			})
			.on("click", function() {
				if (controls.select(".hide").classed("ui-show-hide")) {
					controls.transition()
					.duration(1000)
					.attr("transform", "translate("+(controls.attr("view-width")-10)+",0)")
					.each("end", function() {
						controls.select(".hide")
						.style("opacity",0)
						.classed("ui-show-hide",false);
						controls.select(".show")
						.style("opacity",1)
						.classed("ui-show-hide",true);
						controls.selectAll("path.ui-show-hide")
						.style("opacity",0.5);
					});
				} else {
					controls.transition()
					.duration(1000)
					.attr("transform", "translate("+(controls.attr("view-width")-95)+",0)")
					.each("end", function() {
						controls.select(".show")
						.style("opacity",0)
						.classed("ui-show-hide",false);
						controls.select(".hide")
						.style("opacity",1)
						.classed("ui-show-hide",true);
						controls.selectAll("path.ui-show-hide")
						.style("opacity",0.5);
					});				
				}
			});

			controls.append("rect")
			.attr("x",10)
			.attr("y",0)
			.attr("width", 85)
			.attr("fill", "rgba(204,204,204,0.9)")
			.attr("stroke", "none");

			controls.append("g")
			.attr("class", "layer-controls")
			.attr("transform", "translate(15,5)");
		});
	}

	return map;
};

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

module.exports = function heatmap() {
	var colors = "RdYlBu",
	scaleType = "quantile",
	x = d3.scale.linear(),
	y = d3.scale.linear(),
	line = d3.svg.line()
		.x(function(d) { return x(d.x); })
		.y(function(d) { return y(d.y); }),
	format = d3.format(".4n"),
	id = "fp-heatmap-" + new Date().valueOf(),
	name = "heatmap";

	function heatmap(g) {
		g.each(function(data) {
			if (! data || ! data.map) return;
			var g = d3.select(this);
			
			if (! data.units) {
				data.units = "";
			} else if (data.units.charAt(0) != ' ') {
				data.units = " " + data.units;
			}

			var values = data.map.map(function(d) {return d.value;})
							.sort(d3.ascending),
				colorScale, thresholds;
			
			switch (scaleType) {
			  case "quantile": {
				colorScale = d3.scale.quantile()
							.range([1,2,3,4,5,6])
							.domain(values);
				thresholds = colorScale.quantiles();
				break;
			  }
			  case "quantized": {
				colorScale = d3.scale.quantize()
							.range([1,2,3,4,5,6])
							.domain([values[0],values[values.length-1]]);
				var incr = (colorScale.domain()[1] - colorScale.domain()[0]) / 6;
				thresholds = [incr, 2*incr, 3*incr, 4*incr, 5*incr];
				break;
			  } 
			  case "normal": {
				var mean = d3.mean(values);
				var sigma = Math.sqrt(d3.sum(values, 
						function(v) {return Math.pow(v-mean,2);}) /values.length);
				colorScale = d3.scale.quantile()
							.range([1,2,3,4,5,6])
							.domain([mean-6*sigma,mean-2*sigma,
							         mean-sigma,mean,mean+sigma,
							         mean+2*sigma,mean+6*sigma]);
				thresholds = colorScale.quantiles();
				break;
			  } 
			  default: { // custom
				if (! customThresholds) customThresholds = thresholds;
				var domain = customThresholds;
				domain.push(domain[domain.length-1]);
				domain.unshift(domain[0]);
				colorScale = d3.scale.quantile()
							.range([1,2,3,4,5,6])
							.domain(domain);
				customThresholds = thresholds = colorScale.quantiles();
				break;
			  }
			}
			
			// setup container for visualization
			var vis = g.selectAll("g.heatmap").data([0]);
			vis.enter().append("g").attr("class","heatmap");
			
			if (this.__colors__ && this.__colors__ != colors) {
				vis.classed(this.__colors__, false);
			}
			vis.classed(colors, true);
			this.__colors__ = colors;
				
			var cells = vis.selectAll("rect")
				.data(data.map.filter(function(d) { return ! d.points; }), 
						function(d){return d.x + "," + d.y;}),
			cellsEnter = cells.enter().append("rect").style("opacity", 1e-6);
			
			cells.exit().transition().style("opacity", 1e-6).remove();
			
			cellsEnter.append("title");
			
			cells.attr("x", function(d) { return x(d.x); })
			.attr("y", function(d) { return y(d.y); })
			.attr("height", Math.abs(y(data.binSize) - y(0)))
			.attr("width", Math.abs(x(data.binSize) - x(0)))
			.attr("class", function(d) { return "d6-"+colorScale(d.value); })
				.select("title")
		  		.text(function(d) { 
		  			return "value: " + format(d.value) + data.units; 
		  		});
			
			cellsEnter.transition().style("opacity", 0.6);
			
			var areas = vis.selectAll("path")
				.data(data.map.filter(function(d) { return d.points; }), 
						function(d) { return JSON.stringify(d.points); }),
			areasEnter = areas.enter().append("path")
			.attr("d", function(d) { return line(d.points) + "Z"; })
			.style("opacity", 1e-6);
			
			areas.exit().transition().style("opacity", 1e-6).remove();
			areasEnter.append("title");
			
			areas
			.attr("class", function(d) { return "d6-"+colorScale(d.value); })
				.select("title")
					.text(function(d) { 
						return "value: " + format(d.value) + data.units; 
					});
			areasEnter.transition().style("opacity",0.6);
		
			var areaLabels = vis.selectAll("text")
				.data(data.map.filter(function(d) { return d.points; }), 
						function(d) { return JSON.stringify(d.points); }),
			areaLabelsEnter = areaLabels.enter().append("text")
								.style("font-weight", "bold")
								.attr("text-anchor", "middle")
								.style("opacity",1e-6);
			
			areaLabels.exit().transition().style("opacity",1e-6).remove();
			
			areaLabels.attr("transform", function(d) { 
					var center = {x:0,y:0};
					var area = 0;
					for (var i=0; i<d.points.length; ++i) {
						var p1 = d.points[i];
						var p2 = d.points[i+1] || d.points[0];
						var ai = (p1.x*p2.y - p2.x*p1.y);
						center.x += (p1.x + p2.x)*ai;
						center.y += (p1.y + p2.y)*ai;
						area += ai;
					}
					area = area / 2;
					center.x = center.x/(6*area);
					center.y = center.y/(6*area);
					return "translate(" + x(center.x) + "," 
										+ y(center.y) + ")";
				})
			.text(function(d) { return format(d.value) + data.units; });
			
			areaLabelsEnter.transition().style("opacity",0.6);
		});
	}
	
	heatmap.xScale = function(scale) {
		if (! arguments.length) return x;
		x = scale;
		return heatmap;
	};
	
	heatmap.yScale = function(scale) {
		if (! arguments.length) return y;
		y = scale;
		return heatmap;
	};
	
	heatmap.colorSet = function(scaleName) {
		if (! arguments.length) return colors;
		colors = scaleName;
		return heatmap;
	};
	
	heatmap.colorMode = function(mode) {
		if (! arguments.length) return scaleType;
		scaleType = mode;
		return heatmap;
	};
	
	heatmap.customThresholds = function(vals) {
		if (! arguments.length) return customThresholds;
		customThresholds = vals;
		return heatmap;
	};
	
	heatmap.id = function() {
		return id;
	};
	
	heatmap.title = function(n) {
		if (! arguments.length) return name;
		name = n;
		return heatmap;
	};
	
	return heatmap;
};
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

module.exports = function imagelayer() {
	var x = d3.scale.linear(),
	y = d3.scale.linear(),
	id = "fp-imagelayer-" + new Date().valueOf(),
	name = "imagelayer";
	
	function images(g) {
		g.each(function(data) {
			if (! data) return;
			var g = d3.select(this);
			
			var imgs = g.selectAll("image")
						.data(data, function(img) {return img.url;});
			
			imgs.enter().append("image")
			.attr("xlink:href", function(img) {return img.url;})
			.style("opacity", 1e-6);
			
			imgs.exit().transition().style("opacity",1e-6).remove();
			
			imgs.transition()
			.attr("x", function(img) {return x(img.x);})
			.attr("y", function(img) {return y(img.y);})
			.attr("height", function(img) {
				return y(img.y+img.height) - y(img.y);
			})
			.attr("width", function(img) {
				return x(img.x+img.width) - x(img.x);
			})
			.style("opacity", function(img) {
				return img.opacity || 1.0;
			});
		});
	}
	
	images.xScale = function(scale) {
		if (! arguments.length) return x;
		x = scale;
		return images;
	};
	
	images.yScale = function(scale) {
		if (! arguments.length) return y;
		y = scale;
		return images;
	};

	images.id = function() {
		return id;
	};
	
	images.title = function(n) {
		if (! arguments.length) return name;
		name = n;
		return images;
	};

	return images;
};
},{}],4:[function(require,module,exports){
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
},{"./floorplan":1,"./heatmap":2,"./imagelayer":3,"./overlays":5,"./pathplot":6,"./vectorfield":7}],5:[function(require,module,exports){
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

module.exports = function overlays() {
	var x = d3.scale.linear(),
	y = d3.scale.linear(),
	id = "fp-overlays-" + new Date().valueOf(),
	name = "overlays",
	canvasCallbacks = [],
	selectCallbacks = [],
	moveCallbacks = [],
	editMode = false,
	line = d3.svg.line()
		.x(function(d) { return x(d.x); })
		.y(function(d) { return y(d.y); }),
	dragBehavior = d3.behavior.drag()
		.on("dragstart", __dragItem)
		.on("drag", __mousemove)
		.on("dragend", __mouseup),
	dragged = null;
	
	function overlays(g) {
		g.each(function(data){
			if (! data) return;
			var g = d3.select(this);
			
			// setup rectangle for capturing events
			var canvas = g.selectAll("rect.overlay-canvas").data([0]);
			
			canvas.enter().append("rect")
			.attr("class", "overlay-canvas")
			.style("opacity", 0)
			.attr("pointer-events", "all")
			.on("click", function() {
				if (editMode) {
					var p = d3.mouse(this);
					canvasCallbacks.forEach(function(cb) {
						cb(x.invert(p[0]), y.invert(p[1]));
					});
				}
			})
			.on("mouseup.drag", __mouseup)
			.on("touchend.drag", __mouseup);
			
			canvas.attr("x", x.range()[0])
			.attr("y", y.range()[0])
			.attr("height", y.range()[1] - y.range()[0])
			.attr("width", x.range()[1] - x.range()[0]);
			
			// draw polygons (currently only type supported)
			var polygons = g.selectAll("path.polygon")
				.data(data.polygons || [], function(d) {return d.id;});
			
			polygons.enter().append("path")
			.attr("class", "polygon")
			.attr("vector-effect", "non-scaling-stroke")
			.attr("pointer-events", "all")
			.on("mousedown", function(d) {
				selectCallbacks.forEach(function(cb) {
					cb(d.id);
				});
			})
			.call(dragBehavior)
			.append("title");
			
			polygons.exit().transition().style("opacity", 1e-6).remove();
			
			polygons
			.attr("d", function(d) {return line(d.points) + "Z";})
			.style("cursor", editMode ? "move" : "pointer")
				.select("title")
				.text(function(d) { return d.name || d.id; });
			
			if (editMode) {
				var pointData = [];
				if (data.polygons) {
					data.polygons.forEach(function(polygon) {
						polygon.points.forEach(function(pt, i) {
							pointData.push({"index":i,
											"parent":polygon});
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
				
				var points = g.selectAll("circle.vertex")
				.data(pointData, function(d) {return d.parent.id + "-" + d.index;});
				
				points.exit().transition()
				.attr("r", 1e-6).remove();
				
				points.enter().append("circle")
				.attr("class", "vertex")
				.attr("pointer-events", "all")
				.attr("vector-effect", "non-scaling-stroke")
				.style("cursor", "move")
				.attr("r", 1e-6)
				.call(dragBehavior);
				
				points
				.attr("cx", function(d) { return x(d.parent.points[d.index].x); })
				.attr("cy", function(d) { return y(d.parent.points[d.index].y); })
				.attr("r", 4/scale);
			} else {
				g.selectAll("circle.vertex").transition()
				.attr("r", 1e-6).remove();
			}
		});
	}

	overlays.xScale = function(scale) {
		if (! arguments.length) return x;
		x = scale;
		return overlays;
	};
	
	overlays.yScale = function(scale) {
		if (! arguments.length) return y;
		y = scale;
		return overlays;
	};

	overlays.id = function() {
		return id;
	};
	
	overlays.title = function(n) {
		if (! arguments.length) return name;
		name = n;
		return overlays;
	};
	
	overlays.editMode = function(enable) {
		if (! arguments.length) return editMode;
		editMode = enable;
		return overlays;
	};
	
	overlays.registerCanvasCallback = function(cb) {
		if (arguments.length) canvasCallbacks.push(cb);
		return overlays;
	};
	
	overlays.registerSelectCallback = function(cb) {
		if (arguments.length) select.Callbacks.push(cb);
		return overlays;
	};
	
	overlays.registerMoveCallback = function(cb) {
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
			if (dragged.parent) { // a point
				dragged.parent.points[dragged.index].x += dx;
				dragged.parent.points[dragged.index].y += dy;
			} else if (dragged.points) { // a composite object
				dragged.points.forEach(function(pt) {
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
			moveCallbacks.forEach(function(cb) {
				dragged.parent ? cb(dragged.parent.id, dragged.parent.points, dragged.index) :
					cb(dragged.id, dragged.points);
			});
			dragged = null;
		}
	}
	
	return overlays;
};
},{}],6:[function(require,module,exports){
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

module.exports = function pathplot() {
	var x = d3.scale.linear(),
	y = d3.scale.linear(),
	line = d3.svg.line()
		.x(function(d) { return x(d.x); })
		.y(function(d) { return y(d.y); }),
	id = "fp-pathplot-" + new Date().valueOf(),
	name = "pathplot",
	pointFilter = function(d) { return d.points; };
	
	function pathplot(g) {
		g.each(function(data) {
			if (!data) return;
			
			var g = d3.select(this),
			paths = g.selectAll("path")
				.data(data, function(d) { return d.id; });
			
			paths.exit().transition()
			.style("opacity", 1e-6).remove();
			
			paths.enter().append("path")
			.attr("vector-effect", "non-scaling-stroke")
			.attr("fill", "none")
			.style("opacity", 1e-6)
				.append("title");
			
			paths
			.attr("class", function(d) { return d.classes || d.id; })
			.attr("d", function(d,i) { return line(pointFilter(d,i)); })
				.select("title")
				.text(function(d) { return d.title || d.id; });
			
			paths.transition().style("opacity", 1);
		});
	}
	
	pathplot.xScale = function(scale) {
		if (! arguments.length) return x;
		x = scale;
		return pathplot;
	};
	
	pathplot.yScale = function(scale) {
		if (! arguments.length) return y;
		y = scale;
		return pathplot;
	};

	pathplot.id = function() {
		return id;
	};
	
	pathplot.title = function(n) {
		if (! arguments.length) return name;
		name = n;
		return pathplot;
	};

	pathplot.pointFilter = function(fn) {
		if (! arguments.length) return pointFilter;
		pointFilter = fn;
		return pathplot;
	};
	
	return pathplot;
};
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

module.exports = function vectorfield() {
	var x = d3.scale.linear(),
	y = d3.scale.linear(),
	line = d3.svg.line()
		.x(function(d) { return x(d.x); })
		.y(function(d) { return y(d.y); }),
	id = "fp-vectorfield-" + new Date().valueOf(),
	name = "vectorfield";
	
	function vectorfield(g) {
		g.each(function(data) {
			if (! data || ! data.map) return;
			
			var g = d3.select(this);
			
			var cells = g.selectAll("path.vector")
				.data(data.map, function(d) { return d.x+","+d.y; });
			
			cells.exit().transition()
			.style("opacity", 1e-6).remove();
			
			cells.enter().append("path")
			.attr("class", "vector")
			.attr("vector-effect", "non-scaling-stroke")
			.style("opacity", 1e-6)
			.append("title");
			
			var scaleFactor = data.binSize/ 2 /
			d3.max(data.map, function(d) {
				return Math.max(Math.abs(d.value.x),Math.abs(d.value.y));
			});
			
			cells.attr("d", function(d) {
				var v0 = {x: (d.x + data.binSize/2), 
						  y: (d.y + data.binSize/2)};
				var v1 = {x: (v0.x + d.value.x*scaleFactor), 
						  y: (v0.y + d.value.y*scaleFactor)};
				return line([v0,v1]);
			})
				.select("title")
				.text(function(d) { 
					return Math.sqrt(d.value.x*d.value.x + d.value.y*d.value.y)
					+ " " + data.units; 
				});
			
			cells.transition().style("opacity", 1);
		});
	}
	
	vectorfield.xScale = function(scale) {
		if (! arguments.length) return x;
		x = scale;
		return vectorfield;
	};
	
	vectorfield.yScale = function(scale) {
		if (! arguments.length) return y;
		y = scale;
		return vectorfield;
	};

	vectorfield.id = function() {
		return id;
	};
	
	vectorfield.title = function(n) {
		if (! arguments.length) return name;
		name = n;
		return images;
	};
	
	return vectorfield;
};
},{}]},{},[4]);
