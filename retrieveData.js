/*
retrieveData.js: This module deals with retrieving publication data from APIs and storing in the database 

It has 3 main stages:
(1) (re)create the database (exports.full)
(2) read data from multiple csv files and save it to the db (function readData)
(3) process the data and resave to the db (funciton processData)

copyright Paul Parsons 2014
*/

var util = require('util');
var _ = require('underscore');
var $ = require('jquery');
var async = require('async'); 
var couchdb = require('felix-couchdb'),
  client = couchdb.createClient(5984, 'localhost'),
  db = client.db('researchmap_scopusdata');


//this is what gets exported when called by the app router
exports.scopus = function(req, res) {
	//check if the database exists
	//if no, create it
	//if yes, delete the database and then create it -- this is for development purposes only!
	db.exists(function(err,exists){
		console.log("");
		if (!exists) {
		    db.create(function(er){
		    	if (er) throw new Error(JSON.stringify(er));
		    	console.log('New database: ' + db + 'created.');
		    	getData();
		    });
		  } 
		else {
    		db.remove(function(er){
    			if (er) throw new Error(JSON.stringify(er));
    			console.log('Database: ' + db.name + ' removed.');
    		});
    		db.create(function(er){
    			if (er) throw new Error(JSON.stringify(er));
    			console.log('New database: ' + db.name + ' created.');
    		});
    	}
    	//create new document in the database;	
		db.saveDoc('unprocessed', {'unprocessed': "test"}, function(err){
			if (err) throw new Error(JSON.stringify(er));
			console.log('New document: ' + 'unprocessed' + ' created.');
			getData();
		});
	});//end of initial db operations


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


	/*
	This function queries the scopus api and saves the returned information in the database
	*/
	function getData() {

		//counter for the whilst loop below
		var retstart = 0;

		//loop that retrieves 200 results and stores them in the db
		//runs while retstart < elsvr_count
		//see https://github.com/caolan/async#whilst for documentation
		async.whilst(function() { return retstart < elsvr_count; }, 

			function(callback) {

				//this is the 200-result 'chunk'
				var elsvr_resultChunk;

				//first retrieve the chunk of 200 results, then retrive more detail for each of the 200
				async.series(
				    [ 
				 		//retrieve the chunk of 200 results
				        function(callback){

				        	//initial query to the scopus api
				            var elsvr_Query = String(elsvr_baseURL) + "apiKey="+ String(elsvr_apiKey) + "&query=af-id(" + String(elsvr_ID) + ")&httpAccept=application/" + String(elsvr_resultType) + "&count=" + String(elsvr_retSize) + "&view=";

				            //ajax request based on the query above
				            $.get(elsvr_Query, function(result) {
				                
				                if (!countset){
				                	//elsvr_count = parseInt(result["search-results"]["opensearch:totalResults"]); //the number of results
				                	console.log("");
				                	console.log("count (total num of documents) set at " + elsvr_count);
				                	console.log("");
				                	countset = true;
				                }
				                elsvr_resultChunk = result["search-results"]["entry"]; //the current chunk of the total result, the size of which elsvr_retSize
				                callback(null);
				            });//end get
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
				                    dataType: 'json',
				                    success: function(result){
				                        elsvr_results.push(result);
				                        //console.log("successful query");
				                        return callback(null);
				                    },
				                    error: function(err){
				                        //console.log("error returned: "+err.statusText);
				                        elsvr_errors = elsvr_errors+1;
				                        return callback(null);
				                    }
				                });
				            },

				            //callback for async.eachSeries
				            function(err, results) {
				                if (err) console.log("error: " + err);
				                else
				                    callback(null, elsvr_results);
				            });
				        }
				    ],

				    //callback for async.series
				    //responsible for saving the retrieved data to the database
				    function (err, results){
				        if (err)
				            console.log("ERROR: " + JSON.stringify(err));
				        else {
				        	//first get the document from the database
				            db.getDoc('unprocessed', function(er, doc){
				                if (er) throw new Error(JSON.stringify(er));

				                //if the object exists already, append to it 
				                if (doc.elsvr != undefined)
				                    doc.elsvr = _.extend(results[1], doc.elsvr);
				                //if the object doesn't exist already, simply save the results to it
				                else
				                    doc.elsvr = results[1];

				                //save the document to the database
				                db.saveDoc('unprocessed', doc, function(er, ok) {
				                    if (er) throw new Error(JSON.stringify(er));
				                    console.log('saved chunk ' + retstart + '-' + String(retstart+elsvr_retSize) + ' of ' + elsvr_count + ' to database: ' + db.name);
				               		retstart += elsvr_retSize;
									callback(null);     
				                });
				            });
				        }
				     }
				);//end async.series
		},

		//callback for the whilst loop
		//this will be called once the condition is no longer met (retstart < elsvr_retSize)
		function(err) {
			if (err) console.log("error: " + err);
			console.log("");
			console.log("all done!");
			console.log("");
			console.log("REPORT: ");
			console.log("---------");
			console.log((elsvr_count-elsvr_errors) + " results saved successfully to the database.");
			console.log(elsvr_errors + " results with errors could not be saved to the database.");

		});//end async.whilst
	}//end function	
}//end exports.scopus