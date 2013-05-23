var express = require('express');
var http = require('http');
var csv = require('csv');
var fs = require('fs');
var _ = require('underscore');
var util = require('util');
var $ = require('jquery');
var model = require('LazyBoy');
var async = require('async'); 
var d3 = require('d3');
var app = express();

//requirements for the routes
var publication = require('./routes/publication');
var processData = require('./routes/processData');

//configuration
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

//routes
app.get("/publications_map", publication.map);
app.get("/processData", processData.full);
app.get("/", function(req, res) {
	res.render('home');
});

//server
http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
