/*
Copyright (c) 2013 Paul Parsons

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR 
PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE 
FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, 
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE 
SOFTWARE.
*/

var PUBLICATIONS_MAP = (function () { //pass globals as parameters to import them into the function
	

	/////////////////////////////////////////////////////////////////////
	//
	//				GLOBAL (MODULE-LEVEL) VARIABLE DECLARATIONS
	//
	////////////////////////////////////////////////////////////////////
	var links_for_network;
	var science_faculty_data;
	var science_departments;
	var pub_years_uniq;
	var animatebegin = 2008; //TODO: set to min year by default
	var animateend = 2013; //TODO: set to max year by default
	var brush; //for the polybrush
	var individualSelect = false; //flag to be used in 'tick' function for selecting individual nodes
	var selectedNodes = []; //array of objects that the user has selected
	var selectedLinks = []; //array of links that between the objects use has selected
	var dataset;
	var pubdata;
	var departments = [];
	var names = [];
	var ranks = [];
	var years = [];
	var contractTypes = [];
	var namesUnique = [];
	var contractTypesUnique = [];
	var departmentCounts = new Object();
	var rankCounts = new Object();
	var contractTypesCounts = new Object();
	var departmentsHighestCount;
	var dcounts = []; //1D array for the department counts
	var rcounts = []; //1D array for the rank counts
	var ctcounts = [];
	var males = 0;
	var females = 0;
	var genderDistribution = new Object();
	var autharr_surnames = [];
	var pubdata_filtered;
	var count1 = 0;
	var count2 = 0;
	//var pubs_science = [];
	//var links_science = []; //containing links where at least one node (author) is a member of the faculty of science
	//var links_science_exclusive = []; //containing links where every node (author) is a member of the faculty of science
	//var links_science_exclusive_unique = []; //containing links where every node (author) is a member of the faculty of science where duplicates are removed
	//var links_for_network = []; //this is a copy of links_science_exclusive_unique. A copy is needed because without one links_science_exclusive_unique will be modified while constructing the network
	var links_grants = [];
	var network_constructed = false;
	var matrix_constructed = false;
	var currentlySearchingMatrix = false;
	var bartransduration = 1000;
	var hinttranslatecount = 0; //keep track of number of times actionhinttranslate displayed


	var envandsusCluster = ["Bernards,Mark A", "Branfireun,Brian Andrew", "Creed,Irena F.", "Cumming,Robert", 
	"Damjanovski,Sashko", "Grbic,Miodrag", "Grbic,Vojislava", "Guglielmo,Christopher G.", "Henry,Hugh A.L.", 
	"Hill,Kathleen A.", "Huner,Norman P A", "Karagiannis,Jim", "Kelly,Gregory M", "Keyghobadi,Nusha", "Kohalmi,Susanne E.", 
	"Lachance,Marc-Andre", "Lindo,Zoe", "MacDougall Shackleton,Elizabeth", "Macfie,Sheila M.", "Maxwell,Denis P", 
	"McNeil,Jeremy", "Milligan,Louise", "Moehring,Amanda Jean", "Morbey,Yolanda", "Murphy,Brenda Carol", 
	"Neff,Bryan David Tyson", "Percival-Smith,Anthony", "Rubin,Benjamin", "Sinclair,Brent J", "Singh,Shiva M", 
	"Staples,James Francis", "Taylor,Graeme", "Thompson,Graham", "Thorn,Richard G.", "Timoshenko,Alexander", 
	"Trick,Charles G", "Way,Danielle A", "Zanette,Liana"];

	var chord_constructed = false;
	 
	// scales for the different node sizings
  	var scale_grants = d3.scale.linear().domain([0,450]).range([3,150]);
  	var scale_copubs = d3.scale.linear().domain([0,50]).range([3,150]);
  	var scale_cosups = d3.scale.linear().domain([0,15]).range([3,150]);
  	var scale_combined = d3.scale.linear().domain([0,450]).range([3,150]);

	var dragging = false; //set to true when the user is dragging an element in the network


	  var nodeTooltip = d3.select("#networkviz").append("div")   
    	.attr("class", "nodeTooltip")               
    	.style("opacity", 0);

	//
	//Matrix variables
	//

	var margin = {top: 0, right: 0, bottom: 10, left: 180},
	    matrix_margin = {top: 100, right: 0, bottom: 10, left: 100},
	    width = 350,
	    height = 250,
	    matrix_height = 1800,
	    matrix_width = 1800;

	var matrix_x = d3.scale.ordinal().rangeBands([0, matrix_width]),
	    matrix_z = d3.scale.linear().range([0.2,1]).clamp(true), //for calculating the opacity of the cells...21 is hardcoded in for now
	    matrix_c = d3.scale.category10().domain(d3.range(10));

	var matrixsvg = d3.select("#matrixviz").append("svg:svg")
	    .attr("width", $('#vizcontainer').width())
	    .attr("height", $('#vizcontainer').height())    
	  .append("svg:g")
	    //to make it fit on the screen properly
	    .attr("transform", "scale(0.5)")
	    .call(d3.behavior.zoom().on("zoom", redrawMatrix))
	  .append("svg:g")
	      .attr("transform", "translate(175, 175)");

	var matrixdepartmentlegend = d3.select("#matrixdepartmentlegend"); //where the matrix legend will go
	var matrix = [], matrixnodes;

	//vars to hold the max of each type of collaboration
	var max_copub = 0;
	var max_cosup = 0;
	var max_grant = 0;

	//
	//Network variables
	//

	//get the width and height of the div containing the svg--this way the dimensions are specified dynamically
	var svgwidth = $('#vizcontainer').width();
	var svgheight = $('#vizcontainer').height();

	var networkzoom = d3.behavior.zoom()
		.scaleExtent([0.1, 30])
		.on("zoom", redrawNetwork);

	var networkDrag = d3.behavior.drag()
        .on("drag", function() { 
        	d3.select(this).attr("cursor", "move"); 
        	networksvg.attr("x", d3.event.x).attr("y", d3.event.y); } )
        .on("dragend", function() {
        	d3.select(this).attr("cursor", "default");   
        });	

	var networksvg = d3.select("#networkviz").append("svg:svg").attr("width", svgwidth).attr("height", svgheight)
	    .append('svg:g')
	    .attr("pointer-events", "all")
	   .append('svg:g')
	    .call(networkzoom)
	    .on("dblclick.zoom", null)
	    //the svg is naturally draggable
	    //.call(networkDrag)
	    //.call(d3.behavior.drag().on("drag", pan))
	   .append('svg:g')
	   	  /*.on("dblclick", function() {
	   	  	d3.select('#networkviz').append('div')
	   	  		.style('position', 'absolute')
	   	  		.style('left', d3.event.x + 'px')
	   	  		.style('top', d3.event.y + 'px')
	   	  		.style('background-color', 'yellow')
	   	  		.text('-');
	   	  	d3.event.stopPropagation();
	   	  })*/;
/*	$('#networkviz').on("dblclick", function(e) {
		var x = e.offsetX;
		var y = e.offsetY + $('#networkbar').height() + $('#networkdepartmentlegend').height();
		var note = d3.select('#networkviz').append('div')
   	  		.style('position', 'absolute')
   	  		.style('left', x + "px")
   	  		.style('top', y + "px")
   	  		.style('background-color', 'yellow')
   	  		.text('--');
   	  	e.stopPropagation();
/*
   	  	var range = document.createRange();
        range.selectNode(note[0][0]);
        window.getSelection().addRange(range);
	});*/

	//$('#networkviz').annotator();

	var cloningWidth = 280;
	var cloningHeight = 250;

	//zoom behavior
	var cloningZoom = d3.behavior.zoom()
		.scaleExtent([0.5, 5])
		.on("zoom", function() {
			trans=d3.event.translate;
				scale=d3.event.scale;

			cloningSvg.attr("transform",
			    "translate(" + trans + ")"
			    + " scale(" + scale + ")");
		});

	//drag behavior
	var cloningDrag = d3.behavior.drag()
    .on("drag", function() { 
    	d3.select(this).attr("cursor", "move");
    	networksvg.attr("x", d3.event.x).attr("y", d3.event.y); } )
    .on("dragend", function() {
    	d3.select(this).attr("cursor", "default");       
    });

	var cloningSvg = d3.select('#cloningArea')
		.append('svg:svg')
		.attr('width', cloningWidth)
		.attr('height', cloningHeight)
		.append('svg:g')
	    .attr("pointer-events", "all")
		.append('svg:g')
		.call(cloningZoom)
		.on("dblclick.zoom", null)
		//.call(cloningDrag)
		.append('svg:g');

	//this is a rectangle that goes "behind" the visualization. Because there is no drag behavior attached to it (in contrast to the nodes of the network), it allows the visualization
	//to be panned
	var networksvgbackground = networksvg.append("svg:rect").attr("width", svgwidth).attr("height", svgheight)
		.style("fill", "none").style("opacity", 0);
		//.style("fill", "aliceblue").style("opacity", 1);

	  //this will be used to calculate the positions of the nodes when rearranged
	var  circleOutline = networksvg.append("svg:circle").attr("cx", svgwidth/2).attr("cy", svgheight/2).attr("r", svgwidth/3).style("stroke", "gray").style("stroke-width", "1px").style("fill", "none").style("opacity", 0);


	// var department_centers = [];//REMOVE?
	var normal_center = { y: svgheight/2, x: svgwidth/2 };

	//default values for the network
	var dcharge = -100;
	var dlinkDistance = 70;
	var dgravity = 0.05;
	var dfriction = 0.9;
	var dlinkStrength = 0;

	//consructs the new force-directed layout
	var network_force = d3.layout.force().size([svgwidth,svgheight]);

	var networkdepartmentlegend = d3.select("#networkdepartmentlegend"); //where the network legend will go

	var node;
	var link;
	var deptCircle;
	var deptCircles = []; //contains information about the circles used for departments


	//var color10 = d3.scale.ordinal().range(["#00ffff", "#ff9900", "#0100b3", "#9c9284", "#ffff4e", "#ff0000", "#333333", "#ff00ff", "#41924B", "#cc0000"]);

	//var color10 = d3.scale.category10();


	//this list of 20 colors is calculated such that they are optimally disctinct. See http://tools.medialab.sciences-po.fr/iwanthue/
	var color20 = d3.scale.ordinal().range(["#D24B32","#73D74B","#7971D9","#75CCC1","#4F2A3F","#CA4477","#C78D38","#5D8737","#75A0D2","#C08074","#CD50CC","#D0D248","#CA8BC2","#BFC98D","#516875","#434E2F","#66D593","#713521","#644182","#C9C0C3"]);

	var science_faculty_members = [];
	var science_faculty_members_unique = [];
	//var science_faculty_data;	

	var int1; //animate interval timer

	/////////////////////////////////////////////////////////////////////
	//
	//								JQUERY
	//
	////////////////////////////////////////////////////////////////////


	$('#matrixviz').tooltip({
	  items: "rect, text",
	  content: function() {
	    var element = $( this );
	    if ( element.is( "rect" ) ) {
	      var text = element.text();
	      return text;
	    }
	    if ( element.is( "text" ) ) {
	      var text = element.text();
	      return text;
	    }
	  }
	});

	$(document).ready(function() {

	  //for icheckbox
	  $('input').iCheck({
	    checkboxClass: 'icheckbox_square-blue',
	    radioClass: 'iradio_square-blue',
	    //increaseArea: '10%' // optional
	  });

	  //for the sliding divs in the action panel
	  //gets every div that is a child of networkactions and hides it
	  $('#networkactions:eq(0)> div').hide();

	  //bind a click handler to each action (i.e., each h3)
	  $('#networkactions:eq(0)> h3').click(function() { 
	    $(this).next().next().slideToggle('fast');
	   });

	  //for the sliding divs in the action panel
	  //gets every div that is a child of networkactions and hides it
	  $('#matrixactions:eq(0)> div').hide();

	  //bind a click handler to each action (i.e., each h3)
	  $('#matrixactions:eq(0)> h3').click(function() { 
	    $(this).next().next().slideToggle('fast');
	   });

	  //start with the actions hidden
	  $('#networkactions').hide();
	  $('#matrixactions').hide();

	  //for the initial popup choice
	  $('#matrixchoice').click(function() {
	    $.colorbox.close()
	    $('#matrixviz').show();
	    constructMatrix();
	  });
	  $('#networkchoice').click(function() {
	    $.colorbox.close()
	    $('#networkviz').show();
	    constructNetwork();
	  });

	  //adjust the formatting of the filtering options for the matrix
	  $('input#matrixFilterOR').parent().css("display", "inline-block").css("margin", "0% 25% 0% 15%");
	  $('input#matrixFilterAND').parent().css("display", "inline-block").css("margin", "0% 15% 0% 25%");
	  $('input#matrixFilterEXCLUSIVE').parent().css("display", "inline-block").css("margin", "0% 15% 0% 25%");
	  $('input#matrixFilterINCLUSIVE').parent().css("display", "inline-block").css("margin", "0% 25% 0% 15%");	

	  $('#matrixcollaborationlegend').draggable({ containment: "#vizcontainer", scroll: false });  
	  $('#matrixcollaborationlegend').hide();
	  $('#matrixdepartmentlegendtoggle').hide();

	  $('#networkdepartmentlegendtoggle').hide();

		//hide the selectionArea div
		$('#selectionArea').hide();
		$('#selectionArea').draggable({ containment: "#vizcontainer", scroll: false });

		$('#cloningArea').hide();
		$('#cloningArea').draggable({ containment: "#vizcontainer", scroll: false, handle: "h2" });

		$('#gatheringArea').hide();
		$('#gatheringArea').draggable({ containment: "#vizcontainer", scroll: false, drag: function() { network_force.start(); } });

		$('#comparingArea').hide();
		//$('#comparingArea').draggable({ containment: "#vizcontainer", scroll: false });
		//$('#comparingArea a').click(function() { $('#comparingArea svg').remove(); $('#comparingArea').hide('slow'); });

		$('#detailLineArea').hide('slow');
		$('#detailLineArea').draggable({ containment: "#vizcontainer", scroll: false });
		$('#detailLineArea a').click(function() { $('#detailLineArea svg').remove(); $('#detailLineArea').hide('slow'); });

		$('#animateYearPlaceholder').hide();

/*		$( "#gatheringArea" ).droppable({
      		accept: "#selectionArea",
      		activeClass: "ui-state-hover",
      		hoverClass: "ui-state-active",
      		drop: function( event, ui ) {
      			console.log("yup, in here");
        		$( this )
          		.addClass( "ui-state-highlight" )
          		.find( "p" )
            	.html( "Dropped!" );
     		}
    	});*/
		
		//to make sure that gatheringArea div can be dragged and nodes can be dragged out at the same time
		$('#gatheringArea').css("background", "transparent").css("pointer-events", "none");
		$('#gatheringArea h2').css("pointer-events", "auto");
		$('gatheringArea h2')
			.on("mouseover", function() { $('#gatheringArea').css("pointer-events", "auto"); })
			.on("mouseout", function() { $('#gatheringArea').css("pointer-events", "none")});

	  //to populate the search bar
	  if(store.session.has("science_names")){
	    console.log("science_names is already in sessionStorage...no need to fetch again");
	  }
	  else {
	    console.log("fetching science_names...");
	    $.get('/network/science_names', function(result) {
	      var science_names = JSON.parse(result.science_names);
	      store.session("science_names", science_names);
	    });
	  }

	  //populate the autocomplete search box with the science members
	  //for the network
	  $( "#tags" ).autocomplete({
	    source: store.session("science_names"),
	    delay: 500,
	    minLength: 2,
	    select: function (event, ui) {
	      var name = ui.item.value;
	      highlightSelectedNode(name);
	    }
	  });
	  //and for the matrix
	  $( "#matrixsearch" ).autocomplete({
	    source: store.session("science_names"),
	    delay: 500,
	    minLength: 2,
	    select: function (event, ui) {
	    	$('#matrixdepartmentlegend').slideUp();
	    	currentlySearchingMatrix = true;
	      	var name = ui.item.value;
	      	highlightSelectedRow(name);
	    }
	  });	  

	  $('input#filterNodesAll').iCheck('check');
	  $('input#selectNone').iCheck('check');

	  $('#selectionArea').hide();

	  $('input#scopeYear').val( $("#scopeSlider").slider("value") );

	  //listen to the zoom buttons 
	  $('#networkzoomin').click(function() {
	    console.log("uip");
	      networkzoom.scale(networkzoom.scale()+0.1);
	      networksvg.transition().duration(1000).attr('transform', 'translate(' + networkzoom.translate() + ') scale(' + networkzoom.scale() + ')');
	  });
	  $('#networkzoomout').click(function() {
	      networkzoom.scale(networkzoom.scale()-0.1);
	      networksvg.transition().duration(1000).attr('transform', 'translate(' + networkzoom.translate() + ') scale(' + networkzoom.scale() + ')');
	  });

	});//end document.ready

	$( "#networkyearrange" ).slider({
	  range: true,
	  min: 2008,
	  max: 2013,
	  animate: true,
	  values: [ 2008, 2013 ],
	  slide: function( event, ui ) {
	    $( "#networkyear" ).val( ui.values[ 0 ] + " - " + ui.values[ 1 ] );

	  d3.selectAll("line.link").filter(function(d) { return d.type == "publication"; }).each( function () {
	    if (ui.values[0] <= this.__data__.year && this.__data__.year <= ui.values[1] ) {
	        d3.select(this).style("visibility", "visible").style("opacity", 1);
	    }
	    else {
	        d3.select(this).style("opacity", 0).style("visibility", "hidden");        
	    }
	  });

	  //if the user has specified that nodes w/o links should be hidden
	  if ($('input#filterNodesLinks').is(':checked')){
	    d3.selectAll("circle.node").each( function () {
	    var that = this;//because of the nested loop
	      var match = false;
	      d3.selectAll("line.link").each( function() {
	          if (((this["x1"].animVal.value == that["cx"].animVal.value && this["y1"].animVal.value == that["cy"].animVal.value && this.style.visibility == "visible") || (this["x2"].animVal.value == that["cx"].animVal.value && this["y2"].animVal.value == that["cy"].animVal.value && this.style.visibility == "visible"))){ //if there is a visible link to the current node set the boolean flag to true
	           match = true;
	         }
	      }); 
	      if (match == false){
	        //make the node invisible
	        d3.select(this).transition().duration(1500).style("opacity", 0);//.attr("r", 0);
	        d3.select(this).transition().delay(1500).style("visibility", "hidden");
	      }
	      else {
	        //if the current node is currently hidden
	        if (this.style.visibility == "hidden"){
	          //set it to visible, but with an opacity of 0 so that it can be gradually faded in
	          d3.select(this).style("visibility", "visible").style("opacity", 0);
	          d3.select(this).transition().duration(1500).style("opacity", 1);//.attr("r", 10);
	        }
	      }
	    });
	  }


	  }
	});
	$( "#networkyear" ).val( $( "#networkyearrange" ).slider( "values", 0 ) +
	  " - " + $( "#networkyearrange" ).slider( "values", 1 ) );

	$( "#animateyearrange" ).slider({
	  range: true,
	  min: 2008,
	  max: 2013,
	  animate: true,
	  values: [ 2008, 2013 ],
	  slide: function( event, ui ) {
	    $( "#animateyear" ).val( ui.values[ 0 ] + " - " + ui.values[ 1 ] );
	    animatebegin = ui.values[0];
	    animateend = ui.values[1];
	  }
	});
	$( "#animateyear" ).val( $( "#animateyearrange" ).slider( "values", 0 ) +
	  " - " + $( "#animateyearrange" ).slider( "values", 1 ) );


	$("#animateSlider").slider({
	  min: 2008,
	  max: 2013,
	  animate: true,
	  value: 2013,
	  slide: function( event, ui ) {
	  yearSelected = ui.value;
	  $( "#animateSliderYear" ).val( ui.value );

	  d3.selectAll("line.link").each( function () {
	    if (this.__data__.year != undefined && yearSelected < this.__data__.year ) {
	      d3.select(this).transition().duration(1000).style("opacity", 0);
	      d3.select(this).transition().delay(1000).style("visibility", "hidden");
	    }
	    else {
	      //only want to set opacity to 0 and then fade it in if it is not currently visible
	      if (this.style.visibility == "hidden"){
	        if ($('input#filterCo_pubs').is(':checked') && this.__data__.type != "supervision"){
	          d3.select(this).style("visibility", "visible").style("opacity", 0);
	          d3.select(this).transition().duration(1000).style("opacity", 1);
	        }
	        //if the user doesn't want to see co-supervision links
	        else if($('input#filterCo_sups').is(':checked') && this.__data__.type == "supervision"){
	          d3.select(this).style("visibility", "visible").style("opacity", 0);
	          d3.select(this).transition().duration(1000).style("opacity", 1);
	        }
	      }
	    }
	  });
	}
	});

	$( "#animateSliderYear" ).val( $( "#animateyearrange" ).slider( "values", 1 ));

	$("#scopeSlider").slider({
	  min: 2008,
	  max: 2013,
	  value: 2013,
	  animate: true,
	  range: "min",
	  slide: function( event, ui ) {
	  yearSelected = ui.value;
	  $( "#scopeYear" ).val( ui.value );

	  d3.selectAll("line.link").each( function () {
	    if (yearSelected < this.__data__.year ) {
	      d3.select(this).style("opacity", 0);
	      d3.select(this).style("visibility", "hidden");
	    }
	    else {
	      //only want to set opacity to 0 and then fade it in if it is not currently visible
	      if (this.style.visibility == "hidden"){
	        if ($('input#filterCo_sups').is(':checked')){
	          d3.select(this).style("visibility", "visible").style("opacity", 0);
	          d3.select(this).style("opacity", 1);
	        }
	        //if the user doesn't want to see co-supervision links
	        else {
	          if(this.__data__.type != "supervision"){
	            d3.select(this).style("visibility", "visible").style("opacity", 0);
	            d3.select(this).style("opacity", 1);
	          }
	        }
	      }
	    }
	  });	  	  

	  $('input#freezeNodes').iCheck('uncheck');

	  //if the user wants to include the nodes in the scoping
	  if($('#scopeNodes').is(':checked')) {
	    d3.selectAll("circle.node").each( function () {
	    var that = this;//because of the nested loop
	      var match = false;
	      //compare each line (link) to the current node. if their coordinates match (i.e., the link is a connection to the node) and the link is currently visible (i.e., it has not been hidden during the scoping)
	      //then set the match boolean to true
	      //don't forget to delay 500ms 
	      d3.selectAll("line.link").each( function() {
	          if (((this["x1"].animVal.value == that["cx"].animVal.value && this["y1"].animVal.value == that["cy"].animVal.value && this.style.visibility == "visible") || (this["x2"].animVal.value == that["cx"].animVal.value && this["y2"].animVal.value == that["cy"].animVal.value && this.style.visibility == "visible"))){ //if there is a link to the current node set the boolean flag to true
	           match = true;
	         }
	      });

	      if (match == false){
	        //only want to set opacity to 0 and then fade it in if it is not currently visible
	        if (this.style.visibility == "visible"){        
	          d3.select(this).style("opacity", 0);
	          d3.select(this).style("visibility", "hidden");
	        } 

	      }
	      else {
	        d3.select(this).style("visibility", "visible").style("opacity", 1);
	        // d3.select(this).transition().duration(2000).style("opacity", 1);
	      }
	    });
	  }
	  else
	    d3.selectAll("circle.node").style("visibility", function () { return "visible"; }); 
	  }
	});

	$('#networkDensitySlider').slider({
		min: 0,
		max: 1,
		range: "min",
		step: 0.01,
		animate: true,
		value: dgravity,
		slide: function( event, ui ) {
			$('#networkDensity').val( ui.value );
			network_force.gravity(ui.value).start();
		}
	});

	$('#networkChargeSlider').slider({
		min: -300,
		max: 200,
		range: "min",
		step: 10,
		animate: true,		
		value: dcharge,
		slide: function( event, ui ) {
			$('#networkCharge').val( ui.value );
			network_force.charge(ui.value).start();
		}
	});

	$('#networkFrictionSlider').slider({
		min: 0,
		max: 1,
		range: "min",
		step: 0.01,
		animate: true,
		value: dfriction,
		slide: function( event, ui ) {
			$('#networkFriction').val( ui.value );
			network_force.friction(ui.value).start();
		}
	});	

	$('#networkLinkDistanceSlider').slider({
		min: 0,
		max: 100,
		range: "min",
		step: 1,
		animate: true,
		value: dlinkDistance,
		slide: function( event, ui ) {
			$('#networkLinkDistance').val( ui.value );
			network_force.linkDistance(ui.value).start();
		}
	});

	$('#networkLinkStrengthSlider').slider({
		min: 0,
		max: 1,
		range: "min",
		step: 0.01,
		animate: true,
		value: dlinkStrength,
		slide: function( event, ui ) {
			$('#networkLinkStrength').val( ui.value );
			network_force.linkStrength(ui.value).start();
			console.log(network_force.linkStrength())
		}
	});


	//////////////////

	//checkboxes and radios and buttons(?)

	//////////////////
	$('#animateTime').click(function() {
	  var currentYear = animatebegin;
	  //reset the network
	  clearInterval(int1);
	  //override the current transitions with new ones to stop the current transitions
	  d3.selectAll("line.link").style("visibility", "visible").style("opacity", 0).attr("animViz", "true");
	  d3.selectAll("circle.node").style("visibility", "visible");//.attr("r", 10);

	  $('#animateYearPlaceholder').show('slow');
	  function animatePerYear(){
	  	if(currentYear > animateend) {
	        clearInterval(int1);
	        return ;
	    }
	    async.series(
	      [
	        function(callback){
	          $('#animateYearPlaceholder').text(currentYear);
	          var t = d3.selectAll("line.link").each(function(){
	          	//co-supervision links do not have "year" attributes, change their visibility according to filter
	          	if(this.__data__.type == "supervision" || this.__data__.type == "grant") {
	          		if($('input#filterCo_sups').is(':checked')) {
	          			d3.select(this).attr("animViz", "true");
	          			if(currentYear == animatebegin) {
		          			d3.select(this).style("opacity", 1);
				            d3.select(this).style("visibility", "visible");
				        }
				        else {
				        	d3.select(this).style("opacity", 1);
				            d3.select(this).style("visibility", "visible");
				        }
			        }
			        else {
			        	d3.select(this).attr("animViz", "false");
			        	if(currentYear == animatebegin) {
			        		d3.select(this).style("opacity", 0);
				            d3.select(this).style("visibility", "hidden");
				        }
				        else {
				        	d3.select(this).transition().duration(2000).style("opacity", 0);
				            d3.select(this).transition().delay(2000).style("visibility", "hidden");
				        }
			        }
	          	}
	          	else {
	          		//if the link is currently visible and its year does not match currentYear
		            if (this.__data__.year != currentYear){
		            	d3.select(this).attr("animViz", "false");
		            	if(this.style.visibility == "visible") {
		            		//no animation at the start
			            	if(currentYear == animatebegin) {
			            		//changing link color does not look good... 
			            		d3.select(this)/*.style("stroke", "#e6e6e6")*/.style("opacity", 0);
			                	d3.select(this).style("visibility", "hidden");
			            	}
			            	else {
			            		d3.select(this).transition().duration(2000)/*.style("stroke", "#e6e6e6")*/.style("opacity", 0);
				                //d3.select(this).transition().duration(2500).style("opacity", 0);
				                d3.select(this).transition().delay(2000).style("visibility", "hidden");
			            	}
		            	}
		            }
		            else {
		            	if($('input#filterCo_pubs').is(':checked')) {
		            		d3.select(this).attr("animViz", "true");
		            		if(this.style.visibility == "hidden") {
		            			if(currentYear == animatebegin) {
			            			d3.select(this).style("visibility", "visible");
			                		d3.select(this).style("opacity", 1).style("stroke", "gray");
			            		}
			            		else {
			            			d3.select(this).style("visibility", "visible");
			                		d3.select(this).transition().duration(2000).style("opacity", 1).style("stroke", "gray");
			            		}
		            		}
		            	}
		            }
	          	}
	          });
	          callback(null);
	        },

	        function(callback){
	          var t = d3.selectAll("circle.node").each( function () {
	            var that = this;//because of the nested loop
	            var match = false;
	            //animViz is used here to identify matched links
	            d3.selectAll("line.link").each( function() {
	                if (((this["x1"].animVal.value == that["cx"].animVal.value && this["y1"].animVal.value == that["cy"].animVal.value && d3.select(this).attr("animViz") == "true") || (this["x2"].animVal.value == that["cx"].animVal.value && this["y2"].animVal.value == that["cy"].animVal.value && d3.select(this).attr("animViz") == "true"))){ //if there is a visible link to the current node set the boolean flag to true
	                 match = true;
	               }
	            }); 
	            if (match == false){
	              //make the node invisible
	              if(currentYear == animatebegin) {
	              	d3.select(this).style("opacity", 0);//.attr("r", 0);
	                d3.select(this).style("visibility", "hidden");
	              }
	              else {
	              	//d3.select(this).style("stroke", "#e6e6e6");
	                d3.select(this).transition().duration(2500).style("opacity", 0);//.attr("r", 0);
	                d3.select(this).transition().delay(2500).style("visibility", "hidden");
	              }
	            }
	            else {
	              //if the current node is currently hidden
	              if (this.style.visibility == "hidden"){
	                //set it to visible, but with an opacity of 0 so that it can be gradually faded in
	                if(currentYear == animatebegin) {
	                	d3.select(this).style("visibility", "visible").style("opacity", 0);
	                	d3.select(this).style("opacity", 1);//.attr("r", 10);
	                }
	                d3.select(this).style("visibility", "visible").style("opacity", 0);
	                d3.select(this).transition().duration(1000).style("opacity", 1);//.attr("r", 10);
	              }
	            }
	          });
	        callback(2);
	        }
	      ],

	      //callback
	      function(err){
/*	        if(err == 2 && currentYear == animateend){
	          //setTimeout(function(){filterNodesWithoutLinks()}, 3000);
	          //if(currentYear == animateend) {
	          	clearInterval(int1);
	          //}
	        }
	        else 
	          currentYear+=1;  */
	        if(err == 2) {
	        	currentYear++;
	        }
	      }
	    );
	  }
	  animatePerYear();
	  int1 = setInterval(animatePerYear, 4000);
	});

	$('#animateReset').click(function() {
		clearInterval(int1);
		//override the current transitions with new ones to stop the current transitions
		d3.selectAll("line.link").transition().duration(0).delay(0);
		d3.selectAll("line.link")
			.attr("animViz", "true")
		  	.style("opacity", function(d) {
			  	if(d.type != "supervision" || d.type == "supervision" && $('input#filterCo_sups').is(':checked'))
			  		return 1;
			  	else
			  		return 0;
		  	})
		  	.style("visibility", function(d) {
		  		if(d.type != "supervision" || d.type == "supervision" && $('input#filterCo_sups').is(':checked'))
			  		return "visible";
			  	else
			  		return "hidden";
		  	});
		d3.selectAll("circle.node").transition().duration(0).delay(0).style("opacity", 1).style("visibility", "visible");//.attr("r", 10);
		$('#animateYearPlaceholder').hide('slow');
	});

	$('#discardUnlinkedNodes').click(function() {
		d3.selectAll("circle.node").each( function () {
	      var that = this;//because of the nested loop
	      var match = false;
	      d3.selectAll("line.link").each( function() {
	      	if (((this["x1"].animVal.value == that["cx"].animVal.value && this["y1"].animVal.value == that["cy"].animVal.value) || (this["x2"].animVal.value == that["cx"].animVal.value && this["y2"].animVal.value == that["cy"].animVal.value))){ //if there is a link to the current node set the boolean flag to true
	        	match = true;
	        }
	       }); 
	       if (match == false){
	       	d3.select(this).transition().duration(1000).style("opacity", 0).attr("r", 0);
	        d3.select(this).transition().delay(1000).remove();
	        }
	    });
	});

	$('#discardSelectedNodes').click(function() {
		d3.selectAll('circle.node.selected')
			.transition().duration(1000)
			.style("opacity", 0).attr("r", 0);
		d3.selectAll('circle.node.selected')
			.transition().delay(1000)
			.remove();
    	d3.selectAll('line.link').each(function(d) {
    		if(_.contains(selectedNodes, d.source) || _.contains(selectedNodes, d.target)) {
    			d3.select(this).transition().duration(1000).style("opacity", 0);
    			d3.select(this).transition().delay(1000).remove();
    		}
    	});
    	selectedNodes = []; //empty the array
    	selectedLinks = [];
    	updateSelectionArea("empty"); //update the selection area by emptying it
    	//hide the selectionArea div
    	$('#selectionArea').hide('slow');
    	$('#cloningArea').hide('slow');
    	$('#comparingArea').hide('slow');
    	$('#detailLineArea').hide('slow');
    	//return to the defaul for the radios (i.e., check the 'none' option)
    	$('input#selectNone').iCheck('check');
	});

	$('#discardUnselectedNodes').click(function() {
		d3.selectAll('circle.node').each(function() {
    		if(!_.contains(this.classList, "selected")) {
	    		d3.select(this).transition().duration(1000).style("opacity", 0).attr("r", 0);
	    		d3.select(this).transition().delay(1000).remove();
	    	}
    	});
    	d3.selectAll('line.link').each(function(d) {
    		if(!_.contains(selectedLinks, d)) {
    			d3.select(this).transition().duration(1000).style("opacity", 0);
    			d3.select(this).transition().delay(1000).remove();
    		}
    	});
	});

	$('input#selectLasso').on('ifChecked', function() {
		brush = d3.svg.polybrush()
	    .x(d3.scale.linear().range([0, svgwidth]))
	    .y(d3.scale.linear().range([0, svgheight]))
	    .on("brushstart", function() {
	      networksvg.selectAll(".selected").classed("selected", false);
	    })
	    .on("brush", function() {
	    	//reset actions
	    	$('#selectionNone').iCheck('check');
	    	//update the div that lists the current selections
	    	updateSelectionArea();
	      // iterate through all circle.node
	      networksvg.selectAll("circle.node").each(function(d) {
	        // if the circle in the current iteration is within the brush's selected area
	        if (brush.isWithinExtent(d.x, d.y)) {
	        	//adjust the style
	          	d3.select(this).classed("selected", true).style("stroke", "red").style("stroke-width", "4px").style("fill", "white");
	          	selectedNodes.push(this.__data__);
	          	selectedNodes = _.uniq(selectedNodes, false, function(x){ return (x.Name + x.Department) });
	        } 
	        // if the circle in the current iteration is not within the brush's selected area
	        else {
	        	//if the current node was not selected with the individual selector (i.e., it was selected with the lasso)
	        	if(this.selectedIndividually == false){
	  	  			selectedNodes = _.without(selectedNodes, this.__data__);      		
	        		//reset the style
	          		d3.select(this).classed("selected", false).style("stroke", "gray").style("stroke-width", "1px").style("fill", function(d){ return color20(d.Department); });
	          	}
	        }
	      });
	      networksvg.selectAll("line.link").each(function(d) {
	      	if(brush.isWithinExtent(d.source.x, d.source.y) && brush.isWithinExtent(d.target.x, d.target.y)) {
	      		selectedLinks.push(this.__data__);
	      	}
	      	else {
	      		selectedLinks = _.without(selectedLinks, this.__data__);
	      	}
	      })
	    })
	   	networksvg.append("svg:g")
	    .attr("class", "brush")
	    .call(brush);
	})
    .on('ifUnchecked', function() {
    	// iterate through all circle.node
      // 	networksvg.selectAll("circle.node").each(function(d) {
      //   // if the circle in the current iteration is within the brush's selected area
      //   if (brush.isWithinExtent(d.x, d.y)) {
      //   	//reset the style
      //     d3.select(this).style("stroke", "gray").style("stroke-width", "1px").style("fill", function(d){ return color20(d.Department); });
      // 	}
      // });
      	//remove the brush completely
    	$('.brush').remove()
    });

	$('input#selectIndividual').on('ifChecked', function() {
		individualSelect = true; 	//set the individualSelect flag to true. this will be used in the tick function
	})
    .on('ifUnchecked', function() {
    	individualSelect = false;
    }); 

    //if the user turns off the select action
    $('input#selectNone').on('ifChecked', function() {
    	var noneSelected = true;
    	// iterate through all circle.node
      	networksvg.selectAll("circle.node").each(function(d) {
        	// if the circle in the current iteration is within the brush's selected area
         	if (this.style.strokeWidth == "4px") {
         		noneSelected = false;
   			}
      	 });

      	//if no nodes are selected
      	if (noneSelected == true){   
      		//hide the selectionArea div
    		$('#selectionArea').hide('slow'); 
    		$('#cloningArea').hide('slow');
    		$('#comparingArea').hide('slow');
    		$('#detailLineArea').hide('slow');
    	}
    })
    .on('ifUnchecked', function() {
    	//show the selectionArea div
    	$('#selectionArea').show('slow');
    }); 

    //if the user clicks the button to remove all selections
    $('#selectionRemove').click(function() {
    	$('#selectionNone').iCheck('check');
    	selectedNodes = []; //empty the array
    	selectedLinks = [];
    	updateSelectionArea("empty"); //update the selection area by emptying it
    	//hide the selectionArea div
    	$('#selectionArea').hide('slow');
    	$('#cloningArea').hide('slow');
    	$('#comparingArea').hide('slow');
    	$('#detailLineArea').hide('slow');
    	//return to the defaul for the radios (i.e., check the 'none' option)
    	$('input#selectNone').iCheck('check');
    	//reset the style of the nodes
    	d3.selectAll("circle.node").each(function() {
    		d3.select(this).classed("selected", false).style("stroke", "gray").style("stroke-width", "1px").style("fill", function(d){ return color20(d.Department); });
    	});
    });

    $('#selectionHide').on('ifChecked', function() {
    	d3.selectAll('circle.node.selected').each(function() {
    		var r = d3.select(this).attr("r");
    		d3.select(this).transition().duration(1000).style("opacity", 0).attr("r", 0)
    		d3.select(this).transition().delay(1000).style("visibility", "hidden").attr("r", r);
    	});
    	d3.selectAll('line.link').each(function(d) {
    		if(_.contains(selectedNodes, d.source) || _.contains(selectedNodes, d.target)) {
    			d3.select(this).transition().duration(1000).style("opacity", 0);
    			d3.select(this).transition().delay(1000).style("visibility", "hidden");
    		}
    	});
    });

    $('#selectionHide').on('ifUnchecked', function() {
    	d3.selectAll('circle.node.selected').each(function() {
    		var r = d3.select(this).attr("r");
    		d3.select(this).style("visibility", "visible").attr("r", 0);
    		d3.select(this).transition().duration(1000).style("opacity", 1).attr("r", r);
    	});
    	d3.selectAll('line.link').each(function(d) {
    		if(_.contains(selectedNodes, d.source) || _.contains(selectedNodes, d.target)) {
    			d3.select(this).style("visibility", "visible").style("opacity", 0);
    			d3.select(this).transition().duration(1000).style("opacity", 1);
    		}
    	});
    });

    $('#selectionShow').on('ifChecked', function() {
    	d3.selectAll('circle.node').each(function() {
    		if(!_.contains(this.classList, "selected")) {
	    		var r = d3.select(this).attr("r");
	    		d3.select(this).transition().duration(1000).style("opacity", 0).attr("r", 0)
	    		d3.select(this).transition().delay(1000).style("visibility", "hidden").attr("r", r);
	    	} else {
	    		d3.select(this).style("stroke", "gray").style("stroke-width", 1)
	    			.style("fill", function(d) { return color20(d.Department); });
	    	}
    	});
    	d3.selectAll('line.link').each(function(d) {
    		if(!_.contains(selectedLinks, d)) {
    			d3.select(this).transition().duration(1000).style("opacity", 0);
    			d3.select(this).transition().delay(1000).style("visibility", "hidden");
    		}
    	});
    });

    $('#selectionShow').on('ifUnchecked', function() {
    	d3.selectAll('circle.node').each(function() {
    		if(!_.contains(this.classList, "selected")) {
	    		var r = d3.select(this).attr("r");
	    		d3.select(this).style("visibility", "visible").attr("r", 0);
	    		d3.select(this).transition().duration(1000).style("opacity", 1).attr("r", r);
	    	} else {
	    		d3.select(this).style("stroke", "red").style("stroke-width", 4)
	    			.style("fill", "white");
	    	}
    	});
    	d3.selectAll('line.link').each(function(d) {
    		if(!_.contains(selectedLinks, d)) {
    			d3.select(this).style("visibility", "visible").style("opacity", 0);
    			d3.select(this).transition().duration(1000).style("opacity", 1);
    		}
    	});
    });

    $('input#gatheringMode').on('ifChecked', function() {
    	$('#gatheringArea').show('slow');
    	network_force.gravity(0).linkStrength(0).charge(-100).start();
    })
    .on('ifUnchecked', function() {
    	$('#gatheringArea').hide('slow');
    	network_force.gravity(dgravity).linkStrength(dlinkStrength).charge(dcharge).start();
    	d3.selectAll("circle.node").attr("gathering", "false");
    });

    $('#selectionClone').click(function() {
    	if(selectedNodes.length == 0)
    		return ;

    	cloningSvg.selectAll('*').remove();
    	cloningSvg.append('svg:rect')
    		.attr('width', cloningWidth)
    		.attr('height', cloningHeight)
    		.style('fill', 'none')
    		.style('opacity', '0');

    	$('#cloningArea').show('slow');
    	//clone selected data so that we can create a new layout
    	var s = JSON.stringify(selectedNodes);
    	var nodes = JSON.parse(s);

    	s = JSON.stringify(selectedLinks);
    	var links = JSON.parse(s);
    	links.forEach(function(link) {
    		nodes.forEach(function(node, index) {
    			if(node.ID == link.source.ID)
    				link.source = index;
    			if(node.ID == link.target.ID)
    				link.target = index;
    		})
    	});

    	var cloningLink = cloningSvg.selectAll('line.link')
			.data(links)
			.enter().append('svg:line')
			.attr('class', 'link')
			.style("visibility", "visible")
		    .style("stroke", "gray")
		    .style("stroke-dasharray", function (d) {
		      if (d.type == "supervision")
		        return "4, 4";
		      else
		        return "10, 0";
		    });

		var cloningNode = cloningSvg.selectAll('circle.node')
			.data(nodes)
			.enter().append('svg:circle')
			.attr('class', 'node')
			.attr('r', 10)
			.style('visibility', 'visible')
			.style('fill', function(d) { return color20(d.Department); })
			.style("stroke", "gray")
			.style("stoke-width", "1px");

    	var cloning_network_force = d3.layout.force()
			.size([cloningWidth, cloningHeight])
			.nodes(nodes)
			.links(links)
			//.gravity(dgravity)
			.friction(dfriction)
			.charge(dcharge)
			.linkDistance(40)

	    function cloningAreaTick() {
	    	cloningLink.attr("x1", function(d) { return d.source.x; })
      			.attr("y1", function(d) { return d.source.y; })
      			.attr("x2", function(d) { return d.target.x; })
      			.attr("y2", function(d) { return d.target.y; });

  			cloningNode.attr("cx", function(d) { return d.x; })
      			.attr("cy", function(d) { return d.y; });
	    }

	    var nodeDrag = d3.behavior.drag()
			.on("dragstart", function(d, i) {
				dragging = true;
				cloning_network_force.stop();
			})
			.on("drag", function(d, i) {
				d.px += d3.event.dx;
				d.py += d3.event.dy;
		        d.x += d3.event.dx;
		        d.y += d3.event.dy;
		        cloningAreaTick();
			})
			.on("dragend", function(d, i) {
				cloningAreaTick();
				cloning_network_force.resume();
				dragging = false;
			})
    	cloningNode.call(nodeDrag)
			.on("mouseover", function(d) {
				d3.select(this).attr("cursor", "pointer");
			  	d3.select(this).style("stroke-width", "3px");
			  	if (!dragging) {
					nodeTooltip.transition()        
		                .duration(200)      
		                .style("opacity", .95);      
		            nodeTooltip.html("<b>" + d.Name + "</b><br><hr>" + d.Department + "<br>" + d.Rank)                
		            	.style("left", (parseInt(d3.select(this).attr("cx")) + document.getElementById("networkviz").offsetLeft) + "px")     
		                .style("top", d.y + "px");

		            //position the tooltip relative to the svg circle
			  	    $('.nodeTooltip').position({
		    			"my": "left+20 top+20",
		    			"at": "right bottom",
		    			"of": $(this)
		    		});
			  	}
			})
			.on("mouseout", function(d) {
				d3.select(this).style("stroke-width", "1px");	    
			  	nodeTooltip.transition()        
		        	.duration(500)      
		            .style("opacity", 0);
		    });

	    cloning_network_force.on("tick", cloningAreaTick);
	    cloning_network_force.start();
    }) //end of selectionClone click

	$('#itemsChooseNone').click(function() {
		d3.select("#selectionList").selectAll(".item")
			.classed("chosen", false)
			.transition().duration(400).style("background-color", "white")
			.style("color", function(d) { return color20(d.Department); } );
/*
		$('#itemsAll').show();
		$('#itemsClear').hide();
		$('#itemsCompare').hide();
		$('#itemLinechart').hide();

*/
		$('#itemsChooseNone').css("background", "grey").css("color", "rgb(162,162,162").css("cursor", "default");
		$('#itemsChooseAll').css("background", "rgb(36,137,197)").css("color", "white").css("cursor", "pointer");

		$('#itemsCompare').parent().hide('fast');
		$('#itemsCompare').hide();
		$('#itemLinechart').hide();
	});

	$('#itemsChooseAll').click(function() {
		d3.select("#selectionList").selectAll(".item")
			.classed("chosen", true)
			.transition().duration(400).style("background-color", "rgb(36, 137, 197)")
			.style("color", "white" );

		$('#itemsChooseAll').css("background", "grey").css("color", "rgb(162,162,162").css("cursor", "default");
		$('#itemsChooseNone').css("background", "rgb(36,137,197)").css("color", "white").css("cursor", "pointer");

		$('#itemsCompare').parent().show('fast');
		$('#itemsCompare').show();
		$('#itemLinechart').hide();
	});	

	$('#itemsCompare').click(function() {

		$('#comparingArea svg').remove();


		var color = d3.scale.ordinal()
		    .domain(d3.range(n))
		    .range(["#9E5845", "#91BA6D", "#966FAD"]);

		var label = d3.select('#barLegend').selectAll(".label")
			.data(["publications", "supervisions", "grants"])
	    	.enter().append("div")
	    	.attr("class", "label")
		    .style("border", "1px dashed")
		    .style("border-color", "rgba(255,255,255,0)")
		    .text(function(d) { return d; });

		label
		    .append("div")
		    .attr("class", "labelcolor")
		    .style("background-color", function(d, i) { return color(i); });

		var data = [];
		var chosenItems = d3.select('#selectionList').selectAll('.item.chosen')
			.each(function(itemData) {
				d3.selectAll("circle.node").each(function(d) {
					if(itemData == d) {
						data.push({
							name: d.Name,
							department: d.Department,
							publications: $(this).attr("publications"),
							supervisions: $(this).attr("supervisions"),
							grants: $(this).attr("grants")
						});
					}
				});
			});
		
		var n = 3, // number of layers
	    m = data.length; // number of samples per layer
	    stack = d3.layout.stack(),
	    layers = stack(d3.range(n).map(function(d) {
	    	var result = [];
	    	switch(d) {
				case 0:
	    			data.forEach(function(d, i) { result.push({x: i, y: parseInt(d.publications)}); });
					break;
				case 1:
					data.forEach(function(d, i) { result.push({x: i, y: parseInt(d.supervisions)}); });
					break;
				case 2:
	    			data.forEach(function(d, i) { result.push({x: i, y: parseInt(d.grants)}); });
	    			break;
	    	}
	    	return result;
	    })),
		yGroupMax = d3.max(layers, function(layer) { return d3.max(layer, function(d) { return d.y; }); }),
		yStackMax = d3.max(layers, function(layer) { return d3.max(layer, function(d) { return d.y0 + d.y; }); });

	    var margin = {top: 40, right: 10, bottom: 80, left: 10},
			width = 700 - margin.left - margin.right,
			height = 500 - margin.top - margin.bottom;

		var x = d3.scale.ordinal()
			.domain(d3.range(m))
			.rangeRoundBands([0, width], 0.3);

		var y = d3.scale.linear()
			.domain([0, yStackMax])
			.range([height, 0]);

		var xAxis = d3.svg.axis()
			.scale(x)
			.tickSize(0)
			.tickPadding(6)
			.orient("bottom")
			.tickFormat(function(d) { return data[d].name; });

		var svg = d3.select("#comparingArea").append("svg")
		    .attr("width", width + margin.left + margin.right)
		    .attr("height", height + margin.top + margin.bottom)
		  .append("g")
		    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		var layer = svg.selectAll(".layer")
		    .data(layers)
		  .enter().append("g")
		    .attr("class", "layer")
		    .style("fill", function(d, i) { return color(i); });

		var rect = layer.selectAll("rect")
		    .data(function(d) { return d; })
		  .enter().append("rect")
		    .attr("x", function(d) { return x(d.x); })
		    .attr("y", height)
		    .attr("width", x.rangeBand())
		    .attr("height", 0);

		rect.transition()
		    .delay(function(d, i) { return i * 10; })
		    .attr("y", function(d) { return y(d.y0 + d.y); })
		    .attr("height", function(d) { return y(d.y0) - y(d.y0 + d.y); });

		svg.append("g")
		    .attr("class", "x axis")
		    .attr("transform", "translate(0," + height + ")")
		    .call(xAxis)
		  .selectAll("text")
			.style("text-anchor", "start")
			.attr("fill", function(d, i) { return color20(data[i].department); })
			.attr("x", function() {
				var w = rect[0][0].width.animVal.value //get the width of one of the bars
				return -(w/10); }) //return an x value that is relative to the width...10 seems about right
			.attr("y", 10)
			.attr("transform", function(d) {
				return "rotate(30, " + this.attributes.x.value + "," + this.attributes.y.value + ")";
			});

		$('#groupedBar').on('ifChecked', function() {
			y.domain([0, yGroupMax]);

			rect.transition()
			    .duration(500)
			    .delay(function(d, i) { return i * 10; })
			    .attr("x", function(d, i, j) { return x(d.x) + x.rangeBand() / n * j; })
			    .attr("width", x.rangeBand() / n)
			  .transition()
			    .attr("y", function(d) { return y(d.y); })
			    .attr("height", function(d) { return height - y(d.y); });
		});

		$('#stackedBar').on('ifChecked', function() {
			y.domain([0, yStackMax]);

			rect.transition()
			    .duration(500)
			    .delay(function(d, i) { return i * 10; })
			    .attr("y", function(d) { return y(d.y0 + d.y); })
			    .attr("height", function(d) { return y(d.y0) - y(d.y0 + d.y); })
			  .transition()
			    .attr("x", function(d) { return x(d.x); })
			    .attr("width", x.rangeBand());
		});

		$('#comparingArea').show(0, function(){
		    $.colorbox({inline:true, width:"65%", height:"98%", href:"#comparingArea", opacity:0.7, scrolling:true, open:true, overlayClose:false, closeButton:false, fadeOut:300, onClosed:function() {
		    	$('#comparingArea svg').remove();
		    	$('#comparingArea').hide(0);
		    	} 
			});			
		});
	});

	$('#itemLinechart').click(function() {
		
		var data = $("#selectionList li.item.chosen")[0].__data__;
		$('#detailLineArea svg').remove();
		$('#detailLineArea h2').text(data.Name);
		$('#detailLineArea').show('slow');

		//fetch data
        var science_faculty_data;
        if(store.session.has("science_faculty_data")){
          console.log("science_faculty_data is already in sessionStorage...no need to fetch again");
          science_faculty_data = store.session("science_faculty_data");        
        }
        var index;
        for(index = 0; index < science_faculty_data.length; index++)
        	if(science_faculty_data[index].ID == data.ID)
        		break;

        var links_combined;
		if(store.session.has("links_combined")){
          console.log("links_combined is already in sessionStorage...no need to fetch again");
          links_combined = store.session("links_combined");       
        }

        //process data
        links_combined = _.filter(links_combined, function(d) {
        	var flag = false;
        	if(d.source == index || d.target == index) {
        		flag = true;
        	}
        	return flag;
        });

        var links_publication = _.filter(links_combined, function(d) {
        	return d.type == "publication";
        }).sort(function(a, b) {
        	return a.year - b.year;
        });
        var publicationData = links_publication.length ? 
        	d3.range(links_publication[0].year, links_publication[links_publication.length-1].year + 1).map(function(d) { return {x: d, y: 0}; }) : [];
        links_publication.forEach(function(d) {
        	for(var i = 0; i < publicationData.length; i++)
        		if(publicationData[i].x == d.year) {
        			publicationData[i].y++;
        			break;
        		}
        });

        var links_grant = _.filter(links_combined, function(d) {
        	return d.type == "grant" && d.status != "";
        });
        var min = 9999; max = 0;
        links_grant.forEach(function(d) {
        	var begin = parseInt(d.begin.substring(0, 4));
        	var end = parseInt(d.end.substring(0, 4));
        	min = begin < min ? begin : min;
        	max = end > max ? end : max;
        });
        var grantData = links_grant.length ? d3.range(min, max + 1).map(function(d) { return {x: d, y: 0}; }) : [];
        links_grant.forEach(function(d) {
        	var begin = parseInt(d.begin.substring(0, 4));
        	var end = parseInt(d.end.substring(0, 4));
        	for(var i = 0; i < grantData.length; i++) {
        		if(grantData[i].x == begin) {
        			for(var j = i; j < grantData.length && grantData[j].x <= end; j++)
        				grantData[j].y++;
        			break;
        		}
        	}
        });

        combined_data = [{key: "publication", values: publicationData, color: "#9D6187"}, {key: "grant", values: grantData, color: "#97A861"}];
        
        //draw graph
        var margin = {top: 40, right: 10, bottom: 40, left: 10},
			width = 700 - margin.left - margin.right,
			height = 500 - margin.top - margin.bottom;

        nv.addGraph(function() {
        	var chart = nv.models.lineWithFocusChart();

        	chart.xAxis.tickFormat(d3.format('d'));
        	chart.x2Axis.tickFormat(d3.format('d'));
        	chart.yAxis.tickFormat(d3.format('d'));
        	chart.y2Axis.tickFormat(d3.format('d'));

        	d3.select('#detailLineArea').append("svg")
        		.attr("width", width + margin.left + margin.right)
		    	.attr("height", height + margin.top + margin.bottom)
        		.datum(combined_data)
        		.transition().duration(500).call(chart);
        	nv.utils.windowResize(chart.update);

        	return chart;
        });
	});
/*
	$('#itemsAll').click(function() {
		d3.select("#selectionList").selectAll("li.item")
			.classed("chosen", true)
			.style("background-color", "rgb(36,137,197)")
			.style("color", "white");
		$('#itemsAll').hide();
		$('#itemsClear').show();
		$('#itemsCompare').show();
		$('#itemLinechart').hide();
	})
*/

	$('input#motionFreeze').on('ifUnchecked', function() {
		network_force.resume();
	});

	/*
	filters (hides) all nodes that do not have links connected to them

	@params: none
	@returns: none
	*/
/*	function filterNodesWithoutLinks() {
	  d3.selectAll("circle.node").each( function () {
	    var that = this;//because of the nested loop
	    var match = false;
	    d3.selectAll("line.link").each( function() {
	        if (((this["x1"].animVal.value == that["cx"].animVal.value && this["y1"].animVal.value == that["cy"].animVal.value && this.animViz == "true") || (this["x2"].animVal.value == that["cx"].animVal.value && this["y2"].animVal.value == that["cy"].animVal.value && this.animViz == "true"))){ //if there is a visible link to the current node set the boolean flag to true
	         match = true;
	       }
	    }); 
	    if (match == false){
	      //make the node invisible
	      d3.select(this).transition().duration(800).style("opacity", 0).attr("r", 0);
	      d3.select(this).transition().delay(800).style("visibility", "hidden");
	    }
	    else {
	      //if the current node is currently hidden
	      if (this.style.visibility == "hidden"){
	        //set it to visible, but with an opacity of 0 so that it can be gradually faded in
	        d3.select(this).style("visibility", "visible").style("opacity", 0);
	        d3.select(this).transition().duration(800).style("opacity", 1).attr("r", 10);
	      }
	    }
	  }); 
	}*/

	$('#dock').on("click", function() {
		var w = $('#matrixcollaborationlegend').width()
		$('#matrixcollaborationlegend').css("position", "relative").css("left", "10px").css("width", w).css("top", "-50px");
		$('#dock').text("");		
	});
	$('#matrixcollaborationlegend').on("drag", function() {
		$('#dock').text("dock");
	});

	$('#matrixdepartmentlegendtoggle').on("click", function() {
		if ($('#matrixdepartmentlegend').is(':visible')){
			$('#matrixdepartmentlegend').slideUp(200);
			$('#matrixdepartmentlegendtoggle').css('top', '-4px').css('border-radius', '0px 0px 2px 2px');
		}
		else {
		$('#matrixdepartmentlegend').slideDown(200);
			$('#matrixdepartmentlegendtoggle').css('top', '-13px').css('border-radius', '2px 2px 0px 0px');			
		}
	});

	$('#networkdepartmentlegendtoggle').on("click", function() {
		if ($('#networkdepartmentlegend').is(':visible')){
			$('#networkdepartmentlegend').slideUp(200);
			$('#networkdepartmentlegendtoggle').css('top', '-4px').css('border-radius', '0px 0px 2px 2px');
		}
		else {
		$('#networkdepartmentlegend').slideDown(200);
			$('#networkdepartmentlegendtoggle').css('top', '-13px').css('border-radius', '2px 2px 0px 0px');			
		}
	});	

	$('#actionpaneltoggle').on("click", function() {
		if ($('#actionpanel').is(':visible')){
			$('#actionpanel').hide('slow');
			$('#actionpaneltoggle').css('left', '10px').css('width', '20px').css('border-radius', '2px 0px 0px 2px');
			$('#actionpaneltoggle p').text('<');
			$('#vizcontainer').css('width', $(window).width()-50);
			if ($('#matrixviz').is(':visible')){
				$('#matrixviz').css('width', $(window).width()-50);			
				$('#matrixviz svg').css('width', $(window).width()-50);
				$('#matrixdepartmentlegendtoggle').css('left', $('#matrixbar').width()/2 + $('#matrixdepartmentlegendtoggle').width()/2);
			}
			else if ($('#networkviz').is(':visible')){
				$('#networkviz').css('width', $(window).width()-50);			
				$('#networkviz svg').css('width', $(window).width()-50);
				$('#networkdepartmentlegendtoggle').css('left', $('#networkbar').width()/2 + $('#networkdepartmentlegendtoggle').width()/2);
			}
		}
		else {
			$('#vizcontainer').css('width', '72%');	
			$('#actionpanel').show();
			$('#actionpaneltoggle').css('left', '10px').css('top', '6px').css('width', '20px').css('border-radius', '0px 2px 2px 0px');	
			$('#actionpaneltoggle p').text('>');	
			if ($('#matrixviz').is(':visible')){
				$('#matrixviz').css('width', $('#vizcontainer').width());
				$('#matrixviz svg').css('width', $('#vizcontainer').width());			
				$('#matrixdepartmentlegendtoggle').css('left', $('#matrixbar').width()/2 + $('#matrixdepartmentlegendtoggle').width()/2);				
			}
			else if ($('#networkviz').is(':visible')){
				$('#networkviz').css('width', $('#vizcontainer').width());
				$('#networkviz svg').css('width', $('#vizcontainer').width());			
				$('#networkdepartmentlegendtoggle').css('left', $('#networkbar').width()/2 + $('#networkdepartmentlegendtoggle').width()/2);	
			}		
		}
		//resizeViz();
	});

	$('input#filterCo_pubs').on('ifChecked', function() {

	  if($('#granularity').val() == "individuals") {
		  async.series (
		    [  
		      function(callback){
		        d3.selectAll("line.link").each( function () {
		          if (this.__data__.type != "supervision" && this.__data__.type != "grant" && d3.select(this).attr("animViz") == "true") {
		            d3.select(this).style("visibility", "visible");
		            d3.select(this).transition().duration(1000).style("opacity", 1);
		          }
		        });
		        //wait 2000 because of the duration and delay above
		        //otherwise the next function in the series will execute too early
		        setTimeout(function(){callback(null)}, 2000);
		      },  

		      function(callback){
		        //if the user has already specified that only  nodes with links should be displayed
		        if ($('input#filterNodesLinks').is(':checked')){
		          d3.selectAll("circle.node").each( function () {
		          var that = this;//because of the nested loop
		            var match = false;
		            d3.selectAll("line.link").each( function() {
		                if (((this["x1"].animVal.value == that["cx"].animVal.value && this["y1"].animVal.value == that["cy"].animVal.value && this.style.visibility == "visible") || (this["x2"].animVal.value == that["cx"].animVal.value && this["y2"].animVal.value == that["cy"].animVal.value && this.style.visibility == "visible"))){ //if there is a visible link to the current node set the boolean flag to true
		                 match = true;
		               }
		            }); 
		            if (match == false){
		              //make the node invisible
		              d3.select(this).transition().duration(300).style("opacity", 0);//.attr("r", 0);a
		              d3.select(this).transition().delay(300).style("visibility", "hidden");
		            }
		            else {
		              //if the current node is currently hidden
		              if (this.style.visibility == "hidden"){
		                //set it to visible, but with an opacity of 0 so that it can be gradually faded in
		                d3.select(this).style("visibility", "visible").style("opacity", 0);
		                d3.select(this).transition().duration(1500).style("opacity", 1);//.attr("r", 10);
		              }
		            }
		          });
		        }
		      }
		    ],

		    //callback
		    function(err){
		      network_force.start();
		    }
		  );
	  } else if($('#granularity').val() == "departmentsChord") {
	  	d3.selectAll("path.chord").each(function(d) {
	  		if(d.type == "copub" && this.style.opacity == 0) {
	  			d3.select(this).style("visibility", "visible").style("opacity", 0);
	  			d3.select(this).transition().duration(1500).style("opacity", 0.8);
	  		}
	  	});
	  }
	});
	$('input#filterCo_pubs').on('ifUnchecked', function() {

	  if($('#granularity').val() == "individuals") {
		async.series (
		    [
		      function(callback){
		        d3.selectAll("line.link").each( function () {
		          if (this.__data__.type != "supervision" && this.__data__.type != "grant") {
		            d3.select(this).transition().duration(1000).style("opacity", 0);
		            d3.select(this).transition().delay(1000).style("visibility", "hidden");
		          }
		        });
		        //wait 2000 because of the duration and delay above 
		        //otherwise the next function in the series will execute too early
		        setTimeout(function(){callback(null)}, 2000);
		      },

		      function(callback){
		        //if the user has already specified that only  nodes with links should be displayed
		        if ($('input#filterNodesLinks').is(':checked')){
		          d3.selectAll("circle.node").each( function () {
		          var that = this;//because of the nested loop
		            var match = false;
		            d3.selectAll("line.link").each( function() {
		                if (((this["x1"].animVal.value == that["cx"].animVal.value && this["y1"].animVal.value == that["cy"].animVal.value && this.style.visibility == "visible") || (this["x2"].animVal.value == that["cx"].animVal.value && this["y2"].animVal.value == that["cy"].animVal.value && this.style.visibility == "visible"))){ //if there is a visible link to the current node set the boolean flag to true
		                 match = true;
		               }
		            }); 
		            if (match == false){
		              //make the node invisible
		              d3.select(this).transition().duration(300).style("opacity", 0);//.attr("r", 0);
		              d3.select(this).transition().delay(300).style("visibility", "hidden");
		              
		            }
		            else {
		              //make the node visible
		              d3.select(this).style("visibility", "visible").style("opacity", 1);
		              // d3.select(this).transition().duration(2000).style("opacity", 1);
		            }
		          });
		        }
		      }
		    ],

		    //callback
		    function(err){
		      network_force.start();
		    }
	  	);
	  } else if($('#granularity').val() == "departmentsChord") {
	  	d3.selectAll("path.chord").each(function(d) {
	  		if(d.type == "copub" && this.style.opacity == 0.8) {
	  			d3.select(this).transition().delay(1500).style("visibility", "hidden");
	  			d3.select(this).transition().duration(1500).style("opacity", 0);
	  		}
	  	});
	  }
	});


	$('input#filterCo_sups').on('ifChecked', function(){
	  if($('#granularity').val() == "individuals") {
		  async.series (
		    [  
		      function(callback){
		        d3.selectAll("line.link").each( function () {
		          if (this.__data__.type == "supervision" && d3.select(this).attr("animViz") == "true") {
		            d3.select(this).style("visibility", "visible");        
		            d3.select(this).transition().duration(1000).style("opacity", 1);
		          }
		        });
		        //wait 2000 because of the duration and delay above
		        //otherwise the next function in the series will execute too early
		        setTimeout(function(){callback(null)}, 2000);
		      },  

		      function(callback){
		        //if the user has already specified that only  nodes with links should be displayed
		        if ($('input#filterNodesLinks').is(':checked')){
		          d3.selectAll("circle.node").each( function () {
		          var that = this;//because of the nested loop
		            var match = false;
		            d3.selectAll("line.link").each( function() {
		                if (((this["x1"].animVal.value == that["cx"].animVal.value && this["y1"].animVal.value == that["cy"].animVal.value && this.style.visibility == "visible") || (this["x2"].animVal.value == that["cx"].animVal.value && this["y2"].animVal.value == that["cy"].animVal.value && this.style.visibility == "visible"))){ //if there is a visible link to the current node set the boolean flag to true
		                 match = true;
		               }
		            }); 
		            if (match == false){
		              //make the node invisible
		              d3.select(this).transition().duration(300).style("opacity", 0);//.attr("r", 0);
		              d3.select(this).transition().delay(300).style("visibility", "hidden");
		            }
		            else {
		              //if the current node is currently hidden
		              if (this.style.visibility == "hidden"){
		                //set it to visible, but with an opacity of 0 so that it can be gradually faded in
		                d3.select(this).style("visibility", "visible").style("opacity", 0);
		                d3.select(this).transition().duration(1500).style("opacity", 1);//.attr("r", 10);
		              }
		            }
		          });
		        }
		      }
		    ],

		    //callback
		    function(err){
		      network_force.start();
		    }
		  );       
	  } else if($('#granularity').val() == "departmentsChord") {
	  	d3.selectAll("path.chord").each(function(d) {
	  		if(d.type == "cosup" && this.style.opacity == 0) {
	  			d3.select(this).style("visibility", "visible").style("opacity", 0);
	  			d3.select(this).transition().duration(1500).style("opacity", 0.8);
	  		}
	  	});
	  }
	});
	$('input#filterCo_sups').on('ifUnchecked', function(){
	  if($('#granularity').val() == "individuals") {
		  async.series (
		    [
		      function(callback){
		        d3.selectAll("line.link").each( function () {
		          if (this.__data__.type == "supervision") {
		            d3.select(this).transition().duration(1000).style("opacity", 0);
		            d3.select(this).transition().delay(1000).style("visibility", "hidden");
		          }
		        });
		        //wait 2000 because of the duration and delay above 
		        //otherwise the next function in the series will execute too early
		        setTimeout(function(){callback(null)}, 2000);
		      },

		      function(callback){
		        //if the user has already specified that only  nodes with links should be displayed
		        if ($('input#filterNodesLinks').is(':checked')){
		          d3.selectAll("circle.node").each( function () {
		          var that = this;//because of the nested loop
		            var match = false;
		            d3.selectAll("line.link").each( function() {
		                if (((this["x1"].animVal.value == that["cx"].animVal.value && this["y1"].animVal.value == that["cy"].animVal.value && this.style.visibility == "visible") || (this["x2"].animVal.value == that["cx"].animVal.value && this["y2"].animVal.value == that["cy"].animVal.value && this.style.visibility == "visible"))){ //if there is a visible link to the current node set the boolean flag to true
		                 match = true;
		               }
		            }); 
		            if (match == false){
		              //make the node invisible
		              d3.select(this).transition().duration(300).style("opacity", 0);//.attr("r", 0);
		              d3.select(this).transition().delay(300).style("visibility", "hidden");
		              
		            }
		            else {
		              //make the node visible
		              d3.select(this).style("visibility", "visible").style("opacity", 1);
		              // d3.select(this).transition().duration(2000).style("opacity", 1);
		            }
		          });
		        }
		      }
		    ],

		    //callback
		    function(err){
		      network_force.start();
		    }
		  ); 
	  } else if($('#granularity').val() == "departmentsChord") {
	  	d3.selectAll("path.chord").each(function(d) {
	  		if(d.type == "cosup" && this.style.opacity == 0.8) {
	  			d3.select(this).transition().delay(1500).style("visibility", "hidden");
	  			d3.select(this).transition().duration(1500).style("opacity", 0);
	  		}
	  	});
	  }
	});

	$('input#filterCo_grants').on('ifChecked', function(){
	  if($('#granularity').val() == "individuals") {
		  async.series (
		    [  
		      function(callback){
		        d3.selectAll("line.link").each( function () {
		          if (this.__data__.type == "grant" && d3.select(this).attr("animViz") == "true") {
		            d3.select(this).style("visibility", "visible");        
		            d3.select(this).transition().duration(1000).style("opacity", 1);
		          }
		        });
		        //wait 2000 because of the duration and delay above
		        //otherwise the next function in the series will execute too early
		        setTimeout(function(){callback(null)}, 2000);
		      },  

		      function(callback){
		        //if the user has already specified that only  nodes with links should be displayed
		        if ($('input#filterNodesLinks').is(':checked')){
		          d3.selectAll("circle.node").each( function () {
		          var that = this;//because of the nested loop
		            var match = false;
		            d3.selectAll("line.link").each( function() {
		                if (((this["x1"].animVal.value == that["cx"].animVal.value && this["y1"].animVal.value == that["cy"].animVal.value && this.style.visibility == "visible") || (this["x2"].animVal.value == that["cx"].animVal.value && this["y2"].animVal.value == that["cy"].animVal.value && this.style.visibility == "visible"))){ //if there is a visible link to the current node set the boolean flag to true
		                 match = true;
		               }
		            }); 
		            if (match == false){
		              //make the node invisible
		              d3.select(this).transition().duration(300).style("opacity", 0);//.attr("r", 0);
		              d3.select(this).transition().delay(300).style("visibility", "hidden");
		            }
		            else {
		              //if the current node is currently hidden
		              if (this.style.visibility == "hidden"){
		                //set it to visible, but with an opacity of 0 so that it can be gradually faded in
		                d3.select(this).style("visibility", "visible").style("opacity", 0);
		                d3.select(this).transition().duration(1500).style("opacity", 1);//.attr("r", 10);
		              }
		            }
		          });
		        }
		      }
		    ],

		    //callback
		    function(err){
		      network_force.start();
		    }
		  );       
	  } else if($('#granularity').val() == "departmentsChord") {
	  	d3.selectAll("path.chord").each(function(d) {
	  		if(d.type == "grant" && this.style.opacity == 0) {
	  			d3.select(this).style("visibility", "visible").style("opacity", 0);
	  			d3.select(this).transition().duration(1500).style("opacity", 0.8);
	  		}
	  	});
	  }
	});
	$('input#filterCo_grants').on('ifUnchecked', function(){
	  if($('#granularity').val() == "individuals") {
		  async.series (
		    [
		      function(callback){
		        d3.selectAll("line.link").each( function () {
		          if (this.__data__.type == "grant") {
		            d3.select(this).transition().duration(1000).style("opacity", 0);
		            d3.select(this).transition().delay(1000).style("visibility", "hidden");
		          }
		        });
		        //wait 2000 because of the duration and delay above 
		        //otherwise the next function in the series will execute too early
		        setTimeout(function(){callback(null)}, 2000);
		      },

		      function(callback){
		        //if the user has already specified that only  nodes with links should be displayed
		        if ($('input#filterNodesLinks').is(':checked')){
		          d3.selectAll("circle.node").each( function () {
		          var that = this;//because of the nested loop
		            var match = false;
		            d3.selectAll("line.link").each( function() {
		                if (((this["x1"].animVal.value == that["cx"].animVal.value && this["y1"].animVal.value == that["cy"].animVal.value && this.style.visibility == "visible") || (this["x2"].animVal.value == that["cx"].animVal.value && this["y2"].animVal.value == that["cy"].animVal.value && this.style.visibility == "visible"))){ //if there is a visible link to the current node set the boolean flag to true
		                 match = true;
		               }
		            }); 
		            if (match == false){
		              //make the node invisible
		              d3.select(this).transition().duration(300).style("opacity", 0);//.attr("r", 0);
		              d3.select(this).transition().delay(300).style("visibility", "hidden");
		              
		            }
		            else {
		              //make the node visible
		              d3.select(this).style("visibility", "visible").style("opacity", 1);
		              // d3.select(this).transition().duration(2000).style("opacity", 1);
		            }
		          });
		        }
		      }
		    ],

		    //callback
		    function(err){
		      network_force.start();
		    }
		  ); 
	  } else if($('#granularity').val() == "departmentsChord") {
	  	d3.selectAll("path.chord").each(function(d) {
	  		if(d.type == "grant" && this.style.opacity == 0.8) {
	  			d3.select(this).transition().delay(1500).style("visibility", "hidden");
	  			d3.select(this).transition().duration(1500).style("opacity", 0);
	  		}
	  	});
	  }
	});

	$('input#filterNodesAll').on('ifChecked', function(){
	    d3.selectAll("circle.node").each( function () {
	      //if the current node is currently hidden
	      if (this.style.visibility == "hidden"){
	        //set it to visible, but with an opacity of 0 so that it can be gradually faded in
	        d3.select(this).style("visibility", "visible").style("opacity", 0);
	        d3.select(this).transition().duration(1500).style("opacity", 1);//.attr("r", 10);
	      }
	   });
	  network_force.start();      
	});
	$('input#filterNodesLinks').on('ifChecked', function(){
	    d3.selectAll("circle.node").each( function () {
	    var that = this;//because of the nested loop
	      var match = false;
	      d3.selectAll("line.link").each( function() {
	          if (((this["x1"].animVal.value == that["cx"].animVal.value && this["y1"].animVal.value == that["cy"].animVal.value) || (this["x2"].animVal.value == that["cx"].animVal.value && this["y2"].animVal.value == that["cy"].animVal.value))){ //if there is a link to the current node set the boolean flag to true
	           match = true;
	         }
	      }); 
	      if (match == false){
	        d3.select(this).transition().duration(1000).style("opacity", 0);//.attr("r", 0);
	        d3.select(this).transition().delay(1000).style("visibility", "hidden");
	        
	      }
	      else {
	        d3.select(this).style("visibility", "visible").style("opacity", 1);
	        // d3.select(this).transition().duration(2000).style("opacity", 1);
	      }
	    });
	    // network_force.gravity(0.02);

	  network_force.start();  
	});

	// $('input#scopeNodes').on('ifChecked', function() {
	//   d3.selectAll("circle.node").each( function () {
	//   var that = this;//because of the nested loop
	//     var match = false;
	//     //compare each line (link) to the current node. if their coordinates match (i.e., the link is a connection to the node) and the link is currently visible (i.e., it has not been hidden during the scoping)
	//     //then set the match boolean to true
	//     //don't forget to delay 500ms 
	//     d3.selectAll("line.link").each( function() {
	//         if (((this["x1"].animVal.value == that["cx"].animVal.value && this["y1"].animVal.value == that["cy"].animVal.value && this.style.visibility == "visible") || (this["x2"].animVal.value == that["cx"].animVal.value && this["y2"].animVal.value == that["cy"].animVal.value && this.style.visibility == "visible"))){ //if there is a link to the current node set the boolean flag to true
	//          match = true;
	//        }
	//     });

	//     if (match == false){
	//       //only want to set opacity to 0 and then fade it in if it is not currently visible
	//       if (this.style.visibility == "visible"){        
	//         d3.select(this).style("opacity", 0);
	//         d3.select(this).style("visibility", "hidden");
	//       } 

	//     }
	//     else {
	//       d3.select(this).style("visibility", "visible").style("opacity", 1);
	//       // d3.select(this).transition().duration(2000).style("opacity", 1);
	//     }
	//   });
	// });



	$("#filterdepartments").chosen().change( function () {
	  var removed = _.difference(filterdepartmentsvisible, $("#filterdepartments").val()); //if a value was removed, this will not be empty
	  var added = _.difference($("#filterdepartments").val(), filterdepartmentsvisible);   //if a value was added, this will not be empty
	  var filterdepartmentshidden = _.difference(science_departments, $("#filterdepartments").val());
	  d3.selectAll('.node').each(function (node) {
	    if (removed == node.Department){
	      d3.select(this).transition().duration(1000).style("opacity", 0);
	    }
	    else if (added == node.Department){
	      d3.select(this).transition().duration(1000).style("opacity", 1);
	    }
	  });

	  d3.selectAll('.sankeylink').each(function (link) {
	      if (removed == link.source.name){
	        d3.select(this).transition().duration(1000).style("opacity", 0);
	      }
	      else if (added == link.source.name){
	        d3.select(this).transition().duration(1000).style("opacity", 1);
	      }
	  }); 

	  filterdepartmentsvisible = $("#filterdepartments").val(); //update which sources are visible now
	});


	  //load the lightbox option for data loading progress
	  //when that finishes, VRchoice is loaded in the lightbox (new lightbox)
	    $('#VRchoice').colorbox({inline:true, width:"60%", href:"#VRchoice", scrolling:false, open:true, overlayClose:false, closeButton:false, fadeOut:300 });


	var filterPopulated = false;

	/*
	populates the filter area based on department data
	*/
	function populateFilter(science_departments) {

	  //loop through each grantDept and append it
	  science_departments.forEach(function(element){
	      $('#filterdepartments')
	      .append($("<option selected></option>")
	      .attr("value",element)
	      .text(element))
	      .trigger("liszt:updated");
	  });  

	  filterdepartmentsvisible = $('#filterdepartments').val(); //for the filtering later

	  //update the fields for chzn
	  $("#filterdepartments").trigger("liszt:updated");

	  filterPopulated = true;
	}


	//===========================================================
	//JQuery listening for changes to action selectors
	//===========================================================

	// $(document).ready(function() {

	// 	//hide the selectionArea div
	// 	$('#selectionArea').hide();
	// 	$('#selectionArea').draggable({ containment: "#vizcontainer", scroll: false });
	// 	//$('#selectionList').sortable();

	// 	$('#cloningArea').hide();
	// 	$('#cloningArea').draggable({ containment: "#vizcontainer", scroll: false });

	// 	$('#gatheringArea').hide();
	// 	$('#gatheringArea').draggable({ containment: "#vizcontainer", scroll: false });

	// 	$('#animateYearPlaceholder').hide();

	// 	$( "#gatheringArea" ).droppable({
 //      		accept: "#selectionArea",
 //      		activeClass: "ui-state-hover",
 //      		hoverClass: "ui-state-active",
 //      		drop: function( event, ui ) {
 //      			console.log("yup, in here");
 //        		$( this )
 //          		.addClass( "ui-state-highlight" )
 //          		.find( "p" )
 //            	.html( "Dropped!" );
 //     		}
 //    	});

	//   //to populate the search bar
	//   if(store.session.has("science_names")){
	//     console.log("science_names is already in sessionStorage...no need to fetch again");
	//   }
	//   else {
	//     console.log("fetching science_names...");
	//     $.get('/network/science_names', function(result) {
	//       var science_names = JSON.parse(result.science_names);
	//       store.session("science_names", science_names);
	//     });
	//   }

	//   //populate the autocomplete search box with the science members
	//   $( "#tags" ).autocomplete({
	//     source: store.session("science_names"),
	//     delay: 500,
	//     minLength: 2,
	//     select: function (event, ui) {
	//       var name = ui.item.value;
	//       highlightSelectedNode(name);
	//     }
	//   });

	//   $('input#filterNodesAll').iCheck('check');

	//   $('#selectionArea').hide();


	//   //listen to the zoom buttons 
	//   $('#networkzoomin').click(function() {
	//     console.log("uip");
	//       networkzoom.scale(networkzoom.scale()+0.1);
	//       networksvg.transition().duration(1000).attr('transform', 'translate(' + networkzoom.translate() + ') scale(' + networkzoom.scale() + ')');
	//   });
	//   $('#networkzoomout').click(function() {
	//       networkzoom.scale(networkzoom.scale()-0.1);
	//       networksvg.transition().duration(1000).attr('transform', 'translate(' + networkzoom.translate() + ') scale(' + networkzoom.scale() + ')');
	//   }); 
	// }); //end document.ready

	//if the user empties the search box, restore the opacity of all links and nodes
	//for the network
	$('#tags').change(function() {
	  if ($('#tags').val() == "") {
	    d3.selectAll("circle.node").each( function () {
	      d3.select(this).transition().duration(1000).style("opacity", 1).style("stroke", "gray").style("stroke-width", 1);
	    });
	    d3.selectAll("line.link").each( function () {
	      d3.select(this).transition().duration(1000).style("opacity", 1);
	    });
	  }
	});
	//and for the matrix
	$('#matrixsearch').change(function() {
	  if ($('#matrixsearch').val() == "") {
	  	  d3.selectAll("rect.matrixcell").each(function() {	 
	  	  	d3.select(this).attr("searchfiltered", 0); //not filtered by the search anymores
	  	  	var notfiltered = this.attributes.labelfiltered == null || this.attributes.labelfiltered.value == 0;   	 
			if (notfiltered) {
		    	d3.select(this).style("opacity", function() { 
		    			return this.attributes.previousopacity.value; //restore its previous opacity
		    	}); 	    	
		  	  }
		  	else
		  		d3.select(this).style("visibility", "hidden"); //for the cells that were made visible during the search
	  		});
	  	  	d3.selectAll(".matrixrow text").each(function(d) {
	  	  		d3.select(this).style("opacity", function() { return this.attributes.opacitybeforesearch.value; });
		  	});
	  	  	d3.selectAll(".matrixcolumn text").each(function(d) {
	  	  		d3.select(this).style("opacity", function() { return this.attributes.opacitybeforesearch.value; });
		  	});		
		  	currentlySearchingMatrix = false; 
		  	$('#matrixdepartmentlegend').slideDown();
		  	pubsChecked(); //to update the matrix so correct cells are made visible
		}
	});

	$('#sizeNodes').change(function() {

		switch ($('#sizeNodes').val()) {

			case "combined":
				countLinks("publication");
				countLinks("supervision");
				countLinks("grant");
				sizeNodes("combined");
				break;
			case "publications":
				countLinks("publication");
				sizeNodes("publication");
				break;
			case "supervisions":
				countLinks("supervision");
				sizeNodes("supervision");
				break;
			case "grants":
				countLinks("grant");
				sizeNodes("grant");
				break;
			case "uniform":
				sizeNodes("uniform");		
				break;
			default:
				countLinks("publication");
				sizeNodes("publication");
				break;
		}
	});

	$('#networkreset').click(function() {
	  //show all nodes
	  d3.selectAll("circle.node").each( function (d) {
	    //set the fixed property of each node to false
	    d.fixed = false;
	  	//set it to visible, but with an opacity of 0 so that it can be gradually faded in
	    d3.select(this).style("visibility", "visible").style("opacity", 0);
	    d3.select(this).transition().duration(1000).style("opacity", 1).style("stroke", "gray").style("stroke-width", 1).attr("r", 10).style("fill", function(d) { return color20(d.Department); });
	  });

	  //show all links
	  d3.selectAll("line.link").each( function () {
	    //only want to set opacity to 0 and then fade it in if it is not currently visible
	    //if (this.style.visibility == "hidden"){
	      d3.select(this).style("visibility", "visible").style("opacity", 0);
	      d3.select(this).transition().duration(1000).style("opacity", 1);
	    //}
	  });

	  //reset the search bar
	  $('#tags').val("")

	  //reset the scale and translate vector
	  networkzoom.scale(1);
	  networkzoom.translate([10, 00]);
	  networksvg.transition().duration(2000).attr('transform', 'translate(' + networkzoom.translate() + ') scale(' + networkzoom.scale() + ')');

	  //hide the selectionArea div
	  $('#selectionArea').hide('slow');
	  $('#gatheringArea').hide('slow');
	  $('#cloningArea').hide('slow');
	  $('#comparingArea').hide('slow');
	  $('#detailLineArea').hide('slow');

	  //reset the network
	  
	  network_force.gravity(dgravity).friction(dfriction).linkDistance(dlinkDistance).linkStrength(dlinkStrength).charge(dcharge).start();

	  if ($('#arrange').val() == "department"){
	    //moves each node towards the normal_center
	    node
	      .attr("cx", function(d) { 
	        return d.x += (normal_center.x - d.x) * 0.12 * network_force.alpha();
	        })
	      .attr("cy", function(d) { 
	        return d.y += (normal_center.y - d.y) * 0.12 * network_force.alpha(); 
	        })
	      .style("stroke", "gray")
	      .style("stroke-width", "1px")
	      ;

	    link.attr("x1", function(d) { return d.source.x; })
	      .attr("y1", function(d) { return d.source.y; })
	      .attr("x2", function(d) { return d.target.x; })
	      .attr("y2", function(d) { return d.target.y; });
	  }

	  //reset the radio buttons and checkboxes
	  $('input#filterNodesAll').iCheck('check');
	  $('input#filterGrants').iCheck('check');
	  $('input#filterCo_sups').iCheck('check');
	  $('input#filterCo_pubs').iCheck('check');
	  $('input#gatherMode').iCheck('uncheck');
	  $('input#selectNone').iCheck('check');

	  $('input#gatheringMode').iCheck('uncheck');
	  $('input#motionFreeze').iCheck('uncheck');
	  $('input#freezeNodes').iCheck('uncheck');
	  $('input#scopeNodes').iCheck('uncheck');

	  $('#animateYearPlaceholder').text("");

	  //reset the sliders
	  $('#animateyearrange').slider("option", "values", [2008, 2013]);
	  $('#animateSlider').slider("option", "value", 2013);
	  $('#networkyearrange').slider("option", "values", [2008, 2013]);

	  $('#networkDensitySlider').slider("option", "value", dgravity);
	  $('#networkChargeSlider').slider("option", "value", dcharge);
	  $('#networkFrictionSlider').slider("option", "value", dfriction);
	  $('#networkLinkDistanceSlider').slider("option", "value", dlinkDistance);
	  $('#networkLinkStrengthSlider').slider("option", "value", dlinkStrength);
	  $('#scopeSlider').slider("option", "value", 2013);

	  $('input#animateyear').val('2008 - 2013');
	  $('input#animateSliderYear').val('2013');
	  $('input#networkyear').val('2008 - 2013');

	  $('input#networkDensity').val('');
	  $('input#networkCharge').val('');
	  $('input#networkFriction').val('');
	  $('input#networkLinkDistance').val('');
	  $('input#networkLinkStrength').val('');
	  $('input#scopeYear').val('2013');

	  //clear animation timer
	  clearInterval(int1);
	});// end network reset

	// $('#arrange').change(function() {
	//   if(this.value == "random"){
	//     network_force.linkStrength(dlinkStrength).charge(dcharge).gravity(dgravity).linkDistance(dlinkDistance).start();
	//   }
	//   else if(this.value == "department"){
	//     network_force.linkStrength(0).charge(-250).start();
	//   }
	// });

	//TODO: confliction with filter...
	$('#granularity').change(function() {
	  if(this.value == "individuals"){
	  	//hide the department nodes
	    d3.selectAll("circle.dept").transition().duration(1500).style("opacity", 0).attr("r", 1);
	    d3.selectAll("circle.dept").transition().delay(1500).style("display", "none");
	    //hide the chord diagram
	    d3.selectAll("path.group").transition().duration(1500).style("opacity", 0);
	    d3.selectAll("path.group").transition().delay(1500).style("display", "none");
	    d3.selectAll("path.chord").transition().duration(1500).style("opacity", 0);
	    d3.selectAll("path.chord").transition().delay(1500).style("display", "none");
	    //show the individual nodes
	    d3.selectAll("circle.node").transition().duration(1500).style("opacity", 1).style("display", "");
	    d3.selectAll("line.link").transition().duration(1500).style("opacity", 1).style("display", "");
	  }
	  if(this.value == "departments"){
	  	//hide the individual nodes
	  	d3.selectAll("circle.node").transition().duration(1500).style("opacity", 0);
	    d3.selectAll("circle.node").transition().delay(1500).style("display", "none");
	    d3.selectAll("line.link").transition().duration(1500).style("opacity", 0);
	    d3.selectAll("line.link").transition().delay(1500).style("display", "none");
	    //hide the chord diagram
	    d3.selectAll("path.group").transition().duration(1500).style("opacity", 0);
	    d3.selectAll("path.group").transition().delay(1500).style("display", "none");
	    d3.selectAll("path.chord").transition().duration(1500).style("opacity", 0);
	    d3.selectAll("path.chord").transition().delay(1500).style("display", "none");
	    //show the department nodes
	    d3.selectAll("circle.dept").style("display", "").style("opacity", "0");
	    d3.selectAll("circle.dept").transition().duration(1500).style("opacity", 1).attr("r", function(d){ 
	      //return departmentCounts[d[0]] * 2; 
	      return d.count;
	    })
	    
	  }
	  if(this.value == "departmentsChord") {
	  	//hide the individual nodes
	  	d3.selectAll("circle.node").transition().duration(1500).style("opacity", 0);
	    d3.selectAll("circle.node").transition().delay(1500).style("display", "none");
	    d3.selectAll("line.link").transition().duration(1500).style("opacity", 0);
	    d3.selectAll("line.link").transition().delay(1500).style("display", "none");
	    //hide the department nodes
	    d3.selectAll("circle.dept").transition().duration(1500).style("opacity", 0).attr("r", 1);
	    d3.selectAll("circle.dept").transition().delay(1500).style("display", "none");
	    //build chord diagram
	    if(!chord_constructed)
	    	constructChord();
	    d3.selectAll("path.group").style("display", "").style("opacity", 0);
	    d3.selectAll("path.group").transition().duration(1500).style("opacity", 1);
	    d3.selectAll("path.chord").style("display", "").style("opacity", 0);
	    d3.selectAll("path.chord").transition().duration(1500).style("opacity", 0.8);
	  }
	});

	$('#tasks').change(function() {

	  if(this.value == "ii_clusters") {
	    networkzoom.scale(0.4);
	    networkzoom.translate([350, 250]);
	    networksvg.transition().duration(2000).attr('transform', 'translate(' + networkzoom.translate() + ') scale(' + networkzoom.scale() + ')');
	    setTimeout(function() {
	      network_force.start().gravity(-0.1).friction(dfriction);
	    }, 2000);
	  
	    //filter out all nodes that have no connections
	    setTimeout(function() {
	      d3.selectAll("circle.node").each( function () {
	      var that = this;//because of the nested loop
	        var match = false;
	        d3.selectAll("line.link").each( function() {
	            if (((this["x1"].animVal.value == that["cx"].animVal.value && this["y1"].animVal.value == that["cy"].animVal.value) || (this["x2"].animVal.value == that["cx"].animVal.value && this["y2"].animVal.value == that["cy"].animVal.value))){ //if there is a link to the current node set the boolean flag to true
	             match = true;
	           }
	        }); 
	        if (match == false){
	          d3.select(this).transition().duration(1000).style("opacity", 0).attr("r", 0);
	          d3.select(this).transition().delay(1000).style("visibility", "hidden");
	          
	        }
	        else {
	          d3.select(this).style("visibility", "visible").style("opacity", 1);
	        }
	      });
	    }, 3000);//end setTimout

	  }
	})
	

	$('#translate').change(function () {

	  if (this.value == "matrix"){
	    //hide the network and show the matrix
	    $('#networkviz').hide();
	    $('#matrixviz').show();
	    $('#networkactions').hide('slow');
	    $('#matrixactions').show('slow');
	    //if matrix has not yet been constructed, construct it
	    if(!matrix_constructed)
	      constructMatrix();
	    $('#translate').val('').trigger('liszt:updated'); 
	  }
	});

	$('#translatematrix').change(function () {

	  if (this.value == "network"){
	    //hide the matrix and show the network
	    $('#matrixviz').hide();
	    $('#networkviz').show();
	    $('#matrixactions').hide('slow');
	    $('#networkactions').show('slow');
	    $('#matrixdepartmentlegend').hide();
	  	$('#matrixcollaborationlegend').hide();
	    //if network is not yet constructed, construct it
	    if(!network_constructed)
	      constructNetwork();
	    else
	      network_force.start();
	    $('#translatematrix').val('').trigger('liszt:updated'); 

	  }

	  else if (this.value == "bar"){
	  	//hide the matrix (some of it, anyway) and show the bar graph
	  	d3.selectAll("rect.matrixcell").each(function() {
	  		d3.select(this).transition().duration(1000).style("visibility", "hidden");
	  	});
	  	d3.selectAll(".matrixcolumn text").each(function() {
	  		d3.select(this).transition().duration(1000).style("visibility", "hidden");
	  	});
	  	d3.selectAll(".matrixcolumn line").each(function() {
	  		d3.select(this).transition().duration(1000).style("visibility", "hidden");
	  	});
	  	d3.selectAll(".matrixrowbar").each(function() {
	  		d3.select(this).transition().delay(1000).duration(1000).style("visibility", "visible");
	  	});
	  	d3.select(".x.axis").transition().delay(1000).duration(1000).style("visibility", "visible");

	  	$('#matrixdepartmentlegend').hide();
	  	$('#matrixcollaborationlegend').hide();

	  	//update translation options
	  	$('#translatematrix').html("<option value=\"bar\">bar (current)</option><option value=\"matrix\">matrix</option><option value=\"network\">network</option>");
	  	$('#translatematrix').val('bar').trigger('liszt:updated');
	  }

	  else if (this.value == "matrix"){
	  	d3.selectAll("rect.matrixcell").each(function() {
	  		d3.select(this).style("visibility", "visible");
	  	});
	  	d3.selectAll(".matrixcolumn text").each(function() {
	  		d3.select(this).style("visibility", "visible");
	  	});
	  	d3.selectAll(".matrixcolumn line").each(function() {
	  		d3.select(this).style("visibility", "visible");
	  	});	  	
	  	d3.selectAll(".matrixrowbar").each(function() {
	  		d3.select(this).style("visibility", "hidden");
	  	});

	  	d3.select(".x.axis").style("visibility", "hidden");	 

	  	$('#matrixdepartmentlegend').show(); 
	  	$('#matrixcollaborationlegend').show();	

	  	//update translation options
	  	$('#translatematrix').html("<option value=\"matrix\">matrix (current)</option><option value=\"bar\">bar graph</option><option value=\"network\">network</option>");
	  	$('#translatematrix').val('matrix').trigger('liszt:updated');	  	
	  }
	});

	/* ---------------------------------------------------------------------

	 						MATRIX FILTERING

	   --------------------------------------------------------------------- 
	*/
	//update the matrix if radio button selections change
	$('input#matrixFilterAND').on('ifChecked', function() {
		if ($('input#matrixFilterCo_pubs').is(':checked'))
			pubsChecked();
		else
			pubsUnchecked();
	});
	$('input#matrixFilterOR').on('ifChecked', function() {
		if ($('input#matrixFilterCo_pubs').is(':checked'))
			pubsChecked();
		else
			pubsUnchecked();
	});
	$('input#matrixFilterEXCLUSIVE').on('ifChecked', function() {
		if ($('input#matrixFilterCo_pubs').is(':checked'))
			pubsChecked();
		else
			pubsUnchecked();
	});
	$('input#matrixFilterINCLUSIVE').on('ifChecked', function() {
		if ($('input#matrixFilterCo_pubs').is(':checked'))
			pubsChecked();
		else
			pubsUnchecked();
	});	

	/*
	updates the matrix collaboration legend (colored divs)
	@params: status: array that encodes the binary status of all 7 divs (either 1 or 0)
	@returns: none
	*/
	function updateMatrixCollabLegend (status) {
		var converted = [];
		//this allows for converting the status to an opacity
		_.each(status, function(x) {
			if (x == 1)
				converted.push(x);
			else
				converted.push(0.1);
		})
		$('#matrixlegendpub').css("opacity", converted[0] );
		$('#matrixlegendsup').css("opacity", converted[1] );
		$('#matrixlegendgrant').css("opacity", converted[2] );
		$('#matrixlegendpubsup').css("opacity", converted[3] );
		$('#matrixlegendsupgrant').css("opacity", converted[4] );
		$('#matrixlegendpubgrant').css("opacity", converted[5] );
		$('#matrixlegendpubsupgrant').css("opacity", converted[6] );		
	}

	function pubsChecked () {

			//four possibilities for the combination of checkboxes

			//neither grants nor supervisions is checked
			if ($('input#matrixFilterCo_grants').is(':checked')==false && $('input#matrixFilterCo_sups').is(':checked')==false) {
				//hide multiple and show options for single filtering (exclusive/inclusive)
				$('#matrixFilterTypeMultiple').hide(0);$('#matrixFilterTypeSingle').show(0);

				updateMatrixCollabLegend([1,0,0,0,0,0,0]);

				d3.selectAll("rect.matrixcell").each(function(d) {
					var notfiltered = (this.attributes.labelfiltered == null || this.attributes.labelfiltered.value == 0) && (this.attributes.searchfiltered == null || this.attributes.searchfiltered.value == 0);
	
					if ($('input#matrixFilterEXCLUSIVE').is(':checked')) {
						if(d.copub > 0 && d.grant == 0 && d.cosup == 0) {
							d3.selectAll(".matrixrowbar").attr("width", function(d) { return d.P_S_G*4; });
							d3.select(this).style("fill", "#E1B2D7")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub]); return matrix_z(d.copub); });					
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");
						}
						else {
								d3.select(this).style("visibility", "hidden");
						}
					}
					else {
						if(d.copub > 0) {
							d3.selectAll(".matrixrowbar").attr("width", function(d) { return d.copubs*4; });
							d3.select(this).style("fill", "#E1B2D7")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub]); return matrix_z(d.copub); });					
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");
						}	
						else
							d3.select(this).style("visibility", "hidden");					
					}
				});	
			}

			//not grants and supervisions	
			else if ($('input#matrixFilterCo_grants').is(':checked')==false && $('input#matrixFilterCo_sups').is(':checked')) {
				//hide single and show options for multiple filtering (union/intersection)
				$('#matrixFilterTypeSingle').hide(0);$('#matrixFilterTypeMultiple').show(0);				


				d3.selectAll("rect.matrixcell").each(function(d) {
					var notfiltered = (this.attributes.labelfiltered == null || this.attributes.labelfiltered.value == 0) && (this.attributes.searchfiltered == null || this.attributes.searchfiltered.value == 0);	
					if($('input#matrixFilterAND').is(':checked')){

						updateMatrixCollabLegend([0,0,0,1,0,0,0]);

						if(d.copub > 0 && d.grant == 0 && d.cosup > 0) {
							d3.selectAll(".matrixrowbar").attr("width", function(d) { return d.PS_G*4; });
							d3.select(this).style("fill", "#9BD0E3")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_cosup]); return matrix_z(d.copub+d.cosup); });					
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible");
							else
								d3.select(this).style("visibility", "hidden");	 					
						}
						else
							d3.select(this).style("visibility", "hidden");						
					}
					else{

						updateMatrixCollabLegend([1,1,0,1,0,0,0]);

						d3.selectAll(".matrixrowbar").attr("width", function(d) { return (d.copubs+d.cosups)*4; });

						if(d.copub > 0 && d.cosup > 0) {

							d3.select(this).style("fill", "#9BD0E3")
											.style("opacity", function(d) { matrix_z.domain([0,max_cosup+max_copub]); return matrix_z(d.cosup+d.copub); });	
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");						
						}				
						else if(d.copub > 0 && d.cosup == 0) {
							d3.select(this).style("fill", "#E1B2D7")
											.style("opacity", function(d) { matrix_z.domain([0,max_cosup+max_copub]); return matrix_z(d.copub); });						
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");						
						}
						else if(d.copub == 0 && d.cosup > 0) {
							d3.select(this).style("fill", "#D5E067")
											.style("opacity", function(d) { matrix_z.domain([0,max_cosup+max_copub]); return matrix_z(d.cosup); });						
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");						
						}																							
					}
				});	
			}

			//grants and not supervisions
			else if ($('input#matrixFilterCo_grants').is(':checked') && $('input#matrixFilterCo_sups').is(':checked')==false) {
				//hide single and show options for multiple filtering (union/intersection)
				$('#matrixFilterTypeSingle').hide(0);$('#matrixFilterTypeMultiple').show(0);				


				d3.selectAll("rect.matrixcell").each(function(d) {
					var notfiltered = (this.attributes.labelfiltered == null || this.attributes.labelfiltered.value == 0) && (this.attributes.searchfiltered == null || this.attributes.searchfiltered.value == 0);
					if($('input#matrixFilterAND').is(':checked')){

						updateMatrixCollabLegend([0,0,0,0,0,1,0]);

						d3.selectAll(".matrixrowbar").attr("width", function(d) { return (d.P_SG)*4; });

						if(d.copub > 0 && d.grant > 0 && d.cosup == 0) {
							d3.select(this).style("fill", "#F0A487")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_grant]); return matrix_z(d.copub+d.grant); });					
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");							
						}
						else
							d3.select(this).style("visibility", "hidden");					
					}
					else{

						updateMatrixCollabLegend([1,0,1,0,0,1,0]);

						d3.selectAll(".matrixrowbar").attr("width", function(d) { return (d.copubs+d.grants)*4; });

						if(d.copub > 0 && d.grant > 0) {
							d3.select(this).style("fill", "#F0A487")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_grant]); return matrix_z(d.copub+d.grant); });	
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");						
						}										
						else if(d.copub > 0 && d.grant == 0) {
							d3.select(this).style("fill", "#E1B2D7")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_grant]); return matrix_z(d.copub); });						
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");						
						}					
						else if(d.copub == 0 && d.grant > 0) {
							d3.select(this).style("fill", "#79DEC0")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_grant]); return matrix_z(d.grant); });						
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");						
						}					
					}
				});	
			}

			//grants and supervisions	
			else if ($('input#matrixFilterCo_grants').is(':checked') && $('input#matrixFilterCo_sups').is(':checked')) {				


				d3.selectAll("rect.matrixcell").each(function(d) {
					var notfiltered = (this.attributes.labelfiltered == null || this.attributes.labelfiltered.value == 0) && (this.attributes.searchfiltered == null || this.attributes.searchfiltered.value == 0);
					if($('input#matrixFilterAND').is(':checked')){

						updateMatrixCollabLegend([0,0,0,0,0,0,1]);

						d3.selectAll(".matrixrowbar").attr("width", function(d) { return (d.PSG)*4; });

						if(d.copub > 0 && d.grant > 0 && d.cosup > 0) {
							d3.select(this).style("fill", "#DCBE6B")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_cosup+max_grant]); return matrix_z(d.copub+d.cosup+d.grant); });					
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");													
						}
						else
							d3.select(this).style("visibility", "hidden");						
					}
					else{

						updateMatrixCollabLegend([1,1,1,1,1,1,1]);

						d3.selectAll(".matrixrowbar").attr("width", function(d) { return (d.copubs+d.cosups+d.grants)*4; });

						if(d.copub > 0 && d.grant > 0 && d.cosup > 0) {
							d3.select(this).style("fill", "#DCBE6B")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_cosup+max_grant]); return matrix_z(d.copub+d.cosup+d.grant); });					
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");						
						}					
						else if(d.copub > 0 && d.grant > 0 && d.cosup == 0) {
							d3.select(this).style("fill", "#F0A487")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_cosup+max_grant]); return matrix_z(d.copub+d.grant); });	
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");						
						}				
						//if supervisions and not grants and not publications
						else if(d.cosup > 0 && d.grant == 0 && d.copub == 0) {
							d3.select(this).style("fill", "#D5E067")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_cosup+max_grant]); return matrix_z(d.cosup); });	
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible");
							else
								d3.select(this).style("visibility", "hidden");							 
						}	
						//if supervisions and not grants and publications
						else if(d.cosup > 0 && d.grant == 0 && d.copub > 0) {
							d3.select(this).style("fill", "#9BD0E3")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_cosup+max_grant]); return matrix_z(d.cosup+d.copub); });	
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible");
							else
								d3.select(this).style("visibility", "hidden");							 
						}
						//if supervisions and grants and not publications
						else if(d.cosup > 0 && d.grant > 0 && d.copub == 0) {
							d3.select(this).style("fill", "#A0E191")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_cosup+max_grant]); return matrix_z(d.cosup+d.grant); });	
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible");
							else
								d3.select(this).style("visibility", "hidden");							 
						}
						else if(d.copub > 0 && d.grant == 0 && d.cosup == 0) {
							d3.select(this).style("fill", "#E1B2D7")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_cosup+max_grant]); return matrix_z(d.copub); });						
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");						
						}
						else if(d.copub == 0 && d.grant > 0 && d.cosup == 0) {
							d3.select(this).style("fill", "#79DEC0")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_cosup+max_grant]); return matrix_z(d.grant); });						
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");						
						}					
					}
				});
			}
			//if the matrix is currently arranged according to count
			if ($('#order').val() == "count")
				order("count"); //re-arrange it to reflect the checkbox behavior		
		} //end pubsChecked

	function pubsUnchecked () {		

			//four possibilities for the combination of checkboxes

			//neither grants or supervisions is checked
			if ($('input#matrixFilterCo_grants').is(':checked')==false && $('input#matrixFilterCo_sups').is(':checked')==false) {			
				//hide multiple and single show options for filtering
				$('#matrixFilterTypeMultiple').hide(0);$('#matrixFilterTypeSingle').hide(0);

				updateMatrixCollabLegend([0,0,0,0,0,0,0]);

				d3.selectAll(".matrixrowbar").attr("width", function(d) { return 0; });

				d3.selectAll("rect.matrixcell").each(function(d) {
					if(d.copub > 0) 
						d3.select(this).style("visibility", "hidden");	 
				});	
			}

			//not grants and supervisions	
			else if ($('input#matrixFilterCo_grants').is(':checked')==false && $('input#matrixFilterCo_sups').is(':checked')) {
				//hide multiple and show options for single filtering (exclusive/inclusive)
				$('#matrixFilterTypeMultiple').hide(0);$('#matrixFilterTypeSingle').show(0);

				updateMatrixCollabLegend([0,1,0,0,0,0,0]);					

				d3.selectAll("rect.matrixcell").each(function(d) {
					var notfiltered = (this.attributes.labelfiltered == null || this.attributes.labelfiltered.value == 0) && (this.attributes.searchfiltered == null || this.attributes.searchfiltered.value == 0);
					if ($('input#matrixFilterEXCLUSIVE').is(':checked')){
						if(d.cosup > 0 && d.grant == 0 && d.copub == 0) {
							d3.selectAll(".matrixrowbar").attr("width", function(d) { return d._PS_G*4; });
							d3.select(this).style("fill", "#D5E067")
											.style("opacity", function(d) { matrix_z.domain([0,max_cosup]); return matrix_z(d.cosup); });					
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");
						}
						else {
								d3.select(this).style("visibility", "hidden");
						}
					}	
					else {
						if(d.cosup > 0) {
							d3.selectAll(".matrixrowbar").attr("width", function(d) { return d.cosups*4; });
							d3.select(this).style("fill", "#D5E067")
											.style("opacity", function(d) { matrix_z.domain([0,max_cosup]); return matrix_z(d.cosup); });					
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");
						}	
						else
							d3.select(this).style("visibility", "hidden");					
					}				
				});	
			}

			//grants and not supervisions
			else if ($('input#matrixFilterCo_grants').is(':checked') && $('input#matrixFilterCo_sups').is(':checked')==false) {
				//hide multiple and show options for single filtering (exclusive/inclusive)
				$('#matrixFilterTypeMultiple').hide(0);$('#matrixFilterTypeSingle').show(0);

				updateMatrixCollabLegend([0,0,1,0,0,0,0]);					

				d3.selectAll("rect.matrixcell").each(function(d) {
					var notfiltered = (this.attributes.labelfiltered == null || this.attributes.labelfiltered.value == 0) && (this.attributes.searchfiltered == null || this.attributes.searchfiltered.value == 0);
					if ($('input#matrixFilterEXCLUSIVE').is(':checked')){
						if(d.grant > 0 && d.cosup == 0 && d.copub == 0) {
							d3.selectAll(".matrixrowbar").attr("width", function(d) { return d._P_SG*4; });
							d3.select(this).style("fill", "#79DEC0")
											.style("opacity", function(d) { matrix_z.domain([0,max_grant]); return matrix_z(d.grant); });					
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible");
							else
								d3.select(this).style("visibility", "hidden"); 
						}
						else {
								d3.select(this).style("visibility", "hidden");
						}
					}
					else {
						if(d.grant > 0) {
							d3.selectAll(".matrixrowbar").attr("width", function(d) { return d.grants*4; });
							d3.select(this).style("fill", "#79DEC0")
											.style("opacity", function(d) { matrix_z.domain([0,max_grant]); return matrix_z(d.grant); });					
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden"); 
						}
						else
							d3.select(this).style("visibility", "hidden");						
					}				
				});	
			}

			//grants and supervisions	
			else if ($('input#matrixFilterCo_grants').is(':checked') && $('input#matrixFilterCo_sups').is(':checked')) {


				d3.selectAll("rect.matrixcell").each(function(d) {
					var notfiltered = (this.attributes.labelfiltered == null || this.attributes.labelfiltered.value == 0) && (this.attributes.searchfiltered == null || this.attributes.searchfiltered.value == 0);
					if($('input#matrixFilterAND').is(':checked')){

						updateMatrixCollabLegend([0,0,0,0,1,0,0]);

						d3.selectAll(".matrixrowbar").attr("width", function(d) { return d._PSG*4; });

						if(d.copub == 0 && d.grant > 0 && d.cosup > 0) {
							d3.select(this).style("fill", "#A0E191")
											.style("opacity", function(d) { matrix_z.domain([0,max_cosup+max_grant]); return matrix_z(d.cosup+d.grant); });					
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else //if currently filtered
								d3.select(this).style("visibility", "hidden");
						}
						else {
							//hide it
							d3.select(this).style("visibility", "hidden");						
						}
					}
					else{

						updateMatrixCollabLegend([0,1,1,0,1,0,0]);

						d3.selectAll(".matrixrowbar").attr("width", function(d) { return (d.grants+d.cosups)*4; });

						if(d.grant > 0 && d.cosup > 0) {
							d3.select(this).style("fill", "#A0E191")
											.style("opacity", function(d) { matrix_z.domain([0,max_cosup+max_grant]); return matrix_z(d.cosup+d.grant); });					
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");
						}				
						else if(d.grant > 0 && d.cosup == 0) {
							d3.select(this).style("fill", "#79DEC0")
											.style("opacity", function(d) { matrix_z.domain([0,max_cosup+max_grant]); return matrix_z(d.grant); });	
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");						
						}				
						//if supervisions and not grants and publications
						else if(d.grant == 0 && d.cosup > 0) {
							d3.select(this).style("fill", "#D5E067")
											.style("opacity", function(d) { matrix_z.domain([0,max_cosup+max_grant]); return matrix_z(d.cosup); });	
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");						
						}
						else {
							//hide it
							d3.select(this).style("visibility", "hidden");							
						}
					}
				});
			}
			//if the matrix is currently arranged according to count
			if ($('#order').val() == "count")
				order("count"); //re-arrange it to reflect the checkbox behavior
		} //end pubsUnchecked

	function supsChecked () {	
			
			//four possibilities for the combination of checkboxes

			//neither grants or publications is checked
			if ($('input#matrixFilterCo_grants').is(':checked')==false && $('input#matrixFilterCo_pubs').is(':checked')==false) {
				//hide multiple and show options for single filtering (exclusive/inclusive)
				$('#matrixFilterTypeMultiple').hide(0);$('#matrixFilterTypeSingle').show(0);

				updateMatrixCollabLegend([0,1,0,0,0,0,0]);				

				d3.selectAll("rect.matrixcell").each(function(d) {
					var notfiltered = (this.attributes.labelfiltered == null || this.attributes.labelfiltered.value == 0) && (this.attributes.searchfiltered == null || this.attributes.searchfiltered.value == 0);
					if ($('input#matrixFilterEXCLUSIVE').is(':checked')){
						if(d.cosup > 0 && d.grant == 0 && d.copub == 0) {
							d3.selectAll(".matrixrowbar").attr("width", function(d) { return d._PS_G*4; });
							d3.select(this).style("fill", "#D5E067")
											.style("opacity", function(d) { matrix_z.domain([0,max_cosup]); return matrix_z(d.cosup); });					
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");
						}
						else {
								d3.select(this).style("visibility", "hidden");
						}
					}	
					else {
						if(d.cosup > 0) {
							d3.selectAll(".matrixrowbar").attr("width", function(d) { return d.cosups*4; });
							d3.select(this).style("fill", "#D5E067")
											.style("opacity", function(d) { matrix_z.domain([0,max_cosup]); return matrix_z(d.cosup); });					
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");
						}
						else
							d3.select(this).style("visibility", "hidden");							
					}
				});	
			}

			//not grants and publications	
			else if ($('input#matrixFilterCo_grants').is(':checked')==false && $('input#matrixFilterCo_pubs').is(':checked')) {
				//hide single and show options for multiple filtering (union/intersection)
				$('#matrixFilterTypeSingle').hide(0);$('#matrixFilterTypeMultiple').show(0);					

				d3.selectAll("rect.matrixcell").each(function(d) {
					var notfiltered = (this.attributes.labelfiltered == null || this.attributes.labelfiltered.value == 0) && (this.attributes.searchfiltered == null || this.attributes.searchfiltered.value == 0);
					if($('input#matrixFilterAND').is(':checked')){

						updateMatrixCollabLegend([0,0,0,1,0,0,0]);

						d3.selectAll(".matrixrowbar").attr("width", function(d) { return d.PS_G*4; });

						if(d.cosup > 0 && d.grant == 0 && d.copub > 0) {
							d3.select(this).style("fill", "#9BD0E3")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_cosup]); return matrix_z(d.copub+d.cosup); });					
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");													
						}
						else
							d3.select(this).style("visibility", "hidden");						
					}
					else{

						updateMatrixCollabLegend([1,1,0,1,0,1,0]);

						d3.selectAll(".matrixrowbar").attr("width", function(d) { return (d.cosup+d.copub)*4; });

						if(d.cosup > 0 && d.copub > 0) {
							d3.select(this).style("fill", "#9BD0E3")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_cosup]); return matrix_z(d.copub+d.cosup); });	
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");						
						}				
						else if(d.cosup > 0 && d.copub == 0) {
							d3.select(this).style("fill", "#D5E067")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_cosup]); return matrix_z(d.cosup); });						
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");						
						}
						else if(d.cosup == 0 && d.copub > 0) {
							d3.select(this).style("fill", "#E1B2D7")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_cosup]); return matrix_z(d.copub); });						
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");						
						}					
					}
				});	
			}

			//grants and not publications
			else if ($('input#matrixFilterCo_grants').is(':checked') && $('input#matrixFilterCo_pubs').is(':checked')==false) {
				//hide single and show options for multiple filtering (union/intersection)
				$('#matrixFilterTypeSingle').hide(0);$('#matrixFilterTypeMultiple').show(0);				

				d3.selectAll("rect.matrixcell").each(function(d) {
					var notfiltered = (this.attributes.labelfiltered == null || this.attributes.labelfiltered.value == 0) && (this.attributes.searchfiltered == null || this.attributes.searchfiltered.value == 0);
					if($('input#matrixFilterAND').is(':checked')){

						updateMatrixCollabLegend([0,0,0,0,1,0,0]);

						d3.selectAll(".matrixrowbar").attr("width", function(d) { return d._PSG*4; });

						if(d.cosup > 0 && d.grant > 0 && d.copub == 0) {
							d3.select(this).style("fill", "#A0E191")
											.style("opacity", function(d) { matrix_z.domain([0,max_cosup+max_grant]); return matrix_z(d.cosup+d.grant); });					
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");														
						}
						else
							d3.select(this).style("visibility", "hidden");					
					}
					else{

						updateMatrixCollabLegend([0,1,1,0,1,0,0]);

						d3.selectAll(".matrixrowbar").attr("width", function(d) { return(d.cosups+d.grants)*4; });

						if(d.cosup > 0 && d.grant > 0) {
							d3.select(this).style("fill", "#A0E191")
											.style("opacity", function(d) { matrix_z.domain([0,max_cosup+max_grant]); return matrix_z(d.cosup+d.grant); });	
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");						
						}				
						else if(d.cosup > 0 && d.grant == 0) {
							d3.select(this).style("fill", "#D5E067")
											.style("opacity", function(d) { matrix_z.domain([0,max_cosup+max_grant]); return matrix_z(d.cosup); });						
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");						
						}
						else if(d.cosup == 0 && d.grant > 0) {
							d3.select(this).style("fill", "#79DEC0")
											.style("opacity", function(d) { matrix_z.domain([0,max_cosup+max_grant]); return matrix_z(d.grant); });						
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");						
						}					
					}
				});	
			}

			//grants and publications	
			else if ($('input#matrixFilterCo_grants').is(':checked') && $('input#matrixFilterCo_pubs').is(':checked')) {
				d3.selectAll("rect.matrixcell").each(function(d) {
					var notfiltered = (this.attributes.labelfiltered == null || this.attributes.labelfiltered.value == 0) && (this.attributes.searchfiltered == null || this.attributes.searchfiltered.value == 0);
					if($('input#matrixFilterAND').is(':checked')){

						updateMatrixCollabLegend([0,0,0,0,0,0,1]);

						d3.selectAll(".matrixrowbar").attr("width", function(d) { return d.PSG*4; });

						if(d.copub > 0 && d.grant > 0 && d.cosup > 0) {
							d3.select(this).style("fill", "#DCBE6B")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_cosup+max_grant]); return matrix_z(d.copub+d.cosup+d.grant); });					
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");														
						}
						else
							d3.select(this).style("visibility", "hidden");					
					}
					else{

						updateMatrixCollabLegend([1,1,1,1,1,1,1]);

						d3.selectAll(".matrixrowbar").attr("width", function(d) { return (d.grants+d.cosups+d.copubs)*4; });

						if(d.copub > 0 && d.grant > 0 && d.cosup > 0) {
							d3.select(this).style("fill", "#DCBE6B")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_cosup+max_grant]); return matrix_z(d.copub+d.cosup+d.grant); });					
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");						
						}					
						else if(d.copub > 0 && d.grant > 0 && d.cosup == 0) {
							d3.select(this).style("fill", "#F0A487")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_cosup+max_grant]); return matrix_z(d.copub+d.grant); });	
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");						
						}				
						//if supervisions and not grants and not publications
						else if(d.cosup > 0 && d.grant == 0 && d.copub == 0) {
							d3.select(this).style("fill", "#D5E067")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_cosup+max_grant]); return matrix_z(d.cosup); });	
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");						
						}	
						//if supervisions and not grants and publications
						else if(d.cosup > 0 && d.grant == 0 && d.copub > 0) {
							d3.select(this).style("fill", "#9BD0E3")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_cosup+max_grant]); return matrix_z(d.cosup+d.copub); });	
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");						
						}
						//if supervisions and grants and not publications
						else if(d.cosup > 0 && d.grant > 0 && d.copub == 0) {
							d3.select(this).style("fill", "#A0E191")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_cosup+max_grant]); return matrix_z(d.cosup+d.grant); });	
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");						
						}
						else if(d.copub > 0 && d.grant == 0 && d.cosup == 0) {
							d3.select(this).style("fill", "#E1B2D7")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_cosup+max_grant]); return matrix_z(d.copub); });						
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible");
							else
								d3.select(this).style("visibility", "hidden");							 
						}
						else if(d.copub == 0 && d.grant > 0 && d.cosup == 0) {
							d3.select(this).style("fill", "#79DEC0")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_cosup+max_grant]); return matrix_z(d.grant); });						
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");						
						}					
					}
				});
			}
			//if the matrix is currently arranged according to count
			if ($('#order').val() == "count")
				order("count"); //re-arrange it to reflect the checkbox behavior	
		} //end supsChecked

	function supsUnchecked () {		
					
			//four possibilities for the combination of checkboxes

			//neither grants or publications is checked
			if ($('input#matrixFilterCo_grants').is(':checked')==false && $('input#matrixFilterCo_pubs').is(':checked')==false) {
				//hide multiple and single show options for filtering
				$('#matrixFilterTypeMultiple').hide(0);$('#matrixFilterTypeSingle').hide(0);	

				updateMatrixCollabLegend([0,0,0,0,0,0,0]);	

				d3.selectAll(".matrixrowbar").attr("width", function(d) { return 0; });		

				d3.selectAll("rect.matrixcell").each(function(d) {
					if(d.cosup > 0) 
						d3.select(this).style("visibility", "hidden");	 
				});	
			}

			//not grants and publications	
			else if ($('input#matrixFilterCo_grants').is(':checked')==false && $('input#matrixFilterCo_pubs').is(':checked')) {
				//hide multiple and show options for single filtering (exclusive/inclusive)
				$('#matrixFilterTypeMultiple').hide(0);$('#matrixFilterTypeSingle').show(0);	

				updateMatrixCollabLegend([1,0,0,0,0,0,0]);				

				d3.selectAll("rect.matrixcell").each(function(d) {
					var notfiltered = (this.attributes.labelfiltered == null || this.attributes.labelfiltered.value == 0) && (this.attributes.searchfiltered == null || this.attributes.searchfiltered.value == 0);
					if ($('input#matrixFilterEXCLUSIVE').is(':checked')) {
						if(d.copub > 0 && d.grant == 0 && d.cosup == 0) {
							d3.selectAll(".matrixrowbar").attr("width", function(d) { return d.P_S_G*4; });
							d3.select(this).style("fill", "#E1B2D7")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub]); return matrix_z(d.copub); });					
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");
						}
						else {
								d3.select(this).style("visibility", "hidden");
						}
					}
					else {
						if(d.copub > 0) {
							d3.selectAll(".matrixrowbar").attr("width", function(d) { return d.copubs*4; });
							d3.select(this).style("fill", "#E1B2D7")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub]); return matrix_z(d.copub); });					
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");
						}	
						else
							d3.select(this).style("visibility", "hidden");					
					}				
				});	
			}

			//grants and not publications
			else if ($('input#matrixFilterCo_grants').is(':checked') && $('input#matrixFilterCo_pubs').is(':checked')==false) {
				//hide multiple and show options for single filtering (exclusive/inclusive)
				$('#matrixFilterTypeMultiple').hide(0);$('#matrixFilterTypeSingle').show(0);	

				updateMatrixCollabLegend([0,0,1,0,0,0,0]);				

				d3.selectAll("rect.matrixcell").each(function(d) {
					var notfiltered = (this.attributes.labelfiltered == null || this.attributes.labelfiltered.value == 0) && (this.attributes.searchfiltered == null || this.attributes.searchfiltered.value == 0);
					if ($('input#matrixFilterEXCLUSIVE').is(':checked')){
						if(d.grant > 0 && d.cosup == 0 && d.copub == 0) {
							d3.selectAll(".matrixrowbar").attr("width", function(d) { return d._P_SG*4; });
							d3.select(this).style("fill", "#79DEC0")
											.style("opacity", function(d) { matrix_z.domain([0,max_grant]); return matrix_z(d.grant); });					
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible");
							else
								d3.select(this).style("visibility", "hidden"); 
						}
						else {
							if (d.grant > 0)
								d3.select(this).style("visibility", "hidden");
						}
					}
					else {
						if(d.grant > 0) {
							d3.selectAll(".matrixrowbar").attr("width", function(d) { return d.grants*4; });
							d3.select(this).style("fill", "#79DEC0")
											.style("opacity", function(d) { matrix_z.domain([0,max_grant]); return matrix_z(d.grant); });					
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden"); 
						}						
					}				
				});	
			}

			//grants and publications	
			else if ($('input#matrixFilterCo_grants').is(':checked') && $('input#matrixFilterCo_pubs').is(':checked')) {
				d3.selectAll("rect.matrixcell").each(function(d) {
					var notfiltered = (this.attributes.labelfiltered == null || this.attributes.labelfiltered.value == 0) && (this.attributes.searchfiltered == null || this.attributes.searchfiltered.value == 0);
					if($('input#matrixFilterAND').is(':checked')){

						updateMatrixCollabLegend([0,0,0,1,0,0,0]);

						d3.selectAll(".matrixrowbar").attr("width", function(d) { return d.P_SG*4; });

						if(d.cosup == 0 && d.grant > 0 && d.copub > 0) {
							d3.select(this).style("fill", "#F0A487")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_grant]); return matrix_z(d.copub+d.grant); });					
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
						else //if currently filtered
							d3.select(this).style("visibility", "hidden");							
						}
						else {
							//hide it
							d3.select(this).style("visibility", "hidden");						
						}
					}
					else{

						updateMatrixCollabLegend([1,0,1,0,0,1,0]);

						d3.selectAll(".matrixrowbar").attr("width", function(d) { return (d.grants+d.copubs)*4; });

						if(d.grant > 0 && d.copub > 0) {
							d3.select(this).style("fill", "#F0A487")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_grant]); return matrix_z(d.copub+d.grant); });					
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else //if currently filtered
								d3.select(this).style("visibility", "hidden");							
						}				
						else if(d.grant > 0 && d.copub == 0) {
							d3.select(this).style("fill", "#79DEC0")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_grant]); return matrix_z(d.grant); });	
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else //if currently filtered
									d3.select(this).style("visibility", "hidden");						
						}				
						//if supervisions and not grants and publications
						else if(d.grant == 0 && d.copub > 0) {
							d3.select(this).style("fill", "#E1B2D7")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_grant]); return matrix_z(d.copub); });	
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
									d3.select(this).style("visibility", "visible");
							else //if currently filtered
									d3.select(this).style("visibility", "hidden");							 
						}
						else {
							//hide it
							d3.select(this).style("visibility", "hidden");							
						}
					}
				});
			}
			//if the matrix is currently arranged according to count
			if ($('#order').val() == "count")
				order("count"); //re-arrange it to reflect the checkbox behavior			
		} //end supsUnchecked

	function grantsChecked () {		
					
			//four possibilities for the combination of checkboxes

			//neither supervisions or publications is checked
			if ($('input#matrixFilterCo_sups').is(':checked')==false && $('input#matrixFilterCo_pubs').is(':checked')==false) {
				//hide multiple and show options for single filtering (exclusive/inclusive)
				$('#matrixFilterTypeMultiple').hide(0);$('#matrixFilterTypeSingle').show(0);	

				updateMatrixCollabLegend([0,0,1,0,0,0,0]);			

				d3.selectAll("rect.matrixcell").each(function(d) {
					var notfiltered = (this.attributes.labelfiltered == null || this.attributes.labelfiltered.value == 0) && (this.attributes.searchfiltered == null || this.attributes.searchfiltered.value == 0);
					if ($('input#matrixFilterEXCLUSIVE').is(':checked')){
						d3.selectAll(".matrixrowbar").attr("width", function(d) { return d._P_SG*4; });
						if(d.grant > 0 && d.cosup == 0 && d.copub == 0) {
							d3.select(this).style("fill", "#79DEC0")
											.style("opacity", function(d) { matrix_z.domain([0,max_grant]); return matrix_z(d.grant); });					
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible");
							else
								d3.select(this).style("visibility", "hidden"); 
						}
						else {
								d3.select(this).style("visibility", "hidden");
						}
					}
					else {
						if(d.grant > 0) {
							d3.selectAll(".matrixrowbar").attr("width", function(d) { return d.grants*4; });
							d3.select(this).style("fill", "#79DEC0")
											.style("opacity", function(d) { matrix_z.domain([0,max_grant]); return matrix_z(d.grant); });					
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden"); 
						}	
						else
							d3.select(this).style("visibility", "hidden");					
					}
				});	
			}

			//not supervisions and publications	
			else if ($('input#matrixFilterCo_sups').is(':checked')==false && $('input#matrixFilterCo_pubs').is(':checked')) {
				//hide single and show options for multiple filtering (union/intersection)
				$('#matrixFilterTypeSingle').hide(0);$('#matrixFilterTypeMultiple').show(0);					

				d3.selectAll("rect.matrixcell").each(function(d) {
					var notfiltered = (this.attributes.labelfiltered == null || this.attributes.labelfiltered.value == 0) && (this.attributes.searchfiltered == null || this.attributes.searchfiltered.value == 0);
					if($('input#matrixFilterAND').is(':checked')){

						updateMatrixCollabLegend([0,0,0,0,0,1,0]);

						d3.selectAll(".matrixrowbar").attr("width", function(d) { return d.P_SG*4; });

						if(d.grant > 0 && d.cosup == 0 && d.copub > 0) {
							d3.select(this).style("fill", "#F0A487")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_grant]); return matrix_z(d.copub+d.grant); });					
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");														
						}
						else
							d3.select(this).style("visibility", "hidden");	
					}
					else{

						updateMatrixCollabLegend([1,0,1,0,0,1,0]);

						d3.selectAll(".matrixrowbar").attr("width", function(d) { return (d.copubs+d.grants)*4; });

						if(d.grant > 0 && d.copub > 0) {
							d3.select(this).style("fill", "#F0A487")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_grant]); return matrix_z(d.copub+d.grant); });	
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible");
							else
								d3.select(this).style("visibility", "hidden");							 
						}				
						else if(d.grant > 0 && d.copub == 0) {
							d3.select(this).style("fill", "#79DEC0")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_grant]); return matrix_z(d.grant); });						
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");
						}
						else if(d.grant == 0 && d.copub > 0) {
							d3.select(this).style("fill", "#E1B2D7")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_grant]); return matrix_z(d.copub); });						
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");
						}					
					}
				});	
			}

			//supervisions and not publications
			else if ($('input#matrixFilterCo_sups').is(':checked') && $('input#matrixFilterCo_pubs').is(':checked')==false) {
				//hide single and show options for multiple filtering (union/intersection)
				$('#matrixFilterTypeSingle').hide(0);$('#matrixFilterTypeMultiple').show(0);				

				d3.selectAll("rect.matrixcell").each(function(d) {
					var notfiltered = (this.attributes.labelfiltered == null || this.attributes.labelfiltered.value == 0) && (this.attributes.searchfiltered == null || this.attributes.searchfiltered.value == 0);
					if($('input#matrixFilterAND').is(':checked')){

						updateMatrixCollabLegend([0,0,0,0,1,0,0]);

						d3.selectAll(".matrixrowbar").attr("width", function(d) { return d._PSG*4; });

						if(d.grant > 0 && d.cosup > 0 && d.copub == 0) {
							d3.select(this).style("fill", "#A0E191")
											.style("opacity", function(d) { matrix_z.domain([0,max_cosup+max_grant]); return matrix_z(d.cosup+d.grant); });					
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");							
						}
						else
							d3.select(this).style("visibility", "hidden");						
					}
					else{

						updateMatrixCollabLegend([0,1,1,0,1,0,0]);

						d3.selectAll(".matrixrowbar").attr("width", function(d) { return (d.grants+d.cosups)*4; });

						if(d.grant > 0 && d.cosup > 0) {
							d3.select(this).style("fill", "#A0E191")
											.style("opacity", function(d) { matrix_z.domain([0,max_cosup+max_grant]); return matrix_z(d.cosup+d.grant); });	
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");
						}				
						else if(d.grant > 0 && d.cosup == 0) {
							d3.select(this).style("fill", "#79DEC0")
											.style("opacity", function(d) { matrix_z.domain([0,max_cosup+max_grant]); return matrix_z(d.grant); });						
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");
						}
						else if(d.grant == 0 && d.cosup > 0) {
							d3.select(this).style("fill", "#D5E067")
											.style("opacity", function(d) { matrix_z.domain([0,max_cosup+max_grant]); return matrix_z(d.cosup); });						
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");
						}					
					}
				});	
			}

			//supervisions and publications	
			else if ($('input#matrixFilterCo_sups').is(':checked') && $('input#matrixFilterCo_pubs').is(':checked')) {
				d3.selectAll("rect.matrixcell").each(function(d) {
					var notfiltered = (this.attributes.labelfiltered == null || this.attributes.labelfiltered.value == 0) && (this.attributes.searchfiltered == null || this.attributes.searchfiltered.value == 0);
					if($('input#matrixFilterAND').is(':checked')){

						updateMatrixCollabLegend([0,0,0,0,0,0,1]);

						d3.selectAll(".matrixrowbar").attr("width", function(d) { return d.PSG*4; });

						if(d.copub > 0 && d.grant > 0 && d.cosup > 0) {
							d3.select(this).style("fill", "#DCBE6B")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_cosup+max_grant]); return matrix_z(d.copub+d.cosup+d.grant); });					
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");							
						}
						else
							d3.select(this).style("visibility", "hidden");						
					}
					else{

						updateMatrixCollabLegend([1,1,1,1,1,1,1]);

						d3.selectAll(".matrixrowbar").attr("width", function(d) { return (d.grants+d.cosups+d.copubs)*4; });

						if(d.copub > 0 && d.grant > 0 && d.cosup > 0) {
							d3.select(this).style("fill", "#DCBE6B")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_cosup+max_grant]); return matrix_z(d.copub+d.cosup+d.grant); });					
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");
						}					
						else if(d.copub > 0 && d.grant > 0 && d.cosup == 0) {
							d3.select(this).style("fill", "#F0A487")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_cosup+max_grant]); return matrix_z(d.copub+d.grant); });	
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");
						}				
						//if supervisions and not grants and not publications
						else if(d.cosup > 0 && d.grant == 0 && d.copub == 0) {
							d3.select(this).style("fill", "#D5E067")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_cosup+max_grant]); return matrix_z(d.cosup); });	
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible");
								else
								d3.select(this).style("visibility", "hidden"); 
						}	
						//if supervisions and not grants and publications
						else if(d.cosup > 0 && d.grant == 0 && d.copub > 0) {
							d3.select(this).style("fill", "#9BD0E3")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_cosup+max_grant]); return matrix_z(d.cosup+d.copub); });	
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");
						}
						//if supervisions and grants and not publications
						else if(d.cosup > 0 && d.grant > 0 && d.copub == 0) {
							d3.select(this).style("fill", "#A0E191")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_cosup+max_grant]); return matrix_z(d.cosup+d.grant); });	
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");
						}
						else if(d.copub > 0 && d.grant == 0 && d.cosup == 0) {
							d3.select(this).style("fill", "#E1B2D7")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_cosup+max_grant]); return matrix_z(d.copub); });						
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");
						}
						else if(d.copub == 0 && d.grant > 0 && d.cosup == 0) {
							d3.select(this).style("fill", "#79DEC0")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_cosup+max_grant]); return matrix_z(d.grant); });						
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");
						}					
					}
				});
			}
			//if the matrix is currently arranged according to count
			if ($('#order').val() == "count")
				order("count"); //re-arrange it to reflect the checkbox behavior	
		} //end grantsChecked

	function grantsUnchecked () {		
				
			//four possibilities for the combination of checkboxes

			//neither supervisions or publications is checked
			if ($('input#matrixFilterCo_sups').is(':checked')==false && $('input#matrixFilterCo_pubs').is(':checked')==false) {
				//hide multiple and single show options for filtering
				$('#matrixFilterTypeMultiple').hide(0);$('#matrixFilterTypeSingle').hide(0);

				updateMatrixCollabLegend([0,0,0,0,0,0,0]);

				d3.selectAll(".matrixrowbar").attr("width", function(d) { return 0; });				

				d3.selectAll("rect.matrixcell").each(function(d) {
					if(d.grant > 0) 
						d3.select(this).style("visibility", "hidden");	 
				});	
			}

			//not supervisions and publications	
			else if ($('input#matrixFilterCo_sups').is(':checked')==false && $('input#matrixFilterCo_pubs').is(':checked')) {
				//hide multiple and show options for single filtering (exclusive/inclusive)
				$('#matrixFilterTypeMultiple').hide(0);$('#matrixFilterTypeSingle').show(0);

				updateMatrixCollabLegend([1,0,0,0,0,0,0]);					

				d3.selectAll("rect.matrixcell").each(function(d) {
					var notfiltered = (this.attributes.labelfiltered == null || this.attributes.labelfiltered.value == 0) && (this.attributes.searchfiltered == null || this.attributes.searchfiltered.value == 0);
					if ($('input#matrixFilterEXCLUSIVE').is(':checked')) {
						if(d.copub > 0 && d.grant == 0 && d.cosup == 0) {
							d3.selectAll(".matrixrowbar").attr("width", function(d) { return d.P_S_G*4; });
							d3.select(this).style("fill", "#E1B2D7")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub]); return matrix_z(d.copub); });					
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");
						}
						else {
								d3.select(this).style("visibility", "hidden");
						}
					}
					else {
						if(d.copub > 0) {
							d3.selectAll(".matrixrowbar").attr("width", function(d) { return d.copubs*4; });
							d3.select(this).style("fill", "#E1B2D7")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub]); return matrix_z(d.copub); });					
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");
						}
						else
							d3.select(this).style("visibility", "hidden");						
					}				
				});	
			}

			//supervisions and not publications
			else if ($('input#matrixFilterCo_sups').is(':checked') && $('input#matrixFilterCo_pubs').is(':checked')==false) {
				//hide multiple and show options for single filtering (exclusive/inclusive)
				$('#matrixFilterTypeMultiple').hide(0);$('#matrixFilterTypeSingle').show(0);	

				updateMatrixCollabLegend([0,1,0,0,0,0,0]);				

				d3.selectAll("rect.matrixcell").each(function(d) {
					var notfiltered = (this.attributes.labelfiltered == null || this.attributes.labelfiltered.value == 0) && (this.attributes.searchfiltered == null || this.attributes.searchfiltered.value == 0);
					if ($('input#matrixFilterEXCLUSIVE').is(':checked')){

						if(d.cosup > 0 && d.grant == 0 && d.copub == 0) {
							d3.selectAll(".matrixrowbar").attr("width", function(d) { return d._PS_G*4; });
							d3.select(this).style("fill", "#D5E067")
											.style("opacity", function(d) { matrix_z.domain([0,max_cosup]); return matrix_z(d.cosup); });					
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");
						}
						else {
							if (d.cosup > 0)
								d3.select(this).style("visibility", "hidden");
						}
					}	
					else {
						if(d.cosup > 0) {
							d3.selectAll(".matrixrowbar").attr("width", function(d) { return d.cosups*4; });
							d3.select(this).style("fill", "#D5E067")
											.style("opacity", function(d) { matrix_z.domain([0,max_cosup]); return matrix_z(d.cosup); });					
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else
								d3.select(this).style("visibility", "hidden");
						}						
					}				
				});	
			}

			//supervisions and publications	
			else if ($('input#matrixFilterCo_sups').is(':checked') && $('input#matrixFilterCo_pubs').is(':checked')) {
				d3.selectAll("rect.matrixcell").each(function(d) {
					var notfiltered = (this.attributes.labelfiltered == null || this.attributes.labelfiltered.value == 0) && (this.attributes.searchfiltered == null || this.attributes.searchfiltered.value == 0);
					if($('input#matrixFilterAND').is(':checked')){

						updateMatrixCollabLegend([0,0,0,1,0,0,0]);

						d3.selectAll(".matrixrowbar").attr("width", function(d) { return d.PS_G*4; });

						if(d.grant == 0 && d.cosup > 0 && d.copub > 0) {
							d3.select(this).style("fill", "#9BD0E3")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_cosup]); return matrix_z(d.copub+d.cosup); });					
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
						else //if currently filtered
								d3.select(this).style("visibility", "hidden");						
						}
						else {
							//hide it
							d3.select(this).style("visibility", "hidden");						
						}
					}
					else{

						updateMatrixCollabLegend([1,1,0,1,0,0,0]);

						d3.selectAll(".matrixrowbar").attr("width", function(d) { return (d.cosups+d.copubs)*4; });

						if(d.cosup > 0 && d.copub > 0) {
							d3.select(this).style("fill", "#9BD0E3")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_cosup]); return matrix_z(d.copub+d.cosup); });					
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else //if currently filtered
									d3.select(this).style("visibility", "hidden");						
						}				
						else if(d.cosup > 0 && d.copub == 0) {
							d3.select(this).style("fill", "#D5E067")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_cosup]); return matrix_z(d.cosup); });	
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible"); 
							else //if currently filtered
										d3.select(this).style("visibility", "hidden");							
						}				
						//if supervisions and not grants and publications
						else if(d.cosup == 0 && d.copub > 0) {
							d3.select(this).style("fill", "#E1B2D7")
											.style("opacity", function(d) { matrix_z.domain([0,max_copub+max_cosup]); return matrix_z(d.copub); });	
							//only make it visible if it is not currently filtered
							if (notfiltered && $('#translatematrix').val()=="matrix")
								d3.select(this).style("visibility", "visible");
						else //if currently filtered
										d3.select(this).style("visibility", "hidden");								 
						}
						else {
							//hide it
							d3.select(this).style("visibility", "hidden");							
						}
					}
				});
			}
			//if the matrix is currently arranged according to count
			if ($('#order').val() == "count")
				order("count"); //re-arrange it to reflect the checkbox behavior
		} //end grantsUnchecked

	//for the checkboxes
	$('input#matrixFilterCo_pubs').on("ifChecked", pubsChecked);

	$('input#matrixFilterCo_pubs').on("ifUnchecked", pubsUnchecked);

	$('input#matrixFilterCo_sups').on("ifChecked", supsChecked);

	$('input#matrixFilterCo_sups').on("ifUnchecked", supsUnchecked);

	$('input#matrixFilterCo_grants').on("ifChecked", grantsChecked);

	$('input#matrixFilterCo_grants').on("ifUnchecked", grantsUnchecked);

	//listens to the slider for scoping by year
	//
	$('#scopeSlider').change(function () {
	  // yearSelected = this.value;

	  // d3.selectAll("line.link").each( function () {
	  //   if (yearSelected < this.attributes.year.value ) {
	  //     d3.select(this).style("opacity", 0);
	  //     d3.select(this).style("visibility", "hidden");
	  //   }
	  //   else {
	  //     //only want to set opacity to 0 and then fade it in if it is not currently visible
	  //     if (this.style.visibility == "hidden"){
	  //       d3.select(this).style("visibility", "visible").style("opacity", 0);
	  //       d3.select(this).style("opacity", 1);
	  //     }
	  //   }
	  // });

	  // //if the user wants to include the nodes in the scoping
	  // if($('#scopeNodes').is(':checked')) {
	  //   d3.selectAll("circle.node").each( function () {
	  //   var that = this;//because of the nested loop
	  //     var match = false;
	  //     //compare each line (link) to the current node. if their coordinates match (i.e., the link is a connection to the node) and the link is currently visible (i.e., it has not been hidden during the scoping)
	  //     //then set the match boolean to true
	  //     //don't forget to delay 500ms 
	  //     d3.selectAll("line.link").each( function() {
	  //         if (((this["x1"].animVal.value == that["cx"].animVal.value && this["y1"].animVal.value == that["cy"].animVal.value && this.style.visibility == "visible") || (this["x2"].animVal.value == that["cx"].animVal.value && this["y2"].animVal.value == that["cy"].animVal.value && this.style.visibility == "visible"))){ //if there is a link to the current node set the boolean flag to true
	  //          match = true;
	  //        }
	  //     });

	  //     if (match == false){
	  //       //only want to set opacity to 0 and then fade it in if it is not currently visible
	  //       if (this.style.visibility == "visible"){        
	  //         d3.select(this).style("opacity", 0);
	  //         d3.select(this).style("visibility", "hidden");
	  //       } 

	  //     }
	  //     else {
	  //       d3.select(this).style("visibility", "visible").style("opacity", 1);
	  //       // d3.select(this).transition().duration(2000).style("opacity", 1);
	  //     }
	  //   });
	  // }
	  // else
	  //   d3.selectAll("circle.node").style("visibility", function () { return "visible"; });    
	});

	$('#filteryear').change(function () {

	});


	//==========================================================================================================================
	//                                constructs the network visualization
	//
	//==========================================================================================================================
	/*

	@params:
	@returns:
	*/
	function constructNetwork() {
	  var xpos = $('#vizcontainer').width()/2 - $('#vizloader').width()/2;
	  var ypos = $('#vizcontainer').height()/2 - $('#vizloader').height()/2;
	  $('#vizloader').css({"position": "absolute", "left":  xpos + "px", "top": ypos + "px"}).show();

	  getNetworkData(buildNetwork); 

	}//end constructNetwork

	//var all_grants; TODO: delete

	/*
	gets the data for the network (either from the sessionStorage or from the db on the server) and then builds the network by passing the buildNetwork function as a callback to getNetworkData
	@params: callback: a callback function--in this case buildNetwork--that builds the network visualization
	@returns: none
	*/
	function getNetworkData (callback){

	  var all_grants, links_for_network, links_science_exclusive, links_western_exclusive, science_faculty_data, western_faculty_data, science_departments, all_departments, pub_years_uniq, links_co_sup;

	  //retrieves the data either from sessionStorage or from the database
	  async.parallel(
	    [

	      function(callback){
	        if(store.session.has("links_for_network")){
	          console.log("links_for_network is already in sessionStorage...no need to fetch again");
	          links_for_network = store.session("links_for_network");
	          callback(null);
	        }
	        else {
	          console.log("fetching links_for_network...");
	          $.get('/network/links_for_network', function(result) {
	            links_for_network = JSON.parse(result.links_for_network);
	            store.session("links_for_network", links_for_network);
	            callback(null);
	          });
	        }
	      },

	      function(callback){
	        if(store.session.has("links_science_exclusive")){
	          console.log("links_science_exclusive is already in sessionStorage...no need to fetch again");
	          links_science_exclusive = store.session("links_science_exclusive");
	          callback(null);
	        }
	        else {
	          console.log("fetching links_science_exclusive...");
	          $.get('network/links_science_exclusive', function(result) {
	            links_science_exclusive = JSON.parse(result.links_science_exclusive);
	            store.session("links_science_exclusive", links_science_exclusive);
	            callback(null);
	          });
	        }
	      },

	      function(callback){
	        if(store.session.has("links_western_exclusive")){
	          console.log("links_western_exclusive is already in sessionStorage...no need to fetch again");
	          links_western_exclusive = store.session("links_western_exclusive");
	          callback(null);
	        }
	        else {
	          console.log("fetching links_western_exclusive...");
	          $.get('network/links_western_exclusive', function(result) {
	            links_western_exclusive = JSON.parse(result.links_western_exclusive);
	            store.session("links_western_exclusive", links_western_exclusive);
	            callback(null);
	          });
	        }
	      },	      

	      function(callback){
	        if(store.session.has("science_faculty_data")){
	          console.log("science_faculty_data is already in sessionStorage...no need to fetch again");
	          science_faculty_data = store.session("science_faculty_data");
	          callback(null);          
	        }
	        else {
	          console.log("fetching science_faculty_data...");
	          $.get('/network/science_faculty_data', function(result){
	            science_faculty_data = JSON.parse(result.science_faculty_data);
	            store.session("science_faculty_data", science_faculty_data);
	            callback(null);            
	          });
	        } 
	      },

	      function(callback){
	        if(store.session.has("western_faculty_data")){
	          console.log("western_faculty_data is already in sessionStorage...no need to fetch again");
	          western_faculty_data = store.session("western_faculty_data");
	          callback(null);          
	        }
	        else {
	          console.log("fetching western_faculty_data...");
	          $.get('/network/western_faculty_data', function(result){
	            western_faculty_data = JSON.parse(result.western_faculty_data);
	            //so that it doesn't store...causing DOM exception 22 if this is uncommented
	            //store.session("western_faculty_data", western_faculty_data);
	            callback(null);            
	          });
	        } 
	      },

	      function(callback){
	        if(store.session.has("science_departments")){
	          console.log("science_departments is already in sessionStorage...no need to fetch again");
	          science_departments = store.session("science_departments");
	          callback(null);          
	        }
	        else {
	          console.log("fetching science_departments...");
	          $.get('network/science_departments', function(result){
	            science_departments = JSON.parse(result.science_departments);
	            store.session("science_departments", science_departments);
	            callback(null);            
	          });
	        }
	      },

	      function(callback){
	        if(store.session.has("all_departments")){
	          console.log("all_departments is already in sessionStorage...no need to fetch again");
	          all_departments = store.session("all_departments");
	          callback(null);          
	        }
	        else {
	          console.log("fetching all_departments...");
	          $.get('network/all_departments', function(result){
	            all_departments = JSON.parse(result.all_departments);
	            store.session("all_departments", all_departments);
	            callback(null);            
	          });
	        }
	      },	      

	      function(callback){
	        if(store.session.has("pub_years_uniq")){
	          console.log("pub_years_uniq is already in sessionStorage...no need to fetch again");
	          pub_years_uniq = store.session("pub_years_uniq");
	          callback(null);          
	        }
	        else {
	          console.log("fetching pub_years_uniq...");
	          $.get('network/pub_years_uniq', function(result){
	            pub_years_uniq = JSON.parse(result.pub_years_uniq);
	            store.session("pub_years_uniq", pub_years_uniq);
	            callback(null);            
	          });
	        }
	      },

	      function(callback){
	        if(store.session.has("links_co_sup")){
	          console.log("links_co_sup is already in sessionStorage...no need to fetch again");
	          links_co_sup = store.session("links_co_sup");
	          callback(null);
	        }
	        else {
	          console.log("fetching links_co_sup");
	          $.get('network/links_co_sup', function(result){
	            links_co_sup = JSON.parse(result.links_co_sup);
	            store.session("links_co_sup", links_co_sup);
	            callback(null);
	          });
	        }         
	      }
	      ,

	      function(callback){
	      	console.log("fetching grants...");
	      	$.get('network/all_grants', function(result) {
	      		all_grants = JSON.parse(result.all_grants);
	      		callback(null);
	      	});
	      }
	    ],

	      function(err, results){
	      	if (err) throw new Error(err);
	        callback(links_for_network, links_science_exclusive, links_western_exclusive, science_faculty_data, western_faculty_data, science_departments, all_departments, pub_years_uniq, links_co_sup, all_grants);
	      }
	    );
	}//end getNetworkData


	function buildNetwork(links_for_network, links_science_exclusive, links_western_exclusive, science_faculty_data, western_faculty_data, science_departments, all_departments, pub_years_uniq, links_co_sup, all_grants){

	  	$('#vizloader').hide();

	  	$('#networkactions').show(800);
	  	$('#networkdepartmentlegendtoggle').show();

	  	//construct the legend
	  	constructnetworkdepartmentlegend(science_departments);

	  	//populate the filter area with departments
	  	populateFilter(science_departments);


	  	var links_grants_exclusive = constructGrantLinks(all_grants, science_faculty_data);

	  	var filteryears = d3.select("#matrixviz")
	    	.data(pub_years_uniq)
	    	.enter().append("p")
	    	// .attr("value", function(d){ return d; })
	    	.text(function(d){ return d; });

	  	//var links_combined = links_science_exclusive.concat(links_co_sup);
	  	var links_combined = links_science_exclusive.concat(links_co_sup, links_grants_exclusive);

	  	store.session("links_combined", links_combined);
	  	console.log("links_combined has been processed and is in sessionStorage now");

	  	network_force
		    .nodes(science_faculty_data)
		    //.links(links_for_network);
		    .links(links_combined);   

	 	var node_drag = d3.behavior.drag()
	        .on("dragstart", dragstart)
	        .on("drag", dragmove)
	        .on("dragend", dragend);	              

	      //transition is to match the transition of the nodes
	  	link = networksvg.selectAll("line.link")
	      //.data(links_for_network)
	      .data(links_combined) 
	    .enter().append("svg:line")
	      .attr("class", "link")
	      .attr("animViz", "true")  //it declares whether the link should be visible after the animation
	      .style("visibility", "visible")
	      .style("stroke", "#b3b3b3")
	      .style("stroke-dasharray", function (d) {
	        if (d.type == "supervision")
	          return "4, 2";
	      	else if (d.type =="grant")
	      		return "6,4";
	        else
	          return "10, 0";
	           })
	      //.style("stroke-width", function (d) { return d.value/4; });
	      .style("stroke-width", "0.5px");


	 	node = networksvg.selectAll("circle.node")
		    .data(science_faculty_data)
		    .enter().append("svg:circle")
		    .attr("class", "node")
		    .attr("r", 10)
		    .style("visibility", "visible")
		    .attr("gathering", "false") //tell if a node is in an gathering area
		    //.attr("selectedIndividually", "false") //<-- for the selecting action
		    .attr("publications", 0)
		    .attr("supervisions", 0)
		    .attr("grants", 0)
		    .style("fill", function(d){ return color20(d.Department); })
		    .call(node_drag);

		countCollaborationsOfNodes();

		node.on("mouseover", function(d) {
		  	d3.select(this).attr("cursor", "pointer");
		  	if(!d3.select(this).classed("selected"))
		  		d3.select(this).style("stroke-width", "3px");
		  	if (!dragging) {
				nodeTooltip.transition()        
	                .duration(200)      
	                .style("opacity", .95);      
	            nodeTooltip.html("<b>" + d.Name + "</b><br><hr>" + "Department: " + d.Department + "<br>" + "Rank: " + d.Rank + "<br>" + "Co-Supervisions: " + this.attributes[4].value + "<br>" + "Co-Publications: " + this.attributes[3].value + "<br>" + "Co-Grants: " + this.attributes[5].value)                
	            	.style("left", (parseInt(d3.select(this).attr("cx")) + document.getElementById("networkviz").offsetLeft) + "px")     
	                .style("top", d.y + "px");

	            //position the tooltip relative to the svg circle
		  	    $('.nodeTooltip').position({
	    			"my": "left+20 top+20",
	    			"at": "right bottom",
	    			"of": $(this)
	    		});
		  	}
		  })
	                
		  .on("mouseout", function(d) {
		  	if(!d3.select(this).classed("selected"))
		  		d3.select(this).style("stroke-width", "1px");	    
		  	nodeTooltip.transition()        
	        	.duration(500)      
	            .style("opacity", 0);
		  })
		  .on("mouseup", function(d) {
		  	if(individualSelect) {
		  		//if this node is already selected
		  		if (this.style.strokeWidth == "4px") {
		  			selectedNodes = _.without(selectedNodes, this.__data__);
		  			networksvg.selectAll("line.link").each(function(link) {
		  				if(link.source == d || link.target == d)
		  					selectedLinks = _.without(selectedLinks, d);
		  			});
		  			this.selectedIndividually = false;
			  		d3.select(this).classed("selected", false).style("stroke", "gray").style("stroke-width", "1px").style("fill", function(d) {return color20(d.Department); });	  			
		  		}
		  		else {
			  		selectedNodes.push(this.__data__);
			  		this.selectedIndividually = true;
			  		selectedNodes = _.uniq(selectedNodes, false, function(x){ return (x.Name + x.Department) });
			  		networksvg.selectAll("line.link").each(function(link) {
		  				if(link.source == d || link.target == d) {
		  					selectedNodes.forEach(function(node) {
		  						if(node == ( (link.source == d) ? link.target: link.source ) )
		  							selectedLinks.push(link);
		  					});
		  				}
		  					
		  			});
			  		d3.select(this).classed("selected", true).style("stroke", "red").style("stroke-width", "4px").style("fill", "white");
		  		}
		  		//update the div that lists the current selections
		  		updateSelectionArea();	
		  		
		  		//update the visibility according to the actions radios
		  		if($('#selectionHide').is(":checked")) {
		  			var r = d3.select(this).attr("r");
		    		d3.select(this).transition().duration(1000).style("opacity", 0).attr("r", 0)
		    		d3.select(this).transition().delay(1000).style("visibility", "hidden").attr("r", r);

		    		var that = this;
		    		d3.selectAll('line.link').each(function(d) {
			    		if(d.source == that.__data__ || d.target == that.__data__) {
			    			d3.select(this).transition().duration(1000).style("opacity", 0);
    						d3.select(this).transition().delay(1000).style("visibility", "hidden");
    					}
		    		});
		  		} else if($('#selectionShow').is(":checked")) {
		  			d3.select(this).style("stroke", "gray").style("stroke-width", 1)
	    				.style("fill", function(d) { return color20(d.Department); });
	    			var r = d3.select(this).attr("r");
	    			d3.select(this).style("visibility", "visible").style("opacity", 0).attr("r", 0);
	    			d3.select(this).transition().duration(1000).style("opacity", 1).attr("r", r);

		    		d3.selectAll('line.link').each(function(d) {
			    		if(_.contains(selectedLinks, d)) {
			    			d3.select(this).style("visibility", "visible").style("opacity", 0);
    						d3.select(this).transition().duration(1000).style("opacity", 1);
    					}
		    		});
		  		}
			}
		  })
		  .on("contextmenu", function(d){
		  	console.log("right click on node!");
		  })
		  .on("dblclick", function(d){
		  	console.log("double click on node!");
		  });
		//getDeptCenters(science_departments.length, circleOutline[0][0].r.animVal.value, circleOutline[0][0].cx.animVal.value, circleOutline[0][0].cy.animVal.value);
		getCenter();

	  	// deptCircle = networksvg.selectAll("circle.dept")
		  //   .data(deptCircles)
		  //   .enter()
		  //   .append("svg:circle")
		  //   .attr("class", "dept")
		  //   .attr("r", 1)
		  //   .attr("cx", function(d) { return d[1]; })
		  //   .attr("cy", function(d) { return d[2]; })
		  //   //.style("visibility", "hidden")
		  //   .style("opacity", 1)
		  //   .style("fill", "white")
		  //   .style("stroke", function(d){ return color20(d[0]); })
		  //   .style("stroke-width", 2);				    
        
	    function dragstart(d, i) {
	    	dragging = true;
	    	d3.event.sourceEvent.stopPropagation();
	        network_force.stop() // stops the force auto positioning before you start dragging
	    }

	    function dragmove(d, i) {
	    	if($('input#freezeNodes').is(':checked')) {
	    		d3.select(this).attr("cursor", "move");
	    	}

	        d.px += d3.event.dx;
	        d.py += d3.event.dy;
	        d.x += d3.event.dx;
	        d.y += d3.event.dy; 
	        //90 is the height of the bar & legend. "$('networkdepartmentlegend').height()" does not get the value for legend is constructed dynamically
	        //10 is the radius of node and 5 is the line-width of the gatheringArea
	        var left = ($('#gatheringArea').position().left - networkzoom.translate()[0] + 10) / networkzoom.scale();
			var right = ($('#gatheringArea').position().left - networkzoom.translate()[0] + $('#gatheringArea').width() + 10 + 5) / networkzoom.scale();
			var top = ($('#gatheringArea').position().top - (networkzoom.translate()[1] + 90) + 10) / networkzoom.scale();
			var bottom = ($('#gatheringArea').position().top - (networkzoom.translate()[1] + 90) + $('#gatheringArea').height() + 10 + 5) / networkzoom.scale();
	        if(d.x > left && d.x < right && d.y > top && d.y < bottom)
	        	d3.select(this).attr("gathering", "true");
	        else
	        	d3.select(this).attr("gathering", "false");
	        tick(); // this is the key to make it work together with updating both px,py,x,y on d !
	    }

	    function dragend(d, i) {
	    	if($('input#freezeNodes').is(':checked')) {
	   			d.fixed = true; //set the node to fixed so the force doesn't include the node in its auto positioning stuff
	    	}
	        tick();
	        network_force.resume();
	        dragging = false;
	    }     


		//keep track of whether a node has been selected individually
		d3.selectAll("circle.node").each(function() {
	  		this.selectedIndividually = false;
	  	});  

	  	//node.transition().duration(2000).attr("r", 10);

	  	network_constructed = true;

	  	// /*Registers the specified listener to receive events of the specified type from the force layout. 
	  	//Currently, only "tick" events are supported, which are dispatched for each tick of the simulation. 

	  	network_force
	    	.gravity(dgravity)
	    	.friction(dfriction)
	    	.charge(dcharge)
	    	.linkDistance(dlinkDistance)
	    	.on("tick", tick)
	      	.start(); 	
	}//end buildNetwork

	$('#arrange').chosen().change(function() {
		if (this.value == "department") {
			network_force.gravity(0).linkStrength(0).start(); //set the network paramaters
	  		//network_force.stop();
	  	}
	  	if (this.value == "random") {
	  		//network_force.gravity(0.6);
	    	network_force.linkStrength(dlinkStrength).charge(dcharge).gravity(dgravity).linkDistance(dlinkDistance).start();	  		
	  	}
	});

	$('#filterclusters').chosen().change(function() {
		if (this.value == "envandsus") {
			d3.selectAll("circle.node").each( function () {
			    if (!_.contains(envandsusCluster, this.__data__.Name))
			      d3.select(this).style("opacity", 0.07);
			});
		      d3.selectAll("line.link").each( function () {
		        if (!_.contains(envandsusCluster, this.__data__.source.Name) || !_.contains(envandsusCluster, this.__data__.target.Name))
		          d3.select(this).style("opacity", 0.03);
		      });
		}
		else if (this.value == "none") {
			d3.selectAll("circle.node").each( function () {
			    //TODO: if not filtered, etc...
			      d3.select(this).style("opacity", 1);
			});
		      d3.selectAll("line.link").each( function () {
		      	//TODO: if not filtered, etc...
			      d3.select(this).style("opacity", 1);
		      });
		}
	});


	var count_tick = 0;

	/*
	called for each "tick" of the simulation
	listens to tick events to update the displayed positions of nodes and links.

	@params: e: ??
	*/
	function tick (e) {
	  // var currentheight = networksvg.height = $('#networkviz').height();
	  // var currentwidth = networksvg.width = $('#networkviz').width();
	  // d3.select("#networkviz").attr("width", currentwidth).attr("height", currentheight); //not updating the actual svg element

	  if($('input#motionFreeze').is(':checked')) {
		network_force.stop();
		return ;
	  }

		if($('input#gatheringMode').is(':checked')) {
			var svgx = networkzoom.translate()[0];
			var svgy = networkzoom.translate()[1] + 90;
			var gatheringx = $('#gatheringArea').position().left + $('#gatheringArea').width() / 2;
			var gatheringy = $('#gatheringArea').position().top + $('#gatheringArea').height() / 2;
			var focusx = (gatheringx - svgx + 10) / networkzoom.scale();
			var focusy = (gatheringy - svgy + 10) / networkzoom.scale();
			node
				.each(function(d) {
					if(d3.select(this).attr("gathering") == "true") {
						d3.select(this).attr("cx", function(d) {
							return d.x += (focusx - d.x) * 0.2 * network_force.alpha();
						});
						d3.select(this).attr("cy", function(d) {
							return d.y += (focusy - d.y) * 0.2 * network_force.alpha();
						});
					}
					else {
						d3.select(this).attr("cx", function(d) {
							return d.x += (normal_center.x - d.x) * 0.2 * network_force.alpha();
						});
						d3.select(this).attr("cy", function(d) {
							return d.y += (normal_center.y - d.y) * 0.2 * network_force.alpha();
						});
					}
				})
				.each(collide(.5));
			link
			    .attr("x1", function(d) { return d.source.x; })
			    .attr("y1", function(d) { return d.source.y; })
			    .attr("x2", function(d) { return d.target.x; })
			    .attr("y2", function(d) { return d.target.y; });
		}

		//if the user has chosen to arrange the nodes according to their respective departments
	    if($('#arrange').val( ) == "department") {

		node
		    .each(function() {
				d3.select(this).attr("cx", function(d){ 
					var dept = d.Department;//department that the person belongs to
					var focusx;//the x coordinate of the focus point for a node
					deptCircles.forEach(function(d) { 
						if(d.name == dept) {
							focusx = d.focuscoords[0]; // return the x coordinate
						}
					});//get the x coordinate
					return d.x += (focusx - d.x) * 0.2 * network_force.alpha();
				});
				d3.select(this).attr("cy", function(d){ 
					var dept = d.Department;//department that the person belongs to
					var focusy;//the y coordinate of the focus point for a node					
					deptCircles.forEach(function(d) { 
						if(d.name == dept) {
							focusy = d.focuscoords[1]; // return the y coordinate
						}
					});//get the y coordinate        
					return d.y += (focusy - d.y) * 0.2 * network_force.alpha();
				});
		    })
		    .each(collide(.5))
			.style("stroke", "gray")
			.style("stroke-width", "1px");

		// node
		// 	.attr("cx", function(d){ 
		// 		var dept = d.Department;//department that the person belongs to
		// 		var focusx;//the x coordinate of the focus point for a node
		// 		deptCircles.forEach(function(d) { 
		// 			if(d.name == dept) {
		// 				focusx = d.focuscoords[0]; // return the x coordinate
		// 			}
		// 		});//get the x coordinate
		// 		return d.x += (focusx - d.x) * 0.2 * network_force.alpha();
		// 	})
		// 	.attr("cy", function(d){ 
		// 		var dept = d.Department;//department that the person belongs to
		// 		var focusy;//the y coordinate of the focus point for a node					
		// 		deptCircles.forEach(function(d) { 
		// 			if(d.name == dept) {
		// 				focusy = d.focuscoords[1]; // return the y coordinate
		// 			}
		// 		});//get the y coordinate        
		// 		return d.y += (focusy - d.y) * 0.2 * network_force.alpha();
		// 	})
		//     // .each(collide(.5))
		// 	.style("stroke", "gray")
		// 	.style("stroke-width", "1px");

	    link
	      .attr("x1", function(d) { return d.source.x; })
	      .attr("y1", function(d) { return d.source.y; })
	      .attr("x2", function(d) { return d.target.x; })
	      .attr("y2", function(d) { return d.target.y; });
	    }

	  else {

		node
		    .each(function() { //moves each node towards the normal_center
			    d3.select(this).attr("cx", function(d) {
					return d.x += (normal_center.x - d.x) * 0.12 * network_force.alpha();
				});
				d3.select(this).attr("cy", function(d) {
					return d.y += (normal_center.y - d.y) * 0.12 * network_force.alpha();
				});
				if(!d3.select(this).classed("selected")) {
			   		d3.select(this).style("stroke", "gray");
			      	d3.select(this).style("stroke-width", function(d) { 
				      	if (d.fixed == true)
				      		return "3px";
				      	else
				      		return "1px";
			      	});		    	
			     }
		    })
		    .each(collide(.5));

	    link.attr("x1", function(d) { return d.source.x; })
	      .attr("y1", function(d) { return d.source.y; })
	      .attr("x2", function(d) { return d.target.x; })
	      .attr("y2", function(d) { return d.target.y; });
	  }

	}//end tick


	/*
	move nodes toward cluster centers

	@params: alpha: 
	@returns: anonymous function...
	*/
	function moveTowardClusterCenter(alpha) {
	  return function(d) {
	    d.y += (d.py - d.y) * alpha;
	    d.x += (d.px - d.x) * alpha;
	  };
	}

	/*
	move nodes toward the center of the visualization area

	@params: alpha: 
	@returns: anonymous function...
	*/
	function moveTowardNormalCenter(node) {
		var test = 2;
	  return function(d) {
	    d.y += (normal_center.y - d.y) * alpha;
	    d.x += (normal_center.x - d.x) * alpha;
	  };
	}

	/*
	gets the center...?

	@params:
	@returns:
	*/
	function getCenter() {
		async.waterfall([
			function(callback){
			  if(store.session.has("science_departments")){
			    console.log("science_departments is already in sessionStorage...no need to fetch again");
			  }
			  else {
			    console.log("fetching science_departments...");
			    $.get('/network/science_departments', function(result) {
			      var science_departments = JSON.parse(result.science_departments);
			      store.session("science_departments", science_departments);
	    		});
	  		  }
	  		  callback(null, store.session("science_departments"));
			},
			function(science_departments, callback){
	  		  var temp = store.session("science_departments").forEach(function (d) {
	    	 	deptCircles.push({"name": d, "count": 0, "xcoords": [], "ycoords": [], "focuscoords": []});  
	  		  });
	  		  callback(null, science_departments, deptCircles);
			},
			function(science_departments, deptCircles, callback){
			  //calculate equidistant points on a circle for the foci
			  	var numpoints = science_departments.length;
				var slice = 2 * Math.PI / numpoints;
				var radius = circleOutline[0][0].r.animVal.value;
				var centerx = circleOutline[0][0].cx.animVal.value;
				var centery = circleOutline[0][0].cy.animVal.value;
				//create numpoints number of circles, one for each department
				for (i = 0; i < numpoints; i++)
				{
				    var angle = slice * i;
				    var newX = (centerx + radius * Math.cos(angle));
				    var newY = (centery + radius * Math.sin(angle));
				    //networksvg.append("svg:circle").attr("class", "dept").attr("cx", newX).attr("cy", newY).attr("r", 50).style("fill", "none").style("stroke-width", "2px").style("stroke", "gray").style("opacity", "0");
				    deptCircles[i].focuscoords= [newX, newY];
				}	
				networksvg.selectAll("circle.dept")
					.data(deptCircles).enter().append("svg:circle")
					.attr("class", "dept")
					.attr("cx", function(d) { return d.focuscoords[0]; }).attr("cy", function(d) { return d.focuscoords[1]; })
					.attr("r", 50)
					.style("fill", function(d) { return color20(d.name); })
					.style("stroke-width", "2px")
					.style("stroke", "gray")
					.style("opacity", "0")
					.style("display", "none");
				callback(null, 'done');			
			}
			],
			function(err, result){
			  d3.selectAll("circle.node").each( function () {
			    var that = this;
			    deptCircles.forEach (function(n) {
			      if (that.__data__.Department == n.name){
			        n.count += 1;
			        n.xcoords.push(that.__data__.px);
			        n.ycoords.push(that.__data__.py);
			      }
			    });
			  });
			}
		);//end async.waterfall
	}//end getCenter

	// //getDeptCenters(9, circleOutline[0][0].r.animVal.value, circleOutline[0][0].cx.animVal.value, circleOutline[0][0].cy.animVal.value)
	// function getDeptCenters(numpoints, radius, centerx, centery) {
	//     var slice = 2 * Math.PI / numpoints;

	//     //create numpoints number of circles, one for each department
	//     for (i = 0; i < numpoints; i++)
	//     {
	//         var angle = slice * i;
	//         var newX = (centerx + radius * Math.cos(angle));
	//         var newY = (centery + radius * Math.sin(angle));
	//         networksvg.append("svg:circle").attr("class", "deptCircle").attr("cx", newX).attr("cy", newY).attr("r", 25);
	//         departmentFoci.push();
	//     }
	// }




	//==========================================================================================================================
	//                                          constructs matrix
	//==========================================================================================================================

	function constructMatrix(){
	  var xpos = $('#vizcontainer').width()/2 - $('#vizloader').width()/2;
	  var ypos = $('#vizcontainer').height()/2 - $('#vizloader').height()/2;
	  $('#vizloader').css({"position": "absolute", "left":  xpos + "px", "top": ypos + "px"}).show();

	  getMatrixData(buildMatrix);
	}// end matrix

	//gets the data for the matrix (either from the sessionStorage or from the db on the server) and then builds the matrix by passing the buildMatrix function as a callback to getMatrixData
	//@param: callback: a callback function--in this case buildMatrix--that builds the matrix visualization
	//@return: none
	function getMatrixData (callbackMatrix){

	  var links_for_matrix, links_science_exclusive, science_faculty_data, science_departments, pub_years_uniq, links_co_sup, all_grants;

	  async.parallel(
	    [
	      function(callback){
	        if(store.session.has("links_for_matrix")){
	          console.log("links_for_matrix is already in sessionStorage...no need to fetch again");
	          links_for_matrix = store.session("links_for_matrix");
	          callback(null);
	        }
	        else {
	          console.log("fetching links_for_matrix...");
	          $.get('/matrix/links_for_matrix', function(result) {
	            links_for_matrix = JSON.parse(result.links_for_matrix);
	            store.session("links_for_matrix", links_for_matrix);
	            callback(null);
	          });
	        }
	      },

	      function(callback){
	        if(store.session.has("links_science_exclusive")){
	          console.log("links_science_exclusive is already in sessionStorage...no need to fetch again");
	          links_science_exclusive = store.session("links_science_exclusive");
	          callback(null);
	        }
	        else {
	          console.log("fetching links_science_exclusive...");
	          $.get('network/links_science_exclusive', function(result) {
	            links_science_exclusive = JSON.parse(result.links_science_exclusive);
	            store.session("links_science_exclusive", links_science_exclusive);
	            callback(null);
	          });
	        }
	      },

	      function(callback){
	        if(store.session.has("science_faculty_data")){
	          console.log("science_faculty_data is already in sessionStorage...no need to fetch again");
	          science_faculty_data = store.session("science_faculty_data");
	          callback(null);          
	        }
	        else {
	          console.log("fetching science_faculty_data...");
	          $.get('/network/science_faculty_data', function(result){
	            science_faculty_data = JSON.parse(result.science_faculty_data);
	            store.session("science_faculty_data", science_faculty_data);
	            callback(null);            
	          });
	        } 
	      },

	      function(callback){
	        if(store.session.has("science_departments")){
	          console.log("science_departments is already in sessionStorage...no need to fetch again");
	          science_departments = store.session("science_departments");
	          callback(null);          
	        }
	        else {
	          console.log("fetching science_departments...");
	          $.get('network/science_departments', function(result){
	            science_departments = JSON.parse(result.science_departments);
	            store.session("science_departments", science_departments);
	            callback(null);            
	          });
	        }
	      },

	      function(callback){
	        if(store.session.has("pub_years_uniq")){
	          console.log("pub_years_uniq is already in sessionStorage...no need to fetch again");
	          pub_years_uniq = store.session("pub_years_uniq");
	          callback(null);          
	        }
	        else {
	          console.log("fetching pub_years_uniq...");
	          $.get('network/pub_years_uniq', function(result){
	            pub_years_uniq = JSON.parse(result.pub_years_uniq);
	            store.session("pub_years_uniq", pub_years_uniq);
	            callback(null);            
	          });
	        }
	      },

	      function (callback) {
	      	$.get('network/all_grants', function(result) {
	      		all_grants = JSON.parse(result.all_grants);
	      		callback(null);
	      	});
	      },

	      function(callback){
	        if(store.session.has("links_co_sup")){
	          console.log("links_co_sup is already in sessionStorage...no need to fetch again");
	          links_co_sup = store.session("links_co_sup");
	          callback(null);
	        }
	        else {
	          console.log("fetching links_co_sup");
	          $.get('network/links_co_sup', function(result){
	            links_co_sup = JSON.parse(result.links_co_sup);
	            store.session("links_co_sup", links_co_sup);
	            callback(null);
	          });
	        }         
	      }
	    ],

	    function(err, results){
	      callbackMatrix(links_for_matrix, links_science_exclusive, science_faculty_data, science_departments, pub_years_uniq, all_grants, links_co_sup);
	    }
	  );
	}//end getMatrixData



	function buildMatrix(links_for_matrix, links_science_exclusive, science_faculty_data, science_departments, pub_years_uniq, all_grants, links_co_sup){

		var links_grants_exclusive;

	  $('#vizloader').hide();  

	  $('#matrixactions').show(800);
	  $('#matrixFilterOR').iCheck('check');//set this as the default
	  $('#matrixFilterINCLUSIVE').iCheck('check');//set this as the default	  
	  $('#matrixFilterTypeSingle').hide(0);//multiple is the default to start
	  $('#matrixcollaborationlegend').show();
	  $('#matrixdepartmentlegendtoggle').show();	  

	  //construct the legend
	  constructmatrixlegends(science_departments, science_faculty_data);

	  matrixnodes = science_faculty_data;
	  var n = matrixnodes.length;

	  // Compute index per node.
	  matrixnodes.forEach(function(node, i) {
	    node.index = i;
	    node.count = 0;
	    node.cosups = 0;
	    node.copubs = 0;
	    node.grants = 0;
	    //combinations of collaboration types: _ stands for NOT
	    //e.g., _P stands for NOT publication, _S stands for NOT supervision, etc.
	    node._P_SG = 0;
	    node._PS_G = 0;
	    node._PSG = 0;
	    node.P_S_G = 0;
	    node.P_SG = 0;
	    node.PS_G = 0;
	    node.PSG = 0;
	    matrix[i] = d3.range(n).map(function(j) { return {x: j, y: i, copub: 0, cosup: 0, grant: 0 }; });
	  });

	    if (store.session.has("links_grants_exclusive"))
	    	links_grants_exclusive = store.session("links_grants_exclusive");
	    else 
	    	links_grants_exclusive = constructGrantLinks(all_grants, matrixnodes);

	  var links_combined = links_science_exclusive.concat(links_co_sup, links_grants_exclusive);

	  // Convert links to matrix; count occurrences.
	  links_combined.forEach(function(link) {
	  	if(link.type == "supervision") {
	  		matrix[link.source][link.target].cosup += 1;
	    	matrix[link.target][link.source].cosup += 1;
	    	//increase the cosup counter
	    	matrixnodes[link.source].cosups += 1;
	    	matrixnodes[link.target].cosups += 1;	    	
	  	}
	  	else if (link.type == "grant") {
	  		matrix[link.source][link.target].grant += 1;
	    	matrix[link.target][link.source].grant += 1;	
	    	//increase the grant counter
	    	matrixnodes[link.source].grants += 1;
	    	matrixnodes[link.target].grants += 1;		    	  	
	    }
	  	else if (link.type == "publication") {
	  		matrix[link.source][link.target].copub += 1;
	    	matrix[link.target][link.source].copub += 1;
	    	//increase the copub counter
	    	matrixnodes[link.source].copubs += 1;
	    	matrixnodes[link.target].copubs += 1;		    	
	  	}

	  	//increase the general counter
	    matrixnodes[link.source].count += 1;
	    matrixnodes[link.target].count += 1;

	    max_copub = matrix[link.source][link.target].copub > max_copub ? matrix[link.source][link.target].copub : max_copub;
	    max_copub = matrix[link.target][link.source].copub > max_copub ? matrix[link.target][link.source].copub : max_copub;
	    max_cosup = matrix[link.source][link.target].cosup > max_cosup ? matrix[link.source][link.target].cosup : max_cosup;
	    max_cosup = matrix[link.target][link.source].cosup > max_cosup ? matrix[link.target][link.source].cosup : max_cosup;
	    max_grant = matrix[link.source][link.target].grant > max_grant ? matrix[link.source][link.target].grant : max_grant;
	    max_grant = matrix[link.target][link.source].grant > max_grant ? matrix[link.target][link.source].grant : max_grant;	    
	  });

	  //loop through again now that the counts are done for exclusive AND operations (e.g., filtering)
	  links_combined.forEach(function(link, i) {
		  	if (matrix[link.source][link.target].copub==0 && matrix[link.source][link.target].cosup==0 && matrix[link.source][link.target].grant>0) {
		  		matrixnodes[link.source]._P_SG += 1;
		   		matrixnodes[link.target]._P_SG += 1;
		  	}	  
		  	else if (matrix[link.source][link.target].copub==0 && matrix[link.source][link.target].cosup>0 && matrix[link.source][link.target].grant==0) {
		  		matrixnodes[link.source]._PS_G += 1;
		   		matrixnodes[link.target]._PS_G += 1;
		  	}	  			  	
		  	else if (matrix[link.source][link.target].copub==0 && matrix[link.source][link.target].cosup>0 && matrix[link.source][link.target].grant>0) {
		  		matrixnodes[link.source]._PSG += 1;
		   		matrixnodes[link.target]._PSG += 1;
		  	}
		  	else if (matrix[link.source][link.target].copub>0 && matrix[link.source][link.target].cosup==0 && matrix[link.source][link.target].grant==0) {
		  		matrixnodes[link.source].P_S_G += 1;
		   		matrixnodes[link.target].P_S_G += 1;
		  	}	  	
		  	else if (matrix[link.source][link.target].copub>0 && matrix[link.source][link.target].cosup==0 && matrix[link.source][link.target].grant>0) {
		  		matrixnodes[link.source].P_SG += 1;
		   		matrixnodes[link.target].P_SG += 1;
		  	}  	
		  	else if (matrix[link.source][link.target].copub>0 && matrix[link.source][link.target].cosup>0 && matrix[link.source][link.target].grant==0) {
		  		matrixnodes[link.source].PS_G += 1;
		   		matrixnodes[link.target].PS_G += 1;
		  	}
		  	else if (matrix[link.source][link.target].copub>0 && matrix[link.source][link.target].cosup>0 && matrix[link.source][link.target].grant>0) {
		  		matrixnodes[link.source].PSG += 1;
		   		matrixnodes[link.target].PSG += 1;
		  	}	
		  });

	  // Precompute the orders.
	  var orders = {
	    name: d3.range(n).sort(function(a, b) { return d3.ascending(matrixnodes[a].Name, matrixnodes[b].Name); }),
	    count: d3.range(n).sort(function(a, b) { return matrixnodes[b].count - matrixnodes[a].count; }),
	    department: d3.range(n).sort(function(a, b) { return d3.ascending(matrixnodes[a].Department, matrixnodes[b].Department); })
	  };

	  // The default sort order.
	  matrix_x.domain(orders.name);
	  matrix_z.domain([0, max_copub + max_cosup + max_grant]);

	  matrixsvg.append("rect")
	      .attr("class", "matrixbackground")
	      .attr("width", matrix_width)
	      .attr("height", matrix_height);

	  var row = matrixsvg.selectAll(".matrixrow")
	      .data(matrix)
	    .enter().append("g")
	      .attr("class", "matrixrow")
	      .attr("transform", function(d, i) { return "translate(0," + matrix_x(i) + ")"; })
	      .attr("id", function(d, i) { return "row-" + i})
	      .each(row);

	    // var rowbar = matrixsvg.selectAll('.matrixrowbar')
	    // 	.data(matrixnodes)
	    //   	.enter().append("rect")
	    //     	.attr("class", "matrixrowbar")
	    //     	.attr("transform", function(d, i) { return "translate(0," + matrix_x(i) + ")"; })
	    //     	.attr("id", function(d, i) { return "rowbar-" + i})
	    //     	.each(rowbar);	 

	  row.append("line")
	      .attr("x2", matrix_width);

	  row.append("text")
	      .attr("x", -6)
	      .attr("y", matrix_x.rangeBand() / 2)
	      .attr("dy", ".32em")
	      .attr("text-anchor", "end")
	      .style("fill", function(d, i) { return color20(matrixnodes[i].Department) })
	      .text(function(d, i) { return matrixnodes[i].Name; });

	  row.append("rect")
	  	.data(matrixnodes)
	  	.attr("class", "matrixrowbar")  
			.attr("x", function(d) { return matrix_x(d.x); })
			.attr("y", 1)
	    	.attr("width", function(d) {
	    		return d.count*4; //union of all three (d.count) is default to start 
	    	})
	    	.attr("height", matrix_x.rangeBand()-2)
	    	.style("fill", "rgb(36,137,197)")
	    	.style("visibility", "hidden"); //hide to start


	   
	   addBarCounts(); 	


	  var column = matrixsvg.selectAll(".matrixcolumn")
	      .data(matrix)
	    .enter().append("g")
	      .attr("class", "matrixcolumn")
	      .attr("transform", function(d, i) { return "translate(" + matrix_x(i) + ")rotate(-90)"; })
	      .attr("id", function(d, i) { return "col-" + i});

	  column.append("line")
	      .attr("x1", -matrix_width);

	  column.append("text")
	      .attr("x", 6)
	      .attr("y", matrix_x.rangeBand() / 2)
	      .attr("dy", ".32em")
	      .attr("text-anchor", "start")
	      .style("fill", function(d, i) { return color20(matrixnodes[i].Department) })
	      .text(function(d, i) { return matrixnodes[i].Name; });


	    var x = d3.scale.linear().domain([150,0])
    		.range([550, 0]);

		var xAxis = d3.svg.axis()
		    .scale(x)
		    .orient("top")
		    .ticks(15);

		matrixsvg.append("g")
	      .attr("class", "x axis")
	      .attr("transform", "translate(0,0)")
	      .style("visibility", "hidden")
	      .call(xAxis)
	      .append("text")
		      .attr("y", -30)
		      .attr("dy", ".71em")
		      .style("text-anchor", "end")
		      .text("count");

	  //for the matrix
	  function row(row, index) {
	    var cell = d3.select(this).selectAll(".matrixcell")
	        .data(row.filter(function(d) { 
	        	return d.copub || d.grant || d.cosup; }))
	      .enter().append("rect")
	        .attr("class", "matrixcell")
	        .attr("x", function(d) { return matrix_x(d.x); })
	        .attr("width", matrix_x.rangeBand())
	        .attr("height", matrix_x.rangeBand())
	        .style("opacity", function(d) { return matrix_z(d.copub + d.cosup + d.grant); })
	        .style("fill", function(d) {
	        	//the colors used here have been selected to be optimally distinct from one another based on their hue
	        	if (d.copub > 0 && d.cosup == 0 && d.grant == 0)
	        		return "#E1B2D7";
	        	else if (d.cosup > 0 && d.copub == 0 && d.grant == 0)
	        		return "#D5E067";	
	        	else if (d.grant > 0 && d.copub == 0 && d.cosup == 0)
	        		return "#79DEC0";		        		        	
	        	else if (d.cosup == 0 && d.copub > 0 && d.grant > 0)
	        		return "#F0A487";
	        	else if (d.grant == 0 && d.cosup > 0 && d.copub > 0)
	        		return "#9BD0E3";
	        	else if (d.copub == 0 && d.cosup > 0 && d.grant > 0)
	        		return "#A0E191";	
	        	else if (d.copub > 0 && d.cosup > 0 && d.grant > 0)
	        		return "#DCBE6B";	        			        	
	        })
	        .on("mouseover", mouseover)
	        .on("mouseout", mouseout);

	    // function rowbar(rowbar) {   	
	    //     	.attr("x", function(d) { return matrix_x(d.x); })
	    //     	.attr("width", function(d) {
	    //     		return d.count;
	    //     	})
	    //     	.attr("height", matrix_x.rangeBand())
	    //     	.style("opacity", 1 )
	    //     	.style("fill", "blue");function(d) {
		   //      	//the colors used here have been selected to be optimally distinct from one another based on their hue
		   //      	if (d.copub > 0 && d.cosup == 0 && d.grant == 0)
		   //      		return "#E1B2D7";
		   //      	else if (d.cosup > 0 && d.copub == 0 && d.grant == 0)
		   //      		return "#D5E067";	
		   //      	else if (d.grant > 0 && d.copub == 0 && d.cosup == 0)
		   //      		return "#79DEC0";		        		        	
		   //      	else if (d.cosup == 0 && d.copub > 0 && d.grant > 0)
		   //      		return "#F0A487";
		   //      	else if (d.grant == 0 && d.cosup > 0 && d.copub > 0)
		   //      		return "#9BD0E3";
		   //      	else if (d.copub == 0 && d.cosup > 0 && d.grant > 0)
		   //      		return "#A0E191";	
		   //      	else if (d.copub > 0 && d.cosup > 0 && d.grant > 0)
		   //      		return "#DCBE6B";	        			        	
	    //     //});	    
	    //     } 


	    cell.append("name1").text(function(d) { return "<b>" + matrixnodes[d.x].Name + " & </b>" + "<br>"; });
	    cell.append("name2").text(function(d) { return "<b>" + matrixnodes[d.y].Name + "</b>" + "<br>" + "<hr>"; });
	    cell.append("value").text(function(d) { return "publications: " + d.copub + "<br>"; });
	    cell.append("value2").text(function(d) {return "supervisions: " + d.cosup + "<br>"; });
	    cell.append("value3").text(function(d) {return "grants: " + d.grant + "<br>"; });
	    cell.append("value4").text(function(d) { return "total: " + (d.grant + d.cosup + d.copub); });

	    var rowtotal = {grant:0, cosup:0, copub:0};

	    //go through each cell
	    _.each(row, function(collab) {
	    	rowtotal.grant = rowtotal.grant + collab.grant;
	    	rowtotal.cosup = rowtotal.cosup + collab.cosup;
	    	rowtotal.copub = rowtotal.copub + collab.copub;
	    });

	  }

	  //for the matrix
	  function mouseover(p) {
	    d3.selectAll(".matrixrow text").classed("active", function(d, i) { return i == p.y; });
	    d3.selectAll(".matrixcolumn text").classed("active", function(d, i) { return i == p.x; });
	  }

	  //for the matrix
	  function mouseout() {
	    d3.selectAll("text").classed("active", false);
	  }

	  matrix_constructed = true;


	  //for the matrix
	  var timeout = setTimeout(function() {
	    order("name");
	    d3.select("#order").property("selectedIndex", 2).node().focus();
	  }, 5000);

	  //for the matrix
	  $("#order").change(function() {
	    clearTimeout(timeout);
	    order(this.value);

	    if(this.value == "count"){
	    	if (hinttranslatecount == 0 && $('#translatematrix').val()!="bar") {
		    	var message = "Hint: translate from the matrix to the bar graph to facilitate quantitative comparisons.";
	    		$('#order_chzn').parent().append( "<div class='actionhinttranslate'>" + message + "</div>" );
	    		//hide it and then show it gradually
	    		$('#order_chzn').next().next().hide();
	    		$('#order_chzn').next().next().show('blind', 1500);

			    
			    //set the height so it is constant for mouseover	
			    $('#matrixactions .actionhinttranslate').css("min-height", $('#matrixactions .actionhinttranslate').height());
			    hinttranslatecount = 1;
			}

		    //set the mouseover behavior	
			$('#matrixactions .actionhinttranslate').mouseover(function() {
		  		$(this).css("opacity", 0.2);
		  		$(this).css("cursor", "pointer");
		  		$(this).css("font-size", "5em");
		  		$(this).css("font-weight", 200);
		  		$(this).text("dismiss");
		  	}).mouseout(function() {
		  		$(this).css("opacity", 1);
		  		$(this).css("cursor", "auto");
		  		$(this).text(message);
		  		$(this).css("font-size", "1.3em");
		  		$(this).css("font-weight", 500);
		  	});  
			  
			//for the user to dismiss an action warning
			$('#matrixactions .actionhinttranslate').click(function() { $(this).hide('blind', 500); } );
	    }

	    else if(this.value == "department") {
	    	for(var i = 0; i < n - 1; i++) {
	    		if(d3.ascending(matrixnodes[orders[this.value][i]].Department, matrixnodes[orders[this.value][i+1]].Department)) {
	    			matrixsvg.transition().delay(9700).selectAll("#row-" + orders[this.value][i+1] + " > line").style("stroke", "#b8b8b8");
	    			matrixsvg.transition().delay(9700).selectAll("#col-" + orders[this.value][i+1] + " > line").style("stroke", "#b8b8b8");
	    		}
	    	}
	    } else {
	    	matrixsvg.selectAll("line").style("stroke", "#eeeeee");
	    }
	  });

	}//end buildMatrix

	  //for the matrix
	  function order(value) { 	
	  	var n = matrixnodes.length;

		  var arrangeMatrix = {
		    name: d3.range(n).sort(function(a, b) { return d3.ascending(matrixnodes[a].Name, matrixnodes[b].Name); }),

		    count: d3.range(n).sort(function(a, b) { 
		    	//seven different combinations for the checkboxes
		    	if ($('input#matrixFilterCo_pubs').is(':checked')==false && $('input#matrixFilterCo_sups').is(':checked')==false && $('input#matrixFilterCo_grants').is(':checked')) {
		    		if ($('input#matrixFilterEXCLUSIVE').is(':checked'))
		    			return matrixnodes[b]._P_SG - matrixnodes[a]._P_SG;
		    		else
		    			return matrixnodes[b].grants - matrixnodes[a].grants;
		    	}
		    	else if ($('input#matrixFilterCo_pubs').is(':checked')==false && $('input#matrixFilterCo_sups').is(':checked') && $('input#matrixFilterCo_grants').is(':checked')==false)
		    		if ($('input#matrixFilterEXCLUSIVE').is(':checked'))
		    			return matrixnodes[b]._PS_G - matrixnodes[a]._PS_G;
		    		else		    		
		    			return matrixnodes[b].cosups - matrixnodes[a].cosups;
		    	else if ($('input#matrixFilterCo_pubs').is(':checked')==false && $('input#matrixFilterCo_sups').is(':checked') && $('input#matrixFilterCo_grants').is(':checked')) {
		    		if ($('input#matrixFilterAND').is(':checked'))
		    			return matrixnodes[b]._PSG - matrixnodes[a]._PSG;
		    		else	
		    			return (matrixnodes[b].cosups + matrixnodes[b].grants) - (matrixnodes[a].cosups + matrixnodes[a].grants);
		    	}
		    	else if ($('input#matrixFilterCo_pubs').is(':checked') && $('input#matrixFilterCo_sups').is(':checked')==false && $('input#matrixFilterCo_grants').is(':checked')==false)
		    		if ($('input#matrixFilterEXCLUSIVE').is(':checked'))
		    			return matrixnodes[b].P_S_G - matrixnodes[a].P_S_G;
		    		else		    		
		    			return matrixnodes[b].copubs - matrixnodes[a].copubs;
		    	else if ($('input#matrixFilterCo_pubs').is(':checked') && $('input#matrixFilterCo_sups').is(':checked')==false && $('input#matrixFilterCo_grants').is(':checked')) {
		    		if ($('input#matrixFilterAND').is(':checked'))
		    			return matrixnodes[b].P_SG - matrixnodes[a].P_SG;
		    		else	
		    			return (matrixnodes[b].copubs + matrixnodes[b].grants) - (matrixnodes[a].copubs + matrixnodes[a].grants);  
		    	}
		    	else if ($('input#matrixFilterCo_pubs').is(':checked') && $('input#matrixFilterCo_sups').is(':checked') && $('input#matrixFilterCo_grants').is(':checked')==false) {
		    		if ($('input#matrixFilterAND').is(':checked'))
		    			return matrixnodes[b].PS_G - matrixnodes[a].PS_G;
		    		else			    		
		    			return (matrixnodes[b].copubs + matrixnodes[b].cosups) - (matrixnodes[a].copubs + matrixnodes[a].cosups); 		    	
		    	}
		    	else if ($('input#matrixFilterCo_pubs').is(':checked') && $('input#matrixFilterCo_sups').is(':checked') && $('input#matrixFilterCo_grants').is(':checked')) {
		    		if ($('input#matrixFilterAND').is(':checked'))
		    			return matrixnodes[b].PSG - matrixnodes[a].PSG;
		    		else			    		
		    			return matrixnodes[b].count - matrixnodes[a].count; 
		    	}
			}),
		    
		    department: d3.range(n).sort(function(a, b) { return d3.ascending(matrixnodes[a].Department, matrixnodes[b].Department); })
		  }		

		if (value != "count")  
			$('#matrixactions .actionwarning').hide('blind', 500); //hide the action warning if it is showing

	  	//if the value is 'count' but no collaborations are selected
	  	if (value == "count" && ($('input#matrixFilterCo_pubs').is(':checked')==false && $('input#matrixFilterCo_sups').is(':checked')==false && $('input#matrixFilterCo_grants').is(':checked')==false)){
	  		var message = "All collaboration types are currently hidden. At least one type must be showing to arrange the matrix according to this criterion.";
	    	//create the div if it doesn't already exist
	    	if ($('#order_chzn').next().next().length == 0){
	    		$('#order_chzn').parent().append( "<div class='actionwarning'>" + message + "</div>" );
	    		//hide it and then show it gradually
	    		$('#order_chzn').next().next().hide();
	    		$('#order_chzn').next().next().show('blind', 1500);
	    	}
	    	//it it already exists, show it
	    	else
	    		$('#matrixactions .actionwarning').show('blind', 1500);

		    
		    //set the height so it is constant for mouseover	
		    $('#matrixactions .actionwarning').css("min-height", $('#matrixactions .actionwarning').height());

		    //set the mouseover behavior	
			$('#matrixactions .actionwarning').mouseover(function() {
		  		$(this).css("opacity", 0.2);
		  		$(this).css("cursor", "pointer");
		  		$(this).css("font-size", "5em");
		  		$(this).css("font-weight", 200);
		  		$(this).text("dismiss");
		  	}).mouseout(function() {
		  		$(this).css("opacity", 1);
		  		$(this).css("cursor", "auto");
		  		$(this).text(message);
		  		$(this).css("font-size", "1.3em");
		  		$(this).css("font-weight", 500);
		  	});  
			  
			//for the user to dismiss an action warning
			$('#matrixactions .actionwarning').click(function() { $(this).hide('blind', 500); } );

		}
		else {//otherwise, arrange the matrix 
	    	//console.log(arrangeMatrix[value]);
	    	matrix_x.domain(arrangeMatrix[value]);	
	    	}	  
		    	
	    var t = matrixsvg.transition().duration(2500);

	    t.selectAll(".matrixrow")
	        .delay(function(d, i) { return matrix_x(i) * 4; })
	        .attr("transform", function(d, i) { return "translate(0," + matrix_x(i) + ")"; })
	      .selectAll(".matrixcell")
	        .delay(function(d) { return matrix_x(d.x) * 4; })
	        .attr("x", function(d) { return matrix_x(d.x); });

	    t.selectAll(".matrixcolumn")
	        .delay(function(d, i) { return matrix_x(i) * 4; })
	        .attr("transform", function(d, i) { return "translate(" + matrix_x(i) + ")rotate(-90)"; });
	  }

	function move_towards_center(alpha) {
	      return function(d){
	        console.log("d: " + d);
	        console.log("i: " + i);
	        console.log("this: " + this);
	        d.y += (normal_center.y - d.y) * 0.12 * tick.alpha;
	        d.x += (normal_center.x - d.x) * 0.12 * tick.alpha;

	      };
	}

	//adds text to the matrix bars
	function addBarCounts() {
		// _.each($('.matrixrowbar'), function() {
	 //    		.append("text") 
	 //    		.data(matrixnodes)
	 //    		.attr("x", function(d) {
	 //    			return d.width.animVal.value; } )
	 //    		.attr("fill", "white")
	 //    		.text(function(d2) { 
	 //    			return d.count; } );
		// });
	}


	function constructnetworkdepartmentlegend(science_departments) {

		var selectedDepartments = [];

	  var label = networkdepartmentlegend.selectAll(".label")
	    .data(science_departments)
	    .enter().append("div")
	    .attr("class", "label")
	    .style("border", "1px dashed")
	    .style("border-color", "rgba(255,255,255,0)")
	    //.attr("selected", false) //keeps track of whether a label in the legend has been selected (i.e., clicked on)
	    .text(function(d) { return d; });

	    label
	    .append("div")
	    .attr("class", "labelcolor")
	    .style("background-color", function(d){ return color20(d); });

		label
			.on("mouseover", function(d) {
				var label = this;
				d3.select(label)
					.style("background-color", "rgb(36,137,197)")
					.style("color", "white");
				d3.selectAll("circle.node").each(function() {
					if (this.__data__.Department != d && !_.contains(selectedDepartments, this.__data__.Department)) {
							d3.select(this).style("opacity", "0.05");
					}
					else {
						d3.select(this).style("opacity", "1");
					}
				});
				d3.selectAll("line.link").each(function(link) {
					if ((link.source.Department == d || _.contains(selectedDepartments, link.source.Department)) && (link.target.Department == d || _.contains(selectedDepartments, link.target.Department))) {
							d3.select(this).style("opacity", "1");
					}
					else
						d3.select(this).style("opacity", "0");
				});
			})
			.on("mouseout", function(d) {
				var label = this;				
				if (!_.contains(selectedDepartments, d)){
					d3.select(label)
						.style("background-color", "white")
						.style("color", "black");	

					//if no departments are currently selected
					if( _.isEmpty(selectedDepartments)){
						d3.selectAll("circle.node").style("opacity", "1");
						d3.selectAll("line.link").style("opacity", "1");
					}
					else {									
						d3.selectAll("circle.node").each(function() {
							if(_.contains(selectedDepartments, this.__data__.Department))
								d3.select(this).style("opacity", "1");
							else
								d3.select(this).style("opacity", "0.05");
						});


						d3.selectAll("line.link").each(function(link) {
							if (_.contains(selectedDepartments, link.source.Department) && _.contains(selectedDepartments, link.target.Department))
								d3.select(this).style("opacity", "1");
							else
								d3.select(this).style("opacity", "0");
						});	
					}
				}			
			})
			.on("click", function(d) {
				var label = this;
				//if currently selected, "unselect" it
				if (_.contains(selectedDepartments, d)){
					selectedDepartments = _.without(selectedDepartments, d);
					console.log(selectedDepartments);
					 d3.select(label)
					 	.style("border-color", "rgba(255,255,255,0)");
					d3.selectAll("circle.node").each(function() {
						if (this.style.opacity == "0.1" && !label.selected)
							d3.select(this).style("opacity", "1");
					});
					d3.selectAll("line.link").each(function(link) {
						if (this.style.opacity == "0" && !label.selected)
							d3.select(this).style("opacity", "1");
					});	
					//label.selected = false;				
				}
				//if not currently selected, "select" it
				else {
					selectedDepartments.push(d);
					console.log(selectedDepartments);
					d3.select(label)
						.style("background-color", "rgb(36,137,197)")
						.style("color", "white")
						.style("border-color", "rgba(255,255,255,1)");
					d3.selectAll("circle.node").each(function() {
						if (this.__data__.Department != d && !_.contains(selectedDepartments, this.__data__.Department)) {
								d3.select(this).style("opacity", "0.05");
						}
						else {
							d3.select(this).style("opacity", "1");
						}
					});
					d3.selectAll("line.link").each(function(link) {
						if ((link.source.Department == d || _.contains(selectedDepartments, link.source.Department)) && (link.target.Department == d || _.contains(selectedDepartments, link.target.Department))) {
								d3.select(this).style("opacity", "1");
						}
						else
							d3.select(this).style("opacity", "0");
					});
					label.selected = true; //TODO: remove this property
				}			
			});

		$('#networkdepartmentlegendtoggle').css('left', $('#networkdepartmentlegend').width()/2 + $('#networkdepartmentlegendtoggle').width()/2);

	}

	//since matrix rows and columns are not bound with department data, nodes(science_faculty_data) are needed here
	function constructmatrixlegends(science_departments, nodes) {

	  var selectedDepartments = [];

	  var label = matrixdepartmentlegend.selectAll(".label")
	    .data(science_departments)
	    .enter().append("div")
	    .attr("class", "label")
	    .style("border", "1px dashed")
	    .style("border-color", "rgba(255,255,255,0)")
	    .text(function(d) { return d; });

	    label.append("div")
	    .attr("class", "labelcolor")
	    .style("background-color", function(d){ return color20(d); });

	    label.on("mouseover", function(d) {
	    	var label = this;
			d3.select(label)
				.style("background-color", "rgb(36,137,197)")
				.style("color", "white");
			//if the label is not selected
			if (!_.contains(selectedDepartments, d)){
				d3.selectAll(".matrixrow").each(function() {
					if (selectedDepartments.length == 0) {
						d3.select(this).selectAll("rect.matrixcell").attr("previousopacity", function() { return this.style.opacity; });	
					}				
					if (nodes[this.id.substring(4)].Department != d && !_.contains(selectedDepartments, nodes[this.id.substring(4)].Department)) {
						d3.select(this).selectAll("rect.matrixcell").style("opacity", function() { return "0.05"; });
						d3.select(this).selectAll("text").style("opacity", "0.05");
						d3.select(this).selectAll("rect.matrixcell").attr("labelfiltered", 1); //specify that each of these cells is currently filtered
					}
					else {
						d3.select(this).selectAll("rect.matrixcell").style("opacity", function() { return this.attributes.previousopacity.value; });
						d3.select(this).selectAll("rect.matrixcell").attr("labelfiltered", 0); //specify that each of these cells is currently filtered						
						d3.select(this).selectAll("rect.matrixcell").style("visibility", "visible");						
					 }
				}); 
			}
			//for the text
			d3.selectAll(".matrixcolumn").each(function() {
				if (nodes[this.id.substring(4)].Department != d && !_.contains(selectedDepartments, nodes[this.id.substring(4)].Department)) {
					d3.select(this).selectAll("text").style("opacity", "0.05");
				}
				else {
					d3.select(this).selectAll("text").style("opacity", "1");
				}
			});
			d3.selectAll(".matrixrow").each(function() {
				if (nodes[this.id.substring(4)].Department != d && !_.contains(selectedDepartments, nodes[this.id.substring(4)].Department)) {
					d3.select(this).selectAll("text").style("opacity", "0.05");
				}
				else {
					d3.select(this).selectAll("text").style("opacity", "1");
				}
			});
			//this conditional is to trigger an update
			if ($('input#matrixFilterCo_pubs').is(':checked'))
				pubsChecked();
			else
				pubsUnchecked();			
	    })
	    .on("mouseout", function(d) {
	    	var label = this;
			if (!_.contains(selectedDepartments, d)){
				d3.select(label)
					.style("background-color", "white")
					.style("color", "black");

				//if no departments are currently selected
				if( _.isEmpty(selectedDepartments)){
					//restore previous opacity values of all cells
					d3.selectAll('rect.matrixcell').each(function() {
						d3.select(this).style("opacity", function() { return this.attributes.previousopacity.value; });
					});
					d3.selectAll("text").style("opacity", "1");
					d3.selectAll(".matrixcell").attr("labelfiltered", 0); //they are not filtered anymore					
				}
				else {
					d3.selectAll(".matrixrow").each(function() {
						if(_.contains(selectedDepartments, nodes[this.id.substring(4)].Department)) {
							d3.select(this).selectAll("rect.matrixcell").each(function() {
								if (this.attributes.previousopacity != 1)
									d3.select(this).style("opacity", function() { return this.attributes.previousopacity.value; });
								else							
									d3.select(this).style("opacity", "1");
							});
							d3.select(this).selectAll("text").style("opacity", "1");							
						}
						else {
							d3.select(this).selectAll("rect.matrixcell").each(function() {
								d3.select(this).style("opacity", "0.05");
								d3.select(this).attr("labelfiltered", 1); //now filtered								
							});
							d3.select(this).selectAll("text").style("opacity", "0.05");
						}
					});
					d3.selectAll(".matrixcolumn").each(function() {
						if(_.contains(selectedDepartments, nodes[this.id.substring(4)].Department)) {
							d3.select(this).selectAll("text").style("opacity", "1");
						}
						else {
							d3.select(this).selectAll("text").style("opacity", "0.05");
						}
					});
				}			
			}
			//this conditional is to trigger an update
			if ($('input#matrixFilterCo_pubs').is(':checked'))
				pubsChecked();
			else
				pubsUnchecked();		
	    })
	    .on("click", function(d) {
	    	var label = this;
			//if currently selected, "unselect" it
			if (_.contains(selectedDepartments, d)){
				selectedDepartments = _.without(selectedDepartments, d);
				d3.select(label)
				 	.style("border-color", "rgba(255,255,255,0)");			 	
			}
			//if not currently selected, "select" it
			else {
				selectedDepartments.push(d);
				d3.select(label)
					.style("background-color", "rgb(36,137,197)")
					.style("color", "white")
					.style("border-color", "rgba(255,255,255,1)");
				}
			//trigger a mouseover event
			$(this).onmouseover();	
	    });

		$('#matrixdepartmentlegendtoggle').css('left', $('#matrixdepartmentlegend').width()/2 + $('#matrixdepartmentlegendtoggle').width()/2);

	}

	function constructChord() {
		getChordData(buildChord);
	}

	function getChordData(callback) {
		var links_combined, science_faculty_data, science_departments;
		async.parallel(
	    [

	      function(callback){
	        if(store.session.has("links_combined")){
	          console.log("links_combined is already in sessionStorage...no need to fetch again");
	          links_combined = store.session("links_combined");
	          callback(null);
	        }
	        else {
	          console.log("fetching links_combined...");
	          //...
	        }
	      },

	      function(callback){
	        if(store.session.has("science_faculty_data")){
	          console.log("science_faculty_data is already in sessionStorage...no need to fetch again");
	          science_faculty_data = store.session("science_faculty_data");
	          callback(null);          
	        }
	        else {
	          console.log("fetching science_faculty_data...");
	          $.get('/network/science_faculty_data', function(result){
	            science_faculty_data = JSON.parse(result.science_faculty_data);
	            store.session("science_faculty_data", science_faculty_data);
	            callback(null);            
	          });
	        } 
	      },

	      function(callback){
	        if(store.session.has("science_departments")){
	          console.log("science_departments is already in sessionStorage...no need to fetch again");
	          science_departments = store.session("science_departments");
	          callback(null);          
	        }
	        else {
	          console.log("fetching science_departments...");
	          $.get('network/science_departments', function(result){
	            science_departments = JSON.parse(result.science_departments);
	            store.session("science_departments", science_departments);
	            callback(null);            
	          });
	        }
	      }

	    ],

	      function(err, results){
	      	if (err) throw new Error(err);
	        callback(links_combined, science_faculty_data, science_departments);
	      }
	    );
	}

	function buildChord(links_combined, science_faculty_data, science_departments) {
		var chordMatrix = [];
		var chordDetailsMatrix = [];
		var groupNum = science_departments.length;

		//initilization of matrix...not an elegant way:(
		for(var i = 0; i < groupNum; i++) {
			chordMatrix[i] = new Array();
			chordDetailsMatrix[i] = new Array();
			for(var j = 0; j < groupNum; j++) {
				chordMatrix[i][j] = 0;
				chordDetailsMatrix[i][j] = {pub: 0, sup: 0, grant: 0};
			}
		}
		links_combined.forEach(function(link) {
			var source, target;
			science_departments.forEach(function(dept, index) {
				if(science_faculty_data[link.source].Department == dept)
					source = index;
				if(science_faculty_data[link.target].Department == dept)
					target = index;
			})
			chordMatrix[source][target]++;
			chordMatrix[target][source]++;
			if(link.type == "supervision")
				chordDetailsMatrix[source][target].sup++, chordDetailsMatrix[target][source].sup++;
			else if(link.type == "grant")
				chordDetailsMatrix[source][target].grant++, chordDetailsMatrix[target][source].grant++;
			else //publication
				chordDetailsMatrix[source][target].pub++, chordDetailsMatrix[target][source].pub++;
		})

		var chord = d3.layout.chord()
			.padding(0.05)
			.matrix(chordMatrix);
		var innerRadius = Math.min(svgwidth, svgheight) * .41,
			outerRadius = innerRadius * 1.1;

		//process the chord to separate the co-pubs, co-sups and co-grants
		var processedChords = [];
		(chord.chords()).forEach(function(d) {
			var source = d.source.index;
			var target = d.target.index;
			var pubPercent = chordDetailsMatrix[source][target].pub / chordMatrix[source][target];
			var supPercent = chordDetailsMatrix[source][target].sup / chordMatrix[source][target];
			var grantPercent = chordDetailsMatrix[source][target].grant / chordMatrix[source][target];
			//build new chord object
			var pubchord = new Object();
			var supchord = new Object();
			var grantchord = new Object();

			pubchord.source = new Object();
			supchord.source = new Object();
			grantchord.source = new Object();

			pubchord.target = new Object();
			supchord.target = new Object();
			grantchord.target = new Object();

			pubchord.type = "copub";
			supchord.type = "cosup";
			grantchord.type = "grant";

			pubchord.source.index = supchord.source.index = grantchord.source.index = source;
			pubchord.source.subindex = supchord.source.subindex = grantchord.source.subindex = d.source.subindex;
			pubchord.target.index = supchord.target.index = grantchord.target.index = target;
			pubchord.target.subindex = supchord.target.subindex = grantchord.target.subindex = d.target.subindex;

			pubchord.source.value = pubchord.target.value = chordDetailsMatrix[source][target].pub;
			supchord.source.value = supchord.target.value = chordDetailsMatrix[source][target].sup;
			grantchord.source.value = grantchord.target.value = chordDetailsMatrix[source][target].grant;

			var startSource, endSource, startTarget, endTarget;
			if(source == target) {
				startSource = d.source.startAngle;
				startTarget = d.target.endAngle;
				endSource = endTarget = startSource + (startTarget - startSource) / 2;
			} else {
				startSource = d.source.startAngle;
				endSource = d.source.endAngle;
				startTarget = d.target.startAngle;
				endTarget = d.target.endAngle;
			}

			pubchord.source.startAngle = startSource;
			pubchord.source.endAngle = supchord.source.startAngle = startSource + (endSource - startSource) * pubPercent;
			supchord.source.endAngle = grantchord.source.startAngle = supchord.source.startAngle + (endSource - startSource) * supPercent;
			grantchord.source.endAngle = endSource;

			pubchord.target.startAngle = startTarget;
			pubchord.target.endAngle = supchord.target.startAngle = startTarget + (endTarget - startTarget) * pubPercent;
			supchord.target.endAngle = grantchord.target.startAngle = supchord.target.startAngle + (endTarget - startTarget) * supPercent;
			grantchord.target.endAngle = endTarget;
			
			if(source == target) {
				var tmp = pubchord.target.startAngle;
				pubchord.target.startAngle = pubchord.target.endAngle;
				pubchord.target.endAngle = tmp;
				tmp = supchord.target.startAngle;
				supchord.target.startAngle = supchord.target.endAngle;
				supchord.target.endAngle = tmp;
				var tmp = grantchord.target.startAngle;
				grantchord.target.startAngle = grantchord.target.endAngle;
				grantchord.target.endAngle = tmp;
			}

			processedChords.push(pubchord);
			processedChords.push(supchord);
			processedChords.push(grantchord);
		})

		var chordsvg = networksvg.append("g").attr("transform", "translate(" + svgwidth / 2 + "," + svgheight / 2 + ")");
		chordsvg.append("g").selectAll("path.group")
			.data(chord.groups)
			.enter().append("path")
			.attr("class", "group")
			.style("fill", function(d, i) { return color20(science_departments[i]); })
			.style("stroke", "#000")
			.attr("d", d3.svg.arc().innerRadius(innerRadius).outerRadius(outerRadius))
			.style("opacity", 1)
			.style("display", "none");
		chordsvg.append("g").selectAll("path.chord")
			.data(processedChords)
			.enter().append("path")
			.attr("class", "chord")
			.attr("d", d3.svg.chord().radius(innerRadius))
		    .style("fill", function(d, i) { return color20(science_departments[d.source.index]); })
		    .style("opacity", 0.8)
		    .style("display", "none");
	}

	function redrawNetwork() {
	  trans=d3.event.translate;
	  scale=d3.event.scale;

	  networksvg.attr("transform",
	      "translate(" + trans + ")"
	      + " scale(" + scale + ")");
	}

	function redrawMatrix() {
	  trans=d3.event.translate;
	  scale=d3.event.scale;

	  matrixsvg.attr("transform",
	      "translate(" + trans + ")"
	      + " scale(" + scale + ")");
	}

	function highlightSelectedNode (name) {
	  d3.selectAll("circle.node").each( function () {
	    if (this.__data__.Name != name)
	      d3.select(this).style("opacity", 0.07);
	    else {
	      chosenNode = this;
	      d3.selectAll("line.link").each( function () {
	        if ((this["x1"].animVal.value == chosenNode["cx"].animVal.value && this["y1"].animVal.value == chosenNode["cy"].animVal.value) || (this["x2"].animVal.value == chosenNode["cx"].animVal.value && this["y2"].animVal.value == chosenNode["cy"].animVal.value))
	          d3.select(this).style("opacity", 1);
	        else
	          d3.select(this).style("opacity", 0.03);
	      });
	    }
	  });

	  //go through each node to see if it is connected to a link that has opacity of 1 (i.e., the node is connected to the highlighted person)
	  //need to wait 1000 for the transition above to complete
	  setTimeout( function () {
	  d3.selectAll("circle.node").each( function () {
	    that=this;
	    d3.selectAll("line.link").each( function () {
	      //if the node is connected to the link AND the link has an opacity of 1
	      if (((this["x1"].animVal.value == that["cx"].animVal.value && this["y1"].animVal.value == that["cy"].animVal.value) || (this["x2"].animVal.value == that["cx"].animVal.value && this["y2"].animVal.value == that["cy"].animVal.value)) && (parseFloat(this["style"].opacity) == 1)){
	        d3.select(that).style("opacity", 1);
	      }
	    });
	  });
	  d3.select(chosenNode).style("opacity", 1).style("stroke", "#ff0000").style("stroke-width", 2);
	  }, 1000);

	}//end highlightSelectedNode

	/*
	highlights a row and column in the matrix that corresponds to a given name by lowering the opacity of all others 
	@params: name: the name of the individual that has been searched
	@returns: none
	*/
	function highlightSelectedRow (name) {
		var collaborators = []; //for later filtering the column names
  	  d3.selectAll("rect.matrixcell").each(function() {	 
  	  	var notfiltered = this.attributes.labelfiltered == null || this.attributes.labelfiltered.value == 0;   	 
		if (notfiltered) //if not currently filtered
			d3.select(this).attr("previousopacity", function() { return this.style.opacity; }); 
    	
		if (notfiltered && _.last(this.parentNode.childNodes).textContent != name) { //if not currently filtered
			d3.select(this).style("opacity", function() { return 0.05; });
			d3.select(this).attr("searchfiltered", 1);
		}
		else if (!notfiltered && _.last(this.parentNode.childNodes).textContent == name) { //if it is currently filtered
			d3.select(this).style("opacity", function() { return this.attributes.previousopacity.value; });//restore its previous opacity
			d3.select(this).style("visibility", "visible");
			d3.select(this).attr("searchfiltered", 1);
		}
    	}); 	    	

	  d3.selectAll(".matrixrow text").each( function () {
	    d3.select(this).attr("opacitybeforesearch", function() { return this.style.opacity; });//to accomodate filtered names	  	
	    if (this.textContent != name) {
	      	d3.select(this).style("opacity", 0.05);
	      }
	    else {
			d3.select(this).style("opacity", 1);
			d3.select(this.parentElement).selectAll("rect.matrixcell").each(function() {
				collaborators.push(this.childNodes[0].textContent.substring(this.childNodes[0].textContent.indexOf('b>')+2 , this.childNodes[0].textContent.indexOf('&')-1));
			});
	    }
	  });
  	  d3.selectAll(".matrixcolumn text").each( function () {
	    d3.select(this).attr("opacitybeforesearch", function() { return this.style.opacity; });//to accomodate filtered names	  	  	  	
    	if (!_.contains(collaborators, this.textContent))
      		d3.select(this).style("opacity", 0.05);
    	else {
			d3.select(this).style("opacity", 1);
    	}
  	  });  	  	  

	}//end highlightSelectedRow	

	function countLinks (type) {
	  d3.selectAll("circle.node").each( function () {
	  	d3.select(this).attr(type+"s", 0); //(re)set the count to 0
	    that=this;
	    d3.selectAll("line.link").each( function () {
	    	var a =1;
	      //if the node is connected to the link AND the link has an opacity of 1
	      if (((this["x1"].animVal.value == that["cx"].animVal.value && this["y1"].animVal.value == that["cy"].animVal.value) || (this["x2"].animVal.value == that["cx"].animVal.value && this["y2"].animVal.value == that["cy"].animVal.value)) && this.__data__.type == type) {
	        d3.select(that).attr((type + "s"), function(){return parseInt($(that).attr(type + "s"))+1;})
	      }
	    });
	  });
	}

	function sizeNodes (type) {
	  d3.selectAll("circle.node").each( function () {
	  	if (type == "combined") {
	  		d3.select(this).attr("r", function() { return scale_combined( parseInt($(this).attr("supervisions")) + parseInt($(this).attr("grants")) + parseInt($(this).attr("publications"))); });
	  	}
	  	else if (type == "grant") {
	  		d3.select(this)/*.transition().duration(1000)*/.attr("r", function() { return scale_grants( parseInt($(this).attr("grants"))); });
	  	}
	  	else if (type == "publication") {
	    	d3.select(this)/*.transition().duration(1000)*/.attr("r", function() { return scale_copubs( parseInt($(this).attr("publications"))); });
	    }
	  	else if (type == "supervision") {
	    	d3.select(this)/*.transition().duration(1000)*/.attr("r", function() { return scale_cosups( parseInt($(this).attr("supervisions"))); });
	    }
	    else if (type == "uniform") {
	    	d3.select(this).attr("r", 10);
	    }	    
	  });
//	  setTimeout(function() {
	  	network_force.charge(function(d, i) {
	  	  var radius = $("circle.node")[i].r.animVal.value;
		  //return -Math.pow((radius - 10), 2) * 2;
		  //return -radius * 35;
		  return -Math.pow(radius, 2) / 1.5;
		  //return -200;
		})
		.linkDistance(function(d, i) {
			var r_source = $("circle.node")[d.source.index].r.animVal.value;
			var r_target = $("circle.node")[d.target.index].r.animVal.value;
			return 70 + r_source + r_target;
		}).start();
//	  }, 1000);
	  
	}

	//takes an array of link objects and returns the same array with all duplicate links removed
	//directionality doesn't matter 
	function getUniqueLinks(arr) {
	  var out = [];
	  temp = arr;
	  //push the first elements to the new array so there is something to compare to...notice the value is 0
	  out.push({"source":arr[0].source, "target":arr[0].target, "value":0, "year":arr[0].year});

	  //go through the rest of the array
	  for (i=0; i<arr.length; i++){
	    for (ind=0; ind<out.length; ind++){
	      var match = false;
	      //if the connection exists already, increase its value by 1
	      if ((out[ind].source === arr[i].source && out[ind].target === arr[i].target) || (out[ind].source === arr[i].target && out[ind].target === arr[i].source)) {
	        out[ind].value += 1;
	        match = true;
	        break;
	      }
	    }
	      //if the connection doesn't exist in out (i.e., no match), add it with a value of 1
	    if (match === false) {
	      out.push({"source":arr[i].source, "target":arr[i].target, "value":1, "year":arr[i].year});
	    }
	  }//end arr loop
	  return out;    
	}//end getUniqueLinks

	//takes an object with key:value pairs...returns the highest of the values
	function getHighestCount (counts) {
	  var highest = 0;
	  Object.keys(counts).forEach(function (d) {
	    if (counts[d] >= highest)
	      highest = counts[d];
	  });
	  return highest; 
	}

	/*
	updates the selectionArea div, which displays the names of the currently selected nodes

	@params: command: function can be called with special commands such as "empty"
	@returns: none
	*/
	function updateSelectionArea (command) {
		if (command == "empty") {
			//empty the selection area by removing div elements
			//keeps the h3 element
			$('#selectionList').contents().filter('li').remove();
			//$('#cloningArea').contents().filter('svg').remove();
			cloningSvg.selectAll('*').remove();
		}
		else {
			var items = d3.select("#selectionList").selectAll(".item")

				.data(selectedNodes, function(d) { return d.Name; } ); //<--this "key function" replaces the default bind-by-index behavior 

			items.enter()
				.append("li")
				.attr("class", "item")
				.text(function(d) { return d.Name; } )
				.style("color", function(d) { return color20(d.Department); } );

			items
				.on("mouseover", function(d) {
					d3.select(this)
						.style("background-color", "rgb(36,137,197)")//function(d) { return color20(d.Department) })
						.style("color", "white");
					
					var datum = d;
					var collaborations;
					d3.selectAll("circle.node").each(function(d) {
						if(d == datum) {
							d3.select(this).style("fill", "gray");
							collaborations = {
								"publications": $(this).attr("publications"), 
								"supervisions": $(this).attr("supervisions"), 
								"grants": $(this).attr("grants")};
						}
					});

					var top = $(this).position().top + $('#selectionArea').position().top;
					var left = $(this).position().left + $(this).width() + $('#selectionArea').position().left + 35;

					$('#networkviz').append('<div class="itemDetails" id="itemDetails-' + d.ID + '"></div>');
					$('#itemDetails-' + d.ID)
						.css({
							top: top + "px",
							left: left + "px"
						})
						.html('<b>Name: </b>' + d.Name + '<br>'
							+ '<b>ID: </b>' + d.ID + '<br>'
							+ '<b>Department: </b>' + d.Department + '<br>'
							+ '<b>Rank: </b>' + d.Rank + '<br>'
							+ '<b>Co-Publications: </b>' + collaborations.publications + '<br>'
							+ '<b>Co-Supervisions: </b>' + collaborations.supervisions + '<br>'
							+ '<b>Co-Grants: </b>' + collaborations.grants);
					$('#itemDetails-' + d.ID).show('slow');
				})
				.on("mouseout", function(d) {
					if(!d3.select(this).classed("chosen")) {
						d3.select(this).style("background-color", "white")
						.style("color", function(d) { return color20(d.Department); } );	
					}

					var datum = d;
					d3.selectAll("circle.node").each(function(d) {
						if(d == datum) {
							if($('#selectionShow').is(':checked'))
								d3.select(this).style("fill", function(d) { return color20(d.Department); });
							else
								d3.select(this).style("fill", "white");
						}
					});
					$('#itemDetails-' + d.ID).hide(100, function() { this.remove(); });
				})
				.on("click", function(d) {
					if(d3.select(this).classed("chosen")) {
						d3.select(this).classed("chosen", false);
					} else {
						d3.select(this).classed("chosen", true);
					}

// 					var counts = d3.select("#selectionList").selectAll("li.item.chosen")[0].length;
// 					if(counts == 0) {
// 						$('#itemsAll').show();
// 						$('#itemsClear').hide();
// 						$('#itemsCompare').hide();
// 						$('#itemLinechart').hide();
// 					} else if(counts == 1) {
// 						$('#itemsAll').hide();
// 						$('#itemsClear').show();
// 						$('#itemsCompare').hide();
// 						$('#itemLinechart').show();
// 					} else {
// 						$('#itemsAll').hide();
// 						$('#itemsClear').show();
// 						$('#itemsCompare').show();
// 						$('#itemLinechart').hide();
// 					}

					// if(selectedNodes.length > 1)
					// 	$('#itemsChooseAll').parent().slideDown('fast');
					// else
					// 	$('#itemsChooseAll').parent().slideUp('fast');

					var counts = d3.select("#selectionList").selectAll("li.item.chosen")[0].length;
					if(counts == 0) {
						$('#itemsCompare').parent().hide('fast');
						$('#itemsCompare').hide();
						$('#itemLinechart').hide();
					} else if(counts == 1) {
						$('#itemsCompare').parent().show('fast');
						$('#itemsCompare').hide();
						$('#itemLinechart').show();
					} else {
						$('#itemsCompare').parent().show('fast');
						$('#itemsCompare').show();
						$('#itemLinechart').hide();
					}

					if(counts == selectedNodes.length)
						$('#itemsChooseAll').css("background", "grey").css("color", "rgb(162,162,162").css("cursor", "default");
					else
						$('#itemsChooseAll').css("background", "rgb(36,137,197)").css("color", "white").css("cursor", "pointer");

					if (counts == 0)
						$('#itemsChooseNone').css("background", "grey").css("color", "rgb(162,162,162").css("cursor", "default");
					else
						$('#itemsChooseNone').css("background", "rgb(36,137,197)").css("color", "white").css("cursor", "pointer");
				});

			items.exit().remove();
		}

			if(selectedNodes.length > 1)
				$('#itemsChooseAll').parent().slideDown('fast');
			else
				$('#itemsChooseAll').parent().slideUp('fast');
			$('#itemsChooseAll').css("background", "rgb(36,137,197)").css("color", "white").css("cursor", "pointer");
			$('#itemsChooseNone').css("background", "grey").css("color", "rgb(162,162,162").css("cursor", "default");
			// if(d3.selectAll('.item.chosen')[0].length > 1)
			// 	$('#itemsCompare').show('fast');
			// else 
			// 	$('#itemsCompare').hide('fast');
			var counts = d3.select("#selectionList").selectAll("li.item.chosen")[0].length;
			if(counts == 0) {
				$('#itemsCompare').parent().hide('fast');
				$('#itemsCompare').hide();
				$('#itemLinechart').hide();
			} else if(counts == 1) {
				$('#itemsCompare').parent().show('fast');
				$('#itemsCompare').hide();
				$('#itemLinechart').show();
			} else {
				$('#itemsCompare').parent().show('fast');
				$('#itemsCompare').show();
				$('#itemLinechart').hide();
			}

	}

	/* 
	Resolve collisions between nodes
	@params: alpha: 
			 nodes: nodes of the network (keep ??)
	@returns: 
	*/
	function collide(alpha) {
	  var quadtree = d3.geom.quadtree(node);
	  return function(d) {
	    var r = this.r.animVal.value + 10,
	        nx1 = d.x - r,
	        nx2 = d.x + r,
	        ny1 = d.y - r,
	        ny2 = d.y + r;
	    quadtree.visit(function(quad, x1, y1, x2, y2) {
	      if (quad.point && (quad.point !== d)) {
	        var x = d.x - quad.point.x,
	            y = d.y - quad.point.y,
	            l = Math.sqrt(x * x + y * y),
	            r = this.r.animVal.value + 10 + (d.color !== quad.point.color) * padding;
	        if (l < r) {
	          l = (l - r) / l * alpha;
	          d.x -= x *= l;
	          d.y -= y *= l;
	          quad.point.x += x;
	          quad.point.y += y;
	        }
	      }
	      return x1 > nx2
	          || x2 < nx1
	          || y1 > ny2
	          || y2 < ny1;
	    });
	  };
	}	

	/*
	constructs the links for the network based on grant collaborations
	@params: all_grants: all of the grants as retrieved from the database
			 nodes: the nodes that will be used in the network (needed to calculate source and target values for the links)
	@returns: links for grant collaborations that are exclusive to members of the faculty of science
	*/
	function constructGrantLinks(all_grants, nodes) {
	    //group grants by the proposal number (i.e., group multiple records of the same grant)
	    var grouped_grants = _.groupBy(all_grants, function(x) { return x.Proposal; });

	    _.each(grouped_grants, function(grantobj, key) { 
	      if (grantobj.length > 1) {
	        var temp = rm.combineObjects(grantobj); 
	        grouped_grants[key] = temp;
	      } 
	      else
	        grouped_grants[key] = grantobj[0]; //remove the object from its array enclosure so that the resulting grouped_grants is consistent
	    });

		var co_grants = _.filter(grouped_grants, function(grant) { return typeof grant.CoI == "object"; })

					//loop through each grant 
					_.each(co_grants, function(grant) {

						var people = [];
						people.push(grant.PI.substring(0, grant.PI.indexOf(',') + 2));
						_.each(grant.CoI, function(x) {
							people.push(x.substring(0, x.indexOf(',') + 2));
						});
						people = _.uniq(people); //remove duplicates

						//loop through each Co Investigator of a grant
						_.each(people, function (person) {

							//if person is not the last in the collaboration
							if (person != _.last(people)) {

								//make him/her the source
								var source = person;

								var counter = 1;//use to keep track of the target index
						        do {
						          var target = people[counter];
						          if (target != source) {
						          	links_grants.push({"source":source, "target":target, "value":0, "sponsor":grant.Sponsor, "begin":grant.BeginDate, "end":grant.EndDate, "program":grant.PgmName, "type":"grant", "title":grant.Title, "status":grant.AwardStatus, "proposal":grant.Proposal, "PI":grant.PI });
						          }

						          counter += 1;
						        } while (target != _.last(people)); //while target is not the last element 
							 }
						});
					});

					_.each (links_grants, function(grant){
						_.each(nodes, function(person, index, list){
							if (grant.source == person.Name.substring(0,person.Name.indexOf(',')+2))
								grant.source = parseInt(index);
							if (grant.target == person.Name.substring(0,person.Name.indexOf(',')+2))
								grant.target = parseInt(index);
						});
					});
				return _.filter(links_grants, function(grant) { return (typeof grant.source == "number" && typeof grant.target == "number"); });
	}//end constructGrantsLinks	

	/*
	count publications, supervisions and grants of every nodes. Then add the numbers to the node attributes.
	@params: none
	@returns: none
	*/
	function countCollaborationsOfNodes() {
		node = d3.selectAll("circle.node");
		d3.selectAll("line.link").each(function(d) {
			if(d.type == "publication") {
				node[0][d.source].attributes[3].value++;
				node[0][d.target].attributes[3].value++;
			} else if(d.type == "supervision") {
				node[0][d.source].attributes[4].value++;
				node[0][d.target].attributes[4].value++;
			} else { //grant
				node[0][d.source].attributes[5].value++;
				node[0][d.target].attributes[5].value++;
			}
		});
	}

	/*
	resizes the visualization area if the action panel is hidden or shown
	@params: none
	@returns: none
	*/
	function resizeViz() {
		if ($('#matrixviz').is(':visible')) {
			$('#matrixviz').css('width', $(window).width()-50);
			$('#vizcontainer').css('width', $(window).width()-50);
			$('#matrixviz svg').css('width', $(window).width()-50);
			$('#matrixdepartmentlegendtoggle').css('left', $('#matrixdepartmentlegend').width()/2 + $('#matrixdepartmentlegendtoggle').width()/2);
		}
		else if ($('#networkviz').is(':visible')) {
			$('#networkviz').css('width', $(window).width()-50);
			$('#vizcontainer').css('width', $(window).width()-50);
			$('#networkviz svg').css('width', $(window).width()-50);
			$('#networkdepartmentlegendtoggle').css('left', $('#networkdepartmentlegend').width()/2 + $('#networkdepartmentlegendtoggle').width()/2);
		}
	}

}());
