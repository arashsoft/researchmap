var couchdb = require('felix-couchdb'),
  client = couchdb.createClient(5984, 'localhost'),
  db = client.db('researchmap_arash');

exports.page = function(req, res){
	var data = {
		maintitle: 'views',
		views: true
	}
	res.render('views', data);
}						