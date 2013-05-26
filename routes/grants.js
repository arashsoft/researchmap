var couchdb = require('felix-couchdb'),
  client = couchdb.createClient(5984, 'localhost'),
  db = client.db('researchmap');

var async = require('async');


exports.main = function(req, res){
	//

	db.getDoc('viz_data', function(err, doc){
		if (err) callback(err);
			
		res.render('grants', 
		{ 
		nested_by_sponsor: JSON.stringify(doc.treemap_data.nested_by_sponsor),
		nested_by_department: JSON.stringify(doc.treemap_data.nested_by_department),
		sankey_data_faculty: JSON.stringify(doc.sankey_data_faculty),
		sankey_data_departments: JSON.stringify(doc.sankey_data_departments)
		});
	});


}

