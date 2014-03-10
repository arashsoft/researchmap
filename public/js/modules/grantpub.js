// Code by Arash - 27-02-2014
// New layout for showing relations between grants and publication:

var GRANTPUB = (function () { 

	//this list of 20 colors is calculated such that they are optimally disctinct. See 		http://tools.medialab.sciences-po.fr/iwanthue/
	var color20 = d3.scale.ordinal().range(["#D24B32","#73D74B","#7971D9","#75CCC1","#4F2A3F","#CA4477","#C78D38","#5D8737","#75A0D2","#C08074","#CD50CC","#D0D248","#CA8BC2","#BFC98D","#516875","#434E2F","#66D593","#713521","#644182","#C9C0C3"]);


// CSS file
$('head').append('<link rel="stylesheet" href="css/grantpub.css" type="text/css" />');

var margin = 10,
    //outerDiameter = 900,
    //innerDiameter = outerDiameter - margin - margin;
	 outerDiameter= $('#vizcontainer').width(),
	 innerDiameter= $('#vizcontainer').height();
	 
	 
	//var svgwidth = $('#vizcontainer').width();
	//var svgheight = $('#vizcontainer').height();

var x = d3.scale.linear()
    .range([0, innerDiameter]);

var y = d3.scale.linear()
    .range([0, innerDiameter]);

var color = d3.scale.linear()
    .domain([-1, 5])
    .range(["hsl(152,80%,80%)", "hsl(228,30%,40%)"])
    .interpolate(d3.interpolateHcl);

var pack = d3.layout.pack()
    .padding(2)
    .size([innerDiameter, innerDiameter])
    .value(function(d) { return d.size; })

var svg = d3.select("#networkviz").append("svg")
    .attr("width", outerDiameter)
    .attr("height", outerDiameter)
  .append("g")
    .attr("transform", "translate(" + margin+1 + "," + margin + ")");

d3.json("json/grantpub-sample.json", function(error, root) {
  var focus = root,
      nodes = pack.nodes(root);

  svg.append("g").selectAll("circle")
      .data(nodes)
    .enter().append("circle")
      .attr("class", function(d) { return d.parent ? d.children ? "node" : "node node--leaf" : "node node--root"; })
      .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
      .attr("r", function(d) { return d.r; })
      .style("fill", function(d) {
			switch(d.depth)
			{
			case 0:
			  return "#C3F1F7";
			  break;
			case 1:
			  return color20(d.name);
			  break;
			case 2:
			  return lighterColor(color20(d.parent.name),0.2);
			  break;
			case 3:
				return d.children ? lighterColor(color20(d.parent.parent.name),0.4) : lighterColor(color20(d.parent.parent.name),0.6)
			default:
			  return  lighterColor(color20(d.parent.parent.parent.name),0.8)
			}
		})
      .on("click", function(d) { return zoom(focus == d ? root : d); });

  svg.append("g").selectAll("text")
      .data(nodes)
    .enter().append("text")
      .attr("class", "label")
      .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
      .style("fill-opacity", function(d) { return d.parent === root ? 1 : 0; })
      .style("display", function(d) { return d.parent === root ? null : "none"; })
      .text(function(d) { return d.name; });

  d3.select(window)
      .on("click", function() { zoom(root); });

  function zoom(d, i) {
    var focus0 = focus;
    focus = d;

    var k = innerDiameter / d.r / 2;
    x.domain([d.x - d.r, d.x + d.r]);
    y.domain([d.y - d.r, d.y + d.r]);
    d3.event.stopPropagation();

    var transition = d3.selectAll("text,circle").transition()
        .duration(d3.event.altKey ? 7500 : 750)
        .attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; });

    transition.filter("circle")
        .attr("r", function(d) { return k * d.r; });

    transition.filter("text")
      .filter(function(d) { return d.parent === focus || d.parent === focus0; })
        .style("fill-opacity", function(d) { return d.parent === focus ? 1 : 0; })
        .each("start", function(d) { if (d.parent === focus) this.style.display = "inline"; })
        .each("end", function(d) { if (d.parent !== focus) this.style.display = "none"; });
  }
});

d3.select(self.frameElement).style("height", outerDiameter + "px");


// Extra functions for working with colors:
	var pad = function(num, totalChars) {
		 var pad = '0';
		 num = num + '';
		 while (num.length < totalChars) {
			  num = pad + num;
		 }
		 return num;
	};

	// Ratio is between 0 and 1
	var changeColor = function(color, ratio, darker) {
		 // Trim trailing/leading whitespace
		 color = color.replace(/^\s*|\s*$/, '');

		 // Expand three-digit hex
		 color = color.replace(
			  /^#?([a-f0-9])([a-f0-9])([a-f0-9])$/i,
			  '#$1$1$2$2$3$3'
		 );

		 // Calculate ratio
		 var difference = Math.round(ratio * 256) * (darker ? -1 : 1),
			  // Determine if input is RGB(A)
			  rgb = color.match(new RegExp('^rgba?\\(\\s*' +
					'(\\d|[1-9]\\d|1\\d{2}|2[0-4][0-9]|25[0-5])' +
					'\\s*,\\s*' +
					'(\\d|[1-9]\\d|1\\d{2}|2[0-4][0-9]|25[0-5])' +
					'\\s*,\\s*' +
					'(\\d|[1-9]\\d|1\\d{2}|2[0-4][0-9]|25[0-5])' +
					'(?:\\s*,\\s*' +
					'(0|1|0?\\.\\d+))?' +
					'\\s*\\)$'
			  , 'i')),
			  alpha = !!rgb && rgb[4] != null ? rgb[4] : null,

			  // Convert hex to decimal
			  decimal = !!rgb? [rgb[1], rgb[2], rgb[3]] : color.replace(
					/^#?([a-f0-9][a-f0-9])([a-f0-9][a-f0-9])([a-f0-9][a-f0-9])/i,
					function() {
						 return parseInt(arguments[1], 16) + ',' +
							  parseInt(arguments[2], 16) + ',' +
							  parseInt(arguments[3], 16);
					}
			  ).split(/,/),
			  returnValue;

		 // Return RGB(A)
		 return !!rgb ?
			  'rgb' + (alpha !== null ? 'a' : '') + '(' +
					Math[darker ? 'max' : 'min'](
						 parseInt(decimal[0], 10) + difference, darker ? 0 : 255
					) + ', ' +
					Math[darker ? 'max' : 'min'](
						 parseInt(decimal[1], 10) + difference, darker ? 0 : 255
					) + ', ' +
					Math[darker ? 'max' : 'min'](
						 parseInt(decimal[2], 10) + difference, darker ? 0 : 255
					) +
					(alpha !== null ? ', ' + alpha : '') +
					')' :
			  // Return hex
			  [
					'#',
					pad(Math[darker ? 'max' : 'min'](
						 parseInt(decimal[0], 10) + difference, darker ? 0 : 255
					).toString(16), 2),
					pad(Math[darker ? 'max' : 'min'](
						 parseInt(decimal[1], 10) + difference, darker ? 0 : 255
					).toString(16), 2),
					pad(Math[darker ? 'max' : 'min'](
						 parseInt(decimal[2], 10) + difference, darker ? 0 : 255
					).toString(16), 2)
			  ].join('');
	};
	var lighterColor = function(color, ratio) {
		 return changeColor(color, ratio, false);
	};
	var darkerColor = function(color, ratio) {
		 return changeColor(color, ratio, true);
	};
	
}());