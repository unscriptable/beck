exports.before = function before (func, advice) {
	return function () {
		advice.apply(null, arguments);
		return func.apply(this, arguments);
	}
};

exports.after = function after (func, advice) {
	return function () {
		var result = func.apply(this, arguments);
		advice(result);
		return result;
	}
}
