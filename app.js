var express = require('express');
var http = require('http');
var app = express();
//var hbs = require('hbs'),
var exphbs = require( 'express3-handlebars' );

//requirements for the routes
var publication = require('./routes/publication');
var processData = require('./routes/processData');

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
app.get("/test", function( req, res ) {
	var obj = {
		"testProp": "testVal"
	};
	var data = obj;
	res.render( 'test', { testData: JSON.stringify(data) });
});
app.get("/publications_map", publication.map);
app.get("/processData", processData.full);
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
