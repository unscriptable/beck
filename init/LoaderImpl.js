(function (global, globalEval) {

	var Deferred, Pipeline, extend;

	Deferred = getDeferredImpl;
	Pipeline = getPipelineImpl;
	extend = getExtendImpl;

	function LoaderImpl (parentImpl, options) {
		var pipeline;
		// inherit from parent
		this.cache = parentImpl ? extend(parentImpl.cache) : {};
		this.pipeline = pipeline = parentImpl
			? extend(parentImpl.pipeline)
			: new Pipeline();
		// extend from options
		if ('global' in options) this.global = options.global;
		if ('strict' in options) this.strict = options.strict;
		if ('normalize' in options) pipeline.normalize = options.normalize;
		if ('resolve' in options) pipeline.resolve = options.resolve;
		if ('fetch' in options) pipeline.fetch = options.fetch;
		if ('translate' in options) pipeline.translate = options.translate;
		if ('link' in options) pipeline.link = options.link;
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

	function getPipelineImpl () {
		Pipeline = System.get('beck/init/Pipeline');
		return new Pipeline();
	}

	function getExtendImpl () {
		extend = System.get('beck/init/object').extend;
		return extend.apply(this, arguments);
	}

	function noop () {}

}(
	typeof global == 'object' ? global : this.window || this.global || {},
	function () { return (1, eval).call(arguments[1], arguments[0]); }
));