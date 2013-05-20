//set the width to be used for the svg space on the page
var width = 1000,
    height = 700;

//constructs a new ordinal scale with a range of 20 colors
var color = d3.scale.category20();


/*The charge in a force layout refers to how nodes in the environment push away from one another or attract one another. Kind of like magnets, nodes have a charge that can be positive (attraction force) or negative (repelling force).*/
var force = d3.layout.force()
    .charge(-120)
    .linkDistance(30)
    .size([width, height]);

var svg = d3.select("#viz").append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("id", "networkViz");



var dataset;

// these variables are going to store functions
var RequestAmt_LinearScaled;
var RequestAmt_QuantileScaled;
var RequestAmt_PowerScaled;
// d3.json("science_test.json", function(error, data) {

// this function takes the form d3.csv(url, callback)
// This function issues an HTTP GET request for the comma-separated values (CSV) file at the specified url. The file contents are assumed to be RFC4180-compliant. The mime type of the request will be "text/csv". The request is processed asynchronously, such that this method returns immediately after opening the request. When the CSV data is available, the specified callback will be invoked with the parsed rows as the argument. If an error occurs, the callback function will instead be invoked with null.
d3.csv("science_test.csv", function(data) { 
  dataset = data;
  //console.log(dataset);



    //******************************************************* BEGIN DATA PRE-PROCESSING ***********************************************************//
    //This section cleans the data a bit by visiting each entry and removing some characters that we don't want
    //we are going to use the replace keyword that takes two arguments (whatToSearchFor, ReplacementText). Both of these can be regular 
    //expressions or strings. We also want to use the global flag (g) on the regular expression to replace all instances
    for (entry in dataset) {
        
        //let's clean and normalize the amount requested entry (RequestAmt)
        //first we need to make sure it is a string (otherwise we can't replace)
        if (typeof dataset[entry].RequestAmt === "string"){
            //we want to remove any commas that are part of the number
            dataset[entry].RequestAmt = dataset[entry].RequestAmt.replace(/,/g,"");
            //and to also remove whitespaces
            dataset[entry].RequestAmt = dataset[entry].RequestAmt.replace(/^\s+|\s+$/g, '');
            //and dollar signs...don't forget to escape (\) the dollar sign (special character)
            dataset[entry].RequestAmt = dataset[entry].RequestAmt.replace(/\$/g,"");
        };

        //now let's convert the string to a number (float)
        dataset[entry].RequestAmt = parseFloat(dataset[entry].RequestAmt);

        // changing any 0s to 1s to avoid problems later (e.g., with log scales, cannot have in the domain)
        if (dataset[entry].RequestAmt < 1) {
          dataset[entry].RequestAmt = 1.0;
        }

        //let's also convert the proposal from a string to a number (int)
        dataset[entry].Proposal = parseInt(dataset[entry].Proposal);

        //and convert the date from a string to a date object (make sure to add timezone!)
        dataset[entry].Created = new Date (dataset[entry].Created + "EDT");

        //let's see what we have
        //console.log(dataset[entry])
    };

    //*************************************************** END DATA PRE-PROCESSING ***********************************************************//

    //************************************************* BEGIN DATA TRANSFORMATIONS ***********************************************************//

    //this creates a linear scale for normalizing the data--in other words, mapping from an input domain to an output range
    RequestAmt_LinearScaled = d3.scale.linear()
        .domain([d3.min(dataset, function(d){ return d.RequestAmt;}), d3.max(dataset, function(d){ return d.RequestAmt;})])
        .range([0,60]);

    //this creates a logarithmic scale for normalizing the data--in other words, mapping from an input domain to an output range
    //NOT WORKING: RETURNS NaN
    RequestAmt_LogScaled = d3.scale.log()
        .domain([d3.min(dataset, function(d){ return d.RequestAmt;}), d3.max(dataset, function(d){ return d.RequestAmt;})])
        .range([0,20]);

    //this creates a quantile scale for normalizing the data--in other words, mapping from an input domain to an output range
    RequestAmt_QuantileScaled = d3.scale.quantile()
      .domain([d3.min(dataset, function(d){ return d.RequestAmt;}), d3.max(dataset, function(d){ return d.RequestAmt;})])
      .range([1,5,10,15,20,25]);

    //this creates a quantile scale for normalizing the data--in other words, mapping from an input domain to an output range
    RequestAmt_PowerScaled = d3.scale.pow()
      .domain([d3.min(dataset, function(d){ return d.RequestAmt;}), d3.max(dataset, function(d){ return d.RequestAmt;})])
      .range([1,30]);

    //************************************************* END DATA TRANSFORMATIONS ***********************************************************//


//   // var link = svg.selectAll(".link")
//   //     .data(graph.links)
//   //   .enter().append("line")
//   //     .attr("class", "link")
//   //     .style("stroke-width", function(d) { return Math.sqrt(d.value); });

  
  var node = svg.selectAll(".node") // selects all of the elements in the DOM with the class name of 'node'
      .data(dataset) // counts and parses data values. everything past this point is executed the number of times as the quanitity of the dataset
    .enter() // this creates new, data-bound elements. This method looks at the current DOM selection (elements with class .node) and then at the data being handed to it. If there are more data values than corresponding DOM elements, then enter() creates a new placeholder element with which to work further. It then hands off a reference to this new placeholder to the next step in the chain.
      .append("circle") // takes an empty placeholder selection created by enter() and appends an svg "circle" element into the DOM. Then hands off a reference to the element it just created in the next step of the chain
      .attr("class", "node") // takes the reference to the newly created circle and gives it the css class "node"
      .attr("r", 10) //gives the circle a radius of 10
      .attr("stroke", "black") // gives the circle a stroke of black
      //.attr("class", "tooltip")
      .style("fill", function(d) { return color(d.Status); }) // fills the circle with a color using a function
      .call(force.drag); // binds a behavior to the node to allow interactive dragging
//       // .on("mouseover", function (d) {
//       //   circle.transition()
//       //     .duration(200)
//       //     .style("opacity", .9);
//       //   circle.html("<p>" + d[Proposal] + "</p>");
//       //  }) 
//       // .on("mouseout", function(d) {
//       //   circle.transition(500)
//       //   .style("opacity", 0);
//       // });

  // constructs a new force-directd layout
  force
      .nodes(dataset) // sets the layout's associated nodes to the specified array--in our case 'dataset'
      .gravity(0.5) // 0.1 is default
      .friction(0.9) // 0.9 is default value
      .start();


//   node.append("proposal")
//       .text(function(d) { return d.Proposal; });

//   node.append("PI")
//       .text(function(d) { return d.PI; });

//   node.append("award_id")
//       .text(function(d) { return d.AwardID; });

//   node.append("status")
//      .text(function(d) { return d.status; });

//   node.append("title")
//      .text(function(d) { return d.Title; });

//   node.append("created")
//      .text(function(d) { return d.Created; });

//   node.append("sponsor")
//      .text(function(d) { return d.Sponsor; });     

//   node.append("program")
//      .text(function(d) { return d.Program; });  


// /*Registers the specified listener to receive events of the specified type from the force layout. Currently, only "tick" events are supported, which are dispatched for each tick of the simulation. Listen to tick events to update the displayed positions of nodes and links.*/
  force.on("tick", function() {
//     // link.attr("x1", function(d) { return d.source.x; })
//     //     .attr("y1", function(d) { return d.source.y; })
//     //     .attr("x2", function(d) { return d.target.x; })
//     //     .attr("y2", function(d) { return d.target.y; });

    node.attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; })
        .attr("stroke", "black");
  });
});

