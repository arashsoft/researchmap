var couchdb = require('felix-couchdb'),
  client = couchdb.createClient(5984, 'localhost', 'insight', 'rki#$2sd'),
  db = client.db('researchmap');

exports.page = function(req, res){
	var data = {
		maintitle: 'views',
		views: true
	}
	res.render('views', data);
}						