var couchdb = require('felix-couchdb'),
  client = couchdb.createClient(5984, 'localhost'),
  db = client.db('researchmap');
var async = require('async');

exports.page = function(req, res){
	var data = {
		maintitle: 'grants explorer',
		navgrants: true,
		scripts: [
			'grants'
		]
	}
	res.render('grants', data);
}

exports.data = function(req, res){
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
				});	});
	}

	else if (request == "all_grants"){
		db.getDoc('unprocessed_data', function(err, doc){
			if (err) console.log(err);
			res.send({all_grants: JSON.stringify(doc.grant_data)});
		});
	}

	else if (request == "sankey_data_faculty"){
		db.getDoc('viz_data', function(err, doc){
			db.getDoc('processed_data', function(err, doc2){
				res.send({ 
					sankey_data_faculty: JSON.stringify(doc.sankey_data_faculty)
					, grant_departments: JSON.stringify(doc2.lists.grant_departments)
					, grant_sponsors: JSON.stringify(doc2.lists.grant_sponsors)
					//, grants_unique: JSON.stringify(doc2.lists.grants_unique)
					, proposal_statuses: JSON.stringify(doc2.lists.proposal_statuses)
					, award_statuses: JSON.stringify(doc2.lists.award_statuses)		
					, grant_year_range_begin: JSON.stringify(doc2.lists.grant_year_range_begin)	
					, grant_year_range_end: JSON.stringify(doc2.lists.grant_year_range_end)
				});
			});
		});
	}

	else if (request == "sankey_data_departments"){
		db.getDoc('viz_data', function(err, doc){
			db.getDoc('processed_data', function(err, doc2){
				res.send({ 
					sankey_data_departments: JSON.stringify(doc.sankey_data_departments)
					, grant_departments: JSON.stringify(doc2.lists.grant_departments)
					, grant_sponsors: JSON.stringify(doc2.lists.grant_sponsors)
					//, grants_unique: JSON.stringify(doc2.lists.grants_unique)
					, proposal_statuses: JSON.stringify(doc2.lists.proposal_statuses)
					, award_statuses: JSON.stringify(doc2.lists.award_statuses)		
					, grant_year_range_begin: JSON.stringify(doc2.lists.grant_year_range_begin)	
					, grant_year_range_end: JSON.stringify(doc2.lists.grant_year_range_end)
				});
			});
		});
	}

	else {
		console.log("Error--request not recognized. Sending some data anyway.");
		db.getDoc('viz_data', function(err, doc){
			db.getDoc('processed_data', function(err, doc2){
				res.send({ 
					nested_by_sponsor: JSON.stringify(doc.treemap_data.nested_by_sponsor)
					, nested_by_department: JSON.stringify(doc.treemap_data.nested_by_department)
					, sankey_data_faculty: JSON.stringify(doc.sankey_data_faculty)
					, sankey_data_departments: JSON.stringify(doc.sankey_data_departments)
					, grant_departments: JSON.stringify(doc2.lists.grant_departments)
					, proposal_statuses: JSON.stringify(doc2.lists.proposal_statuses)
					, award_statuses: JSON.stringify(doc2.lists.award_statuses)		
					, grant_year_range_begin: JSON.stringify(doc2.lists.grant_year_range_begin)	
					, grant_year_range_end: JSON.stringify(doc2.lists.grant_year_range_end)
				});
			});
		});
	}
}
	


