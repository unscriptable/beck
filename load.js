var System, Loader;
(function (global/*, XMLHttpRequest, globalEval*/) {


	/***** stub ES6 Loader *****/

	// sniff System and Loader
	if (typeof Loader == 'undefined') {
		Loader = _Loader;
	}

	if (typeof System == 'undefined') {
		System = new Loader();
	}

	/**
	 * Stub ES6 Loader.  Serves as a temporary loader until a shim is in place.
	 * @constructor
	 * @param options
	 * @private
	 */
	function _Loader (options) {
		this.global = options.global;
		this.strict = options.strict;
		// TODO: process other options
	}

	_Loader.prototype = {

		global: global,
		strict: true,

		evalAsync: shimCallerAsync('evalAsync'),
		load: shimCallerAsync('load'),
		"import": shimCallerAsync('import'),

		"eval": shimCallerSync('eval'),
		get: shimCallerSync('get'),
		has: shimCallerSync('has'),
		set: shimCallerSync('set'),
		"delete": shimCallerSync('delete')

	};

	/***** stuff to load a real ES6 Loader shim *****/

	var getShim, saveShimImpl, shim;

	/**
	 * Gets the shim and calls back.  Uses before advice to modify the getShim
	 * function to instruct any further calls to just queue callbacks.
	 * @function
	 * @param {Function} cb
	 */
	getShim = before(
		function (cb) {
			fetchShim(saveShimImpl);
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
	 * function to stop queueing callbacks and call them immediately, instead.
	 * All callbacks are called at this point.
	 * @function
	 */
	saveShimImpl = after(
		saveShimProto,
		function () {
			// rewrite getShim
			getShim = callShimNow;
			callShimWaiters();
		}
	);

	shim = {
		impl: null,
		waiters: []
	};

	/**
	 * Creates a function that will call the ES6 Loader shim when it becomes
	 * available and then call back.  This is used to implement async methods
	 * on the ES6 Loader stub.
	 * @private
	 * @param {String} funcName
	 * @return {Function}
	 */
	function shimCallerAsync (funcName) {
		return function callShimAsync () {
			getShim(function (impl) {
				impl[funcName].apply(this, arguments);
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
	function shimCallerSync (funcName) {
		return function () {
			if (!shim.impl) failNotReady();
			else return shim.impl[funcName].apply(this, arguments);
		};
	}

	function fetchShim (callback) {
		simpleAmd('lib/Loader', callback);
	}

	function waitForShim (callback) {
		shim.waiters.push(callback);
	}

	function callShimWaiters () {
		var waiter;
		while (waiter = shim.waiters.unshift()) waiter();
	}

	function saveShimProto (impl) {
		// save the shim's prototype to get at the methods.
		shim.impl = impl.prototype;
	}

	function callShimNow (cb) { cb(shim.impl); }

	function failNotReady () {
		throw new Error('Cannot access loader before it is fully loaded.');
	}


	/***** simple, temporary AMD for loading local modules *****/

	var definedModules;

	definedModules = {};

	/**
	 * Global define function on System object.  Simplified AMD.
	 * @function
	 * @param {Function} factory
	 */
	System._define = function define (factory) {
		var ex, id;
		if ('*' in definedModules) {
			ex = new Error('Duplicate anonymous define() encountered');
		}
		id = getDefinedModuleId() || '*';
		definedModules[id] = new Mctx(factory, ex);
	};

	/**
	 * Simple AMD fetcher.
	 * @param {String} id
	 * @param {Function} callback
	 * @param {Function} errback
	 */
	function simpleAmd (id, callback, errback) {
		var url;
		if (definedModules[id] ) {
			callback(runFactory(id));
		}
		url = joinPath(baseUrl, id);
		loadScript(
			{ id: id, url: url },
			function success () {
				var key, found, mctx;
				key = '*' in definedModules ? '*' : id;
				found = key in definedModules;
				mctx = definedModules[key];
				delete definedModules['*'];
				if (!found) {
					fail(new Error('define() missing or syntax error'));
				}
				else if ('ex' in mctx) {
					fail(mctx.ex);
				}
				callback(runFactory(id));
			},
			fail
		);
		function fail (ex) {
			ex = ex || new Error('Could not load');
			ex.message += ' ' + url;
			if (errback) errback(ex); else throw ex;
		}
	}

	function runFactory (id) {
		var mctx;
		mctx = definedModules[id];
		return mctx instanceof Mctx ? definedModules[id] = mctx.factory() : mctx;
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
		this.ex = ex;
	}


	/***** script loader *****/

	var doc, loadScript, baseUrl, activeScripts, getDefinedModuleId;

	doc = global.document;

	// node, ringojs, etc.
	if (typeof module != 'undefined' && typeof require == 'function') {
		baseUrl = stripFilePart(module.uri);
		loadScript = createCallbackLoader(require);
		// in node, module.id is bogus, don't try to use it.
		getDefinedModuleId = noop;
	}
	// browser
	else if (doc) {
		activeScripts = {};
		baseUrl = stripFilePart(findScriptPath());
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
//			nextTurn(function () {
				var url = joinPath(baseUrl, options.url);
				try { cb(loadFunc(url)); } catch (ex) { eb(ex); }
//			});
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
			el.src = joinPath(baseUrl, options.url);
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
				eb(new Error('Syntax or http error: ' + options.url));
			}
		};
	}

	function findScriptPath () {
		var scriptMatchRx, scripts, current, script, path;
		scriptMatchRx = /beck.*js/;
		current = doc.currentScript;
		if (!current) {
			scripts = [];
			scripts.push.apply(scripts, doc.scripts || doc.getElementsByTagName('script'));
			while (!current && (script = scripts.pop())) {
				if (script.readyState == 'interactive') current = script;
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

//	/***** shims *****/
//
//	var nextTurn;
//
//	// shim XHR, if necessary (IE6). TODO: node/ringo solution?
//	if (!XMLHttpRequest) {
//		XMLHttpRequest = function () {
//			var progIds;
//			progIds = ['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'];
//			// keep trying progIds until we find the correct one,
//			while (progIds.length && !XMLHttpRequest) {
//				XMLHttpRequest = tryProgId(progIds.shift());
//			}
//			if (!XMLHttpRequest) throw new Error('XMLHttpRequest not available');
//			return XMLHttpRequest();
//			function tryProgId (progId) {
//				try {
//					new ActiveXObject(progId);
//					return function () { return new ActiveXObject(progId); };
//				}
//				catch (ex) {}
//			}
//		};
//	}


	/***** other stuff *****/

//	function isFunction (it) { return typeof it == 'function'; }

	function stripFilePart (path) {
		return path && path.slice(0, path.lastIndexOf('/') + 1);
	}

	function joinPath (p1, p2) {
		return p1 + (p1.substr(p1.length - 1) == '/' ? '' : '/') + p2;
	}

	function noop () {}

}(
	typeof global == 'object' ? global : this.window || this.global || {}/*,
	typeof XMLHttpRequest != 'undefined' && XMLHttpRequest,
	function () { return (1, eval).call(arguments[1], arguments[0]); }*/
));