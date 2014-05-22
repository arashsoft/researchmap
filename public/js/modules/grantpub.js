// Code by Arash - 27-02-2014
// New layout for showing relations between grants and publication:

var GRANTPUB = (function () { 


/* ---------------------------------
					Old code
	---------------------------------

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

		 
		 
	
	//d3.json("json/sponsor_grant_publication_data.json",function(error,bigData){
	//d3.json("json/faculty_grant_publication_data.json",function(error,bigData){
	
	d3.json("json/grantpub-sample.json", function(error, root) {
	
		//var root = bigData["faculty_circle_packing_data"][0];
		//var root = bigData["sponsor_circle_packing_data"];
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
	
	----------------------------------
				End of old Code
	---------------------------------- */
	
	
	// New code - 22/04/2014
	
	// CSS file
	$('head').append('<link rel="stylesheet" href="css/grantpub.css" type="text/css" />');
	

	$('#grantpubContainer').css('height', $(window).height()-120+'px');
	
	// some global variables
	var top20 = [],
	colorTreemap = d3.scale.category20c(),
	 headerHeight = 20,
	 headerColor = "#555555",
	 headerColor2 = "#999999",
	 transitionDuration = 1000;

	
	// constructTreemap make these variables and prebuildTreemap use them to build treemaps
	var sponsorData, departmentData , grant_sponsors;
		
	var margin,
	leftWidth, 
	leftHeight, 
	leftTreemap,
	leftTreemapviz,
	leftTreemapsvg, 
	leftNode,
	rightWidth,
	rightHeight,
	rightTreemap,
	rightTreemapviz,
	rightTreemapsvg,
	rightNode;
			
	var boolFilterAccepted=true;
	var boolFilterClosed=true;
	var boolFilterDeclined=true;
	var boolFilterOthers=true;
	
	$(document).ready(function(){
		
		//handlebar implementation
		$('#verticalText').click(function(){
		var panel = $('#rightPanel');
			if (panel.hasClass('visible')){
				panel.animate({"right":"-210px"}, "slow").removeClass('visible');
				$("#verticalText").html("Show Filter").css("left" , "-28px").css("background-color","#f6931f");
			} else {
				panel.animate({"right":"0px"}, "slow").addClass('visible');
				$("#verticalText").html("Hide  Filter").css("left" , "-50px").css("background-color","#F8A94C");
			}
		});	
		
		$('input').iCheck({
      checkboxClass: 'icheckbox_square-blue',
      radioClass: 'iradio_square-blue',
		});
		
		$("#yearSlider").slider({
			range: true,
			values: [1973, 2018 ],
			min: 1973,
			max: 2018,
			step: 1,
			slide: function( event, ui ) {
				$( "#yearText" ).val( "$" + ui.values[ 0 ] + " - $" + ui.values[ 1 ] );
				refreshTreemaps();
			}
		});
		$("#yearText").val( "$" + $("#yearSlider").slider( "values", 0 ) + " - $" + $( "#yearSlider" ).slider( "values", 1 ) );
		
		
		$('input#treemapFilterAccepted').on('ifChecked', function(){boolFilterAccepted=true;refreshTreemaps();});
		$('input#treemapFilterAccepted').on('ifUnchecked', function(){boolFilterAccepted=false;refreshTreemaps();});
		$('input#treemapFilterClosed').on('ifChecked', function(){boolFilterClosed=true;refreshTreemaps();});
		$('input#treemapFilterClosed').on('ifUnchecked', function(){boolFilterClosed=false;refreshTreemaps();});
		$('input#treemapFilterDeclined').on('ifChecked', function(){boolFilterDeclined=true;refreshTreemaps();});
		$('input#treemapFilterDeclined').on('ifUnchecked', function(){boolFilterDeclined=false;refreshTreemaps();});
		$('input#treemapFilterOthers').on('ifChecked', function(){boolFilterOthers=true;refreshTreemaps();});
		$('input#treemapFilterOthers').on('ifUnchecked', function(){boolFilterOthers=false;refreshTreemaps();});
		
		
		margin = {top: 5, right: 0, bottom: 5, left: 0};
		leftWidth = $('#leftTreemap').width() - margin.left - margin.right;
		leftHeight = $('#leftTreemap').height() - margin.top - margin.bottom; 
		
		leftTreemap = d3.layout.treemap()
			.round(false)
			.size([leftWidth, leftHeight])
			.mode("squarify")
			.sticky(true)
			.padding([headerHeight + 1, 1, 1, 1])
			.value(treemapValueAccessor);
			
		leftTreemapviz = d3.select("#leftTreemap").append("div")
			.attr("class", "chart")
			.style("width", leftWidth + margin.left + margin.right + "px")
			.style("height", leftHeight + margin.top + margin.bottom + "px")
		 .append("svg:svg")
			.attr("width", leftWidth + margin.left + margin.right)
			.attr("height", leftHeight + margin.top + margin.bottom);
		 // .append("svg:g")
		 //   .attr("transform", "translate(.5,.5)");

		leftTreemapsvg = leftTreemapviz.append("svg:g")
			.attr("id", "departmentsTreemap")
			.attr("transform", "translate(.5,.5)")
			.attr("pointer-events", "visible");
		
		// nestedData = "sponsor"
		rightWidth = $('#rightTreemap').width() - margin.left - margin.right;
		rightHeight = $('#rightTreemap').height() - margin.top - margin.bottom; 
		
		rightTreemap = d3.layout.treemap()
			.round(false)
			.size([rightWidth, rightHeight])
			.mode("squarify")
			.sticky(true)
			.padding([headerHeight + 1, 1, 1, 1])
			.value(treemapValueAccessor);
			
		
		rightTreemapviz = d3.select("#rightTreemap").append("div")
			.attr("class", "chart")
			.style("width", rightWidth + margin.left + margin.right + "px")
			.style("height", rightHeight + margin.top + margin.bottom + "px")
		 .append("svg:svg")
			.attr("width", rightWidth + margin.left + margin.right)
			.attr("height", rightHeight + margin.top + margin.bottom);
		 // .append("svg:g")
		 //   .attr("transform", "translate(.5,.5)");

		rightTreemapsvg = rightTreemapviz.append("svg:g")
			.attr("id", "departmentsTreemap")
			.attr("transform", "translate(.5,.5)")
			.attr("pointer-events", "visible");
			
		
		// Start the Treemap
		constructTreemap();	
		
		
		
		/* old tooltip method
		//jquery for add tooltip to child cells :
		// departments
		$( "#leftTreemap").tooltip({
			items: "g",
			content: function() {
			
				if ( $(this).attr("class") == "cell child" ) {
					var title = this.__data__.Title;
					var PI = this.__data__.PI;
					var coI = this.__data__.CoI;
					var sponsor = this.__data__.Sponsor;
					var program = this.__data__.PgmName;
					var amt = this.__data__.RequestAmt;
					var pstatus = this.__data__.ProposalStatus;
					var astatus = this.__data__.AwardStatus;
					var begin = this.__data__.BeginDate;
					var end = this.__data__.EndDate;
					var text = "<b>Title:</b> " + title + "<br><b>PI:</b> " + PI + "<br><b>Co I:</b> " + coI + "<br><b>Sponsor:</b> " + sponsor + "<br><b>Program:</b> " + program + "<br><b>Amount:</b> " + amt + "<br><b>Proposal Status:</b> " + pstatus + "<br><b>Award Status:</b> " + astatus + "<br><b>Begin Date:</b> " + begin + "<br><b>End Date:</b> " + end;
					return text;
				}
			
				if ( $(this).attr("class") == "cell labelbar" || $(this).attr("class") == "cell parent") {
					var departmentName = this.__data__.name;
					var numChildren = this.__data__.children.length;
					var total = this.__data__.value;
					var text = "<b>Faculty of Science - " + departmentName + "</b><br><b>Number of grants:</b> " + numChildren + "<br><b>Total Request Amount:</b> $" + total;
					return text;
				}
			}
		});
	
		// sponsors
		$( "#rightTreemap").tooltip({
			items: "g",
			content: function() {
				if ( $(this).attr("class") == "cell child" ) {
					var title = this.__data__.Title;
					var PI = this.__data__.PI;
					var coI = this.__data__.CoI;
					var sponsor = this.__data__.Sponsor;
					var program = this.__data__.PgmName;
					var amt = this.__data__.RequestAmt;
					var pstatus = this.__data__.ProposalStatus;
					var astatus = this.__data__.AwardStatus;
					var begin = this.__data__.BeginDate;
					var end = this.__data__.EndDate;
					var text = "<b>Title:</b> " + title + "<br><b>PI:</b> " + PI + "<br><b>Co I:</b> " + coI + "<br><b>Sponsor:</b> " + sponsor + "<br><b>Program:</b> " + program + "<br><b>Amount:</b> " + amt + "<br><b>Proposal Status:</b> " + pstatus + "<br><b>Award Status:</b> " + astatus + "<br><b>Begin Date:</b> " + begin + "<br><b>End Date:</b> " + end;
					return text;
				}
				if ( $(this).attr("class") == "cell labelbar" || $(this).attr("class") == "cell parent") {
					var programName = this.__data__.name;
					var numChildren = this.__data__.children.length;
					var total = this.__data__.value;
					var text = "<b>Sponsor :"+ programName +"</b><br><b>Number of grants:</b> " + numChildren + "<br><b>Total Request Amount:</b> $" + total;
					return text;
				}
				if ( $(this).attr("class") == "cell labelbar labelbar2" || $(this).attr("class") == "cell parent2") {
					var numChildren = this.__data__.children.length;
					var total = this.__data__.value;
					var text = "<b>Program :</b> " + this.__data__.name + "<br><b>Number of grants:</b> " + numChildren + "<br><b>Total Request Amount:</b> $" + total;
					return text;
				}
			}
		});
		*/
	}); // end of document.ready
	

	function constructTreemap () {
	
	var xpos = $('#grantpubContainer').width()/2 - $('#vizloader').width()/2-45;
	var ypos = $('#grantpubContainer').height()/2 - $('#vizloader').height()/2-70;
	$('#vizloader').css({"position": "absolute", "left":  xpos + "px", "top": ypos + "px","margin": "0 auto"}).show();
	$('#vizloader').show();
	// get data from server
	getTreemapData(prebuildTreemap);
	 
  }//end constructTreemap
	
	
	function getTreemapData (callback) {
		var nested_by_sponsor, nested_by_department, grants_unique, all_grants;
		
		async.parallel([
			function(callback) {
				 if(store.session.has("nested_by_department")){
					console.log("nested_by_department is already in sessionStorage...no need to fetch again!");
					departmentData = store.session("nested_by_department");
					//grants_unique = store.session("grants_unique");
					grant_sponsors = store.session("grant_sponsors");
					callback();      
				 }
				 else{
					console.log("fetching nested_by_department...");
					$.get('/grantpub/nested_by_department', function(result) {
					  nested_by_department = JSON.parse(result.nested_by_department);
					  //grants_unique = JSON.parse(result.grants_unique);
					  grant_sponsors = JSON.parse(result.grant_sponsors);
					  
					  try {
						 //store.session("nested_by_department", nested_by_department);
						 store.session("grant_sponsors", grant_sponsors);
					  }
					  catch (e) {
						 console.log("Error trying to save data to sessionStorage: " + e);
					  }
					  departmentData = nested_by_department;
					  callback();        
					});
				 }
			},
			function(callback) {
				if(store.session.has("nested_by_sponsor")){
					console.log("nested_by_sponsor is already in sessionStorage...no need to fetch again!");
					sponsorData = store.session("nested_by_sponsor");
					//grants_unique = store.session("grants_unique");
					grant_sponsors = store.session("grant_sponsors");      
					callback();      
				}
				else{
					console.log("fetching nested_by_sponsor...");
					$.get('/grantpub/nested_by_sponsor', function(result) {
					  nested_by_sponsor = JSON.parse(result.nested_by_sponsor);
					  //grants_unique = JSON.parse(result.grants_unique);
					  grant_sponsors = JSON.parse(result.grant_sponsors);

					  try {
						 //store.session("nested_by_sponsor", nested_by_sponsor);
						 store.session("grant_sponsors", grant_sponsors);
					  }
					  catch(e) {
						 console.log("Error trying to save data to sessionStorage: " + e);
					  }
					  sponsorData = nested_by_sponsor;
					  callback();
					});
				}  
			},
			function(callback) {
			  if(store.session.has("all_grants")){
				 console.log("all_grants is already in sessionStorage...no need to fetch again");
				 all_grants = store.session("all_grants");
				 callback();
			  }
			  else {
				 console.log("fetching all_grants");
				 $.get('grantpub/all_grants', function(result){
					all_grants = JSON.parse(result.all_grants);
					//store.session("all_grants", all_grants);
					callback();
				 });
			  }         
			}
			],
			function(err, result) {
			  top20 = topSponsors(20, grant_sponsors, all_grants);
			  //yearRangeArrayBuilt = false;
			  //initTreemapFilter(all_grants);
			  callback();
			}
		);
	}//end getTreemapData
	
	
	// calls two version of buildTreemap 	
	function prebuildTreemap() {
		$('#vizloader').hide();
	
	// department pannel
	leftNode = departmentData;
	buildTreemap (departmentData, grant_sponsors, leftTreemapsvg, leftTreemap ,leftWidth , leftHeight );
	
	// Sponsors pannel
	rightNode = sponsorData;
	buildTreemap (sponsorData, grant_sponsors, rightTreemapsvg, rightTreemap, rightWidth , rightHeight );
	
	}
	

// main function - visualizing treeMap
	function buildTreemap(myData ,grant_sponsors , treemapsvg , treemap , myWidth, myHeight ) {

		 //construct the legend
		 //constructTreemapLegend();
	   var node;
		node = myData;

		//sticky treemaps cache the array of nodes internally; therefore, to reset the cached state when switching datasets with a sticky layout, call sticky(true) again
		var nodes = treemap.nodes(myData);
		 //.filter(function(d) { return !d.children; }); //no children

		 var children = nodes.filter(function(d) {
			  return !d.children;
		 });

		 
		 if(myData.name == "Departments") {
			var parents = nodes.filter(function(d) {
				 return d.children;
			});
		 } else {
			var parents = nodes.filter(function(d) {
				 return d.depth < 2; //sponsors
			});
			var parents2 = nodes.filter(function(d) {
				 return d.depth == 2; //programs
			})
		 }

		 // create children cells
		 var childCells = treemapsvg.selectAll("g.cell.child")
					.data(children)
					.enter().append("g")
					.attr("class", "cell child")
					.on("click", function(d) {
						//resetting
						d3.selectAll(".cell.child.highlighted").attr("class", "cell child");
						d3.selectAll(".cell.labelbar.highlighted").attr("class", "cell labelbar");
						d3.selectAll(".cell.labelbar.labelbar2.highlighted").attr("class", "cell labelbar labelbar2");
						//set the highlighted one
						d3.select(this).attr("class","cell child highlighted");
						// call the related function to highlight related grants
						myData.name == "Sponsors" ? sponsorGrantClick(this) : departmentGrantClick(this);
					});
		 childCells.append("rect")
					.style("fill", function(d) {
					  if(_.contains(top20, d.Sponsor))
						 return colorTreemap(d.Sponsor);
					  else
						 return "#f9f9f9";
					});/*//Sponsor name is too long. It won't display even when zooming the treemap.
		 childCells.append('text')
					.attr("class", "celllabel")
					.attr('x', function(d) { return d.dx / 2; })
					.attr('y', function(d) { return d.dy / 2; })
					//.attr("dy", ".35em")
					.attr("text-anchor", "middle")
					.style("opacity", 0)
					.text(function(d) {
					  return d.Sponsor;
					});*/
		
		// add title to childs
		childCells.append("svg:title")
			.text(function(d) {
				var title = d.Title;
				var PI = d.PI;
				var coI = d.CoI;
				var sponsor = d.Sponsor;
				var program = d.PgmName;
				var amt = d.RequestAmt;
				var pstatus = d.ProposalStatus;
				var astatus = d.AwardStatus;
				var begin = d.BeginDate;
				var end = d.EndDate;
				var text = "Title: " + title + "\nPI: " + PI + "\nCo I:" + coI + "\nSponsor: " + sponsor + "\nProgram: " + program + "\nAmount: " + amt + "\nProposal Status: " + pstatus + "\nAward Status: " + astatus + "\nBegin Date: " + begin + "\nEnd Date: " + end;
				return text;
			});
			
			
		 // update transition
		 childCells//.transition().duration(transitionDuration)
					.attr("transform", function(d) {
						 return "translate(" + d.x  + "," + d.y + ")";
					})
					.selectAll("rect")
					.attr("width", function(d) {
						 return Math.max(0.01, d.dx - 1);
					})
					.attr("height", function(d) {
						 return Math.max(0.01, d.dy - 1);
					})/*
		 childCells.transition().delay(transitionDuration)
					.selectAll("text")
					.style("opacity", function(d) {
					  d.w = this.getComputedTextLength();
					  return d.dx > d.w ? 1 : 0;
					});*/

		 // create parent cells
		 var parentCells = treemapsvg.selectAll("g.cell.parent")
					.data(parents)
					.enter().append("g")
					.attr("class", "cell parent")
					// .on("click", function(d) {
					  // zoom(node === d ? root : d,myWidth,myHeight, treemapsvg);
					// });
		 parentCells.append("rect")
					.style("opacity", 0);/*
					.style("fill", function(d) {
					  if($('#arrangetreemap').val() == "sponsor") {
						 if(_.contains(top20, d.name))
							return colorTreemap(d.name);
						 else
							return "#f9f9f9";
					  } else {
						 return colorTreemap(d.name);
					  }
					});*/

		 // update transition
		 parentCells//.transition().duration(transitionDuration)
					.attr("transform", function(d) {
						 return "translate(" + d.x + "," + d.y + ")";
					});

		 // create bar cells
		 var barCells = treemapsvg.selectAll("g.cell.labelbar")
					.data(parents)
					.enter().append("g")
					.attr("class", "cell labelbar")
					.on("click", function(d) {
						
						//resetting
						d3.selectAll(".cell.child.highlighted").attr("class", "cell child");
						d3.selectAll(".cell.labelbar.highlighted").attr("class", "cell labelbar");
						d3.selectAll(".cell.labelbar.labelbar2.highlighted").attr("class", "cell labelbar labelbar2");
						//set the highlighted one
						d3.select(this).attr("class","cell labelbar highlighted");
						// call the related function to highlight related grants
						myData.name == "Sponsors" ? sponsorSponsorClick(this) : departmentDepartmentClick(this);
					})
					.on("dblclick", function(d) {
						if (node == d){
							if(myData.name == "Sponsors") {
								rightNode=d.parent;
							}else{
								leftNode=d.parent;
							}
							zoom(d.parent, myWidth, myHeight, treemapsvg);
							node = d.parent;
						}else{
							if(myData.name == "Sponsors") {
								rightNode=d;
							}else{
								leftNode=d;
							}
							zoom(d, myWidth, myHeight, treemapsvg);
							node = d;
						}
					});
		 barCells.append("rect")
					.classed("background", true)
					.style("fill", headerColor);
		 barCells.append("text")
					.attr("class", "celllabel")
					.attr("x", function(d) { return d.dx / 2; })
					.attr("y", function(d) { return headerHeight / 2 + 4; })
					.style("font-size", headerHeight / 3 * 2 + "px")
					.attr("text-anchor", "middle")
					.text(function(d) { return d.name; })
					.style("opacity", 0);

		 // update transition
		 barCells//.transition().duration(transitionDuration)
					.attr("transform", function(d) {
						 return "translate(" + d.x + "," + d.y + ")";
					})
					.selectAll("rect")
					.attr("width", function(d) {
						 return Math.max(0.01, d.dx - 1);
					})
					.attr("height", function(d) {
						 return Math.max(0.01, Math.min(headerHeight, d.dy - 1));
					});
		 barCells//.transition().delay(transitionDuration)
					.selectAll('text')
					.style("opacity", function(d) {
					  d.w = this.getComputedTextLength();
					  return d.dx > d.w && headerHeight < d.dy - 1 ? 1 : 0;
					})
					.style("visibility", function(d) {
					  d.w = this.getComputedTextLength();
					  return d.dx > d.w && headerHeight < d.dy - 1 ? "visible" : "hidden";
					});

		 //create programs for sponsor treemap
		 if(myData.name == "Sponsors") {
			var parentCells2 = treemapsvg.selectAll("g.cell.parent.parent2")
					  .data(parents2)
					  .enter().append("g")
					  .attr("class", "cell parent parent2")
					  // .on("click", function(d) {
						 // zoom(node === d ? root : d, myWidth, myHeight, treemapsvg);
					  // });
			parentCells2.append("rect")
					  .style("opacity", 0);/*
					  .style("fill", function(d) { return colorTreemap(d.name); });*/

			// update transition
			parentCells2//.transition().duration(transitionDuration)
					  .attr("transform", function(d) {
							return "translate(" + d.x + "," + d.y + ")";
					  });

			// create bar cells
			var barCells2 = treemapsvg.selectAll("g.cell.labelbar.labelbar2")
					  .data(parents2)
					  .enter().append("g")
					  .attr("class", "cell labelbar labelbar2")
					  .on("click", function(d) {
						
						//resetting
						d3.selectAll(".cell.child.highlighted").attr("class", "cell child");
						d3.selectAll(".cell.labelbar.highlighted").attr("class", "cell labelbar");
						d3.selectAll(".cell.labelbar.labelbar2.highlighted").attr("class", "cell labelbar labelbar2");
						//set the highlighted one
						d3.select(this).attr("class","cell labelbar labelbar2 highlighted");
						// call the related function to highlight related grants
						sponsorProgramClick(this)
						})
					  .on("dblclick", function(d) {
							if (node === d){
								if(myData.name == "Sponsors") {
									rightNode=d.parent.parent;
								}else{
									leftNode=d.parent.parent;
								}
								zoom(d.parent.parent, myWidth, myHeight, treemapsvg);
								node = d.parent.parent;
							}else{
								if(myData.name == "Sponsors") {
									rightNode=d;
								}else{
									leftNode=d;
								}
								zoom(d, myWidth, myHeight, treemapsvg);
								node = d;
							}
						});
			barCells2.append("rect")
					  .classed("background", true)
					  .style("fill", headerColor2);
			barCells2.append("text")
					  .attr("class", "celllabel")
					  .attr("x", function(d) { return d.dx / 2; })
					  .attr("y", function(d) { return headerHeight / 2 + 4; })
					  .style("font-size", headerHeight / 3 * 2 + "px")
					  .attr("text-anchor", "middle")
					  .text(function(d) { return d.name; })
					  .style("opacity", 0);

			// update transition
			barCells2//.transition().duration(transitionDuration)
					  .attr("transform", function(d) {
							return "translate(" + d.x + "," + d.y + ")";
					  })
					  .selectAll("rect")
					  .attr("width", function(d) {
							return Math.max(0.01, d.dx - 1);
					  })
					  .attr("height", function(d) {
							return Math.max(0.01, Math.min(headerHeight, d.dy - 1));
					  });
			barCells2//.transition().delay(transitionDuration)
					  .selectAll('text')
					  .style("opacity", function(d) {
						 d.w = this.getComputedTextLength();
						 return d.dx > d.w && headerHeight < d.dy - 1 ? 1 : 0;
					  })
					  .style("visibility", function(d) {
						 d.w = this.getComputedTextLength();
						 return d.dx > d.w && headerHeight < d.dy - 1 ? "visible" : "hidden";
					  });
		 }

		treemap_constructed = true;
	 }//end buildTreemap
	
	function refreshTreemaps(){
		refreshTreemap(departmentData, grant_sponsors, leftTreemapsvg, leftTreemap ,leftWidth , leftHeight);
		refreshTreemap(sponsorData, grant_sponsors, rightTreemapsvg, rightTreemap, rightWidth , rightHeight);
	}
	
	function refreshTreemap(myData ,grant_sponsors , treemapsvg , treemap , myWidth, myHeight ){
		
	
		//recalculate the layout
		var nodes = treemap.nodes(myData);

		var children = nodes.filter(function(d) {
        return !d.children;
		});

		if($('#arrangetreemap').val() == "department") {
			var parents = nodes.filter(function(d) {
				 return d.children;
			});
		} else {
			var parents = nodes.filter(function(d) {
				 return d.depth < 2; //sponsors
			});
			var parents2 = nodes.filter(function(d) {
				 return d.depth == 2; //programs
			})
		}

		treemapsvg.selectAll("g.cell.child")
					.data(children)
					//.transition().duration(transitionDuration)
					.call(function(d, i) {
					  this.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
					  
					  this.selectAll("rect")
							.attr("width", function(d) { return Math.max(0.01, d.dx - 1); })
							.attr("height", function(d) { return Math.max(0.01, d.dy - 1); });
						 
					  this.selectAll("text")
						 .attr("x", function(d) { return d.dx / 2; })
						 .attr("y", function(d) { return d.dy / 2; });
					});

		treemapsvg.selectAll("g.cell.parent")
					.filter(function(d) {
					  return d3.select(this).attr("class") == "cell parent";
					})
					.data(parents)
					.transition().duration(transitionDuration)
					.call(function(d, i) {
					  this.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
					  
					  this.selectAll("rect")
						 .attr("width", function(d) { return parseInt(d3.select(this).attr("width")) ? Math.max(0.01, d.dx - 1) : 0; })
						 .attr("height", function(d) { return parseInt(d3.select(this).attr("width")) ? Math.max(0.01, d.dy - 1) : 0; })
					});

		treemapsvg.selectAll("g.cell.labelbar")
					.filter(function(d) {
					  return d3.select(this).attr("class") == "cell labelbar";
					})
					.data(parents)
					.transition().duration(transitionDuration)
					.call(function(d, i) {
					  this.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
					  
					  this.selectAll("rect")
						 .attr("width", function(d) { return Math.max(0.01, d.dx - 1); })
						 .attr("height", function(d) { return Math.max(0.01, Math.min(headerHeight, d.dy - 1)); });
						 
					  this.selectAll("text")
						 .attr("x", function(d) { return d.dx / 2; })
						 .attr("y", function(d) { return headerHeight / 2 + 4; });
					});

		if( myData.name == "Sponsors") {
			treemapsvg.selectAll("g.cell.labelbar.labelbar2")
					  .data(parents2)
					  .transition().duration(transitionDuration)
					  .call(function(d, i) {
						 this.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
						 
						 this.selectAll("rect")
							.attr("width", function(d) { return Math.max(0.01, d.dx - 1); })
							.attr("height", function(d) { return Math.max(0.01, Math.min(headerHeight, d.dy - 1)); });
							
						 this.selectAll("text")
							.attr("x", function(d) { return d.dx / 2; })
							.attr("y", function(d) { return headerHeight / 2 + 4; });
					  });
		}

		treemapsvg.selectAll("g.cell.labelbar")
					.transition().delay(transitionDuration)
					.call(function(d, i) {
					  this.selectAll("text")
						 .style("opacity", function(d) {
							d.w = this.getComputedTextLength();
							return d.dx > d.w && headerHeight < d.dy - 1 ? 1 : 0;
						 })
						 .style("visibility", function(d) {
							d.w = this.getComputedTextLength();
							return d.dx > d.w && headerHeight < d.dy - 1 ? "visible" : "hidden";
						 });
					});

		
		
		if(myData.name == "Sponsors") {
			if (rightNode!=myData){
				zoom(rightNode, myWidth, myHeight, treemapsvg);
			}
		}else{
			if (leftNode!=myData){
				zoom(leftNode, myWidth, myHeight, treemapsvg);
			}
		}
		
		
	}// end refreshTreemap
	
	// helper functions 
	
	// check for filters
	function treemapValueAccessor(d) {
    var req = d.RequestAmt;
    req = req.replace(/^\s+|\s+$/g, ''); //remove whitespaces
    req = req.replace(/\$/g,""); //remove dollar sign
    req = req.replace(/,/g,""); //remove commas
    req = parseFloat(req);  //convert from string to float and return
	
    //status filter 
    switch(d.AwardStatus) {
      case "Accepted":
			if(!boolFilterAccepted){
				return 0;
			}
        break;
      case "Closed":
			if(!boolFilterClosed){
				return 0;
			}
			break;
      case "":
        if(d.ProposalStatus == "Declined"){
				if(!boolFilterDeclined){
					return 0;
				}
			}else{ //others including Withdrawn, Inst. Approved, Pending Approval, Draft
				if(!boolFilterOthers){
					return 0;
				}
			}
			break;
      default:
        return 0;
    }
	 

    //year filter
    if(d.AwardStatus == "Accepted" || d.AwardStatus == "Closed") {
      var beginYear = $( "#yearSlider" ).slider("option", "values")[0];
      var endYear = $( "#yearSlider" ).slider("option", "values")[1];
      var begin = parseInt(d.BeginDate.substring(0, 4));
      var end = parseInt(d.EndDate.substring(0, 4));
      if(begin < beginYear || end > endYear){
			req = 0;
		}
    }
    
    return req;
	}
	
	// helper function
	function topSponsors(topNum, grantSponsors, all_grants) {
    var temp = _.extend({}, grantSponsors);
    temp = _.invert(temp);

    $.each(temp, function(k, v) {
      temp[k] = 0;
    })

    all_grants.forEach(function(grant) {
      //get top 'num' according to requestamt
      var req = grant.RequestAmt;
        req = req.replace(/^\s+|\s+$/g, ''); //remove whitespaces
        req = req.replace(/\$/g,""); //remove dollar sign
        req = req.replace(/,/g,""); //remove commas
        req = parseFloat(req); //convert from string to float 

      temp[grant.Sponsor] += req;
    });

    var temp2 = [];
    $.each(temp, function(k,v){
      temp2.push([k,v]);
    });
    temp2.sort(function(a, b) {return a[1] - b[1]});

    var sliced = temp2.slice(temp2.length - topNum);
    var finallist = [];

    sliced.forEach(function(element){
      finallist.push(element[0]);
    });

    return finallist;
  }
	
	// zoom on user click
	function zoom(d, width, height, treemapsvg) {
    // treemap
    //         .padding([headerHeight/(height/d.dy), 0, 0, 0])
    //         .nodes(d);

    // moving the next two lines above treemap layout messes up padding of zoom result
    
	 var xscale = d3.scale.linear().range([0, width]),
    yscale = d3.scale.linear().range([0, height]);
	 
	 var kx = width  / d.dx;
    var ky = height / Math.max(d.dy, headerHeight + 1);
    //var level = d;

    xscale.domain([d.x, d.x + d.dx]);
    yscale.domain([d.y, d.y + d.dy]);

    // if (node != level) {
    //     //treemapsvg.selectAll(".cell.child .celllabel").style("display", "none");
    //     console.log("hahahhah");
    // }

    var zoomTransition = treemapsvg.selectAll("g.cell")
				.transition().duration(transitionDuration)
            .attr("transform", function(d) {
                return "translate(" + xscale(d.x) + "," + yscale(d.y) + ")";
            })

    zoomTransition.selectAll(".child rect")
            .attr("width", function(d) {
                return Math.max(0.01, (kx * d.dx - 1));
            })
            .attr("height", function(d) {
                return Math.max(0.01, (ky * d.dy - 1));
            });
            
    zoomTransition.selectAll(".labelbar rect")
            .attr("width", function(d) {
                return Math.max(0.01, (kx * d.dx - 1));
            })
            .attr("height", function(d) {
                return ky * Math.max(0.01, Math.min(headerHeight, d.dy - 1));
            });
    //if the parent rect has no width&height in this fragmentation, keep it
    zoomTransition.selectAll(".parent rect")
            .attr("width", function(d) {
                return parseInt(d3.select(this).attr("width")) ? Math.max(0.01, (kx * d.dx - 1)) : 0;
            })
            .attr("height", function(d) {
                return parseInt(d3.select(this).attr("height")) ? Math.max(0.01, (ky * d.dy - 1)) : 0;
            });

    zoomTransition.select("text")
            .attr("x", function(d) { return kx * d.dx / 2; })
            .attr("y", function(d) { return (ky * Math.max(0.01, Math.min(headerHeight, d.dy - 1)) - 1) / 2 + 4; })
            .style("opacity", function(d) {
              d.w = this.getComputedTextLength();
              return Math.max(0.01, (kx * d.dx - 1)) > d.w && headerHeight < d.dy - 1 ? 1 : 0;
            })
            .style("visibility", function(d) {
              d.w = this.getComputedTextLength();
              return Math.max(0.01, (kx * d.dx - 1)) > d.w && headerHeight < d.dy - 1 ? "visible" : "hidden";
            });

    //node = d;

    if (d3.event) {
        d3.event.stopPropagation();
    }
	}
		
	// grants highliter functions
	function departmentGrantClick(myGrant){
		
		var temp1 = d3.select("#rightTreemap").selectAll(".cell.child");
		
		for ( var i=0;i< temp1[0].length ; i++){
			if (temp1[0][i].__data__.Proposal == myGrant.__data__.Proposal){
				temp1[0][i].setAttribute("class", "cell child highlighted");
			}
		}
	
	}
	function sponsorGrantClick(myGrant){
		
		var temp1 = d3.select("#leftTreemap").selectAll(".cell.child");
		
		for ( var i=0;i< temp1[0].length ; i++){
			if (temp1[0][i].__data__.Proposal == myGrant.__data__.Proposal){
				temp1[0][i].setAttribute("class", "cell child highlighted");
			}
		}
	
	}
	function departmentDepartmentClick(myDepartment){
		var temp1 = d3.select("#rightTreemap").selectAll(".cell.child");
		for ( var i=0;i< temp1[0].length ; i++){
			if (temp1[0][i].__data__.Department == myDepartment.__data__.name){
				temp1[0][i].setAttribute("class", "cell child highlighted");
			}
		}
	}
	function sponsorSponsorClick(mySponsor){
		var temp1 = d3.select("#leftTreemap").selectAll(".cell.child");
		for ( var i=0;i< temp1[0].length ; i++){
			if (temp1[0][i].__data__.Sponsor == mySponsor.__data__.name){
				temp1[0][i].setAttribute("class", "cell child highlighted");
			}
		}
	}
	function sponsorProgramClick(myProgram){
		var temp1 = d3.select("#leftTreemap").selectAll(".cell.child");
		for ( var i=0;i< temp1[0].length ; i++){
			if (temp1[0][i].__data__.PgmName == myProgram.__data__.name){
				temp1[0][i].setAttribute("class", "cell child highlighted");
			}
		}
	}
		
}()); // end of GRANTPUB