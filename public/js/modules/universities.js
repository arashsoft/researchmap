// Code by Arash - 26-03-2014
// New layout for showing relations between universities

var UNIVERSITIES = (function () { 

document.write("<p>hello hello</p>");

console.log("herewrew");
// CSS file
/*
$('head').append('<link rel="stylesheet" href="css/universities.css" type="text/css" />');

//document.write("<p>hello</p>");

//var width = 960,
//    height = 500;

var width = $('#vizcontainer').width();
var height = innerDiameter= $('#vizcontainer').height();

var projection = d3.geo.albersUsa()
    .scale(1070)
    .translate([width / 2, height / 2]);

var path = d3.geo.path()
    .projection(projection);

var zoom = d3.behavior.zoom()
    .translate(projection.translate())
    .scale(projection.scale())
    .scaleExtent([height, 8 * height])
    .on("zoom", zoomed);

var svg = d3.select("#networkviz").append("svg")
    .attr("width", width)
    .attr("height", height);

var g = svg.append("g")
    .call(zoom);

g.append("rect")
    .attr("class", "background")
    .attr("width", width)
    .attr("height", height);

d3.json("json/usa-map.json", function(error, us) {
  g.append("g")
      .attr("id", "states")
    .selectAll("path")
      .data(topojson.feature(us, us.objects.states).features)
    .enter().append("path")
      .attr("d", path)
      .on("click", clicked);

  g.append("path")
      .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
      .attr("id", "state-borders")
      .attr("d", path);
});

function clicked(d) {
  var centroid = path.centroid(d),
      translate = projection.translate();

  projection.translate([
    translate[0] - centroid[0] + width / 2,
    translate[1] - centroid[1] + height / 2
  ]);

  zoom.translate(projection.translate());

  g.selectAll("path").transition()
      .duration(700)
      .attr("d", path);
}

function zoomed() {
  projection.translate(d3.event.translate).scale(d3.event.scale);
  g.selectAll("path").attr("d", path);
}

*/


});