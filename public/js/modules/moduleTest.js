var MODULE = (function () {
	var my = {},
		privateVariable = 1;

	function privateMethod() {
		console.log( 'this is a private method...' );
	}

	my.moduleProperty = 1;
	my.moduleMethod = function () {
		console.log( 'this is a module function...' );
	};

	console.log( 'in the module, whoa...' );

	return my;
}());