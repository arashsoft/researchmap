var express = require('express');
var http = require('http');
var app = express();
var exphbs = require( 'express3-handlebars' );

//requirements for the routes
var publications_map = require('./routes/publications_map');
var processData = require('./processData');
var grants = require('./routes/grants');
var faculty = require('./routes/faculty');
var overview = require('./routes/overview');
var industry = require('./routes/industry');
var network = require('./routes/network');
var matrix = require('./routes/matrix');

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
app.get("/publications_map", publications_map.page);
app.get("/grants", grants.page);
app.get("/faculty", faculty.page);
app.get("/overview", overview.page);
app.get("/industry", industry.page);

//routes for processing data
app.get("/processData", processData.full);

//routes for viz data
app.get("/network/:x", network.data);
app.get("/matrix/:x", matrix.data);
app.get("/grants/:x", grants.data);

//route for default home
app.get("/", overview.page);

//server
app.listen( 3000, function(){
	console.log( 'server running...' );
});

