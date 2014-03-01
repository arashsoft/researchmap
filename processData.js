//TODO: look through file for 'TODO' statements and fix them!

/*
processData.js: This module deals with data processing on the server

It has 3 main stages:
(1) (re)create the database (exports.full)
(2) read data from multiple csv files and save it to the db (function readData)
(3) process the data and resave to the db (funciton processData)

copyright Paul Parsons 2013
*/

var csv = require('csv');
var fs = require('fs');
var util = require('util');
var _ = require('underscore');
var $ = require('jquery');
var async = require('async'); 
var d3 = require('d3');
var couchdb = require('felix-couchdb'),
  client = couchdb.createClient(5984, 'localhost'),
  db = client.db('researchmap');

//vars for the processing
var science = [];
var allfaculty =[];
var grants = [];
var supervisors = [];
var publications = [];
//var grant_data = [];
var publications_science = [];
var publications_western = [];
var links_science = [];
var links_western = [];
var links_cosupervisions = [];
var links_cosupervisions_converted = [];
var links_grants = [];
var links_grants_converted = [];
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


/*
This function checks if the database exists
If the db does not exist, it gets created
If the db does exist, it gets removed and then recreated
*/
exports.full = function(req, res) {

	//send a response back to the client
	var data = {
		maintitle: 'data processing',
	}
	res.render('processingData', data);
	
	var headers = [];

	//check if the database exists yet
	//if no, create it
	//if yes, delete the database and then create it -- this is for development purposes only!
	db.exists(function(err,exists){
		  if (!exists) {
		    db.create();
		    console.log('Database created.');
		  } 
		  else {
		  	async.series(
		  		[
		  		function(callback){
		  			db.remove();
		  			console.log('Database removed');
		  			callback(null, 'Database removed');
		  		},
		  		function(callback){
		  			db.create();
		  			console.log('Database recreated');
		    		callback(null, 'Database recreated.');
		  		}
		  		],
		  		//callback
		  		function(err, results){
		  			if (err)
		 				res.send("ERROR on " + results + ": " + JSON.stringify(err));
		 			else {
		 				//pass the response object to the function;
		 				readData(res);
		  			}
		  		}
		  	);//end async.series
		  }
	});//end of initial db operations
}

