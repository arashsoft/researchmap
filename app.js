var express = require('express');
var http = require('http');
var app = express();
//var hbs = require('hbs'),
var exphbs = require( 'express3-handlebars' );

//requirements for the routes
var publication = require('./routes/publication');
var processData = require('./routes/processData');
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

//routes
app.get("/publications_map", publication.map);
app.get("/processData", processData.full);
app.get("/grants", grants.main);
app.get("/faculty", faculty.main);
app.get("/overview", overview.main);
app.get("/industry", industry.main);

//if the client requests viz data
app.get("/network/:data", network.data);
app.get("/matrix/:data", matrix.data);
app.get("/grants/data", grants.data);


app.get("/", function(req, res) {
	res.render('home');
});

//server
app.listen( 3000, function(){
	console.log( 'server running...' );
});
// http.createServer(app).listen(app.get('port'), function(){
//   console.log('Express server listening on port ' + app.get('port'));
// });
