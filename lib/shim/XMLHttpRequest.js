var XMLHttpRequest;
(function () {

	// shim XHR, if necessary (IE6).
	// TODO: node/ringo solution?
	if (!XMLHttpRequest) {
		XMLHttpRequest = function () {
			var progIds;
			progIds = ['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'];
			// keep trying progIds until we find the correct one,
			while (progIds.length && !XMLHttpRequest) {
				XMLHttpRequest = tryProgId(progIds.shift());
			}
			if (!XMLHttpRequest) throw new Error('XMLHttpRequest not available');
			return XMLHttpRequest();
			function tryProgId (progId) {
				try {
					new ActiveXObject(progId);
					return function () { return new ActiveXObject(progId); };
				}
				catch (ex) {}
			}
		};
	}

	System.set('beck/lib/shim/XMLHttpRequest', XMLHttpRequest);

}());
