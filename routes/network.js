var couchdb = require('felix-couchdb'),
  client = couchdb.createClient(5984, 'localhost'),
  db = client.db('researchmap');

//all of the data needed for the network rather than individual sets
exports.data = function(req, res){
	var request = req.params.x;

	if (request == "links_for_network"){
		db.getDoc('viz_data', function(err, doc){
			if (err) console.log(err);
			res.send({links_for_network: JSON.stringify(doc.links_science_exclusive_unique)});
		});
	}

	else if (request == "science_faculty_data"){
		db.getDoc('unprocessed_data', function(err, doc){
			if (err) console.log(err);
			res.send({science_faculty_data: JSON.stringify(doc.science_faculty_data)});
		});
	}

	else if (request == "departments_uniq"){
		db.getDoc('processed_data', function(err, doc){
			if (err) console.log(err);
			res.send({departments_uniq: JSON.stringify(doc.lists.departments)});
		});
	}

	else if (request == "links_science_exclusive"){
		db.getDoc('links_science_exclusive', function(err, doc){
			if (err) console.log(err);
			res.send({links_science_exclusive: JSON.stringify(doc.data)});
		});
	}

	else if (request == "pub_years_uniq"){
		db.getDoc('processed_data', function(err, doc){
			if (err) console.log(err);
			res.send({pub_years_uniq: JSON.stringify(doc.lists.publication_years)});
		});
	}

	else if (request == "links_co_sup"){
		db.getDoc('links_co_supervision_converted', function(err, doc){
			if (err) console.log(err);
			res.send({links_co_sup: JSON.stringify(doc.data)});
		});
	}

	else
	{
		console.log("Error--request not recognized. Sending some data anyway.");
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


}		
				