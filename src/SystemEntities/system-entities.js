'use strict'

const _ = require('lodash');

const emitter = require("global-queue");
const patchwerk = require('patchwerk')(emitter);

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

		let type = 'ticket';

		source.called = 0;
		source.service_count = source.service_count || 1;
		source.booking_method = source.booking_method || 'live';
		source.locked_fields = [];

		if (source.operator) source.locked_fields.push('operator');
		if (source.destination) source.locked_fields.push('destination');

		let query = {
			department: source.org_destination,
			date: source.dedicated_date,
			counter: '*'
		};

		//@TODO: booking date
		//booking_date = moment.tz((таймзона org_destination тикета, org_destination = department)).format()

		return patchwerk.get('Service', {
				counter: params.service
			})
			.then(service => {
				source.time_description = source.booking_method == 'live' ? service.live_operation_time : [source.time_description, source.time_description + service.prebook_operation_time];
				source.expiry = 0; //calc if prebook

				return patchwerk.create(type, source, query);
			})
			.then(systemObject => patchwerk.save(systemObject))
			.then(object => {

				let sourceData = object.getSource();

				this.emitter.addTask('workstation', {
						_action: 'organization-data',
						organization: query.department
					})
					.then(org => {
						this.emitter.emit('ticket.emit.state', {
							org_merged: org.org_merged,
							ticket: sourceData,
							event_name: 'register'
						});
					});

				return {
					ticket: sourceData,
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
	actionCreateService(source) {
		let type = 'Service';

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
			.then(systemObject => patchwerk.save(systemObject))
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
			.then(systemObject => patchwerk.save(systemObject))
			.then(object => {
				let params = {
					role: source.role,
					id: id,
					organization: source.organization
				};

				return patchwerk.get('GlobalMembershipDescription', {})
					.then(gmd => gmd.add(params, patchwerk)) //@NOTE: this is temporary
					.then(gmd => object);
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
	actionAttchService(params) {
		let service = params.service;
		let entity = params.entity;
		let type = params.type;

		return patchwerk.get(type, {
				key: operator
			})
			.then(object => object.attachService(service))
			.then(object => {
				return {
					entity: object,
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

		return patchwerk.get(type, query, {})
			.then(collection => _.map(collection, item => _.pick(fieldset)))
			.then(collection => {
				return {
					success: true,
					list: collection
				};
			});
	}
}

module.exports = SystemEntities;