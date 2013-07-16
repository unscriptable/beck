# beck.js

# This is a work in progress

beck.js is a toolkit for building ES6 Module Loader pipelines as well as an ES6
Module Loader shim for legacy environments.

The shim deviates from the spec in various ways.  It does this when the
spec seems to do strange things or makes it really difficult to do
common things -- things we've been doing with javascript modules since 2007.

# This isn't ready for use, yet.

This project probably isn't ready for you to try out, yet.  It only
understands CommonJS modules that have not been concatenated using some
sort of transport format (browsers) and has onlly been rudimentally tested
in modern browsers, node.js, and RingoJS.

Stay tuned for further updates.

## Loader behavior

* Sense if environment has an ES6 loader already
	* If not, stub one asap
* Await first require/request or config() call
	* If config()
		* Ensure amd, cjs, or es6 shims are properly installed
		* If main, loader.load(main)
	* If require() or data-beck-run
		* If no config has been set for this module, sniff for package.json at
		  every folder in path to module, starting at deepest and ending at
		  document's folder (also: bower.json and beck.json)
		* Ensure amd, cjs, or es6 shims are properly installed
		* System.load(module)
* Config could also be supplied in an HTML data-* attr

## Open questions

* How does beck wait for first require/request or config() call in node/ringo?
	* ENV var?
	* System.load/import

## Differences from ModuleLoader/es6-module-loader / ES6 Spec

* Do scripts get normalized or resolved?
	* beck: maybe normalization isn't necessary, but resolving seems useful!
	* ModuleLoader: they don't get normalized or resolved
	* ES6 spec: hard to follow code, but it seems similar
* Should all pipeline steps be async?
	* beck: yes!
	* ModuleLoader: just fetch
	* ES6 spec: just fetch
* Pass options to import, load, eval, and evalAsync
	* beck: creates options internally
	* ModuleLoader: creates options internally
	* ES6 reference impl: passes it in and uses it for referer only
