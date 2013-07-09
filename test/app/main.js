console.log('inside app/main');

var doc = global.document;

exports.init = doc ? insert : log;

function insert () {
	doc.body.appendChild(doc.createElement('div')).innerHTML = 'it works in a browser!';
}

function log () {
	console.log('it works in node/ringo!');
}