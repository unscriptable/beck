(function (global, globalEval) {

	var promise, when, defer, all, Pipeline, extend;

	Pipeline = getPipelineImpl;
	extend = getExtendImpl;

	function LoaderImpl (parentImpl, options) {
		var pipeline;
		getPromiseImpl();
		if (!options) options = {};
		// inherit from parent
		this.cache = parentImpl ? extend(parentImpl.cache) : {};
		this.pipeline = pipeline = parentImpl && parentImpl.pipeline
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
			if (!errback) errback = fail;
			try {
				callback(this.eval(source));
			}
			catch (ex) {
				if (arguments.length > 1) errback(ex); else throw ex;
			}
		},

		load: function (ids, callback, errback) {
			if (!errback) errback = fail; // propagate by default
			return this.fulfillAsType(ids, 'script')
				.then(spread(callback), errback);
		},

		"import": function (ids, callback, errback) {
			if (!errback) errback = fail; // propagate by default
			return this.fulfillAsType(ids, 'module')
				.then(spread(callback), errback);
		},

		get: function (name) {
			var module;
			module = this.cache[String(name)];
			// note: when all things in the cache are instanceof Module,
			// this sniff will be safer
			if (module && typeof module.execute == 'function') {
				// run factory
				var deps = [];
				for (var i = 0; i < module.imports.length; i++) {
					deps[i] = this.get(module.imports[i]);
				}
				this.cache[String(name)] = module
					= module.execute.apply(null, deps);
			}
			return module;
		},

		has: function (name) {
			return String(name) in this.cache;
		},

		set: function (name, thing) {
			this.cache[String(name)] = ToModule(thing);
		},

		"delete": function (name) {
			delete this.cache[String(name)];
		},

		fulfillAsType: function (ids, type) {
			var promises = [], i;

			if (Object.prototype.toString.call(ids) != '[object Array]') {
				ids = [ids];
			}

			for (i = 0; i < ids.length; i++) {
				promises.push(this.runPipeline(ids[i], { type: type }));
			}
			return all(promises);
		},

		runPipeline: function (id, options) {
			var pipeline, loader, withOptions, promisify;

			// TODO: pre-prepare pipeline instead of building it from scratch each time
				// withOptions
				// promisify

			pipeline = this.pipeline;
			loader = this;
			withOptions = this.withOptions;
			promisify = this.promisify;

			// start pipeline with id as input
			return when(id)

			// normalize name
			.then(pipeline.normalize)

			// process result according to spec
			.then(withOptions(bind(this, 'processNormalized'), options))

			// abort if we've already got this module or we're fetching it
			.then(withOptions(bind(this, 'checkCache'), options))

			// resolve url
			.then(withOptions(pipeline.resolve, options))

			// process result according to spec
			.then(withOptions(bind(this, 'processResolved'), options))

			// fetch from url
			.then(withOptions(promisify(pipeline.fetch), options))

			// translate to javascript
			.then(withOptions(pipeline.translate, options))

			// link
			.then(withOptions(pipeline.link, options))

			// get imported modules
			.then(withOptions(bind(this, 'processImports'), options))

			// process result according to spec
			.then(withOptions(bind(this, 'processModule'), options))

			// callback or handle errors and early aborts
			.then(null, function (reason) {
				if (reason instanceof Module) {
					return loader.get(options.normalized);
				}
				else if (promise.isDeferred(reason)) {
					return reason;
				}
				else {
					throw reason;
				}
			});
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
			if (typeof result == 'object') {
				options.address = result.address;
				if ('extra' in result) options.extra = result.extra;
			}
			else {
				options.address = result;
			}
			return options.address;
		},

		processImports: function (result, options) {
			var imports, count, promises;
			// scripts don't return a result
			imports = result ? result.imports : [];
			count = 0;
			promises = [];
			while (count < imports.length) {
				promises.push(this.load(imports[count]));
				count++;
			}
			return all(promises).yield(result);
		},

		processModule: function (module, options) {
			// TODO: handle when result is undefined? (per spec)
			if (!module instanceof Module) module = ToModule(module);
			var dfd = this.get(options.normalized);
			this.set(options.normalized, module);
			// hackish way to ensure factory has run
			module = this.get(options.normalized);
			if (promise.isDeferred(dfd)) dfd.fulfill(module);
			return module;
		},

		checkCache: function (normalized, options) {
			if (this.has(normalized)) {
				// throw it so we can abort the rest of the pipeline.
				// it'll get caught in the error handler.
				throw new this.get(normalized);
			}
			else {
				// put a promise in the cache
				// can't use .set() here since it'll turn the promise into a module
				this.cache[normalized] = defer();
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
					dfd = defer();
					args = toArray(arguments);
					args.splice(1, 0, dfd.fulfill, dfd.reject);
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

	function getPromiseImpl () {
		promise = System.get('beck/init/promise');
		when = promise.when;
		all = promise.all;
		defer = promise.defer;
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

	function bind (ctx, funcName) {
		return function () {
			return ctx[funcName].apply(ctx, arguments);
		}
	}

	function spread (func) {
		return function (params) {
			return func.apply(null, params);
		};
	}

	function noop () {}

	function fail (ex) { throw ex; }

}(
	typeof global == 'object' ? global : this.window || this.global || {},
	function () { return (1, eval).call(arguments[1], arguments[0]); }
));