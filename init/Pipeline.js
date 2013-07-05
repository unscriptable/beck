(function (global, cjsmEval) {

	var reduceLeadingDots = getReduceLeadingDotsImpl;
	var joinPaths = getJoinPathsImpl;
	var fetchText = getFetchTextImpl;

	var removeCommentsRx, findRValueRequiresRx;

	removeCommentsRx = /\/\*[\s\S]*?\*\/|\/\/.*?[\n\r]/g;
	findRValueRequiresRx = /require\s*\(\s*(["'])(.*?[^\\])\1\s*\)|[^\\]?(["'])/g;

	function Pipeline () {

		var mctx = {};

		function normalize (name, referer) {
			if (typeof referer == 'object') referer = referer.name;
			mctx.relName = name;
			mctx.refererName = referer;
			mctx.name = reduceLeadingDots(String(name), referer || '');
			return mctx.name;
		}

		function resolve (normalized, referer) {
			mctx.url = joinPaths('./', normalized);
			return mctx.url;
		}

		function fetch (resolved, fulfill, reject) {
			fetchText(
				resolved,
				function (source) {
					fulfill(addSourceUrl(resolved, source));
				},
				reject
			);
		}

		function translate (source) {
			return source;
		}

		function link (source) {
			return parseCjsm(mctx, source);
		}

		return {
			mctx: mctx,
			normalize: normalize,
			resolve: resolve,
			fetch: fetch,
			translate: translate,
			link: link
		};

	}

	System.set('beck/init/Pipeline', ToModule(Pipeline));

	function addSourceUrl (url, source) {
		return source
			+ '\n/*\n////@ sourceURL='
			+ url.replace(/\s/g, '%20')
			+ '\n*/\n';
	}

	function parseCjsm (mctx, source) {
		var currQuote;

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
				mctx.depsMap[id] = mctx.deps.push(id) - 1;
			}
			return ''; // uses least RAM/CPU
		});

		return {
			imports: mctx.deps,
			execute: createCjsmFactory(mctx, source)
		};
	}

	function createCjsmFactory (mctx, source) {
		// just create a factory
		return function () {
			var deps, require, exports, module, glob;

			deps = arguments;
			require = function (id) { return deps[mctx.depsMap[id]]; };
			exports = {};
			module = { id: mctx.name, uri: mctx.url, exports: exports };
			glob = 'global' in mctx ? mctx.global : global;

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