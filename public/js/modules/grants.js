var GRANTS = (function () { 

  //var grants = {};
  var module = {}; //this will be exported (returned)
  //var sankey_data_faculty = {"nodes":[], "links": []};
  //var sankey_data_departments = {"nodes":[], "links": []};
  var grantDepartments = []; //array of unique departments
  //var grantSponsors = []; //array of unique sponsors
  var proposalStatuses = []; //array of unique proposal statuses
  var awardStatuses = []; //array of unique award statuses
  //var grantsUnique = [];
  //var grantYears = [];
  //var departmentProposals = {};
  var filterPopulated = false;
  var filtersourcesvisible; //keeps track of the currently visible filter sources
  var filtertargetsvisible; //keeps track of the currently visible filter targets
  //var nested_by_sponsor; //contains sponsor data in nested format for treemap
  //var nested_by_department; //contains department/sponsor data in nestd format
  var sankey_constructed = false;
  var treemap_constructed = false;
  var bubble_constructed = false;
  var bubblezoom = d3.behavior.zoom();
  var bubble;
  var top20 = [];

  var grouped_grants;
  //log scale for the grant request amounts
  var log_scale = d3.scale.log().domain([1,10000000]).range([5,40]);

  var brush;
  var selectedBubbles = [];
  var grantValueCenters = [];
  var departmentCenters = [];
  var individualSelect = false; //flag to be used in 'tick' function for selecting individual nodes

  //for the bubble diagram filter
  var grant_year_begin_min = 9999;
  var grant_year_begin_max = 0;
  var grant_year_end_min = 9999;
  var grant_year_end_max = 0;
  var grantBeginYearArray = [];
  var grantEndYearArray = [];
  var yearRangeArrayBuilt = false;

  //receive JSON from the server
  //var nested_by_sponsor = {{{nested_by_sponsor}}};
  // var nested_by_department = {{{nested_by_department}}};
  // var sankey_data_departments = {{{sankey_data_departments}}};
  // var sankey_data_faculty = {{{sankey_data_faculty}}};


  //FOR TREEMAP//

  var margin = {top: 5, right: 0, bottom: 5, left: 0},
      width = $('#vizcontainer').width() - margin.left - margin.right,
      height = $('#vizcontainer').height() - margin.top - margin.bottom; 
 

  //get the width and height of the div containing the svg--this way the dimensions are specified dynamically
  var svgwidth = $('#vizcontainer').width();
  var svgheight = $('#vizcontainer').height();

  var x = d3.scale.linear().range([0, width]),
    y = d3.scale.linear().range([0, height]),
    xscale = x,
    yscale = y,
    colorTreemap = d3.scale.category20c(),
    headerHeight = 20,
    headerColor = "#555555",
    transitionDuration = 3000,    
    root,
    node;

  //center of the svg area
  var normal_center = { y: svgheight/2, x: svgwidth/2 }; 

  //consructs the new force-directed layout
  var bubble_force = d3.layout.force().size([svgwidth,svgheight]);      

  var treemap = d3.layout.treemap()
      .round(false)
      .size([width, height])
      .mode("squarify")
      .sticky(true)
      .padding([headerHeight + 1, 1, 1, 1])
      .value(treemapValueAccessor);

  var treemapviz = d3.select("#treemapviz").append("div")
      .attr("class", "chart")
      .style("width", width + margin.left + margin.right + "px")
      .style("height", height + margin.top + margin.bottom + "px")
    .append("svg:svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);
    // .append("svg:g")
    //   .attr("transform", "translate(.5,.5)");

  var treemapsvg = treemapviz.append("svg:g")
      .attr("id", "departmentsTreemap")
      .attr("transform", "translate(.5,.5)");

  var treemaplegend = d3.select("#treemaplegend"); //where the treemap legend will go
     

  var formatNumber = d3.format(",.0f"),
      format = function(d) { return formatNumber(d) + " proposal(s)"; },
      color = d3.scale.category20();

  var sankeysvg = d3.select("#sankeyviz").append("svg:svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");        

  var sankey = d3.sankey()
      .nodeWidth(15)
      .nodePadding(10)
      .size([width, height]);

  var sankeyPath = sankey.link();

  var bubblesvg = d3.select("#bubbleviz").append("svg:svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append('svg:g')
      .attr("pointer-events", "all")
     .append('svg:g')
      .call(bubblezoom.on("zoom", redrawBubble))
      .on("dblclick.zoom", null)
      //.call(d3.behavior.drag().on("drag", pan).on("dragend", function() { d3.select(this).attr("cursor", "default"); }))
     .append('svg:g');

  //variables and initilizations for cloning
  var cloningWidth = 480;
  var cloningHeight = 450;

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

  var cloningSvg = d3.select('#cloningArea')
    .append('svg:svg')
    .attr('width', cloningWidth)
    .attr('height', cloningHeight)
    .append('svg:g')
    .attr("pointer-events", "all")
    //.append('svg:g')
    .call(cloningZoom)
    .on("dblclick.zoom", null)
    .append('svg:g');

  //this is a rectangle that goes "behind" the visualization. Because there is no drag behavior attached to it (in contrast to the nodes of the bubble diagram), it allows the visualization
  //to be panned
  var bubblesvgbackground = bubblesvg.append("svg:rect").attr("width", width).attr("height", height).style("fill", "aliceblue").style("opacity", 0);
    //this will be used to calculate the positions of the nodes when rearranged
  var  circleOutline = bubblesvg.append("svg:circle").attr("cx", width/2-80).attr("cy", height/2-80).attr("r", width/3).style("stroke", "gray").style("stroke-width", "1px").style("fill", "none").style("opacity", 0);


  //this list of 20 colors is calculated such that they are optimally disctinct. See http://tools.medialab.sciences-po.fr/iwanthue/
  var color20 = d3.scale.ordinal().range(["#D24B32","#73D74B","#7971D9","#75CCC1","#4F2A3F","#CA4477","#C78D38","#5D8737","#75A0D2","#C08074","#CD50CC","#D0D248","#CA8BC2","#BFC98D","#516875","#434E2F","#66D593","#713521","#644182","#C9C0C3"]);



// //similar to _.extend, but with the added feature of maintaining different properties (rather than overwriting them)
// //if properties are the same they will be merged/overwritten (same as with _.extend)
// //if properties are not the same, they will be combined in the form of an array and stored as multiple properties
// //@params: obj: objects to combine
// //@returns: obj: the combine object
// function combineObjects (obj) {
//   var slice = Array.prototype.slice;
//   var concat = Array.prototype.concat;
  
//     _.each(obj.slice(1), function(source) {
      
//       if (source) {
//         for (var prop in source) {
//           //if they properties are the same overwrite
//           if (obj[0][prop] === source[prop]) {
//               obj[0][prop] = source[prop];
//             }
//             else {
//               //concatenate the properties
//               //if the property is already an array
//               if (obj[0][prop].constructor === Array){
//                 obj[0][prop] = obj[0][prop].concat(source[prop]); //concatenate
//               }
//               //if it is not already an array
//               else {
//                 obj[0][prop] = [obj[0][prop]].concat(source[prop]); //turn it into an array and then concatenate
//               }
//             }
//         }
//       }
//     });
//     return obj[0];
//   };


  //load the lightbox option for VRchoice
  $('#VRchoice').colorbox({inline:true, width:"80%", href:"#VRchoice", scrolling:false, open:true, overlayClose: false, fadeOut: 300 }); 


  $(document).ready(function() {

    //for icheckbox
    $('input').iCheck({
      checkboxClass: 'icheckbox_square-blue',
      radioClass: 'iradio_square-blue',
      //increaseArea: '10%' // optional
    });

    //for the sliding divs in the action panel
    //gets every div that is a child of sankeyactions and hides it
    $('#sankeyactions:eq(0)> div').hide();

    //bind a click handler to each action (i.e., each h3)
    $('#sankeyactions:eq(0)> h3').click(function() { 
      $(this).next().next().next().slideToggle('fast');
     });

    //gets every div that is a child of treemapactions and hides it
    $('#treemapactions:eq(0)> div').hide();

    //bind a click handler to each action (i.e., each h3)
    $('#treemapactions:eq(0)> h3').click(function() { 
      $(this).next().next().next().slideToggle('fast');
     });  

    //gets every div that is a child of bubbleactions and hides it
    $('#bubbleactions:eq(0)> div').hide();

    //bind a click handler to each action (i.e., each h3)
    $('#bubbleactions:eq(0)> h3').click(function() { 
      $(this).next().next().next().slideToggle('fast');
     });    

    //start with the actions hidden
    $('#sankeyactions').hide();
    $('#treemapactions').hide();
    $('#bubbleactions').hide();

    //for the initial popup choice
    $('#sankeychoice').click(function() {
      $.colorbox.close()
      $('#sankeyviz').show();
      constructSankey("faculty");
      $('#sankeyactions').delay(800).show(800);
    });
    $('#bubblechoice').click(function() {
      $.colorbox.close()
      $('#bubbleviz').show();
      constructBubble();
      $('#bubbleactions').delay(800).show(800);
    });
    $('#treemapchoice').click(function() {
      $.colorbox.close()
      $('#treemapviz').show();
      constructTreemap("department");
      $('#treemapactions').delay(800).show(800);
    });  

    $('#cloningArea').hide();
    $('#cloningArea').draggable({ containment: "#vizcontainer", scroll: false, handle: "h2" });

  });

  $( "#grantbeginyearrange" ).slider({
    range: true,
    //min: 0,  //TODO: populate dynamically
    //max: 0,  //TODO: populate dynamically
    animate: true,
    //values: [ 0, 0 ],
    slide: function( event, ui ) {
      var beginLowerLimit = grantBeginYearArray[ ui.values[0] ];
      var beginUpperLimit = grantBeginYearArray[ ui.values[1] ];
      var endLowerLimit = grantEndYearArray[ $( "#grantendyearrange" ).slider("option", "values")[0] ];
      var endUpperLimit = grantEndYearArray[ $( "#grantendyearrange" ).slider("option", "values")[1] ];
      $( "#grantbeginyear" ).val( beginLowerLimit + " - " + beginUpperLimit );

      d3.selectAll("circle.bubble").each(function(d) {
        var beginYear = parseInt(d.BeginDate.substring(0, 4));
        var endYear = parseInt(d.EndDate.substring(0, 4));
        if(d.AwardStatus == "Accepted") {
          if(beginLowerLimit <= beginYear && beginYear <= beginUpperLimit && endLowerLimit <= endYear && endYear <= endUpperLimit) {
            d3.select(this).style("visibility", "visible");
            d3.select(this).transition().duration(800).style("opacity", 1);
          } else {
            d3.select(this).transition().duration(800).style("opacity", 0);
            d3.select(this).transition().delay(800).style("visibility", "hidden");
          }
        }
      });
    }
  });

  $( "#grantendyearrange" ).slider({
    range: true,
    //min: 0,  //TODO: populate dynamically
    //max: 0,  //TODO: populate dynamically
    animate: true,
    //values: [ 0, 0 ],
    slide: function( event, ui ) {
      var endLowerLimit = grantEndYearArray[ ui.values[0] ];
      var endUpperLimit = grantEndYearArray[ ui.values[1] ];
      var beginLowerLimit = grantBeginYearArray[ $( "#grantbeginyearrange" ).slider("option", "values")[0] ];
      var beginUpperLimit = grantBeginYearArray[ $( "#grantbeginyearrange" ).slider("option", "values")[1] ];
      $( "#grantendyear" ).val( endLowerLimit + " - " + endUpperLimit );

      d3.selectAll("circle.bubble").each(function(d) {
        var beginYear = parseInt(d.BeginDate.substring(0, 4));
        var endYear = parseInt(d.EndDate.substring(0, 4));
        if(d.AwardStatus == "Accepted") {
          if(beginLowerLimit <= beginYear && beginYear <= beginUpperLimit && endLowerLimit <= endYear && endYear <= endUpperLimit) {
            d3.select(this).style("visibility", "visible");
            d3.select(this).transition().duration(800).style("opacity", 1);
          } else {
            d3.select(this).transition().duration(800).style("opacity", 0);
            d3.select(this).transition().delay(800).style("visibility", "hidden");
          }
        }
      });
    }
  });

  function initBubbleFilter(all_grants) {
    if(!yearRangeArrayBuilt)
      buildYearRangeArray(all_grants);
    $( "#grantbeginyearrange" ).slider("option", "min", 0);
    $( "#grantbeginyearrange" ).slider("option", "max", grantBeginYearArray.length - 1);
    $( "#grantbeginyearrange" ).slider("option", "values", [0, grantBeginYearArray.length - 1]);
    $( "#grantbeginyear" ).val( grantBeginYearArray[$( "#grantbeginyearrange" ).slider( "values", 0 )] +
      " - " + grantBeginYearArray[$( "#grantbeginyearrange" ).slider( "values", 1 )] );

    $( "#grantendyearrange" ).slider("option", "min", 0);
    $( "#grantendyearrange" ).slider("option", "max", grantEndYearArray.length - 1);
    $( "#grantendyearrange" ).slider("option", "values", [0, grantEndYearArray.length - 1]);
    $( "#grantendyear" ).val( grantEndYearArray[$( "#grantendyearrange" ).slider( "values", 0 )] +
      " - " + grantEndYearArray[$( "#grantendyearrange" ).slider( "values", 1 )] );
  }

  $( "#treemapbeginyearrange" ).slider({
    range: true,
    //min: 0,  //TODO: populate dynamically
    //max: 0,  //TODO: populate dynamically
    animate: true,
    //values: [ 0, 0 ],
    slide: function( event, ui ) {
      var beginLowerLimit = grantBeginYearArray[ ui.values[0] ];
      var beginUpperLimit = grantBeginYearArray[ ui.values[1] ];
      $( "#treemapbeginyear" ).val( beginLowerLimit + " - " + beginUpperLimit );

      refreshTreemap();
    }
  });

  $( "#treemapendyearrange" ).slider({
    range: true,
    //min: 0,  //TODO: populate dynamically
    //max: 0,  //TODO: populate dynamically
    animate: true,
    //values: [ 0, 0 ],
    slide: function( event, ui ) {
      var endLowerLimit = grantEndYearArray[ ui.values[0] ];
      var endUpperLimit = grantEndYearArray[ ui.values[1] ];
      $( "#treemapendyear" ).val( endLowerLimit + " - " + endUpperLimit );

      refreshTreemap();
    }
  });

  function initTreemapFilter(all_grants) {
    if(!yearRangeArrayBuilt)
      buildYearRangeArray(all_grants);
    $( "#treemapbeginyearrange" ).slider("option", "min", 0);
    $( "#treemapbeginyearrange" ).slider("option", "max", grantBeginYearArray.length - 1);
    $( "#treemapbeginyearrange" ).slider("option", "values", [0, grantBeginYearArray.length - 1]);
    $( "#treemapbeginyear" ).val( grantBeginYearArray[$( "#treemapbeginyearrange" ).slider( "values", 0 )] +
      " - " + grantBeginYearArray[$( "#treemapbeginyearrange" ).slider( "values", 1 )] );

    $( "#treemapendyearrange" ).slider("option", "min", 0);
    $( "#treemapendyearrange" ).slider("option", "max", grantEndYearArray.length - 1);
    $( "#treemapendyearrange" ).slider("option", "values", [0, grantEndYearArray.length - 1]);
    $( "#treemapendyear" ).val( grantEndYearArray[$( "#treemapendyearrange" ).slider( "values", 0 )] +
      " - " + grantEndYearArray[$( "#treemapendyearrange" ).slider( "values", 1 )] );
  }


  // $( "#sankeyyearbeginrange" ).slider({
  //   range: true,
  //   min: grant_year_begin_min,
  //   max: grant_year_begin_max,
  //   values: [ grant_year_begin_min, grant_year_begin_max ],
  //   slide: function( event, ui ) {
  //     $( "#sankeyyearbegin" ).val( ui.values[ 0 ] + " - " + ui.values[ 1 ] );
  //   }
  // });
  // $( "#sankeyyearbegin" ).val( $( "#sankeyyearbeginrange" ).slider( "values", 0 ) +
  //   " - " + $( "#sankeyyearbeginrange" ).slider( "values", 1 ) );

  // $( "#sankeyyearendrange" ).slider({
  //   range: true,
  //   min: grant_year_end_min,
  //   max: grant_year_end_max,
  //   values: [ grant_year_end_min, grant_year_end_max ],
  //   slide: function( event, ui ) {
  //     $( "#sankeyyearend" ).val( ui.values[ 0 ] + " - " + ui.values[ 1 ] );
  //   }
  // });
  // $( "#sankeyyearend" ).val( $( "#sankeyyearendrange" ).slider( "values", 0 ) +
  //   " - " + $( "#sankeyyearendrange" ).slider( "values", 1 ) );  

  $( "#sankeyfragslider" ).slider({
      value:1,
      min: 1,
      max: 3,
      step: 1,
      slide: function( event, ui ) {
        $( "#sankeyfrag" ).val( function(element) {
          if (ui.value == 1){
            d3.selectAll('#sankeyviz g g').transition().duration(2000).style("opacity", 0).remove();
            constructSankey("faculty");
            return "Faculty";
          }
          else if (ui.value == 2){
            d3.selectAll('#sankeyviz g g').transition().duration(2000).style("opacity", 0).remove();
            constructSankey("departments");
            return "Department";
          }
          else
            return "Individual";
          } );
      }
  });



  $('#sankeytranslate').change(function () {
      $('#sankeyviz').hide();
      $('#sankeyactions').hide('slow');

    if (this.value == "treemap"){
      //hide the sankey and show the treemap
      $('#treemapviz').show();
      $('#treemapactions').show('slow');
      //if treemap has not yet been constructed, construct it
      if(!treemap_constructed){
        //prepareTreemap();
        constructTreemap("department");
      }
    }
      else if (this.value == "bubble"){
        $('#bubbleviz').show();
        $('#bubbleactions').show('slow');
        if(!bubble_constructed){
          constructBubble();
      }
    }
    $('#sankeytranslate').val('').trigger('liszt:updated');
  });

  $('#treemaptranslate').change(function () {
      $('#treemapviz').hide();
      $('#treemapactions').hide('slow');

    if (this.value == "sankey"){
      //hide the treemap and show the sankey
      $('#sankeyviz').show();
      $('#sankeyactions').show('slow');
      //if sankey is not yet constructed, construct it
      if(!sankey_constructed){
        //prepareSankey();
        constructSankey("faculty");
      }
    }
    else if (this.value == "bubble"){
      $('#bubbleviz').show();
      $('#bubbleactions').show('slow');
      if(!bubble_constructed){
        constructBubble();
      }
    }
    $('#treemaptranslate').val('').trigger('liszt:updated'); 
  });

  $('#bubbletranslate').change(function () {
      $('#bubbleviz').hide();
      $('#bubbleactions').hide('slow');

    if (this.value == "sankey"){
      $('#sankeyviz').show();
      $('#sankeyactions').show('slow');
      //if sankey is not yet constructed, construct it
      if(!sankey_constructed){
        //prepareSankey();
        constructSankey("faculty");
      }
    }
    else if (this.value == "treemap"){
      $('#treemapviz').show();
      $('#treemapactions').show('slow');
      //if treemap has not yet been constructed, construct it
      if(!treemap_constructed){
        //prepareTreemap();
        constructTreemap("department");
      }    
    }
    $('#bubbletranslate').val('').trigger('liszt:updated'); 
  });





///// for bubble interactions

  function filterBubbles() {

    var grants_combined = _.filter(grouped_grants, function(grant) {
      var flag = false;
      switch(grant.AwardStatus) {
        case "Accepted":
          flag = $('input#filterAccepted').is(':checked');
          break;
        case "Closed":
          flag = $('input#filterClosed').is(':checked');
          break;
        case "":
          if(grant.ProposalStatus == "Declined")
            flag = $('input#filterDeclined').is(':checked');
          else //others including Withdrawn, Inst. Approved, Pending Approval, Draft
            flag = $('input#filterOthers').is(':checked');
          break;
        default:
          flag = false;
      }
      return flag;
    });

    bubble_force.nodes(grants_combined);

    //Change the default key function so that the filter can work properly.
    bubble = bubblesvg.selectAll("circle.bubble")
      .data(grants_combined, function(d) {
        return d.index;
      });

    bubble
      .enter().append("svg:circle")
      .attr("class", "bubble")
      .attr("r", function(grant) { 
        var num = parseFloat((grant.RequestAmt.substring(1)).replace(/\,/g, ''))  //cast the string into a float after removing commas and dollar sign
        return (num ? log_scale(num) : 1) * 0.3; })
      .style("fill", function(grant) { return color20(grant.Sponsor); })
      .on("mouseover", function() {
        d3.select(this).attr("cursor", "pointer");
        if(!d3.select(this).classed("selected"))
          d3.select(this).style("stroke-width", "3px");
      })
      .on("mouseout", function() {
        if(!d3.select(this).classed("selected"))
          d3.select(this).style("stroke-width", "1px");
      })
      .on("mouseup", function() {
        if(individualSelect) {
          //if this node is already selected
          if (this.style.strokeWidth == "4px") {
            selectedBubbles = _.without(selectedBubbles, this.__data__);
            this.selectedIndividually = false;
            d3.select(this).classed("selected", false).style("stroke", "gray").style("stroke-width", "1px").style("fill", function(d) {return color20(d.Sponsor); });         
          }
          else {
            selectedBubbles.push(this.__data__);
            this.selectedIndividually = true;
            selectedBubbles = _.uniq(selectedBubbles, false, function(x){ return x.Proposal; });
            d3.select(this).classed("selected", true).style("stroke", "red").style("stroke-width", "4px").style("fill", "white");
          }
          //update the div that lists the current selections
          //updateSelectionArea();  
        }
      })
      .each(function() {
        this.selectedIndividually = false;
      })

    bubble.exit().remove(); //remove existing bubbles

    bubble_force.start();
  }

  $('input#filterAccepted').on('ifChecked', filterBubbles);
  $('input#filterAccepted').on('ifUnchecked', filterBubbles);
  $('input#filterClosed').on('ifChecked', filterBubbles);
  $('input#filterClosed').on('ifUnchecked', filterBubbles);
  $('input#filterDeclined').on('ifChecked', filterBubbles);
  $('input#filterDeclined').on('ifUnchecked', filterBubbles);
  $('input#filterOthers').on('ifChecked', filterBubbles);
  $('input#filterOthers').on('ifUnchecked', filterBubbles);

  $('#arrangebubble').chosen().change(function() {
    if(this.value == "random") {
      bubble_force.gravity(0.25).start();
    }
    if(this.value == "department") {
      bubble_force.gravity(0.45).start();
    }
    if(this.value == "grantvalue") {
      bubble_force.gravity(0.45).start();
    }
  })

  $('input#selectLasso').on('ifChecked', function() {
    brush = d3.svg.polybrush()
      .x(d3.scale.linear().range([0, svgwidth]))
      .y(d3.scale.linear().range([0, svgheight]))
      .on("brushstart", function() {
        bubblesvg.selectAll(".selected").classed("selected", false);
      })
      .on("brush", function() {
        //update the div that lists the current selections
        //updateSelectionArea();
        // iterate through all circle.node
        bubblesvg.selectAll("circle.bubble").each(function(d) {
          // if the circle in the current iteration is within the brush's selected area
          if (brush.isWithinExtent(d.x, d.y)) {
            //adjust the style
            d3.select(this).classed("selected", true).style("stroke", "red").style("stroke-width", "4px").style("fill", "white");
            selectedBubbles.push(this.__data__);
            selectedBubbles = _.uniq(selectedBubbles, false, function(x){ return x.Proposal; });
          } 
          // if the circle in the current iteration is not within the brush's selected area
          else {
            //if the current node was not selected with the individual selector (i.e., it was selected with the lasso)
            if(this.selectedIndividually == false){
              selectedBubbles = _.without(selectedBubbles, this.__data__);          
              //reset the style
              d3.select(this).classed("selected", false).style("stroke", "gray").style("stroke-width", "1px").style("fill", function(d){ return color20(d.Sponsor); });
            }
          }
        });
      });
      bubblesvg.append("svg:g")
      .attr("class", "brush")
      .call(brush);
  })
    .on('ifUnchecked', function() {
      $('.brush').remove()
    });

  $('input#selectIndividual').on('ifChecked', function() {
    individualSelect = true;  //set the individualSelect flag to true. this will be used in the tick function
  })
    .on('ifUnchecked', function() {
      individualSelect = false;
    }); 
/*
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
      }
    })
    .on('ifUnchecked', function() {
      //show the selectionArea div
      $('#selectionArea').show('slow');
    }); 
*/
  //if the user clicks the button to remove all selections
  $('#selectionRemove').click(function() {
    selectedBubbles = []; //empty the array
    cloningSvg.selectAll('*').remove();
    //hide the selectionArea div
    //$('#selectionArea').hide('slow');
    $('#cloningArea').hide('slow');
    //return to the defaul for the radios (i.e., check the 'none' option)
    $('input#selectNone').iCheck('check');
    //reset the style of the nodes
    d3.selectAll("circle.bubble").each(function() {
      d3.select(this).classed("selected", false).style("stroke", "gray").style("stroke-width", "1px").style("fill", function(d){ return color20(d.Sponsor); });
    });
  });

  $('#selectionClone').click(function() {
    if(selectedBubbles.length == 0)
      return ;

    cloningSvg.selectAll('*').remove();
    cloningSvg.append('svg:rect')
      .attr('width', cloningWidth)
      .attr('height', cloningHeight)
      .style('fill', 'none')
      .style('opacity', '0');

    $('#cloningArea').show('slow');
    //clone selected data so that we can create a new layout
    var s = JSON.stringify(selectedBubbles);
    var bubbles = JSON.parse(s);

    var cloningBubble = cloningSvg.selectAll('circle.bubble')
      .data(bubbles)
      .enter().append('svg:circle')
      .attr('class', 'bubble')
      .attr("r", function(grant) { 
        var num = parseFloat((grant.RequestAmt.substring(1)).replace(/\,/g, ''))  //cast the string into a float after removing commas and dollar sign
        return (num ? log_scale(num) : 1) * 0.3; })
      .style("fill", function(grant) { return color20(grant.Sponsor); })
      .style("stroke", "gray")
      .style("stoke-width", "1px");

    var cloning_bubble_force = d3.layout.force()
      .size([cloningWidth, cloningHeight])
      .nodes(bubbles);
      

    function cloningAreaTick() {
      cloningBubble.attr("cx", function(d) { return d.x; })
          .attr("cy", function(d) { return d.y; });
    }

    cloningBubble
      .on("mouseover", function(d) {
        d3.select(this).attr("cursor", "pointer");
        d3.select(this).style("stroke-width", "3px");
      })
      .on("mouseout", function(d) {
        d3.select(this).style("stroke-width", "1px");
      });

    cloning_bubble_force.gravity(0.25)
      .charge(function(d, i) {
        var radius = $("circle.bubble")[i].r.animVal.value;
        return -Math.pow(radius, 2) / 1.5;
      })
      .on("tick", cloningAreaTick)
      .start();
  }) //end of selectionClone click

  // $('#arrangetreemap').on("change", function() {
  //     console.log("select zoom(node)");
  //     treemap.value(this.value == "size" ? size : count)
  //             .nodes(root);
  //     zoom(node);
  // });
  
  function refreshTreemap() {
    //recalculate the layout
    var nodes = treemap.nodes(root);

    var children = nodes.filter(function(d) {
        return !d.children;
    });
    var parents = nodes.filter(function(d) {
        return d.children;
    });

    treemapsvg.selectAll("g.cell.parent")
            .data(parents)
            .transition().duration(transitionDuration)
            .call(function(d, i) {
              this.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
              
              this.selectAll("rect")
                  .attr("width", function(d) { return Math.max(0.01, d.dx - 1); })
                  .attr("height", function(d) { return headerHeight; });
                
              this.selectAll("text")
                .attr("x", function(d) { return d.dx / 2; })
                .attr("y", function(d) { return headerHeight / 2 + 4; });
            });
    treemapsvg.selectAll("g.cell.parent")
            .transition().delay(transitionDuration)
            .call(function(d, i) {
              this.selectAll("text")
                .style("opacity", function(d) {
                  d.w = this.getComputedTextLength();
                  return d.dx > d.w ? 1 : 0;
                });
            });
    treemapsvg.selectAll("g.cell.child")
            .data(children)
            .transition().duration(transitionDuration)
            .call(function(d, i) {
              this.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
              
              this.selectAll("rect")
                  .attr("width", function(d) { return Math.max(0.01, d.dx - 1); })
                  .attr("height", function(d) { return Math.max(0.01, d.dy - 1); });
                
              this.selectAll("text")
                .attr("x", function(d) { return d.dx / 2; })
                .attr("y", function(d) { return d.dy / 2; });
            });
  }

  function treemapValueAccessor(d) {
    var req = d.RequestAmt;
    req = req.replace(/^\s+|\s+$/g, ''); //remove whitespaces
    req = req.replace(/\$/g,""); //remove dollar sign
    req = req.replace(/,/g,""); //remove commas
    req = parseFloat(req);  //convert from string to float and return

    //status filter
    switch(d.AwardStatus) {
      case "Accepted":
        req = $('input#treemapFilterAccepted').is(':checked') ? req : 0;
        break;
      case "Closed":
        req = $('input#treemapFilterClosed').is(':checked') ? req : 0;
        break;
      case "":
        if(d.ProposalStatus == "Declined")
          req = $('input#treemapFilterDeclined').is(':checked') ? req : 0;
        else //others including Withdrawn, Inst. Approved, Pending Approval, Draft
          req = $('input#treemapFilterOthers').is(':checked') ? req : 0;
        break;
      default:
        req = 0;
    }

    //year filter
    if(d.AwardStatus == "Accepted") {
      var beginLowerLimit = grantBeginYearArray[ $( "#treemapbeginyearrange" ).slider("option", "values")[0] ];
      var beginUpperLimit = grantBeginYearArray[ $( "#treemapbeginyearrange" ).slider("option", "values")[1] ];
      var endLowerLimit = grantEndYearArray[ $( "#treemapendyearrange" ).slider("option", "values")[0] ];
      var endUpperLimit = grantEndYearArray[ $( "#treemapendyearrange" ).slider("option", "values")[1] ];

      var begin = parseInt(d.BeginDate.substring(0, 4));
      var end = parseInt(d.EndDate.substring(0, 4));
      if(!(beginLowerLimit <= begin && begin <= beginUpperLimit && endLowerLimit <= end && end <= endUpperLimit))
        req = 0;
    }
    
    return req;
  }

  ///filters for treemap
  $('input#treemapFilterAccepted').on('ifChecked', refreshTreemap);
  $('input#treemapFilterAccepted').on('ifUnchecked', refreshTreemap);
  $('input#treemapFilterClosed').on('ifChecked', refreshTreemap);
  $('input#treemapFilterClosed').on('ifUnchecked', refreshTreemap);
  $('input#treemapFilterDeclined').on('ifChecked', refreshTreemap);
  $('input#treemapFilterDeclined').on('ifUnchecked', refreshTreemap);
  $('input#treemapFilterOthers').on('ifChecked', refreshTreemap);
  $('input#treemapFilterOthers').on('ifUnchecked', refreshTreemap);

  $('#arrangetreemap').chosen().change(function() {
    var built = false;

    if(this.value == "department") {
      if(treemapviz.select("g#departmentsTreemap")[0][0]) {
        treemapsvg = treemapviz.select("g#departmentsTreemap");
        treemapsvg.style("visibility", "visible").style("opacity", 0);
        treemapsvg.transition().duration(transitionDuration).style("opacity", 1);
        built = true;
      } else {
        treemapsvg = treemapviz.append("svg:g")
              .attr("id", "departmentsTreemap")
              .attr("transform", "translate(.5,.5)");
      }
      if(treemapviz.select("g#sponsorsTreemap")[0][0]) {
        treemapviz.select("g#sponsorsTreemap")//.transition().duration(transitionDuration)
              .style("opacity", 0);
        treemapviz.select("g#sponsorsTreemap")//.transition().delay(transitionDuration)
              .style("visibility", "hidden");
      }
    } else if(this.value == "sponsor") {
      if(treemapviz.select("g#sponsorsTreemap")[0][0]) {
        treemapsvg = treemapviz.select("g#sponsorsTreemap");
        treemapsvg.style("visibility", "visible").style("opacity", 0);
        treemapsvg.transition().duration(transitionDuration).style("opacity", 1);
        built = true;
      } else {
        treemapsvg = treemapviz.append("svg:g")
              .attr("id", "sponsorsTreemap")
              .attr("transform", "translate(.5,.5)");
      }
      if(treemapviz.select("g#departmentsTreemap")[0][0]) {
        treemapviz.select("g#departmentsTreemap")//.transition().duration(transitionDuration)
              .style("opacity", 0);
        treemapviz.select("g#departmentsTreemap")//.transition().delay(transitionDuration)
              .style("visibility", "hidden");
      }
    }

    if(!built)
      constructTreemap(this.value);
  });

  $(function() {
    $( "#treemapviz" ).tooltip({
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
        else if ( $(this).attr("class") == "cell parent") {
          if (this.__data__ == root){
            var numChildren = this.__data__.children.length;
            var total = this.__data__.value;
            var text = "<b>Faculty of Science</b>" + "<br><b>Departments:</b> " + numChildren + "<br><b>Total Request Amount:</b> $" + total;
            return text;
          }
          else{
            var numChildren = this.__data__.children.length;
            var total = this.__data__.value;
            var text = "<b>Department:</b> " + this.__data__.name + "<br><b>Grant Requests:</b> " + numChildren + "<br><b>Total Request Amount:</b> $" + total;
            return text;
          }

        }
      }
    });

    $('#bubbleviz').tooltip({
      items: "circle.bubble",
      content: function() {
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
    });

    $("#filtersources").chosen().change( function () {
      var removed = _.difference(filtersourcesvisible, $("#filtersources").val()); //if a value was removed, this will not be empty
      var added = _.difference($("#filtersources").val(), filtersourcesvisible);   //if a value was added, this will not be empty
      var filtersourceshidden = _.difference(grantDepartments, $("#filtersources").val());
      d3.selectAll('.sankeynode').each(function (node) {
        if (removed == node.name){
          d3.select(this).transition().duration(1000).style("opacity", 0);
        }
        else if (added == node.name){
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

      filtersourcesvisible = $("#filtersources").val(); //update which sources are visible now

    });

    //same as above, but for filtertargets
    $("#filtertargets").chosen().change( function () {
      var removed = _.difference(filtertargetsvisible, $("#filtertargets").val()); //if a value was removed, this will not be empty
      var added = _.difference($("#filtertargets").val(), filtertargetsvisible);   //if a value was added, this will not be empty  
      var filtertargetshidden = _.difference(proposalStatuses, $("#filtertargets").val());
      d3.selectAll('.sankeynode').each(function (node) {
        if (removed == node.name){
          d3.select(this).transition().duration(1000).style("opacity", 0);
        }
        else if (added == node.name){
          d3.select(this).transition().duration(1000).style("opacity", 1);
        }
      });

      d3.selectAll('.sankeylink').each(function (link) {
        if (removed == link.target.name){
          d3.select(this).transition().duration(1000).style("opacity", 0);
        }
        else if (added == link.target.name){
          d3.select(this).transition().duration(1000).style("opacity", 1);
        }
      });  

      filtertargetsvisible = $("#filtertargets").val(); //update which targets are visible now

    });
  });//end function

  //populates the filter area based on grant data
  //is called from prepareSankeyDepts in processGrantData
  function populateFilter(grantDepts, proposalStatuses, awardStatuses) {

    //loop through each grantDept and append it
    $.each(grantDepts, function(key, value) {  
      $('#filtersources')
        .append($("<option selected></option>")
        .attr("value",value)
        .text(value))
        .trigger("liszt:updated");
    });

    //loop through each grantDept and append it
    $.each(proposalStatuses, function(key, value) {  
      $('#filtertargets')
        .append($("<option selected></option>")
        .attr("value",value)
        .text(value))
        .trigger("liszt:updated");
    });  

  // $("#filteryears").RangeSlider("option", "bounds", {min: 10, max: 90});

    //loop through each grantYear and append it
    // $.each(grantYears, function(key, value) {  
    //   $('#filteryears')
    //     .append($("<option selected></option>")
    //     .attr("value",value)
    //     .text(value));
    // });  

    filtersourcesvisible = $('#filtersources').val(); //for the filtering later
    filtertargetsvisible = $('#filtertargets').val(); //for the filtering later

    //update the fields for chzn
    $("#filtersources").trigger("liszt:updated");
    $("#filtertargets").trigger("liszt:updated");  

    filterPopulated = true;
  }

  //constructs the sankey diagram
  //parameter fragmentation is an object with nodes and links arrays...determines which sankey to construct
  function constructSankey(fragmentationLevel) {

    var xpos = $('#vizcontainer').width()/2 - $('#vizloader').width()/2;
    var ypos = $('#vizcontainer').height()/2 - $('#vizloader').height()/2;
    $('#vizloader').css({"position": "absolute", "left":  xpos + "px", "top": ypos + "px"}).show();

    getSankeyData(fragmentationLevel, buildSankey);
  }//end constructSankey

  //gets the data for the sankey (either from the sessionStorage or from the db on the server) and then builds the sankey by passing the buildSankey function as a callback to getSankeyData
  //@param: fragmentationLevel: indicates how the data should be fragmented 
  //@param: callback: a callback function--in this case buildSankey--that builds the treemap visualization
  //@return: none
  function getSankeyData(fragmentationLevel, callback){

    var sankey_data_departments, sankey_data_faculty, grant_departments, proposal_statuses, award_statuses, grant_year_range_begin, grant_year_range_end, grant_sponsors;

    if (fragmentationLevel == "departments"){
      if(store.session.has("sankey_data_departments")){
        console.log("sankey_data_departments is already in sessionStorage...no need to fetch again!");
        fragmentationLevel = store.session("sankey_data_departments");
        grant_departments = store.session("grant_departments");
        proposal_statuses = store.session("proposal_statuses");
        award_statuses = store.session("award_statuses");
        //grants_unique = store.session("grants_unique");
        grant_sponsors = store.session("grant_sponsors");
        grant_year_range_begin = store.session("grant_year_range_begin");
        grant_year_range_end = store.session("grant_year_range_end");      
        callback(grant_sponsors, grant_departments, proposal_statuses, award_statuses, fragmentationLevel, grant_year_range_end, grant_year_range_begin);      
      }
      else{
        console.log("fetching sankey_data_departments...");
        $.get('/grants/sankey_data_departments', function(result) {
          fragmentationLevel = JSON.parse(result.sankey_data_departments);
          grant_departments = JSON.parse(result.grant_departments);
          proposal_statuses = JSON.parse(result.proposal_statuses);
          award_statuses = JSON.parse(result.award_statuses);
          //grants_unique = JSON.parse(result.grants_unique);
          grant_sponsors = JSON.parse(result.grant_sponsors);
          grant_year_range_begin = JSON.parse(result.grant_year_range_begin);
          grant_year_range_end = JSON.parse(result.grant_year_range_end);        
          store.session("sankey_data_departments", fragmentationLevel);
          store.session("grant_departments", grant_departments);
          store.session("proposal_statuses", proposal_statuses);
          store.session("award_statuses", award_statuses);
          //store.session("grants_unique", grants_unique);
          store.session("grant_sponsors", grant_sponsors);
          store.session("grant_year_range_begin", grant_year_range_begin);
          store.session("grant_year_range_end", grant_year_range_end);        
          callback(grant_sponsors, grant_departments, proposal_statuses, award_statuses, fragmentationLevel, grant_year_range_end, grant_year_range_begin);        
        });
      }      
    }
    else if (fragmentationLevel == "faculty"){
      if(store.session.has("sankey_data_faculty")){
        console.log("sankey_data_faculty is already in sessionStorage...no need to fetch again!");
        fragmentationLevel = store.session("sankey_data_faculty");
        grant_departments = store.session("grant_departments");
        proposal_statuses = store.session("proposal_statuses");
        award_statuses = store.session("award_statuses");
        //grants_unique = store.session("grants_unique");
        grant_sponsors = store.session("grant_sponsors");      
        grant_year_range_begin = store.session("grant_year_range_begin");
        grant_year_range_end = store.session("grant_year_range_end");
        callback(grant_sponsors, grant_departments, proposal_statuses, award_statuses, fragmentationLevel, grant_year_range_end, grant_year_range_begin);      
      }
      else{
        console.log("fetching sankey_data_faculty...");
        $.get('/grants/sankey_data_faculty', function(result) {
          fragmentationLevel = JSON.parse(result.sankey_data_faculty);
          grant_departments = JSON.parse(result.grant_departments);
          proposal_statuses = JSON.parse(result.proposal_statuses);
          award_statuses = JSON.parse(result.award_statuses);
          //grants_unique = JSON.parse(result.grants_unique);
          grant_sponsors = JSON.parse(result.grant_sponsors);
          grant_year_range_begin = JSON.parse(result.grant_year_range_begin);
          grant_year_range_end = JSON.parse(result.grant_year_range_end);        
          store.session("sankey_data_faculty", fragmentationLevel);
          store.session("grant_departments", grant_departments);
          store.session("proposal_statuses", proposal_statuses);
          store.session("award_statuses", award_statuses);
          //store.session("grants_unique", grants_unique);
          store.session("grant_sponsors", grant_sponsors);        
          store.session("grant_year_range_begin", grant_year_range_begin);
          store.session("grant_year_range_end", grant_year_range_end);
          callback(grant_sponsors, grant_departments, proposal_statuses, award_statuses, fragmentationLevel, grant_year_range_end, grant_year_range_begin);        
        });
      }    
    }
  }


  function buildSankey(grant_sponsors, grant_departments, proposal_statuses, award_statuses, fragmentationLevel, grant_year_range_end, grant_year_range_begin){

    grant_year_begin_min = _.min(_.filter(_.uniq(_.map(grant_year_range_begin, function(d){ if (d != "") return parseInt(d); })), function(d) { return d != undefined }));
     grant_year_begin_max = _.max(_.filter(_.uniq(_.map(grant_year_range_begin, function(d){ if (d != "") return parseInt(d); })), function(d) { return d != undefined }));
     grant_year_end_min = _.min(_.filter(_.uniq(_.map(grant_year_range_end, function(d){ if (d != "") return parseInt(d); })), function(d) { return d != undefined }));
     grant_year_end_max = _.max(_.filter(_.uniq(_.map(grant_year_range_end, function(d){ if (d != "") return parseInt(d); })), function(d) { return d != undefined }))

      $('#vizloader').hide();

      populateFilter(grant_departments, proposal_statuses, award_statuses);

      $( "#sankeyyearbeginrange" ).slider({
        range: true,
        min: grant_year_begin_min,
        max: grant_year_begin_max,
        values: [ grant_year_begin_min, grant_year_begin_max ],
        slide: function( event, ui ) {
          $( "#sankeyyearbegin" ).val( ui.values[ 0 ] + " - " + ui.values[ 1 ] );
        }
      });
      $( "#sankeyyearbegin" ).val( $( "#sankeyyearbeginrange" ).slider( "values", 0 ) +
        " - " + $( "#sankeyyearbeginrange" ).slider( "values", 1 ) );

      $( "#sankeyyearendrange" ).slider({
        range: true,
        min: grant_year_end_min,
        max: grant_year_end_max,
        values: [ grant_year_end_min, grant_year_end_max ],
        slide: function( event, ui ) {
          $( "#sankeyyearend" ).val( ui.values[ 0 ] + " - " + ui.values[ 1 ] );
        }
      });
      $( "#sankeyyearend" ).val( $( "#sankeyyearendrange" ).slider( "values", 0 ) +
        " - " + $( "#sankeyyearendrange" ).slider( "values", 1 ) );  

      

      sankey
          .nodes(fragmentationLevel.nodes)
          .links(fragmentationLevel.links)
          .layout(32);

      var link = sankeysvg.append("g").selectAll(".sankeylink")
          .data(fragmentationLevel.links)
        .enter().append("path")
          .attr("class", "sankeylink")
          .attr("d", sankeyPath)
          .style("opacity", 0);

          //for the dummy values that were created in the processing stage
          link.style("stroke-width", function(d) { 
            if (d.value > 0.1) {
              return Math.max(1, d.dy); 
            }
            else
              return 0;
            });
          link.transition().duration(1000).style("opacity", 1);
          link.sort(function(a, b) { return b.dy - a.dy; });

      link.append("title")
          .text(function(d) { return d.source.name + " → " + d.target.name + "\n" + format(d.value); });

      var node = sankeysvg.append("g").selectAll(".sankeynode")
          .data(fragmentationLevel.nodes)
        .enter().append("g")
          .attr("class", "sankeynode")
          .style("opacity", 1)
          .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
        .call(d3.behavior.drag()
          .origin(function(d) { return d; })
          .on("dragstart", function() { this.parentNode.appendChild(this); })
          .on("drag", dragmove));


      node.append("rect")
        .attr("height", function(d) { return d.dy; })
        .attr("width", sankey.nodeWidth())
        .style("opacity", 0)
        .style("fill", function(d) { return d.color = color(d.name.replace(/ .*/, "")); })
        .style("stroke", function(d) { return d3.rgb(d.color).darker(2); })
        .transition().duration(1000)
        .style("opacity", 1);


      node.append("title")
          .text(function(d) { return d.name + "\n" + format(d.value); });

      node.append("text")
          .attr("x", -6)
          .attr("y", function(d) { return d.dy / 2; })
          .attr("dy", ".35em")
          .attr("text-anchor", "end")
          .attr("transform", null)
          .text(function(d) { return d.name; })
        .filter(function(d) { return d.x < width / 2; })
          .attr("x", 6 + sankey.nodeWidth())
          .attr("text-anchor", "start");


      // function dragmove(d) {
      //   d3.select(this).attr("transform", "translate(" + d.x + "," + (d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))) + ")");
      //   sankey.relayout();
      //   link.attr("d", path);
      // }


      function dragmove(d) {
        d3.select(this).attr("transform", 
            "translate(" + (
                d.x = Math.max(0, Math.min(width - d.dx, d3.event.x))
            )
            + "," + (
                d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))
            ) + ")");
        sankey.relayout();
        link.attr("d", sankeyPath);
      }

      sankey_constructed = true;
  }//end constructSankey

  function constructBubble () {

    var xpos = $('#vizcontainer').width()/2 - $('#vizloader').width()/2;
    var ypos = $('#vizcontainer').height()/2 - $('#vizloader').height()/2;
    $('#vizloader').css({"position": "absolute", "left":  xpos + "px", "top": ypos + "px"}).show();

    getBubbleData(buildBubble);    

  }//end constructBubble

  /*
  gets the data for the bubbleviz (either from the sessionStorage or from the db on the server) and then builds the viz by passing the buildBubble function as a callback to getBubbleData
  @params: callback: a callback function--in this case buildBubble--that builds the network visualization
  @returns: none
  */
  function getBubbleData (callback) {

    var all_grants;

    async.parallel(
      [
        function(callback){
            if(store.session.has("all_grants")){
              console.log("all_grants is already in sessionStorage...no need to fetch again");
              all_grants = store.session("all_grants");
              callback(null);
            }
            else {
              console.log("fetching all_grants");
              $.get('grants/all_grants', function(result){
                all_grants = JSON.parse(result.all_grants);
                //store.session("all_grants", all_grants);
                callback(null);
              });
            }         
          }
      ],

        function(err, results) {
          if (err) throw new Error(err);
          initBubbleFilter(all_grants);
          callback(all_grants);
        }
    );//end async.parallel
  }//end getBubbleData

  function buildBubble(all_grants) {
    //hide the loading gif
    $('#vizloader').hide();

    //group grants by the proposal number (i.e., group multiple records of the same grant)
    grouped_grants = _.groupBy(all_grants, function(x) { return x.Proposal; });

    _.each(grouped_grants, function(grantobj, key) { 
      if (grantobj.length > 1) {
        var temp = rm.combineObjects(grantobj); 
        grouped_grants[key] = temp;
      } 
      else
        grouped_grants[key] = grantobj[0]; //remove the object from its array enclosure so that the resulting grouped_grants is consistent
    });

    var accepted_grants = _.filter(grouped_grants, function(grant) { return grant.AwardStatus==="Accepted"; } );

    bubble_force
      .nodes(accepted_grants); //d3 needs the data in the form of an array

    bubble = bubblesvg.selectAll("circle.bubble")
      .data(accepted_grants, function(d) { return d.index; })
      .enter().append("svg:circle")
      .attr("class", "bubble")
      .attr("r", function(grant) { 
        var num = parseFloat((grant.RequestAmt.substring(1)).replace(/\,/g, ''))  //cast the string into a float after removing commas and dollar sign
        return (num ? log_scale(num) : 1) * 0.3; })
      .style("fill", function(grant) { return color20(grant.Sponsor); });

    bubble
      .on("mouseover", function() {
        d3.select(this).attr("cursor", "pointer");
        if(!d3.select(this).classed("selected"))
          d3.select(this).style("stroke-width", "3px");
      })
      .on("mouseout", function() {
        if(!d3.select(this).classed("selected"))
          d3.select(this).style("stroke-width", "1px");
      })
      .on("mouseup", function() {
        if(individualSelect) {
          //if this node is already selected
          if (this.style.strokeWidth == "4px") {
            selectedBubbles = _.without(selectedBubbles, this.__data__);
            this.selectedIndividually = false;
            d3.select(this).classed("selected", false).style("stroke", "gray").style("stroke-width", "1px").style("fill", function(d) {return color20(d.Sponsor); });         
          }
          else {
            selectedBubbles.push(this.__data__);
            this.selectedIndividually = true;
            selectedBubbles = _.uniq(selectedBubbles, false, function(x){ return x.Proposal; });
            d3.select(this).classed("selected", true).style("stroke", "red").style("stroke-width", "4px").style("fill", "white");
          }
          //update the div that lists the current selections
          //updateSelectionArea();  
        }
      });

    //var max_grant_value = _.max(accepted_grants, function(d) { return parseFloat((d.RequestAmt.substring(1)).replace(/\,/g, '')); });
    //getCenter(parseFloat((max_grant_value.RequestAmt.substring(1)).replace(/\,/g, '')));
    getCenter(null);

    //keep track of whether a node has been selected individually
    d3.selectAll("circle.bubble").each(function() {
        this.selectedIndividually = false;
      });

    bubble_constructed = true;

    bubble_force
      .gravity(0.25)
      .charge(function(d, i) {
        var radius = $("circle.bubble")[i].r.animVal.value;
        return -Math.pow(radius, 2) / 1.5;
      })
      .on("tick", tick)
      .start();

  }//end buildBubble

  function constructTreemap (nestedData) {

    var xpos = $('#vizcontainer').width()/2 - $('#vizloader').width()/2;
    var ypos = $('#vizcontainer').height()/2 - $('#vizloader').height()/2;
    $('#vizloader').css({"position": "absolute", "left":  xpos + "px", "top": ypos + "px"}).show();

    getTreemapData(nestedData, buildTreemap);
  }//end constructTreemap

  //gets the data for the treemap (either from the sessionStorage or from the db on the server) and then builds the treemap by passing the buildTreemap function as a callback to getTreemapData
  //@param: nestedData: indicates how the data should be nested (e.g., by department, by sponsor)
  //@param: callback: a callback function--in this case buildTreemap--that builds the treemap visualization
  //@return: none
  function getTreemapData (nestedData, callback) {
    var nested_by_sponsor, nested_by_department, grants_unique, grant_sponsors, all_grants;

    async.parallel([
      function(callback) {
        if (nestedData == "department"){
          if(store.session.has("nested_by_department")){
            console.log("nested_by_department is already in sessionStorage...no need to fetch again!");
            nestedData = store.session("nested_by_department");
            //grants_unique = store.session("grants_unique");
            grant_sponsors = store.session("grant_sponsors");
            callback();      
          }
          else{
            console.log("fetching nested_by_department...");
            $.get('/grants/nested_by_department', function(result) {
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
              nestedData = nested_by_department;
              callback();        
            });
          }
        }
        else if (nestedData == "sponsor"){
          if(store.session.has("nested_by_sponsor")){
            console.log("nested_by_sponsor is already in sessionStorage...no need to fetch again!");
            nestedData = store.session("nested_by_sponsor");
            //grants_unique = store.session("grants_unique");
            grant_sponsors = store.session("grant_sponsors");      
            callback();      
          }
          else{
            console.log("fetching nested_by_sponsor...");
            $.get('/grants/nested_by_sponsor', function(result) {
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
              nestedData = nested_by_sponsor;
              callback();
            });
          }  
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
          $.get('grants/all_grants', function(result){
            all_grants = JSON.parse(result.all_grants);
            //store.session("all_grants", all_grants);
            callback();
          });
        }         
      }
      ],
      function(err, result) {
        top20 = topSponsors(20, grant_sponsors, all_grants);
        initTreemapFilter(all_grants);
        callback(nestedData, grant_sponsors);
      }
    );
  }

  function buildTreemap(nestedData, grant_sponsors) {

    $('#vizloader').hide();

    //construct the legend
    //constructTreemapLegend();

    node = root = nestedData;

    //sticky treemaps cache the array of nodes internally; therefore, to reset the cached state when switching datasets with a sticky layout, call sticky(true) again
    treemap.sticky(true);
    var nodes = treemap.nodes(root);
        //.filter(function(d) { return !d.children; }); //no children

    var children = nodes.filter(function(d) {
        return !d.children;
    });
    var parents = nodes.filter(function(d) {
        return d.children;
    });

    // create parent cells
    var parentCells = treemapsvg.selectAll("g.cell.parent")
            .data(parents)
            .enter().append("g")
            .attr("class", "cell parent")
            .on("click", function(d) {
              zoom(node === d ? root : d);
            });
    parentCells.append("rect")
            .classed("background", true)
            .style("fill", headerColor);
    parentCells.append("text")
            .attr("class", "celllabel")
            .attr("x", function(d) { return d.dx / 2; })
            .attr("y", function(d) { return headerHeight / 2 + 4; })
            .style("font-size", headerHeight / 3 * 2 + "px")
            .attr("text-anchor", "middle")
            .text(function(d) { return d.name; })
            .style("opacity", 0);

    // update transition
    parentCells//.transition().duration(transitionDuration)
            .attr("transform", function(d) {
                return "translate(" + d.x + "," + d.y + ")";
            })
            .selectAll("rect")
            .attr("width", function(d) {
                return Math.max(0.01, d.dx - 1);
            })
            .attr("height", headerHeight);
    parentCells//.transition().delay(transitionDuration)
            .selectAll('text')
            .style("opacity", function(d) {
              d.w = this.getComputedTextLength();
              return d.dx > d.w ? 1 : 0;
            });

    // create children cells
    var childCells = treemapsvg.selectAll("g.cell.child")
            .data(children)
            .enter().append("g")
            .attr("class", "cell child")
            .on("click", function(d) {
                zoom(node === d.parent ? root : d.parent);
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

    treemap_constructed = true;

  }//end constructtreemap

  function tick () {

    if($('#arrangebubble').val() == "grantvalue") {
      bubble
        .each(function(d) {
          var i = 0;
          var amount = parseFloat((d.RequestAmt.substring(1)).replace(/\,/g, ''));
          //find matched center index
          while(i < grantValueCenters.length) {
            if(grantValueCenters[i].amount >= amount)
              break;
            i++;
          }
          d3.select(this).attr("cx", function(d) {
            return d.x += (grantValueCenters[i].focuscoords[0]) * 0.12 * bubble_force.alpha();
          });
          d3.select(this).attr("cy", function(d) {
            return d.y += (grantValueCenters[i].focuscoords[1]) * 0.12 * bubble_force.alpha();
          });
        });
    } else if($('#arrangebubble').val() == "department") {
      bubble
        .each(function(d) {
          var i = 0;
          //there are only 8 grants that have a nested department object, it does not matter how to put these bubbles
          //the random center at each tick allows thses bubbles to stay in between department areas they belong to
          var dept = ($.isArray(d.Department) ? d.Department[parseInt(Math.random()*d.Department.length)] : d.Department).substring(0, 5);
          //find matched center index
          while(i < departmentCenters.length) {
            if(departmentCenters[i].name.substring(0, 5) == dept)
              break;
            i++;
          }
          if(i == departmentCenters.length)
            i--;
          d3.select(this).attr("cx", function(d) {
            return d.x += (departmentCenters[i].focuscoords[0]) * 0.12 * bubble_force.alpha();
          });
          d3.select(this).attr("cy", function(d) {
            return d.y += (departmentCenters[i].focuscoords[1]) * 0.12 * bubble_force.alpha();
          });
        });
    } else {
      bubble
        .each(function() { //moves each node towards the normal_center
          d3.select(this).attr("cx", function(d) {
            return d.x += (normal_center.x - d.x) * 0.12 * bubble_force.alpha();
          });
          d3.select(this).attr("cy", function(d) {
            return d.y += (normal_center.y - d.y) * 0.12 * bubble_force.alpha();
          });
          //.each(collide(.5));  
        });
    }
    bubble
      .each(function() {
        if(!d3.select(this).classed("selected")) {
          d3.select(this).style("stroke", "gray");
          d3.select(this).style("stroke-width", function(d) { 
            if (d.fixed == true)
              return "3px";
            else
              return "1px";
          });
        }
      });
  }

  /* 
  calculate the center coordinates when arranging.
  @params: max_grant_value: the max of grants values
  @returns: 
  */
  function getCenter(max_grant_value) {
    //calculate grant value centers.
    //var numpoints = parseInt(Math.log(max_grant_value) / Math.LN10) + 2;
    var numpoints = 9;
    var slice = 2 * Math.PI / numpoints;
    var radius = circleOutline[0][0].r.animVal.value;
    var centerx = circleOutline[0][0].cx.animVal.value;
    var centery = circleOutline[0][0].cy.animVal.value;
    for(var i = 0; i < numpoints; i++) {
      var angle = slice * i;
      var newX = (centerx + radius * Math.cos(angle));
      var newY = (centery + radius * Math.sin(angle));
      grantValueCenters.push({"amount": Math.pow(10, i), "focuscoords": [newX, newY]});
    }

    //calculate department centers.
    var science_departments;
    if(store.session.has("science_departments")) {
        console.log("science_departments is already in sessionStorage...no need to fetch again");
        science_departments = store.session("science_departments");
        buildDepartmentCenter();
    } else {
      console.log("fetching science_departments...");
      $.get('/network/science_departments', function(result) {
        science_departments = JSON.parse(result.science_departments);
        store.session("science_departments", science_departments);
        buildDepartmentCenter();
      });
    }

    function buildDepartmentCenter() {
      science_departments.forEach(function (d) {
        departmentCenters.push({"name": d, "focuscoords": []});
      });
      departmentCenters.push({"name": "others", "focuscoords": []});

      slice = 2 * Math.PI / departmentCenters.length;
      radius = circleOutline[0][0].r.animVal.value;
      centerx = circleOutline[0][0].cx.animVal.value;
      centery = circleOutline[0][0].cy.animVal.value;
      for(var i = 0; i < departmentCenters.length; i++) {
        var angle = slice * i;
        var newX = (centerx + radius * Math.cos(angle));
        var newY = (centery + radius * Math.sin(angle));
        departmentCenters[i].focuscoords = [newX, newY];
      }
    }
    
  }

  function size(d) {
      return d.size;
  }


  function count(d) {
      return 1;
  }

  function redrawBubble() {
    trans=d3.event.translate;
    scale=d3.event.scale;

    bubblesvg.attr("transform",
        "translate(" + trans + ")"
        + " scale(" + scale + ")");
  }

  function pan() {
    d3.select(this).attr("cursor", "move"); 
    bubblesvg.attr("x", d3.event.x).attr("y", d3.event.y);
  }

  //and another one
  function textHeight(d) {
      var ky = h / d.dy;
      yscale.domain([d.y, d.y + d.dy]);
      return (ky * d.dy) / headerHeight;
  }

  function getRGBComponents (color) {
      var r = color.substring(1, 3);
      var g = color.substring(3, 5);
      var b = color.substring(5, 7);
      return {
          R: parseInt(r, 16),
          G: parseInt(g, 16),
          B: parseInt(b, 16)
      };
  }


  function idealTextColor (bgColor) {
      var nThreshold = 105;
      var components = getRGBComponents(bgColor);
      var bgDelta = (components.R * 0.299) + (components.G * 0.587) + (components.B * 0.114);
      return ((255 - bgDelta) < nThreshold) ? "#000000" : "#ffffff";
  }


  function zoom(d) {
    // treemap
    //         .padding([headerHeight/(height/d.dy), 0, 0, 0])
    //         .nodes(d);

    // moving the next two lines above treemap layout messes up padding of zoom result
    var kx = width  / d.dx;
    var ky = height / d.dy;
    var level = d;

    xscale.domain([d.x, d.x + d.dx]);
    yscale.domain([d.y, d.y + d.dy]);

    if (node != level) {
        treemapsvg.selectAll(".cell.child .celllabel").style("display", "none");
    }

    var zoomTransition = treemapsvg.selectAll("g.cell").transition().duration(transitionDuration)
            .attr("transform", function(d) {
                return "translate(" + xscale(d.x) + "," + yscale(d.y) + ")";
            })/*
            .each("start", function() {
                d3.select(this).select(".celllabel")
                        .style("display", "none");
            })
            .each("end", function(d, i) {
                if (!i && (level !== self.root)) {
                    treemapsvg.selectAll(".cell.child")
                        .filter(function(d) {
                            return d.parent === self.node; // only get the children for selected group
                        })
                        .select(".celllabel")
                        .style("display", "")
                        .style("fill", function(d) {
                            return idealTextColor(color(d.parent.name));
                        });
                }
            });*/
/*
    zoomTransition.selectAll(".celllabel")
            .attr("width", function(d) {
                return Math.max(0.01, (kx * d.dx - 1));
            })
            .attr("height", function(d) {
                return d.children ? (ky * headerHeight) : Math.max(0.01, (ky * d.dy - 1));
            });
/*
    zoomTransition.select(".child .celllabel")
            .attr("x", function(d) {
                return kx * d.dx / 2;
            })
            .attr("y", function(d) {
                return ky * d.dy / 2;
            });*/

    // update the width/height of the rects
    zoomTransition.select("rect")
            .attr("width", function(d) {
                return Math.max(0.01, (kx * d.dx - 1));
            })
            .attr("height", function(d) {
                return d.children ? (ky * headerHeight) : Math.max(0.01, (ky * d.dy - 1));
            });

    zoomTransition.select("text")
            .attr("x", function(d) { return kx * d.dx / 2; })
            .attr("y", function(d) { return ky * (headerHeight / 2 + 4); })
            .style("font-size", ky * headerHeight  / 3 * 2 + "px");

    node = d;

    if (d3.event) {
        d3.event.stopPropagation();
    }
  }

  function buildYearRangeArray(all_grants) {
    all_grants.forEach(function(d) {
      var begin = parseInt(d.BeginDate.substring(0, 4));
      var end = parseInt(d.EndDate.substring(0, 4));
      grant_year_begin_max = begin > grant_year_begin_max ? begin : grant_year_begin_max;
      grant_year_begin_min = begin < grant_year_begin_min ? begin : grant_year_begin_min;
      grant_year_end_max = end > grant_year_end_max ? end : grant_year_end_max;
      grant_year_end_min = end < grant_year_end_min ? end : grant_year_end_min;
    });

    //the begin years of most grants are after 2000. There are only 60 grants that begin before 2000 and 42 grants ending before 2012
    grantBeginYearArray.push(grant_year_begin_min);
    for(var year = 2000; year <= grant_year_begin_max; year++)
      grantBeginYearArray.push(year);
    grantEndYearArray.push(grant_year_end_min);
    for(var year = 2012; year <= grant_year_end_max; year++)
      grantEndYearArray.push(year);

    yearRangeArrayBuilt = true;
  }

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


  // function constructTreemapLegend() {
  //   var label = treemaplegend.selectAll(".label")
  //     .data(grantSponsors)
  //     .enter().append("div")
  //     .attr("class", "label")
  //     .text(function(d) { 
  //         return d; })
  //     .append("div")
  //     .attr("class", "labelcolor")
  //     .style("background-color", function(d){ return color(d); });
  // }









  //   var cell = treemapsvg.selectAll("g")
  //       .data(nodes)
  //     .enter().append("svg:g")
  //       .attr("class", "cell")
  //       .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
  //       .on("click", function(d) { return zoom(node == d.parent ? root : d.parent); });

  //   cell.append("svg:rect")
  //       .attr("width", function(d) { return d.dx - 1; })
  //       .attr("height", function(d) { return d.dy - 1; })
  //       .style("fill", function(d) { return colorTreemap(d.parent.Department); });

  //   cell.append("svg:text")
  //       .attr("x", function(d) { return d.dx / 2; })
  //       .attr("y", function(d) { return d.dy / 2; })
  //       .attr("dy", ".35em")
  //       .attr("text-anchor", "middle")
  //       .text(function(d) { return d.PgmName; })
  //       .style("opacity", function(d) { d.w = this.getComputedTextLength(); return d.dx > d.w ? 1 : 0; });

  //   d3.select(window).on("click", function() { zoom(root); });

  //   d3.select("select").on("change", function() {
  //     treemap.value(this.value == "size" ? size : count).nodes(root);
  //     zoom(node);
  //   });


  //   function size(d) {
  //     return d.size;
  //   }

  //   function count(d) {
  //     return 1;
  //   }

  //   function zoom(d) {
  //     var kx = w / d.dx, ky = h / d.dy;
  //     x.domain([d.x, d.x + d.dx]);
  //     y.domain([d.y, d.y + d.dy]);

  //     var t = treemapsvg.selectAll("g.cell").transition()
  //         .duration(d3.event.altKey ? 7500 : 750)
  //         .attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; });

  //     t.select("rect")
  //         .attr("width", function(d) { return kx * d.dx - 1; })
  //         .attr("height", function(d) { return ky * d.dy - 1; })

  //     t.select("text")
  //         .attr("x", function(d) { return kx * d.dx / 2; })
  //         .attr("y", function(d) { return ky * d.dy / 2; })
  //         .style("opacity", function(d) { return kx * d.dx > d.w ? 1 : 0; });

  //     node = d;
  //     d3.event.stopPropagation();
  //   }
  // }

  return module;

}());