/*
This function reads data from a number of csv files that reside in the /data directory on the server:
- Science_Faculty.csv: a list of all the faculty members in science
- Western_Faculty.csv: all faculty members at Western
- Rola.csv: grant data from ROLA
- Supervisors.csv: faculty members and the graduate students that they supervise
- Pubs.csv: publications (authors, titles, outlets, affiliations, etc.)

@params: res: response object

callback checks for errors. If there are no errors, the results of the data reading are passed to the function processData
*/
function readData (res) {
	console.log("");
	console.log("Reading data from CSV files...");
	console.log("");
	async.series(
		[
			//for science faculty data
			function(callback){
				console.log("reading in science faculty data...")				
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
					  db
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

			//for all faculty data
			function(callback){
				console.log("reading in all faculty data...")				
				csv()
					.from.stream(fs.createReadStream('./data/Western_Faculty.csv'))
					.on('record', function(row,index){
						var temp = {};
						  if (index == 0){
						  	headers = row;
						  }
						  else{
							  for (i=0; i<row.length; i++){
							  	temp[headers[i]] = row[i];
							  }
								allfaculty.push(temp);
							}
					})
					.on('end', function(count){
						db.getDoc('unprocessed_data', function(err,doc){
							doc.western_faculty_data = allfaculty;
					  		db.saveDoc('unprocessed_data', doc, function(er, ok) {
			    				if (er) throw new Error(JSON.stringify(er));
			    				util.puts('Saved western_faculty_data to the database.');
								callback(null, allfaculty);		    		
			  				});
						});
					})
					.on('error', function(error){
						callback(error.message, 'Western_Faculty.csv')
					 });
			},			

			//for the ROLA data
			function(callback){
				console.log("reading in grant data...")
				csv()
					.from.stream(fs.createReadStream('./data/ROLA.txt'), { delimiter: "|" }) //this is a pipe-delimited file, created with google refine
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
						db.getDoc('unprocessed_data', function(err, doc){
							doc.grant_data = grants;
							db.saveDoc('unprocessed_data', doc, function(er, ok){
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
				console.log("reading in supervisor data...")				
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
						db.getDoc('unprocessed_data', function(err, doc){
							doc.supervisor_data = supervisors;
							db.saveDoc('unprocessed_data', doc, function(er, ok){
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
				console.log("reading in publication data...")				
				csv()
					.from.stream(fs.createReadStream('./data/Pubs.txt'), { delimiter: "|" }) //this is a pipe-delimited file, created with google refine
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
						db.getDoc('unprocessed_data', function(err, doc){
							doc.publication_data = publications;
							db.saveDoc('unprocessed_data', doc, function(er, ok){
								if (er) throw new Error(JSON.stringify(er));
			    				util.puts('Saved pubs to the database.');
			    				callback(null, publications);
							});
						});
					})
					.on('error', function(error){
						callback(error.message, ' <br><br> <h2>Error reading Pubs.csv</h2>')
					 });
			}
			],

		//callback from async.series
		 function (err, results){
		 	if (err){
		 		console.log("ERROR on " + results + ": " + JSON.stringify(err));
		 		res.send("ERROR on " + results + "Error message: " + JSON.stringify(err) + "<br>Please check the formatting of the data.");}
		 	else {
		 		console.log("");			 			 			 		
		 		console.log("All CSV data read and saved to database successfully");
		 		//res.send("All CSV data read and saved to database successfully");
		 		processData(res, results);
		 	}
		 });//end async.series	
}

/*
This funciton processes the data the was read in the readData function

@params: res: response object
		 results: an array of 5 items that are results of the data reading
*/
function processData (res, results) {
	console.log("");
	console.log("beginning data processing stage...");
	console.log("");
	//separate the results array into its 5 objects
	var science_faculty_data = results[0];
	var western_faculty_data = results[1];
	var grant_data = results[2];
	var supervisor_data = results[3];
	var publication_data = results[4];

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
							 		scienceDepartmentsUnique = _.uniq(_.pluck(science_faculty_data, 'Department'));
							 		allDepartmentsUnique = _.uniq(_.pluck(western_faculty_data, 'Department'));
									scienceNamesUnique = _.uniq(_.pluck(science_faculty_data, 'Name'));
									allNamesUnique = _.uniq(_.pluck(western_faculty_data, 'Name'));
									scienceRanksUnique = _.uniq(_.pluck(science_faculty_data, 'Rank'));
									scienceContractsUnique = _.uniq(_.pluck(science_faculty_data, 'Contract'));
									pubYearsUnique = _.uniq(_.pluck(publication_data, 'Year'));
					  				pubYearsUnique = _.reject(pubYearsUnique, function(year){ return year == "" || year == "Year"; });//TODO: see if this is useful still									
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
		  				db
		  					.saveDoc('processed_data', {
		  						'lists': {desc: desc, 
		  							science_departments: scienceDepartmentsUnique,
		  							all_departments: allDepartmentsUnique, 
			  						science_names: scienceNamesUnique,
			  						all_names: allNamesUnique,
			  						science_ranks: scienceRanksUnique,
			  						science_contracts: scienceContractsUnique,
			  						publication_years: pubYearsUnique
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
				async.parallel(
					[
						function(callback){
							console.log("processing publications_science...");
						  	for (row_num in publication_data) {
						    	//authors = ;
						    	autharr = publication_data[row_num].Authors.split("; "); //make sure to include the space

							    for (author_num in autharr){
							      var surname = autharr[author_num].substring(0, autharr[author_num].indexOf(' ') + 2); //surname and first initial

							      //loop through people in science
							      for (i in scienceNamesUnique){
							        //extract the surname and the first initial
							        //e.g., "Lastname,Firstname MiddleInitial" will become "Lastname FirstInitial"
							        var surname2 = scienceNamesUnique[i].substring(0,scienceNamesUnique[i].indexOf(',')) + " " + scienceNamesUnique[i].substring(scienceNamesUnique[i].indexOf(',') + 1, scienceNamesUnique[i].indexOf(',') + 2); 

							        //extract surname only
							        //var surname2 = science_faculty_members_unique[i].substring(0,science_faculty_members_unique[i].indexOf(','));
							        
							        if (surname == surname2){ //we have a match
							          //add the whole row to a new array that keeps track of the pubs with an author from science faculty
							          publications_science.push(publication_data[row_num]);
							        }
							      } //end members   

							      //and again for all people
							      for (i in allNamesUnique){
							        //extract the surname and the first initial
							        //e.g., "Lastname,Firstname MiddleInitial" will become "Lastname FirstInitial"
							        var surname2 = allNamesUnique[i].substring(0,allNamesUnique[i].indexOf(',')) + " " + allNamesUnique[i].substring(allNamesUnique[i].indexOf(',') + 1, allNamesUnique[i].indexOf(',') + 2); 
							        
							        if (surname == surname2){ //we have a match
							          //add the whole row to a new array that keeps track of the pubs with an author from western
							          publications_western.push(publication_data[row_num]);
							        }
							      } //end members 							      

							    } //end authors
							    if (row_num == publication_data.length-1)
							    	callback(null, [publications_science, publications_western]);
						  	}	
						}
						//,

						//do it again for all faculty at western
						// function(callback){
						// 	console.log("processing publications_western...");
						//   	for (row_num in publication_data) {
						//     	authors = publication_data[row_num].Authors;
						//     	autharr = authors.split("; "); //make sure to include the space

						// 	    for (author_num in autharr){
						// 	      var surname = autharr[author_num].substring(0, autharr[author_num].indexOf(' ') + 2); //surname and first initial

						// 	      for (i in allNamesUnique){
						// 	        //extract the surname and the first initial
						// 	        //e.g., "Lastname,Firstname MiddleInitial" will become "Lastname FirstInitial"
						// 	        var surname2 = allNamesUnique[i].substring(0,allNamesUnique[i].indexOf(',')) + " " + allNamesUnique[i].substring(allNamesUnique[i].indexOf(',') + 1, allNamesUnique[i].indexOf(',') + 2); 
							        
						// 	        if (surname == surname2){ //we have a match
						// 	          //add the whole row to a new array that keeps track of the pubs with an author from western
						// 	          publications_western.push(publication_data[row_num]);
						// 	        }
						// 	      } //end members 
						// 	    } //end authors
						// 	    if (row_num == publication_data.length-1)
						// 	    	callback(null, publications_western);
						//   	}	
						// }
					],

					//callback
					function(err, result){
						var publications_science = result[0];
						var publications_western = result[1];
						db.getDoc('processed_data', function(err, doc){
							doc.publications_science = publications_science;
							doc.publications_western = publications_western;
							db.saveDoc('processed_data', doc, function(er, ok){
						  		if (er) throw new Error(JSON.stringify(er));
					    		util.puts('Saved science and western publication data to the database.');
					    		callback(null);					
							});
						});		
					}
				);//end async.parallel	
			}, //end second function

			function(callback){
				console.log("processing co-supervision data...");
				var co_supervision = [];
	 			async.series(
	 				[
		 				//co-supervision 
		 				function(callback){

		 					//determine the cosupervisions by grouping the supervisor_data by StudentName, 
		 					//then filtering the result to have only length > 1 (i.e., more than one supervisor per StudenName)
		 					var cosupervisions = _.filter(_.groupBy(supervisor_data, function(x) { return x.StudentName; }), function(x) { return x.length > 1; } )
		 					
		 					//construct the links in the format that D3 likes (source, target...where both are numbers)
		 					//at this point the source and target are names. they need to become numbers later
							console.log("constructing the links for co-supervision...");
							_.each(cosupervisions, function(element) {
								//need both arrays since one is dependent on the other while it is changing (needs to stay consistent)								
								links_cosupervisions.push({"source":element[0].SupervisorName, "target":element[1].SupervisorName, "value":1, "type":"supervision"});
								links_cosupervisions_converted.push({"source":element[0].SupervisorName, "target":element[1].SupervisorName, "value":1, "type":"supervision"});
							});

		 				// 	var sorted = _.sortBy(supervisor_data, function(d) { return d.StudentName; } );
							// var currentStudent = "";
							// var previousStudent = "";
							// var currentSupervisor = "";
							// var previousSupervisor = "";
							// var temp = _.each(sorted, function(key, value){
							// 	currentStudent = key.StudentName;
							// 	currentSupervisor = key.SupervisorName;
							// 	if (currentStudent == previousStudent){
							// 		co_supervision.push([currentSupervisor, previousSupervisor]);
							// 	}
							// 	//update for the next loop through
							// 	previousSupervisor = key.SupervisorName;
							// 	previousStudent = key.StudentName;
							// });
							callback(null);
						},

						/*
						contructs the "links" that are used in the network visualization (i.e., links between nodes)
						links are for both co-supervisions and co-publications
						*/
	 					function(callback){

							console.log("constructing the links for co-publications for science...");
							//construct the "links" array to be used in the networkviz.
							//goes through publications_science that was constructed above
							for(row_num2 in publications_science){
							    authors2 = publications_science[row_num2].Authors;
							    autharr2 = authors2.split("; ");
							    pubyear = parseInt(publications_science[row_num2].Year);
							    var pubtype = publications_science[row_num2].Type;
							    var title = publications_science[row_num2].Title;
							    var outlet = publications_science[row_num2].SourceTitle;
							    var citations = publications_science[row_num2].CitationCount;
							    var url = publications_science[row_num2].URL;
							    var datafrom = publications_science[row_num2].DataFrom;

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
							          links_science.push({"source":source, "target":target, "value":0, "year":pubyear, "type":"publication", "pubtype":pubtype, "title":title, "outlet":outlet, "citations":citations, "URL":url, "from":datafrom});

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
							console.log("constructing the links for co-publications for all of western...");
							//construct the "links" array to be used in the networkviz.
							//whereas the above for loop goes through publications_science, this goes through publications_western
							//there is probably a much more efficient way to do this...just no time right now
							for(row_num2 in publications_western){
							    authors2 = publications_western[row_num2].Authors;
							    autharr2 = authors2.split("; ");
							    pubyear = parseInt(publications_western[row_num2].Year);
							    var pubtype = publications_western[row_num2].Type;
							    var title = publications_western[row_num2].Title;
							    var outlet = publications_western[row_num2].SourceTitle;
							    var citations = publications_western[row_num2].CitationCount;
							    var url = publications_western[row_num2].URL;
							    var datafrom = publications_western[row_num2].DataFrom;

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
							          links_western.push({"source":source, "target":target, "value":0, "year":pubyear, "type":"publication", "pubtype":pubtype, "title":title, "outlet":outlet, "citations":citations, "URL":url, "from":datafrom});

							          counter += 1;
							        } while ((target != autharr2[autharr2.length-1].substring(0, autharr2[author_num2].indexOf(' ') + 2)) && ((counter + author_num2) < autharr2.length)); //while target is not the last element and we don't go out of bounds
							      } // end if

							      //base case:one author...don't need to add it

							    }//end inner for 
							    if (row_num2 == publications_western.length-1)
							    	callback(null); 
							}//end outer for							
						},

						function(callback){
							var links = _.toArray(links_cosupervisions);
							_.each(links, function(element1, index1){
								_.each(science_faculty_data, function(element2, index2){
									if(element1.source == element2.Name)
										links_cosupervisions_converted[index1].source = parseInt(index2);
									if(element1.target == element2.Name)
										links_cosupervisions_converted[index1].target = parseInt(index2);
								});
							});

							console.log("converting links_science...");
							//need to convert the links_science array so that the source and target refer to elements in the 'science' array rather than to names...this is how d3 needs it
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
							    if (link == links_science.length-1){
							    	console.log("finished converting links_science");
							    	callback(null);					
							    	}		    
							}//end outer for
						},

						function(callback){
							console.log("converting links_western...");
							//need to convert the links_western array so that the source and target refer to elements in the 'allfaculty' array rather than to names...this is how d3 needs it
							for (link in links_western){
								console.log("link: " + link + " of " + links_western.length);
							    //go through the faculty list
							    for (element in allfaculty){
							      //checks if the source and target are the same as a faculty member...name has to be normalized first so it is "Lastname Firstinitial" so that they can be compared
							      if (links_western[link].source == (allfaculty[element].Name.substring(0,allfaculty[element].Name.indexOf(',')) + " " + allfaculty[element].Name.substring(allfaculty[element].Name.indexOf(',')+1,allfaculty[element].Name.indexOf(',')+2))) {
							          //set the source to be the index of the element ("element" in this case)
							          links_western[link].source = parseInt(element);
							      }
							      if (links_western[link].target == (allfaculty[element].Name.substring(0,allfaculty[element].Name.indexOf(',')) + " " + allfaculty[element].Name.substring(allfaculty[element].Name.indexOf(',')+1,allfaculty[element].Name.indexOf(',')+2))) {
							        //set the target to be the index of the element ("element" in this case)
							        links_western[link].target = parseInt(element);
							        }
							    }//end inner for
							    if (link == links_western.length-1){
							    	console.log("finished converting links_western");
							    	callback(null);
							    }
							}//end outer for
						}
		  			],

		  			//callback
		  			function(err){
		  				console.log("further processing of links...");
		  				if(err) throw new Error(JSON.stringify("Error: " + err));
		  				async.series(
		  					[
			  					function(callback){
			  						async.series([
			  							function(callback){
					  						//remove all links that are not between authors within science at western--i.e., remove all outside/non-faculty links--and store in links_science_exclusive
									  		links_science_exclusive = _.filter(links_science, function(n) { return _.isNumber(n.source) && _.isNumber(n.target); });
											//remove all links that are not between authors within western
									  		links_western_exclusive = _.filter(links_western, function(n) { return _.isNumber(n.source) && _.isNumber(n.target); });

									  		//remove duplicates
									  		//provide an iterator function that specifies the criteria for comparison
									  		links_science_exclusive = _.uniq(links_science_exclusive, false, function(x){ return (x.source + x.target + x.year + x.pubtype + x.title + x.outlet); });
									  		links_western_exclusive = _.uniq(links_western_exclusive, false, function(x){ return (x.source + x.target + x.year + x.pubtype + x.title + x.outlet); });

									  		links_for_network = _.filter(links_science, function(n) { return _.isNumber(n.source) && _.isNumber(n.target); });
									  		links_cosupervisions_converted = _.filter(links_cosupervisions_converted, function(n) { return _.isNumber(n.source) && _.isNumber(n.target); });

									  		db.saveDoc('links_cosupervisions_converted', {data:links_cosupervisions_converted}, function(er, ok){
			  									if (er) throw new Error(JSON.stringify(er) + " on links_cosupervisions_converted");
			  									util.puts('Saved links_cosupervisions_converted to the database.');
			  									db.saveDoc('links_for_network', {data: links_for_network}, function(er, ok){
			  										if (er) throw new Error(JSON.stringify(er + " on links_for_network"));
			  										util.puts('Saved links_for_network to the database.');
			  										db.saveDoc('links_science_exclusive', {data: links_science_exclusive}, function (er, ok){
			  											if (er) throw new Error(JSON.stringify(er  + " on links_science_exclusive"));
			  											util.puts('Saved links_science_exclusive to the database.');
														db.saveDoc('links_western_exclusive', {data: links_western_exclusive}, function (er, ok){
			  												if (er) throw new Error(JSON.stringify(er + " on links_western_exclusive"));
			  												util.puts('Saved links_western_exclusive to the database.');	
			  												callback(null);
			  											});			  												
			  										});		  										
			  									});
			  								});
			  							},

			  							//combine duplicate links (meaning between 2 of the same authors and not necessarily the same publications???)
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
			  									db
		  										.saveDoc('viz_data',
		  											{'co_author_by_name': links_science}, function(er, ok){
			  											if (er) throw new Error(JSON.stringify(er));
										    			util.puts('Saved co_author_by_name to the database.');
										    			callback(null);
			  										});
			  								},
			  								function(callback){
			  									db.getDoc('viz_data', function(err, doc){
			  										doc.links_science_exclusive = links_science_exclusive;
			  										db.saveDoc('viz_data', doc, function(er, ok){
			  											if (er) throw new Error(JSON.stringify(er));
										    			util.puts('Saved links_science_exclusive to the database.');
										    			callback(null);
			  										});
			  									});
			  								},
			  								function(callback){
			  									db.getDoc('viz_data', function(err, doc){
			  										doc.links_science_exclusive_unique = links_science_exclusive_unique;
			  										db.saveDoc('viz_data', doc, function(er, ok){
			  											if (er) throw new Error(JSON.stringify(er));
										    			util.puts('Saved links_science_exclusive_unique to the database.');
										    			callback(null);
			  										});
			  									});
			  								},
			  								function(callback){
			  									db.getDoc('viz_data', function(err, doc){
			  										doc.links_for_network = links_for_network;
			  										db.saveDoc('viz_data', doc, function(er, ok){
			  											if (er) throw new Error(JSON.stringify(er));
										    			util.puts('Saved links_for_network to the database.');
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
									db.getDoc('processed_data', function(err, doc){
										//doc.lists.grants_unique = grantsUnique;
										doc.lists.grant_sponsors = grantSponsors;
										doc.lists.grant_departments = grantDepartments;
										doc.lists.proposal_statuses = proposalStatuses;
										doc.lists.award_statuses = awardStatuses;
										doc.lists.grant_year_range_begin = grantYearRangeBegin;
										doc.lists.grant_year_range_end = grantYearRangeEnd;
										db.saveDoc('processed_data', doc, function(er, ok){
					  						if (er) throw new Error(JSON.stringify(er));
								    		util.puts('Saved unique grants data to the database.');
								    		callback(null);										
										});
									});
				  				},
				  				function(callback){
									db.getDoc('processed_data', function(err, doc){
										doc.grants_not_unique = grants;
										db.saveDoc('processed_data', doc, function(er, ok){
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
				sankeyData["nodes"].push({"name":"Inst. Approved"});
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


				db
				.getDoc('viz_data', function(err, doc){
					doc.sankey_data_faculty = sankeyData;
					db.saveDoc('viz_data', doc, function(er, ok){
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

				db.getDoc('viz_data', function(err, doc){
					doc.sankey_data_departments = sankeyDataDepartments;
					db.saveDoc('viz_data', doc, function(er, ok){
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
						db.getDoc('viz_data', function(err, doc){
							doc.treemap_data = {'nested_by_sponsor': nested_by_sponsor, 'nested_by_department': nested_by_department };
							db.saveDoc('viz_data', doc, function(er, ok){
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
}//end processData

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