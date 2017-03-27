var getWindowDimensions = function(){
  // get the window dimensions
  var w = window,
      d = document,
      e = d.documentElement,
      g = d.getElementsByTagName('body')[0],
      x = w.innerWidth || e.clientWidth || g.clientWidth,
      y = w.innerHeight|| e.clientHeight|| g.clientHeight;

  return {
    "x": x,
    "y": y
  };
}
// Resize and recenter on window resize
window.addEventListener('resize', function(){
  var windowDimensions = getWindowDimensions();
  // Updating sunburst dimensions.
  width = windowDimensions.x,
  height = windowDimensions.y,
  x = d3.scale.linear().range([0, 2 * Math.PI])
  y = d3.scale.pow().exponent(1.3).domain([0, 1]).range([0, (windowDimensions.x > windowDimensions.y ? windowDimensions.y : windowDimensions.x)/2]),
  padding = 5,
  duration = 1000;

  // Resize and re-center the svg
  d3.select("svg")
    .attr("width", width )
      .attr("height", height )
      .select("g")
      .attr("transform", "translate(" + [width / 2, height / 2] + ")");
}, false);

var windowDimensions = getWindowDimensions();
// Dimensions of sunburst.
var width = windowDimensions.x,
    height = windowDimensions.y,
    // radius = windowDimensions.x > windowDimensions.y ? windowDimensions.y : windowDimensions.x / 2,
    x = d3.scale.linear().range([0, 2 * Math.PI])
    y = d3.scale.pow().exponent(1.3).domain([0, 1]).range([0, (windowDimensions.x > windowDimensions.y ? windowDimensions.y : windowDimensions.x)/2]),
    padding = 5,
    duration = 1000;

// Remove loading image
var div = d3.select("#sunburst");
div.select("img").remove();

// setup html markup for sunburst
var vis = div.append("svg")
    .attr("width", width )
    .attr("height", height )
    .append("g")
    .attr("transform", "translate(" + [width / 2, height / 2] + ")");

// setup the partitions variable
var partition = d3.layout.partition()
    .sort(null)
    .value(function(d) { return 5.8 - d.depth; });

// setup the arch variable
var arc = d3.svg.arc()
    .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x))); })
    .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx))); })
    .innerRadius(function(d) { 
        return (d.depth === 1) ? 0 : Math.max(0, d.y ? y(d.y) : d.y); 
    })
    .outerRadius(function(d) { return Math.max(0, 10000); });

