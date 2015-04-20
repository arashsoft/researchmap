/*
retrieveData.js: This module deals with retrieving publication data from APIs and storing in the database 

copyright Paul Parsons 2014
*/

var util = require('util');
var _ = require('underscore');
var $ = require('jquery');
var async = require('async'); 
var couchdb = require('felix-couchdb'),
  client = couchdb.createClient(5984, '129.100.19.193', 'insight', 'rki#$2sd'),
  db = client.db('researchmap_scopusdata');
  db2 = client.db('researchmap_scopusdata_merged');
var mysql = require('mysql');
var connection = mysql.createConnection({
	host : '129.100.19.193',
	port : '3306', 
	user : 'arman',
	password : 'redirection',
	database	: 'researchmap_dev' 
	});

//this is what gets exported when called by the app router
exports.scopus = function(req, res) {

	console.log("");
	console.log("running script retrieveData.js...");

	//send a response back to the client
	var data = {
		maintitle: 'data processing',
	};
	res.render('processingData', data);

	//variables for elsevier scopus query
	var elsvr_ID = "60010884"; //id of the institution (in this case, Western)
	var elsvr_apiKey = "9cb35f2a298ac707a9de85c32a2fcd63"; //my (Paul Parsons) api key
	var elsvr_apiKey2 = "7abb8247e0e908453412260a44a926ed"; //my (Arman Didandeh) api key
	var elsvr_baseURL = "http://api.elsevier.com/content/search/index:SCOPUS?"; 
	var elsvr_baseURL2 = "http://api.elsevier.com/content/search/author?";
	var elsvr_baseURL3 = "http://api.elsevier.com/content/search/author?query=au-id(";
	var elsvr_resultType = "json";
	var elsvr_retSize = 200; //number of results that are returned per query. max is 200
	var elsvr_initialReturn;
	var elsvr_count = 1000; //number of results--start with a default and update later
	var elsvr_view = "META";// see www.developers.elsevier.com/devcms/content-api-retrieval-views
	var elsvr_results = [];
	var elsvr_errors = 0;
	var elsvr_authtoken;
	var checkedDoc = false;
	var numcompleted = 0;

	// getData();
	// mergeData();
	// saveToMYSQLDB();
	// modifyMYSQLDB();
	getAuthorSubjects();
	
	function log(logItem) {
		console.log(logItem);
	}
	
	function saveToMYSQLDB() {
		var allDocs = new Array();
		var curDocs;
		var publications_list;
		var cur_year;
		var all_publications = new Array();
		
		async.series(
 			[
 				//create a mysqldb connection
 				function(callback) {
 					connection.connect(function() {
 						if(connection.state == "authenticated") {
 							callback();
 						}
 						else {
 							callback(" MySQL connection error!");
 						}
 					});
	            },

	            //load all the docs from couchdb
 				function(callback) {
 					db.allDocs(function(err, docs){
	                    if (err) {
	                        log(err);
	                    }
	                    else {
	                        docs.rows.forEach(function(row) {
	                        	if(row.id != "numcompleted") {
	                        		allDocs.push(row.id);
	                        	}
	                        });
	                        callback(null);
	                    }
	                });
	            },

	            function(callback) {
 					log(_.size(allDocs) + " documents loaded from couchdb");
 					log("");
 					callback();
	            },

	            function(callback) {
	            	//SHOULD BE READ PARTIALLY AND PERFORMED ON
 					curDocs=allDocs.slice(320,332);
 					log(_.size(curDocs) + " selected");
 					log("");
 					callback();
	            },

	            function(callback) {
	            	async.eachSeries(
	            		curDocs,
	            		function(doc, callback) {
	            			async.series(
	            				[
	            					//read publications from couchdb
					 				function(callback) {
					 					cur_year = doc.slice(0,4);
					 					db.getDoc(doc, function(err, result){
						                    if (err) {
						                        log(err);
							                    log("-------------");
						                    }
						                    else {
						                        publications_list = result.chunk;
						                        callback(null);
						                    }
						                });
						            },
	            					
	            					function(callback) {
	            						log(doc + ": " + _.size(publications_list));
	            						callback();
	            					},

	            					//insert publications
				 					function(callback) {
				 						log("insert publications for " + doc);
				 						var query_text="query";
				 						publications_list.forEach(function(publication) {
					 						query_text = "INSERT INTO `elsvr_publication2`(`dc:identifier`, `prism:url`, `eid`, `pubmed-id`, `prism:doi`, `dc:title`, `prism:aggregationType`, `citedby-count`, `prism:publicationName`, `prism:issn`, `prism:volume`, `prism:startingPage`, `prism:endingPage`, `dc:creator`, `dc:description`, `language`, `year`) VALUES ('"
					 							+ ((publication["abstracts-retrieval-response"]["coredata"]["dc:identifier"] == null) ? "" : publication["abstracts-retrieval-response"]["coredata"]["dc:identifier"]) + "', '"
					 							+ ((publication["abstracts-retrieval-response"]["coredata"]["prism:url"] == null) ? "" : publication["abstracts-retrieval-response"]["coredata"]["prism:url"]) + "', '"
					 							+ ((publication["abstracts-retrieval-response"]["coredata"]["eid"] == null) ? "" : publication["abstracts-retrieval-response"]["coredata"]["eid"]) + "', '"
					 							+ ((publication["abstracts-retrieval-response"]["coredata"]["pubmed-id"] == null) ? "" : publication["abstracts-retrieval-response"]["coredata"]["pubmed-id"]) + "', '"
					 							+ ((publication["abstracts-retrieval-response"]["coredata"]["prism:doi"] == null) ? "" : publication["abstracts-retrieval-response"]["coredata"]["prism:doi"]) + "', '"
					 							+ ((publication["abstracts-retrieval-response"]["coredata"]["dc:title"] == null) ? "" : publication["abstracts-retrieval-response"]["coredata"]["dc:title"].replace(/'/g, "\'\'")) + "', '"
					 							+ ((publication["abstracts-retrieval-response"]["coredata"]["prism:aggregationType"] == null) ? "" : publication["abstracts-retrieval-response"]["coredata"]["prism:aggregationType"]) + "', '"
					 							+ ((publication["abstracts-retrieval-response"]["coredata"]["citedby-count"] == null) ? "" : publication["abstracts-retrieval-response"]["coredata"]["citedby-count"]) + "', '"
					 							+ ((publication["abstracts-retrieval-response"]["coredata"]["prism:publicationName"] == null) ? "" : publication["abstracts-retrieval-response"]["coredata"]["prism:publicationName"].replace(/'/g, "\'\'")) + "', '"
					 							+ ((publication["abstracts-retrieval-response"]["coredata"]["prism:issn"] == null) ? "" : publication["abstracts-retrieval-response"]["coredata"]["prism:issn"]) + "', '"
					 							+ ((publication["abstracts-retrieval-response"]["coredata"]["prism:volume"] == null) ? "" : publication["abstracts-retrieval-response"]["coredata"]["prism:volume"]) + "', '"
					 							+ ((publication["abstracts-retrieval-response"]["coredata"]["prism:startingPage"] == null) ? "" : publication["abstracts-retrieval-response"]["coredata"]["prism:startingPage"]) + "', '"
					 							+ ((publication["abstracts-retrieval-response"]["coredata"]["prism:endingPage"] == null) ? "" : publication["abstracts-retrieval-response"]["coredata"]["prism:endingPage"]) + "', '"
					 							+ ((publication["abstracts-retrieval-response"]["coredata"]["dc:creator"]["author"][0]["@auid"] == null) ? "" : publication["abstracts-retrieval-response"]["coredata"]["dc:creator"]["author"][0]["@auid"]) + "', '"
					 							+ ((publication["abstracts-retrieval-response"]["coredata"]["dc:description"] == null) ? "" : publication["abstracts-retrieval-response"]["coredata"]["dc:description"].replace(/'/g, "\'\'")) + "', '"
					 							+ ((publication["abstracts-retrieval-response"]["language"] == null) ? "" : publication["abstracts-retrieval-response"]["language"]["@xml:lang"]) + "', '"
					 							+ (cur_year) + "')";
											
											connection.query(query_text, function(err, result) {
							                    if(err) {
							                        // log(err);
							                        log("-------------");
							                        log(query_text)
							                        log("-------------");
							                    }
							                    else {}
							                });
					 					});

				 						callback();
				 					},

				 					//insert the publication subject relations
						            function(callback) {
						            	log("insert the publication subject relations for " + doc);
						            	var query_text;
						            	publications_list.forEach(function(publication) {
						            		if(publication["abstracts-retrieval-response"]["subject-areas"]) {
						            			if(publication["abstracts-retrieval-response"]["subject-areas"]["subject-area"]) {
						            				publication["abstracts-retrieval-response"]["subject-areas"]["subject-area"].forEach(function(subject) {
							                        	query_text = "INSERT INTO `elsvr_publication_subject2`(`elsvr_Publication`, `elsvr_Subject`) VALUES ('"
							                        		+ publication["abstracts-retrieval-response"]["coredata"]["dc:identifier"] + "', '" + subject["@code"] + "')";
							                        	connection.query(query_text, function(err, result) {
										                    if(err) {
										                        log("-------------");
										                        // log(err);
										                        log(query_text);
										                        log("-------------");
										                    }
										                    else {}
										                });
							                        });
						            			}
						            		}
						            	});
						            	
						            	callback();
						            },

						            //insert the authors
						            function(callback) {
						            	log("insert the authors for " + doc);
						            	var query_text;
						            	publications_list.forEach(function(publication) {
											publication["abstracts-retrieval-response"]["authors"]["author"].forEach(function(author) {
												query_text ="INSERT INTO `elsvr_author2`(`elsvr_ID`, `elsvr_Initials`, `elsvr_Indexedname`, `elsvr_Surname`, `elsvr_Givenname`, `elsvr_URL`) VALUES ('"
												 + author["@auid"] + "', '"
												 + ((author["ce:initials"] == null) ? "" : author["ce:initials"].replace(/'/g, "\'\'")) + "', '"
												 + ((author["ce:indexed-name"] == null) ? "" : author["ce:indexed-name"].replace(/'/g, "\'\'")) + "', '"
												 + ((author["ce:surname"] == null) ? "" : author["ce:surname"].replace(/'/g, "\'\'")) + "', '"
												 + ((author["ce:given-name"] == null) ? "" : author["ce:given-name"].replace(/'/g, "\'\'")) + "', '"
												 + ((author["author-url"] == null) ? "" : author["author-url"]) + "')";

												connection.query(query_text, function(err, result) {
								                    if(err) {
								                        log("-------------");
								                        // log(err);
								                        log(query_text);
								                        log("-------------");
								                    }
								                    else {}
								                });
											});
										});
										
										callback();
						            },

						            //insert the publication author relations
						            function(callback) {
						            	log("insert the publication author relations for " + doc);
						            	var query_text;
										publications_list.forEach(function(publication) {
											publication["abstracts-retrieval-response"]["authors"]["author"].forEach(function(author) {
												query_text ="INSERT INTO `elsvr_publication_author2`(`elsvr_Publication`, `elsvr_Author`) VALUES ('"
												+ publication["abstracts-retrieval-response"]["coredata"]["dc:identifier"] + "', '"
												+ author["@auid"] + "')";
												connection.query(query_text, function(err, result) {
								                    if(err) {
								                        log("-------------");
								                        // log(err);
								                        log(query_text);
								                        log("-------------");
								                    }
								                    else {}
								                });
											});
										});
										
										callback();
						            },

						            function(callback) {
										log("");
				 						log("after all queries");
				 						log("");
				 						callback();
				 					},
	            				],
	            				function(err) {
	            					if(err) {
	            						log(err);
	            					}
	            					else {
	            						log(doc + " processed");
	            						callback();
	            					}
	            				});
	            		},
	            		function(err) {
		            		if(err) {
		            			log(err);
		            		}
		            		else {
		            			log("");
			 					log("");
			 					log("");
		            			log("all doc processed");
		            			// callback();
		            		}
	            		}
	            	);
	            },

	            function(callback) {
 					log("");
 					log("");
 					log("");
 					log(_.size(allDocs) + " documents loaded from couchdb");
 					// callback();
	            },
 			],
 			function(err) {
 				if(err) {
					console.log(err);
				}
				else {
					log("***************************");
					log("operation fully successfully");
					log("***************************");
				}
 			}
 		);
	}

	function modifyMYSQLDB() {
		var all_professors;
		var selected_professors;
		connection.connect();

		async.series(
 			[
 				//read all Science profesors from mysql db
 				function(callback) {
 					// var query_text = "SELECT `professor_2`.`ID`, `professor_2`.`Fullname`, `professor_2`.`Firstname`, `professor_2`.`Middlename`, `professor_2`.`Lastname` FROM `professor_2` inner join `department` on `professor_2`.`Department_Primary`=`department`.`ID` where `department`.`Faculty`=4";
 					var query_text = "select p.ID , p.Fullname, p.Lastname, p.Firstname , count(ap.ID) as awardNumber from professor_2 as p join award_professor_2 as ap on ap.Professor=p.ID where p.ID not in (select e.Professor_ID from elsvr_author2 as e) group by p.ID order by awardNumber DESC";
 					connection.query(query_text, function(err, result) {
	                    if(err) {
	                        // log(err);
	                        log("-------------");
	                        log(query_text)
	                        log("-------------");
	                    }
	                    else {
	                    	all_professors = result;
	                    	log(_.size(all_professors) + " professors loaded");
	                    	callback();
	                    }
	                });
	            },

	            //send authorization request
		        function(callback){
		        	//if the authtoken hasn't been fetched yet
		        	if (elsvr_authtoken == undefined){
			        	//initial query to the scopus api
			            var elsvr_auth = "http://api.elsevier.com/authenticate?platform=SCOPUS";

			            //ajax request based on the query above
			            $.ajax({
			            	url: elsvr_auth,
			            	type: 'GET',
			            	beforeSend: function(request){
			            		request.setRequestHeader("X-ELS-APIKey", elsvr_apiKey);
			            	},
			            	dataType: 'json',
		                    success: function(result){
		                    	elsvr_authtoken = result["authenticate-response"].authtoken;
	                            callback(null);
		                    },
		                    error: function(err){
		                        callback(err);
		                    }

			            });
		        	}
		        	//if the authtoken has already been fetched
		        	else {
		        		callback(null);
		        	}
		        },

		        function(callback) {
 					selected_professors = all_professors.slice(0,_.size(all_professors));
 					// selected_professors = all_professors.slice(0,10);
 					callback();
	            },

		        //
		        function(callback) {
 					log("operating on " + _.size(selected_professors) + " professors");
 					async.eachSeries(
 						selected_professors,
 						function(professor, callback) {
 							//query for current document (i.e., individual publication)
			                var profQuery = elsvr_baseURL2 + "query=af-id(" + elsvr_ID + ")+AND+authlast("+professor.Lastname+")+AND+authfirst("+professor.Firstname+")";
			                var elsvr_professors = new Array();
			                
			                //ajax request based on the query above
			                $.ajax({
			                    url: profQuery,
			                    type: 'GET',
			     				beforeSend: function(request){
			            			request.setRequestHeader("X-ELS-APIKey", elsvr_apiKey);
			            			request.setRequestHeader("X-ELS-Authtoken", elsvr_authtoken);
			            		},	               
			                    dataType: 'json',
			                    success: function(result){
			                        // log("");
			                        // log("processing " + professor.Fullname);

			                        if(result["search-results"]["opensearch:totalResults"] < 1) {
			                        	// log("--------------------------------");
			                        	// log("no result for professor " + professor.ID + " : " + professor.Fullname);
			                        	// log(profQuery+"&apiKey=7abb8247e0e908453412260a44a926ed");
			                        	// log("--------------------------------");
			                        	callback();
			                        }
			                        /*else if(result["search-results"]["opensearch:totalResults"] == 1) {
			                        	log("");
			                        	log("professor " + professor.ID + " is author " + result["search-results"]["entry"][0]["dc:identifier"]);
			                        	var query_text = "UPDATE `elsvr_author2` SET `Professor_ID`=" + professor.ID + " WHERE `elsvr_ID`=" + result["search-results"]["entry"][0]["dc:identifier"].slice(10, _.size(result["search-results"]["entry"][0]["dc:identifier"]));
			                        	connection.query(query_text, function(err, result) {
						                    if(err) {
						                        // log(err);
						                        log("-------------");
						                        log(query_text)
						                        log("-------------");
						                        callback();
						                    }
						                    else {
						                    	// log(query_text + " successful");
						                    	// log("professor " + professor.ID + " is author " + result["search-results"]["entry"][0]["dc:identifier"]);
						                    	callback();
						                    }
						                })
										// log("1 result for professor " + professor.ID + " : " + professor.Fullname);
										callback();
			                        };*/
			                        else  {
			                        	async.eachSeries(
			                        		result["search-results"]["entry"],
			                        		function(entry, callback) {
			                        			if (entry["affiliation-current"]["affiliation-id"] == elsvr_ID) {
			                        				var query_text = "UPDATE `elsvr_author2` SET `Professor_ID`=" + professor.ID + " WHERE `elsvr_ID`=" + entry["dc:identifier"].slice(10, _.size(entry["dc:identifier"]));
			                        				// log(query_text);
			                        				// callback();
			                        				connection.query(query_text, function(err, result) {
									                    if(err) {
									                        log("-------------");
									                        log(query_text)
									                        log("-------------");
									                        callback();
									                    }
									                    else {
									                    	log(professor.ID + " <--> " + entry["dc:identifier"].slice(10, _.size(entry["dc:identifier"])) + " linked");
									                    	callback();
									                    }
									                });
			                        			}
			                        			else {
			                        				// log("");
			                        				// log(profQuery+"&apiKey=7abb8247e0e908453412260a44a926ed");
			                        				// log(professor.ID + " <--> " + entry["dc:identifier"].slice(10, _.size(entry["dc:identifier"])) + " not linked");
			                        				// log("");
			                        				callback();
			                        			}
			                        		},
			                        		function(err) {
			                        			if(err) {
					 								log("");
			                        				log(err);
					 								log("--------------------------------");
					 								callback();
					 							}
					 							else {
					 								// log("");
			                        				// log("--------------------------------");
					 								callback();
					 							}
			                        		}
			                        	);
			                        }
			                    },
			                    error: function(err){
			                    	// log("processing " + professor.Fullname + " with error!");
			                     //    log("");
			                     //    log(profQuery+"&apiKey=7abb8247e0e908453412260a44a926ed");
			                     //    log("");
			                        callback();
			                    }
			                });
 						},
 						function(err) {
 							if(err) {
 								log(err);
 								log("--------------------------------");
 								callback();
 							}
 							else {
 								callback();
 							}
 						}
 					);
	            },
 			],
 			function(err) {
 				connection.end(function(err) {
 					if(err) {
						console.log(err);
					}
					else {
						log("******************************************************");
						log("operation successfull");
						log("******************************************************");
					}
 				});
 			}
 		);
	}

	function getAuthorSubjects() {
		var all_authors;
		var selected_authors;
		connection.connect();

		async.series(
 			[
 				//read all authors from mysql db
 				function(callback) {
 					// var query_text = "SELECT `professor_2`.`ID`, `professor_2`.`Fullname`, `professor_2`.`Firstname`, `professor_2`.`Middlename`, `professor_2`.`Lastname` FROM `professor_2` inner join `department` on `professor_2`.`Department_Primary`=`department`.`ID` where `department`.`Faculty`=4";
 					var query_text = "SELECT DISTINCT `elsvr_ID` FROM `elsvr_author2`";
 					connection.query(query_text, function(err, result) {
	                    if(err) {
	                        // log(err);
	                        log("-------------");
	                        log(query_text)
	                        log("-------------");
	                    }
	                    else {
	                    	all_authors = result;
	                    	log(_.size(all_authors) + " distinct authors loaded");
	                    	callback();
	                    }
	                });
	            },

	            //send authorization request
		        function(callback){
		        	//if the authtoken hasn't been fetched yet
		        	if (elsvr_authtoken == undefined){
			        	//initial query to the scopus api
			            var elsvr_auth = "http://api.elsevier.com/authenticate?platform=SCOPUS";

			            //ajax request based on the query above
			            $.ajax({
			            	url: elsvr_auth,
			            	type: 'GET',
			            	beforeSend: function(request){
			            		request.setRequestHeader("X-ELS-APIKey", elsvr_apiKey);
			            	},
			            	dataType: 'json',
		                    success: function(result){
		                    	elsvr_authtoken = result["authenticate-response"].authtoken;
	                            callback(null);
		                    },
		                    error: function(err){
		                        callback(err);
		                    }

			            });
		        	}
		        	//if the authtoken has already been fetched
		        	else {
		        		callback(null);
		        	}
		        },

		        function(callback) {
 					selected_authors = all_authors.slice(0, 500);
 					// selected_authors = all_authors.slice(100,_.size(all_authors));
 					log("operating on " + _.size(selected_authors) + " authors . . .");
 					callback();
	            },

		        //
		        function(callback) {
 					async.eachSeries(
 						selected_authors,
 						function(author, callback) {
 							//query for current document (i.e., individual publication)
			                var authorQuery = elsvr_baseURL3+author["elsvr_ID"]+")";
							var elsvr_professors = new Array();
			                
			                //ajax request based on the query above
			                $.ajax({
			                    url: authorQuery,
			                    type: 'GET',
			     				beforeSend: function(request){
			     					// log("	processing " + author["elsvr_ID"]);
			            			request.setRequestHeader("X-ELS-APIKey", elsvr_apiKey);
			            			request.setRequestHeader("X-ELS-Authtoken", elsvr_authtoken);
			            		},
			                    dataType: 'json',
			                    success: function(result){
			                    	if(result["search-results"]["opensearch:totalResults"] < 1) {
			                    		// log("--------------------------------");
			                      //   	log("no result for author " + author["elsvr_ID"]);
			                      //   	log(authorQuery+"&apiKey=7abb8247e0e908453412260a44a926ed");
			                      //   	log("--------------------------------");
			                        	callback();
			                    	}
			                    	else {
			                    		if(result["search-results"]["entry"][0]["subject-area"]) {
											async.eachSeries(
				                    			result["search-results"]["entry"],
				                    			function(entry, callback) {
				                    				async.eachSeries(
				                    					entry["subject-area"],
				                    					function(subject, callback) {
				                    						var query_text = "INSERT INTO `elsvr_author_subject2`(`elsvr_Author`, `elsvr_Subjectname`, `elsvr_Abbrev`, `elsvr_Subject_Frequency`) VALUES ('"
				                    							+ author["elsvr_ID"] + "', '"
				                    							+ subject["$"] + "', '"
				                    							+ subject["@abbrev"] + "', "
				                    							+ subject["@frequency"] + ")";

				                    						connection.query(query_text, function(err, result) {
											                    if(err) {
											                        log("-------------");
											                        log(query_text)
											                        log("-------------");
											                    }
											                    else {
											                    	callback();
											                    }
											                });
				                    					},
				                    					function(err) {
				                    						if(err) {
										                        log("-------------");
										                        log(err);
										                        log("-------------");
										                        callback();
										                    }
										                    else {
										                    	callback();
										                    }
				                    					}
				                    				);
				                    			},
				                    			function(err) {
				                    				if(err) {
								                        log("-------------");
								                        log(err);
								                        log("-------------");
								                        callback();
								                    }
								                    else {
								                    	callback();
								                    }
				                    			}
				                    		);
			                    		}
			                    		else {
			                    			log("--------------------------------");
			                        		// log("no subjects for author " + author["elsvr_ID"]);
			                        		log(authorQuery+"&apiKey=7abb8247e0e908453412260a44a926ed");
			                        		log("--------------------------------");
			                        		callback();
			                    		}
			                    	}
			                    },
			                    error: function(err){
			                    	log(err);
			                    	log("--------------------------------");
			                    	callback();
			                    }
			                });
 						},
 						function(err) {
 							if(err) {
 								log(err);
 								log("--------------------------------");
 								callback();
 							}
 							else {
 								callback();
 							}
 						}
 					);
	            },
 			],
 			function(err) {
 				connection.end(function(err) {
 					if(err) {
						console.log(err);
					}
					else {
						log("******************************************************");
						log("operation successfull");
						log("******************************************************");
					}
 				});
 			}
 		);
	}
	/*
	This function queries the scopus api and saves the returned information in the database
	*/
	function getData() {
		//counter for the whilst loop below
		var retstart = 0;//??

		//span of time in which publication records exist in the scopus database
		var firstyear = 1990;
		var lastyear = 1999;

		var curyear = firstyear; //start with the first year

		//loop that retrieves [elsvr_retSize] results and stores them in the db
		//runs while retstart < elsvr_count
		//see https://github.com/caolan/async#whilst for documentation
		async.whilst(function() { return curyear <= lastyear; }, 

			function(callback) {

				elsvr_results = []; //reset the array
				var countset = false; //count for current year is not set at this point
				retstart = 0; //

				//this is the 200-result 'chunk'
				var elsvr_resultChunk;

				//series of four functions that do the following:
				//1. check the database for any existing results from previous script executions
				//2. send an authorization request to the scopus api
				//3. retrieve a chunk of results
				//4. loop through each result in the chunk and get more information about it
				//the callback will then save these results to the database
				async.series(
				    [ 
				    	//first, check db
				    	function(callback){
				    		//if the database doc hasn't been checked yet
				    		if (!checkedDoc) {
					    		try {
									db.getDoc('numcompleted', function(er, doc) {
										if (er){
											//retstart is already set at 0
											callback(null);
											checkedDoc = true;
										}
										else {
											curyear = doc.year;
											retstart = doc.numcompleted; //want to start with the number at which we previously left off
											numcompleted = doc.numcompleted; //want to keep this number for later
											callback(null);
											checkedDoc = true;
										}
									});
								}
								//will catch if the document doesn't exist
								catch (e) {
									callback(e);
								}
							}
							else
								callback(null);
				    	},

				 		//second, send authorization request
				        function(callback){
				        	//if the authtoken hasn't been fetched yet
				        	if (elsvr_authtoken == undefined){
					        	//initial query to the scopus api
					            var elsvr_auth = "http://api.elsevier.com/authenticate?platform=SCOPUS";

					            //ajax request based on the query above
					            $.ajax({
					            	url: elsvr_auth,
					            	type: 'GET',
					            	beforeSend: function(request){
					            		request.setRequestHeader("X-ELS-APIKey", elsvr_apiKey);
					            	},
					            	dataType: 'json',
				                    success: function(result){
				                    	elsvr_authtoken = result["authenticate-response"].authtoken;
			                            callback(null);
				                    },
				                    error: function(err){
				                        callback(err);
				                    }

					            });
				        	}
				        	//if the authtoken has already been fetched
				        	else
				        		callback(null);
				        },

				 		//third, retrieve the chunk of [elsvr_retSize] results
				        function(callback){
				        	async.doWhilst(function(callback) {

				            	//initial query to the scopus api
				            	var elsvr_Query = elsvr_baseURL + "&query=af-id(" + elsvr_ID + ")+AND+PUBYEAR+IS+" + curyear + "&httpAccept=application/" + elsvr_resultType + "&count=" + elsvr_retSize + "&start=" + retstart + "&view=";

					            //ajax request based on the query above
					            $.ajax({
					            	url: elsvr_Query,
					            	type: 'GET',
					            	beforeSend: function(request){
					            		request.setRequestHeader("X-ELS-APIKey", elsvr_apiKey);
					            		request.setRequestHeader("X-ELS-Authtoken", elsvr_authtoken);
					            	},				            	
					            	dataType: 'json',
				                    success: function(result){
			                            if (!countset){
			                              elsvr_count = parseInt(result["search-results"]["opensearch:totalResults"]); //the number of results
			                              console.log("");
			                              console.log("total num of documents to retrieve for year " + curyear + ": " + elsvr_count);
										  console.log("starting retrieval from " + retstart + " of " + elsvr_count);
			                              console.log("");
			                              countset = true;
			                            }

			                            var finishval; //for printing out status message
			                            if ((retstart+elsvr_retSize) > elsvr_count)
			                            	finishval = elsvr_count;
			                            else
			                            	finishval = retstart+elsvr_retSize;

			                          	console.log('processing chunk ' + retstart + '-' + finishval + ' of ' + elsvr_count);
			                            elsvr_resultChunk = result["search-results"]["entry"]; //the current chunk of the total result, the size of which elsvr_retSize
			                            //retstart += elsvr_retSize;

							        	//save results on file
							        	var chunknum = (numcompleted/elsvr_retSize) + 1;
							        	//loop through the chunk of results
							        	async.eachSeries(elsvr_resultChunk, function(item, callback){

							                //query for current document (i.e., individual publication)
							                var docQuery = item["prism:url"] + "?apiKey=" + String(elsvr_apiKey) + "&httpAccept=application/" + String(elsvr_resultType);
							                
							                //ajax request based on the query above
							                $.ajax({
							                    url: docQuery,
							                    type: 'GET',
							     				beforeSend: function(request){
							            			request.setRequestHeader("X-ELS-APIKey", elsvr_apiKey);
							            			request.setRequestHeader("X-ELS-Authtoken", elsvr_authtoken);
							            		},	               
							                    dataType: 'json',
							                    success: function(result){
							                        elsvr_results.push(result);
							                        callback(null);
							                    },
							                    error: function(err){
							                        elsvr_errors = elsvr_errors+1;
							                        if (err.statusText == "parsererror")
							                        	callback(null); //don't need to pass this error along
							                        else
							                        	callback(null); //hopefully this is okay
							                        	//callback(err); //pass error to callback to handle
							                    }
							                });
							            },

							            //callback for async.eachSeries
							            //results should be an array of size [elsvr_retSize] 
							            function(err, results) {
							                if (err) {
						                        try {
						                        	var errmsg = JSON.parse(err.responseText)["service-error"]["status"]["statusCode"];
						                        	if (errmsg == "QUOTA_EXCEEDED") {
						                        		callback(errmsg);
						                        	}
						                        	else {
						                        		console.log("error returned from query: " + errmsg);
						                        	}
						                        }
						                        catch (e) {
						                        	console.log("unknown error returned from query");
						                        }
							                }
							                else {
									        	//do database operations asynchronously in series
										        async.series(
										        	[
									//mysql db processes
														//insert the publications
											        	function(callback) {
											        		var query_text;
										 					var publications_list = elsvr_results;
										 					log("insert the publications in this chunk");
										 					publications_list.forEach(function(publication) {
										 						//insert the publication into the elsvr_publication table
										 						query_text = "INSERT INTO `elsvr_publication`(`dc:identifier`, `prism:url`, `eid`, `pubmed-id`, `prism:doi`, `dc:title`, `prism:aggregationType`, `citedby-count`, `prism:publicationName`, `prism:issn`, `prism:volume`, `prism:startingPage`, `prism:endingPage`, `dc:creator`, `authkeywords`, `idxterms`, `dc:description`, `language`) VALUES ('"
										 							+ ((publication["abstracts-retrieval-response"]["coredata"]["dc:identifier"] == null) ? "" : publication["abstracts-retrieval-response"]["coredata"]["dc:identifier"]) + "', '"
										 							+ ((publication["abstracts-retrieval-response"]["coredata"]["prism:url"] == null) ? "" : publication["abstracts-retrieval-response"]["coredata"]["prism:url"]) + "', '"
										 							+ ((publication["abstracts-retrieval-response"]["coredata"]["eid"] == null) ? "" : publication["abstracts-retrieval-response"]["coredata"]["eid"]) + "', '"
										 							+ ((publication["abstracts-retrieval-response"]["coredata"]["pubmed-id"] = null) ? "" : publication["abstracts-retrieval-response"]["coredata"]["pubmed-id"]) + "', '"
										 							+ ((publication["abstracts-retrieval-response"]["coredata"]["prism:doi"] == null) ? "" : publication["abstracts-retrieval-response"]["coredata"]["prism:doi"]) + "', '"
										 							+ ((publication["abstracts-retrieval-response"]["coredata"]["dc:title"] == null) ? "" : publication["abstracts-retrieval-response"]["coredata"]["dc:title"].replace(/'/g, "\'\'")) + "', '"
										 							+ ((publication["abstracts-retrieval-response"]["coredata"]["prism:aggregationType"] == null) ? "" : publication["abstracts-retrieval-response"]["coredata"]["prism:aggregationType"]) + "', '"
										 							+ ((publication["abstracts-retrieval-response"]["coredata"]["citedby-count"] == null) ? "" : publication["abstracts-retrieval-response"]["coredata"]["citedby-count"]) + "', '"
										 							+ ((publication["abstracts-retrieval-response"]["coredata"]["prism:publicationName"] == null) ? "" : publication["abstracts-retrieval-response"]["coredata"]["prism:publicationName"].replace(/'/g, "\'\'")) + "', '"
										 							+ ((publication["abstracts-retrieval-response"]["coredata"]["prism:issn"] == null) ? "" : publication["abstracts-retrieval-response"]["coredata"]["prism:issn"]) + "', '"
										 							+ ((publication["abstracts-retrieval-response"]["coredata"]["prism:volume"] == null) ? "" : publication["abstracts-retrieval-response"]["coredata"]["prism:volume"]) + "', '"
										 							+ ((publication["abstracts-retrieval-response"]["coredata"]["prism:startingPage"] == null) ? "" : publication["abstracts-retrieval-response"]["coredata"]["prism:startingPage"]) + "', '"
										 							+ ((publication["abstracts-retrieval-response"]["coredata"]["prism:endingPage"] == null) ? "" : publication["abstracts-retrieval-response"]["coredata"]["prism:endingPage"]) + "', '"
										 							+ ((publication["abstracts-retrieval-response"]["coredata"]["dc:creator"]["author"][0]["@auid"] == null) ? "" : publication["abstracts-retrieval-response"]["coredata"]["dc:creator"]["author"][0]["@auid"]) + "', '"
										 							+ ((publication["abstracts-retrieval-response"]["language"]["authkeywords"] == null) ? "" : publication["abstracts-retrieval-response"]["language"]["authkeywords"].replace(/'/g, "\'\'")) + "', '"
										 							+ ((publication["abstracts-retrieval-response"]["language"]["idxterms"] == null) ? "" : publication["abstracts-retrieval-response"]["language"]["idxterms"].replace(/'/g, "\'\'")) + "', '"
										 							+ ((publication["abstracts-retrieval-response"]["coredata"]["dc:description"] == null) ? "" : publication["abstracts-retrieval-response"]["coredata"]["dc:description"].replace(/'/g, "\'\'")) + "', '"
										 							+ ((publication["abstracts-retrieval-response"]["language"]["@xml:lang"] == null) ? "" : publication["abstracts-retrieval-response"]["language"]["@xml:lang"].replace(/'/g, "\'\'")) + "')";

																connection.query(query_text, function(err, result) {
												                    if(err) {
												                        log(err);
												                    }
												                    else {
												                    	// publication.insertId = result.insertId;
												                    	// log("publication inserted");
												                    }
												                });
										 					});
										 					callback(null);
											            },

											            //insert the publication subject relations
											            function(callback) {
											            	var query_text;
											            	var publications_list = elsvr_results;
											            	log("insert the publication subject relations in this chunk");
											            	publications_list.forEach(function(publication) {
											            		publication["abstracts-retrieval-response"]["subject-areas"]["subject-area"].forEach(function(subject) {
										                        	query_text = "INSERT INTO `elsvr_publication_subject`(`elsvr_Publication`, `elsvr_Subject`) VALUES ('"
										                        		+ publication["abstracts-retrieval-response"]["coredata"]["dc:identifier"] + "', '"
										                        		+ subject["@code"] + "')";
										                        	
										                        	connection.query(query_text, function(err, result) {
													                    if(err) {
													                        log(err);
													                        log(query_text);
													                        log("-------------");
													                    }
													                    else {
													                        // log("publication's subject insered");
													                    }
													                });
										                        });
											            	});
											            	callback();
											            },
											            
											            //insert the authors
											            function(callback) {
											            	var query_text;
											            	var publications_list = elsvr_results;
											            	log("insert the authors in this chunk");
															publications_list.forEach(function(publication) {
																publication["abstracts-retrieval-response"]["authors"]["author"].forEach(function(author) {
																	query_text ="INSERT INTO `elsvr_author`(`elsvr_ID`, `elsvr_Initials`, `elsvr_Indexedname`, `elsvr_Surname`, `elsvr_Givenname`, `elsvr_URL`) VALUES ('"
																	 + author["@auid"] + "', '"
																	 + ((author["ce:initials"] == null) ? "" : author["ce:initials"].replace(/'/g, "\'\'")) + "', '"
																	 + ((author["ce:indexed-name"] == null) ? "" : author["ce:indexed-name"].replace(/'/g, "\'\'")) + "', '"
																	 + ((author["ce:surname"] == null) ? "" : author["ce:surname"].replace(/'/g, "\'\'")) + "', '"
																	 + ((author["ce:given-name"] == null) ? "" : author["ce:given-name"].replace(/'/g, "\'\'")) + "', '"
																	 + ((author["author-url"] == null) ? "" : author["author-url"]) + "')";
																	
																	connection.query(query_text, function(err, result) {
													                    if(err) {
													                        log(err);
													                        log(query_text);
													                        log("-------------");
													                    }
													                    else {
													                        // log("publication's subject insered");
													                    }
													                });
																});
															});
															callback();
											            },

											            //insert the publication author relations
											            function(callback) {
											            	var query_text;
											            	var publications_list = elsvr_results;
											            	log("insert the publication author relations in this chunk");
															publications_list.forEach(function(publication) {
																publication["abstracts-retrieval-response"]["authors"]["author"].forEach(function(author) {
																	query_text ="INSERT INTO `elsvr_publication_author`(`elsvr_Publication`, `elsvr_Author`) VALUES ('"
																	+ publication["abstracts-retrieval-response"]["coredata"]["dc:identifier"] + "', '"
																	+ author["@auid"] + "')";
																	
																	connection.query(query_text, function(err, result) {
													                    if(err) {
													                        log(err);
													                        log(query_text);
													                        log("-------------");
													                    }
													                    else {
													                        // log("publication's subject insered");
													                    }
													                });
																});
															});
															callback();
											            },

									//couch db processes
											        	function(callback){
															//check if the database exists
															//if no, create it
															db.exists(function(err,exists){
																console.log("");
																if (!exists) {
																    db.create(function(er){
																    	if (er) 
																    		callback(er);
																    	else {
																    		console.log("");
																    		console.log('New database: ' + db.name + ' created.');
																    		console.log("");
																    		callback(null);
																    	}
																    });
																  } 
																else {
															 		callback(null);
														    	}
															});//end db.exists
											        	},

											        	function(callback){

											        		//number of chunks stored so far in the db + 1
											        		var chunknum = (numcompleted/elsvr_retSize) + 1;

											        		//save to a new document in the database
											        		db.saveDoc(curyear + '-' + chunknum, {'chunk': elsvr_results}, function(er,ok) {
											                    if (er) 
											                    	callback(er);
											                    else {
											                    	var finishval; //for printing out status message
										                            if ((retstart+elsvr_retSize) > elsvr_count)
										                            	finishval = elsvr_count;
										                            else
										                            	finishval = retstart+elsvr_retSize;
									                    			console.log('saved chunk ' + retstart + '-' + finishval + ' of ' + elsvr_count + ' to database: ' + db.name + ' in document: ' + ok.id);
									               					retstart += elsvr_retSize;
									               					elsvr_results = []; //reset the array
									               					numcompleted += elsvr_retSize;
																	callback(null);
																} 
											        		});
											        	}
										        	],
											        function(err, results) {
											        	if (err)
											        		callback(err);
											        	else { 
											        		//also want to save the number of completed queries (can be used later for query starting point)
															db.getDoc('numcompleted', function(er, doc) {
											            		//if there is an error with the GET request to the db
												                if (er) {
												                	//try to check the er object for reason field
												                	try {
												                		//if the document doesn't exist yet
												                		if (er.reason == "missing"){

															                //save the document to the database
															                db.saveDoc('numcompleted', {'numcompleted': retstart, 'year': curyear}, function(er, ok) {
													                    		if (er) 
													                    			callback(er);
													                    		else {
																					callback(null);
																				}   
																			});
												                		}
												                		//otherwise it is some error we weren't expecting
												                		else
												                			callback(er);
												                	}
												                	//if it is not the error we were expecting (missing), catch it
												                	catch(e){
												                		callback(er);
												                	}
												                }

												               	//if the document returned successfully
												                else {
												                	//update the existing document
												                	if (retstart >= elsvr_count) {
												                		doc.numcompleted = 0;
												                		doc.year++;
												                	}
												                	else
												                		doc.numcompleted = doc.numcompleted+elsvr_retSize;												                	

																	db.saveDoc('numcompleted', doc, function(er, ok) {
											                    		if (er) 
											                    			callback(er);
											                    		else {
																			callback(null);
																		}   
																	});
																}
															});//end db.getDoc
											        	}
											        }
										  		);//end async.series
							                    //callback(null, elsvr_results);
							                }
			                            	//callback(null);
			                        	}
			                        	);//end async.eachSeries
				                    },
				                    error: function(err){

						                if (err) {
					                        try {
					                        	var errmsg = JSON.parse(err.responseText)["service-error"]["status"]["statusCode"];
					                        	if (errmsg == "AUTHENTICATION_ERROR") { //the authoken has expired
					                        		//refresh the authtoken and continue

					                        		//initial query to the scopus api
										            var elsvr_auth = "http://api.elsevier.com/authenticate?platform=SCOPUS";

										            //ajax request based on the query above
										            $.ajax({
										            	url: elsvr_auth,
										            	type: 'GET',
										            	beforeSend: function(request){
										            		request.setRequestHeader("X-ELS-APIKey", elsvr_apiKey);
										            	},
										            	dataType: 'json',
									                    success: function(result){
									                    	elsvr_authtoken = result["authenticate-response"].authtoken;
								                            callback(null);
									                    },
									                    error: function(err){
									                        callback(err);
									                    }

										            });
					                        	}
					                        	else {
					                        		console.log("error returned from query: " + errmsg);
					                        		callback(err);
					                        	}
					                        }
					                        catch (e) {
					                        	console.log("unknown error returned from query");
					                        	callback(err);
					                        }
					                    }
					                    else {
				                        	elsvr_errors = elsvr_errors+1;
				                        	callback(err);
				                    	}
				                    }
					            });//end ajax request
				        	},//end of 'do' function for dowhilst loop

							function() { return retstart <= elsvr_count;  }, //test condition for the doWhilst

							//callback for doWhilst
							function(err) {
								if (err){
									console.log("error: " + err);
									callback (err);
								}
								else{
									curyear++; 			//increment the current year
									numcompleted = 0; 	//reset the number of completed queries per year
									callback(null);
								}
							}
							);//end async.doWhilst
				        }//end outer async.series function
				    ],

				    //callback for async.series
				    //responsible for saving the retrieved data to the database
				    //results[3] is what we want, because the first three functions do not return anything useful
				    function (err, results){
				        if (err) {
		                	if (err == "QUOTA_EXCEEDED") {	
		                		console.log(""); 
		                		console.log("ERROR: Request quota for API key has been exceeded");
				                console.log("stopping script execution...");
				                retstart = elsvr_count; //to stop the whilst loop
				                callback(err);
		                	} 	
		                	else
		                		console.log("ERROR: " + err.responseText);			        	
				        }
				        else {
							callback(null);
				        }//end else
				     }
				);//end async.series
			},

			//callback for the whilst loop
			//this will be called once the condition is no longer met (retstart < elsvr_retSize)
			//give some report about the running of the script
			function(err) {
				console.log("");
				console.log("-----script finished-----");
				console.log("");
				console.log("REPORT: ");			

				if (err) {
					console.log("script did not run successfully");
					console.log("error returned: " + err);
					console.log("");
				}
				else {
					console.log("script successfully finished");
					console.log((elsvr_count-elsvr_errors) + " results saved successfully to the database.");
					console.log(elsvr_errors + " results with errors could not be saved to the database.");
					console.log("");
				}	

				console.log("server running on port 3000");
				console.log("");
				console.log("");
			}
		);//end async.whilst
	}//end function	
}//end exports.scopus
