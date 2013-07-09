require('../load');
System.load('run',
	function (run) {
		console.log('this is the main module: ', run);
	},
	function (ex) {
		console.error('oops!', ex);
		throw ex;
	}
);
