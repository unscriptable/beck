var System, Loader;
(function (global, globalEval) {

define(function () {

	function Loader () {}

	Loader.prototype = {

		global: global,
		strict: true,

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

		// TODO...

		load: function () {},
		"import": function () {},

		get: function () {},
		has: function () {},
		set: function () {},
		"delete": function () {}

	};

	return Loader;

});

}(
	typeof global == 'object' ? global : this.window || this.global || {},
	function () { return (1, eval).call(arguments[1], arguments[0]); }
));