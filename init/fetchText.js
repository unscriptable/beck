(function (scopedRequire) {

	var fs, fetchText;

	// determine the correct method upon first use
	fetchText = function (url, callback, errback) {
		fetchText = hasXhr() ? xhrFetch : hasFsModule() ? fsFetch : failFetch;
		return fetchText(url, callback, errback);
	};

	System.set('beck/init/fetchText', ToModule(fetch));

	function fetch (url, callback, errback) {
		return fetchText(url, callback, errback);
	}

	function xhrFetch (url, callback, errback) {
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

	function fsFetch (url, callback, errback) {
		fs.readFile(url, function (err) {
			if (err) {
				errback(err);
			}
			else {
				callback.apply(this, slice.call(arguments, 1));
			}
		});
	}

	function failFetch () {
		throw new Error('Could not create a text file fetcher.');
	}

	function hasXhr () {
		return typeof XMLHttpRequest != 'undefined';
	}

	function hasFsModule () {
		var slice;
		if (scopedRequire) {
			slice = Array.prototype.slice;
			try {
				fs = scopedRequire('fs');
				return true;
			}
			catch (ex) { }
		}
	}

}(typeof require == 'function' && require));