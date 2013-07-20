/** @module beck/lib/script */

var doc, loadScript, activeScripts, getDefinedModuleId;

doc = global.document;

// node, ringojs, etc.
if (typeof module != 'undefined' && typeof require == 'function') {
	loadScript = createCallbackLoader(require);
	// in node, module.id is bogus, don't try to use it.  Should we enable this
	// for RingoJS which returns something more useful?
	getDefinedModuleId = function () {};
}
// browser
else if (doc) {
	activeScripts = {};
	loadScript = createBrowserScriptLoader(doc);
	getDefinedModuleId = getCurrentScriptId;
}
// fail
else {
	loadScript = getDefinedModuleId = function () {
		throw new Error('Can\'t load scripts in this environment.');
	};
}

/**
 * Loads and executes a script.  In browsers, the script is executed in
 * the global scope.  In CommonJS environments, the script is executed in
 * a module scope.
 * @function
 * @param {Object} options
 * @param {Function} callback
 * @param {Function} errback
 * @return {Undefined|HTMLScriptElement}
 */
exports.loadScript = loadScript;

/**
 * Returns the id of the currently executing module.
 * Note: browsers only. Node.js returns useless garbage as of 0.8.x.
 * @function
 * @return {String}
 */
exports.getDefinedModuleId = getDefinedModuleId;

function createCallbackLoader (loadFunc) {
	return function (options, cb, eb) {
		var url = options.url;
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
