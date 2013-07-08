console.log('inside app/main');

exports.init = function () {
	var doc = global.document;
	doc.body.appendChild(doc.createElement('div')).innerHTML = 'it works!';
};