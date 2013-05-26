var couchdb = require('felix-couchdb'),
  client = couchdb.createClient(5984, 'localhost'),
  db = client.db('researchmap');

var async = require('async');


exports.map = function(req, res){
	//
	// async.parallel(
	// 	[
	// 		function(callback){
	// 			db.getDoc('unprocessed_data', function(err, doc){
	// 				if (err) callback(err);
	// 				callback(null, doc);
	// 			});
	// 		},
	// 		function(callback){
	// 			db.getDoc('viz_data', function(err, doc){
	// 				if (err) callback(err);
	// 				callback(null, doc);
	// 			});
	// 		},
	// 		function(callback){
	// 			db.getDoc('processed_data', function(err, doc){
	// 				if (err) callback(err);
	// 				callback(null, doc);
	// 			});
	// 		}						
	// 	],
	// 	//callback
	// 	function(err, results){
	// 		if (err) throw new Error(JSON.stringify(er));

	// 		var unprocessed_data = results[0];
	// 		var viz_data = results[1];
	// 		var processed_data = results[2];

	// 		res.render('publications_map', 
	// 			{ 
	// 			viz_data: JSON.stringify(viz_data),
	// 			processed_data: JSON.stringify(processed_data),
	// 			science_faculty_data: JSON.stringify(unprocessed_data.science_faculty_data)
	// 			});
	// 	}
	// );
res.render('publications_map');
}