var couchdb = require('felix-couchdb'),
  client = couchdb.createClient(5984, 'localhost'),
  db = client.db('researchmap');

exports.main = function(req, res){
	db.getDoc('processed_data', function(err, doc){
		if (err) callback(err);
		res.render('faculty', { lists: JSON.stringify(doc.lists) });
	});
}						