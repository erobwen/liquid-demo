// Using UMD pattern: https://github.com/umdjs/umd
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory); // Support AMD
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory(); // Support NodeJS
    } else {
        root.eternity = factory(); // Support browser global
    }
}(this, function () {
		// Helper
	let argumentsToArray = function(arguments) {
		return Array.prototype.slice.call(arguments);
	};
	
	// Neat logging
	let objectlog = require('./objectlog.js');
	let log = objectlog.log;
	// function log() {
		// throw new Error("quit talking");
	// }
	let logGroup = objectlog.enter;
	let logUngroup = objectlog.exit;
	
	var Fiber = require('fibers');
	
	function createLiquidInstance(configuration) {		
		pagesMap = {};
		sessionsMap = {};

		include('./liquid/server/liquidServer.js');

		
		/**--------------------------------------------------------------
		 *              Page and session setup
		 *----------------------------------------------------------------*/
		 
		function generatePageId() {
			return liquid.generateUniqueKey(liquid.pagesMap);
		};
		
		function generateUniqueKey(keysMap) {
			var newKey = null;
			while(newKey == null) {
				var newKey = Number.MAX_SAFE_INTEGER * Math.random();
				if (typeof(keysMap[newKey]) !== 'undefined') {
					newKey = null;
				}
			}
			return newKey;
		};
		
		// function createOrGetSessionObject(req) {
			// var hardToGuessSessionId = req.session.id;
		function createOrGetSessionObject(hardToGuessSessionId) {
			if (typeof(liquid.sessionsMap[hardToGuessSessionId]) === 'undefined') {
				// TODO: createPersistent instead
				liquid.sessionsMap[hardToGuessSessionId] = create('LiquidSession', {hardToGuessSessionId: hardToGuessSessionId});
			}
			return liquid.sessionsMap[hardToGuessSessionId];
		};
		
		
		/**--------------------------------------------------------------
		 *              Selection
		 *----------------------------------------------------------------*/

		function addToSelection = function(selection, object) {
				if (object !== null && typeof(selection[object._id]) === 'undefined' && liquid.allowRead(object)) {
					trace('selection', "Added: ", object);
					selection[object._id] = true;
					return true;
				} else {
					trace('selection', "Nothing to add!");
					// console.log("Nothing to add!");
					return false;
				}
			};
		};
		
		
		/**--------------------------------------------------------------
		 *              Receive changes from upstream
		 *----------------------------------------------------------------*/
		
		function receiveChangesFromUpstream(changes) {
			liquid.pulse('upstream', function() {
				// Consolidate ids:
				for (id in changes.idToUpstreamId) {
					liquid.getEntity(id)._upstreamId = changes.idToUpstreamId[id];
				}
				console.log(changes);
				//result
				liquid.unserializeFromUpstream(changes.addedSerialized);

				liquid.blockUponChangeActions(function() {
					liquid.allUnlocked++;
					changes.events.forEach(function(event) {
						if (event.action === 'addingRelation') {
							var object = liquid.getUpstreamEntity(event.objectId);
							var relatedObject = liquid.getUpstreamEntity(event.relatedObjectId);
							var relation = object._relationDefinitions[event.relationName];
							if (relation.isSet) {
								object[relation.adderName](relatedObject);
							} else {
								object[relation.setterName](relatedObject);
							}
						} else if (event.action === 'deletingRelation') {
							liquid.activeSaver = null;
							var object = liquid.getUpstreamEntity(event.objectId);
							var relatedObject = liquid.getUpstreamEntity(event.relatedObjectId);
							var relation = object._relationDefinitions[event.relationName];
							if (relation.isSet) {
								object[relation.removerName](relatedObject);
							} else {
								object[relation.setterName](null);
							}
							liquid.activeSaver = liquid.defaultSaver;
						} else if (event.action === 'settingProperty') {
							liquid.activeSaver = null;
							var object = liquid.getUpstreamEntity(event.objectId);
							var setterName = object._propertyDefinitions[event.propertyName].setterName;
							object[setterName](event.newValue);
							liquid.activeSaver = liquid.defaultSaver;
						}
					});

					// and create an "originators copy" of the data for safekeeping. 
					for (upstreamId in changes.unsubscribedUpstreamIds) {
						var object = liquid.getUpstreamEntity(upstreamId);
						object.setIsLockedObject(true);
					}
					liquid.allUnlocked--;
				});
			});			
		}
			
			
		/**--------------------------------------------------------------
		 *              Call on server
		 *----------------------------------------------------------------*/
		
		
		var callId = 0;
		
		function addCallOnServer = function(object) {
			if (liquid.onClient) {
				object['callOnServer'] = function() {
					// Split arguments
					var argumentsArray = argumentsToArray(arguments);
					var methodName = argumentsArray.shift();
					var methodArguments = argumentsArray;
					var callData = {
						callId: callId++,
						objectId: this._upstreamId,
						methodName: methodName,
						argumentList: cloneAndMapLiquidObjectsDeep(argumentsArray, function(liquidObject) {
							if (liquidObject._upstreamId != null) {
								return { id : liquidObject._upstreamId };
							} else {
								return null; // TODO: consider, should we push data to server?
							}
						})
					};
					traceGroup('serialize', "=== Call on server ===");
					trace('serialize', callData.callId, callData.objectId, callData.methodName);
					trace('serialize', callData.argumentList);
					traceGroupEnd();
					liquid.makeCallOnServer(callData);
				};
			}
		};
		
		
		/**--------------------------------------------------------------
		 *              Push data upstream
		 *----------------------------------------------------------------*/
		
		
		// Form for events:
		//  {action: addingRelation, objectId:45, relationName: 'Foobar', relatedObjectId:45 }
		//  {action: deletingRelation, objectId:45, relationName: 'Foobar', relatedObjectId:45 }
		//  {action: addingRelation, objectDownstreamId:45, relationName: 'Foobar', relatedObjectDownstreamId:45 }
		//  {action: settingProperty, objectDownstreamId:45, propertyName: 'Foobar', propertyValue: 'Some string perhaps'}
		function serializeEventForUpstream(event) {
			// console.log(event);
			var serialized  = {
				action: event.action
			};
		
			if (event.object._upstreamId !== null) {
				serialized.objectId = event.object._upstreamId;
			} else {
				serialized.objectDownstreamId = event.object._id;
			}
		
			if (event.definition.type === 'relation') {
				serialized.relationQualifiedName = event.definition.qualifiedName;
		
				if (typeof(event.relatedObject) !== 'undefined') {
					if (event.relatedObject._upstreamId !== null) {
						serialized.relatedObjectId = event.relatedObject._upstreamId;
					} else {
						serialized.relatedObjectDownstreamId = event.relatedObject._id;
					}
				}
			} else {
				serialized.propertyName = event.definition.name;
				serialized.newValue = event.newValue;
			}
		
			return serialized;
		}
		
		
		function tryPushMessageUpstream(message, data) {
			if (typeof(pushMessageUpstreamCallback) !== 'undefined') {
				pushMessageUpstreamCallback(message, instancePage.getHardToGuessPageId(), data);
			}
		}
		
		function tryPushSerializedPulseUpstream(serializedPulse) {
			tryPushMessageUpstream("pushDownstreamPulse", serializedPulse);
		}

		function tryMakeCallOnServer(callData) {
			tryPushMessageUpstream("makeCallOnServer", callData);
		}
		
		var pushMessageUpstreamCallback;
		function setPushMessageUpstreamCallback(callback) {
			pushMessageUpstreamCallback = callback;
		}
		
		/**
		 * Receiving from server
		 * 
		 * Structure of input:
		 * 
		 * serializedObjects
		 * [{
			 * 	 id: 34
			 * 	 className: 'Dog'
			 *	 HumanOwner: 'Human:23'
			 *	 property: "A string"
			 * }]
		 * unsubscribedUpstreamIds
		 * idToUpstreamId
		 * events  [{action: addingRelation, objectId:45, relationName: 'Foobar', relatedObjectId:45 }]
		 */
		function pushDataUpstream = function() {
			// console.log("Not yet!");
			// return;
			if (typeof(liquid.upstreamSocket) !== undefined) {
				// console.group("Consider push data upstream");
		
				// Find data that needs to be pushed upstream
				var requiredObjects = {};
				function addRequiredCascade(object, requiredObjects) {
					if (object._upstreamId === null && typeof(requiredObjects[object.id]) === 'undefined') {
						requiredObjects[object.id] = object;
						object.forAllOutgoingRelationsAndObjects(function(definition, instance, relatedObject) {
							addRequiredCascade(relatedObject);
						});
					}
				}
		
				liquid.activePulse.events.forEach(function(event) {
					var eventIsFromUpstream = liquid.activePulse.originator === 'upstream' && event.isDirectEvent;
					if (!eventIsFromUpstream) {
						trace('serialize', "processing event required objects");
						if (event.object._upstreamId !== null && event.action == 'addingRelation' && event.relatedObject._upstreamId === null) {
							addRequiredCascade(event.relatedObject, requiredObjects);
						}
					}
				});
		
				var serializedObjects = [];
				for(id in requiredObjects) {
					var serializedObject = liquid.serializeObject(requiredObjects[id], true);
					serializedObjects.push(serializedObject);
				}
		
				var serializedEvents = [];
				liquid.activePulse.events.forEach(function(event) {
					// console.log(event);
					var eventIsFromUpstream = liquid.activePulse.originator === 'upstream' && event.isDirectEvent;
					if (!event.redundant && !eventIsFromUpstream) {
						trace('serialize', "not from upstream");
						if (event.object._upstreamId !== null && typeof(event.definition) !== 'undefined' && !event.definition.clientOnly) {
							serializedEvents.push(serializeEventForUpstream(event));
						} else if (typeof(requiredObjects[event.object._id]) !== 'undefined') {
							serializedEvents.push(serializeEventForUpstream(event));
						}
					}
				});
		
				var serializedPulse = {
					serializedEvents : serializedEvents,
					serializedObjects : serializedObjects
				};
		
				if (serializedPulse.serializedEvents.length > 0 || serializedPulse.serializedObjects.length > 0) {
					trace('serialize', "Push upstream:", serializedPulse);
					// console.log(serializedPulse);
					tryPushSerializedPulseUpstream(serializedPulse);
				}
		
				// console.groupEnd();
			}
		};
		
		
		
		/**--------------------------------------------------------------
		 *            Unserialization from upstream
		 *----------------------------------------------------------------*/
		
		function unserializeUpstreamReference(reference) {
			if (reference === null) {
				return null;
			}
			var fragments = reference.split(":");
			var className = fragments[0];
			var id = parseInt(fragments[1]);
			var locked = fragments[2] === 'true' ? true : false;
			// console.log("What the hell!!!");
			// console.log(fragments);
			// console.log(locked);
			return ensureEmptyObjectExists(id, className, locked);
		}
		
		function ensureEmptyObjectExists(upstreamId, className, isLocked) {
			if (typeof(liquid.upstreamIdObjectMap[upstreamId]) === 'undefined') {
				var newObject = liquid.createClassInstance(className);
				newObject._upstreamId = upstreamId;
				liquid.upstreamIdObjectMap[upstreamId] = newObject;
				newObject._ = newObject.__();
				newObject.setIsPlaceholderObject(true);
				newObject.setIsLockedObject(isLocked);
				// newObject._noDataLoaded = true;
			}
			return liquid.upstreamIdObjectMap[upstreamId];
		}
		
		function unserializeUpstreamObject(serializedObject) {
			// console.log("unserializeObject: " + serializedObject.className);
			// console.log(serializedObject);
			var upstreamId = serializedObject.id;
			if (typeof(liquid.upstreamIdObjectMap[upstreamId]) === 'undefined') {
				ensureEmptyObjectExists(upstreamId, serializedObject.className, false);
			}
			var targetObject = liquid.upstreamIdObjectMap[upstreamId];
			// console.log(targetObject);
			if (targetObject.getIsPlaceholderObject()) {
				targetObject.forAllOutgoingRelations(function(definition, instance) {
					// console.log("processingRelation: " + definition.name);
					trace('unserialize', definition.name, "~~>", targetObject);
					if (typeof(serializedObject[definition.qualifiedName]) !== 'undefined') {
						var data = serializedObject[definition.qualifiedName];
						if (definition.isSet) {
							data = data.map(unserializeUpstreamReference);
						} else {
							data = unserializeUpstreamReference(data);
						}
						targetObject[definition.setterName](data);
					}
				});
				for (propertyName in targetObject._propertyDefinitions) {
					definition = targetObject._propertyDefinitions[propertyName];
					// console.log("processingProperty: " + definition.name);
					trace('unserialize', definition.name, "~~>", targetObject);
					if (typeof(serializedObject[definition.name]) !== 'undefined') {
						var data = serializedObject[definition.name];
						targetObject[definition.setterName](data);
					}
				}
				targetObject.setIsPlaceholderObject(false);
				targetObject._ = targetObject.__();
			} else {
				trace('unserialize', "Loaded data that was already loaded!!!");
				// console.log("Loaded data that was already loaded!!!");
			}
		}
		
		
		function unserializeFromUpstream(arrayOfSerialized) { // If optionalSaver is undefined it will be used to set saver for all unserialized objects.
			liquid.turnOffShapeCheck++;
			liquid.allUnlocked++;
			arrayOfSerialized.forEach(function(serialized) {
				trace('unserialize', "unserializeFromUpstream: ", serialized.id);
				// console.log("unserializeFromUpstream: " + serialized.id);
				unserializeUpstreamObject(serialized);
			});
			if (typeof(liquid.instancePage) !== 'undefined') {
				liquid.instancePage.upstreamPulseReceived();
			}
			liquid.allUnlocked--;
			liquid.turnOffShapeCheck--;
		}
		
		return require("./eternity.js")(configuration.eternityConfiguration);
	}

	function sortedKeys(object) {
		let keys = Object.keys(object);
		keys.sort(function(a, b){
			if(a < b) return -1;
			if(a > b) return 1;
			return 0;
		});
		let sortedObject = {};
		keys.forEach(function(key) {
			let value = object[key];
			if (typeof(value) === 'object') value = sortedKeys(value);
			sortedObject[key] = value;
		});
		return sortedObject;
	}

	function getDefaultConfiguration() {
		return {
			eternityConfiguration : {
				causalityConfiguration : {
					
				}
			}
		}
	}
	
	let configurationToSystemMap = {};
	return function(requestedConfiguration) {
		if(typeof(requestedConfiguration) === 'undefined') {
			requestedConfiguration = {};
		}
		
		let defaultConfiguration = getDefaultConfiguration();
		Object.assign(defaultConfiguration, requestedConfiguration);
		let configuration = sortedKeys(defaultConfiguration);
		let signature = JSON.stringify(configuration);
		// log("================= REQUEST: ==========");
		// log(signature);
		
		if (typeof(configurationToSystemMap[signature]) === 'undefined') {
			configurationToSystemMap[signature] = createLiquidInstance(configuration);
		}
		return configurationToSystemMap[signature];
	};	
}));