// load the data
d3.json("data/cv.json", function(error, json) {
  var nodes = partition.nodes({children: json});

  var path = vis.selectAll("path")
  	  .data(nodes)
 		.enter().append("path")
      .attr("id", function(d, i) { return "path-" + i; })
      .attr("d", arc)
      .attr("fill-rule", "evenodd")
      .style("fill", colour)
      .on("click", click);
      // .on("mouseover", mouseover);

	// Select all the visible labels
  var text = vis.selectAll("text").data(nodes);
  var textEnter = text.enter().append("text")
      .style("fill-opacity", 1)
      .style("fill", function(d) {
        return brightness(d3.rgb(colour(d))) < 125 ? "#eee" : "#000";
      })
      .attr("text-anchor", function(d) {
        return x(d.x + d.dx / 2) > Math.PI ? "end" : "start";
      })
      .attr("dy", ".2em")

  	 // rotate the lable text dependign where it is
      .attr("transform", function(d) {
        var multiline = (d.name || "").split(" ").length > 1,
            angle = x(d.x + d.dx / 2) * 180 / Math.PI - 90,
            rotate = angle + (multiline ? -.5 : 0);
        return "rotate(" + rotate + ")translate(" + (y(d.y) + padding) + ")rotate(" + (angle > 90 ? -180 : 0) + ")";
      })

     // Add the mouse clic handler to the bounding circle.
      .on("click", click)

  textEnter.append("tspan")
      .attr("x", 0)
      .text(function(d) { return d.depth ? d.name.split(" ")[0] : ""; });

  textEnter.append("tspan")
      .attr("x", 0)
      .attr("dy", "1em")
      .text(function(d) { return d.depth ? d.name.split(" ")[1] || "" : ""; });

  textEnter.append("tspan")
      .attr("x", 0)
      .attr("dy", "1em")
      .attr("class", "description")
      .attr("visibility", "hidden")
      .text(function(d) { return d.depth ? d.description || "" : ""; });

    // Then highlight only those that are an ancestor of the current segment.
   // var sequenceArray = getAncestors(d);

  // Given a node in a partition layout, return an array of all of its ancestor
  // nodes, highest first, but excluding the root.
  function getAncestors(node) {
    var path = [];
    var current = node;
    while (current.parent) {
      path.unshift(current);
      current = current.parent;
    }
    return path;
  }
  var previousSelected = null;
  function click(d) {

    if(d.selected && d.parent){
      d.selected = false;
      d = d.parent;
    }

    if(!d.selected) d.selected = true;

    if(previousSelected){
        previousSelected.selected = false;
    }
    previousSelected = d

    d3.select(".description-wrapper").style("opacity", "0");

    path.transition()
        .duration(duration)
        .attrTween("d", arcTween(d))
        .each("end", function(e) {
            if(e.selected){
                // As soon the selected finished, we know the depth so we can "guess" the diameter
                if(e.depth !== 0){
                    var wDimentions = getWindowDimensions();
                    var diameter = (windowDimensions.x > windowDimensions.y ? windowDimensions.y : windowDimensions.x) * 0.14 * e.depth;
                }else if(e.depth !== 1){
                    var diameter = 200;
                }

                window.setTimeout(function(){
                  d3.select(".description-wrapper").style("width", diameter)
                      .style("height", diameter)
                      .style("margin-left", diameter/-2)
                      .style("margin-top", diameter/-2)
                      .html("")
                      .style("opacity", "1")
                      .append("div")
                      .attr("class", "content")
                      .html(e.description);
                },250)
            }
        }
    );

    // Somewhat of a hack as we rely on arcTween updating the scales.
    text.style("visibility", function(e) {
          // hidding the texts that his parent is not the selected one
          return (isParentOf(d, e) || !e.selected) ? null : d3.select(this).style("visibility");
        })
      .transition()
        .duration(duration)
        .attrTween("text-anchor", function(d) {
          return function() {
            return x(d.x + d.dx / 2) > Math.PI ? "end" : "start";
          };
        })
        .attrTween("transform", function(d) {
          var multiline = (d.name || "").split(" ").length > 1;
          return function() {
            var angle = x(d.x + d.dx / 2) * 180 / Math.PI - 90,
                rotate = angle + (multiline ? -.5 : 0);

            return "rotate(" + rotate + ")translate(" + (y(d.y) + padding) + ")rotate(" + (angle > 90 ? -180 : 0) + ")";
          };
        })
        .style("fill-opacity", function(e) { return (isParentOf(d, e) && !e.selected) ? 1 : 1e-6; })
        .each("end", function(e) {
            d3.select(this).style("visibility", (isParentOf(d, e) && !e.selected) ? null : "hidden");
        });
  }
});

function isParentOf(p, c) {
  if (p === c) return true;
  if (p.children) {
    return p.children.some(function(d) {
      return isParentOf(d, c);
    });
  }
  return false;
}

function colour(d) {
  if (d.children) {
    // There is a maximum of two children!
    var colours = d.children.map(colour),
        a = d3.hsl(colours[0]),
        b = d3.hsl(colours[1]);
    // L*a*b* might be better here...
    return d3.hsl((a.h + b.h) / 2, a.s * 1.2, a.l / 1.2);
  }
  return d.colour || "#fff";
}

// Interpolate the scales!
function arcTween(d) {
  var my = maxY(d),
      xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
      yd = d3.interpolate(y.domain(), [d.y, my]),
      yr = d3.interpolate(y.range(), [d.y ? d.selected ? 0 : 20 : 0, (width > height ? height : width) / 2]);

  return function(d) {
    return function(t) {
      x.domain(xd(t));
      y.domain(yd(t)).range( yr(t) );

      return arc(d);
    };
  };
}

function maxY(d) {
  return d.children ? Math.max.apply(Math, d.children.map(maxY)) : d.y + d.dy;
}

// http://www.w3.org/WAI/ER/WD-AERT/#color-contrast
function brightness(rgb) {
  return rgb.r * .299 + rgb.g * .587 + rgb.b * .114;
}