// Code by Arash - 27-02-2014
// New layout for showing relations between grants and publication:

var GRANTPUB = (function () {
	
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

	// analysis values
	var analysis_keyword_filter = [];
	var analysis_keyword_filter_inactive = [];
	var analysis_name_filter = [];
	var analysis_name_filter_inactive = [];
	var analysis_begin_date = 2003;
	var analysis_end_date = 2013;
	var analysis_threshold = 0.13;
	var analysis_kernel_selection = 0;
	var analysis_algorithm_selection = 'Algorithm1';
	var analysis_selectedGrant = '';
	
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
				$( "#yearText" ).text( ui.values[ 0 ] + " - " + ui.values[ 1 ] );
				refreshTreemaps();
			}
		});
		$("#yearText").text( $("#yearSlider").slider( "values", 0 ) + " - " + $( "#yearSlider" ).slider( "values", 1 ) );
		
		// handle grant-pub analysis box
		$("input[name='analysisAlgorithm']").on('ifChanged', function(event){
			analysis_algorithm_selection = $(this).value;
			$("#submitBox").show();
		});
		
		$("input[name='scoreKernel']").on('ifChanged', function(event){
			analysis_kernel_selection = $(this).value;
			$("#submitBox").show();
		});
		$("#availableAnalysis").on('ifChecked', function(event){
			$.get('/grantpub/analysis/activeAwards' , function(result){
				var temp1 = d3.select("#grantpubContainer").selectAll(".cell.child");
				for ( var i=0 , length = result._grantList.length; i< length ; i++){
					var proposalNumber = parseInt(result._grantList[i].Proposal);
					temp1.filter(function(d){return parseInt(d.Proposal)== proposalNumber}).classed("activeAnalysis",true);
				}
			});
		});
		$("#availableAnalysis").on('ifUnchecked', function(event){
			d3.select("#grantpubContainer").selectAll(".cell.child").classed("activeAnalysis",false);
		});
		
		$("#probabilityFunction").slider({
			value: 0.13,
			min: 0.01,
			max: 0.25,
			step: 0.01,
			slide: function( event, ui ) {
				analysis_threshold = ui.value;
				$("#submitBox").show();
			}
		});
		
		$("#relationYearSlider").slider({
			range: true,
			values: [2003, 2013 ],
			min: 2000,
			max: 2015,
			step: 1,
			slide: function( event, ui ) {
				$( "#relationYearText" ).text( ui.values[ 0 ] + " - " + ui.values[ 1 ] );
				analysis_begin_date = ui.values[ 0 ];
				analysis_end_date = ui.values[ 1 ];
				$("#submitBox").show();
			}
		});
		
		
		$("#grantPubSubmitButton").click(function(){
			if(analysis_selectedGrant==''){
				$("#submitBox").hide();		
				return;
			}
			updateGrantpubRelation2(analysis_selectedGrant);
			$("#submitBox").hide();		
		});
		
		$('input#treemapFilterAccepted').on('ifChecked', function(){boolFilterAccepted=true;refreshTreemaps();});
		$('input#treemapFilterAccepted').on('ifUnchecked', function(){boolFilterAccepted=false;refreshTreemaps();});
		$('input#treemapFilterClosed').on('ifChecked', function(){boolFilterClosed=true;refreshTreemaps();});
		$('input#treemapFilterClosed').on('ifUnchecked', function(){boolFilterClosed=false;refreshTreemaps();});
		$('input#treemapFilterDeclined').on('ifChecked', function(){boolFilterDeclined=true;refreshTreemaps();});
		$('input#treemapFilterDeclined').on('ifUnchecked', function(){boolFilterDeclined=false;refreshTreemaps();});
		$('input#treemapFilterOthers').on('ifChecked', function(){boolFilterOthers=true;refreshTreemaps();});
		$('input#treemapFilterOthers').on('ifUnchecked', function(){boolFilterOthers=false;refreshTreemaps();});
		
		$("#imgArrow").click(function(){
			if($("#imgArrow").hasClass('active') == true) {
			
				$("#imgArrow").removeClass('active').attr('src', '/img/arrowdown.png');
				$('#grantpubRelation').slideUp(500);
			
			}else{
				$("#imgArrow").addClass('active').attr('src', '/img/arrowup.png');
				$('#grantpubRelation').slideDown(500);
			}
		});
		
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

		rightTreemapsvg = rightTreemapviz.append("svg:g")
			.attr("id", "departmentsTreemap")
			.attr("transform", "translate(.5,.5)")
			.attr("pointer-events", "visible");
			
		
		// Start the Treemap
		constructTreemap();	
	
	}); // end of document.ready
	

	function constructTreemap () {
	
	var xpos = $('#grantpubContainer').width()/2 - $('#vizloader').width()/2-45;
	var ypos = $('#grantpubContainer').height()/2 - $('#vizloader').height()/2-70;
	$('#vizloader').css({"position":"absolute" ,"left":  xpos + "px", "top": ypos + "px","margin": "0 auto"}).show();
	
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
		}else {
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
						d3.selectAll('.cell.child').classed('highlighted', false);
						d3.selectAll('.cell.labelbar').classed('highlighted', false);
						
						//set the highlighted one
						d3.select(this).classed("highlighted",true);
						// call the related function to highlight related grants
						myData.name == "Sponsors" ? sponsorGrantClick(this) : departmentGrantClick(this);
						// create the relation layout at bottom
					})
					.on("dblclick", function(d) {
						// scroll to related area
						if($("#imgArrow").hasClass('active') == false) {
							$("#imgArrow").addClass('active').attr('src', '/img/arrowup.png');
							$('#grantpubRelation').slideDown(500 , function(){updateGrantpubRelation2(d);} );
						}else{
							updateGrantpubRelation2(d);
						}
						// 700 is grantPubRelation height
						$("html, body").animate({ scrollTop: $("#grantpubRelation").offset().top + 700 - $(window).height()}, 500);
						
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
						d3.selectAll('.cell.child').classed('highlighted', false);
						d3.selectAll('.cell.labelbar').classed('highlighted', false);
						
						//set the highlighted one
						d3.select(this).classed('highlighted',true);
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
						d3.selectAll(".cell.child").classed('highlighted',false);
						d3.selectAll(".cell.labelbar").classed('highlighted',false);
						
						//set the highlighted one
						d3.select(this).classed("highlighted",true);
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
	
	
	// create relation layout
	function constructRelation(myData , grantObject){
				
		var width = $("#grantpubRelation").width();
		var height = $("#grantpubRelation").height();

		var color = d3.scale.category20();

		// 550 is height

		d3.select("#grantpubRelation").select("svg").remove();
		var svg = d3.select("#grantpubRelation").append("svg")
			 .attr("width", width)
			 .attr("height", height)
			 .attr("id", "relationSVG");
		
		

		var graph = new Object();
		graph.nodes= new Array();
		graph.links= new Array();
		
		graph.nodes.push({"name":grantObject.RequestAmt,"name2":"","group":1,"size":50 , 'x':width/2 , 'y':275});
		
		
		for (var i = 0 ; i < myData["_relatedPublicationsList"].length; i++){
			var size = myData["_relatedPublicationsList"][i]._radius/4;
			graph.nodes.push({
				"name": "Publication",
				"name2": myData["_relatedPublicationsList"][i]._year,
				"group": 2,
				"size": size});
			graph.links.push({"source":i+1,"target":0,"value":3});
			//+(size-29)/20
		}
		var tempBeginDate = parseInt(grantObject.BeginDate.substr(0,4));
		var leftstep = (width/2-400)/(tempBeginDate-analysis_begin_date+1);
		var rightstep = (width/2-400)/(analysis_end_date-tempBeginDate+1);
		var yStep = 400 / graph.nodes.length;
		for (var i = 1 ; i < graph.nodes.length; i++){
			if (graph.nodes[i].name2 > tempBeginDate ){
				graph.nodes[i].x = (width/2)+30+ (graph.nodes[i].name2-tempBeginDate)* rightstep;
				graph.nodes[i].y = 75+ i* yStep;
			}else{
				graph.nodes[i].x = (width/2)-30 - (tempBeginDate-graph.nodes[i].name2)* leftstep;
				graph.nodes[i].y = 75 + i* yStep;
			}
			
		}
		
		var link = svg.selectAll(".relationLink")
			.data(graph.links)
		 .enter().append("line")
			.attr("class", "relationLink")
			.attr("x1", function(d) { return graph.nodes[d.source].x; })
			.attr("y1", function(d) { return graph.nodes[d.source].y; })
			.attr("x2", function(d) { return graph.nodes[d.target].x; })
			.attr("y2", function(d) { return graph.nodes[d.target].y; })
			.style("stroke-width", function(d) { return graph.nodes[d.source].size; });
		
		var tempR = 300/graph.nodes.length;
		var node = svg.selectAll(".relationNode")
			.data(graph.nodes)
			.enter().append("circle")
			.attr("class", "relationNode")
			.attr("r", function(d){return d.group==1? 50: tempR})
			.style("fill", function(d) { return d.group==1? "lightblue":"lightgreen"})
			.attr("cx", function(d) { return d.x; })
			.attr("cy", function(d) { return d.y; });
			
			
		node.append("title")
			.text(function(d) {return d.group==1? d.name: "Type: "+d.name+"\nYear: " + d.name2; });
		
		var text = svg.selectAll(".relationText").data(graph.nodes)
			.enter().append("text")
			.attr("class", "relationText")
			.attr("x", function(d){return d.x;})
			.attr("y", function(d){return d.y;})
			.attr("fill","black")
			.text(function(d){return d.group==1?d.name:"";});

	}
	
	
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
		d3.select('#rightTreemap').selectAll('.cell.child').filter(function(d){return d.Proposal == myGrant.__data__.Proposal;}).classed('highlighted', true);
	}
	function sponsorGrantClick(myGrant){
		d3.select("#leftTreemap").selectAll(".cell.child").filter(function(d){return d.Proposal == myGrant.__data__.Proposal;}).classed('highlighted', true);
	}
	function departmentDepartmentClick(myDepartment){
		d3.select("#rightTreemap").selectAll(".cell.child").filter(function(d){return d.Department == myDepartment.__data__.name;}).classed('highlighted',true)
	}
	function sponsorSponsorClick(mySponsor){
		d3.select("#leftTreemap").selectAll(".cell.child").filter(function(d){return d.Sponsor==mySponsor.__data__.name; }).classed('highlighted',true);
	}
	function sponsorProgramClick(myProgram){
		d3.select("#leftTreemap").selectAll(".cell.child").filter(function(d){return d.PgmName ==myProgram.__data__.name;}).classed('highlighted',true);
	}
	
	/*
		old code
	function updateGrantpubRelation(myGrant){
		
		// Clean keywords and add new ones:
		$("#keywordBox").empty();
		var myKeywords= myGrant.Keyword.split(",");
		for (var i=0;i<myKeywords.length;i++)
		{
			$("#keywordBox").append('<div class="keywordText active">' + myKeywords[i] + '</div>');
		}
		$(".keywordText").click(function(){
			if ($(this).hasClass("active")==true){
				$(this).removeClass("active").addClass('inactive');
			}else{
				$(this).removeClass("inactive").addClass('active');
			}
		});
		
		// show grant data :
		$("#grantTitle").text("Grant title: "+myGrant.Title);
		$("#grantAmount").text("Amount: "+myGrant.RequestAmt);
		$("#grantDepartment").text("Department: "+myGrant.Department);
		$("#grantSponsor").text("Sponsor: "+myGrant.Sponsor);
		$("#grantProgram").text("Program: "+myGrant.PgmName);
		$("#grantBeginDate").text("Begin date: "+myGrant.BeginDate);
		$("#grantEndDate").text("End date: "+myGrant.EndDate);
	
		// TODO: add investigators
		
		// check if selected grant is accepted or not
		$("#notAcceptedGrant").hide();
		if (!(myGrant.ProposalStatus == "Accepted" || myGrant.ProposalStatus == "Closed")){
			$("#notAcceptedGrant").show();
			$("#relationSVG").hide();
			// set years to 0-0
			$("#relationYearSlider").slider({
				range: true,
				values: [0, 0 ],
				min: 0,
				max: 0,
				step: 0,
			});			
			$( "#relationYearText" ).text("0 - 0");
			return;
		}
		$("#relationSVG").show();
		
		// set years
		var startYear = myGrant.BeginDate.substring(0,4)-5;
		var endYear = parseInt(myGrant.EndDate.substring(0,4))+5;
		$( "#relationYearText" ).text( startYear + " - " + endYear );
		$("#relationYearSlider").slider({
			range: true,
			values: [startYear, endYear ],
			min: startYear,
			max: endYear,
			step: 1,
			slide: function( event, ui ) {
				$( "#relationYearText" ).text( ui.values[ 0 ] + " - " + ui.values[ 1 ] );
				// TODO: update relation graph
			}
		});
			
		// TODO: show progress bar
		// TODO: call arman function

	}
	*/
	
	// temp function just for making screenshots - hide confidential informations
	function updateGrantpubRelation2(grantObject){
		
		analysis_selectedGrant = grantObject;
		// now we request for analysis fucntion
		var requestText = '/grantpub/analysis/';
		requestText += grantObject.Proposal + '/';
		requestText += JSON.stringify(analysis_keyword_filter_inactive) + '/';
		requestText += JSON.stringify(analysis_name_filter_inactive) + '/';
		requestText += analysis_begin_date + '/';
		requestText += analysis_end_date + '/';
		requestText += analysis_threshold + '/';
		requestText += analysis_kernel_selection +'/';
		requestText += analysis_algorithm_selection;
		
		$.get(requestText, function(result) {
			
			// Clean grant keywords and add new ones:
			$("#grantKeywordBox").empty();
			var grantKeywords = grantObject.Keyword.split(' ');
			for (var i=0;i< grantKeywords.length;i++){
				$("#grantKeywordBox").append('<div class="boxParagraph">' + grantKeywords[i] + '</div>');
			}
			// Clean pub keywords and add new ones;
			$("#pubKeywordBox").empty();
			var tempKeywords = result['_addedKeywordsList'];
			var tempLength = result['_addedKeywordsList'].length;
			if ( tempLength > 10){
				tempKeywords = result['_addedKeywordsList'].slice(tempLength-10,tempLength+1);
			}
			analysis_keyword_filter_filter=[];
			for (var i=0;i< tempKeywords.length;i++)
			{
				analysis_keyword_filter.push(tempKeywords[i].word);
				$("#pubKeywordBox").append('<div class="keywordText pub active">' + tempKeywords[i].word + '</div>');
			}
			// inactive pubs
			analysis_keyword_filter_inactive=result["_inactiveKeywordsList"];
			for (var i=0;i< result["_inactiveKeywordsList"].length;i++)
			{
				$(".keywordText.pub.active:contains('"+ result["_inactiveKeywordsList"][i] +"')").removeClass("active").addClass("inactive");
			}
			
			// Clean authors and add new ones;
			$("#authorBox").empty();
			analysis_name_filter = result["_coAuthorsList"];
			for (var i=0;i< result["_coAuthorsList"].length;i++)
			{
				$("#authorBox").append('<div class="keywordText author active">' + result["_coAuthorsList"][i] + '</div>');
			}
			// inactive authors
			analysis_name_filter_inactive = result['_inactiveCoAuthorsList'];
			for (var i=0;i< result["_inactiveCoAuthorsList"].length;i++)
			{
				$(".keywordText.author.active:contains('"+ result["_inactiveCoAuthorsList"][i] +"')").removeClass("active").addClass("inactive");
			}
			
			// TODO: handle add or remove to arrays
			// add onclick event (toggle active - inactive )
			$(".keywordText.pub , .keywordText.author ").click(function(){
				$("#submitBox").show();
				if ($(this).hasClass("active")==true){
					$(this).removeClass("active").addClass('inactive');
				}else{
					$(this).removeClass("inactive").addClass('active');
				}
			});
			
			// show grant data :
			$("#grantTitle").text("Title: "+grantObject.Title);
			$("#grantAmount").text("Amount: "+grantObject.RequestAmt);
			$("#grantInvestigator").text("Investigator(s): " + grantObject.PI + ' - ' + grantObject.CoI);
			$("#grantDepartment").text("Department: "+grantObject.Department);
			$("#grantSponsor").text("Sponsor: "+grantObject.Sponsor);
			$("#grantProgram").text("Program: "+grantObject.PgmName);
			$("#grantBeginDate").text("Begin date: "+grantObject.BeginDate);
			$("#grantEndDate").text("End date: "+grantObject.EndDate);
			
			// set years
			/*
			var startYear = myData["beauchemin_grant_data"].BeginDate.substring(0,4)-5;
			var endYear = parseInt(myData["beauchemin_grant_data"].EndDate.substring(0,4))+5;
			$( "#relationYearText" ).text( startYear + " - " + endYear );
			$("#relationYearSlider").slider({
				range: true,
				values: [startYear, endYear ],
				min: startYear,
				max: endYear,
				step: 1,
				slide: function( event, ui ) {
					//show submit button
					$("#submitBox").show();
					$( "#relationYearText" ).text( ui.values[ 0 ] + " - " + ui.values[ 1 ] );
					
				}
			});
			*/
			constructRelation(result, grantObject);
		});
	} // end of updateGrantpubRelation2
	
}()); // end of GRANTPUB