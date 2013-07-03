/*
Copyright (c) 2013 Paul Parsons

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR 
PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE 
FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, 
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE 
SOFTWARE.
*/

var PUBLICATIONS_MAP = (function () { 
	

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
	var network_constructed = false;
	var matrix_constructed = false;
	var copubscounted = false;//to keep track of whether copubs have been counted

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
	    matrix_z = d3.scale.linear().domain([0, 21]).range([0,1]).clamp(true), //for calculating the opacity of the cells...21 is hardcoded in for now
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

	var matrixlegend = d3.select("#matrixlegend"); //where the matrix legend will go

	//
	//Network variables
	//

	//get the width and height of the div containing the svg--this way the dimensions are specified dynamically
	var svgwidth = $('#vizcontainer').width();
	var svgheight = $('#vizcontainer').height();

	var networkzoom = d3.behavior.zoom();

	var networksvg = d3.select("#networkviz").append("svg:svg").attr("width", svgwidth).attr("height", svgheight)
	    .append('svg:g')
	    .attr("pointer-events", "all")
	   .append('svg:g')
	    .call(networkzoom.on("zoom", redrawNetwork))
	    .call(d3.behavior.drag().on("drag", pan))
	   .append('svg:g')
	  ;

	//this is a rectangle that goes "behind" the visualization. Because there is no drag behavior attached to it (in contrast to the nodes of the network), it allows the visualization
	//to be panned
	var networksvgbackground = networksvg.append("svg:rect").attr("width", svgwidth).attr("height", svgheight).style("fill", "aliceblue").style("opacity", 0);

	  //this will be used to calculate the positions of the nodes when rearranged
	var  circleOutline = networksvg.append("svg:circle").attr("cx", svgwidth/2).attr("cy", svgheight/2).attr("r", svgwidth/2.5).style("stroke", "gray").style("stoke-width", "1px").style("fill", "white").style("opacity", 0);


	// var department_centers = [];//REMOVE?
	var normal_center = {
	  y: svgheight/2,
	  x: svgwidth/2
	  };

	//default values for the network
	var dcharge = -100;
	var dlinkDistance = 70;
	var dgravity = 0.2;
	var dfriction = 0.9;
	var dlinkStrength = 1;

	//consructs the new force-directed layout
	var network_force = d3.layout.force().size([svgwidth,svgheight]);

	var networklegend = d3.select("#networklegend"); //where the network legend will go

	var node;
	var link;
	var deptCircle;
	var deptCircles = []; //contains information about the circles used for departments


	//var color10 = d3.scale.ordinal().range(["#00ffff", "#ff9900", "#0100b3", "#9c9284", "#ffff4e", "#ff0000", "#333333", "#ff00ff", "#41924B", "#cc0000"]);

	var color10 = d3.scale.category10();

	var science_faculty_members = [];
	var science_faculty_members_unique = [];
	//var science_faculty_data;	


	/////////////////////////////////////////////////////////////////////
	//
	//								JQUERY
	//
	////////////////////////////////////////////////////////////////////

	//tooltip for the network visualization
	$( "#networkviz" ).tooltip({
	  items: "circle",
	  content: function() {
	    var element = $( this );
	    if ( element.attr("class") == "node" ) {
	      var name = element.attr("name");
	      var depart = element.attr("department");
	      var cop = element.attr("copubs");
	      var rank = element.attr("rank");
	      var cont = element.attr("contract");
	      var text = "<b>" + name + "</b><br><hr>Department: " + depart + "<br>Rank: " + rank + "<br>Contract: " + cont + "<br>Co-Pubs: " + cop;
	      return text;
	    }

	    // if ( element.is( ".link" ) ) {
	    //   return element.attr( "title" );
	    // }
	    // if ( element.is( "img" ) ) {
	    //   return element.attr( "alt" );
	    // }
	  }
	});

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


	$(function() {
	  $( "#slider" ).slider();
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
	    $('#matrixactions').delay(800).show(800);
	  });
	  $('#networkchoice').click(function() {
	    $.colorbox.close()
	    $('#networkviz').show();
	    constructNetwork();
	    $('#networkactions').delay(800).show(800);
	  });

	});

	$( "#networkyearrange" ).slider({
	  range: true,
	  min: 2008,
	  max: 2013,
	  values: [ 2008, 2013 ],
	  slide: function( event, ui ) {
	    $( "#networkyear" ).val( ui.values[ 0 ] + " - " + ui.values[ 1 ] );

	  d3.selectAll("line.link").each( function () {
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
	        d3.select(this).transition().duration(300).style("opacity", 0).attr("r", 0);
	        d3.select(this).transition().delay(300).style("visibility", "hidden");
	      }
	      else {
	        //if the current node is currently hidden
	        if (this.style.visibility == "hidden"){
	          //set it to visible, but with an opacity of 0 so that it can be gradually faded in
	          d3.select(this).style("visibility", "visible").style("opacity", 0);
	          d3.select(this).transition().duration(1500).style("opacity", 1).attr("r", 10);
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
	  value: 2013,
	  slide: function( event, ui ) {
	  yearSelected = ui.value;
	  $( "#animateSliderYear" ).val( ui.value );

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
	          if(this.__data__.type != "cosup"){
	            d3.select(this).style("visibility", "visible").style("opacity", 0);
	            d3.select(this).style("opacity", 1);
	          }
	        }
	      }
	    }
	  });
	}
	});


	$("#scopeSlider").slider({
	  min: 2008,
	  max: 2013,
	  value: 2013,
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
	          if(this.__data__.type != "cosup"){
	            d3.select(this).style("visibility", "visible").style("opacity", 0);
	            d3.select(this).style("opacity", 1);
	          }
	        }
	      }
	    }
	  });

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

	//////////////////

	//checkboxes and radios and buttons(?)

	//////////////////
	$('#animateTime').click(function() {
	  var currentYear = animatebegin;
	  var int1 = setInterval(function(){
	    async.series(
	      [
	        function(callback){
	          $('#animateYearPlaceholder').delay(3000).text(currentYear);
	          var t = d3.selectAll("line.link").each(function(){

	            //if the link is currently visible and its year does not match currentYear
	            if (this.style.visibility == "visible" && this.__data__.year != currentYear){
	                d3.select(this).style("stroke", "#e6e6e6");
	                d3.select(this).transition().duration(2500).style("opacity", 0);
	                d3.select(this).transition().delay(2500).style("visibility", "hidden");
	            }
	            else {
	                d3.select(this).style("visibility", "visible");        
	                d3.select(this).transition().duration(2500).style("opacity", 1).style("stroke", "black");
	            }
	          });
	          callback(null);
	        },

	        function(callback){
	          var t = d3.selectAll("circle.node").each( function () {
	            var that = this;//because of the nested loop
	            var match = false;
	            d3.selectAll("line.link").each( function() {
	                if (((this["x1"].animVal.value == that["cx"].animVal.value && this["y1"].animVal.value == that["cy"].animVal.value && this.style.visibility == "visible") || (this["x2"].animVal.value == that["cx"].animVal.value && this["y2"].animVal.value == that["cy"].animVal.value && this.style.visibility == "visible"))){ //if there is a visible link to the current node set the boolean flag to true
	                 match = true;
	               }
	            }); 
	            if (match == false){
	              //make the node invisible
	              d3.select(this).style("stroke", "#e6e6e6");
	              d3.select(this).transition().duration(700).style("opacity", 0).attr("r", 0);
	              d3.select(this).transition().delay(700).style("visibility", "hidden");
	            }
	            else {
	              //if the current node is currently hidden
	              if (this.style.visibility == "hidden"){
	                //set it to visible, but with an opacity of 0 so that it can be gradually faded in
	                d3.select(this).style("visibility", "visible").style("opacity", 0);
	                d3.select(this).transition().duration(1000).style("opacity", 1).attr("r", 10);
	              }
	            }
	          });
	        callback(2);
	        }
	      ],

	      //callback
	      function(err){
	        if(currentYear == animateend && err == 2){
	          setTimeout(function(){filterNodesWithoutLinks()}, 3000);
	          clearInterval(int1);
	        }
	        else 
	          currentYear+=1;  
	        }
	    );
	  }, 3000);
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

	$('input#selectLasso').on('ifChecked', function() {
		brush = d3.svg.polybrush()
	    .x(d3.scale.linear().range([0, svgwidth]))
	    .y(d3.scale.linear().range([0, svgheight]))
	    .on("brushstart", function() {
	      networksvg.selectAll(".selected").classed("selected", false);
	    })
	    .on("brush", function() {
	    	//update the div that lists the current selections
	    	updateSelectionArea();
	      // iterate through all circle.node
	      networksvg.selectAll("circle.node").each(function(d) {
	        // if the circle in the current iteration is within the brush's selected area
	        if (brush.isWithinExtent(d.x, d.y)) {
	        	//adjust the style
	          	d3.select(this).style("stroke", "red").style("stroke-width", "4px").style("fill", "white");
	          	selectedNodes.push(this.__data__);
	          	selectedNodes = _.uniq(selectedNodes, false, function(x){ return (x.Name + x.Department) });
	        } 
	        // if the circle in the current iteration is not within the brush's selected area
	        else {
	        	//if the current node was not selected with the individual selector (i.e., it was selected with the lasso)
	        	if(this.selectedIndividually == false){
	  	  			selectedNodes = _.without(selectedNodes, this.__data__);      		
	        		//reset the style
	          		d3.select(this).style("stroke", "gray").style("stroke-width", "1px").style("fill", function(d){ return color10(d.Department); });
	          	}
	        }
	      });
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
      //     d3.select(this).style("stroke", "gray").style("stroke-width", "1px").style("fill", function(d){ return color10(d.Department); });
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
    	}	
    })
    .on('ifUnchecked', function() {
    	//show the selectionArea div
    	$('#selectionArea').show('slow');
    }); 

    //if the user clicks the button to remove all selections
    $('#selectionRemove').click(function() {
    	selectedNodes = []; //empty the array
    	updateSelectionArea("empty"); //update the selection area by emptying it
    	//hide the selectionArea div
    	$('#selectionArea').hide('slow');
    	//return to the defaul for the radios (i.e., check the 'none' option)
    	$('input#selectNone').iCheck('check');
    	//reset the style of the nodes
    	d3.selectAll("circle.node").each(function() {
    		d3.select(this).style("stroke", "gray").style("stroke-width", "1px").style("fill", function(d){ return color10(d.Department); });
    	});
    });

    $('input#gatheringMode').on('ifChecked', function() {
    	$('#gatheringArea').show('slow');
    })
    .on('ifUnchecked', function() {
    	$('#gatheringArea').hide('slow');
    });

	/*
	filters (hides) all nodes that do not have links connected to them

	@params: none
	@returns: none
	*/
	function filterNodesWithoutLinks() {
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
	      d3.select(this).transition().duration(300).style("opacity", 0).attr("r", 0);
	      d3.select(this).transition().delay(300).style("visibility", "hidden");
	    }
	    else {
	      //if the current node is currently hidden
	      if (this.style.visibility == "hidden"){
	        //set it to visible, but with an opacity of 0 so that it can be gradually faded in
	        d3.select(this).style("visibility", "visible").style("opacity", 0);
	        d3.select(this).transition().duration(1500).style("opacity", 1).attr("r", 10);
	      }
	    }
	  }); 
	}


	$('input#filterCo_pubs').on('ifChecked', function() {

	  async.series (
	    [  
	      function(callback){
	        d3.selectAll("line.link").each( function () {
	          if (this.__data__.type != "cosup" && this.__data__.type != "grant") {
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
	              d3.select(this).transition().duration(300).style("opacity", 0).attr("r", 0);
	              d3.select(this).transition().delay(300).style("visibility", "hidden");
	            }
	            else {
	              //if the current node is currently hidden
	              if (this.style.visibility == "hidden"){
	                //set it to visible, but with an opacity of 0 so that it can be gradually faded in
	                d3.select(this).style("visibility", "visible").style("opacity", 0);
	                d3.select(this).transition().duration(1500).style("opacity", 1).attr("r", 10);
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
	});
	$('input#filterCo_pubs').on('ifUnchecked', function() {

	async.series (
	    [
	      function(callback){
	        d3.selectAll("line.link").each( function () {
	          if (this.__data__.type != "cosup" && this.__data__.type != "grant") {
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
	              d3.select(this).transition().duration(300).style("opacity", 0).attr("r", 0);
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
	});


	$('input#filterCo_sups').on('ifChecked', function(){

	  async.series (
	    [  
	      function(callback){
	        d3.selectAll("line.link").each( function () {
	          if (this.__data__.type == "cosup") {
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
	              d3.select(this).transition().duration(300).style("opacity", 0).attr("r", 0);
	              d3.select(this).transition().delay(300).style("visibility", "hidden");
	            }
	            else {
	              //if the current node is currently hidden
	              if (this.style.visibility == "hidden"){
	                //set it to visible, but with an opacity of 0 so that it can be gradually faded in
	                d3.select(this).style("visibility", "visible").style("opacity", 0);
	                d3.select(this).transition().duration(1500).style("opacity", 1).attr("r", 10);
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
	});
	$('input#filterCo_sups').on('ifUnchecked', function(){

	  async.series (
	    [
	      function(callback){
	        d3.selectAll("line.link").each( function () {
	          if (this.__data__.type == "cosup") {
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
	              d3.select(this).transition().duration(300).style("opacity", 0).attr("r", 0);
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
	});

	$('input#filterNodesAll').on('ifChecked', function(){
	    d3.selectAll("circle.node").each( function () {
	      //if the current node is currently hidden
	      if (this.style.visibility == "hidden"){
	        //set it to visible, but with an opacity of 0 so that it can be gradually faded in
	        d3.select(this).style("visibility", "visible").style("opacity", 0);
	        d3.select(this).transition().duration(1500).style("opacity", 1).attr("r", 10);
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
	        d3.select(this).transition().duration(1000).style("opacity", 0).attr("r", 0);
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
	  //$('#htmltest').colorbox({iframe:true, open:true, width: "80%", height:"80%"});
	  // $('#dataLoader').colorbox({inline:true, width:"30%", href:"#dataLoader", opacity:0.98, scrolling:false, open:true, overlayClose: false, fadeOut: 300, onClosed:function(){ 
	    $('#VRchoice').colorbox({inline:true, width:"60%", href:"#VRchoice", scrolling:false, open:true, overlayClose: false, fadeOut: 300 })//; } }); 


	var filterPopulated = false;


	//populates the filter area based on department data
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










	//=======================================================================================
	// load the data from multiple files using queue.js
	//=======================================================================================
	// setTimeout(function(){
	//   queue()
	//     .defer(d3.csv,"data/faculty.csv")
	//     .defer(d3.csv,"data/pub_data.csv")
	//     .defer(d3.csv,"data/science_faculty.csv")
	//     .awaitAll(preprocessing); 
	// }, 1000);




	//===========================================================
	//JQuery listening for changes to action selectors
	//===========================================================

	$(document).ready(function() {

		//hide the selectionArea div
		$('#selectionArea').hide();
		$('#selectionArea').draggable({ containment: "#vizcontainer", scroll: false });
		//$('#selectionList').sortable();

		$('#cloningArea').hide();
		$('#cloningArea').draggable({ containment: "#vizcontainer", scroll: false });

		$('#gatheringArea').hide();
		$('#gatheringArea').draggable({ containment: "#vizcontainer", scroll: false });

		$( "#gatheringArea" ).droppable({
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
    	});

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
	  $( "#tags" ).autocomplete({
	    source: store.session("science_names"),
	    delay: 500,
	    minLength: 2,
	    select: function (event, ui) {
	      var name = ui.item.value;
	      highlightSelectedNode(name);
	    }
	  });

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
	});

	//if the user empties the search box, restore the opacity of all links and nodes
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

	$('#sizeNodes').change(function() {
	  if ($('#sizeNodes').val() == "copubs"){
	    if(!copubscounted){
	      countLinks();
	    }
	    sizeNodesByCopubs();
	  }
	});

	$('#networkreset').click(function() {
	  //show all nodes
	  d3.selectAll("circle.node").each( function () {
	    //if the current node is currently hidden
	    //if (this.style.visibility == "hidden"){
	      //set it to visible, but with an opacity of 0 so that it can be gradually faded in
	      d3.select(this).style("visibility", "visible").style("opacity", 0);
	      d3.select(this).transition().duration(1000).style("opacity", 1).style("stroke", "gray").style("stroke-width", 1).attr("r", 10);
	    //}
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

	  $('#animateYearPlaceholder').text("");

	});

	$('#arrange').change(function() {
	  if(this.value == "random"){
	    network_force.linkStrength(dlinkStrength).charge(dcharge).gravity(dgravity).linkDistance(dlinkDistance).start();
	  }
	  else if(this.value == "department"){
	    network_force.linkStrength(0).charge(-250).start();
	  }
	});

	$('#granularity').change(function() {
	  if(this.value == "individuals"){
	    d3.selectAll("circle.dept").transition().duration(1500).style("opacity", 0).attr("r", 1);
	    d3.selectAll("circle.dept").style("visibility", "hidden");
	    d3.selectAll("circle.node").style("visibility", "visible");
	  }
	  if(this.value == "departments"){
	    d3.selectAll("circle.dept").style("visibility", "visible");
	    d3.selectAll("circle.dept").transition().delay(1000).duration(1500).style("opacity", 1).attr("r", function(d){ 
	     return departmentCounts[d[0]] * 2; 
	    })
	    d3.selectAll("circle.node").transition().delay(2000).style("visibility", "hidden");    
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
	    //if network is not yet constructed, construct it
	    if(!network_constructed)
	      constructNetwork();
	    else
	      network_force.start();
	    $('#translatematrix').val('').trigger('liszt:updated'); 
	  }
	});

	//listens to the filterlinks selector
	//if the user selects "All", all nodes are changed to visible
	//otherwise, nodes with no links to them are changed to hidden
	// $('#filterlinks').change(function () {
	//   if (this.value == "all"){
	//     // 
	//     d3.selectAll("circle.node").each( function () {
	//       //if the current node is currently hidden
	//       if (this.style.visibility == "hidden"){
	//         //set it to visible, but with an opacity of 0 so that it can be gradually faded in
	//         d3.select(this).style("visibility", "visible").style("opacity", 0);
	//         d3.select(this).transition().duration(1500).style("opacity", 1).attr("r", 10);
	//       }
	//    });
	//   }

	//   else {
	//     d3.selectAll("circle.node").each( function () {
	//     var that = this;//because of the nested loop
	//       var match = false;
	//       d3.selectAll("line.link").each( function() {
	//           if (((this["x1"].animVal.value == that["cx"].animVal.value && this["y1"].animVal.value == that["cy"].animVal.value) || (this["x2"].animVal.value == that["cx"].animVal.value && this["y2"].animVal.value == that["cy"].animVal.value))){ //if there is a link to the current node set the boolean flag to true
	//            match = true;
	//          }
	//       }); 
	//       if (match == false){
	//         d3.select(this).transition().duration(1000).style("opacity", 0).attr("r", 0);
	//         d3.select(this).transition().delay(1000).style("visibility", "hidden");
	        
	//       }
	//       else {
	//         d3.select(this).style("visibility", "visible").style("opacity", 1);
	//         // d3.select(this).transition().duration(2000).style("opacity", 1);
	//       }
	//     });
	//     // network_force.gravity(0.02);
	//   }

	//   setTimeout(function(){network_force.start()}, 1000);
	// });




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
	//populate the action panel based on the data
	//
	//==========================================================================================================================

	  // var filteryears = d3.select("#filteryear")
	  //   .data(pub_years_uniq)
	  //   .enter().append("option")
	  //   .attr("value", function(d){ return d; })
	  //   .text(function (d) { return d; });



	//==========================================================================================================================
	//                                constructs the network visualization
	//
	//==========================================================================================================================
	function constructNetwork() {
	  var xpos = $('#vizcontainer').width()/2 - $('#vizloader').width()/2;
	  var ypos = $('#vizcontainer').height()/2 - $('#vizloader').height()/2;
	  $('#vizloader').css({"position": "absolute", "left":  xpos + "px", "top": ypos + "px"}).show();

	  getNetworkData(buildNetwork);
	}//end constructNetwork

	//gets the data for the network (either from the sessionStorage or from the db on the server) and then builds the network by passing the buildNetwork function as a callback to getNetworkData
	//@param: callback: a callback function--in this case buildNetwork--that builds the network visualization
	//@return: none
	function getNetworkData (callback){

	  var links_for_network, links_science_exclusive, links_western_exclusive, science_faculty_data, all_faculty_data, science_departments, all_departments, pub_years_uniq, links_co_sup;

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
	        if(store.session.has("all_faculty_data")){
	          console.log("all_faculty_data is already in sessionStorage...no need to fetch again");
	          all_faculty_data = store.session("all_faculty_data");
	          callback(null);          
	        }
	        else {
	          console.log("fetching all_faculty_data...");
	          $.get('/network/all_faculty_data', function(result){
	            all_faculty_data = JSON.parse(result.all_faculty_data);
	            //so that it doesn't store...causing DOM exception 22 if this is uncommented
	            //store.session("all_faculty_data", all_faculty_data);
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
	    ],

	      function(err, results){
	      	if (err) throw new Error(err);
	        callback(links_for_network, links_science_exclusive, links_western_exclusive, science_faculty_data, all_faculty_data, science_departments, all_departments, pub_years_uniq, links_co_sup);
	      }
	    );
	}//end getNetworkData


	function buildNetwork(links_for_network, links_science_exclusive, links_western_exclusive, science_faculty_data, all_faculty_data, science_departments, all_departments, pub_years_uniq, links_co_sup){


	  $('#vizloader').hide();

	  //construct the legend
	  constructNetworkLegend(science_departments);

	  //populate the filter area with departments
	  populateFilter(science_departments);

	  var filteryears = d3.select("#matrixviz")
	    .data(pub_years_uniq)
	    .enter().append("p")
	    // .attr("value", function(d){ return d; })
	    .text(function(d){ return d; });

	  var links_combined = links_science_exclusive.concat(links_co_sup);

	  ////////////////populate the networkviz based on the data we just got above/////////////
	  network_force
	    .nodes(science_faculty_data)
	    //.links(links_for_network);
	    .links(links_combined); 

	  network_force
	    .gravity(dgravity)
	    .friction(dfriction)
	    .charge(dcharge)
	    .linkDistance(dlinkDistance)
	      .start();  

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
	      .style("visibility", "visible")
	      .style("stroke", "black")
	      .style("stroke-dasharray", function (d) {
	        if (d.type == "cosup")
	          return "4, 2";
	        else
	          return "10, 0";
	           })
	      //.style("stroke-width", function (d) { return d.value/4; });
	      .style("stroke-width", "1px");

	  deptCircle = networksvg.selectAll("circle.dept")
	    .data(deptCircles)
	    .enter()
	    .append("svg:circle")
	    .attr("class", "dept")
	    .attr("r", 1)
	    .attr("cx", function(d) { return d[1]; })
	    .attr("cy", function(d) { return d[2]; })
	    .style("visibility", "hidden")
	    .style("opacity", 0)
	    .style("fill", "white")
	    .style("stroke", function(d){ return color10(d[0]); })
	    .style("stroke-width", 2)
	    ;

	  node = networksvg.selectAll("circle.node")
	    .data(science_faculty_data)
	    .enter().append("svg:circle")
	    .attr("class", "node")
	    .attr("r", 1)
	    .style("visibility", "visible")
	    .attr("department", function (d) { 
	      return d.Department; })
	    //.attr("selectedIndividually", "false") //<-- for the selecting action
	    .attr("copubs", 0)
	    .attr("name", function (d) { return d.Name; })
	    .attr("rank", function (d) { return d.Rank; })
	    .attr("contract", function (d) { return d.Contract; })
	    .style("fill", function(d){ return color10(d.Department); })
	    .call(node_drag);
        
    function dragstart(d, i) {
        network_force.stop() // stops the force auto positioning before you start dragging
    }

    function dragmove(d, i) {
        d.px += d3.event.dx;
        d.py += d3.event.dy;
        d.x += d3.event.dx;
        d.y += d3.event.dy; 
        tick(); // this is the key to make it work together with updating both px,py,x,y on d !
    }

    function dragend(d, i) {
        d.fixed = true; //set the node to fixed so the force doesn't include the node in its auto positioning stuff
        tick();
        network_force.resume();
    }     

	  d3.selectAll("circle.node").each(function() {
	  	this.selectedIndividually = false;
	  });  

	  node.transition().duration(2000).attr("r", 10);

	  network_constructed = true;

	  // /*Registers the specified listener to receive events of the specified type from the force layout. Currently, only "tick" events are supported, which are dispatched for each tick of the simulation. Listen to tick events to update the displayed positions of nodes and links.*/
	  network_force.on("tick", tick)
	}//end buildNetwork


	//called for each "tick" of the simulation
	function tick () {
	  // var currentheight = networksvg.height = $('#networkviz').height();
	  // var currentwidth = networksvg.width = $('#networkviz').width();
	  // d3.select("#networkviz").attr("width", currentwidth).attr("height", currentheight); //not updating the actual svg element

	  	if($('input#motionFreeze').is(':checked')) {
	  		console.log("uyp");
			network_force.stop();	
		}

	  if($('#arrange').val( ) == "department") {

	    node
	      .attr("cx", function(d){ 
	        dept = d.Department;//department that the person belongs to
	        deptCircles.forEach(function(d) { 
	          if(d[0] == dept) {
	            var xcoord = d[1]; // return the x coordinate
	          }
	        });//get the x coordinate
	        return d.x += (xcoord - d.x) * network_force.alpha();
	      })
	      .attr("cy", function(d){ 
	        dept = d.Department;//department that the person belongs to
	        deptCircles.forEach(function(d) { 
	          if(d[0] == dept) {
	            var ycoord = d[2]; // return the y coordinate
	          }
	        });//get the y coordinate        
	        return d.y += (ycoord - d.y) * network_force.alpha();
	      })
	      .style("stroke", "gray")
	      .style("stroke-width", "1px");

	    link
	      .attr("x1", function(d) { return d.source.x; })
	      .attr("y1", function(d) { return d.source.y; })
	      .attr("x2", function(d) { return d.target.x; })
	      .attr("y2", function(d) { return d.target.y; });
	    }

	  else {
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

	  node.on("mouseover", function(d) {
	    // if (this.style.visibility == "visible") { //only want to display the mouseover if the node is visible!
	    //   //also only want to change this if the node has not been highlighted from a search (i.e., if it is not red)
	    //   if (this.style.stroke != "#ff0000"){
	    //     d3.select(this).style("stroke", "black")
	    //       .style("stroke-width", "2px");
	    //   }
	    // }
	  })
	  .on("mouseout", function(d) {
	    // if (this.style.visibility == "visible") {
	    //   if (this.style.stroke != "#ff0000"){      
	    //     d3.select(this).style("stroke-width", "1px").style("stroke", "gray");
	    //   }
	    // }
	  })
	  .on("mouseup", function(d) {
	  	if(individualSelect) {
	  		//if this node is already selected
	  		if (this.style.strokeWidth == "4px") {
	  			selectedNodes = _.without(selectedNodes, this.__data__);
	  			this.selectedIndividually = false;
		  		d3.select(this).style("stroke", "gray").style("stroke-width", "1px").style("fill", function(d) {return color10(d.Department); });	  			
	  		}
	  		else {
		  		selectedNodes.push(this.__data__);
		  		this.selectedIndividually = true;
		  		selectedNodes = _.uniq(selectedNodes, false, function(x){ return (x.Name + x.Department) });
		  		d3.select(this).style("stroke", "red").style("stroke-width", "4px").style("fill", "white");
	  		}
	  		//update the div that lists the current selections
	  		updateSelectionArea();	
		}
	  });
	}//end tick



	//
	//
	function getCenter() {
	    //to populate the search bar
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

	  store.session("science_departments").forEach(function (d) {
	    deptCircles.push({"name": d, "count": 0, "xcoords": [], "ycoords": [], "deptcoords": []});  
	  });

	  d3.selectAll("circle.node").each( function () {
	    var that = this;
	    nodeDept = this.__data__.department;
	    deptCircles.forEach (function(n) {
	      if (nodeDept == n.name){
	        n.count += 1;
	        n.xcoords.push(that.attributes.cx);
	        n.ycoords.push(that.attributes.yx);
	      }
	    });
	  });

	  //now calculate the deptcoords

	}//end getCenter

	// //getDeptCenters(9, circleOutline[0][0].r.animVal.value, circleOutline[0][0].cx.animVal.value, circleOutline[0][0].cy.animVal.value)
	// function getDeptCenters(numpoints, radius, centerx, centery) {
	//     var slice = 2 * Math.PI / numpoints;
	//     for (i = 0; i < numpoints; i++)
	//     {
	//         var angle = slice * i;
	//         var newX = (centerx + radius * Math.cos(angle));
	//         var newY = (centery + radius * Math.sin(angle));
	//         networksvg.append("svg:circle").attr("class", "deptCircle").attr("cx", newX).attr("cy", newY).attr("r", 25);
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

	  var links_for_matrix, links_science_exclusive, science_faculty_data, science_departments, pub_years_uniq, links_co_sup;

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
	      callbackMatrix(links_for_matrix, links_science_exclusive, science_faculty_data, science_departments, pub_years_uniq, links_co_sup);
	    }
	  );
	}//end getMatrixData



	function buildMatrix(links_for_matrix, links_science_exclusive, science_faculty_data, science_departments, pub_years_uniq, links_co_sup){

	  var links_combined = links_science_exclusive.concat(links_co_sup);

	  $('#vizloader').hide();  

	  //construct the legend
	  constructMatrixLegend(science_departments);

	  var matrix = [],
	      nodes = science_faculty_data,
	      n = nodes.length;

	  // Compute index per node.
	  nodes.forEach(function(node, i) {
	    node.index = i;
	    node.count = 0;
	    matrix[i] = d3.range(n).map(function(j) { return {x: j, y: i, z: 0}; });
	  });

	  // Convert links to matrix; count occurrences.
	  links_for_matrix.forEach(function(link) {
	    matrix[link.source][link.target].z += link.value;
	    matrix[link.target][link.source].z += link.value;
	    // matrix[link.source][link.source].z += link.value;
	    // matrix[link.target][link.target].z += link.value;
	    nodes[link.source].count += link.value;
	    nodes[link.target].count += link.value;
	  });

	  // Precompute the orders.
	  var orders = {
	    name: d3.range(n).sort(function(a, b) { return d3.ascending(nodes[a].Name, nodes[b].Name); }),
	    count: d3.range(n).sort(function(a, b) { return nodes[b].count - nodes[a].count; }),
	    department: d3.range(n).sort(function(a, b) { return d3.ascending(nodes[a].Department, nodes[b].Department); })
	  };

	  // var cellcolor = d3.scale.linear()
	  //       .range(["hsl(62,100%,90%)", "hsl(228,30%,20%)"])
	  //       .interpolate(d3.interpolateLab);


	  // The default sort order.
	  matrix_x.domain(orders.name);

	  matrixsvg.append("rect")
	      .attr("class", "matrixbackground")
	      .attr("width", matrix_width)
	      .attr("height", matrix_height);

	  var row = matrixsvg.selectAll(".matrixrow")
	      .data(matrix)
	    .enter().append("g")
	      .attr("class", "matrixrow")
	      .attr("transform", function(d, i) { return "translate(0," + matrix_x(i) + ")"; })
	      .each(row);

	  row.append("line")
	      .attr("x2", matrix_width);

	  row.append("text")
	      .attr("x", -6)
	      .attr("y", matrix_x.rangeBand() / 2)
	      .attr("dy", ".32em")
	      .attr("text-anchor", "end")
	      .style("fill", function(d, i) { return color10(nodes[i].Department) })
	      .text(function(d, i) { return nodes[i].Name; });

	  var column = matrixsvg.selectAll(".matrixcolumn")
	      .data(matrix)
	    .enter().append("g")
	      .attr("class", "matrixcolumn")
	      .attr("transform", function(d, i) { return "translate(" + matrix_x(i) + ")rotate(-90)"; });

	  column.append("line")
	      .attr("x1", -matrix_width);

	  column.append("text")
	      .attr("x", 6)
	      .attr("y", matrix_x.rangeBand() / 2)
	      .attr("dy", ".32em")
	      .attr("text-anchor", "start")
	      .style("fill", function(d, i) { return color10(nodes[i].Department) })
	      .text(function(d, i) { return nodes[i].Name; });


	  //for the matrix
	  function row(row) {
	    var cell = d3.select(this).selectAll(".matrixcell")
	        .data(row.filter(function(d) { return d.z; }))
	      .enter().append("rect")
	        .attr("class", "matrixcell")
	        .attr("x", function(d) { return matrix_x(d.x); })
	        .attr("width", matrix_x.rangeBand())
	        .attr("height", matrix_x.rangeBand())
	        .style("fill-opacity", function(d) { return matrix_z(d.z); })
	        .style("fill", "red")
	        //.style("fill", function(d) { return nodes[d.x].Department == nodes[d.y].Department ? matrix_c(nodes[d.x].Department) : null; })
	        .on("mouseover", mouseover)
	        .on("mouseout", mouseout);

	    cell.append("name1").text(function(d) { return "<b>" + nodes[d.x].Name + " & </b>" + "<br>"; });
	    cell.append("name2").text(function(d) { return "<b>" + nodes[d.y].Name + "</b>" + "<br>" + "<hr>"; });
	    cell.append("value").text(function(d) { return "publications: " + d.z + "<br>"; });

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
	  d3.select("#order").on("change", function() {
	    clearTimeout(timeout);
	    order(this.value);
	  });

	  //for the matrix
	  function order(value) {
	    matrix_x.domain(orders[value]);

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
	}//end buildMatrix


	function move_towards_center(alpha) {
	      return function(d){
	        console.log("d: " + d);
	        console.log("i: " + i);
	        console.log("this: " + this);
	        d.y += (normal_center.y - d.y) * 0.12 * tick.alpha;
	        d.x += (normal_center.x - d.x) * 0.12 * tick.alpha;

	      };
	}

	function constructNetworkLegend(science_departments) {
	  var label = networklegend.selectAll(".label")
	    .data(science_departments)
	    .enter().append("div")
	    .attr("class", "label")
	    .text(function(d) { return d; })
	    .append("div")
	    .attr("class", "labelcolor")
	    .style("background-color", function(d){ return color10(d); });
	}

	function constructMatrixLegend(science_departments) {
	  var label = matrixlegend.selectAll(".label")
	    .data(science_departments)
	    .enter().append("div")
	    .attr("class", "label")
	    .text(function(d) { return d; })
	    .append("div")
	    .attr("class", "labelcolor")
	    .style("background-color", function(d){ return color10(d); });
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

	function pan() {
	  networksvg.attr("x", d3.event.x).attr("y", d3.event.y);
	}

	// removes duplicates and returns distinct array
	function eliminateDuplicates(arr) {
	  var i,
	      len=arr.length,
	      out=[],
	      obj={};

	  for (i=0;i<len;i++) {
	    obj[arr[i]]=0;
	  }
	  for (i in obj) {
	    out.push(i);
	  }
	  return out;
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

	function countLinks () {
	  d3.selectAll("circle.node").each( function () {
	    that=this;
	    d3.selectAll("line.link").each( function () {
	      //if the node is connected to the link AND the link has an opacity of 1
	      if ((this["x1"].animVal.value == that["cx"].animVal.value && this["y1"].animVal.value == that["cy"].animVal.value) || (this["x2"].animVal.value == that["cx"].animVal.value && this["y2"].animVal.value == that["cy"].animVal.value)){
	        d3.select(that).attr("copubs", function(){return parseInt($(that).attr("copubs"))+1;})
	      }
	    });
	  });
	  copubscounted = true;//set this to true
	}

	function sizeNodesByCopubs () {
	  d3.selectAll("circle.node").each( function () {
	    d3.select(this).transition().duration(1000).attr("r", function() { return 10 + parseInt($(this).attr("copubs"))*4; })
	  });
	  network_force.charge(-200).start();
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
		}
		else {
			var items = d3.select("#selectionList").selectAll(".item")

				.data(selectedNodes, function(d) { return d.Name; } ); //<--this "key function" replaces the default bind-by-index behavior 

			items.enter()
				.append("li")
				.attr("class", "item")
				.text(function(d) { return d.Name; } )
				.style("color", function(d) { return color10(d.Department); } );

			items.on("mouseover", function() {
				d3.select(this)
					.style("background-color", "rgb(36,137,197)")//function(d) { return color10(d.Department) })
					.style("color", "white");
			})
				.on("mouseout", function() {
					d3.select(this).style("background-color", "white")
					.style("color", function(d) { return color10(d.Department); } );	
				});

			items.exit().remove();


			// selectedNodes.forEach(function (node) {
			// 	var name = node.Name;
		 //      	var depart = node.Department;
		 //      	var output = "<div>" + name + "<br>Department: " + depart + "</div>";
			// 	$('#selectionArea').append(output);
			//});
		}
	}

}());
