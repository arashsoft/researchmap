var couchdb = require('felix-couchdb'),
  client = couchdb.createClient(5984, 'localhost'),
  db = client.db('researchmap');


exports.map = function(req, res){
	console.log("in here");
	//
	db.getDoc('publications_science', function(err, ok){
		console.log(ok);
	})
	res.render('publications_map');
}