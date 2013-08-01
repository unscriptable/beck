/** @module beck/promise */
(function (global) {

	/**
	 * Returns a new deferred.
	 * @return {Deferred}
	 */
	function defer () { return new Deferred(); }

	/**
	 * Promise implementation adapted from https://github.com/briancavalier/avow
	 * @constructor
	 */
	function Deferred () {
		var dfd, promise, pendingHandlers, bindHandlers;

		promise = { then: then, yield: yieldVal };

		// Create a dfd, which has a pending promise plus methods
		// for fulfilling and rejecting the promise
		dfd = this;

		/**
		 * Provides access to the deferred's promise, which has .then() and
		 * .yield() methods.
		 * @type {Object}
		 */
		this.promise = promise;

		/**
		 * Fulfills a deferred, resolving its promise.
		 * @param value
		 */
		this.fulfill = function (value) {
			applyAllPending(applyFulfill, value);
		};
		/**
		 * Rejects a deferred, rejecting its promise.
		 * @param reason
		 */
		this.reject = function (reason) {
			applyAllPending(applyReject, reason);
		};

		// Queue of pending handlers, added via then()
		pendingHandlers = [];

		// Arranges for handlers to be called on the eventual value or reason
		bindHandlers = function (onFulfilled, onRejected, vow) {
			pendingHandlers.push(function (apply, value) {
				apply(value, onFulfilled, onRejected, vow.fulfill, vow.reject);
			});
		};

		return dfd;

		// Arrange for a handler to be called on the eventual value or reason
		function then (onFulfilled, onRejected) {
			var dfd = defer();
			bindHandlers(onFulfilled, onRejected, dfd);
			return dfd.promise;
		}

		// When the promise is fulfilled or rejected, call all pending handlers
		function applyAllPending (apply, value) {
			var bindings;

			// Already fulfilled or rejected, ignore silently
			if (!pendingHandlers) return;

			bindings = pendingHandlers;
			pendingHandlers = undefined;

			// The promise is no longer pending, so we can swap bindHandlers
			// to something more direct
			bindHandlers = function (onFulfilled, onRejected, vow) {
				nextTurn(function () {
					apply(value, onFulfilled, onRejected, vow.fulfill, vow.reject);
				});
			};

			// Call all the pending handlers
			nextTurn(function () {
				var binding;
				while (binding = bindings.pop()) binding(apply, value);
			});
		}

		function yieldVal (val) {
			return promise.then(function () { return val; });
		}
	}

	// Call fulfilled handler and forward to the next promise in the queue
	function applyFulfill (val, onFulfilled, _, fulfillNext, rejectNext) {
		apply(val, onFulfilled, fulfillNext, fulfillNext, rejectNext);
	}

	// Call rejected handler and forward to the next promise in the queue
	function applyReject (val, _, onRejected, fulfillNext, rejectNext) {
		apply(val, onRejected, rejectNext, fulfillNext, rejectNext);
	}

	// Call a handler with value, and take the appropriate action
	// on the next promise in the queue
	function apply (val, handler, fallback, fulfillNext, rejectNext) {
		var result;
		try {
			if (typeof handler != 'function') return fallback(val);
			result = handler(val);
			if (isThenable(result)) result.then(fulfillNext, rejectNext);
			else fulfillNext(result);
		}
		catch (e) {
			rejectNext(e);
		}
	}

	/**
	 * Returns true only if the parameter is a Deferred created by this module.
	 * @param {*} it
	 * @return {Boolean}
	 */
	function isDeferred (it) {
		return it && it instanceof Deferred;
	}

	/**
	 * Returns true if the parameter is an object with a function named "then".
	 * @param {*} it
	 * @return {Boolean}
	 */
	function isThenable (it) {
		return it && typeof it.then == 'function';
	}

	/**
	 * Coerces unknown values to promises and calls an optional callback or
	 * errback when the promise fulfills or rejects.
	 * @param {*} it
	 * @param {Function} [callback]
	 * @param {Function} [errback]
	 * @return {promise}
	 */
	function when (it, callback, errback) {
		var dfd;
		if (!isThenable(it)) {
			dfd = new Deferred();
			dfd.fulfill(it);
			it = dfd.promise;
		}
		return it.then(callback, errback);
	}

	/**
	 * Returns a promise that fulfills with the results of many promises as
	 * an array of values.  The things parameter can be a mixed array of
	 * promises and values.
	 * @param {*} things
	 * @return {Object}
	 */
	function all (things) {
		var howMany, dfd, results, thing;

		howMany = 0;
		dfd = new Deferred();
		results = [];

		while (thing = things[howMany]) when(thing, counter(howMany++), dfd.reject);

		if (howMany == 0) dfd.fulfill(results);

		return dfd.promise;

		function counter (i) {
			return function (value) {
				results[i] = value;
				if (--howMany == 0) dfd.fulfill(results);
			};
		}
	}

	/**
	 * Executes a function, task, as soon as possible, but not in the current
	 * call stack.  (This statement is probably not technically accurate, but
	 * is close enough to convey meaning, I hope.)
	 * Uses process.nextTick or setImmediate if available, falls back to
	 * setTimeout.
	 * @function
	 * @param {Function} task
	 */
	var nextTurn = function () {
		nextTurn = typeof global.setImmediate == 'function'
			? global.setImmediate.bind(global)
			: typeof process === 'object'
				? process.nextTick
				: function (task) { setTimeout(task, 0); };
		return nextTurn.apply(this, arguments);
	};

	var promise = {
		Deferred: Deferred,
		defer: defer,
		isDeferred: isDeferred,
		isThenable: isThenable,
		when: when,
		all: all,
		nextTurn: nextTurn
	};

	System.set('beck/promise', new Module(promise));

}(typeof global == 'object' ? global : this.window || this.global || {}));
