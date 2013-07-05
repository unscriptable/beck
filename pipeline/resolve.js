(function () {

	var joinPaths = getJoinPathsImpl;

	function resolve (normalized, referer) {
		return joinPaths('./', normalized);
	}

	System.set('beck/pipeline/resolve', ToModule(resolve));

	function getJoinPathsImpl () {
		joinPaths = System.get('beck/lib/path').joinPaths;
		return joinPaths.apply(this, arguments);
	}

}());