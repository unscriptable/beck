(function (global, cjsmEval, globalEval) {


	/***** imports *****/

	var path = System.get('beck/path');
	var reduceLeadingDots = path.reduceLeadingDots;
	var joinPaths = path.joinPaths;
	var ensureExt = path.ensureExt;
	var fetchText = System.get('beck/fetchText');


	/***** exports *****/

	function Pipeline () {
		return {
			normalize: normalize,
			resolve: resolve,
			fetch: fetch,
			translate: translate,
			link: link
		};
	}

	System.set('beck/Pipeline', new Module(Pipeline));

	var removeCommentsRx, findRValueRequiresRx, absUrlRx;

	removeCommentsRx = /\/\*[\s\S]*?\*\/|\/\/.*?[\n\r]/g;
	findRValueRequiresRx = /require\s*\(\s*(["'])(.*?[^\\])\1\s*\)|[^\\]?(["'])/g;
	absUrlRx = /^\/|^[^:]+:\/\//;

	function normalize (name, referer) {
		var normalized, mctx;
		if (typeof referer == 'object') referer = referer.name;
		normalized = reduceLeadingDots(String(name), referer || '');
		mctx = {
			name: normalized,
			relName: name,
			refererName: referer
		};
		return {
			normalized: normalized,
			metadata: mctx
		};
	}

	function resolve (normalized, options) {
		var mctx = options.metadata;
		mctx.url = ensureExt(joinPaths('./', normalized), '.js');
		return mctx.url;
	}

	function fetch (resolved, fulfill, reject, options) {
		fetchText(
			resolved,
			function (source) {
				fulfill(addSourceUrl(resolved, source));
			},
			reject
		);
	}

	function translate (source, options) {
		return source;
	}

	function link (source, options) {
		if (options.type == 'script') {
			return parseScript(source, options);
		}
		else {
			return parseCjsm(source, options);
		}
	}

	function isAbsUrl (url) {
		return absUrlRx.test(url);
	}

	function addSourceUrl (url, source) {
		return source
			+ '\n/*\n////@ sourceURL='
			+ url.replace(/\s/g, '%20')
			+ '\n*/\n';
	}

	function parseScript (source, options) {
		return void globalEval(source);
	}

	function parseCjsm (source, options) {
		var mctx, currQuote, clean;

		mctx = options.metadata;
		mctx.deps = [];
		mctx.depsMap = {};

		// remove comments, then look for require() or quotes
		clean = source.replace(removeCommentsRx, '');
		clean.replace(findRValueRequiresRx, function (m, rq, id, qq) {
			// if we encounter a string in the source, don't look for require()
			if (qq) {
				currQuote = currQuote == qq ? void 0 : currQuote;
			}
			// if we're not inside a quoted string
			else if (!currQuote) {
				// push [relative] id into deps list and deps map
				if (!(id in mctx.depsMap)) {
					mctx.depsMap[id] = mctx.deps.push(id) - 1;
				}
			}
			return ''; // uses least RAM/CPU
		});

		return {
			imports: mctx.deps,
			execute: createCjsmFactory(source, options)
		};
	}

	// Note: does not support computed module ids in require() calls or
	// async require(id, cb, eb) as in AMD!
	function createCjsmFactory (source, options) {
		// just create a factory
		return function () {
			var mctx, deps, require, exports, module, glob;

			mctx = options.metadata;
			deps = arguments;
			require = function (id) {
				var dep;
				if (id in mctx.depsMap) {
					dep = deps[mctx.depsMap[id]];
				}
				// TODO: figure out if/how to resolve relative require()s of dynamic modules
				else if (isAbsUrl(id) && System.has(id)) {
					dep = System.get(id);
				}
				else {
					throw new Error('Module not resolved: ' + id + '. Dynamic require() not supported.');
				}
				return dep;
			};
			exports = {};
			module = { id: mctx.name, uri: mctx.url, exports: exports };
			glob = ('global' in options && options.global)
				|| ('global' in mctx && mctx.global)
				|| global;

			cjsmEval(require, exports, module, glob, source);

			return module.exports;
		};
	}

}(
	typeof global != 'undefined' ? global : this.global || this.window,
	// `new Function()` prevents obfuscators from obfuscating commonjs vars
	new Function('require', 'exports', 'module', 'global', 'eval(arguments[4]);'),
//	function (require, exports, module, global) { eval(arguments[4]); },
	function () { (1, eval)(arguments[0]); }
));