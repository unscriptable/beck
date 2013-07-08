(function () {
var path, absUrlRx, findDotsRx;

absUrlRx = /^\/|^[^:]+:\/\//;
findDotsRx = /(\.)(\.?)(?:$|\/([^\.\/]+.*)?)/g;

/**
 * @type {Object}
 * @module 'beck/init/path'
 */
path = {
	/**
	 * Returns true if the url is absolute (not relative to the document)
	 * @param {String} url
	 * @return {Boolean}
	 */
	isAbsUrl: function (url) { return absUrlRx.test(url); },

	isRelPath: function (url) { return url.charAt(0) == '.'; },

	joinPaths: function (base, sub) {
		base = path.removeEndSlash(base);
		return (base ? base + '/' : '') + sub;
	},

	removeEndSlash: function (path) {
		return path && path.charAt(path.length - 1) == '/'
			? path.substr(0, path.length - 1)
			: path;
	},

	ensureExt: function (path, ext) {
		return path.lastIndexOf(ext) == path.length - ext.length
			? path
			: path + ext;
	},

	reduceLeadingDots: function (childId, baseId) {
		var removeLevels, normId, levels, isRelative, diff;
		// this algorithm is similar to dojo's compactPath, which
		// interprets module ids of "." and ".." as meaning "grab the
		// module whose name is the same as my folder or parent folder".
		// These special module ids are not included in the AMD spec
		// but seem to work in node.js, too.

		removeLevels = 1;
		normId = childId;

		// remove leading dots and count levels
		if (path.isRelPath(normId)) {
			isRelative = true;
			// replaceDots also counts levels
			normId = normId.replace(findDotsRx, replaceDots);
		}

		if (isRelative) {
			levels = baseId.split('/');
			diff = levels.length - removeLevels;
			if (diff < 0) {
				// this is an attempt to navigate above parent module.
				// maybe dev wants a url or something. punt and return url;
				return childId;
			}
			levels.splice(diff, removeLevels);
			// normId || [] prevents concat from adding extra "/" when
			// normId is reduced to a blank string
			return levels.concat(normId || []).join('/');
		}
		else {
			return normId;
		}

		function replaceDots (m, dot, dblDot, remainder) {
			if (dblDot) removeLevels++;
			return remainder || '';
		}
	}
};

System.set('beck/init/path', ToModule(path));

}());