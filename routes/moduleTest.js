exports.index = function( req, res )
{
	var data = {
		text: 'This is sample text...',
		title: 'This is a Title',
		scripts: [
			'moduleTest'
		]
	}
	res.render( 'moduleTest', data );
}