// this seems very similar to jquery functionality
function changeGravity() {
    d3.select("#definitionbox").html("Canvas gravity draws all nodes toward the center of the canvas, preventing them from flying out of view.");
}

function changeNodeSize(criteria) {
    
  switch(criteria){
    case 'Constant':
      d3.select("#definitionbox").html("Radius is constant at 10 px.");
      break;
    case 'Quartile':
      d3.select("#definitionbox").html("Radius is define by quartile.");      
      break;
    case 'Log':
      d3.select("#definitionbox").html("Radius is defined by log.");      
      break;
    case 'Power':
      d3.select("#definitionbox").html("Radius is defined by a power scale.");      
      break;      
  }
}

function highlightNodes() {
  d3.selectAll("circle.node").transition().duration(300).style("stroke-width", 5);
  d3.selectAll("circle.node").transition().delay(300).duration(300).style("stroke-width", 0);

  if (document.getElementById('nodeCheckbox').checked == true) {
    document.getElementById("repulsionSlider").disabled=true;
    d3.select("#definitionbox").html("Nodes exert a repulsion on other nodes based on their degree centrality.");
  }
  else {
    document.getElementById("repulsionSlider").disabled=false;
    d3.select("#definitionbox").html("Nodes exert a fixed value of repulsion set with the slider.");
  }
}

