(function (global, globalEval) {

	var init, Deferred;

	init = setDeps;

	LoaderImpl = function LoaderImpl (parent, options) {
		// TODO: inherit from parent
		init();
		this._cache = createCache();
	};

	LoaderImpl.prototype = {

		global: global,
		strict: true,

		"eval": function (source) {
			return globalEval(source, this.global);
		},

		evalAsync: function (source, callback, errback) {
			if (!callback) callback = noop;
			try {
				callback(this.eval(source));
			}
			catch (ex) {
				if (arguments.length > 1) errback(ex); else throw ex;
			}
		},

		// TODO...

		load: function (idOrArray, callback, errback) {

		},

		"import": function () {},

		get: function () {},
		has: function () {},
		set: function () {},
		"delete": function () {}

	};

	System.set('beck/init/LoaderImpl', ToModule(LoaderImpl));

	function createCache (seed) {
		// TODO: inherit from seed
		var cache = {};
		return {
			get: function (id) { return cache[id]; },
			set: function (id, thing) { return cache[id] = thing; },
			has: function (id) { return id in cache; }
		};
	}

	function setDeps () {
		Deferred = System.get('beck/lib/Deferred');
		init = noop;
	}

	function noop () {}

}(
	typeof global == 'object' ? global : this.window || this.global || {},
	function () { return (1, eval).call(arguments[1], arguments[0]); }
));