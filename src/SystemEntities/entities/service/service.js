"use strict";

module.exports = function (patchwerk) {
	return {
		create(source) {
			let type = 'GlobalService';

			source.prebook_offset = source.prebook_offset || 0;
			source.ordering = source.ordering || 1;
			source.priority = source.priority || 0;

			let counter = '*';

			if (source.id) {
				counter = source.id;
				delete source.id;
			}

			return patchwerk.create(type, source, {
					counter
				})
				.then(systemObject => {
					return patchwerk.save(systemObject)
				})
				.then(object => {
					if (counter == '*') return object;

					let params = {
						id: counter
					};

					return patchwerk.get('ServiceCounter', {})
						.then(counter => counter.add(params, patchwerk)) //@NOTE: this is temporary
						.then(counter => object);
				})
		},
		update() {},
		delete() {},
		get() {}
	}
};
