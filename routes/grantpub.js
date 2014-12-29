var couchdb = require('felix-couchdb'),
  client = couchdb.createClient(5984, 'localhost'),
  db = client.db('researchmap_arash');

var async = require('async');

// Arman analysis module
var analysisArman = require('../analysis')

exports.page = function(req, res){
	var data = {
		maintitle: 'grant-publication explorer',
		navgrantpub: true,
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

// this fucntion handle analysis requests
exports.analysis = function(req, res){
	// I know it is stupid! but how cares!
	var tempSent = 0;
	analysisArman.award_relationship_extractor(req.params.proposal_ID, JSON.parse(req.params.keyword_filter_array), JSON.parse(req.params.name_filter_array), req.params.begin_date, req.params.end_date, req.params.threshold, req.params.kernel_selection, req.params.algorithm_selection, function(result){
		if (tempSent ==0){
			res.send(result);
			tempSent =1;
		}
	});
}

exports.activeAwards = function(req,res){
	analysisArman.calculate_analyzable_grants(function(result){res.send(result);});
}
