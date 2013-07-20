/** @module beck/object */
(function () {

	var object = {
		create: Object.create || create,
		extend: Object.extend || extend
	};

	System.set('beck/object', new Module(object));

	/**
	 * Crockford/Cornford begetter. Used when Object.create isn't available.
	 * @param {Object} base
	 * @return {Object}
	 */
	function create (base) {
		Begetter.prototype = base || null;
		var o = new Begetter();
		Begetter.prototype = null;
		return o;
	}

	/**
	 * Sham for Object.extend when not available.  Inherits from a base object
	 * and copies properties from the props parameter.
	 * @param {Object} base
	 * @param {Object} props
	 * @return {Object}
	 */
	function extend (base, props) {
		var o = create(base);
		for (var p in props || {}) {
			if (props.hasOwnProperty(p)) o[p] = props[p];
		}
		return o;
	}

	function Begetter () {}

}());
