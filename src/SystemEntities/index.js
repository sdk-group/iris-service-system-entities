'use strict'

let events = {
	system_entities: {}
}

let tasks = [];


module.exports = {
	module: require('./system-entities.js'),
	name: 'system-entities',
	permissions: [],
	tasks: tasks,
	exposed: true,
	events: {
		group: 'system-entities',
		shorthands: events.system_entities
	}
};