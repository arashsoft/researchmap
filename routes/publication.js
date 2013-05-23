var couchdb = require('felix-couchdb'),
  client = couchdb.createClient(5984, 'localhost'),
  db = client.db('researchmap');


exports.map = function(req, res){
	//
	db.getDoc('publications_science', function(err, pubdata){
		if (err) throw new Error(JSON.stringify(er));
		db.getDoc('links_science_exclusive_unique', function(err, linkdata){
			if (err) throw new Error(JSON.stringify(er));
			res.render('publications_map', {title: 'Data for NetworkViz', pubdata: pubdata, linkdata: linkdata});
		});
	});
}