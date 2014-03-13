/*
retrieveData.js: This module deals with retrieving publication data from APIs and storing in the database 

copyright Paul Parsons 2014
*/

var util = require('util');
var _ = require('underscore');
var $ = require('jQuery');
var async = require('async'); 
var couchdb = require('felix-couchdb'),
  client = couchdb.createClient(5984, 'localhost', 'insight', 'rki#$2sd'),
  db = client.db('researchmap_scopusdata');


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
	var elsvr_baseURL = "http://api.elsevier.com/content/search/index:SCOPUS?"; 
	var elsvr_resultType = "json";
	var elsvr_retSize = 200; //number of results that are returned per query. max is 200
	var elsvr_initialReturn;
	var elsvr_count = 1000; //number of results--start with a default and update later
	var elsvr_view = "META";// see www.developers.elsevier.com/devcms/content-api-retrieval-views
	var elsvr_results = [];
	var elsvr_errors = 0;
	var countset = false;
	var elsvr_authtoken;
	var checkedDoc = false;

	getData();


	/*
	This function queries the scopus api and saves the returned information in the database
	*/
	function getData() {

		//counter for the whilst loop below
		var retstart = 0;

		//loop that retrieves [elsvr_retSize] results and stores them in the db
		//runs while retstart < elsvr_count
		//see https://github.com/caolan/async#whilst for documentation
		async.whilst(function() { return retstart < elsvr_count; }, 

			function(callback) {

				elsvr_results = []; //reset the array

				//this is the 200-result 'chunk'
				var elsvr_resultChunk;

				//first retrieve the chunk of 200 results, then retrive more detail for each of the 200
				async.series(
				    [ 
				    	//check db
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
											retstart = doc.numcompleted; //want to start with the number at which we previously left off
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

				 		//first send authorization request
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

				 		//retrieve the chunk of [elsvr_retSize] results
				        function(callback){

				        	//initial query to the scopus api
				            var elsvr_Query = String(elsvr_baseURL) + "&query=af-id(" + String(elsvr_ID) + ")&httpAccept=application/" + String(elsvr_resultType) + "&count=" + String(elsvr_retSize) + "&start=" + retstart + "&view=";

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
			                              console.log("total num of documents to retrieve: " + elsvr_count);
										  console.log("starting retrieval from " + retstart);
			                              console.log("");
			                              countset = true;
			                            }
			                          	console.log('processing chunk ' + retstart + '-' + String(retstart+elsvr_retSize) + ' of ' + elsvr_count);
			                            elsvr_resultChunk = result["search-results"]["entry"]; //the current chunk of the total result, the size of which elsvr_retSize
			                            callback(null);
				                    },
				                    error: function(err){
				                        elsvr_errors = elsvr_errors+1;
				                        callback(err);
				                    }

				            });
				        },

				        function(callback){

				        	//loop through the chunk of results and retrives more detail about each one from the scopus api
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
				                        	callback(err); //pass error to callback to handle
				                    }
				                });
				            },

				            //callback for async.eachSeries
				            function(err, results) {
				                if (err) {
			                        try {
			                        	var errmsg = JSON.parse(err.responseText)["service-error"]["status"]["statusCode"];
			                        	if (errmsg == "QUOTA_EXCEEDED") {
			                        		callback(errmsg);
			                        	}
			                        	else {
			                        		console.log("error returned from query: " + errmsg);
			                        		callback(null);
			                        	}
			                        }
			                        catch (e) {
			                        	console.log("unknown error returned from query");
			                        	callback(null);
			                        }
				                }
				                else
				                    callback(null, elsvr_results);
				            });
				        }
				    ],

				    //callback for async.series
				    //responsible for saving the retrieved data to the database
				    //results[3] is what we want, because the first two functions do not return anything useful
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
		                		console.log("ERROR: " + err);			        	
				        }
				        else {
				        	//do database operations asynchronously in series
					        async.series(
					        	[
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
										    		console.log('New database: ' + db.name + 'created.');
										    		callback(null);
										    	}
										    });
										  } 
										else {
											//march 6 2014: commented this section out....if the database should be deleted, do it manually
											// 	//remove and create the db again
								  			//   db.remove(function(er){
								  			//   			if (er) 
								  			//   				callback(er);
								  			//   			console.log('Database: ' + db.name + ' removed.');
									 		//    		db.create(function(er){
									 		//    			if (er) 
									 		//    				callback(er);
									 		//    			else {
									 		//    				console.log('New database: ' + db.name + ' created.');
									 		callback(null);
									 		//    			}
									 		//    		});
								  			//   		});
								    	}
									});//end db.exists
					        	},

					        	function(callback){
						        	//get the document from the database
						        	//if there is an error because it doesn't exist, we create it
						        	//if there isn't an error, we get it and append to it
						        	//no nead to do a HEAD request, as we want the document anyway
						            db.getDoc('unprocessed', function(er, doc){
						            	//if there is an error with the GET request to the db
						                if (er) {
						                	//try to check the er object for reason field
						                	try {
						                		//if the document doesn't exist yet
						                		if (er.reason == "missing"){
									                //save the document to the database
									                db.saveDoc('unprocessed', {'unprocessed': results[3]}, function(er, ok) {
									                    if (er) 
									                    	callback(er);
									                    else {
							                    			console.log('saved chunk ' + retstart + '-' + String(retstart+elsvr_retSize) + ' of ' + elsvr_count + ' to database: ' + db.name + ' in document: ' + ok.id);
							               					retstart += elsvr_retSize;
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
						                	//append to it
							                doc.unprocessed = doc.unprocessed.concat(results[3]);

							                //save the document to the database
							                db.saveDoc('unprocessed', doc, function(er, ok) {
							                    if (er) 
							                    	callback(er);
							                    else {
					                    			console.log('saved chunk ' + retstart + '-' + String(retstart+elsvr_retSize) + ' of ' + elsvr_count + ' to database: ' + db.name + ' in document: ' + ok.id);
					               					retstart += elsvr_retSize;
													callback(null);
												}  
							                });
						            	}
						            });

									//also want to save the number of completed queries (can be used later for query starting point)
									db.getDoc('numcompleted', function(er, doc) {
					            		//if there is an error with the GET request to the db
						                if (er) {
						                	//try to check the er object for reason field
						                	try {
						                		//if the document doesn't exist yet
						                		if (er.reason == "missing"){
									                //save the document to the database
									                db.saveDoc('unprocessed', {'numcompleted': retstart+elsvr_retSize}, function(er, ok) {
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
											db.saveDoc('unprocessed', {'numcompleted': retstart+elsvr_retSize}, function(er, ok) {
					                    		if (er) 
					                    			callback(er);
					                    		else {
													callback(null);
												}   
											});
										}
									});
					        	}
					        	],
						        function(err, results) {
						        	if (err)
						        		callback(err);
						        	else
						        		callback(null);
						        }
					  		);//end async.series	

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
		});//end async.whilst
	}//end function	
}//end exports.scopus