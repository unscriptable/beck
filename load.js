var System, Loader;
(function (global, XMLHttpRequest, globalEval) {

	var getShim, doc, scriptMatchRx, path;

	getShim = fetchShim;
	doc = global.document;
	scriptMatchRx = /beck.*js/;
	path = findScriptPath();

	// sniff System and Loader
	if (typeof Loader == 'undefined') {
		Loader = _Loader;
	}

	if (typeof System == 'undefined') {
		System = new Loader();
	}

	// stub ES6 Loader
	function _Loader (options) {
		this.global = options.global;
		// TODO: process other options
	}

	_Loader.prototype = {

		global: global,
		strict: true,

//		normalize: failNotReady,
//		resolve: failNotReady,
//		fetch: failNotReady,
//		translate: failNotReady,
//		link: failNotReady,
//		defineBuiltins: failNotReady,

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

		has: function (id) {
			var shim;
			shim = getShimSync();
			if (!shim) return false;
			else return shim.has(id);
		},


		load: shimCallerAsync('load'),
		"import": shimCallerAsync('import'),

		// TODO: these need to defer to the shim when it is ready
		get: shimCallerSync('get'),
		set: shimCallerSync('set'),
		"delete": shimCallerSync('delete')

	};

	var shim, shimWaiters;

	shimWaiters = [];

	function callShimAsync (loader, funcName, params) {
		getShim(function (shim) {
			shim[funcName].apply(loader, params);
		});
	}

	function shimCallerAsync (funcName) {
		return function () {
			getShim(function (shim) {
				shim[funcName].apply(this, arguments);
			});
		};
	}

	function shimCallerSync (funcName) {
		return function () {
			var shim = getShimSync();
			if (!shim) failNotReady();
			else return shim[funcName].apply(this, arguments);
		};
	}

	function getShimSync () {
		return shim;
	}

	function fetchShim (callback) {
		// rewrite getShim
		getShim = waitForShim;
		// register this callback as a waiter
		waitForShim(callback);
		// fetch the shim
		loadScript(
			// TODO: figure out url
			{ url: url },
			function success () {
				// at this point, the Loader shim should be defined
				shim = Loader.prototype;
				// rewrite getShim
				getShim = callShimNow;
				callShimWaiters();
			},
			function fail (ex) {
				ex = ex || new Error('Could not load:');
				ex.message += ' ' + url;
				throw ex;
			}
		);

	}

	function waitForShim (callback) {
		shimWaiters.push(callback);
	}

	function callShimWaiters () {
		var waiter;
		while (waiter = shimWaiters.unshift()) {
			waiter();
		}
	}

	function callShimNow (cb) { cb(shim); }

	function findScriptPath () {
		var scripts, current, script, path;
		if (doc) {
			// browsers
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
		}
		else if (typeof module != 'undefined') {
			// ringo and node
			path = module.uri;
		}
		return path && path.slice(0, path.lastIndexOf('/') + 1);
	}

	function failNotReady () {
		throw new Error('Cannot access loader before it is fully loaded.');
	}

	function isFunction (it) { return typeof it == 'function'; }

	function noop () {}

	/***** script loader *****/

	var loadScript, activeScripts, readyStates, head, insertBeforeEl;

	// ringojs
	if (typeof load == 'function') loadScript = asyncifyLoad(load);
	// other commonjs
	else if (typeof require == 'function') loadScript = asyncifyLoad(require);
	// browser
	else if (doc) {
		activeScripts = [];
		readyStates = 'addEventListener' in global
			? {}
			: { 'loaded': 1, 'complete': 1 };
		head = doc && (doc['head'] || doc.getElementsByTagName('head')[0]);
		// to keep IE from crying, we need to put scripts before any
		// <base> elements, but after any <meta>.
		insertBeforeEl = head && head.getElementsByTagName('base')[0] || null;
		loadScript = function (options, cb, eb) {
			var el;
			// script processing rules learned from RequireJS

			el = doc.createElement('script');

			// js! plugin uses alternate mimetypes and such
			el.type = options.mimetype || 'text/javascript';
			el.charset = options.charset || 'utf-8';
			el.async = !options.order;
			el.src = options.url;

			// using dom0 event handlers instead of wordy w3c/ms
			el.onload = el.onreadystatechange = process;
			el.onerror = fail;

			// loading will start when the script is inserted into the dom.
			// IE will load the script sync if it's in the cache, so
			// indicate the current resource definition first.
			activeScripts[options.id] = el;

			head.insertBefore(el, insertBeforeEl);

			// the js! plugin uses this
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
	// fail
	else loadScript = function () { throw new Error('Can\'t load scripts!'); };

	function asyncifyLoad (loadFunc) {
		return function (options, cb, eb) {
			nextTurn(function () {
				try { cb(loadFunc(options.url)); } catch (ex) { eb(ex); }
			});
		};
	}

	/***** shims *****/

	var nextTurn;

	// shim XHR, if necessary (IE6). TODO: node/ringo solution?
	if (!XMLHttpRequest) {
		XMLHttpRequest = function () {
			var progIds;
			progIds = ['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'];
			// keep trying progIds until we find the correct one,
			while (progIds.length && !XMLHttpRequest) {
				XMLHttpRequest = tryProgId(progIds.shift());
			}
			if (!XMLHttpRequest) throw new Error('XMLHttpRequest not available');
			return XMLHttpRequest();
			function tryProgId (progId) {
				try {
					new ActiveXObject(progId);
					return function () { return new ActiveXObject(progId); };
				}
				catch (ex) {}
			}
		};
	}

	// Use process.nextTick or setImmediate if available, fallback to setTimeout
	nextTurn = function () {
		nextTurn = isFunction(global.setImmediate)
			? global.setImmediate.bind(global)
			: typeof process === 'object'
				? process.nextTick
				: function (task) { setTimeout(task, 0); };
		return nextTurn.apply(this, arguments);
	};


}(
	typeof global == 'object' ? global : this.window || this.global || {},
	typeof XMLHttpRequest != 'undefined' && XMLHttpRequest,
	function () { return (1, eval).call(arguments[1], arguments[0]); }
));