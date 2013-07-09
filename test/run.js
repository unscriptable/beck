// this is just a global script file

console.log('running inside run.js');

System.import('app/main', function (main) {
	main.init();
});