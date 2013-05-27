var couchdb = require('felix-couchdb'),
  client = couchdb.createClient(5984, 'localhost'),
  db = client.db('researchmap');

var async = require('async');

exports.main = function(req, res){
	res.render('grants');
}

exports.data = function(req, res){
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

