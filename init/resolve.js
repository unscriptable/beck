(function () {

	var joinPaths = getJoinPathsImpl;

	function resolve (normalized, referer) {
		return joinPaths('./', normalized);
	}

	System.set('beck/init/resolve', ToModule(resolve));

	function getJoinPathsImpl () {
		joinPaths = System.get('beck/init/path').joinPaths;
		return joinPaths.apply(this, arguments);
	}

}());