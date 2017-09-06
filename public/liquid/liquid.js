// Using UMD pattern: https://github.com/umdjs/umd
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory); // Support AMD
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory(); // Support NodeJS
    } else {
        root.liquid = factory(); // Support browser global
    }
}(this, function () {
	//...
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

		// include('./liquid/server/liquidServer.js');

		let liquid;
		if (configuration.usePersistency) {
			liquid = require("./eternity.js")(configuration.eternityConfiguration);
		} else {
			liquid = require("./causality.js")(configuration.causalityConfiguration);
		}
		
		let entity = require("./entity.js");
		entity.injectLiquid(liquid);
		

		/***************************************************************
		 *
		 *  Server oriented code
		 *
		 ***************************************************************/
			

		// /**--------------------------------------------------------------
		// *                 Sessions
		// *----------------------------------------------------------------*/

		// liquid.clearPagesAndSessions = function() {
			// neo4j.query("MATCH (n {className:'LiquidSession'}) DETACH DELETE n");
			// neo4j.query("MATCH (n {className:'LiquidPage'}) DETACH DELETE n");
		// };

		// liquid.sessions = {};

		// liquid.createSession = function(connection) {
			// liquid.sessions[connection] = {};
			// return liquid.sessions[connection];
		// }


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
		

		/**----------------------------------------------------------------
		 *                       Push data downstream
		 *-----------------------------------------------------------------*/

		function getMapDifference(firstSet, secondSet) {
			// console.log("getmapdifference");
			// console.log(firstSet);
			// console.log(secondSet);
			var added = {};
			var removed = {};
			var static = {};
			for(id in firstSet) {
				if(typeof(secondSet[id]) === 'undefined') {
					// console.log("removed");
					removed[id] = true;
				} else {
					// console.log("static");
					static[id] = true;
				}
			} 
			
			for(id in secondSet) {
				if(typeof(firstSet[id]) === 'undefined') {
					// console.log("added");
					added[id] = true;
				}
			}

			return {
				added : added,
				removed : removed,
				static : static
			}
		}


		let dirtyPageSubscritiptions = {};
		function getSubscriptionUpdate(page) {
			// console.group("getSubscriptionUpdate");
			traceGroup('subscribe', "--- getSubscriptionUpdate ", page, "---");
			var result = {};

			var addedAndRemovedIds;
			if (page._dirtySubscriptionSelections) {
				traceGroup('subscribe', '--- dirty footprint selection --- ');
				// console.log("dirty selection");
				liquid.uponChangeDo(function() {
					var selection = {};
					page.getPageService().getOrderedSubscriptions().forEach(function(subscription) {
						var object = subscription._relationInstances['Subscription_TargetObject'].data; // silent get
						var selectorSuffix = capitaliseFirstLetter(subscription._propertyInstances['selector'].data); // Silent get
						// console.log("--- Considering subscription: " + object._ + ".select" + selectorSuffix + "() ---");
						traceGroup('subscribe', "--- Considering subscription: ", object, ".select" + selectorSuffix + "() ---");
						var selectorFunctionName = 'select' + selectorSuffix;

						// Perform a selection with dependency recording!
						var subscriptionSelection = {};
						
						// Select as
						liquid.pageSubject = page;
						object[selectorFunctionName](subscriptionSelection);
						liquid.pageSubject = null;
						
						// console.log(subscriptionSelection);
						// console.log(subscriptionSelection);
						for (id in subscriptionSelection) {
							selection[id] = true;
						}
						traceGroupEnd();
						// console.log("--- Finish considering subscription: " + object._ + ".select" + selectorSuffix + "() ---");
						// console.groupEnd();
					});
					// console.log("consolidate");
					// console.log(selection);
					page._previousSelection = page._selection;
					// console.log(page._previousSelection);
					page._selection = selection;
					page._addedAndRemovedIds = getMapDifference(page._previousSelection, selection);
					page._dirtySubscriptionSelections  = false;
				}, function() {
					trace('serialize', "A subscription selection got dirty: ", page);
					// console.log("A subscription selection got dirty: " + page._id);
					// stackDump();
					liquid.dirtyPageSubscritiptions[page._id] = page;
					page._dirtySubscriptionSelections  = true;
				});
				addedAndRemovedIds = page._addedAndRemovedIds;
				traceGroupEnd();
			} else {
				trace('serialize', "just events");
				addedAndRemovedIds = {
					added : {},
					removed : {},
					static : page._selection
				}
			}

			traceGroup('serialize', "Added and removed:");
			trace('serialize', "Added:");
			for (var id in addedAndRemovedIds.added) {
				trace('serialize', getEntity(id));
			}
			trace('serialize', "Removed:");
			for (var id in addedAndRemovedIds.removed) {
				trace('serialize', getEntity(id));
			}
			trace('serialize', "Static:");
			for (var id in addedAndRemovedIds.static) {
				trace('serialize', getEntity(id));
			}
			traceGroupEnd();
			// console.log("Added ids:");
			// console.log(addedAndRemovedIds.added);
			// console.log("Removed ids:");
			// console.log(addedAndRemovedIds.added);

			// Add as subscriber
			for (id in addedAndRemovedIds.added) {
				// console.log("Adding page observers");
				var addedObject = liquid.getEntity(id);
				addedObject._observingPages[page._id] = page;
				// console.log(Object.keys(addedObject._observingPages));
			}

			// Remove subscriber
			for (id in addedAndRemovedIds.removed) {
				// console.log("Removing page observers");
				var removedObject = liquid.getEntity(id);
				delete removedObject._observingPages[page._id];
				// console.log(Object.keys(addedObject._observingPages));
			}

			// Serialize
			liquid.pageSubject = page;
			result.addedSerialized = liquid.serializeSelection(addedAndRemovedIds.added);
			liquid.pageSubject = null;

			result.unsubscribedUpstreamIds = addedAndRemovedIds.removed;

			//add event info originating from repeaters.
			result.events = [];
			trace('serialize', "Serialize events");
			if (liquid.activePulse !== null) {
				liquid.activePulse.events.forEach(function (event) {
					trace('serialize', event.action, event.object);
					// trace('serialize', event);
					if (!event.redundant && (liquid.activePulse.originator !== page || event.repeater !== null || liquid.callOnServer)) { // Do not send back events to originator!
						// console.log("A");
						if (addedAndRemovedIds.static[event.object._id]) {
							// console.log("B");
							liquid.pageSubject = page;
							result.events.push(serializeEventForDownstream(event));
							liquid.pageSubject = null;
						}
					}
				});
			}

			// Add id mapping information
			result.idToUpstreamId = {};
			result.idsOfInstantlyHidden = [];
			if (page._idToDownstreamIdMap !== null) {
				for(id in page._idToDownstreamIdMap) {
					if (typeof(addedAndRemovedIds.added[id]) !== 'undefined') {
						result.idToUpstreamId[page._idToDownstreamIdMap[id]] = id;
					} else {
						result.idsOfInstantlyHidden[page._idToDownstreamIdMap[id]]; // These objects were sent to the server, but did not become subscribed,
					}
				}
				page._idToDownstreamIdMap = null;
			}

			// console.log(result);
			trace('serialize', "Subscription update: ", result);
			// console.groupEnd();
			traceGroupEnd();
			return result;

			/**
			 * result.serializedObjects
			 * [{
			 * 	 id: 34
			 * 	 className: 'Dog'
			 *	 HumanOwner: 'Human:23'
			 *	 property: "A string"
			 * }]
			 * result.unsubscribedUpstreamIds
			 * result.idToUpstreamId
			 * result.events  [{action: addingRelation, objectId:45, relationName: 'Foobar', relatedObjectId:45 }]
			 */
		};

		// Form for events:
		//  {action: addingRelation, objectId:45, relationName: 'Foobar', relatedObjectId:45 }
		//  {action: deletingRelation, objectId:45, relationName: 'Foobar', relatedObjectId:45 }
		function serializeEventForDownstream(event) {
			// console.log("Serialize event");
			// console.log(event);
			var serialized  = {
				action: event.action
			};
			serialized.objectId = event.object._id;

			if (event.definition.type === 'relation') {
				serialized.relationName = event.definition.qualifiedName;

				if (typeof(event.relatedObject) !== 'undefined') {
					serialized.relatedObjectId = event.relatedObject._id;
				}
			} else {
				serialized.propertyName = event.definition.name;
				serialized.newValue = event.newValue;
			}

			return serialized;
		}


		function pushDataDownstream() {
			// console.log("x");
			// console.log(liquid.dirtyPageSubscritiptions);
			// console.log("y");
			for (id in liquid.dirtyPageSubscritiptions) {
				// console.log("Push update to page: " + id);
				var page = liquid.dirtyPageSubscritiptions[id];
				var update = liquid.getSubscriptionUpdate(page);
				// console.log(update);
				if (typeof(page._pendingUpdates) === 'undefined') {
					page._pendingUpdates = [];
				}
				page._pendingUpdates.push(update);

				if (typeof(page._socket) !== 'undefined' && page._socket !== null) {
					while(page._pendingUpdates.length > 0) {
						page._socket.emit('pushChangesFromUpstream', page._pendingUpdates.shift());
					}
					delete liquid.dirtyPageSubscritiptions[id];
				} else {
					trace('serialize', 'An update occured before the page has gotten to register its socket id: ', page);
					// An update occured before the page has gotten to register its socket id.
				}
			}
		};

		// if (liquid.activePulse.originator === liquid.clientPage) {


		/**-------------------------------------------------------------
		 *                 Receive from downstream
		 ---------------------------------------------------------------*/



		// Form for events:
		//  {action: addingRelation, objectId:45, relationName: 'Foobar', relatedObjectId:45 }
		//  {action: deletingRelation, objectId:45, relationName: 'Foobar', relatedObjectId:45 }
		//  {action: addingRelation, objectDownstreamId:45, relationName: 'Foobar', relatedObjectDownstreamId:45 }
		//  {action: settingProperty, objectDownstreamId:45, propertyName: 'Foobar', propertyValue: 'Some string perhaps'}

		function unserializeDownstreamPulse(pulseData) {
			// console.log(pulseData);

			var downstreamIdToSerializedObjectMap = {};
			pulseData.serializedObjects.forEach(function(serializedObject) {
				downstreamIdToSerializedObjectMap[serializedObject.downstreamId] = serializedObject;
			});
			var downstreamIdToObjectMap = {};
			
			function unserializeDownstreamReference(reference) {
				if (reference === null) {
					return null;
				}
				var fragments = reference.split(":");
				var className = fragments[0];
				var type = fragments[1];
				var id = parseInt(fragments[2]);
				if (type === 'downstreamId') {
					return ensureObjectUnserialized(null, id);
				} else {
					return liquid.getEntity(id);
				}
			}
			
			function ensureRelatedObjectsUnserialized(event) {
				var relatedObjectId = typeof(event.relatedObjectId) !== 'undefined' ? event.relatedObjectId : null;
				var relatedObjectDownstreamId = typeof(event.relatedObjectDownstreamId) !== 'undefined' ? event.relatedObjectDownstreamId : null;
				return ensureObjectUnserialized(relatedObjectId, relatedObjectDownstreamId);
			}

			function ensureObjectUnserialized(id, downstreamId) {
				console.log("ensureObjectUnserialized");
				console.log(id);
				console.log(downstreamId);
				console.log(downstreamIdToSerializedObjectMap);
				if(id == null) {
					if (typeof(downstreamIdToObjectMap[downstreamId]) === 'undefined') {
						var serializedObject = downstreamIdToSerializedObjectMap[downstreamId];
						// console.log("here");
						// console.log(num.toString(downstreamId));
						// console.log(downstreamId);
						// console.log(serializedObject);
						return unserializeDownstreamObjectRecursivley(serializedObject);
					} else {
						return downstreamIdToObjectMap[downstreamId];
					}
				} else {
					return liquid.getEntity(id);
				}
			}
			
			function unserializeDownstreamObjectRecursivley(serializedObject) {
				var newObject = liquid.createClassInstance(serializedObject.className);
				downstreamIdToObjectMap[serializedObject.downstreamId] = newObject; // Set this early, so recursive unserializes can point to this object, avoiding infinite loop.

				newObject.forAllOutgoingRelations(function(definition, instance) {
					var data = serializedObject[definition.qualifiedName];
					if (definition.isSet) {
						data = data.map(unserializeDownstreamReference);
					} else {
						data = unserializeDownstreamReference(data);
					}
					newObject[definition.setterName](data);
				});

				for (propertyName in newObject._propertyDefinitions) {
					definition = newObject._propertyDefinitions[propertyName];
					var data = serializedObject[definition.name];
					newObject[definition.setterName](data);
				}
				newObject._ = newObject.__();

				return newObject;
			}
			
			liquid.blockUponChangeActions(function() {
				pulseData.serializedEvents.forEach(function(event) {
					if (typeof(event.objectId) !== 'undefined' || typeof(downstreamIdToObjectMap[event.downstreamObjectId])) { // Filter out events that should not be visible to server TODO: Make client not send them?
			
						var object = typeof(event.objectId) !== 'undefined' ?  liquid.getEntity(event.objectId) : downstreamIdToObjectMap[event.downstreamObjectId];
						// console.log()
						if (event.action === 'settingRelation' ||
							event.action === 'addingRelation' ||
							event.action === 'deletingRelation') {
			
							// This removes and replaces downstream id:s in the event!
			
							var relatedObject = ensureRelatedObjectsUnserialized(event, downstreamIdToSerializedObjectMap, downstreamIdToObjectMap);
							// console.log(relatedObject);
							if (event.action === 'addingRelation') {
								// console.log(object._);
								// console.log(event);
								// console.log(object._relationDefinitions);
								var adderName = object._relationDefinitions[event.relationQualifiedName].adderName;
								object[adderName](relatedObject);
							} else if (event.action === 'deletingRelation'){
								var removerName = object._relationDefinitions[event.relationQualifiedName].removerName;
								object[removerName](relatedObject);
							}
						} else if (event.action === "settingProperty") {
							var setterName = object._propertyDefinitions[event.propertyName].setterName;
							object[setterName](event.newValue);
						}
					}
			
					var idToDownstreamIdMap = {};
					for (downstreamId in downstreamIdToObjectMap) {
						idToDownstreamIdMap[downstreamIdToObjectMap[downstreamId]._id] = downstreamId;
					}
					liquid.activePulse.originator._idToDownstreamIdMap = idToDownstreamIdMap;
				});
			});
		}

		
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
			
			

		/***************************************************************
		 *
		 *  Client oriented code
		 *  
		 *
		 ***************************************************************/

			// consolidateIds : function(temporaryEntityIdToEntityIdMap) {
    // 	// console.groupCollapsed("Consolidating ids");
    // 	if (!isArray(temporaryEntityIdToEntityIdMap)) {
    // 		for(var tempId in temporaryEntityIdToEntityIdMap) {
    // 			// console.log("Found id to consolidate");
    // 			// console.log(tempId);
    //
    // 			var entityId = temporaryEntityIdToEntityIdMap[tempId];
    // 			// console.log(entityId);
    //
    // 			// Replace in object self
    // 			var entity = getEntity(tempId);
    // 			entity.entityId = entityId;
    // 			// console.log(entity);
    //
    // 			// Replace in idObjectMap
    // 			liquid.idObjectMap[entityId] = entity;
    // 			delete liquid.idObjectMap.tempId;
    // 		}
    // 	} else {
    // 		// console.log("Nothing to consolidate");
    // 	}
    // 	// console.groupEnd();
    // },
    
    
    // function removeRedundantSessionChanges(changeList, event) {
    // 	var newList = [];
    // 	changeList.forEach(function(loggedEvent) {
    // 		if (loggedEvent.entity == event.entity && loggedEvent.relationOrProperty == event.relationOrProperty) {
    // 			// Skip this event
    // 		} else {
    // 			newList.push(loggedEvent);
    // 		}
    // 	});
    // 	return newList;
    // }
    
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
		
		liquid.addModels(models) {
			models.injectLiquid(liquid);
			liquid.addClasses(models);
		}
		
		liquid.addClasses(classes) {
			Object.assign(liquid.classRegistry, classes); 
		};
		
		liquid.setClassNamesTo(object) {
			Object.assign(object, liquid.classRegistry);
		}
		
		return liquid;
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