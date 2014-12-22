'use strict';


var flash = require('connect-flash');
var express = require('express');
var errorHandler = require('express-error-handler');
var logger = require('bunyan-request-logger');
var http = require('http');
var exphbs = require( 'express3-handlebars' );
var noCache = require('connect-cache-control');

var app = express();
var log = logger();
var port = process.env.myapp_port || 3000;

// authenticate module
var passport = require('./authenticate');

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

	// authentication
	app.use(flash());
	app.use(express.cookieParser('whoknowsthiscookie'));
  app.use(express.session({ cookie: { maxAge: 6000000 }}));
  app.use(passport.initialize());
  app.use(passport.session());
	
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

//login request send false login to / and correct login to /main
app.post('/', passport.authenticate('local-login', { successRedirect: '/', failureRedirect: '/', failureFlash: true }));

//routes for pages
app.get("/collaborations", function(req, res) {
	if (req.isAuthenticated()){
		collaborations.page(req,res);
	}else{
		res.render('loginPage', { message: "Please login first",layout: false });
	}
});
app.get("/grants", function(req, res) {
	if (req.isAuthenticated()){
		grants.page(req,res);
	}else{
		res.render('loginPage', { message: "Please login first",layout: false });
	}
});
app.get("/faculty", function(req, res) {
	if (req.isAuthenticated()){
		faculty.page(req,res);
	}else{
		res.render('loginPage', { message: "Please login first",layout: false });
	}
});
app.get("/views", function(req, res) {
	if (req.isAuthenticated()){
		views.page(req,res);
	}else{
		res.render('loginPage', { message: "Please login first",layout: false });
	}
});

app.get("/industry", function(req, res) {
	if (req.isAuthenticated()){
		industry.page(req,res);
	}else{
		res.render('loginPage', { message: "Please login first",layout: false });
	}
});

//route for default home
app.get("/", function(req, res) {
	if (req.isAuthenticated()){
		home.page(req,res);
	}else{
		res.render('loginPage', { message: req.flash('loginMessage'),layout: false });
	}
});

// code by Arash - 10-3-2014
// add grant-publication and universities menu
app.get("/grantpub", function(req, res) {
	if (req.isAuthenticated()){
		grantpub.page(req,res);
	}else{
		res.render('loginPage', { message: "Please login first",layout: false });
	}
});
//app.get("/universities", universities.page);

// Route that triggers a sample error:
app.get('/error', function createError(req,
    res, next) {
  var err = new Error('Sample error');
  err.status = 500;
  next(err); //synonymous with res.sedn(status, error)
});


//routes for processing data
app.get("/processData", function(req, res) {
	if (req.isAuthenticated()){
		processData.full(req,res);
	}else{
		res.render('loginPage', { message: "Please login first",layout: false });
	}
});

app.get("/retrieveData", function(req, res) {
	if (req.isAuthenticated()){
		retrieveData.scopus(req,res);
	}else{
		res.render('loginPage', { message: "Please login first",layout: false });
	}
});


//routes for viz data
app.get("/network/:x", function(req, res) {
	if (req.isAuthenticated()){
		network.data(req,res);
	}else{
		res.render('loginPage', { message: "Please login first",layout: false });
	}
});
app.get("/matrix/:x",function(req, res) {
	if (req.isAuthenticated()){
		matrix.data(req,res);
	}else{
		res.render('loginPage', { message: "Please login first",layout: false });
	}
});

app.get("/grants/:x",function(req, res) {
	if (req.isAuthenticated()){
		grants.data(req,res);
	}else{
		res.render('loginPage', { message: "Please login first",layout: false });
	}
});

app.get("/grantpub/:x",function(req, res) {
	if (req.isAuthenticated()){
		grantpub.data(req,res);
	}else{
		res.render('loginPage', { message: "Please login first",layout: false });
	}
});

app.get("/grantpub/analysis/activeAwards",function(req, res) {
	if (req.isAuthenticated()){
		grantpub.activeAwards(req,res);
	}else{
		res.render('loginPage', { message: "Please login first",layout: false });
	}
});
 
app.get("/grantpub/analysis/:proposal_ID/:keyword_filter_array/:name_filter_array/:begin_date/:end_date/:threshold/:kernel_selection/:algorithm_selection",function(req, res) {
	if (req.isAuthenticated()){
		grantpub.analysis(req,res);
	}else{
		res.render('loginPage', { message: "Please login first",layout: false });
	}
});

// Route that triggers a sample error:
//app.all('/*', errorHandler.httpError(404));


//server
// app.listen( 3000, function(){
// 	console.log( 'server running on port 3000...' );
// });

server.listen(port, function () {
  log.info('Listening on port ' + port);
});

