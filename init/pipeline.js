(function (global, cjsmEval) {


	/***** imports *****/

	var reduceLeadingDots = getReduceLeadingDotsImpl;
	var joinPaths = getJoinPathsImpl;
	var fetchText = getFetchTextImpl;


	/***** exports *****/

	var pipeline  = {
		normalize: normalize,
		resolve: resolve,
		fetch: fetch,
		translate: translate,
		link: link
	};

	System.set('beck/init/pipeline', ToModule(pipeline));


	var removeCommentsRx, findRValueRequiresRx;

	removeCommentsRx = /\/\*[\s\S]*?\*\/|\/\/.*?[\n\r]/g;
	findRValueRequiresRx = /require\s*\(\s*(["'])(.*?[^\\])\1\s*\)|[^\\]?(["'])/g;

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
		mctx.url = joinPaths('./', normalized);
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
		return parseCjsm(source, options);
	}

	function addSourceUrl (url, source) {
		return source
			+ '\n/*\n////@ sourceURL='
			+ url.replace(/\s/g, '%20')
			+ '\n*/\n';
	}

	function parseCjsm (source, options) {
		var mctx, currQuote;

		mctx = options.metadata;
		mctx.deps = [];
		mctx.depsMap = {};

		// remove comments, then look for require() or quotes
		source = source.replace(removeCommentsRx, '');
		source.replace(findRValueRequiresRx, function (m, rq, id, qq) {
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
			require = function (id) { return deps[mctx.depsMap[id]]; };
			exports = {};
			module = { id: mctx.name, uri: mctx.url, exports: exports };
			glob = ('global' in options && options.global)
				|| ('global' in mctx && mctx.global)
				|| global;

			cjsmEval(require, exports, module, glob, source);

			return module.exports;
		};
	}

	function getReduceLeadingDotsImpl () {
		reduceLeadingDots = System.get('beck/init/path').reduceLeadingDots;
		return reduceLeadingDots.apply(this, arguments);
	}

	function getJoinPathsImpl () {
		joinPaths = System.get('beck/init/path').joinPaths;
		return joinPaths.apply(this, arguments);
	}

	function getFetchTextImpl () {
		fetchText = System.get('beck/init/fetchText');
		return fetchText.apply(this, arguments);
	}

}(
	typeof global != 'undefined' ? global : this.global || this.window,
	function (require, exports, module, global) { eval(arguments[4]); }
));