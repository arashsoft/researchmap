var couchdb = require('felix-couchdb'),
  client = couchdb.createClient(5984, 'localhost'),
  db = client.db('researchmap_arash');

var async = require('async');


exports.page = function(req, res){
	var data = {
		maintitle: 'collaboration explorer',
		navpub: true,
		scripts: [
			'collaborations'
		]
	}
	res.render('collaborations', data);
}