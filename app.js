//test line to make Arman happy
//Arman is testing
//Arman is testing through SmartGit
//Arman is testing through SmartGit again
var express = require('express');
var http = require('http');
var app = express();
var exphbs = require( 'express3-handlebars' );

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

//configuration
app.configure(function(){
	app.set('port', process.env.PORT || 3000);
	app.set('views', __dirname + '/views');
	app.engine('handlebars', exphbs({defaultLayout: 'main' }));
    app.set('view engine', 'handlebars');
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(app.router);
	app.use(express.static(__dirname + "/public"));
});

//routes for pages
app.get("/collaborations", collaborations.page);
app.get("/grants", grants.page);
app.get("/faculty", faculty.page);
app.get("/views", views.page);
app.get("/industry", industry.page);
//route for default home
app.get("/", home.page);

//routes for processing data
app.get("/processData", processData.full);
app.get("/retrieveData", retrieveData.scopus);

//routes for viz data
app.get("/network/:x", network.data);
app.get("/matrix/:x", matrix.data);
app.get("/grants/:x", grants.data);



//server
app.listen( 3000, function(){
	console.log( 'server running on port 3000...' );
});

