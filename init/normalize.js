(function () {

	var reduceLeadingDots = getImpl;

	function normalize (name, referer) {
		if (typeof referer == 'object') referer = referer.name;
		return reduceLeadingDots(String(name), referer || '');
	}

	System.set('beck/init/normalize', ToModule(normalize));

	function getImpl () {
		reduceLeadingDots = System.get('beck/init/path').reduceLeadingDots;
		return reduceLeadingDots.apply(this, arguments);
	}

}());
