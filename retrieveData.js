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
	var elsvr_authtoken;
	var checkedDoc = false;
	var numcompleted = 0;

	getData();


	/*
	This function queries the scopus api and saves the returned information in the database
	*/
	function getData() {

		//counter for the whilst loop below
		var retstart = 0;//??

		//span of time in which publication records exist in the scopus database
		var firstyear = 1975;
		var lastyear = 2014;

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
				                        elsvr_errors = elsvr_errors+1;
				                        callback(err);
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