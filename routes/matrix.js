var couchdb = require('felix-couchdb'),
  client = couchdb.createClient(5984, 'localhost'),
  db = client.db('researchmap');

exports.data = function(req, res){
	db.getDoc('viz_data', function(err, doc){
		if (err) console.log(err);
		db.getDoc('unprocessed_data', function(err, doc2){
			db.getDoc('processed_data', function(err, doc3){
				res.send({ links_for_matrix: JSON.stringify(doc.links_for_network)
					, science_faculty_data:JSON.stringify(doc2.science_faculty_data)
					, departments_uniq: JSON.stringify(doc3.lists.departments) 
					, pub_years_uniq: JSON.stringify(doc3.lists.publication_years)
				});
			});
		});
	});
}						