/** @module beck/lib/aop */

/**
 * Returns a function that executes the advice function before the func
 * function.  The advice function and the func function receive the arguments
 * sent to the returned function.  The advice function cannot change
 * the arguments that are sent to func.
 * @param {Function} func
 * @param {Function} advice
 * @return {Function}
 */
exports.before = function before (func, advice) {
	return function () {
		advice.apply(null, arguments);
		return func.apply(this, arguments);
	}
};

/**
 * Returns a function that executes the advice function after the func
 * function.  The advice function receives the result of func as its only
 * argument.
 * @param {Function} func
 * @param {Function} advice
 * @return {Function}
 */
exports.after = function after (func, advice) {
	return function () {
		var result = func.apply(this, arguments);
		advice(result);
		return result;
	}
};
