# beck.js

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
		  document's folder
		* Ensure amd, cjs, or es6 shims are properly installed
		* loader.load(module)

