/**
 * A series of visualisation components based on the d3 library.
 *
 * Includes a pliable mesh visualisation in torus or lattice topologies.
 *
 *
 * Copyright (C) 2015  Conrad Rider  <cride5@crider.co.uk>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Foobar.  If not, see <http://www.gnu.org/licenses/>.
 *
 * @author Conrad Rider
 *
 */


/**
 * The top-level D3Vis module. Contains all visualisation components.
 *
 * @module D3Vis
 */
var D3Vis = (function(){

	// Module object
	D3Vis = {};

	// Common prefix to use for css classes in this module
	D3Vis.CSS_PREFIX = 'd3vis-';


	/**
	 *
	 * Top level class, contains the graph model and manages d3 render.
	 *
	 * @class Mesh
	 * @namespace D3Vis
	 */
	D3Vis.Mesh = function(){

		// Properties
		var mesh = D3Vis.Mesh.Lattice3D();
		var nodeNames = [
			"Forest",
			"SunShine",
			"Ember"];
		var nodeCols = [
			{r:35, g:69, b:29}, // Greeny
			{r:209, g:198, b:69}, // Bright yellow
			{r:170, g:92, b:9}]; // Dark Orange
		var heatCol = {r:139, g:2, b:2};
		var linkCol = {r:207, g:134, b:44};
		var nodeRadius = 4; // The default node radius
		var maxRadius = 12; // The maximum node radius
		var linkOpacity = 0.6; // The link opacity
		var maxDistCol = 100; // The maximum distance of colour based heating
		var maxDistGrw = 50; // The maximum distance of radius growth heating

		// Force layout configuration
		var linkDist = 40;
		var forceCharge = -40;
		var forceGravity = 0.05;
		var forceFriction = 0.10;
		var forceAlpha = 0.3;
		var forceAlphaDecay = 0.995;


		/**
		 * Creates a new MeshNet instance with the given configuration.
		 *
		 * @constructor
		 * @param {Object} conf The network configuration.
		 */
		var Mesh = function(svg){

			// Pick up width/height from svg
			var width = svg.attr('width');
			var height = svg.attr('height');

			// Compile mesh topology to produce graph object
			var graph = mesh();

			// Intialise nodes closer to centre
			graph.nodes.forEach(function(node){
				node.x = (width/2) - (Math.random() - 0.5) * width * 0.8;
				node.y = (height/2) - (Math.random() - 0.5) * height * 0.8;
				node.px = node.x; node.py = node.y;
				node.col = nodeCols[node.group % nodeCols.length];
				node.name = nodeNames[node.group % nodeNames.length];
			});

			// Intialise links with configured colour
			graph.links.forEach(function(link){
				link.col = linkCol;
			});

			// Constuct the graphical SVG link objects
			var linkClass = D3Vis.Mesh.CSS_PREFIX + 'link';
			var link = svg.selectAll('.' + linkClass)
				.data(graph.links)
				.enter().append("line")
				.attr("class", linkClass)
				.attr("stroke", function(d){ return colToStr(d.col); })
				.style("stroke-opacity", linkOpacity)
				.style("stroke-width", function(d) { return Math.sqrt(d.value); });

			// Construct the graphical SVG node objects
			var nodeClass = D3Vis.Mesh.CSS_PREFIX + 'node';
			var node = svg.selectAll('.' + nodeClass)
				.data(graph.nodes)
				.enter().append("g")
				.attr("class", nodeClass);
			// Use circles with radial gradients to give 3D effect
			var grad1 = addGradient(node, "yellow1", "#FAB518"  , "#444422", nodeRadius)
				.attr("id", function(d){ return "grad1_" + d.id; });
			var gradStop1 = grad1.select('.stop1')
				.attr('stop-color', function(d){ return magToCol(0, d.col, heatCol); });
			var gradStop2 = grad1.select('.stop2');
			var circle1 = node.append('circle')
				.attr("r", nodeRadius)
				.attr('cx', '0')
				.attr('cy', '0')
				.style("fill", function(d){ return 'url(#grad1_' + d.id + ')';} );
			// Shadow gradient
			/*var g2 = node.append('g')
				.attr('transform', 'translate(25,55) scale(1.0,0.5)');
			var grad2 = addShadowGrad(g2, nodeRadius)
				.attr("id", function(d){ return "grad2_" + d.id; })
			var circle2 = g2.append('circle')
				.attr('fill', function(d){ return 'url(#grad2_' + d.id;})
				.attr('cx', '0')
				.attr('cy', '0')
				.attr('r', '' + nodeRadius); */
			// Tooltip labels
			node.append("title")
				.text(function(d) { return d.name; });

			// Construct the d3 force layout
			var force = d3.layout.force()
				.nodes(graph.nodes)
				.links(graph.links)
				.size([width, height])
				.charge(forceCharge)
				.linkDistance(linkDist)
				.gravity(forceGravity)
				.friction(1 - forceFriction); // Higher value gives more ease of movement
			// Override alpha behaviour to make more responsive
			var custAlpha = forceAlpha;
			var resume_ = force.resume;
			force.resume = function(){
				custAlpha = forceAlpha;
				resume_();
				return force;
			};
			// Update node/link positions on tick, and use custom alpha decay
			force.on("tick", function(){
				force.alpha(custAlpha *= forceAlphaDecay);
				link.attr("x1", function(d) { return d.source.x; })
					.attr("y1", function(d) { return d.source.y; })
					.attr("x2", function(d) { return d.target.x; })
					.attr("y2", function(d) { return d.target.y; });
				node.attr("transform", function(d){ return "translate(" + d.x + "," + d.y + ")"; })
			});
			node.call(force.drag);

			// Register event handlers

			// Disable the mouseover/out handlers
			node.on('mouseover.force', null);
			node.on('mouseout.force', null);
/*
			node.on('mouseover.hoverNode', function(){
				var s = d3.select(this);
				s.attr('opacity', '0.5');
			});
			node.on('mouseout.hoverNode', function(){
				var s = d3.select(this);
				s.attr('opacity', '1.0');
			});
*/
			// Remove nodes on double-click
			node.on('dblclick.removeNode', function(){
				removeNode(d3.select(this));
			});

			// Apply 'heat' based on mouse proximity.
			// This will expand node radii and change node/link colours
			svg.on('mousemove.nodeHeat', function(e){
				var pos = d3.mouse(this);
				var x = pos[0], y = pos[1];
				var rad = function(d){
					return d2r(dist(x, y, d.x, d.y));
				};
				circle1.attr('r', rad);
				//circle2.attr('r', rad);
				grad1.attr('r', rad);
				//grad2.attr('r', rad);
				gradStop1.attr('stop-color', function(d){
					return magToCol(d2v(dist(x, y, d.x, d.y)), d.col, heatCol);
				});
				link.attr('stroke', function(d){
					var lx = (d.source.x + d.target.x)/2;
					var ly = (d.source.y + d.target.y)/2;
					return magToCol(d2v(dist(x, y, lx, ly)), d.col, heatCol);
				});
			});

			// Remove the selected node and its connecting edges from the visualisation
			var removeNode = function(nodeSel){
				nodeSel.each(function(d){
					link.filter(function(dl){
						var toRemove = dl.source.id === d.id || dl.target.id === d.id;
						if(toRemove){
							Utils.arrayRemove(graph.links, dl);
						}
						return toRemove;
					}).remove();
					Utils.arrayRemove(graph.nodes, d);
				});
				nodeSel.remove();
			};

			// Start the interactive force simulation
			force.start();
		};


		// Private helper functions


		// Return the distance between two points
		var dist = function(x1, y1, x2, y2){
			return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
		};


		// Convert a distance to a magnitude value
		var d2v = function(dist){
			return Utils.boundVal((maxDistCol - dist)/maxDistCol, 0, 1);
		};


		// Convert a distance to a node radius value
		var d2r = function(dist){
			var v = Utils.boundVal((maxDistGrw - dist)/maxDistGrw, 0, 1);
			return nodeRadius + Math.pow(v, 1.5) * (maxRadius - nodeRadius);
		};


		// Convert a magnitude value to a colour string
		var magToCol = function(mag, base, to){
			var r = ~~Utils.boundVal(base.r * (1-mag) + to.r * mag, 0, 255);
			var g = ~~Utils.boundVal(base.g * (1-mag) + to.g * mag, 0, 255);
			var b = ~~Utils.boundVal(base.b * (1-mag) + to.b * mag, 0, 255);
			return 'rgb('+r+','+g+','+b+')';
		};


		// Convert a colour object to a colour string
		var colToStr = function(col){
			return 'rgb('+col.r+','+col.g+','+col.b+')';
		};


		// Add an svg radial gradient to the given element
		var addGradient = function(elm, id, stopCol1, stopCol2, r){
			var grad = elm.append("radialGradient")
				.attr('id', id + "Sphere")
				.attr('gradientUnits', 'userSpaceOnUse')
				.attr('cx', '0')
				.attr('cy', '0')
				.attr('fx', '-' + r/2)
				.attr('fy', '-' + r/2)
				.attr('r', '' + r);
			grad.append('stop').attr('offset', '0%').attr('stop-color', 'white');
			grad.append('stop').attr('offset', '75%').attr('stop-color', stopCol1).attr('class', "stop1");
			grad.append('stop').attr('offset', '100%').attr('stop-color', stopCol2).attr('class', "stop2");
			return grad;
		};


		// Add an svg shadow gradient to the given element
		var addShadowGrad = function(elm, r){
			var grad = elm.append("radialGradient")
				.attr('id', 'shadowGrad')
				.attr('gradientUnits', 'userSpaceOnUse')
				.attr('cx', '0')
				.attr('cy', '0')
				.attr('fx', '-' + r/2)
				.attr('fy', '' + r/2)
				.attr('r', '' + r);
			grad.append('stop').attr('offset', '0%').attr('stop-color', 'black').attr('stop-opacity', '0.7');
			grad.append('stop').attr('offset', '100%').attr('stop-color', 'white').attr('stop-opacity', '0.0');
			return grad;
		};


		// Property getters/setters
		Mesh.mesh             = function(v){ if(!arguments.length) return mesh           ; mesh            = v; return Mesh; };
		Mesh.nodeNames        = function(v){ if(!arguments.length) return nodeNames      ; nodeNames       = v; return Mesh; };
		Mesh.nodeCols         = function(v){ if(!arguments.length) return nodeCols       ; nodeCols        = v; return Mesh; };
		Mesh.heatCol          = function(v){ if(!arguments.length) return heatCol        ; heatCol         = v; return Mesh; };
		Mesh.linkCol          = function(v){ if(!arguments.length) return linkCol        ; linkCol         = v; return Mesh; };
		Mesh.nodeRadius       = function(v){ if(!arguments.length) return nodeRadius     ; nodeRadius      = v; return Mesh; };
		Mesh.maxRadius        = function(v){ if(!arguments.length) return maxRadius      ; maxRadius       = v; return Mesh; };
		Mesh.linkOpacity      = function(v){ if(!arguments.length) return linkOpacity    ; linkOpacity     = v; return Mesh; };
		Mesh.maxDistCol       = function(v){ if(!arguments.length) return maxDistCol     ; maxDistCol      = v; return Mesh; };
		Mesh.maxDistGrw       = function(v){ if(!arguments.length) return maxDistGrw     ; maxDistGrw      = v; return Mesh; };
		Mesh.linkDist         = function(v){ if(!arguments.length) return linkDist       ; linkDist        = v; return Mesh; };
		Mesh.forceCharge      = function(v){ if(!arguments.length) return forceCharge    ; forceCharge     = v; return Mesh; };
		Mesh.forceGravity     = function(v){ if(!arguments.length) return forceGravity   ; forceGravity    = v; return Mesh; };
		Mesh.forceFriction    = function(v){ if(!arguments.length) return forceFriction  ; forceFriction   = v; return Mesh; };
		Mesh.forceAlpha       = function(v){ if(!arguments.length) return forceAlpha     ; forceAlpha      = v; return Mesh; };
		Mesh.forceAlphaDecay  = function(v){ if(!arguments.length) return forceAlphaDecay; forceAlphaDecay = v; return Mesh; };


		// Return mesh builder
		return Mesh;
	};


	// Mesh constants

	// Common prefix to use for CSS classes in the Mesh sub-module
	D3Vis.Mesh.CSS_PREFIX = D3Vis.CSS_PREFIX + "mesh-";


	/**
	 * Class representing a torus-shaped mesh.
	 *
	 * @class Torus
	 * @namespace D3Vis.Mesh
	 */
	D3Vis.Mesh.Torus = function(){

		// Properties
		var rows = 9;
		var cols = 15;
		var value = 5;
		var nCats = 3;

		// Build the torus space from the properties
		var Torus = function(){
			// Re-init graph
			var graph = {nodes:[], links:[]};
			// Create nodes
			for(var i = 0; i < rows * cols; i++){
				graph.nodes.push({
					id:i,
					group:~~(Math.random() * nCats)});
			}
			// link nodes in square grid pattern
			var ln = graph.links;
			for(var r = 0; r < rows; r++){
				for(var c = 0; c < cols; c++){
					var n1 = id(r, c);
					var n2 = id(r, c + 1);
					ln.push({source:n1, target:n2, value:value});
					var n2 = id(r + 1, c);
					ln.push({source:n1, target:n2, value:value});
				}
			}
			return graph;
		};

		// Helper function
		var id = function(r, c){
			return (r % rows) * cols + (c % cols);
		};

		// Property getters/setters
		Torus.rows  = function(v){ if(!arguments.length) return rows ; rows  = v; return Torus; };
		Torus.cols  = function(v){ if(!arguments.length) return cols ; cols  = v; return Torus; };
		Torus.value = function(v){ if(!arguments.length) return value; value = v; return Torus; };
		Torus.nCats = function(v){ if(!arguments.length) return nCats; nCats = v; return Torus; };


		return Torus;

	};


	/**
	 * Class representing a 3D lattice mesh.
	 *
	 * @class Lattice3D
	 * @namespace D3Vis.Mesh
	 */
	D3Vis.Mesh.Lattice3D = function(){

		// Properties
		var layers = 1;
		var rows = 3;
		var cols = 3;
		var value = 5;
		var nCats = 3;


		// Compile the 3D lattice from the configured properties
		var Lattice3D = function(){
			var graph = {nodes:[], links:[]};

			// Create nodes
			for(var i = 0; i < layers * rows * cols; i++){
				graph.nodes.push({
					id:i,
					group:~~(Math.random() * nCats)});
			}

			// link nodes in square grid pattern
			var ln = graph.links;
			for(var l = 0; l < layers; l++){
				for(var r = 0; r < rows; r++){
					for(var c = 0; c < cols; c++){
						var n1 = id(l, r, c);
						if(c < cols - 1){
							var n2 = id(l, r, c + 1);
							ln.push({source:n1, target:n2, value:value});
		//console.log("Connecting " + n1 + " with " + n2);
						}
						if(r < rows - 1){
							var n2 = id(l, r + 1, c);
							ln.push({source:n1, target:n2, value:value});
		//console.log("Connecting " + n1 + " with " + n2);
						}
						if(l < layers - 1){
							var n2 = id(l + 1, r, c);
							ln.push({source:n1, target:n2, value:value});
		//console.log("Connecting " + n1 + " with " + n2);
						}
					}
				}
			}
			return graph;
		};

		// Get the ID of the node at the given layer, row and col
		var id = function(l, r, c){
			return l * rows * cols + r * cols + c;
		};

		// Property getters/setters
		Lattice3D.layers = function(v){ if(!arguments.length) return layers; layers = v; return Lattice3D; };
		Lattice3D.rows   = function(v){ if(!arguments.length) return rows  ; rows   = v; return Lattice3D; };
		Lattice3D.cols   = function(v){ if(!arguments.length) return cols  ; cols   = v; return Lattice3D; };
		Lattice3D.value  = function(v){ if(!arguments.length) return value ; value  = v; return Lattice3D; };
		Lattice3D.nCats  = function(v){ if(!arguments.length) return nCats ; nCats  = v; return Lattice3D; };


		return Lattice3D;
	};


	/**
	 * Class representing a random network.
	 *
	 * @class Random
	 * @namespace D3Vis.Mesh
	 */
	D3Vis.Mesh.Random = function(){

		// Properties
		var nNodes = 20;
		var avLnks = 2;
		var minVal = 2;
		var maxVal = 4;
		var nCats = 3;

		// Compile the random mesh from the configured properties
		var Random = function(){

			var graph = {nodes:[], links:[]};
			// Create nodes
			for(var i = 0; i < nNodes; i++){
				graph.nodes.push({
					id:i,
					group:~~(Math.random() * nCats)});
			}

			// link nodes (average of 3-links
			for(var i = 0; i < nNodes * avLnks; i++){
				var source = ~~(Math.random() * nNodes);
				var target;
				do{
					// Prefer to link to a local node
					target = (nNodes + ~~(Math.pow(Math.random(), 4) * nNodes)) % nNodes;
				}while(target === source); // Don't self link
				graph.links.push({
					source:source,
					target:target,
					value:~~(Math.random() * (maxVal - minVal)) + minVal});
			}
			return graph;
		};


		// Property getters/setters
		Random.nNodes = function(v){ if(!arguments.length) return nNodes; nNodes = v; return Random; };
		Random.avLnks = function(v){ if(!arguments.length) return avLnks; avLnks = v; return Random; };
		Random.minVal = function(v){ if(!arguments.length) return minVal; minVal = v; return Random; };
		Random.maxVal = function(v){ if(!arguments.length) return maxVal; maxVal = v; return Random; };
		Random.nCats  = function(v){ if(!arguments.length) return nCats ; nCats  = v; return Random; };


		return Random;
	};



	/**
	 * Generates a background grid
	 *
	 * @class BGGrid
	 * @namespace D3Vis
	 */
	D3Vis.BGGrid = function(){

		// Properties
		var ticks = 8;
		var color = "#111";
		var weight = 1;

		// Compile grid from properties
		var BGGrid = function(svg){
			// Pick up width/height from svg
			var width = svg.attr('width');
			var height = svg.attr('height');
			// Add background grid lines
			var xScale = d3.scale.linear()
				.domain([0,1])
				.range([0, width]);
			var yScale = d3.scale.linear()
				.domain([0,1])
				.range([height, 0]);
			var vLineClass = D3Vis.CSS_PREFIX + 'vGrid';
			svg.selectAll('line.'+ vLineClass)
				.data(xScale.ticks(ticks)).enter()
				.append("line")
				.attr({
					"class":vLineClass,
					"y1" : 0,
					"y2" : height,
					"x1" : function(d){ return xScale(d);},
					"x2" : function(d){ return xScale(d);},
					"fill" : "none",
					"shape-rendering" : "crispEdges",
					"stroke" : color,
					"stroke-width" : weight + "px"
				});
			var hLineClass = D3Vis.CSS_PREFIX + 'hGrid';
			svg.selectAll("line." + hLineClass)
				.data(yScale.ticks(ticks)).enter()
				.append("line")
				.attr({
					"class":hLineClass,
					"x1" : 0,
					"x2" : width,
					"y1" : function(d){ return yScale(d);},
					"y2" : function(d){ return yScale(d);},
					"fill" : "none",
					"shape-rendering" : "crispEdges",
					"stroke" : color,
					"stroke-width" : weight + "px"
				});
		};

		// Property getters/setters
		BGGrid.ticks  = function(v){ if(!arguments.length) return ticks ; ticks  = v; return BGGrid; };
		BGGrid.color  = function(v){ if(!arguments.length) return color ; color  = v; return BGGrid; };
		BGGrid.weight = function(v){ if(!arguments.length) return weight; weight = v; return BGGrid; };

		// Return compiler function
		return BGGrid;
	};


	// Return D3Vis Module
	return D3Vis;

})();



/**
 * A collection of additional utilities.
 *
 * @class Utils
 */
var Utils = (function(){


	// Constructor
	Utils = function(){};


	/**
	 * Calculate the modulus of a number.
	 *
	 * @method mod
	 * @param {Number} n The number to calculate the modulus for
	 * @param {Number} m Calculate to mod m
	 * @return {Number} The value of "n mod m"
	 * @static
	 */
	Utils.mod = function(n, m){
		// Requires two % operations for negative numbers
		return n >= 0 ? n % m : ((n % m) + m) % n;
	};


	/**
	 * Returns a value n derived from v, such that
	 *
	 *     min <= n <= max
	 *
	 * @method boundVal
	 * @param {Number} v The value to apply bounds to
	 * @param {Number} min The lower bound (inclusive)
	 * @param {Number} max The upper bound (inclusive)
	 * @return {Number} The bounded value
	 * @static
	 */
	Utils.boundVal = function(v, min, max){
		return Math.max(Math.min(v, max), min);
	};


    Utils.arrayRemove = function(ary, element){
        var removed = false;
		var i = ary.indexOf(element);
		removed = i !== -1;
		if(removed){ ary.splice(i, 1); }
		return removed;
    };


	// Return constructor
	return Utils;

})();
