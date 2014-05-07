var GRANTS = (function () { 

  var module = {}; //this will be exported (returned)
  var grantDepartments = []; //array of unique departments
  var proposalStatuses = []; //array of unique proposal statuses
  var awardStatuses = []; //array of unique award statuses
  var filterPopulated = false;
  var filtersourcesvisible; //keeps track of the currently visible filter sources
  var filtertargetsvisible; //keeps track of the currently visible filter targets
  var sankey_constructed = false;
  var treemap_constructed = false;
  var bubble_constructed = false;
  var bubblezoom = d3.behavior.zoom();
  var bubble;
  var top20 = [];
  var programview = 0; //keeps track of whether the line chart is in program view or not (i.e., it's in sponsor view)
  var grouped_grants;
  var log_scale = d3.scale.log().domain([1,10000000]).range([5,40]); //log scale for the grant request amounts
  var brush;
  var selectedBubbles = [];
  var grantValueCenters = [];
  var departmentCenters = [];
  //for calculate boundary polygons in arranging
  var grantvalue_border_coords = [];
  var grantvalue_border_coords = [];
  var department_border_coords = [];
  var department_border_coords = [];
  var border_coords_sampled = true; //when set to false, start updating the border coords arrays in the tick function
  var sampletime = 1000;
  var individualSelect = false; //flag to be used in 'tick' function for selecting individual nodes

  //for the bubble diagram filter
  var grant_year_begin_min = 9999;
  var grant_year_begin_max = 0;
  var grant_year_end_min = 9999;
  var grant_year_end_max = 0;
  var grant_year_deadline_min = 9999;
  var grant_year_deadline_max = 0;
  var grantBeginYearArray = [];
  var grantEndYearArray = [];
  var grantDeadlineYearArray = [];
  var yearRangeArrayBuilt = false;
  var grantFilterData = [];
  //for the bubble diagram sliders
  var beginLowerLimit;
  var beginUpperLimit;
  var endLowerLimit;
  var endUpperLimit;
  var deadlineLowerLimit;
  var deadlineUpperLimit;

  var animating = false; //set to true if the animation is performing
  var int1; //animate interval timer
  var currentYear;

  var departmentFragmentationName = ["Individual", "Department"];
  var sponsorFragmentationName = ["Individual", "Program", "Sponsor"];

  var colorboxChosen = false; //setting to false will be redirected to the overview

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
    headerColor2 = "#999999",
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
      .attr("transform", "translate(.5,.5)")
      .attr("pointer-events", "visible");

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
  var  circleOutline = bubblesvg.append("svg:circle").attr("cx", width/2).attr("cy", height/2).attr("r", width/3).style("stroke", "gray").style("stroke-width", "1px").style("fill", "none").style("opacity", 0);


  //this list of 20 colors is calculated such that they are optimally disctinct. See http://tools.medialab.sciences-po.fr/iwanthue/
  var color20 = d3.scale.ordinal().range(["#D24B32","#73D74B","#7971D9","#75CCC1","#4F2A3F","#CA4477","#C78D38","#5D8737","#75A0D2","#C08074","#CD50CC","#D0D248","#CA8BC2","#BFC98D","#516875","#434E2F","#66D593","#713521","#644182","#C9C0C3"]);
  var colorfrag = d3.scale.ordinal().range(["#497AC5","#2E5960","#3782A6","#687985","#245199","#3C5F85","#3179DA","#697EA2","#427F8F","#3F82B9","#23619B","#3B5168"]);


  //load the lightbox option for VRchoice
  $('#VRchoice').colorbox({inline:true, width:"80%", href:"#VRchoice", scrolling:false, open:true, overlayClose: false, fadeOut: 300, onCleanup: function() { if(!colorboxChosen) window.location="views"; } }); 


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
    $('#bubbleFilterTips').hide();

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
      colorboxChosen = true;
      $.colorbox.close();
      $('#sankeyviz').show();
      constructSankey("faculty");
      $('#sankeyactions').delay(800).show(800);
    });
    $('#bubblechoice').click(function() {
      colorboxChosen = true;
      $.colorbox.close();
      $('#bubbleviz').show();
      constructBubble();
      $('#bubbleactions').delay(800).show(800);
    });
    $('#treemapchoice').click(function() {
      colorboxChosen = true;
      $.colorbox.close();
      $('#treemapviz').show();
      constructTreemap("department");
      $('#treemapactions').delay(800).show(800);
    });  

    //hide the selectionArea div
    $('#selectionArea').hide();
    $('#selectionArea').draggable({ containment: "#vizcontainer", scroll: false });    

    $('#cloningArea').hide();
    $('#cloningArea').draggable({ containment: "#vizcontainer", scroll: false, handle: "h2" });

    $('#barComparingArea').hide();
    $('#lineComparingArea').hide();

    //hide the sponsor fragmentation slider
    $('#treemapsponsorfragslider').hide();

    //for the user to dismiss a warning
      $('.linehintdrill').click(function() { $(this).hide('blind', 500); } );

  });

  $('#actionpaneltoggle').on("click", function() {
    if ($('#actionpanel').is(':visible')){
      $('#actionpanel').hide('slow');
      $('#actionpaneltoggle').css('left', '10px').css('width', '20px').css('border-radius', '2px 0px 0px 2px');
      $('#actionpaneltoggle p').text('<');
      $('#vizcontainer').css('width', $(window).width()-50);
      if ($('#treemapviz').is(':visible')){
        $('#treemapviz').css('width', $(window).width()-50);     
        $('#treemapviz svg').css('width', $(window).width()-50);
        //$('#matrixdepartmentlegendtoggle').css('left', $('#matrixbar').width()/2 + $('#matrixdepartmentlegendtoggle').width()/2);
      }
      else if ($('#sankeyviz').is(':visible')){
        $('#sankeyviz').css('width', $(window).width()-50);      
        $('#sankeyviz svg').css('width', $(window).width()-50);
        //$('#networkdepartmentlegendtoggle').css('left', $('#networkbar').width()/2 + $('#networkdepartmentlegendtoggle').width()/2);
      }
      else if ($('#bubbleviz').is(':visible')){
        $('#bubbleviz').css('width', $(window).width()-50);      
        $('#bubbleviz svg').css('width', $(window).width()-50);
        //$('#networkdepartmentlegendtoggle').css('left', $('#networkbar').width()/2 + $('#networkdepartmentlegendtoggle').width()/2);
      }      
    }
    else {
      $('#vizcontainer').css('width', '72%'); 
      $('#actionpanel').show();
      $('#actionpaneltoggle').css('left', '10px').css('top', '6px').css('width', '20px').css('border-radius', '0px 2px 2px 0px'); 
      $('#actionpaneltoggle p').text('>');  
      if ($('#treemapviz').is(':visible')){
        $('#treemapviz').css('width', $('#vizcontainer').width());
        $('#treemapviz svg').css('width', $('#vizcontainer').width());     
        //$('#matrixdepartmentlegendtoggle').css('left', $('#matrixbar').width()/2 + $('#matrixdepartmentlegendtoggle').width()/2);       
      }
      else if ($('#sankeyviz').is(':visible')){
        $('#sankeyviz').css('width', $('#vizcontainer').width());
        $('#sankeyviz svg').css('width', $('#vizcontainer').width());      
        //$('#networkdepartmentlegendtoggle').css('left', $('#networkbar').width()/2 + $('#networkdepartmentlegendtoggle').width()/2);  
      }   
      else if ($('#bubbleviz').is(':visible')){
        $('#bubbleviz').css('width', $('#vizcontainer').width());
        $('#bubbleviz svg').css('width', $('#vizcontainer').width());      
        //$('#networkdepartmentlegendtoggle').css('left', $('#networkbar').width()/2 + $('#networkdepartmentlegendtoggle').width()/2);  
      }        
    }
  });


  $( "#grantbeginyearrange" ).slider({
    range: true,
    //min: 0,  //TODO: populate dynamically
    //max: 0,  //TODO: populate dynamically
    animate: true,
    //values: [ 0, 0 ],
    slide: function( event, ui ) {
      beginLowerLimit = grantBeginYearArray[ ui.values[0] ];
      beginUpperLimit = grantBeginYearArray[ ui.values[1] ];
      endLowerLimit = grantEndYearArray[ $( "#grantendyearrange" ).slider("option", "values")[0] ];
      endUpperLimit = grantEndYearArray[ $( "#grantendyearrange" ).slider("option", "values")[1] ];
      deadlineLowerLimit = grantDeadlineYearArray[ $( "#grantdeadlineyearrange" ).slider("option", "values")[0] ];
      deadlineUpperLimit = grantDeadlineYearArray[ $( "#grantdeadlineyearrange" ).slider("option", "values")[1] ];
      $( "#grantbeginyear" ).val( beginLowerLimit + " - " + beginUpperLimit );

      filterBubblesByYear();
    }
  });

  $( "#grantendyearrange" ).slider({
    range: true,
    //min: 0,  //TODO: populate dynamically
    //max: 0,  //TODO: populate dynamically
    animate: true,
    //values: [ 0, 0 ],
    slide: function( event, ui ) {
      beginLowerLimit = grantBeginYearArray[ $( "#grantbeginyearrange" ).slider("option", "values")[0] ];
      beginUpperLimit = grantBeginYearArray[ $( "#grantbeginyearrange" ).slider("option", "values")[1] ];
      endLowerLimit = grantEndYearArray[ ui.values[0] ];
      endUpperLimit = grantEndYearArray[ ui.values[1] ];
      deadlineLowerLimit = grantDeadlineYearArray[ $( "#grantdeadlineyearrange" ).slider("option", "values")[0] ];
      deadlineUpperLimit = grantDeadlineYearArray[ $( "#grantdeadlineyearrange" ).slider("option", "values")[1] ];
      $( "#grantendyear" ).val( endLowerLimit + " - " + endUpperLimit );

      filterBubblesByYear();
    }
  });

  $( "#grantdeadlineyearrange" ).slider({
    range: true,
    //min: 0,  //TODO: populate dynamically
    //max: 0,  //TODO: populate dynamically
    animate: true,
    //values: [ 0, 0 ],
    slide: function( event, ui ) {
      beginLowerLimit = grantBeginYearArray[ $( "#grantbeginyearrange" ).slider("option", "values")[0] ];
      beginUpperLimit = grantBeginYearArray[ $( "#grantbeginyearrange" ).slider("option", "values")[1] ];
      endLowerLimit = grantEndYearArray[ $( "#grantendyearrange" ).slider("option", "values")[0] ];
      endUpperLimit = grantEndYearArray[ $( "#grantendyearrange" ).slider("option", "values")[1] ];
      deadlineLowerLimit = grantDeadlineYearArray[ ui.values[0] ];
      deadlineUpperLimit = grantDeadlineYearArray[ ui.values[1] ];
      $( "#grantdeadlineyear" ).val( deadlineLowerLimit + " - " + deadlineUpperLimit );

      filterBubblesByYear();
    }
  });

  function filterBubblesByYear() {
    d3.selectAll("circle.bubble").each(function(d) {
      var beginYear = parseInt(d.BeginDate.substring(0, 4));
      var endYear = parseInt(d.EndDate.substring(0, 4));
      var deadline = parseInt(d.Deadline.substring(0, 4));
      var match = false;

      if(deadlineLowerLimit <= deadline && deadline <= deadlineUpperLimit) {
        //Only accepted and closed grants have the begin and end years.
        if(d.AwardStatus != "") {
          if(beginLowerLimit <= beginYear && beginYear <= beginUpperLimit && endLowerLimit <= endYear && endYear <= endUpperLimit)
            match = true;
          else
            match = false;
        } else {
          match = true;
        }
      } else {
        match = false;
      }

      if(match) {
        d3.select(this).style("visibility", "visible");
        d3.select(this).transition().duration(800).style("opacity", 1);
      } else {
        d3.select(this).transition().duration(800).style("opacity", 0);
        d3.select(this).transition().delay(800).style("visibility", "hidden");
      }
    });
  }

  function initBubbleFilter(all_grants) {
    buildYearRangeArray(all_grants);
    $( "#grantbeginyearrange" ).slider("option", "min", 0);
    $( "#grantbeginyearrange" ).slider("option", "max", grantBeginYearArray.length - 1);
    $( "#grantbeginyearrange" ).slider("option", "values", [0, grantBeginYearArray.length - 1]);
    $( "#grantbeginyear" ).val( grantBeginYearArray[$( "#grantbeginyearrange" ).slider( "values", 0 )] +
      " - " + grantBeginYearArray[$( "#grantbeginyearrange" ).slider( "values", 1 )] );
    beginLowerLimit = grantBeginYearArray[$( "#grantbeginyearrange" ).slider( "values", 0 )];
    beginUpperLimit = grantBeginYearArray[$( "#grantbeginyearrange" ).slider( "values", 1 )];

    $( "#grantendyearrange" ).slider("option", "min", 0);
    $( "#grantendyearrange" ).slider("option", "max", grantEndYearArray.length - 1);
    $( "#grantendyearrange" ).slider("option", "values", [0, grantEndYearArray.length - 1]);
    $( "#grantendyear" ).val( grantEndYearArray[$( "#grantendyearrange" ).slider( "values", 0 )] +
      " - " + grantEndYearArray[$( "#grantendyearrange" ).slider( "values", 1 )] );
    endLowerLimit = grantEndYearArray[$( "#grantendyearrange" ).slider( "values", 0 )];
    endUpperLimit = grantEndYearArray[$( "#grantendyearrange" ).slider( "values", 1 )];

    $( "#grantdeadlineyearrange" ).slider("option", "min", 0);
    $( "#grantdeadlineyearrange" ).slider("option", "max", grantDeadlineYearArray.length - 1);
    $( "#grantdeadlineyearrange" ).slider("option", "values", [0, grantDeadlineYearArray.length - 1]);
    $( "#grantdeadlineyear" ).val( grantDeadlineYearArray[$( "#grantdeadlineyearrange" ).slider( "values", 0 )] +
      " - " + grantDeadlineYearArray[$( "#grantdeadlineyearrange" ).slider( "values", 1 )] );
    deadlineLowerLimit = grantDeadlineYearArray[$( "#grantdeadlineyearrange" ).slider( "values", 0 )];
    deadlineUpperLimit = grantDeadlineYearArray[$( "#grantdeadlineyearrange" ).slider( "values", 1 )];
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

  $("#treemapanimateyearbar").slider({
    animate: true,
    slide: function(event, ui) {
      $("#treemapanimateyear").val(ui.value);
      animating = true;
      currentYear = ui.value;
      refreshTreemap();
      animating = false;
    }
  });

  $("#treemapanimatespeedbar").slider({
    //Min value must be larger than transitionDuration, or the animation will be crashed.
    //And setting to this has the same effect with setting callback.
    min: transitionDuration / 1000 + 1,
    max: 60,
    value: transitionDuration / 1000 + 1,
    animate: true,
    slide: function(event, ui) {
      $("#treemapanimatespeed").val(ui.value);
    }
  });

  $("#treemapanimatespeed").val(transitionDuration / 1000 + 1);

  function initTreemapFilter(all_grants) {
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

    //for animate bar
    $("#treemapanimateyearbar").slider("option", "min", grantBeginYearArray[0]);
    $("#treemapanimateyearbar").slider("option", "max", grantEndYearArray[grantEndYearArray.length-1]);
    $("#treemapanimateyearbar").slider("option", "value", grantBeginYearArray[0]);
    $("#treemapanimateyear").val(grantBeginYearArray[0]);
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

  $("#treemapdepartmentfragslider").slider({
    value: 0,
    min: 0,
    max: 1,
    step: 1,
    slide: function(event, ui) {
      $("#treemapfrag").val(departmentFragmentationName[ui.value]);
      if(ui.value == 0) {
        treemapsvg.selectAll("g.cell.parent rect")
          .transition()
          .duration(transitionDuration)
          .attr("width", 0)
          .attr("height", 0)
          .style("opacity", 0);
        treemapsvg.selectAll("g.cell.child")
          .style("visibility", "visible");
        treemapsvg.selectAll("g.cell.child")
          .transition()
          .duration(transitionDuration)
          .style("opacity", 1);
      } else if(ui.value == 1) {
        if(node != root) { //zoom in
          var kx = width / node.dx;
          var ky = height / Math.max(node.dy, headerHeight + 1);
        }
        treemapsvg.selectAll("g.cell.parent rect")
          .transition()
          .duration(transitionDuration)
          .attr("width", function(d) { return Math.max(0.01, (node == root ? d.dx : kx * d.dx) - 1); })
          .attr("height", function(d) { return Math.max(0.01, (node == root ? d.dy : ky * d.dy) - 1); })
          .style("fill", function(d) { return colorTreemap(d.name); })
          .style("opacity", 1);
        treemapsvg.selectAll("g.cell.child")
          .transition()
          .duration(transitionDuration)
          .style("opacity", 0);
        treemapsvg.selectAll("g.cell.child")
          .transition()
          .delay(transitionDuration)
          .style("visibility", "hidden");
      }
    }
  });

  $('#treemapsponsorfragslider').slider({
    value: 0,
    min: 0,
    max: 2,
    step: 1,
    slide: function(event, ui) {
      $("#treemapfrag").val(sponsorFragmentationName[ui.value]);
      if(ui.value == 0) {
        treemapsvg.selectAll("g.cell.parent rect")
          .transition()
          .duration(transitionDuration)
          .attr("width", 0)
          .attr("height", 0)
          .style("opacity", 0);
        treemapsvg.selectAll("g.cell.child")
          .style("visibility", "visible");
        treemapsvg.selectAll("g.cell.child")
          .transition()
          .duration(transitionDuration)
          .style("opacity", 1);

        treemapsvg.selectAll("g.cell.labelbar.labelbar2")
          .style("visibility", "visible");
        treemapsvg.selectAll("g.cell.labelbar.labelbar2")
          .transition()
          .duration(transitionDuration)
          .style("opacity", 1);
      } else if(ui.value == 1) { //program
        if(node != root) { //zoom in
          var kx = width / node.dx;
          var ky = height / Math.max(node.dy, headerHeight + 1);
        }

        treemapsvg.selectAll("g.cell.parent.parent2 rect")
          .transition()
          .duration(transitionDuration)
          .attr("width", function(d) { return Math.max(0.01, (node == root ? d.dx : kx * d.dx) - 1); })
          .attr("height", function(d) { return Math.max(0.01, (node == root ? d.dy : ky * d.dy) - 1); })
          .style("fill", function(d) { return colorTreemap(d.name); })
          .style("opacity", 1);

        treemapsvg.selectAll("g.cell.parent")
          .filter(function(d) {
            return d3.select(this).attr("class") != "cell parent parent2";
          })
          .select("rect")
          .transition()
          .duration(transitionDuration)
          .attr("width", 0)
          .attr("height", 0)
          .style("opacity", 0);

        treemapsvg.selectAll("g.cell.child")
          .transition()
          .duration(transitionDuration)
          .style("opacity", 0);
        treemapsvg.selectAll("g.cell.child")
          .transition()
          .delay(transitionDuration)
          .style("visibility", "hidden");

        treemapsvg.selectAll("g.cell.labelbar.labelbar2")
          .style("visibility", "visible");
        treemapsvg.selectAll("g.cell.labelbar.labelbar2")
          .transition()
          .duration(transitionDuration)
          .style("opacity", 1);
      } else if(ui.value == 2) { //sponsor
        if(node != root) { //zoom in
          var d;
          if(node.depth == 1)
            d = node;
          else // == 2
            d = node.parent;
          var kx = width / d.dx;
          var ky = height / Math.max(d.dy, headerHeight + 1);
        }

        treemapsvg.selectAll("g.cell.parent")
          .filter(function(d) {
            return d3.select(this).attr("class") != "cell parent parent2";
          })
          .select("rect")
          .transition()
          .duration(transitionDuration)
          .attr("width", function(d) { return Math.max(0.01, (node == root ? d.dx : kx * d.dx) - 1); })
          .attr("height", function(d) { return Math.max(0.01, (node == root ? d.dy : ky * d.dy) - 1); })
          .style("fill", function(d) {
            if(_.contains(top20, d.name))
              return colorTreemap(d.name);
            else
              return "#f9f9f9";
          })
          .style("opacity", 1);

        treemapsvg.selectAll("g.cell.parent.parent2 rect")
          .transition()
          .duration(transitionDuration)
          .attr("width", 0)
          .attr("height", 0)
          .style("opacity", 0);

        treemapsvg.selectAll("g.cell.child")
          .transition()
          .duration(transitionDuration)
          .style("opacity", 0);
        treemapsvg.selectAll("g.cell.child")
          .transition()
          .delay(transitionDuration)
          .style("visibility", "hidden");

        treemapsvg.selectAll("g.cell.labelbar.labelbar2")
          .transition()
          .duration(transitionDuration)
          .style("opacity", 0);
        treemapsvg.selectAll("g.cell.labelbar.labelbar2")
          .transition()
          .delay(transitionDuration)
          .style("visibility", "hidden");
      }
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

  function filterBubblesByStatus() {

    if(!$('input#filterAccepted').is(':checked') && !$('input#filterClosed').is(':checked')) {
      $('#bubbleFilterTips').show('blind', 1500);
      $('#bubbleSliderAcceptedType').hide('blind', 1500);
    } else {
      $('#bubbleFilterTips').hide('blind', 1500);
      $('#bubbleSliderAcceptedType').show('blind', 1500);
    }
      

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
          updateSelectionArea();  
        }
      })
      .each(function() {
        this.selectedIndividually = false;
      })

    bubble.exit().remove(); //remove existing bubbles

    bubble_force.start();

    filterBubblesByYear();
  }//end filterBubblesByStatus

  $('input#filterAccepted').on('ifChecked', filterBubblesByStatus);
  $('input#filterAccepted').on('ifUnchecked', filterBubblesByStatus);
  $('input#filterClosed').on('ifChecked', filterBubblesByStatus);
  $('input#filterClosed').on('ifUnchecked', filterBubblesByStatus);
  $('input#filterDeclined').on('ifChecked', filterBubblesByStatus);
  $('input#filterDeclined').on('ifUnchecked', filterBubblesByStatus);
  $('input#filterOthers').on('ifChecked', filterBubblesByStatus);
  $('input#filterOthers').on('ifUnchecked', filterBubblesByStatus);

  $('#arrangebubble').chosen().change(function() {
    bubblesvg.selectAll("g.boundary.department").remove();
    bubblesvg.selectAll("g.boundary.grantvalue").remove();
    border_coords_sampled = true;
//    if(this.value == "random") {
      bubble_force.start();
//    }
    if($('#fragmentationbubble').val() == "department" && this.value != "random") {
      // bubblesvg.selectAll("g.boundary.department").remove();
      // bubblesvg.selectAll("g.boundary.grantvalue").remove();
      
      var timer = setInterval(function() {
        if(bubble_force.alpha() < 0.03) {
          clearInterval(timer);
          border_coords_sampled = false;
          tick();
          arrangementBoundaries($('#arrangebubble').val());
        }
      }, 200);
      //border_coords_sampled = false;
      // tick();
      // arrangementBoundaries($('#arrangebubble').val());
    }
    // if(this.value == "department") {
    //   border_coords_sampled = true;
    //   bubble_force.start();
    //   setTimeout(function() {
    //     border_coords_sampled = false;
    //     tick();
    //     arrangementBoundaries("department");
    //   }, sampletime);
    // }
    // if(this.value == "grantvalue") {
    //   border_coords_sampled = true;
    //   bubble_force.start();
    //   setTimeout(function() {
    //     border_coords_sampled = false;
    //     tick();
    //     arrangementBoundaries("grantvalue");
    //   }, sampletime);
    // }
  });

  $('#fragmentationbubble').chosen().change(function() {
    bubblesvg.selectAll("g.boundary.department").remove();
    bubblesvg.selectAll("g.boundary.grantvalue").remove();
    border_coords_sampled = true;
    bubble_force.start();
    if(this.value == "department" && $('#arrangebubble').val() != "random"){
      var timer = setInterval(function() {
        if(bubble_force.alpha() < 0.03) {
          clearInterval(timer);
          border_coords_sampled = false;
          tick();
          arrangementBoundaries($('#arrangebubble').val());
        }
      }, 200);

      /*
      if($('#arrangebubble').val() == "department") {
        // border_coords_sampled = true;
        // //bubble_force.start();
        // setTimeout(function() {
        //   border_coords_sampled = false;
        //   tick();
        //   arrangementBoundaries("department");
        // }, sampletime);
        border_coords_sampled = true;
        console.log(bubble_force.alpha());
        while(bubble_force.alpha() > 0.05)
          console.log(bubble_force.alpha());
        border_coords_sampled = false;
        tick();
        arrangementBoundaries("department");
      }

      if($('#arrangebubble').val() == "grantvalue") {
        // border_coords_sampled = true;
        // //bubble_force.start();
        // setTimeout(function() {
        //   border_coords_sampled = false;
        //   tick();
        //   arrangementBoundaries("grantvalue");
        // }, sampletime);
        border_coords_sampled = true;
        console.log(bubble_force.alpha());
        while(bubble_force.alpha() > 0.05)
          console.log(bubble_force.alpha());
        border_coords_sampled = false;
        tick();
        arrangementBoundaries("grantvalue");
      }*/
    }
  });

  $('input#selectLasso').on('ifChecked', function() {
    brush = d3.svg.polybrush()
      .x(d3.scale.linear().range([0, svgwidth]))
      .y(d3.scale.linear().range([0, svgheight]))
      .on("brushstart", function() {
        bubblesvg.selectAll(".selected").classed("selected", false);
      })
      .on("brush", function() {
        //update the div that lists the current selections
        updateSelectionArea();
        // iterate through all circle.bubble
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
            //if the current bubble was not selected with the individual selector (i.e., it was selected with the lasso)
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

    //if the user turns off the select action
    $('input#selectNone').on('ifChecked', function() {
      var noneSelected = true;
      // iterate through all circle.bubble
        bubblesvg.selectAll("circle.bubble").each(function(d) {
          // if the circle in the current iteration is within the brush's selected area
          if (this.style.strokeWidth == "4px") {
            noneSelected = false;
        }
         });

        //if no bubbles are selected
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

  //for animate start and pause
  $('#treemapAnimateTime').click(function() {
    if($('#treemapAnimateTime').text() == "start") {
      $('#treemapAnimateTime').text("stop");
      currentYear = $('#treemapanimateyearbar').slider("option", "value");
      var endYear = grantEndYearArray[grantEndYearArray.length-1];
      var interval = $('#treemapanimatespeedbar').slider("option", "value") * 1000;
      animating = true;

      //first time
      refreshTreemap();
      currentYear++;

      int1 = setInterval(function() {
        if(currentYear > endYear) {
          clearInterval(int1);
          animating = false;
          $('#treemapAnimateTime').text("start");
          return ;
        }
        //console.log("waiting...");
        //wait for the transition
        setTimeout(function() {
          //console.log("refreshing..");
          refreshTreemap();
          $("#treemapanimateyearbar").slider("option", "value", currentYear);
          $("#treemapanimateyear").val(currentYear);
          currentYear++;
          //console.log("done!");
        }, transitionDuration);

      }, interval);
    } else {
      clearInterval(int1);
      animating = false;
      //console.log("stopped");
      $('#treemapAnimateTime').text("start");
    }
  });

  $('#treemapAnimateReset').click(function() {
    if(animating) {
      clearInterval(int1);
      animating = false;
    }
    //console.log("reset");
    refreshTreemap();
    $("#treemapanimateyearbar").slider("option", "value", grantBeginYearArray[0]);
    $("#treemapanimateyear").val(grantBeginYearArray[0]);
  });

  //if the user clicks the button to remove all selections
  $('#selectionRemove').click(function() {
    $('#selectionNone').iCheck('check');
    selectedBubbles = []; //empty the array
    updateSelectionArea("empty"); //update the selection area by emptying it
    //cloningSvg.selectAll('*').remove();
    //hide the selectionArea div
    $('#selectionArea').hide('slow');
    $('#bubbleselectactions').slideUp();
    $('#cloningArea').hide('slow');
    //return to the defaul for the radios (i.e., check the 'none' option)
    $('input#selectNone').iCheck('check');
    //reset the style of the bubbles
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
  }); //end of selectionClone click

  $('#itemsChooseNone').click(function() {
    d3.select("#selectionList").selectAll(".item")
      .classed("chosen", false)
      .transition().duration(400).style("background-color", "white")
      .style("color", function(d) { return color20(d.Sponsor); } );
/*
    $('#itemsAll').show();
    $('#itemsClear').hide();
    $('#itemsBarchart').hide();
    $('#itemsLinechart').hide();

*/
    $('#itemsChooseNone').css("background", "grey").css("color", "rgb(162,162,162").css("cursor", "default");
    $('#itemsChooseAll').css("background", "rgb(36,137,197)").css("color", "white").css("cursor", "pointer");

    $('#itemsBarchart').parent().hide('fast');
  });

  $('#itemsChooseAll').click(function() {
    d3.select("#selectionList").selectAll(".item")
      .classed("chosen", true)
      .transition().duration(400).style("background-color", "rgb(36, 137, 197)")
      .style("color", "white" );

    $('#itemsChooseAll').css("background", "grey").css("color", "rgb(162,162,162").css("cursor", "default");
    $('#itemsChooseNone').css("background", "rgb(36,137,197)").css("color", "white").css("cursor", "pointer");

    $('#itemsBarchart').parent().show('fast');
  }); 

  $('#itemsBarchart').click(function() {

    $('#barComparingArea svg').remove();
    $('#xvaluechoice').parent().hide();
    $('#barComparingArea').show(0, function(){
      $.colorbox({inline:true, href:"#barComparingArea", width:1060, height:580, opacity:0.7, scrolling:true, open:true, overlayClose:false, closeButton:false, fadeOut:300, 
        onCleanup:function() {
          $('#barComparingArea svg').remove();
          $('#individualbar').iCheck('check');
          $('#barComparingArea').hide(0);
        },
        onComplete:function() {
          drawIndividualBarchart();
        }
      });
    });

  });

  function processSelectedData() {
    var selectedData = [];
    var chosenItems = d3.select('#selectionList').selectAll('.item.chosen')
      .each(function(d) {
        var req = d.RequestAmt;
        req = req.replace(/^\s+|\s+$/g, ''); //remove whitespaces
        req = req.replace(/\$/g,""); //remove dollar sign
        req = req.replace(/,/g,""); //remove commas
        req = parseFloat(req); //convert from string to float 
        selectedData.push({
          index: d.index,
          title: d.Title,
          department: $.isArray(d.Department) ? d.Department[0] : d.Department,
          sponsor: d.Sponsor,
          program: d.PgmName,
          requestamt: req,
          awardstat: d.AwardStatus,
          begin: parseInt(d.BeginDate.substring(0, 4)),
          end: parseInt(d.EndDate.substring(0, 4))
        });
      });
    return selectedData;
  }//end processSelectedData

  function drawIndividualBarchart() {

    var selectedData = processSelectedData();
    var individualData = selectedData.map(function(d, i) {
      return {label: d.title,
        value: d.requestamt,
        color: color20(d.sponsor),
        index: i,
        department: d.department,
        sponsor: d.sponsor,
        program: d.program
      };
    });
    individualData = [{key: "Individuals", values: individualData}];

    //draw graph
    var margin = {top: 40, right: 10, bottom: 40, left: 10},
    width = 960 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

    nv.addGraph(function() {
      
      var chart = nv.models.discreteBarChart()
        .x(function(d) { return d.label })
        .y(function(d) { return d.value });
        //.staggerLabels(true)
        //.tooltips(false)
        //.showValues(true);

        chart.showXAxis(false);
        chart.yAxis
          .axisLabel("Amounts")
          .tickFormat(d3.format(',d'));

        chart.tooltipContent(function(key, x, y, e, graph) {
          return '<p><b>' + x + '</b></p>' +
               '<p><b>Value: </b>' + y + '</p>' + 
               '<p><b>Sponsor: </b>' + e.point.sponsor + '</p>' + 
               '<p><b>Department: </b>' + e.point.department + '</p>' + 
               '<p><b>Program: </b>' + e.point.program + '</p>';
        })

        d3.select("#barComparingArea").append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
          .style("width", width + margin.left + margin.right)
          .style("height", height + margin.top + margin.bottom)
          .datum(individualData)
          .transition().duration(500).call(chart);/*.call(function() {
            d3.select("#barComparingArea svg")
              .selectAll('g.nv-x.nv-axis text')
              .filter(function(d) { return $(this).prev().is('line'); })
              .attr("fill", function(d, i) { return color20(selectedData[i].sponsor); })
              .attr("transform", "translate(0,10),rotate(10)")
              .text(function(d) {
                var shortstr = d.split(" ");
                shortstr = shortstr.length > 1 ? shortstr[0] + " " + shortstr[1] : shortstr[0];
                shortstr += "...";
                return shortstr;
              })
              .style("opacity", function(d, i) { return i % parseInt(selectedData.length / 20 + 1) ? 0 : 1; });
          });*/

        nv.utils.windowResize(chart.update);

        return chart;
    });
  }//end drawIndividualBarchart

  function drawGroupBarchart(xValue, yValue) {
    
    var selectedData = processSelectedData();
    var xGroupedData = _.groupBy(selectedData, function(d) { return eval("d." + xValue); });
    var groupData = [];// = _.uniq(_.keys(xGroupedData)).map(function(d) { return {x: d, y: 0}; });
    if(yValue == "number") {
      var count = 0;
      _.each(xGroupedData, function(value, key) {
        groupData.push({label: key, value: value.length, color: color20(key), index: count++});
      });
    } else if(yValue == "amount") {
      var count = 0;
      _.each(xGroupedData, function(value, key) {
        var sum = 0;
        for(var i = 0; i < value.length; i++)
          sum += value[i].requestamt;
        groupData.push({label: key, value: sum, color: color20(key), index: count++});
      });
    }
    groupData = [{key: "GroupBy" + xValue, values: groupData}];

    //draw graph
    var margin = {top: 40, right: 10, bottom: 40, left: 10},
      width = 960 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom;

    nv.addGraph(function() {
      var chart = nv.models.discreteBarChart()
        .x(function(d) { return d.label })
        .y(function(d) { return d.value });

        if(xValue == "department") {
          chart.xAxis
            .axisLabel(xValue)
            .rotateLabels(30);
        } else {
          chart.showXAxis(false);
        }

        chart.xAxis
          .axisLabel(xValue);
        chart.yAxis
          .axisLabel(yValue)
          .tickFormat(d3.format(',d'));

        d3.select("#barComparingArea").append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
          .style("width", width + margin.left + margin.right)
          .style("height", height + margin.top + margin.bottom)
          .datum(groupData)
          .transition().duration(500).call(chart);

        nv.utils.windowResize(chart.update);

        return chart;
    });
  }//end dragGroupBarhart

  function sortBars(flag) {
    var data = $('#barComparingArea svg')[0].__data__;
    var chart = _.last(nv.graphs);
    if(flag)
      data[0].values = data[0].values.sort(function(a, b) { return b.value - a.value; });
    else
      data[0].values = data[0].values.sort(function(a, b) { return a.index - b.index; });
    d3.select("#barComparingArea svg").datum(data);
    chart.update();
    d3.select('#barComparingArea svg g.nv-y.nv-axis path').style("stroke", "white");
  }//end sortBars

  $('#individualbar').on('ifChecked', function() {
    $('#xvaluechoice').parent().slideUp();
    $('#xvaluechoice').val("sponsor").trigger("liszt:updated");
    $('#yvaluechoice').val("number").trigger("liszt:updated");
    $('#sortBars').text("SORT");
    $('#barComparingArea svg').remove();
    drawIndividualBarchart();
  });

  $('#groupbar').on('ifChecked', function() {
    $('#xvaluechoice').parent().slideDown();
    $('#sortBars').text("SORT");
    $('#barComparingArea svg').remove();
    drawGroupBarchart("sponsor", "number");
  });

  $('#xvaluechoice').chosen().change(function() {
    $('#sortBars').text("SORT");
    $('#barComparingArea svg').remove();
    drawGroupBarchart(this.value, $('#yvaluechoice').val());
  });

  $('#yvaluechoice').chosen().change(function() {
    $('#sortBars').text("SORT");
    $('#barComparingArea svg').remove();
    drawGroupBarchart($('#xvaluechoice').val(), this.value);
  });

  $('#sortBars').click(function() {
    if(this.innerText == "SORT") {
      sortBars(true);
      this.innerText = "RANDOM";
    } else {
      sortBars(false);
      this.innerText = "SORT";
    }
  });

  $('#itemsLinechart').click(function() {
    $('#lineComparingArea svg').remove();
    $('#lineComparingArea').show(0, function(){
      $.colorbox({inline:true, href:"#lineComparingArea", width:1180, height:780, opacity:0.7, scrolling:true, open:true, overlayClose:false, closeButton:false, fadeOut:300, 
        onCleanup:function() {
          $('#lineComparingArea svg').remove();
          $('#streamchoiceLine').val("sponsor").trigger("liszt:updated");
          $('#yvaluechoiceLine').val("number").trigger("liszt:updated");
          $('#lineComparingArea').hide(0);
        },
        onComplete:function() {
          $('#backComparing').parent().hide(0);
          $('#legendDiv').parent().show(); //important because colorbox will initially set this div not to display
          drawLinechart("sponsor", "number");
        }
      });
    });

    $('.linehintdrill').hide(0);
    if (!programview){//show the hint if we're not in the program view (i.e., we're in the sponsor view)
      $('.linehintdrill').show('blind', 500);
    } 

      //set the mouseover behavior for the hint
    $('.linehintdrill').mouseover(function() {
        $(this).css("opacity", 0.2);
        $(this).css("cursor", "pointer");
        $(this).css("font-size", "1em");
        $(this).css("font-weight", 200);
        $(this).text("dismiss");
      }).mouseout(function() {
        $(this).css("opacity", 1);
        $(this).css("cursor", "auto");
        $(this).text("hint: click on a sponsor line to drill into it");
        $(this).css("font-size", "1em");
        $(this).css("font-weight", 200);
      }); 
  });

  function drawLinechart(streamValue, yValue) {
    var selectedData = processSelectedData();
    var filteredData = _.filter(selectedData, function(d) {
      return d.awardstat != "";
    });
    var groupedData = _.groupBy(filteredData, function(d) {
      return eval("d." + streamValue);
    });

    var min = 9999, max = 0;
    filteredData.forEach(function(d) {
      min = d.begin < min ? d.begin : min;
      max = d.end > max ? d.end : max;
    });

    var lineData = [];
    _.each(groupedData, function(value, key) {
      var yearData = d3.range(min, max + 1).map(function(d) { return {x: d, y: 0}; });
      value.forEach(function(d, i) {
        for(var i = 0; i < yearData.length; i++) {
          if(d.begin == yearData[i].x) {
            for(var j = i; j < yearData.length && yearData[j].x <= d.end; j++) {
              if(yValue == "number")
                yearData[j].y++;
              else
                yearData[j].y += d.requestamt;
            }
            break;
          }
        }
      });
      lineData.push({key: key, values: yearData, color: color20(key)});
    });

    //sort by alphabet
    lineData.sort(function(a, b) { return a.key < b.key ? -1 : 1; });

    //for legend autocomplete
    $('#legendSearch').autocomplete({
      source: lineData.map(function(obj) { return obj.key; }),
      delay: 500,
      minLength: 2,
      select: function (event, ui) {
        var name = ui.item.value;
        d3.selectAll('#legendDiv g.nv-series')
          .style("opacity", function(d) {
            if(d.key == name)
              return 1;
            else
              return 0.2;
          });
        d3.select('#lineChartSvg g.nv-focus g.nvd3.nv-wrap.nv-line g.nv-groups').selectAll("path")
          .style("stroke-width", function(d) {
            if(this.parentNode.__data__.key == name)
              return 3;
            else
              return 1.5;
          });
      }
    });

    $('#legendSearch').change(function() {
      if($(this).val() == "") {
        d3.selectAll('#legendDiv g.nv-series').style("opacity", 1);
        d3.select('#lineChartSvg g.nv-focus g.nvd3.nv-wrap.nv-line g.nv-groups').selectAll("path").style("stroke-width", 1.5);
      }
    })

    //draw graph
    var margin = {top: 40, right: 10, bottom: 40, left: 10},
      width = 1080 - margin.left - margin.right,
      height = 600 - margin.top - margin.bottom;

    nv.addGraph(function() {
      var chart = nv.models.lineWithFocusChart();

      function updateChartCutomized() {
        if(streamValue == "sponsor") {
          //do after the chart is built
          setTimeout(function(){
            d3.select('#lineChartSvg g.nv-focus g.nvd3.nv-wrap.nv-line g.nv-groups').selectAll("path")
              .on("mouseover", function() {
                d3.select(this).style("stroke-width", "3px");
              })
              .on("mouseout", function() {
                d3.select(this).style("stroke-width", "1.5px");
              })
              .on("click", function() {
                var sponsor = this.parentNode.__data__.key;
                $('#streamchoiceLine').parent().slideUp();
                $('#foldLegend').slideUp();
                $('#legendDiv').parent().hide();
                $('#foldLegend').text("show legend");
                $('#backComparing').parent().slideDown();
                $('#lineChartSvg').slideUp(400, function() {
                  drawSponsorDetail(sponsor);
                });
                $('.linehintdrill').hide('blind', 500);
                programview=1;
              });


            d3.select('#lineChartSvg g.nv-focus g.nvd3.nv-wrap.nv-line g.nv-scatterWrap g.nv-point-paths').selectAll("path")
              // .on("mouseover", function() {
              //   d3.select('#lineChartSvg g.nv-focus g.nvd3.nv-wrap.nv-line g.nv-groups g.nv-series-' + this.__data__.series + ' path').style("stroke-width", "3px");
              // })
              // .on("mouseout", function() {
              //   d3.select('#lineChartSvg g.nv-focus g.nvd3.nv-wrap.nv-line g.nv-groups g.nv-series-' + this.__data__.series + ' path').style("stroke-width", "1.5px");
              // })
              .on("click", function() {
                var sponsor = $('#lineChartSvg')[0].__data__[this.__data__.series].key;
                $('#streamchoiceLine').parent().slideUp();
                $('#foldLegend').slideUp();
                $('#legendDiv').parent().hide();
                $('#foldLegend').text("show legend");
                $('#backComparing').parent().slideDown();
                $('#lineChartSvg').slideUp(400, function() {
                  drawSponsorDetail(sponsor);
                });
                $('.linehintdrill').hide('blind', 500);
                programview=1; 
              });
          }, 500);
        }
        
        //rewrite the stateChange event listener
        chart.legend.dispatch.on('stateChange', function(newState) { 
          chart.update();
          //legend style
          d3.selectAll('#legendDiv g.nv-series').classed('disabled', function(d) { return d.disabled });
          //lines click listener
          updateChartCutomized();
        });

        drawGuideLines(chart, d3.select('#lineChartSvg'));
      }//end updateChartCustomized

      chart.xAxis
        .axisLabel('Year')
        .tickFormat(d3.format('d'));
      chart.x2Axis.tickFormat(d3.format('d'));
      chart.yAxis
        .axisLabel(yValue)
        .tickFormat(d3.format(',d'));
      chart.y2Axis.tickFormat(d3.format(',d'));

      chart.showLegend(false);

      d3.select('#lineComparingArea').append("svg").attr("id", "lineChartSvg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        //the NVD3 uses style width and height to decide the children width and height
        .style("width", width + margin.left + margin.right)
        .style("height", height + margin.top + margin.bottom)
        .datum(lineData)
        .transition().duration(500).call(chart)
        .call(function() {
          updateChartCutomized();

          //build folded legend
          chart.legend.width(width);

          d3.select('#legendDiv').append('svg').append('g')
            .datum(lineData)
            .call(chart.legend);

          nv.dispatch.on("render_end", function() {
            $('#legendDiv').parent().hide();
            $('#legendSearch').parent().show();
            d3.select('#legendDiv svg').attr("height", chart.legend.height());
          });
            
        });

      nv.utils.windowResize(chart.update);

      return chart;
    });
  } //end drawLinechart

  function drawGuideLines(chart, container) {
    //add elementMouseover/out listener to show guidelines
    chart.lines.dispatch.on('elementMouseover.guideline', function(e) {
      var guidelineSvg = container.select('g.nv-linesWrap').append('g')
        .attr("class", "guideline");
      var horizotalLine = {x1: 0, y1: 0, x2: 0, y2: 0};
      var verticalLine = {x1: 0, y1: 0, x2: 0, y2: 0};
      horizotalLine.x1 = 0, horizotalLine.x2 = e.pos[0] - chart.margin().left;
      horizotalLine.y1 = horizotalLine.y2 = e.pos[1] - chart.margin().top;
      verticalLine.y1 = e.pos[1] - chart.margin().top;
      verticalLine.y2 = (parseInt(container.style('height')) || parseInt(container.attr('height')) || 400)
        - chart.margin().top - chart.margin().bottom - 100;
      verticalLine.x1 = verticalLine.x2 = e.pos[0] - chart.margin().left;

      guidelineSvg.append('line')
        .attr('x1', horizotalLine.x1)
        .attr('x2', horizotalLine.x2)
        .attr('y1', horizotalLine.y1)
        .attr('y2', horizotalLine.y2);
      guidelineSvg.append('line')
        .attr('x1', verticalLine.x1)
        .attr('x2', verticalLine.x2)
        .attr('y1', verticalLine.y1)
        .attr('y2', verticalLine.y2);
    });
    
    chart.lines.dispatch.on('elementMouseout.guideline', function(e) {
      container.select('g.nv-linesWrap g.guideline').remove();
    });
  }

  $('#foldLegend').click(function() {
    if($('#legendDiv').parent().css('display') == "none") {
      $('#legendDiv').parent().show(1000);
      $('#foldLegend').text("hide legend");
    } else {
      $('#legendDiv').parent().hide(1000);
      $('#foldLegend').text("show legend");
    }
  });

  $('#streamchoiceLine').chosen().change(function() {

    //hide the hint if the user chooses department
    if (this.value == "department")
      $('.linehintdrill').hide('blind', 500);

    $('#lineComparingArea svg').remove();
    drawLinechart(this.value, $('#yvaluechoiceLine').val());
  });

  $('#yvaluechoiceLine').chosen().change(function() {
    $('#lineComparingArea svg').remove();
    drawLinechart($('#streamchoiceLine').val(), this.value);
  });

  function drawSponsorDetail(sponsor) {
    $('#lineComparingArea h2').text("Programs under sponsor: " + sponsor);
    var selectedData = processSelectedData();
    var filteredData = _.filter(selectedData, function(d) {
      return d.awardstat != "" && d.sponsor == sponsor;
    });
    var groupedData = _.groupBy(filteredData, function(d) {
      return d.program;
    });

    var min = 9999, max = 0;
    filteredData.forEach(function(d) {
      min = d.begin < min ? d.begin : min;
      max = d.end > max ? d.end : max;
    });

    var detailData = [];
    _.each(groupedData, function(value, key) {
      var yearData = d3.range(min, max + 1).map(function(d) { return {x: d, y: 0}; });
      value.forEach(function(d, i) {
        for(var i = 0; i < yearData.length; i++) {
          if(d.begin == yearData[i].x) {
            for(var j = i; j < yearData.length && yearData[j].x <= d.end; j++)
                yearData[j].y++;
            break;
          }
        }
      });
      detailData.push({key: key, values: yearData, color: color20(key)});
    });

    //draw graph
    var margin = {top: 40, right: 10, bottom: 40, left: 10},
      width = 1080 - margin.left - margin.right,
      height = 600 - margin.top - margin.bottom;

    nv.addGraph(function() {
      var chart = nv.models.lineWithFocusChart();

      chart.xAxis
        .axisLabel('Year')
        .tickFormat(d3.format('d'));
      chart.x2Axis.tickFormat(d3.format('d'));
      chart.yAxis
        .axisLabel('Number')
        .tickFormat(d3.format('d'));
      chart.y2Axis.tickFormat(d3.format('d'));

      //chart.showLegend(false);

      d3.select('#lineComparingArea').append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        //the NVD3 uses style width and height to decide the children width and height
        .style("width", width + margin.left + margin.right)
        .style("height", height + margin.top + margin.bottom)
        .datum(detailData)
        .transition().duration(500).call(chart);

      drawGuideLines(chart, d3.select($('#lineComparingArea svg:last')[0]));

      nv.utils.windowResize(chart.update);

      return chart;
    });
  }

  $('#backComparing').click(function() {
    $('#streamchoiceLine').parent().slideDown();
    $('#foldLegend').slideDown();
    $(this).parent().slideUp();
    $('#lineComparingArea svg:last').slideUp(400, function() {
      this.remove();
    });
    $('#lineComparingArea h2:eq(0)').text("");
    setTimeout(function() {
      $('#lineChartSvg').show();
    }, 400);
    programview=0;
    console.log("show");
  });

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

    if($('#arrangetreemap').val() == "sponsor") {
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

    if(node !== root)
      zoom(node);
  }//end refreshTreemap

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
    if(d.AwardStatus == "Accepted" || d.AwardStatus == "Closed") {
      var beginLowerLimit = grantBeginYearArray[ $( "#treemapbeginyearrange" ).slider("option", "values")[0] ];
      var beginUpperLimit = grantBeginYearArray[ $( "#treemapbeginyearrange" ).slider("option", "values")[1] ];
      var endLowerLimit = grantEndYearArray[ $( "#treemapendyearrange" ).slider("option", "values")[0] ];
      var endUpperLimit = grantEndYearArray[ $( "#treemapendyearrange" ).slider("option", "values")[1] ];

      var begin = parseInt(d.BeginDate.substring(0, 4));
      var end = parseInt(d.EndDate.substring(0, 4));
      if(!(beginLowerLimit <= begin && begin <= beginUpperLimit && endLowerLimit <= end && end <= endUpperLimit))
        req = 0;
    }

    //animation
    if(animating) {
      if(d.AwardStatus == "Accepted" || d.AwardStatus == "Closed") {
        var begin = parseInt(d.BeginDate.substring(0, 4));
        var end = parseInt(d.EndDate.substring(0, 4));
        var current = currentYear;
        if(!(begin <= current && current <= end))
          req = 0;
      } else {
        req = 0;
      }
    }
    
    return req;
  }

  function treemapStatusFilterListener() {
  	//filteredData is an array that is composed of all the elements from grantFilterData that pass the test (i.e., return true) in the _.filter function
  	//in other words, it contains the elements that are to be shown or hidden
  	//the function looks at the awardstatus of each element (d) in grantFilterData
    var filteredData = _.filter(grantFilterData, function(d) {
      var flag = false;
      switch(d.awardstatus) {
        case "Accepted":
          flag = $('input#treemapFilterAccepted').is(':checked'); //true if treemapFilterAccepted 'button' is checked, false otherwise
          break;
        case "Closed":
          flag = $('input#treemapFilterClosed').is(':checked'); //true if treemapFilterClosed 'button' is checked, false otherwise
          break;
        default:
          flag = false;
      }
      return flag; //if flag is true, add the element (d) to the filteredData array
    });
    initTreemapFilter(filteredData); //pass the newly constructed array to initTreemapFilter
    refreshTreemap();
  }

  ///filters for treemap
  $('input#treemapFilterAccepted').on('ifChecked', treemapStatusFilterListener);
  $('input#treemapFilterAccepted').on('ifUnchecked', treemapStatusFilterListener);
  $('input#treemapFilterClosed').on('ifChecked', treemapStatusFilterListener);
  $('input#treemapFilterClosed').on('ifUnchecked', treemapStatusFilterListener);
  $('input#treemapFilterDeclined').on('ifChecked', treemapStatusFilterListener);
  $('input#treemapFilterDeclined').on('ifUnchecked', treemapStatusFilterListener);
  $('input#treemapFilterOthers').on('ifChecked', treemapStatusFilterListener);
  $('input#treemapFilterOthers').on('ifUnchecked', treemapStatusFilterListener);

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
              .attr("transform", "translate(.5,.5)")
              .attr("pointer-events", "visible");
      }
      //change framentation slider
      $('#treemapsponsorfragslider').hide("slow");
      $('#treemapdepartmentfragslider').show("slow");
      $('#treemapfrag').val(departmentFragmentationName[$('#treemapdepartmentfragslider').slider("option", "value")]);

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
              .attr("transform", "translate(.5,.5)")
              .attr("pointer-events", "visible");
      }
      //change framentation slider
      $('#treemapdepartmentfragslider').hide("slow");
      $('#treemapsponsorfragslider').show("slow");
      $('#treemapfrag').val(sponsorFragmentationName[$('#treemapsponsorfragslider').slider("option", "value")]);

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
        else if ( $(this).attr("class") == "cell labelbar" || $(this).attr("class") == "cell parent") {
          if (this.__data__ == root){
            var numChildren = this.__data__.children.length;
            var total = this.__data__.value;
            var text = "<b>Faculty of Science</b>" + "<br><b>" + $('#arrangetreemap').val() + ":</b> " + numChildren + "<br><b>Total Request Amount:</b> $" + total;
            return text;
          }
          else{
            var numChildren = this.__data__.children.length;
            var total = this.__data__.value;
            var text;
            if($('#arrangetreemap').val() == "department")
              text = "<b>Department:</b> " + this.__data__.name + "<br><b>Grant Requests:</b> " + numChildren + "<br><b>Total Request Amount:</b> $" + total;
            else
              text = "<b>Sponsor:</b> " + this.__data__.name + "<br><b>Program Numbers:</b> " + numChildren + "<br><b>Total Request Amount:</b> $" + total;
            return text;
          }

        }
        else if ( $(this).attr("class") == "cell labelbar labelbar2" || $(this).attr("class") == "cell parent2") { //for sponsor treemap(programs)
          var numChildren = this.__data__.children.length;
          var total = this.__data__.value;
          var text = "<b>Program:</b> " + this.__data__.name + "<br><b>Grant Requests:</b> " + numChildren + "<br><b>Total Request Amount:</b> $" + total;
          return text;
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
        if (removed == node.name && node.sourceLinks.length){
          d3.select(this).transition().duration(1000).style("opacity", 0);
        }
        else if (added == node.name && node.sourceLinks.length){
          d3.select(this).transition().duration(1000).style("opacity", 1);
        }
      });

      d3.selectAll('.sankeylink').each(function (link) {
        if (removed == link.source.name){
          d3.select(this).transition().duration(1000).style("opacity", 0);
        }
        else if (added == link.source.name && _.contains(filtertargetsvisible, link.target.name)){
          d3.select(this).transition().duration(1000).style("opacity", 1);
        }
      }); 

      if($('#sankeyfragslider').slider("value") == 1) {
        d3.selectAll('.sankeylink').filter(function(link) { 
          return link.source.name == "Proposal"; 
        }).each(function (link) {
          if (removed == link.target.name){
            d3.select(this).transition().duration(1000).style("opacity", 0);
          }
          else if (added == link.target.name){
            d3.select(this).transition().duration(1000).style("opacity", 1);
          }
        }); 
      }

      filtersourcesvisible = $("#filtersources").val(); //update which sources are visible now

    });

    //same as above, but for filtertargets
    $("#filtertargets").chosen().change( function () {
      var removed = _.difference(filtertargetsvisible, $("#filtertargets").val()); //if a value was removed, this will not be empty
      var added = _.difference($("#filtertargets").val(), filtertargetsvisible);   //if a value was added, this will not be empty  
      var filtertargetshidden = _.difference(proposalStatuses, $("#filtertargets").val());

      d3.selectAll('.sankeynode').each(function (node) {
        if (removed == node.name && !node.sourceLinks.length){
          d3.select(this).transition().duration(1000).style("opacity", 0);
        }
        else if (added == node.name && !node.sourceLinks.length){
          d3.select(this).transition().duration(1000).style("opacity", 1);
        }
      });

      d3.selectAll('.sankeylink').each(function (link) {
        if (removed == link.target.name && link.source.name != "Proposal"){
          d3.select(this).transition().duration(1000).style("opacity", 0);
        }
        else if (added == link.target.name && _.contains(filtersourcesvisible, link.source.name)){
          d3.select(this).transition().duration(1000).style("opacity", 1);
        }
      });  

      filtertargetsvisible = $("#filtertargets").val(); //update which targets are visible now

    });
  });//end function
  
  /*
  populates the filter area based on grant data
  is called from prepareSankeyDepts in processGrantData
  */
  function populateFilter(fragmentationLevel, grantDepts, proposalStatuses, awardStatuses) {

    //clear old contents
    $('#filtersources').children().remove();
    $('#filtertargets').children().remove();

    if(fragmentationLevel == "departments") {
      $('#filtersources').prev().text("sources");
      $('#filtertargets').prev().text("targets");

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
    } else if(fragmentationLevel == "faculty") {
      $('#filtersources').prev().text("Proposal Statuses");
      $('#filtertargets').prev().text("Award Statuses");

      $.each(proposalStatuses, function(key, value) {
        $('#filtersources')
          .append($("<option selected></option>")
            .attr("value", value)
            .text(value))
          .trigger("liszt:updated");
      });

      $.each(awardStatuses, function(key, value) {  
        $('#filtertargets')
          .append($("<option selected></option>")
            .attr("value",value)
            .text(value))
          .trigger("liszt:updated");
      });
    }

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
  }//end populateFilter

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

    var sankey_data, grant_departments, proposal_statuses, award_statuses, grant_year_range_begin, grant_year_range_end, grant_sponsors;

    if (fragmentationLevel == "departments"){
      if(store.session.has("sankey_data_departments")){
        console.log("sankey_data_departments is already in sessionStorage...no need to fetch again!");
        sankey_data = store.session("sankey_data_departments");
        grant_departments = store.session("grant_departments");
        proposal_statuses = store.session("proposal_statuses");
        award_statuses = store.session("award_statuses");
        //grants_unique = store.session("grants_unique");
        grant_sponsors = store.session("grant_sponsors");
        grant_year_range_begin = store.session("grant_year_range_begin");
        grant_year_range_end = store.session("grant_year_range_end");      
        callback(sankey_data, grant_sponsors, grant_departments, proposal_statuses, award_statuses, fragmentationLevel, grant_year_range_end, grant_year_range_begin);      
      }
      else{
        console.log("fetching sankey_data_departments...");
        $.get('/grants/sankey_data_departments', function(result) {
          sankey_data = JSON.parse(result.sankey_data_departments);
          grant_departments = JSON.parse(result.grant_departments);
          proposal_statuses = JSON.parse(result.proposal_statuses);
          award_statuses = JSON.parse(result.award_statuses);
          //grants_unique = JSON.parse(result.grants_unique);
          grant_sponsors = JSON.parse(result.grant_sponsors);
          grant_year_range_begin = JSON.parse(result.grant_year_range_begin);
          grant_year_range_end = JSON.parse(result.grant_year_range_end);        
          store.session("sankey_data_departments", sankey_data);
          store.session("grant_departments", grant_departments);
          store.session("proposal_statuses", proposal_statuses);
          store.session("award_statuses", award_statuses);
          //store.session("grants_unique", grants_unique);
          store.session("grant_sponsors", grant_sponsors);
          store.session("grant_year_range_begin", grant_year_range_begin);
          store.session("grant_year_range_end", grant_year_range_end);        
          callback(sankey_data, grant_sponsors, grant_departments, proposal_statuses, award_statuses, fragmentationLevel, grant_year_range_end, grant_year_range_begin);        
        });
      }      
    }
    else if (fragmentationLevel == "faculty"){
      if(store.session.has("sankey_data_faculty")){
        console.log("sankey_data_faculty is already in sessionStorage...no need to fetch again!");
        sankey_data = store.session("sankey_data_faculty");
        grant_departments = store.session("grant_departments");
        proposal_statuses = store.session("proposal_statuses");
        award_statuses = store.session("award_statuses");
        //grants_unique = store.session("grants_unique");
        grant_sponsors = store.session("grant_sponsors");      
        grant_year_range_begin = store.session("grant_year_range_begin");
        grant_year_range_end = store.session("grant_year_range_end");
        callback(sankey_data, grant_sponsors, grant_departments, proposal_statuses, award_statuses, fragmentationLevel, grant_year_range_end, grant_year_range_begin);      
      }
      else{
        console.log("fetching sankey_data_faculty...");
        $.get('/grants/sankey_data_faculty', function(result) {
          sankey_data = JSON.parse(result.sankey_data_faculty);
          grant_departments = JSON.parse(result.grant_departments);
          proposal_statuses = JSON.parse(result.proposal_statuses);
          award_statuses = JSON.parse(result.award_statuses);
          //grants_unique = JSON.parse(result.grants_unique);
          grant_sponsors = JSON.parse(result.grant_sponsors);
          grant_year_range_begin = JSON.parse(result.grant_year_range_begin);
          grant_year_range_end = JSON.parse(result.grant_year_range_end);        
          store.session("sankey_data_faculty", sankey_data);
          store.session("grant_departments", grant_departments);
          store.session("proposal_statuses", proposal_statuses);
          store.session("award_statuses", award_statuses);
          //store.session("grants_unique", grants_unique);
          store.session("grant_sponsors", grant_sponsors);        
          store.session("grant_year_range_begin", grant_year_range_begin);
          store.session("grant_year_range_end", grant_year_range_end);
          callback(sankey_data, grant_sponsors, grant_departments, proposal_statuses, award_statuses, fragmentationLevel, grant_year_range_end, grant_year_range_begin);        
        });
      }    
    }
  }//end getSankeyData


  function buildSankey(sankey_data, grant_sponsors, grant_departments, proposal_statuses, award_statuses, fragmentationLevel, grant_year_range_end, grant_year_range_begin){

    grant_year_begin_min = _.min(_.filter(_.uniq(_.map(grant_year_range_begin, function(d){ if (d != "") return parseInt(d); })), function(d) { return d != undefined }));
     grant_year_begin_max = _.max(_.filter(_.uniq(_.map(grant_year_range_begin, function(d){ if (d != "") return parseInt(d); })), function(d) { return d != undefined }));
     grant_year_end_min = _.min(_.filter(_.uniq(_.map(grant_year_range_end, function(d){ if (d != "") return parseInt(d); })), function(d) { return d != undefined }));
     grant_year_end_max = _.max(_.filter(_.uniq(_.map(grant_year_range_end, function(d){ if (d != "") return parseInt(d); })), function(d) { return d != undefined }))

      $('#vizloader').hide();

      populateFilter(fragmentationLevel, grant_departments, proposal_statuses, award_statuses);

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
          .nodes(sankey_data.nodes)
          .links(sankey_data.links)
          .layout(32);

      var link = sankeysvg.append("g").selectAll(".sankeylink")
          .data(sankey_data.links)
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
          .data(sankey_data.nodes)
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
  }//end buildSankey

  function constructBubble () {

    var xpos = $('#vizcontainer').width()/2 - $('#vizloader').width()/2;
    var ypos = $('#vizcontainer').height()/2 - $('#vizloader').height()/2;
    $('#vizloader').css({"position": "absolute", "left":  xpos + "px", "top": ypos + "px"}).show();

    getBubbleData(buildBubble);    
  }//end constructBubble

  /*
  gets the data for the bubbleviz (either from the sessionStorage or from the db on the server) and then builds the viz by passing the buildBubble function as a callback to getBubbleData
  @params: callback: a callback function--in this case buildBubble--that builds the bubble visualization
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
          yearRangeArrayBuilt = false;
          initBubbleFilter(all_grants);
          callback(all_grants);
        }
    );//end async.parallel
  }//end getBubbleData

  function buildBubble(all_grants) {
    //hide the loading gif
    $('#vizloader').hide();

    $('#bubbleselectactions').slideUp();

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
          updateSelectionArea();  
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
        yearRangeArrayBuilt = false;
        initTreemapFilter(all_grants);
        callback(nestedData, grant_sponsors);
      }
    );
  }//end getTreemapData

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

    // create children cells
    var childCells = treemapsvg.selectAll("g.cell.child")
            .data(children)
            .enter().append("g")
            .attr("class", "cell child")
            .on("mouseover", function(d) {
              if (this.childNodes[0].style.stroke!="#ff0000"){
                this.childNodes[0].style.stroke="#ffffff"
                this.childNodes[0].style.strokeWidth="3px";
              }
            })
            .on("mouseout", function() {
              if (this.childNodes[0].style.stroke=="#ffffff")
                this.childNodes[0].style.strokeWidth="0px";
            })
            .on("click", function(d) {
              // if (treemapselect)
              //   console.log("selected");
              if(this.childNodes[0].style.stroke=="" || this.childNodes[0].style.stroke=="#ffffff"){
                this.childNodes[0].style.stroke="#ff0000";
                this.childNodes[0].style.strokeWidth="3px";
              }
              else if(this.childNodes[0].style.stroke=="#ff0000"){
                this.childNodes[0].style.stroke="#ffffff";
                this.childNodes[0].style.strokeWidth="0px";
              }
              //zoom(node === d.parent ? root : d.parent);
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

    // create parent cells
    var parentCells = treemapsvg.selectAll("g.cell.parent")
            .data(parents)
            .enter().append("g")
            .attr("class", "cell parent")
            .on("click", function(d) {
              zoom(node === d ? root : d);
            });
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
              zoom(node === d ? d.parent : d);
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
    if($('#arrangetreemap').val() == "sponsor") {
      var parentCells2 = treemapsvg.selectAll("g.cell.parent.parent2")
              .data(parents2)
              .enter().append("g")
              .attr("class", "cell parent parent2")
              .on("click", function(d) {
                zoom(node === d ? root : d);
              });
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
                zoom(node === d ? d.parent : d);
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
            d.x += (grantValueCenters[i].focuscoords[0] - d.x) * 0.12 * bubble_force.alpha();
            if(!border_coords_sampled) {
              grantvalue_border_coords[i].min_x = d.x < grantvalue_border_coords[i].min_x ? d.x : grantvalue_border_coords[i].min_x;
              grantvalue_border_coords[i].max_x = d.x > grantvalue_border_coords[i].max_x ? d.x : grantvalue_border_coords[i].max_x;
            }
            return d.x;
          });
          d3.select(this).attr("cy", function(d) {
            d.y += (grantValueCenters[i].focuscoords[1] - d.y) * 0.12 * bubble_force.alpha();
            if(!border_coords_sampled) {
              grantvalue_border_coords[i].min_y = d.y < grantvalue_border_coords[i].min_y ? d.y : grantvalue_border_coords[i].min_y;
              grantvalue_border_coords[i].max_y = d.y > grantvalue_border_coords[i].max_y ? d.y : grantvalue_border_coords[i].max_y;
            }
            return d.y;
          });
        });
    } else if($('#arrangebubble').val() == "department") {
      bubble
        .each(function(d) {
          var i = 0;
          //there are only 8 grants that have a nested department object, it does not matter how to put these bubbles
          //the random center at each tick allows thses bubbles to stay in between department areas they belong to
          //var dept = ($.isArray(d.Department) ? d.Department[parseInt(Math.random()*d.Department.length)] : d.Department).substring(0, 4);
          var dept = ($.isArray(d.Department) ? d.Department[0] : d.Department).substring(0, 4);
          //find matched center index
          while(i < departmentCenters.length) {
            if(departmentCenters[i].name.substring(0, 4) == dept)
              break;
            i++;
          }
          if(i == departmentCenters.length)
            i--;
          d3.select(this).attr("cx", function(d) {
            d.x += (departmentCenters[i].focuscoords[0] - d.x) * 0.12 * bubble_force.alpha();
            if(!border_coords_sampled) {
              department_border_coords[i].min_x = d.x < department_border_coords[i].min_x ? d.x : department_border_coords[i].min_x;
              department_border_coords[i].max_x = d.x > department_border_coords[i].max_x ? d.x : department_border_coords[i].max_x;
            }
            return d.x;
          });
          d3.select(this).attr("cy", function(d) {
            d.y += (departmentCenters[i].focuscoords[1] - d.y) * 0.12 * bubble_force.alpha();
            if(!border_coords_sampled) {
              department_border_coords[i].min_y = d.y < department_border_coords[i].min_y ? d.y : department_border_coords[i].min_y;
              department_border_coords[i].max_y = d.y > department_border_coords[i].max_y ? d.y : department_border_coords[i].max_y;
            }
            return d.y;
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
      grantvalue_border_coords.push({"min_x": width, "max_x": 0, "min_y": height, "max_y": 0});
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
        department_border_coords.push({"min_x": width, "max_x": 0, "min_y": height, "max_y": 0});
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
    var ky = height / Math.max(d.dy, headerHeight + 1);
    //var level = d;

    xscale.domain([d.x, d.x + d.dx]);
    yscale.domain([d.y, d.y + d.dy]);

    // if (node != level) {
    //     //treemapsvg.selectAll(".cell.child .celllabel").style("display", "none");
    //     console.log("hahahhah");
    // }

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

    //update the width/height of the rects
    // zoomTransition.select("rect")
    //         .attr("width", function(d) {
    //             return Math.max(0.01, (kx * d.dx - 1));
    //         })
    //         .attr("height", function(d) {
    //             return d.children ? (ky * headerHeight) : Math.max(0.01, (ky * d.dy - 1));
    //         });

    // if(parseInt(treemapsvg.attr("fragmentation"))) {
    //   if(level != root) { //zoom in
    //     treemapsvg.selectAll("g.cell.child")
    //       .style("visibility", "visible")
    //       .style("opacity", 1);
    //   } else { //zoom out
    //     treemapsvg.selectAll("g.cell.child")
    //       .transition().delay(transitionDuration)
    //       .style("opacity", 0)
    //       .style("visibility", "hidden");
    //   }
    // }

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

    node = d;

    if (d3.event) {
        d3.event.stopPropagation();
    }
  }

  /*
    If it is the first time to build arrays, then record some data for filter use.
    Otherwise just rebuild arrays with recorded data
    @param: all_grants: grant data or recorded data
  */
  function buildYearRangeArray(all_grants) {
    if(!$('input#treemapFilterAccepted').is(':checked') && !$('input#treemapFilterClosed').is(':checked'))
      return;
    grant_year_begin_max = 0, grant_year_begin_min = 9999;
    grant_year_end_max = 0, grant_year_end_min = 9999;
    grant_year_deadline_max = 0, grant_year_deadline_min = 9999;
    if(!yearRangeArrayBuilt) {
      grantFilterData = [];
      all_grants.forEach(function(d) {
        var begin = parseInt(d.BeginDate.substring(0, 4));
        var end = parseInt(d.EndDate.substring(0, 4));
        var deadline = parseInt(d.Deadline.substring(0, 4));
        grantFilterData.push({ awardstatus: d.AwardStatus, proposalstatus: d.ProposalStatus, begin: begin, end: end, deadline: deadline });
        grant_year_begin_max = begin > grant_year_begin_max ? begin : grant_year_begin_max;
        grant_year_begin_min = begin < grant_year_begin_min ? begin : grant_year_begin_min;
        grant_year_end_max = end > grant_year_end_max ? end : grant_year_end_max;
        grant_year_end_min = end < grant_year_end_min ? end : grant_year_end_min;
        grant_year_deadline_max = deadline > grant_year_deadline_max ? deadline : grant_year_deadline_max;
        grant_year_deadline_min = deadline < grant_year_deadline_min ? deadline : grant_year_deadline_min;
      });
    } else {
    	//loops through all of the grants that are going to be visualized to find some min and max values
      all_grants.forEach(function(d) {
        var begin = d.begin;
        var end = d.end;
        var deadline = d.deadline;
        grant_year_begin_max = begin > grant_year_begin_max ? begin : grant_year_begin_max;
        grant_year_begin_min = begin < grant_year_begin_min ? begin : grant_year_begin_min;
        grant_year_end_max = end > grant_year_end_max ? end : grant_year_end_max;
        grant_year_end_min = end < grant_year_end_min ? end : grant_year_end_min;
        grant_year_deadline_max = deadline > grant_year_deadline_max ? deadline : grant_year_deadline_max;
        grant_year_deadline_min = deadline < grant_year_deadline_min ? deadline : grant_year_deadline_min;
      })
    }

    //the begin years of most grants are after 2000. There are only 60 grants that begin before 2000 and 42 grants ending before 2012
    grantBeginYearArray = [];
    grantEndYearArray = [];
    grantDeadlineYearArray = [];
    grantBeginYearArray.push(grant_year_begin_min);
    for(var year = 2000; year <= grant_year_begin_max; year++)
      grantBeginYearArray.push(year);
    grantEndYearArray.push(grant_year_end_min);
    for(var year = 2012; year <= grant_year_end_max; year++)
      grantEndYearArray.push(year);
    grantDeadlineYearArray.push(grant_year_deadline_min);
    for(var year = 2000; year <= grant_year_deadline_max; year++)
      grantDeadlineYearArray.push(year);

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
  Calculate and show boundaries polygons when arranging nodes
  @params: type: the property used to arrange nodes
  @returns: 
  */
  function arrangementBoundaries(type) {
    var border_coords, rectangles = [], polygons = [], r = 10;
    border_coords_sampled = true;
    if(type == "department")
      border_coords = department_border_coords;
    else //grant value
      border_coords = grantvalue_border_coords;
    //calculate boundary rectangles
    for(var i = 0; i < border_coords.length; i++) {
      rectangles.push([[parseInt(border_coords[i].min_x - r), parseInt(border_coords[i].min_y - r)]
        , [parseInt(border_coords[i].min_x - r), parseInt(border_coords[i].max_y + r)]
        , [parseInt(border_coords[i].max_x + r), parseInt(border_coords[i].max_y + r)]
        , [parseInt(border_coords[i].max_x + r), parseInt(border_coords[i].min_y - r)]]);
      polygons.push([[parseInt(border_coords[i].min_x - r), parseInt(border_coords[i].min_y - r)]
        , [parseInt(border_coords[i].min_x - r), parseInt(border_coords[i].max_y + r)]
        , [parseInt(border_coords[i].max_x + r), parseInt(border_coords[i].max_y + r)]
        , [parseInt(border_coords[i].max_x + r), parseInt(border_coords[i].min_y - r)]]);
    }
    //calculate the diagonals of overlapping parts
    //calculate boundary polygons
    for(var i = 0; i < rectangles.length - 1; i++) {
      var interrectangle = d3.geom.polygon(rectangles[i]).clip(rectangles[i+1].slice(0));
      if(interrectangle.length) {
        //process the interrectangle
        var min_x = width, min_y = height, max_x = 0, max_y = 0;
        for(var j = 0; j < 4; j++) {
          min_x = interrectangle[j][0] < min_x ? interrectangle[j][0] : min_x;
          min_y = interrectangle[j][1] < min_y ? interrectangle[j][1] : min_y;
          max_x = interrectangle[j][0] > max_x ? interrectangle[j][0] : max_x;
          max_y = interrectangle[j][1] > max_y ? interrectangle[j][1] : max_y;
        }
        interrectangle[0] = [min_x, min_y];
        interrectangle[1] = [min_x, max_y];
        interrectangle[2] = [max_x, max_y];
        interrectangle[3] = [max_x, min_y];

        //intersected vertice by vertice
        //  _______________
        // |               |
        // |               |
        // |          _____|______
        // |         |     |      |
        // |_________|_____|      |
        //           |            |
        //           |____________|

        if(interrectangle[0][0] == rectangles[i][0][0] && interrectangle[0][1] == rectangles[i][0][1]
          && interrectangle[2][0] == rectangles[i+1][2][0] && interrectangle[2][1] == rectangles[i+1][2][1]) {

          polygons[i] = [interrectangle[3], interrectangle[1]].concat(polygons[i].slice(1));

          var j;
          for(j = 0; j < polygons[i+1].length; j++)
            if(polygons[i+1][j][1] == interrectangle[1][1])
              break;
          polygons[i+1] = polygons[i+1].slice(0, j+1).concat([interrectangle[1], interrectangle[3]]).concat(polygons[i+1].slice(j+2));

        } else if(interrectangle[0][0] == rectangles[i+1][0][0] && interrectangle[0][1] == rectangles[i+1][0][1]
          && interrectangle[2][0] == rectangles[i][2][0] && interrectangle[2][1] == rectangles[i][2][1]) {

          var j;
          for(j = 0; j < polygons[i].length; j++)
            if(polygons[i][j][1] == interrectangle[1][1])
              break;
          polygons[i] = polygons[i].slice(0, j+1).concat([interrectangle[1], interrectangle[3]]).concat(polygons[i].slice(j+2));

          polygons[i+1] = [interrectangle[3], interrectangle[1]].concat(polygons[i+1].slice(1));

        } else if(interrectangle[1][0] == rectangles[i][1][0] && interrectangle[1][1] == rectangles[i][1][1]
          && interrectangle[3][0] == rectangles[i+1][3][0] && interrectangle[3][1] == rectangles[i+1][3][1]) {

          var j;
          for(j = 0; j < polygons[i].length; j++)
            if(polygons[i][j][0] == interrectangle[0][0])
              break;
          polygons[i] = polygons[i].slice(0, j+1).concat([interrectangle[0], interrectangle[2]]).concat(polygons[i].slice(j+2));

          var j;
          for(j = 0; j < polygons[i+1].length; j++)
            if(polygons[i+1][j][0] == interrectangle[2][0])
              break;
          polygons[i+1] = polygons[i+1].slice(0, j+1).concat([interrectangle[2], interrectangle[0]]).concat(j+2 >= polygons[i].length ? [] : polygons[i+1].slice(j+2));

        } else if(interrectangle[1][0] == rectangles[i+1][1][0] && interrectangle[1][1] == rectangles[i+1][1][1]
          && interrectangle[3][0] == rectangles[i][3][0] && interrectangle[3][1] == rectangles[i][3][1]) {

          var j;
          for(j = 0; j < polygons[i+1].length; j++)
            if(polygons[i+1][j][0] == interrectangle[0][0])
              break;
          polygons[i+1] = polygons[i+1].slice(0, j+1).concat([interrectangle[0], interrectangle[2]]).concat(polygons[i+1].slice(j+2));

          var j;
          for(j = 0; j < polygons[i].length; j++)
            if(polygons[i][j][0] == interrectangle[2][0])
              break;
          polygons[i] = polygons[i].slice(0, j+1).concat([interrectangle[2], interrectangle[0]]).concat(j+2 >= polygons[i].length ? [] : polygons[i].slice(j+2));

        } else {
          //intersected side by side
          //  _______________
          // |           ____|_____
          // |          |    |     |
          // |          |    |     |
          // |          |____|_____|
          // |               |
          // |_______________|

          var j, k;
          for(j = 0; j < 4; j++)
            if(interrectangle[j][0] == polygons[i][j][0] && interrectangle[j][1] == polygons[i][j][1])
              break;
          for(k = 0; k < 4; k++)
            if(interrectangle[k][0] == polygons[i+1][k][0] && interrectangle[k][1] == polygons[i+1][k][1])
              break;
          //polygons[i] is bigger than polygons[i+1]
          if(j == 4 && k != 4) {

            for(j = 0; j < 4; j++)
              if(interrectangle[j][0] == rectangles[i][j][0] || (j && interrectangle[j][1] == rectangles[i][j][1]))
                break;
            for(k = 0; k < polygons[i].length; k++)
              if(interrectangle[j][0] == polygons[i][k][0] || (k && interrectangle[j][1] == polygons[i][k][1]))
                break;
            var p;
            if(interrectangle[j][0] == interrectangle[(j+1)%4][0])
              p = [interrectangle[(j+2)%4][0], polygons[i][(k+1)%4][1]];
            else
              p = [polygons[i][(k+1)%4][0], interrectangle[(j+2)%4][1]];
            polygons[i] = polygons[i].slice((k+2 >= polygons[i].length ? (k+2)%polygons[i].length : 0), k+1).concat([interrectangle[j], interrectangle[(j+2)%4], p]).concat(k+2 >= polygons[i].length ? [] : polygons[i].slice(k+2));

            polygons[i+1] = polygons[i+1].reverse();
            var n = 3 - j;
            for(k = 0; k < polygons[i+1].length; k++)
              if(interrectangle[n][0] == polygons[i+1][k][0] && interrectangle[n][1] == polygons[i+1][k][1])
                break;
            polygons[i+1] = polygons[i+1].slice((k+2 >= polygons[i+1].length ? (k+2)%polygons[i+1].length : 0), k).concat([interrectangle[j], interrectangle[(j+2)%4]]).concat(k+2 >= polygons[i+1].length ? [] : polygons[i+1].slice(k+2));
            polygons[i+1] = polygons[i+1].reverse();

          //polygons[i+1] is bigger than polygons[i]
          } else if(j != 4 && k == 4) {

            polygons[i+1] = polygons[i+1].reverse();
            for(j = 0; j < 4; j++)
              if(interrectangle[3-j][0] == rectangles[i+1][3-j][0] || (j && interrectangle[3-j][1] == rectangles[i+1][3-j][1]))
                break;
            for(k = 0; k < polygons[i+1].length; k++)
              if(interrectangle[3-j][0] == polygons[i+1][k][0] || (k && interrectangle[3-j][1] == polygons[i+1][k][1]))
                break;
            var p;
            if(interrectangle[3-j][0] == interrectangle[(6-j)%4][0])
              p = [interrectangle[(5-j)%4][0], polygons[i+1][(k+1)%4][1]];
            else
              p = [polygons[i+1][(k+1)%4][0], interrectangle[(5-j)%4][1]];
            polygons[i+1] = polygons[i+1].slice((k+2 >= polygons[i+1].length ? (k+2)%polygons[i+1].length : 0), k+1).concat([interrectangle[3-j], interrectangle[(5-j)%4], p]).concat(k+2 >= polygons[i+1].length ? [] : polygons[i+1].slice(k+2));
            polygons[i+1].reverse();

            var n = (4 - j) % 4;
            for(k = 0; k < polygons[i].length; k++)
              if(interrectangle[n][0] == polygons[i][k][0] && interrectangle[n][1] == polygons[i][k][1])
                break;
            polygons[i] = polygons[i].slice((k+2 >= polygons[i].length ? (k+2)%polygons[i].length : 0), k).concat([interrectangle[3-j], interrectangle[(5-j)%4]]).concat(k+2 >= polygons[i].length ? [] : polygons[i].slice(k+2));

          } else {
            //should be no more
          }
        }
      }
    }
    //show boundaries
    for(var i = 0; i < polygons.length; i++) {
      var polysvg = bubblesvg.append("g")
        .attr("class", "boundary " + type)
        //.style("visibility", "hidden")
        .on("mouseover", function() {
          //this.style.visibility = "visible";
        })
        .on("mouseout", function() {
          //this.style.visibility = "hidden";
        });
      polysvg.append("path")
        .attr("d", function() {
          var str = "M " + polygons[i][0][0] + " " + polygons[i][0][1] + " ";
          for(var j = 1; j < polygons[i].length; j++)
            str += "L " + polygons[i][j][0] + " " + polygons[i][j][1] + " ";
          str += "z";
          return str;
        })
        .attr("fill", "white")
        .attr("stroke", "gray")
        .attr("stroke-dasharray", "5,5")
        .attr("stroke-width", "5")
        .style("opacity", 0.7);
      polysvg.append("text")
        .attr("x", d3.geom.polygon(polygons[i]).centroid()[0])
        .attr("y", polygons[i].centroid()[1])
        .attr("text-anchor", "middle")
        .style("font-family", "Oswald")
        .style("font-size", "1em")   
        .style("font-weight", 800)
        .style("fill", "gray")     
        .text(function() {
          if(type == "department")
            return departmentCenters[i].name;
          else
            return "$ " + (i ? grantValueCenters[i-1].amount + " - " + grantValueCenters[i].amount : "0 - " + grantValueCenters[i].amount);
        });
    }
  }//end arrangementBoundaries

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
      //cloningSvg.selectAll('*').remove();
      $('#bubbleselectactions').slideUp();
    }
    else {
      var items = d3.select("#selectionList").selectAll(".item")

        .data(selectedBubbles, function(d) { 
          return d.Title; } ); //<--this "key function" replaces the default bind-by-index behavior 

        //show selection actions
        if(selectedBubbles.length > 0)
          $('#bubbleselectactions').slideDown();
        else
          $('#bubbleselectactions').slideUp();

      items.enter()
        .append("li")
        .attr("class", "item")
        .text(function(d) { return d.Title; } )
        .style("color", function(d) { return color20(d.Sponsor); } );

      items
        .on("mouseover", function(d) {
          d3.select(this)
            .style("background-color", "rgb(36,137,197)")//function(d) { return color20(d.Department) })
            .style("color", "white");
          
          // var datum = d;
          // var collaborations;
          // d3.selectAll("circle.node").each(function(d) {
          //   if(d == datum) {
          //     d3.select(this).style("fill", "gray");
          //     collaborations = {
          //       "publications": $(this).attr("publications"), 
          //       "supervisions": $(this).attr("supervisions"), 
          //       "grants": $(this).attr("grants")};
          //   }
          // });

          // var top = $(this).position().top + $('#selectionArea').position().top;
          // var left = $(this).position().left + $(this).width() + $('#selectionArea').position().left + 35;

          // $('#networkviz').append('<div class="itemDetails" id="itemDetails-' + d.ID + '"></div>');
          // $('#itemDetails-' + d.ID)
          //   .css({
          //     top: top + "px",
          //     left: left + "px"
          //   })
          //   .html('<b>Name: </b>' + d.Name + '<br>'
          //     + '<b>ID: </b>' + d.ID + '<br>'
          //     + '<b>Department: </b>' + d.Department + '<br>'
          //     + '<b>Rank: </b>' + d.Rank + '<br>'
          //     + '<b>Co-Publications: </b>' + collaborations.publications + '<br>'
          //     + '<b>Co-Supervisions: </b>' + collaborations.supervisions + '<br>'
          //     + '<b>Co-Grants: </b>' + collaborations.grants);
          // $('#itemDetails-' + d.ID).show('slow');
        })
        .on("mouseout", function(d) {
          if(!d3.select(this).classed("chosen")) {
            d3.select(this).style("background-color", "white")
            .style("color", function(d) { return color20(d.Sponsor); } );  
          }

          var datum = d;
          d3.selectAll("circle.node").each(function(d) {
            if(d == datum) {
              if($('#selectionShow').is(':checked'))
                d3.select(this).style("fill", function(d) { return color20(d.Sponsor); });
              else
                d3.select(this).style("fill", "white");
            }
          });
          //$('#itemDetails-' + d.ID).hide(100, function() { this.remove(); });
        })
        .on("click", function(d) {
          if(d3.select(this).classed("chosen")) {
            d3.select(this).classed("chosen", false);
          } else {
            d3.select(this).classed("chosen", true);
          }

          var counts = d3.select("#selectionList").selectAll("li.item.chosen")[0].length;
          if(counts < 2) {
            $('#itemsBarchart').parent().hide('fast');
          } else {
            $('#itemsBarchart').parent().show('fast');
          }

          if(counts == selectedBubbles.length)
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

      if(selectedBubbles.length > 1)
        $('#itemsChooseAll').parent().slideDown('fast');
      else
        $('#itemsChooseAll').parent().slideUp('fast');
      $('#itemsChooseAll').css("background", "rgb(36,137,197)").css("color", "white").css("cursor", "pointer");
      $('#itemsChooseNone').css("background", "grey").css("color", "rgb(162,162,162").css("cursor", "default");
      var counts = d3.select("#selectionList").selectAll("li.item.chosen")[0].length;
      if(counts < 2) {
        $('#itemsBarchart').parent().hide('fast');
      } else {
        $('#itemsBarchart').parent().show('fast');
      }
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
