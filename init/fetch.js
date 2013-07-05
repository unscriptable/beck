(function () {

	var fetchText = fetchTextImpl;

	function fetch (resolved, fulfill, reject) {
		fetchText(
			resolved,
			function (source) {
				fulfill(addSourceUrl(resolved, source));
			},
			reject
		);
	}

	System.set('beck/init/fetch', ToModule(fetch));

	function addSourceUrl (url, source) {
		return source
			+ '\n/*\n////@ sourceURL='
			+ url.replace(/\s/g, '%20')
			+ '\n*/\n';
	}

	function fetchTextImpl () {
		fetchText = System.get('beck/init/fetchText');
		return fetchText.apply(this, arguments);
	}

}());