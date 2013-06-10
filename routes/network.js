var couchdb = require('felix-couchdb'),
  client = couchdb.createClient(5984, 'localhost'),
  db = client.db('researchmap');

//all of the data needed for the network rather than individual sets
exports.data = function(req, res){
	db.getDoc('viz_data', function(err, doc){
		if (err) console.log(err);
		db.getDoc('unprocessed_data', function(err, doc2){
			db.getDoc('processed_data', function(err, doc3){
				res.send({ links_for_network: JSON.stringify(doc.links_science_exclusive_unique)
					, science_faculty_data:JSON.stringify(doc2.science_faculty_data)
					, departments_uniq: JSON.stringify(doc3.lists.departments) 
					, pub_years_uniq: JSON.stringify(doc3.lists.publication_years)
				});
			});
		});
	});
}		

exports.links_for_network = function(req, res) {
	db.getDoc('viz_data', function(err, doc){
		if (err) console.log(err);
		res.send({links_for_network: JSON.stringify(doc.links_science_exclusive_unique)});
	});
}

exports.science_faculty_data = function(req, res) {
	db.getDoc('unprocessed_data', function(err, doc){
		if (err) console.log(err);
		res.send({science_faculty_data: JSON.stringify(doc.science_faculty_data)});
	});
}

exports.departments_uniq = function(req, res) {
	db.getDoc('processed_data', function(err, doc){
		if (err) console.log(err);
		res.send({departments_uniq: JSON.stringify(doc.lists.departments)});
	});
}	

exports.pub_years_uniq = function(req, res) {
	db.getDoc('processed_data', function(err, doc){
		if (err) console.log(err);
		res.send({pub_years_uniq: JSON.stringify(doc.lists.publication_years)});
	});
}				