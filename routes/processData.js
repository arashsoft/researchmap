var csv = require('csv');
var fs = require('fs');
var util = require('util');
var _ = require('underscore');
var $ = require('jquery');
var async = require('async'); 
var d3 = require('d3');
var couchdb = require('felix-couchdb'),
  client = couchdb.createClient(5984, 'localhost'),
  db = client.db('test'),
  db2 = client.db('researchmap');

//vars for the processing
var science = [];
var grants = [];
var supervisors = [];
var publications = [];
//var grant_data = [];
var publications_science = [];
var links_science = [];
//var grants = {};
var sankeyData = {"nodes":[], "links": []};
var sankeyDataDepartments = {"nodes":[], "links": []};
var grantDepartments = []; //array of unique departments
var grantSponsors = []; //array of unique sponsors
var proposalStatuses = []; //array of unique proposal statuses
var awardStatuses = []; //array of unique award statuses
var grantsUnique = [];
var grantYears = [];
var departmentProposals = {};


exports.full = function(req, res) {
	var headers = [];

	//check if the database exists yet
	//if no, create it
	//if yes, delete the database and then create it -- this is for development purposes only!
	db2.exists(function(err,exists){
		  if (!exists) {
		    db2.create();
		    console.log('Database created.');
		  } 
		  else {
		  	async.series(
		  		[
		  		function(callback){
		  			db2.remove();
		  			callback(null, 'Database removed');
		  		},
		  		function(callback){
		  			db2.create();
		    		callback(null, 'Database recreated.');
		  		}
		  		],
		  		//callback
		  		function(err, results){
		  			if (err)
		 				res.send("ERROR on " + results + ": " + JSON.stringify(err));
		 			else {
		 				//pass the response object to the function;
		 				process3(res);
		  			}
		  		}
		  	);//end async.series
		  }
	});//end of initial db operations
}


function process3 (res) {
	console.log("");
	console.log("vvvvv---------------     Reading data from CSV files...    ---------------vvvvv");
	console.log("");
	async.series(
		[
			//for the faculty data
			function(callback){
				csv()
					.from.stream(fs.createReadStream('./data/Science_Faculty.csv'))
					.on('record', function(row,index){
						var temp = {};
						  if (index == 0){
						  	headers = row;
						  }
						  else{
							  for (i=0; i<row.length; i++){
							  	temp[headers[i]] = row[i];
							  }
								science.push(temp);
							}
					})
					.on('end', function(count){
					  db2
			  			.saveDoc('unprocessed_data', {'science_faculty_data': science}, function(er, ok) {
			    		if (er) throw new Error(JSON.stringify(er));
			    		util.puts('Saved science_faculty_data to the database.');
						callback(null, science);		    		
			  			});
					})
					.on('error', function(error){
						callback(error.message, 'Science_Faculty.csv')
					 });
			},

			//for the ROLA data
			function(callback){
				console.log("getting ready to read in grant data...")
				csv()
					.from.stream(fs.createReadStream('./data/ROLA.csv'))
					.on('record', function(row,index){
						var temp = {};
						  if (index == 0){
						  	headers = row;
						  }
						  else{
							  for (i=0; i<row.length; i++){
							  	temp[headers[i]] = row[i];
							  }
								grants.push(temp);
							}
					})
					.on('end', function(count){
						db2.getDoc('unprocessed_data', function(err, doc){
							doc.grant_data = grants;
							db2.saveDoc('unprocessed_data', doc, function(er, ok){
					    		if (er) throw new Error(JSON.stringify(er));
					    		util.puts('Saved grants to the database.');
					    		callback(null, grants);
							});
			  			});
					})
					.on('error', function(error){
						callback(error.message, 'ROLA.csv')
					 });
			},

			//for the supervisor data
			function(callback){
				csv()
					.from.stream(fs.createReadStream('./data/Supervisors.csv'))
					.on('record', function(row,index){
						var temp = {};
						  if (index == 0){
						  	headers = row;
						  }
						  else{
							  for (i=0; i<row.length; i++){
							  	temp[headers[i]] = row[i];
							  }
								supervisors.push(temp);
							}
					})
					.on('end', function(count){
						db2.getDoc('unprocessed_data', function(err, doc){
							doc.supervisor_data = supervisors;
							db2.saveDoc('unprocessed_data', doc, function(er, ok){
					    		if (er) throw new Error(JSON.stringify(er));
					    		util.puts('Saved supervisor_data to the database.');
					    		callback(null, supervisors);
							});
						});
					})
					.on('error', function(error){
						callback(error.message, 'Supervisors.csv')
					 });
			},

			//for the publication data
			function(callback){
				csv()
					.from.stream(fs.createReadStream('./data/Pubs.csv'), {escape: '\\'})
					.on('record', function(row,index){
						var temp = {};
						  if (index == 0){
						  	headers = row;
						  }
						  else{
							  for (i=0; i<row.length; i++){
							  	temp[headers[i]] = row[i];
							  }
								publications.push(temp);
							}
					})
					.on('end', function(count){
						db2.getDoc('unprocessed_data', function(err, doc){
							doc.publication_data = publications;
							db2.saveDoc('unprocessed_data', doc, function(er, ok){
								if (er) throw new Error(JSON.stringify(er));
			    				util.puts('Saved pubs to the database.');
			    				callback(null, publications);
							});
						});
					})
					.on('error', function(error){
						callback(error.message, 'Pubs.csv')
					 });
			}
			],

		//callback from async.parallel
		 function (err, results){
		 	if (err){
		 		console.log("ERROR on " + results + ": " + JSON.stringify(err));
		 		res.send("ERROR on " + results + ": " + JSON.stringify(err));}
		 	else {
		 		console.log("");			 			 			 		
		 		console.log("^^^^^------- All CSV data read and saved to database successfully -------^^^^^");
		 		process2(res, results);
		 	}
		 });//end async.parallel	
}


