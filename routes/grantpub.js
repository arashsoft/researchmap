var couchdb = require('felix-couchdb'),
  client = couchdb.createClient(5984, 'localhost'),
  db = client.db('researchmap_arash');
var async = require('async');


exports.page = function(req, res){
	var data = {
		maintitle: 'grant-publication explorer',
		navgrants: true,
		scripts: [
			'grantpub'
		]
	}
	res.render('grantpub', data);
}
