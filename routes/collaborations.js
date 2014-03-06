var couchdb = require('felix-couchdb'),
  client = couchdb.createClient(5984, 'localhost', 'insight', 'rki#$2sd'),
  db = client.db('researchmap');

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