function updateText(lessonType) {
  switch(lessonType)
  {        
  case "introduction":
  d3.select("#lessontext").html("<h2>Introduction</h2><p>Welcome...</p>");
  break;
  case "transport":
  d3.select("#codetext").html("<h3>Code</h3><p>Loading a Transportation Network uses the same code to load all preset networks, so maybe this should focus on the CSV being loaded</p>");
  d3.select("#lessontext").html("<h2>Transportation Networks</h2><p>This is a piece of the transportation network of the Roman World from <a href='http://orbis.stanford.edu'>ORBIS</a>. A transportation network typically uses edges to describe an annotated connection between two sites, though sometimes nodes do not represent sites in the traditional sense but rather any place where a switch can be made from one route to another, such as an intersection, on-ramp, or crossroads.</p><p>If plotted, the nodes are laid out by their geographic location</p><p><a href='http://thenounproject.com/noun/city/#icon-No1566'>City icon by Thibault Geffroy, from The Noun Project</a></p>");
  break;
  case "randomgraph":
  d3.select("#codetext").html("<h3>Code</h3><p>Some code that produces a random graph, with random links and random spatial characteristics.</p>");
  d3.select("#lessontext").html("<h2>Random Graph</h2><p>Random graphs are used as control sets to compare variation with the studied network. Random isn't the best word for these networks, as they can be generated by very specific and complicated rules, so as better to model the phenomena being studied.</p><p>If plotted, each node will be placed according to random xy values generated when the network is first created.</p><p>This graph is created with 50 nodes and a 2.5% for each node to be connected to each node (in both directions, so a 5% chance total if treated as an undirected graph). You can create a new random graph with different settings:</p><form>Nodes: <input type=\"text\" name=\"nrgNodeValue\" value=\"50\" /> Link Chance <input type=\"text\" name=\"nrgLinksValue\" value=\".025\" /><input type=\"button\" value=\"New Graph\" onclick='randomGraph(this.form.nrgNodeValue.value,this.form.nrgLinksValue.value);'></form>");
  break;
  case "drama":
  d3.select("#codetext").html("<h3>Code</h3><p>Loading a Dramatic Network uses the same code to load all preset networks, so maybe this should focus on the CSV being loaded.</p>");
  d3.select("#lessontext").html("<h2>Dramatic Network</h2><p>This network represents speech-intereactions in one of Shakespeare's most famous plays, Hamlet. An edge from one character to another indicates the former has spoken to the latter; the weight of the edge indicates the number of words spoken. This network was first constructed by hand by Franco Moretti in 'Network Theory, Plot Analysis', published in New Left Review 68 (March-April 2011). Since then, researchers in the Literary Lab have constructed networks from each of Shakespeare's plays, as well as the plays of Aeschylus, Euripides, Sophocles, Aristophanes, Seneca, Racine, Corneille, and Ibsen. For more information, see the Literary Lab's second pamphlet on this work, available <a href='http://litlab.stanford.edu/?page_id=255'>here</a>.</p><p>If plotted, the network is laid out according to number of speech events (y-axis) by amount of words spoken (x-axis).");
  break;
  case "darwin":
  d3.select("#codetext").html("<h3>Code</h3><p>Loading a Genaological Network uses the same code to load all preset networks, so maybe this should focus on the CSV being loaded.</p>");
  d3.select("#lessontext").html("<h2>Genealogical Network</h2><p>This network consists of individuals with the last name Darwin, from a genealogical network of British cultural elites. The network does not include any children or spouses with different surnames.</p><p>If plotted, nodes are laid out by birthdate (x-axis) and lifespan (y-axis)");
  break;
  case "dgsd":
  d3.select("#codetext").html("<h3>Code</h3>");
  d3.select("#lessontext").html("<h2>Political Administrative Network</h2><p>The Digital Gazetteer of the Song Dynasty describes the manner in which administrative units were organized during the Song Dynasty. Here we can see counties, prefectures, and towns in Fujian Circuit.</p><p>In a sense, this is an n-partite graph, meaning that the network consists of nodes of different types (n indicating the number of different types), since it represents distinct administrative entities the sets of which (counties, prefectures, towns, circuits) do not directly connect within each set. e.g. A county does not connect to a county but rather connects to a prefecture or town, which likewise do not ever connect to members of the same class but rather administrative units above or below them.</p><p>Networks that represent different classes or categories of nodes are more difficult to measure and represent than networks that represent single categories of nodes. Of course, if one's object of study is a broader category, such as 'administrative units' then it avoids this issue.</p><p>If plotted, the network is laid out geographically, with unknown locations inheriting the point location of their parent unit (except for the circuit itself, which is laid at the geographic center of the known points.</p><p><a href='http://thenounproject.com/noun/city/#icon-No1566'>City icon by Thibault Geffroy, from The Noun Project</a></p>");
  break;
  case "pathfinding":
  d3.select("#codetext").html("<h3>Code</h3><p>This one is going to give you fits, because the same code is used for individual paths and aggregated statistics.</p>");
  d3.select("#lessontext").html("<h2>Network Pathfinding</h2><p>Finding the shortest path between two nodes in a network provides the basis for several network statistics measures such as Betweenness, Network Diameter, and Closeness.</p> <p>Network pathfinding is accomplished using various pathfinding algorithms, the most common being Dijkstra's algorithm, which is suitable for small networks like this but not for the large networks typically analyzed with packages such as Gephi. For large networks, heuristics need to be employed to improve the efficiency of an algorithm. One such pathfinding algorithm that employs heuristics is <a href='http://en.wikipedia.org/wiki/A*_search_algorithm'>A*</a>.</p><p>Notice that the path between nodes in a network can change or cease to exist if the network is directed instead of undirected.</p>");
  break;
  case "centrality":
  d3.select("#codetext").html("<h3>Code</h3><p>Part of this code is from Pathfinding.</p>");
  d3.select("#lessontext").html("<h2>Centrality</h2><p>Centrality is a general term indicating a measure of a node's location in a network relative to other nodes in the network.</p><p>One measure, shown first, is the average Least Cost Path to all the nodes in the network. This <input type='button' onclick='sizeByStats(\"Average Path Length\")' value='Average Path Length' /> is similar to (these should be buttons) Closeness or Farness centrality.</p><p>Another measure is <input type='button' onclick='sizeByStats(\"Betweenness\")' value='Betweenness Centrality' /> which tallies the number of times a node is crossed for every least cost path in the network.</p><p>There are many more centrality measures some of which are described in [1].</p>");
  break;
  case "clustering":
  d3.select("#codetext").html("<h3>Code</h3><p>This code only does undirected</p>");
  d3.select("#lessontext").html("<h2>Clustering</h2><p>The clustering coefficient of a node is determined by comparing the number of connections between connected nodes to the number of possible connections between connected nodes. A clustering coefficient of 1 indicates a clique, which is a set of nodes that are all connected to each other. The local clustering coefficient is the value for an individual node, while the global clustering coefficient is the average of this value for the entire network.</p>");
  break;
  case "egonetwork":
  d3.select("#codetext").html("<h3>Code</h3><p>Ego network code.</p>");
  d3.select("#lessontext").html("<h2>Ego Network</h2><p>Ego networks show the local area of a network around a node. In this case, it's fixed to any node within two steps of the node you click on.</p>");
  break;
  case "spatialproblem":
  d3.select("#codetext").html("<h3>Code</h3><p>Part of this code is from showing ego networks.</p>");
  d3.select("#lessontext").html("<h2>The Spatial Problem</h2><p>The spatial problem in network visualization is the misrepresentation of similarity using space. By placing nodes on a visual plane, the implication is that nodes that are near each other spatially are near each other topologically. Unfortunately, this is often not the case. Here we can see nodes that are near each other spatially but distant from each other topologically.</p><p>A weighted version of this problem would not use raw ego networks but rather a fixed cost, and can be used to highlight, especially in transportation networks, how topography influences topology.</p>");
  break;
  case "forcealgo":
  d3.select("#codetext").html("<h3>Code</h3><p>This relies on the standard D3.js force-directed layout behavior.</p>");
  d3.select("#lessontext").html("<h2>Force-Directed Layout</h2><p>A popular method for laying out networks is to assign repulsive and attractive forces to nodes and links so that the emergent behavior of the competing forces produces a network that is more legible than manually or hierarchically placing the nodes. These competing forces are typcially a repulsive force exerted by nodes (which can be based on a numerical attribute of the node or a fixed value), an attractive force exerted by shared links between nodes (which can be based on the strength of the length, typically known as \"weight\" or fixed) and a canvas gravity that draws nodes toward the center of the screen and prevents them from being pushed beyond the view of the user.</p><p>Force-directed layouts do not typically assign any value to a node being placed along the x- or y-axis beyond the confluence of forces acting upon it from nearby nodes and links. As a result, even a very stable and readable force-directed layout can be mirrored or rotated without otherwise changing. This has had the effect upon scholars of assuming that there was something wrong with a force-directed layout that placed a node on the 'top' or 'left' in one layout but on the 'bottom' or 'right' in another. Such behavior is part of the force-directed layout unless specifically designed otherwise.</p>");
  break;
  case "plotlayout":
  d3.select("#codetext").html("<h3>Code</h3><p>The code first shuts down the force-directed algorithm, then transforms the location of the nodes and edges using typical transition() behavior, then updates the .x/.px/.y/.py attributes so that if the force-directed algorithm is reinitialized, it restarts with nodes and edges in the proper position.</p>");
  d3.select("#citations").html("<h3>Citations</h3><ol><li>...</li><li>...</li></ol>");
  d3.select("#lessontext").html("<h2>Plot Layouts</h2><p>Nodes are ultimately data points with lines drawn between them. As such, they can be plotted like any data points by setting their position based on such attributes. This is used for nodes that represent geographic entities by placing them using their geographic coordinates, and can be used in traditional scatterplot fashion using built-in functionality in network analysis and visualization packages such as Gephi.</p>");
  break;
  
  }
}

