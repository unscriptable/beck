(function () {

	var object = {
		create: Object.create || create,
		extend: Object.extend || extend
	};

	System.set('beck/object', new Module(object));

	function create (base) {
		Begetter.prototype = base || null;
		var o = new Begetter();
		Begetter.prototype = null;
		return o;
	}

	function extend (base, props) {
		var o = create(base);
		for (var p in props || {}) {
			if (props.hasOwnProperty(p)) o[p] = props[p];
		}
		return o;
	}

	function Begetter () {}

}());