var couchdb = require('felix-couchdb'),
  client = couchdb.createClient(5984, 'localhost'),
  db = client.db('researchmap');

exports.page = function(req, res){
	var data = {
		maintitle: 'faculty',
		navfaculty: true,
		scripts: [
			'faculty'
		]
	}
	res.render('faculty', data);
}	

exports.data = function(req, res){
		db.getDoc('processed_data', function(err, doc){
			if (err) callback(err);
			res.send({processed_data: JSON.stringify(doc.processed_data)});
	});
}					