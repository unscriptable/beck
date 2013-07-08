(function (global, globalEval) {

	var when, Deferred, Pipeline, extend;

	when = getWhenImpl;
	Deferred = getDeferredImpl;
	Pipeline = getPipelineImpl;
	extend = getExtendImpl;

	function LoaderImpl (parentImpl, options) {
		var pipeline;
		if (!options) options = {};
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
			var when, pipeline, options, dfd, loader, withOptions, promisify;

			// ignoring arrays for now.... TODO: implement for array, too.
			// TODO: pre-prepare pipeline instead of building it from scratch each time
				// withOptions
				// promisify

			when = getWhenImpl();
			pipeline = this.pipeline;
			options = {};
			loader = this;
			withOptions = this.withOptions;
			promisify = this.promisify;

			// start pipeline with id as input
			when(idOrArray)

			// normalize name
			.then(pipeline.normalize)

			// process result according to spec
			.then(withOptions(this.processNormalized, options))

			// abort if we've already got this module or we're fetching it
			.then(withOptions(this.checkCache, options))

			// resolve url
			.then(withOptions(pipeline.resolve, options))

			// process result according to spec
			.then(withOptions(this.processResolved, options))

			// fetch from url
			.then(withOptions(promisify(pipeline.fetch), options))

			// translate to javascript
			.then(withOptions(pipeline.translate, options))

			// link
			.then(withOptions(pipeline.link, options))

			// process result according to spec
			.then(withOptions(this.processModule, options))

			// handle errors and early aborts
			.then(null, function (reason) {
				if (reason instanceof Module) {
					callback(loader.get(options.normalized));
				}
				else if (reason instanceof Deferred) {
					reason.promise.then(callback, errback);
				}
				else {
					errback(reason);
				}
			});
		},

		"import": function () {},

		get: function (name) {
			// TODO: run factory
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
		},

		processNormalized: function (result, options) {
			if (typeof result == 'object') {
				options.normalized = result.normalized;
				options.metadata = result.metadata;
			}
			else {
				options.normalized = result;
			}
			options.referer = null;
			return options.normalized;
		},

		processResolved: function (result, options) {
			options.address = typeof result == 'object' ? result.address : result;
			if (result && 'extra' in result) options.extra = result.extra;
			return options.address;
		},

		processModule: function (module, options) {
			// TODO: handle when result is undefined? (per spec)
			if (!module instanceof Module) module = ToModule(module);
			this.set(options.normalized, module);
			return this.get(options.normalized);
		},

		checkCache: function (normalized, options) {
			if (loader.has(normalized)) {
				throw new loader.get(normalized);
			}
			else {
				dfd = new Deferred();
				// hm, can't use .set() here since it'll turn this into a module
				loader.cache[normalized] = dfd.promise;
			}
			return normalized;
		},

		withOptions: function (func, options) {
			return function () {
				var args = toArray(arguments);
				args.push(options);
				return func.apply(this, args);
			};
		},

		promisify: function (func) {
				// assumes that the returned function expects
				// 2nd and 3rd params to be callbacks and inserts them.
				return function () {
					var dfd, args, result;
					dfd = new Deferred();
					args = toArray(arguments);
					args.splice(1, 0, [dfd.resolve, dfd.reject]);
					try {
						result = func.apply(this, args);
					}
					catch (ex) {
						dfd.reject(ex);
					}
					return dfd.promise;
				};
			}

	};

	System.set('beck/init/LoaderImpl', ToModule(LoaderImpl));

	function getWhenImpl () {
		Deferred = System.get('beck/init/Deferred');
		return when = Deferred.when;
	}

	function getDeferredImpl () {
		Deferred = System.get('beck/init/Deferred');
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

	function toArray (obj) {
		return Array.prototype.slice.apply(obj);
	}

	function noop () {}

}(
	typeof global == 'object' ? global : this.window || this.global || {},
	function () { return (1, eval).call(arguments[1], arguments[0]); }
));