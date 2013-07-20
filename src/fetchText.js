/** @module beck/fetchText */
(function (scopedRequire) {

	var slice, fetchText, fs;

	slice = Array.prototype.slice;

	// determine the correct method upon first use
	fetchText = function (url, callback, errback) {
		if (hasXhr()) {
			fetchText = xhrFetch;
		}
		else if (hasFsModule()) {
			fetchText = isNodeFs() ? nodeFetch : cjsFetch;
		}
		else {
			fetchText = failFetch;
		}
		return fetchText(url, callback, errback);
	};

	System.set('beck/fetchText', new Module(fetch));

	/**
	 * Loads the plain text of the file at the url provided and passes it
	 * to the callback function.  If an error occurs, the errback function
	 * is called with an exception.
	 * @param {String} url
	 * @param {Function} callback
	 * @param {Function} errback
	 * @return {String}
	 */
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

	function nodeFetch (url, callback, errback) {
		fs.readFile(url, function (err) {
			if (err) {
				errback(err);
			}
			else {
				callback.apply(this, slice.call(arguments, 1));
			}
		});
	}

	function cjsFetch (url, callback, errback) {
		try {
			callback(fs.read(url));
		}
		catch (ex) {
			errback(ex);
		}
	}

	function failFetch () {
		throw new Error('Could not create a text file fetcher.');
	}

	function hasXhr () {
		return typeof XMLHttpRequest != 'undefined';
	}

	function hasFsModule () {
		if (scopedRequire) {
			try {
				fs = scopedRequire('fs');
				return true;
			}
			catch (ex) { }
		}
	}

	function isNodeFs () {
		return typeof fs.readFile == 'function' && fs.readFile.length > 1;
	}

}(typeof require == 'function' && require));
