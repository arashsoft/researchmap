var express = require('express')
  , http = require('http');
var mysql = require('mysql');
var csv = require('csv');
var fs = require('fs');
// var connection = mysql.createConnection({
// 	host: 'localhost',
// 	user: 'dbuser',
// 	password: 'dbuser',
// 	port: '8889',
// 	database: 'ResearchMap',
// });

var util = require('util');
//var d3 = require('d3');
var model = require('LazyBoy');

var couchdb = require('felix-couchdb'),
  client = couchdb.createClient(5984, 'localhost'),
  db = client.db('test'),
  db2 = client.db('researchmap');



var async = require('async'); 

var app = express();

var science = [];
var grants = [];
var supervisors = [];
var publications = [];
var grantData = [];

app.configure(function(){
	app.set('port', process.env.PORT || 3000);
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	//app.set('view chache', true); don't want this in dev environment
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(app.router);
	app.use(express.static(__dirname + "/public"));
});

app.get("/", function(req, res) {
	res.render('home');
	
});

app.get("/processData", function(req, res) {
	var headers = [];

	async.parallel(
		[
			//for the faculty data
			function(callback){
				csv()
					.from.stream(fs.createReadStream(__dirname+'/data/Science_Faculty.csv'))
					.on('record', function(row,index){
						var temp = {};
						  if (index == 0){
						  	headers = row;
						  }
						  else{
							  for (i=0; i<row.length; i++){
							  	temp[headers[i]] = row[i];
							  }
								science.push(temp);
							}
					})
					.on('end', function(count){
					  db2
			  			.saveDoc('science_faculty', {data: science}, function(er, ok) {
			    		if (er) throw new Error(JSON.stringify(er));
			    		util.puts('Saved science_faculty to the couch!');
			  			});
					callback(null, science);
					})
					.on('error', function(error){
					  console.log(error.message);
					 })
			},

			//for the ROLA data
			function(callback){
				csv()
					.from.stream(fs.createReadStream(__dirname+'/data/ROLA.csv'), {escape: '\\'})
					.on('record', function(row,index){
						var temp = {};
						  if (index == 0){
						  	headers = row;
						  }
						  else{
							  for (i=0; i<row.length; i++){
							  	temp[headers[i]] = row[i];
							  }
								grants.push(temp);
							}
					})
					.on('end', function(count){
					  db2
			  			.saveDoc('grants', {data: grants}, function(er, ok) {
			    		if (er) throw new Error(JSON.stringify(er));
			    		util.puts('Saved grants to the couch!');
			  			});
			  		callback(null, grants);
					})
					.on('error', function(error){
					  console.log(error.message);
					 })
			},

			//for the supervisor data
			function(callback){
				csv()
					.from.stream(fs.createReadStream(__dirname+'/data/Supervisors.csv'))
					.on('record', function(row,index){
						var temp = {};
						  if (index == 0){
						  	headers = row;
						  }
						  else{
							  for (i=0; i<row.length; i++){
							  	temp[headers[i]] = row[i];
							  }
								supervisors.push(temp);
							}
					})
					.on('end', function(count){
					  db2
			  			.saveDoc('supervisors', {data: supervisors}, function(er, ok) {
			    		if (er) throw new Error(JSON.stringify(er));
			    		util.puts('Saved supervisors to the couch!');
			  			});
			  		callback(null, supervisors);
					})
					.on('error', function(error){
					  console.log(error.message);
					 })
			},

			//for the publication data
			function(callback){
				csv()
					.from.stream(fs.createReadStream(__dirname+'/data/Pubs.csv'), {escape: '\\'})
					.on('record', function(row,index){
						var temp = {};
						  if (index == 0){
						  	headers = row;
						  }
						  else{
							  for (i=0; i<row.length; i++){
							  	temp[headers[i]] = row[i];
							  }
								publications.push(temp);
							}
					})
					.on('end', function(count){
					  db2
			  			.saveDoc('publications', {data: publications}, function(er, ok) {
			    		if (er) throw new Error(JSON.stringify(er));
			    		util.puts('Saved pubs to the couch!');
			  			});
			  		callback(null, publications);
					})
					.on('error', function(error){
					  console.log(error.message);
					 })
			}
			],

		//callback
		 function (err, results){
		 	if (err)
		 		console.log(JSON.stringify(err));
		 	else {
		 		res.send("All data sucessfully loaded, processed, and saved to the couch!")
		 	}
		 	//console.log(results);
		 });	 
});


http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
