'use strict'

const _ = require('lodash');
const path = require('path');

const emitter = require("global-queue");
const patchwerk = require('patchwerk')(emitter);

const discover = function (entity) {
	let name = _.kebabCase(entity);
	let dir = name;
	let module_path = path.join('entities', dir, name);

	return require(module_path);
};

const Entities = ['service'];

class SystemEntities {
	constructor() {
		this.emitter = emitter;
	}
	init(config) {}
	launch() {
		return Promise.resolve(true);
	}
	actionCreate({
		type,
		params,
		source
	}) {
		return patchwerk.create(type, source, params)
			.then(systemObject => patchwerk.save(systemObject))
			.then(object => {
				return {
					object: object.getSource(),
					success: true
				};
			});
	}
	actionRead({
		type,
		params,
		options
	}) {
		return patchwerk.get(type, params, options)
			.then(object => object.getSource())
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
		return patchwerk.create(type, source, params)
			.then(systemObject => patchwerk.save(systemObject))
			.then(object => object.getSource());
	}
	actionCreateTicket(source) {
		let method = source.booking_method || 'live';
		if (method == 'prebook')
			source.time_description = [parseInt(source.time_description)];

		let direction = method == 'live' ? 'queue' : 'prebook';
		source.force = true;
		source._action = 'ticket-confirm';
		return this.emitter.addTask(direction, source);
	}
	actionCreateService(source) {
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
			.then(object => {
				return {
					service: object.getSource(),
					success: true
				};
			})
			.catch(err => {
				return {
					reason: err.message,
					success: false
				};
			});
	}
	actionCreateSchedule(source) {
		let type = 'Schedule';

		let all_days = [
			"Monday",
			"Tuesday",
			"Wednesday",
			"Thursday",
			"Friday",
			"Saturday",
			"Sunday"
		];


		source.has_day = source.has_day || all_days;

		if (source.has_time_description) {
			let chunks = _.chunk(source.has_time_description, 2);
			source.has_time_description = {
				data: chunks,
				state: "a"
			};
		} else {
			source.has_time_description = {
				"data": [
					[
						0,
						86400
					]
				],
				"state": "a"
			};
		}

		return patchwerk.create(type, source, {
				counter: '*'
			})
			.then(systemObject => {
				return patchwerk.save(systemObject);
			})
			.then(object => {
				return {
					schedule: object.getSource(),
					success: true
				};
			})
			.catch(err => {
				return {
					reason: err.message,
					success: false
				};
			});
	}
	actionCreateOperator(source) {
		let type = 'Operator';
		let id = source.id;
		source.state = 'inactive';
		source.password_hash = source.password;

		delete source.id;
		delete source.password;

		return patchwerk.create(type, source, {
				counter: id
			})
			.then(systemObject => patchwerk.save(systemObject, {}))
			.then(object => {
				let params = {
					role: source.role,
					id: id,
					organization: source.organization
				};

				return patchwerk.get('GlobalMembershipDescription', {})
					.then(gmd => {
						return gmd.add(params, patchwerk);
					}) //@NOTE: this is temporary
					.then(gmd => object);
			})
			.then(object => {
				return {
					operator: object.getSource(),
					success: true
				};
			})
			.catch(err => {
				return {
					reason: err.message,
					success: false
				};
			});
	}
	actionAttachService(params) {
		let service = params.service;
		let entity = params.entity;
		let type = params.type;

		return patchwerk.get(type, {
				key: entity
			})
			.then(object => object.attachService(service))
			.then(object => patchwerk.save(object))
			.then(object => {
				return {
					entity: object.getSource(),
					success: true
				}
			})
	}
	actionList({
		department,
		type,
		fieldset
	}) {

		fieldset = fieldset || [];
		fieldset.push('@id');

		let query = {
			department,
			counter: '*'
		};

		//@NOTE: Use it!
		let options = {
			fieldset
		};
		type = type == 'service' ? 'global-service' : type;
		return patchwerk.get(type, query)
			.then(collection => {
				return _.map(collection, item => _.pick(item, fieldset))
			})
			.then(collection => {
				return {
					success: true,
					list: collection
				};
			});
	}
}

module.exports = SystemEntities;