(function (global, globalEval) {

	var Deferred;

	Deferred = getDeferredImpl;

	function LoaderImpl (parent, options) {
		// TODO: inherit cache from parent
		this.cache = {};
	}

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

		get: function (name) {
			return this.cache[String(name)];
		},

		has: function (name) {
			return String(name) in this.cache;
		},

		set: function (name, thing) {
			cache[String(name)] = ToModule(thing);
		},

		"delete": function (name) {
			delete cache[String(name)];
		}

	};

	System.set('beck/init/LoaderImpl', ToModule(LoaderImpl));

	function getDeferredImpl () {
		Deferred = System.get('beck/lib/Deferred');
		return new Deferred();
	}

	function noop () {}

}(
	typeof global == 'object' ? global : this.window || this.global || {},
	function () { return (1, eval).call(arguments[1], arguments[0]); }
));