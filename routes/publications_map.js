var couchdb = require('felix-couchdb'),
  client = couchdb.createClient(5984, 'localhost'),
  db = client.db('researchmap');

var async = require('async');


exports.page = function(req, res){
	var data = {
		maintitle: 'publication explorer',
		navpub: true,
		scripts: [
			'publications_map'
		]
	}
	res.render('publications_map', data);
}