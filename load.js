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

	/***** stuff to load an ES6 Loader shim *****/

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

	/**
	 * Fetches the ES6 Loader shim and calls a callback when done.
	 * @private
	 * @param callback
	 */
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

	var defines;

	defines = {};

	global.define = function define (factory) {
		var ex, id;
		if ('*' in defines) {
			ex = new Error('Duplicate anonymous define() encountered');
		}
		id = getDefinedModuleId() || '*';
		defines[id] = new Mctx(factory, ex);
	};

	function simpleAmd (id, callback, errback) {
		var url;
		if (defines[id] ) {
			callback(runFactory(id));
		}
		url = joinPath(baseUrl, id);
		loadScript(
			{ id: id, url: url },
			function success () {
				var key, found, mctx;
				key = '*' in defines ? '*' : id;
				found = key in defines;
				mctx = defines[key];
				delete defines['*'];
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
		mctx = defines[id];
		return mctx instanceof Mctx ? defines[id] = mctx.factory() : mctx;
	}

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
			// many script processing rules learned from RequireJS and LABjs

			el = doc.createElement('script');

			// js! plugin uses alternate mimetypes and such
			el.type = options.mimetype || 'text/javascript';
			el.charset = options.charset || 'utf-8';
			el.async = !options.order;
			el.src = joinPath(baseUrl, options.url);

			// using dom0 event handlers instead of wordy w3c/ms
			el.onload = el.onreadystatechange = process;
			el.onerror = fail;

			// loading will start when the script is inserted into the dom.
			// IE will load the script sync if it's in the cache, so
			// indicate the current resource definition first.
			activeScripts[options.id] = el;

			head.insertBefore(el, insertBeforeEl);

			return el;

			// initial script processing
			function process (ev) {
				ev = ev || global.event;
				// detect when it's done loading
				// ev.type == 'load' is for all browsers except IE6-9
				// IE6-9 need to use onreadystatechange and look for
				// el.readyState in {loaded, complete} (yes, we need both)
				if (ev.type == 'load' || readyStates[el.readyState]) {
					delete activeScripts[options.id];
					// release event listeners
					el.onload = el.onreadystatechange = el.onerror = ''; // ie cries if we use undefined
					cb();
				}
			}

			function fail (e) {
				// some browsers send an event, others send a string, but none
				// of them send anything informative, so just say we failed:
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
//
//	// Use process.nextTick or setImmediate if available, fallback to setTimeout
//	nextTurn = function () {
//		nextTurn = isFunction(global.setImmediate)
//			? global.setImmediate.bind(global)
//			: typeof process === 'object'
//				? process.nextTick
//				: function (task) { setTimeout(task, 0); };
//		return nextTurn.apply(this, arguments);
//	};


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