function process2 (res, results) {
	console.log("");
	console.log("vvvvv------------------        Processing data...        ------------------vvvvv");
	console.log("");
	//separate the results array into its 4 objects
	science_faculty_data = results[0];
	grant_data = results[1];
	supervisor_data = results[2];
	publication_data = results[3];

	async.series(
	 	[
	 		function(callback){	 	
	 			async.series(
	 				[
		 				function(callback){
		 					async.series(
		 						[
		 						function(callback){
								 	//extract some unique properties from the faculty list data
							 		departmentsUnique = _.uniq(_.pluck(science_faculty_data, 'Department'));
									namesUnique = _.uniq(_.pluck(science_faculty_data, 'Name'));
									ranksUnique = _.uniq(_.pluck(science_faculty_data, 'Rank'));
									contractsUnique = _.uniq(_.pluck(science_faculty_data, 'Contract'));
									yearsUnique = _.uniq(_.pluck(publication_data, 'Rank'));
									callback(null);
		 						},
		 						function(callback){
									//get rid of some unwanted entries
					  				yearsUnique = _.reject(yearsUnique, function(year){ return year == "" || year == "Year"; });
					  				callback(null);
		 						}
		 						],
		 						//callback
		 						function(err){
		 							callback(null);	 					
		 						}
		 					);
		 				}
	 				],

	 				//callback
	 				function(err){
	 					var desc = "This document contains a number of flat lists (arrays) that have been extracted from the data read in from the csv files.";
		  				db2
		  					.saveDoc('processed_data', {
		  						'lists': {desc: desc, 
		  							departments: departmentsUnique, 
			  						science_names: namesUnique,
			  						science_ranks: ranksUnique,
			  						science_contracts: contractsUnique,
			  						publication_years: yearsUnique
		  							}}, 
		  						function(er, ok) {
		  						if (er) throw new Error(JSON.stringify(er));
					    		util.puts('Saved lists to the database.');
					    		callback(null, null);
		  					});
	 				}
	 			);
						
			}, //end first function

			function(callback){
				async.series(
					[
						function(callback){
						  	for (row_num in publication_data) {
						    	authors = publication_data[row_num].Authors;
						    	autharr = authors.split("; "); //make sure to include the space

							    for (author_num in autharr){
							      var surname = autharr[author_num].substring(0, autharr[author_num].indexOf(' ') + 2); //surname and first initial

							      for (i in namesUnique){
							        //extract the surname and the first initial
							        //e.g., "Lastname,Firstname MiddleInitial" will become "Lastname FirstInitial"
							        var surname2 = namesUnique[i].substring(0,namesUnique[i].indexOf(',')) + " " + namesUnique[i].substring(namesUnique[i].indexOf(',') + 1, namesUnique[i].indexOf(',') + 2); 

							        //extract surname only
							        //var surname2 = science_faculty_members_unique[i].substring(0,science_faculty_members_unique[i].indexOf(','));
							        
							        if (surname == surname2){ //we have a match
							          //add the whole row to a new array that keeps track of the pubs with an author from science faculty
							          publications_science.push(publication_data[row_num]);
							        }
							      } //end members   
							    } //end authors
							    if (row_num == publication_data.length-1)
							    	callback(null, publications_science)
						  	}	
						}
					],
					//callback
						function(err, result){
							var publications_science = result[0];
							db2.getDoc('processed_data', function(err, doc){
								doc.publications_science = publications_science;
								db2.saveDoc('processed_data', doc, function(er, ok){
							  		if (er) throw new Error(JSON.stringify(er));
						    		util.puts('Saved science publication data to the database.');
						    		callback(null, publications_science);					
								});
							});		
						}
				);//end async.series	
			}, //end second function

			function(callback){
				var co_supervision = [];
	 			async.series(
	 				[
		 				//co-supervision 
		 				function(callback){
		 					var sorted = _.sortBy(supervisor_data, function(d) { return d.StudentName; } );
							var currentStudent = "";
							var previousStudent = "";
							var currentSupervisor = "";
							var previousSupervisor = "";
							var temp = _.each(sorted, function(key, value){
								currentStudent = key.StudentName;
								currentSupervisor = key.SupervisorName;
								if (currentStudent == previousStudent){
									co_supervision.push([currentSupervisor, previousSupervisor]);
								}
								//update for the next loop through
								previousSupervisor = key.SupervisorName;
								previousStudent = key.StudentName;
							});
							callback(null);
						},

	 					function(callback){
							//construct the links for the co-supervision data
							links_co_supervision = [];
							links_co_supervision_converted = [];
							_.each(co_supervision, function(element){
								var source = element[0];
								var target = element[1];
								links_co_supervision.push({"source":source, "target":target, "value":1, "type":"cosup"});
								links_co_supervision_converted.push({"source":source, "target":target, "value":1, "type":"cosup"});
							});

							//construct the "links" array to be used in the networkviz.
							//goes through publications_science that was constructed above
							for(row_num2 in publications_science){
							    authors2 = publications_science[row_num2].Authors;
							    autharr2 = authors2.split("; ");
							    pubyear = parseInt(publications_science[row_num2].Year);

							    for (author_num2 in autharr2){
							      var source = autharr2[author_num2].substring(0, autharr2[author_num2].indexOf(' ') + 2);

							      if (source != autharr2[autharr2.length-1].substring(0, autharr2[author_num2].indexOf(' ') + 2)) { //if source is not the last one in the array

							        var counter = 1;//use to keep track of the target index
							        do {
							          var ind = parseInt(author_num2) + counter;
							          var target = autharr2[ind].substring(0, autharr2[ind].indexOf(' ') + 2);
							          ////check for duplicates////
							          //var instances = 0;
							          //check if already exists...instances += numDuplicates;
							          links_science.push({"source":source, "target":target, "value":0, "year":pubyear, "type":"pub"});

							          counter += 1;
							        } while ((target != autharr2[autharr2.length-1].substring(0, autharr2[author_num2].indexOf(' ') + 2)) && ((counter + author_num2) < autharr2.length)); //while target is not the last element and we don't go out of bounds
							      } // end if

							      //base case:one author...don't need to add it

							    }//end inner for 
							    if (row_num2 == publications_science.length-1)
							    	callback(null); 
							}//end outer for
						},

						function(callback){
							var links = _.toArray(links_co_supervision);
							_.each(links, function(element1, index1){
								_.each(science_faculty_data, function(element2, index2){
									if(element1.source == element2.Name)
										links_co_supervision_converted[index1].source = parseInt(index2);
									if(element1.target == element2.Name)
										links_co_supervision_converted[index1].target = parseInt(index2);
								});
							});

							  //need to convert the links_science array so that the source and target refer to elements in the science array rather than to names...this is how d3 needs it
							  for (link in links_science){
							    //go through the faculty list
							    for (element in science){
							      //checks if the source and target are the same as a faculty member...name has to be normalized first so it is "Lastname Firstinitial" so that they can be compared
							      if (links_science[link].source == (science[element].Name.substring(0,science[element].Name.indexOf(',')) + " " + science[element].Name.substring(science[element].Name.indexOf(',')+1,science[element].Name.indexOf(',')+2))) {
							          //set the source to be the index of the element ("element" in this case)
							          links_science[link].source = parseInt(element);
							      }
							      if (links_science[link].target == (science[element].Name.substring(0,science[element].Name.indexOf(',')) + " " + science[element].Name.substring(science[element].Name.indexOf(',')+1,science[element].Name.indexOf(',')+2))) {
							        //set the target to be the index of the element ("element" in this case)
							        links_science[link].target = parseInt(element);
							        }
							    }//end inner for
							    if (link == links_science.length-1)
							    	callback(null);
							  }//end outer for
						}
		  			],

		  			//callback
		  			function(err){
		  				async.series(
		  					[
			  					function(callback){
			  						async.series([
			  							function(callback){
					  						//remove all links that are not between authors within science at western--i.e., remove all outside/non-faculty links--and store in links_science_exclusive
									  		links_science_exclusive = _.filter(links_science, function(n) { return _.isNumber(n.source) && _.isNumber(n.target); });
									  		links_for_network = _.filter(links_science, function(n) { return _.isNumber(n.source) && _.isNumber(n.target); });
									  		links_co_supervision_converted = _.filter(links_co_supervision_converted, function(n) { return _.isNumber(n.source) && _.isNumber(n.target); });
									  		db2.saveDoc('links_co_supervision_converted', {data:links_co_supervision_converted}, function(er, ok){
			  									if (er) throw new Error(JSON.stringify(er));
			  									util.puts('Saved links_co_supervision_converted to the database.');
			  									db2.saveDoc('links_for_network', {data: links_for_network}, function(er, ok){
			  										if (er) throw new Error(JSON.stringify(er));
			  										util.puts('Saved links_for_network to the database.');	
			  										callback(null);		  										
			  									});
			  								});
			  							},

			  							//combine duplicate links
			  							function(callback){
			  								links_science_exclusive_unique = getUniqueLinks(links_science_exclusive);
									  		links_for_network = getUniqueLinks(links_science_exclusive);
									  		callback(null);	
			  							}
			  							],

			  							//callback
			  							function(err){
			  							  callback(null);	
			  							})
			  					},

			  					function(callback){
			  						//has to be series rather than parallel to avoid update conflicts
			  						async.series(
			  							[
			  								function(callback){
			  									//for the first entry in viz_data
			  									db2
		  										.saveDoc('viz_data',
		  											{'co_author_by_name': links_science}, function(er, ok){
			  											if (er) throw new Error(JSON.stringify(er));
										    			util.puts('Saved links publication data to the database.');
										    			callback(null);
			  										});
			  								},
			  								function(callback){
			  									db2.getDoc('viz_data', function(err, doc){
			  										doc.links_science_exclusive = links_science_exclusive;
			  										db2.saveDoc('viz_data', doc, function(er, ok){
			  											if (er) throw new Error(JSON.stringify(er));
										    			util.puts('Saved links publication data to the database.');
										    			callback(null);
			  										});
			  									});
			  								},
			  								function(callback){
			  									db2.getDoc('viz_data', function(err, doc){
			  										doc.links_science_exclusive_unique = links_science_exclusive_unique;
			  										db2.saveDoc('viz_data', doc, function(er, ok){
			  											if (er) throw new Error(JSON.stringify(er));
										    			util.puts('Saved links publication data to the database.');
										    			callback(null);
			  										});
			  									});
			  								},
			  								function(callback){
			  									db2.getDoc('viz_data', function(err, doc){
			  										doc.links_for_network = links_for_network;
			  										db2.saveDoc('viz_data', doc, function(er, ok){
			  											if (er) throw new Error(JSON.stringify(er));
										    			util.puts('Saved links publication data to the database.');
										    			callback(null);
			  										});
			  									});
			  								}				  											  											  								
			  							],
			  							//callback
			  							function(err){
			  								callback(null);
			  							}
			  						);
			  					}
		  					],

		  					//callback
		  					function(err){
		  						callback(null, links_science_exclusive_unique);
		  					}
		  				);//end async.series
		  			}	
				);//end async.series
			},//end third function

			//prepare grant data
			function (callback){
	 			async.series(
	 				[
	 					function(callback){
							grantDepartments = _.uniq(_.pluck(grant_data, 'Department'));
							proposalStatuses = _.uniq(_.pluck(grant_data, 'ProposalStatus'));
							awardStatuses = _.uniq(_.pluck(grant_data, 'AwardStatus'));
							grantSponsors = _.uniq(_.pluck(grant_data, 'Sponsor'));
							grantYearRangeBegin = _.pluck(grant_data, 'BeginDate');
							grantYearRangeEnd = _.pluck(grant_data, 'EndDate');
							//console.log("********");
							//console.log(grantYearRangeBegin);
							//console.log(grantYearRangeEnd);

							//loop through each entry (row) in the dataset
							async.eachSeries(grant_data, function(){
								for (entry in grant_data) {
									var proposalID = parseFloat(grant_data[entry].Proposal);

									//if proposalID already exists in grants
									if (typeof grants[proposalID] == "object"){
										var tempcounter = 0.01;
										//while the appended proposal exists, add another number to the key
										while (typeof grants[parseFloat(proposalID) + tempcounter] == "object")
											tempcounter += 0.01;

										proposalID = proposalID + tempcounter;
									}

									//prepare the new entry
									grants[proposalID] = {};

									//populate the new entry with the data
									//these fields have to be renamed in the csv file
									//e.g., ROLA will output "Principal Investigator", but here is it expecting "PI"
									grants[proposalID]["PI"] = grant_data[entry].PI;
									grants[proposalID]["CoI"] = grant_data[entry].CoI;
									grants[proposalID]["Role"] = grant_data[entry].Role;
									grants[proposalID]["DeptID"] = grant_data[entry].DeptID;
									grants[proposalID]["Department"] = grant_data[entry].Department;
									grants[proposalID]["Proposal"] = grant_data[entry].Proposal;
									grants[proposalID]["AwardID"] = grant_data[entry].AwardID;
									grants[proposalID]["Title"] = grant_data[entry].Title;
									grants[proposalID]["Created"] = grant_data[entry].Created;
									grants[proposalID]["Deadline"] = grant_data[entry].Deadline;
									grants[proposalID]["Type"] = grant_data[entry].Type;
									grants[proposalID]["ProposalStatus"] = grant_data[entry].ProposalStatus;
									grants[proposalID]["AwardStatus"] = grant_data[entry].AwardStatus;
									grants[proposalID]["BeginDate"] = grant_data[entry].BeginDate;
									grants[proposalID]["EndDate"] = grant_data[entry].EndDate;
									grants[proposalID]["IndirectCosts"] = grant_data[entry].IndirectCosts;
									grants[proposalID]["IndirectCostPercent"] = grant_data[entry].IndirectCostPercent;
									grants[proposalID]["MatchingFunds"] = grant_data[entry].MatchingFunds;
									grants[proposalID]["PartnerContrib"] = grant_data[entry].PartnerContrib;
									grants[proposalID]["RequestAmt"] = grant_data[entry].RequestAmt;
									grants[proposalID]["Sponsor"] = grant_data[entry].Sponsor;
									grants[proposalID]["PgmName"] = grant_data[entry].PgmName;
									grants[proposalID]["CompName"] = grant_data[entry].CompName;
									grants[proposalID]["Keyword"] = grant_data[entry].Keyword;
								}//end loop through grant_data
							}, callback(null, grants));
						},

						function(callback){
							$.each(grants, function(k,v){
								if (k % 1 == 0){
									grantsUnique.push(v);
								}
							}, callback(null, grants));
						}
					],

					//callback
					function (err, results) {
						//has to be series rather than parallel to avoid update conflicts
						async.series(
							[
								function(callback){
									db2.getDoc('processed_data', function(err, doc){
										//doc.lists.grants_unique = grantsUnique;
										doc.lists.grant_sponsors = grantSponsors;
										doc.lists.grant_departments = grantDepartments;
										doc.lists.proposal_statuses = proposalStatuses;
										doc.lists.award_statuses = awardStatuses;
										doc.lists.grant_year_range_begin = grantYearRangeBegin;
										doc.lists.grant_year_range_end = grantYearRangeEnd;
										db2.saveDoc('processed_data', doc, function(er, ok){
					  						if (er) throw new Error(JSON.stringify(er));
								    		util.puts('Saved unique grants data to the database.');
								    		callback(null);										
										});
									});
				  				},
				  				function(callback){
									db2.getDoc('processed_data', function(err, doc){
										doc.grants_not_unique = grants;
										db2.saveDoc('processed_data', doc, function(er, ok){
					  						if (er) throw new Error(JSON.stringify(er));
								    		util.puts('Saved unique grants (not unique) data to the database.');
								    		callback(null);										
										});
									});				  					
				  				}
				  			],
				  			//callback
				  			function(err){
				  				if (err)
				  					console.log(JSON.stringify(err));
				  				callback(null, grantsUnique);
				  			}
				  		);//end async.series
  					}
  				);//end async.series	  						
			},//end fourth function

			//prepare Sankey data
			function(callback){
				//populate the "nodes" with the data (here it is hardcoded. it is assumed future data will have the same fields)
				sankeyData["nodes"].push({"name":"Proposal"});
				sankeyData["nodes"].push({"name":"Accepted"});
				sankeyData["nodes"].push({"name":"Declined"});
				sankeyData["nodes"].push({"name":"Inst. Approval"});
				sankeyData["nodes"].push({"name":"Pending Approval"});
				sankeyData["nodes"].push({"name":"Draft"});
				sankeyData["nodes"].push({"name":"Withdrawn"});
				sankeyData["nodes"].push({"name":"Award Pending"});
				sankeyData["nodes"].push({"name":"Accepted"});
				sankeyData["nodes"].push({"name":"Closed"});

				//these are the counts, which end up dictating the width of the links
				var targetAccepted = 0;
				var targetDeclined = 0;
				var targetIApproved = 0;
				var targetPA = 0;
				var targetDraft = 0;
				var targetWithdrawn = 0;
				var targetAP = 0;
				var targetAcc = 0;
				var targetClosed = 0;


				//loop through each entry
				//the function receives the key and the value 
				$.each(grants, function(k, v){
					//don't want to count duplicates (e.g., keys 681, 681.01, etc...)
					//e.g., 681.01 will not be true in the conditional below
					if (k % 1 == 0){
						var accepted = false; //for the second switch statement
						switch(this.ProposalStatus) {
							case "Accepted":
								accepted = true;
								targetAccepted += 1;
								break;
							case "Declined":
								targetDeclined += 1;
								break;				
							case "Inst. Approved":
								targetIApproved += 1;
								break;
							case "Pending Approval":
								targetPA += 1;
								break;				
							case "Draft":
								targetDraft += 1;
								break;
							case "Withdrawn":
								targetWithdrawn += 1;
								break;
							default: //for debugging...should throw an error if executed
								target = 100000;
								break;
						}					


						//if the proposal was accepted, add another link that shows what happened from there
						if (accepted){
							switch(this.AwardStatus) {
								case "Award Pending":
									targetAP += 1; //update target to reflect the new target
									break;
								case "Accepted":
									targetAcc += 1;
									break;
								case "Closed":
									targetClosed += 1;
									break;
								default: //for debugging...should throw an error if executed
									target = 100001;
									break;
							}
						}
					}
				});

				//for proposal status
				//source just indicates the existence of the proposal (all proposals exist)
				//target indicates the proposal status
				//value is what has been calculated in the switch statement above
				sankeyData["links"].push({ "source":0, "target":1, "value":targetAccepted });
				sankeyData["links"].push({ "source":0, "target":2, "value":targetDeclined });
				sankeyData["links"].push({ "source":0, "target":3, "value":targetIApproved });
				sankeyData["links"].push({ "source":0, "target":4, "value":targetPA });
				sankeyData["links"].push({ "source":0, "target":5, "value":targetDraft });
				sankeyData["links"].push({ "source":0, "target":6, "value":targetWithdrawn });

				//for those that got accepted
				//source is accepted (1)
				//target indicates award status 
				sankeyData["links"].push({ "source":1, "target":7, "value":targetAP });
				sankeyData["links"].push({ "source":1, "target":8, "value":targetAcc });
				sankeyData["links"].push({ "source":1, "target":9, "value":targetClosed });

				//the next 5 are simply placeholders
				//their value is set in such a way that the links won't show up
				sankeyData["links"].push({ "source":2, "target":8, "value":0.1 });
				sankeyData["links"].push({ "source":3, "target":8, "value":0.1 });
				sankeyData["links"].push({ "source":4, "target":8, "value":0.1 });
				sankeyData["links"].push({ "source":5, "target":8, "value":0.1 });
				sankeyData["links"].push({ "source":6, "target":8, "value":0.1 });


				db2
				.getDoc('viz_data', function(err, doc){
					doc.sankey_data_faculty = sankeyData;
					db2.saveDoc('viz_data', doc, function(er, ok){
						if (er) throw new Error(JSON.stringify(er));
	    				util.puts('Saved sankey faculty data to the database.');
	    				callback(null);
					});
				});	  					
			},//end fifth function

			function(callback){
				//populate the 'nodes' array with the departments
				grantDepartments.forEach (function(element) {
					sankeyDataDepartments["nodes"].push({"name":element});
				});

				//add to the "nodes" with the data (here it is hardcoded. it is assumed future data will have the same fields)
				sankeyDataDepartments["nodes"].push({"name":"Proposal"});
				sankeyDataDepartments["nodes"].push({"name":"Accepted"});
				sankeyDataDepartments["nodes"].push({"name":"Declined"});
				sankeyDataDepartments["nodes"].push({"name":"Inst. Approved"});
				sankeyDataDepartments["nodes"].push({"name":"Pending Approval"});
				sankeyDataDepartments["nodes"].push({"name":"Draft"});
				sankeyDataDepartments["nodes"].push({"name":"Withdrawn"});
				sankeyDataDepartments["nodes"].push({"name":"Award Pending"});
				sankeyDataDepartments["nodes"].push({"name":"Accepted"});
				sankeyDataDepartments["nodes"].push({"name":"Closed"});	

				//populate the object that will keep track of all of the target to source possibilities
				//e.g., computer science-->accepted, computer science-->declined, chemistry-->accepted, etc. 
				grantDepartments.forEach (function (element) {
					departmentProposals[element + "_Accepted"] = 0;
					departmentProposals[element + "_Declined"] = 0;
					departmentProposals[element + "_Inst. Approved"] = 0;
					departmentProposals[element + "_Pending Approval"] = 0;
					departmentProposals[element + "_Draft"] = 0;
					departmentProposals[element + "_Withdrawn"] = 0;
				});

				//loop through each grant entry
				//function parameters are key (k) and value (v)
				$.each(grants, function(k, v){
				 	//don't want to count duplicates (e.g., keys 681, 681.01, etc...)
				 	//e.g., 681.01 will not be true in the conditional below
					if (k % 1 == 0){
						switch (this.ProposalStatus) {
							case "Accepted":
								departmentProposals[this.Department + "_Accepted"] += 1;
								break;
							case "Declined":
								departmentProposals[this.Department + "_Declined"] += 1;
								break;				
							case "Inst. Approved":
								departmentProposals[this.Department + "_Inst. Approved"] += 1;
								break;
							case "Pending Approval":
								departmentProposals[this.Department + "_Pending Approval"] += 1;
								break;				
							case "Draft":
								departmentProposals[this.Department + "_Draft"] += 1;
								break;
							case "Withdrawn":
								departmentProposals[this.Department + "_Withdrawn"] += 1;
								break;
							default: //for debugging...should throw an error if executed
								target = 100000;
								break;				
						}//end switch
					}//end if
				});

				$.each(departmentProposals, function (k, v) {
					//get the department name
					var tempDep= k.substr(0, k.indexOf('_'));
					var tempStatus= k.substr(k.indexOf('_') + 1);		

					//get the number that corresponds to the department name
					var source = getCorrNum(tempDep, sankeyDataDepartments.nodes);
					//get the number that corresponds to the proposal status
					var target = getCorrNum(tempStatus, sankeyDataDepartments.nodes);

					sankeyDataDepartments["links"].push({ "source":source, "target":target, "value":v });
				});

				db2.getDoc('viz_data', function(err, doc){
					doc.sankey_data_departments = sankeyDataDepartments;
					db2.saveDoc('viz_data', doc, function(er, ok){
						 if (er) throw new Error(JSON.stringify(er));
			    		util.puts('Saved sankey data departments to the database.');
			    		callback(null, sankeyDataDepartments);
					});
				});  	  					
			},//end sixth function

			function(callback){
				async.series(
					[
					function(callback){
						nested_by_sponsor = d3.nest()
						    .key(function(d) { return d.Sponsor; })
						    .key(function(d) { return d.PgmName; })
						    .entries(grantsUnique);
						callback(null);
					},

					function(callback){
						nested_by_department = d3.nest()
						    .key(function(d) { 
						    	return d.Department; })	
						    //.key(function(d) { return d.Sponsor; })
						    //.key(function(d) { return d.PgmName; })
						    .entries(grantsUnique);
						callback(null);
					},

					function(callback){
						//reformat the data so it is in the format that d3's algorithms are expecting
			    		reformat(nested_by_sponsor); 
			    		reformat(nested_by_department);
			    		callback(null);
					},

					function(callback){
					    //add the roots to these
					    nested_by_department = {name:"Departments", children:nested_by_department}; 
					    nested_by_sponsor = {name:"Sponsors", children:nested_by_sponsor};
					    callback(null);
					}
					],

					//callback
					function(err){
						db2.getDoc('viz_data', function(err, doc){
							doc.treemap_data = {'nested_by_sponsor': nested_by_sponsor, 'nested_by_department': nested_by_department };
							db2.saveDoc('viz_data', doc, function(er, ok){
								if (er) throw new Error(JSON.stringify(er));
					    		util.puts('Saved tremap data departments to the database.');
					    		callback(null, nested_by_department);	
							});
						});	
					}
				);//end async.series
			}//end seventh function
	 	],

		//callback
		function(err, results){
		 	if (err)
		 		res.send("ERROR on " + results + ": " + JSON.stringify(err));
		 	else{
		 		//send a message to the client
		 		console.log("");
		 		console.log("^^^^^------- All data processed and saved to database successfully -------^^^^^");
		 		res.send("All data sucessfully loaded, processed, and saved to the database.");
		 	}
		}
	);//end async.series
}//end process2

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

//takes a string name and returns the corresponding number
//name: string
//sourceList: array
function getCorrNum (name, sourceList) {
	var temp;
	sourceList.forEach (function (element, index) {
		if (name == element.name){
			temp = index;
		}
	});
	return temp;

}//end getCorrNum

//recursively takes an array that has been created with d3.nest and reformats the array
//so that the 'key' is changed to 'name' and 'values' is changed to 'children'
//this is necessary for d3's layouts, which internally require those names
//@param: data: an array of nested objects that was created using d3.nest(). e.g., nested_by_sponsor
//$return: nothing
function reformat(data){
	//this is true for the root
	if (_.isArray(data)) {
	    for(var i = 0; i < data.length; i++){
		    while (data[i].values[0].values != undefined) { //i.e., there are "children"
		    	reformat(data[i].values);
			}
		
		data[i].children = data[i]['values'];
		data[i].name = data[i]['key'];
	    delete data[i].key;
		delete data[i].values;
		}  
	}
}