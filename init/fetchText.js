(function () {

	function fetchText (url, callback, errback) {
		var xhr;
		xhr = new XMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.onreadystatechange = function () {
			if (xhr.readyState === 4) {
				if (xhr.status < 400) {
					callback(xhr.responseText);
				}
				else {
					errback(new Error('fetchText() failed. status: ' + xhr.status + ' - ' + xhr.statusText));
				}
			}
		};
		xhr.send(null);
	}

	System.set('beck/init/fetchText', ToModule(fetchText));

}());