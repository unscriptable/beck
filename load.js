(function (global/*, XMLHttpRequest, globalEval*/) {

	/***** temporary loader impl *****/

	var modules, impl;

	modules = {};

	impl = {

		global: global,
		strict: true,

		evalAsync: getShimAndCall('evalAsync'),
		"import": getShimAndCall('import'),
		load: function (idOrArray, callback, errback) {
			if (typeof idOrArray != 'string' || !isLocalModule(idOrArray)) {
				getShim(function (impl) {
					impl['load'].apply(impl, [idOrArray, callback, errback]);
				});
			}
			else {
				fetchModule(idOrArray, callback, errback);
			}
		},

		eval: failNotReady,
		get: before(function (id) { return modules[id]; }, failIfNotLocalModule),
		has: function (id) { return id in modules; },
		set: before(function (id, value) { return modules[id] = value; }, failIfNotLocalModule),
		"delete": before(function (id) { delete modules[id]; }, failIfNotLocalModule)

	};

	function failIfNotLocalModule (id) {
		if (!isLocalModule(id)) failNotReady();
	}

	function isLocalModule (id) {
		return id.slice(0, 4) == 'beck';
	}

	/**
	 * Creates a function that will call the ES6 Loader shim when it becomes
	 * available and then call back.  This is used to implement async methods
	 * on the ES6 Loader stub.
	 * @private
	 * @param {String} funcName
	 * @return {Function}
	 */
	function getShimAndCall (funcName) {
		return function callImplAsync () {
			var args = arguments;
			getShim(function (thing) {
				thing[funcName].apply(thing, args);
			});
		};
	}

	/**
	 * Creates a function that will call the ES6 Loader shim sync or fail
	 * if the shim isn't available, yet.
	 * @private
	 * @param {String} funcName
	 * @return {Function}
	 */
	function implCaller (funcName) {
		return function () {
			return impl[funcName].apply(this, arguments);
		};
	}

	/**
	 * Shim ES6 Loader.
	 * @constructor
	 * @param options
	 * @param options
	 * @private
	 */
	function Loader (parent, options) {
		// save args to create the real shim when it is loaded
		this._parent = parent;
		this._options = options;
	}

	// properties added below
	Loader.prototype = {};

	// TODO: when the API stabilizes, we should use the real function signatures
	for (var p in impl) {
		if (impl.hasOwnProperty(p)) {
			Loader.prototype[p] = implCaller(p);
		}
	}

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


	/***** stuff to load a real ES6 Loader shim *****/

	var getShim, saveShim, shim;

	/**
	 * Gets the shim and calls back.  Uses before advice to modify the getShim
	 * function to instruct any further calls to just queue callbacks.
	 * @function
	 * @param {Function} cb
	 */
	getShim = before(
		function (cb) {
			fetchShim(saveShim);
		},
		function (cb) {
			// rewrite getShim
			getShim = waitForShim;
			// register the first callback as a waiter
			waitForShim(cb);
		}
	);

	/**
	 * Saves the shim implementation.  Uses after advice to modify the getShim
	 * function to stop queueing callbacks and calls them immediately, instead.
	 * All callbacks are called at this point.
	 * @function
	 */
	saveShim = after(
		saveShimImpl,
		function (impl) {
			// rewrite getShim
			getShim = callShimNow;
			callShimWaiters(impl);
		}
	);

	shim = {
		impl: null,
		waiters: []
	};

	/**
	 * Fetches the Loader shim module and its dependencies.
	 * @private
	 * @param {Function} callback
	 */
	function fetchShim (callback) {
		var ids, count, id;

		ids = [
			'Deferred',
			'object',
			'path',
			'pipeline'
		];
		count = ids.length;

		System.load('beck/lib/Loader', after(setLoader, countdown));
		while (id = ids.shift()) {
			System.load('beck/init/' + id, countdown);
		}

		function countdown () {
			if (count-- == 0) callback(Loader);
		}
	}

	function waitForShim (callback) {
		shim.waiters.push(callback);
	}

	function callShimWaiters (impl) {
		var waiter;
		while (waiter = shim.waiters.shift()) waiter(impl);
		delete shim.waiters;
	}

	function saveShimImpl (Impl) {
		// save the implementation
		return shim.impl = new Impl();
	}

	function setLoader (impl) {
		Loader = impl;
	}

	function callShimNow (cb) { cb(shim.impl); }

	function failNotReady () {
		throw new Error('Cannot access loader before it is fully loaded.');
	}


	/***** simple, temporary AMD for loading local modules *****/

	/**
	 * Simple module-ish fetcher.
	 * @param {String} id
	 * @param {Function} callback
	 * @param {Function} [errback]
	 */
	function fetchModule (id, callback, errback) {
		var url;
		if (System.has(id)) callback(System.get(id));
		else {
			url = addBaseUrl(baseUrl, ensureExt(id));
			loadScript(
				{ id: id, url: url },
				function success () {
					if (!System.has(id)) {
						fail(new Error('Module not found. Probably a syntax error (or a 404 in IE).'));
					}
					else {
						callback(System.get(id));
					}
				},
				fail
			);
		}
		function fail (ex) {
			ex = ex || new Error('Could not load');
			ex.message += ' ' + url;
			if (errback) errback(ex); else throw ex;
		}
	}

	/**
	 * Constructs a module definition context. Allows us to use `instanceof`
	 * to positively identify a module that hasn't had its factory run, yet.
	 * @private
	 * @param factory
	 * @param ex
	 * @constructor
	 */
	function Mctx (factory, ex) {
		this.factory = factory;
		if (ex) this.ex = ex;
	}


	/***** script loader *****/

	var doc, loadScript, baseUrl, activeScripts, getDefinedModuleId;

	doc = global.document;

	// node, ringojs, etc.
	if (typeof module != 'undefined' && typeof require == 'function') {
		baseUrl = stripFilePart(module.uri) + '../';
		loadScript = createCallbackLoader(require);
		// in node, module.id is bogus, don't try to use it.
		getDefinedModuleId = noop;
	}
	// browser
	else if (doc) {
		activeScripts = {};
		baseUrl = stripFilePart(findScriptPath()) + '../';
		loadScript = createBrowserScriptLoader(doc);
		getDefinedModuleId = getCurrentScriptId;
	}
	// fail
	else {
		loadScript = function () {
			throw new Error('Can\'t load scripts in this environment.');
		};
	}

	function createCallbackLoader (loadFunc) {
		return function (options, cb, eb) {
			var url = joinPath(baseUrl, options.url);
			try { cb(loadFunc(url)); } catch (ex) { eb(ex); }
		};
	}

	function createBrowserScriptLoader (doc) {
		var readyStates, head, insertBeforeEl;
		readyStates = 'addEventListener' in global
			? {}
			: { 'loaded': 1, 'complete': 1 };
		head = doc && (doc['head'] || doc.getElementsByTagName('head')[0]);
		// to keep IE from crying, we need to put scripts before any
		// <base> elements, but after any <meta>. This usually works.
		insertBeforeEl = head && head.getElementsByTagName('base')[0] || null;
		return function (options, cb, eb) {
			var el;
			el = doc.createElement('script');
			el.async = true;
			el.src = options.url;
			el.onload = el.onreadystatechange = process;
			el.onerror = fail;
			// loading will start when the script is inserted into the dom.
			// IE will load the script sync if it's in the cache, so
			// indicate the current resource definition first.
			activeScripts[options.id] = el;
			return head.insertBefore(el, insertBeforeEl);

			// initial script processing
			function process (ev) {
				ev = ev || global.event;
				// detect when it's done loading
				// ev.type == 'load' is for all browsers except IE6-9
				// IE6-9 need to use onreadystatechange and look for
				// el.readyState in {loaded, complete} (yes, we need both)
				if (ev.type == 'load' || readyStates[el.readyState]) {
					delete activeScripts[options.id];
					el.onload = el.onreadystatechange = el.onerror = '';
					cb();
				}
			}

			function fail () {
				eb(new Error('Syntax or http error.'));
			}
		};
	}

	function findScriptPath () {
		var scriptDataAttr, scriptMatchRx, scripts, current, script, path;
		scriptDataAttr = 'data-beck-load';
		scriptMatchRx = /beck.*js/;
		current = doc.currentScript;
		if (!current) {
			scripts = [];
			scripts.push.apply(scripts, doc.scripts || doc.getElementsByTagName('script'));
			while (!current && (script = scripts.pop())) {
				if (script.readyState == 'interactive') current = script;
				else if (script.hasAttribute(scriptDataAttr)) current = script;
				else if (scriptMatchRx.test(script.src)) current = script;
			}
		}
		if (current) path = current.src;
		return path;
	}

	function getCurrentScriptId () {
		// IE6-9 mark the currently executing thread as "interactive"
		// Note: Opera lies about which scripts are "interactive", so we
		// just have to test for it. Opera provides a true browser test, not
		// a UA sniff, thankfully.
		if (!typeof global['opera'] == 'Opera') {
			// learned this technique from James Burke's RequireJS
			for (var id in activeScripts) {
				if (activeScripts[id].readyState == 'interactive') {
					return id;
				}
			}
		}
	}


	/***** AOP *****/

	function before (func, advice) {
		return function () {
			advice.apply(null, arguments);
			return func.apply(this, arguments);
		}
	}

	function after (func, advice) {
		return function () {
			var result = func.apply(this, arguments);
			advice(result);
			return result;
		}
	}

	/***** other stuff *****/

	var absUrlRx = /^\/|^[^:]+:\/\//;

	function stripFilePart (path) {
		return path && path.slice(0, path.lastIndexOf('/') + 1);
	}

	function joinPath (p1, p2) {
		return p1 + (p1.substr(p1.length - 1) == '/' ? '' : '/') + p2;
	}

	function ensureExt (path) {
		return path.indexOf('.js') == path.length - 3 ? path : path + '.js';
	}

	function addBaseUrl (baseUrl, path) {
		return absUrlRx.test(path) ? path : joinPath(baseUrl, path);
	}

	function noop () {}

}(
	typeof global == 'object' ? global : this.window || this.global || {}
));