function recolor(criteria){
  d3.selectAll("circle.node").data(dataset).style("fill", function (d) {  return color(d[criteria]); } ).attr("stroke", "black");
}

function resizeNodes(criteria) {
  switch(criteria){
    case 'Constant':
      d3.selectAll("circle.node").data(dataset).attr("r", 10);
      break;
    case 'Quartile':
      d3.selectAll("circle.node").data(dataset).attr("r", function (d) { return RequestAmt_QuantileScaled(d.RequestAmt)});
      break;
    case 'Log':
      d3.selectAll("circle.node").data(dataset).attr("r", function (d) { return RequestAmt_LogScaled(d.RequestAmt)});
      break;
    case 'Power':
      d3.selectAll("circle.node").data(dataset).attr("r", function (d) { return RequestAmt_PowerScaled(d.RequestAmt)});
      break;      
  }
}

// function displayByDept {

// }


// function showDetails (data, i, element) {
//     d3.select(element).attr("stroke", "black")
//     content = "<span class=\"name\">Title:</span><span class=\"value\"> #{data.name}</span><br/>"
//     content +="<span class=\"name\">Amount:</span><span class=\"value\"> $#{addCommas(data.value)}</span><br/>"
//     content +="<span class=\"name\">Year:</span><span class=\"value\"> #{data.year}</span>"
//     d3.tooltip @tooltip.showTooltip(content,d3.event)
// }

