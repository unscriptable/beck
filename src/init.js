(function (global) {

	/**
	 * Shim ES6 Loader.
	 * @constructor
	 * @param options
	 * @param options
	 * @private
	 */
	function Loader (parent, options) {
		var impl, vo;
		impl = new LoaderImpl(parent, options);
		setImpl(this, impl);
	}

	Loader.prototype = {
		// TODO: use Object.defineProperties or a sham for it
		global: global,
		strict: true,
		evalAsync: function (src, callback, errback) {
			getImpl(this).evalAsync(src, callback, errback);
		},
		"import": function (idOrArray, callback, errback) {
			getImpl(this)['import'](idOrArray, callback, errback);
		},
		load: function (idOrArray, callback, errback) {
			getImpl(this).load(idOrArray, callback, errback);
		},
		eval: function (src) { return getImpl(this).eval(src); },
		get: function (name) { return getImpl(this).get(name); },
		set: function (name, value) { return getImpl(this).set(name, value); },
		has: function (name) { return getImpl(this).has(name); },
		"delete": function (name) { return getImpl(this)['delete'](name); }
	};

	var implKey = {};

	function setImpl (loader, impl) {
		var vo;
		vo = loader.valueOf;
		loader.valueOf = function () {
			if (arguments[0] == implKey) return impl;
			else return vo.apply(loader);
		};
	}

	function getImpl (loader) {
		return loader.valueOf(implKey);
	}

	// temporary implementation while the rest of this file is executed
	var LoaderImpl = function () {
		var temp, cache = {};
		temp = {
			cache: cache,
			get: function (name) { return cache[name]; },
			set: function (name, thing) {
				cache[name] = thing;
				// if we receive the LoaderImpl, assume we're ready to go!
				if (name == 'beck/LoaderImpl') {
					// save the LoaderImpl
					LoaderImpl = thing;
					// create the actual impl, transferring cache
					var impl = new LoaderImpl(temp);
					// replace the impl in System
					setImpl(System, impl);
				}
			}
		};
		return temp;
	};

	// sniff System and Loader
	if (typeof global.Loader == 'undefined') {
		global.Loader = Loader;
	}

	if (typeof global.System == 'undefined') {
		global.System = new Loader();
	}

	if (typeof global.Module == 'undefined') {
		// TODO: implement the Module constructor
		global.Module = function Module (obj) { return obj; };
		global.ToModule = function ToModule (obj) { return new Module(obj); };
	}

}(
	typeof global == 'object' ? global : this.window || this.global || {}
));