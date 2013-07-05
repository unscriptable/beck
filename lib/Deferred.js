/***** deferred *****/
(function () {

	/**
	 * promise implementation adapted from https://github.com/briancavalier/avow
	 * @return {Deferred}
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
			var dfd = new Deferred();
			bindHandlers(onFulfilled, onRejected, dfd);
			return dfd.promise;
		}

		// When the promise is fulfilled or rejected, call all pending handlers
		function applyAllPending (apply, value) {
			var bindings;

			// Already fulfilled or rejected, ignore silently
			if (!pendingHandlers)  return;

			bindings = pendingHandlers;
			pendingHandlers = undefined;

			// The promise is no longer pending, so we can swap bindHandlers
			// to something more direct
			bindHandlers = function (onFulfilled, onRejected, vow) {
				Deferred.nextTurn(function () {
					apply(value, onFulfilled, onRejected, vow.fulfill, vow.reject);
				});
			};

			// Call all the pending handlers
			Deferred.nextTurn(function () {
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
			if (isPromise(result)) result.then(fulfillNext, rejectNext);
			else fulfillNext(result);
		}
		catch (e) {
			rejectNext(e);
		}
	}

	function isDeferred (it) {
		return it && it instanceof Deferred;
	}
	Deferred.isDeferred = isDeferred;

	function isPromise (it) {
		return it && typeof it.then == 'function';
	}
	Deferred.isPromise = isPromise;

	function when (it, callback, errback) {
		var dfd;
		if (!isPromise(it)) {
			dfd = new Deferred();
			dfd.fulfill(it);
			it = dfd.promise;
		}
		return it.then(callback, errback);
	}
	Deferred.when = when;

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
	Deferred.all = all;

	// Use process.nextTick or setImmediate if available, fallback to setTimeout
	Deferred.nextTurn = function () {
		Deferred.nextTurn = typeof global.setImmediate == 'function'
			? global.setImmediate.bind(global)
			: typeof process === 'object'
				? process.nextTick
				: function (task) { setTimeout(task, 0); };
		return Deferred.nextTurn.apply(this, arguments);
	};

	System.set('beck/lib/Deferred', ToModule(Deferred));

}());