// function hide_details (data, i, element) {
//     d3.select(element).attr("stroke", (d) { d3.rgb(@fill_color(d.group)).darker())
//     @tooltip.hideTooltip()
// }




function updateForce() {
  console.log("here");
  force.stop();
  
  var newGravity = document.getElementById('gravitySlider').value;
  var newCharge = document.getElementById('repulsionSlider').value;
  //var newLStrength = document.getElementById('attractionSlider').value;
  
  //for updating the values on the screen
  document.getElementById('gravityInput').value = newGravity;
  document.getElementById('repulsionInput').value = newCharge;
  //document.getElementById('attractionInput').value = newLStrength;
  
  force
  .charge(newCharge)
  // .linkDistance(newLStrength)
  .gravity(newGravity)
  ;
  
  
  // if (document.getElementById('edgeCheckbox').checked == true) {
  // var minWeight = d3.min(links, function(d) {return parseFloat(d["cost"])});
  // var maxWeight = d3.max(links, function(d) {return parseFloat(d["cost"])});
  
  // //notice this is the reverse of the max/min ramp in the styling, because we're not determining link strength but the inverse: Link Distance
  // var edgeRamp = d3.scale.linear().domain([minWeight,maxWeight]).range([.5,3]).clamp(true);

  //   force.linkDistance(function(d) {return (edgeRamp(parseFloat(d["cost"])) * 30)})
  // }

  //   if (document.getElementById('nodeCheckbox').checked == true) {
  //     var minSize = d3.min(nodes, function(d) {return parseFloat(d["weight"])});
  //     var maxSize = d3.max(nodes, function(d) {return parseFloat(d["weight"])});
  //     var sizingRamp = d3.scale.linear().domain([minSize,maxSize]).range([1,10]).clamp(true);
      
  //   force.charge(function(d) {return (sizingRamp(parseFloat(d["weight"])) * -20)})
  // }

  force.start();
}
