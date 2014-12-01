'use strict';

var express = require('express');
var errorHandler = require('express-error-handler');
var logger = require('bunyan-request-logger');
var http = require('http');
var exphbs = require( 'express3-handlebars' );
var noCache = require('connect-cache-control');

var app = express();
var log = logger();
var port = process.env.myapp_port || 3000;

// Create the server object that we can pass
// in to the error handler:
var server = http.createServer(app);

//requirements for the routes
var collaborations = require('./routes/collaborations');
var processData = require('./processData');
var retrieveData = require('./retrieveData');
var grants = require('./routes/grants');
var faculty = require('./routes/faculty');
var views = require('./routes/views');
var industry = require('./routes/industry');
var network = require('./routes/network');
var matrix = require('./routes/matrix');
var home = require ('./routes/home');
// code by Arash - 10-3-2014
// add grant-publication link
var grantpub = require('./routes/grantpub');
//var universities = require('./routes/universities');

//configuration
app.configure(function(){
	app.set('port', process.env.PORT || 3000);
	app.set('views', __dirname + '/views');
	app.engine('handlebars', exphbs({defaultLayout: 'main' }));
    app.set('view engine', 'handlebars');

    //use the given middleware functions
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(app.router);
	app.use(express.static(__dirname + "/public"));
	app.use(log.requestLogger());
	app.use(log.errorLogger());

	// Respond to errors and conditionally shut
	// down the server. Pass in the server object
	// so the error handler can shut it down
	// gracefully:
	app.use( errorHandler({server: server}) );
});


// Route to handle client side log messages.
//
// Counter to intuition, client side logging
// works best with GET requests.
// 
// AJAX POST sends headers and body in two steps,
// which slows it down.
// 
// This route prepends the cache-control
// middleware so that the browser always logs
// to the server instead of fetching a useless
// OK message from its cache.
app.get('/log', noCache,
    function logHandler(req, res) {

  // Since all requests are automatically logged,
  // all you need to do is send the response:
  res.send(200);
});


//routes for pages
app.get("/collaborations", collaborations.page);
app.get("/grants", grants.page);
app.get("/faculty", faculty.page);
app.get("/views", views.page);
app.get("/industry", industry.page);
//route for default home
app.get("/", home.page);

// code by Arash - 10-3-2014
// add grant-publication and universities menu
app.get("/grantpub", grantpub.page);
//app.get("/universities", universities.page);

// Route that triggers a sample error:
app.get('/error', function createError(req,
    res, next) {
  var err = new Error('Sample error');
  err.status = 500;
  next(err); //synonymous with res.sedn(status, error)
});


//routes for processing data
app.get("/processData", processData.full);
app.get("/retrieveData", retrieveData.scopus);

//routes for viz data
app.get("/network/:x", network.data);
app.get("/matrix/:x", matrix.data);
app.get("/grants/:x", grants.data);
app.get("/grantpub/:x", grantpub.data);

// Route that triggers a sample error:
//app.all('/*', errorHandler.httpError(404));


//server
// app.listen( 3000, function(){
// 	console.log( 'server running on port 3000...' );
// });

server.listen(port, function () {
  log.info('Listening on port ' + port);
});

