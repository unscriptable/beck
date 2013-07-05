(function (global, cjsmEval) {

	function link (source) {
		return parseCjsm(source);
	}

	System.set('beck/pipeline/link', ToModule(link));

	var removeCommentsRx, findRValueRequiresRx;

	removeCommentsRx = /\/\*[\s\S]*?\*\/|\/\/.*?[\n\r]/g;
	findRValueRequiresRx = /require\s*\(\s*(["'])(.*?[^\\])\1\s*\)|[^\\]?(["'])/g;

	function parseCjsm (source) {
		var deps, depsMap, currQuote;

		deps = [];
		depsMap = {};

		// remove comments, then look for require() or quotes
		source = source.replace(removeCommentsRx, '');
		source.replace(findRValueRequiresRx, function (m, rq, id, qq) {
			// if we encounter a string in the source, don't look for require()
			if (qq) {
				currQuote = currQuote == qq ? void 0 : currQuote;
			}
			// if we're not inside a quoted string
			else if (!currQuote) {
				depsMap[id] = deps.push(id) - 1;
			}
			return ''; // uses least RAM/CPU
		});

		return {
			imports: deps,
			execute: createCjsmFactory(source, depsMap)
		};
	}

	function createCjsmFactory (source, depsMap) {
		// just create a factory
		return function () {
			var deps, require, exports, module;

			deps = arguments;
			require = function (id) { return deps[depsMap[id]]; };
			exports = {};
			// TODO: figure out how to provide module id and url
			// TODO: figure out how to provide the correct global
			module = { /*id: id, uri: url,*/ exports: exports };

			cjsmEval(require, exports, module, global, source);

			return module.exports;
		};
	}

}(
	typeof global != 'undefined' ? global : this.global || this.window,
	function (require, exports, module, global) { eval(arguments[4]); }
));