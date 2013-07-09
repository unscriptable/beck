console.log('inside app/main');

var doc = global.document;

exports.init = doc ? insert : log;

function insert () {
	doc.body.appendChild(doc.createElement('div')).innerHTML = 'it works!';
}

function log () {
	console.log('it works!');
}