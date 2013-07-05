# beck.js

# This is an experiment

It's an experimental ES6 Module Loader shim.  This experiment deviates from the
spec in various ways.  It does this when the spec seems to do strange things or
makes it really difficult to do common things -- things we've been doing with
javascript modules since 2007.

# This isn't ready for use, yet.

This project isn't ready for you to try out, yet.  **IT DOES NOT WORK!**

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
