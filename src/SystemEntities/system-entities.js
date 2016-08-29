'use strict'

let emitter = require("global-queue");
let patchwerk = require('patchwerk')(emitter);

class SystemEntities {
	constructor() {
		this.emitter = emitter;
	}
	init(config) {
		console.log('SE init');
	}
	launch() {
		return Promise.resolve(true);
	}
	actionCreate({
		type,
		params,
		source
	}) {
		return patchwerk.create(type, params, source)
			.then(systemObject => patchwerk.save(systemObject));
	}
	actionRead({
		type,
		params,
		options
	}) {
		return patchwerk.get(type, params, options)
	}
	actionDelete({
		type,
		params
	}) {

	}
	actionUpdate({
		type,
		params,
		source
	}) {
		return patchwerk.create(type, params, source)
			.then(systemObject => patchwerk.save(systemObject));
	}
}

module.exports = SystemEntities;
