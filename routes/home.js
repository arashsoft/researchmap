exports.page = function(req, res){
	var data = {
		maintitle: 'home',
		home: true
	}
	res.render('home', data);
}	