var couchdb = require('felix-couchdb'),
  client = couchdb.createClient(5984, 'localhost'),
  db = client.db('researchmap_arash');
//	client = couchdb.createClient(5984,'129.100.19.193', 'arman', 'redirection'),
//	db = client.db('researchmap_arman');
	
/* mysql db connection test
var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '',
  database : 'researchmap'
});
connection.connect();
connection.query('SELECT * from university ', function(err, rows, fields) {
  if (err) throw err;

  console.log('The result is: ', rows[0]);
});
*/

	
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


exports.data = function(req, res){
	var circle_packing_data;
	
	console.log("server side: " + req.params.x);

	var request = req.params.x;
	
	if (request == "nested_by_department"){
		db.getDoc('viz_data', function(err, doc){
			if (err) console.log(err);
			db.getDoc('processed_data', function(err, doc2){
				if (err) console.log(err);
				res.send({
					nested_by_department: JSON.stringify(doc.treemap_data.nested_by_department)
					, grant_sponsors: JSON.stringify(doc2.lists.grant_sponsors)
					//, grants_unique: JSON.stringify(doc2.lists.grants_unique) 
				});
			});
		});
	}
	else if (request == "nested_by_sponsor"){
		db.getDoc('viz_data', function(err, doc){
			if (err) console.log(err);
			
			db.getDoc('processed_data', function(err, doc2){
				res.send({
					nested_by_sponsor: JSON.stringify(doc.treemap_data.nested_by_sponsor)
					, grant_sponsors: JSON.stringify(doc2.lists.grant_sponsors)
					//, grants_unique: JSON.stringify(doc2.lists.grants_unique) 
				});
			});
		});
	}
	else if (request == "all_grants"){
		db.getDoc('unprocessed_data', function(err, doc){
			if (err) console.log(err);
			res.send({all_grants: JSON.stringify(doc.grant_data)});
		});
	}
	
	
	
}