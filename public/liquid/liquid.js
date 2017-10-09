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
	let done = false;
	function createLiquidInstance(configuration) {
		console.log(">>> CREATE LIQUID INSTANCE " + configuration.name +"<<<");
		if (done) {
			throw new Error("WTF");
		}
		done = true;
		// console.log("createLiquidInstance");
		console.log(configuration);
		pagesMap = {};
		sessionsMap = {};

		// include('./liquid/server/liquidServer.js');

		let liquid;
		if (configuration.usePersistency) {
			liquid = require("./eternity.js")(configuration.eternityConfiguration);
		} else {
			liquid = require("./causality.js")(configuration.causalityConfiguration);
		}
		let create = liquid.create;
		let liquidEntity = require("./liquidEntity.js");
		liquidEntity.injectLiquid(liquid);
		liquid.addClasses(liquidEntity.classes);
		Object.assign(liquid, liquidEntity.classes); // Assign all base classes to liquid as well.... 
		Object.assign(liquid, liquidEntity.functions); // Assign all functions to liquid as well.... 

		
		
		/***************************************************************
		 *
		 *  Security
		 *
		 ***************************************************************/
		
		let restrictAccessToThatOfPage = null;
		
		let readable = {
			"readAndWrite" : true,
			"readOnly" : true,
			"noAccess" : false
		};
		
		let writeable = {
			"readAndWrite" : true,
			"readOnly" : false,
			"noAccess" : false
		}

		liquid.setCustomCanRead(function(object) {
			return readable[getAccessLevel(object)];
		});

		liquid.setCustomCanWrite(function(object) {
			return !isSelecting && writeable[getAccessLevel(object)];
		});
		
		function getAccessLevel(object) {
			if (restrictAccessToThatOfPage !== null) {
				let accessLevel = null;
				if (typeof(object.pageAccessLevel) !== 'undefined') {
					accessLevel = object.pageAccessLevel(restrictAccessToThatOfPage);
				} else if (typeof(object.redirectSecurityTo) !== 'undefined'){
					// TODO: Recusive, do this cached instead to prevent really expensive operations. 
					accessLevel = getAccessLevel(object.redirectSecurityTo);
				}
				return accessLevel;
			}
			return "readAndWrite";
		}
		
		/***************************************************************
		 *
		 *  Server oriented code
		 *
		 ***************************************************************/
		
		// Mock that shit
		let Fiber = function(action) {
			return {
				run : function() {
					action();
				}
			}
		};
		
		if (configuration.usePersistency) {
			// Fiber = require('fibers');   // consider, remove fiber when not using rest api?    // change to httpRequest pulse  ?
				
			let originalPulse = liquid.pulse;
			liquid.pulse = function(action) {
				Fiber(function() {
					originalPulse(action);
				}).run();
			}
		}

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
		liquid.callOnServer = false;
		function makeCallOnServer(pageToken, callInfo) {
			// trace('serialize', "Make call on server");
			// trace('serialize', pageToken);
			// trace('serialize', callInfo);
			liquid.callOnServer = true;
			Fiber(function() {
				// trace('serialize', Object.keys(pagesMap));
				if (typeof(pagesMap[pageToken]) !== 'undefined') {
					var page = pagesMap[pageToken];
					trace('serialize', "Make call on server ", page);

					liquid.pulse(function() {
						var object = page.const._selection[callInfo.objectId];
						var methodName = callInfo.methodName;
						var argumentList = callInfo.argumentList; // TODO: Convert to
						// trace('serialize', "Call: ", methodName);
						// trace('serialize', "Call: ", argumentList);

						// traceTags.event = true;
						if (object.allowCallOnServer(page)) {
							liquid.unlockAll(function() {
								object[methodName].apply(object, argumentList);
							});
						}
						// delete traceTags.event;

						// trace('serialize', "Results after call to server", page.getSession(), page.getSession().getUser());
					});
				}
			}).run();
			liquid.callOnServer = false;
		}
		
		
		function disconnect() {
			Fiber(function() {
				// pageToken
				// var page = pagesMap[pageToken];
				// delete pagesMap[pageToken];
				// page.setSession(null);
				// // TODO: unpersist page
				// trace('serialize', 'Disconnected'); 
				// trace('serialize', pageToken);
			}).run();
		}

		/**--------------------------------------------------------------
		 *              Page and session setup
		 *----------------------------------------------------------------*/
		
		function registerPage(page) {
			page.token = generatePageId();
			pagesMap[page.token] = page;
		}
		
		function generatePageId() {
			return generateUniqueKey(pagesMap);
		}
		
		function generateUniqueKey(keysMap) {
			var newKey = null;
			while(newKey == null) {
				var newKey = Number.MAX_SAFE_INTEGER * Math.random();
				if (typeof(keysMap[newKey]) !== 'undefined') {
					newKey = null;
				}
			}
			return newKey;
		}

		// function createOrGetSessionObject(req) {
			// var hardToGuessSessionId = req.session.id;
		function createOrGetSessionObject(hardToGuessSessionId) {
			log("createOrGetSessionObject");
			log(hardToGuessSessionId);
			if (typeof(sessionsMap[hardToGuessSessionId]) === 'undefined') {
				// TODO: createPersistent instead
				sessionsMap[hardToGuessSessionId] = liquid.create('LiquidSession', {hardToGuessSessionId: hardToGuessSessionId});
			}
			return sessionsMap[hardToGuessSessionId];
		}
		
		function registerPageTokenTurnaround(pageToken) {
			return new Promise((resolve, reject) => {						
				let page = liquid.getPage(pageToken);
				if (typeof(page) !== 'undefined') {
				} else {
				}
				const xhr = new XMLHttpRequest();
				xhr.open("GET", url);
				xhr.onload = () => resolve(xhr.responseText);
				xhr.onerror = () => reject(xhr.statusText);
				xhr.send();
			});
		}
		
		let pushMessageDownstreamCallback = null;
		function setPushMessageDownstreamCallback(callback) {
			pushMessageDownstreamCallback = callback;
		}
		
		/**--------------------------------------------------------------
		 *              Selection
		 *----------------------------------------------------------------*/

		function logSelection(selection) {
			log(Object.keys(selection));
		}
		 
		function addToSelection(selection, object) {
			if (liquid.isObject(object) && typeof(selection[object.const.id]) === 'undefined' && liquid.canRead(object)) {
				// trace('selection', "Added: ", object);
				selection[object.const.id] = object;
				return true;
			} else {
				// trace('selection', "Nothing to add!");
				// console.log("Nothing to add!");
				return false;
			}
		}
		

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
					removed[id] = firstSet[id];
				} else {
					// console.log("static");
					static[id] = firstSet[id];
				}
			} 
			
			for(id in secondSet) {
				if(typeof(firstSet[id]) === 'undefined') {
					// console.log("added");
					added[id] = secondSet[id];
				}
			}

			return {
				added : added,
				removed : removed,
				static : static
			}
		}
		
		let isSelecting;
		let dirtyPageSubscritiptions = {};
		function getSubscriptionUpdate(page) {
			log("getSubscriptionUpdate");
			logGroup();
			// console.group("getSubscriptionUpdate");
			// traceGroup('subscribe', "--- getSubscriptionUpdate ", page, "---");
			var result = {};

			var addedAndRemovedIds;
			if (page.const._dirtySubscriptionSelections) {
				// traceGroup('subscribe', '--- dirty footprint selection --- ');
				// console.log("dirty selection");
				liquid.uponChangeDo(function() {
					var selection = {};// get
					page.service.orderedSubscriptions.forEach(function(subscription) {
						// Perform a selection with dependency recording!
						var subscriptionSelection = {};
						
						// Select as
						restrictAccessToThatOfPage = page; // pageAccessRestriction
						isSelecting = true;
						// Also deactivate repeaters during this... 
						// Better idea: Writeprotect the system here... 

						// TODO: Get without observe... 
						subscription.object['select' + subscription.selector](subscriptionSelection);

						// Reactivate repeaters here... 
						// Remove write protection...
						isSelecting = false;
						restrictAccessToThatOfPage = null;
						
						log("subscriptionSelection");
						log(subscriptionSelection, 3);
						for (id in subscriptionSelection) {
							selection[id] = subscriptionSelection[id];
						}
					});
					// console.log("consolidate");
					// console.log(selection);
					page.const._previousSelection = page.const._selection;
					// console.log(page.const._previousSelection);
					page.const._selection = selection;
					page.const._dirtySubscriptionSelections  = false;
					
					addedAndRemovedIds = getMapDifference(page.const._previousSelection, selection);
				}, function() {
					// trace('serialize', "A subscription selection got dirty: ", page);
					// console.log("A subscription selection got dirty: " + page.const.id);
					// stackDump();
					liquid.dirtyPageSubscritiptions[page.const.id] = page;
					page.const._dirtySubscriptionSelections  = true;
				});
				// traceGroupEnd();
			} else {
				// trace('serialize', "just events");
				addedAndRemovedIds = {
					added : {},
					removed : {},
					static : page.const._selection
				}
			}

			// traceGroup('serialize', "Added and removed:");
			// trace('serialize', "Added:");
			// for (var id in addedAndRemovedIds.added) {
				// trace('serialize', getEntity(id));
			// }
			// trace('serialize', "Removed:");
			// for (var id in addedAndRemovedIds.removed) {
				// trace('serialize', getEntity(id));
			// }
			// trace('serialize', "Static:");
			// for (var id in addedAndRemovedIds.static) {
				// trace('serialize', getEntity(id));
			// }
			// traceGroupEnd();
			// console.log("Added ids:");
			// console.log(addedAndRemovedIds.added);
			// console.log("Removed ids:");
			// console.log(addedAndRemovedIds.added);

			// Add as subscriber
			for (id in addedAndRemovedIds.added) {
				// console.log("Adding page observers");
				var addedObject = addedAndRemovedIds.added[id];
				if (typeof(addedObject.const) === 'undefined') {
					log(addedObject, 3);
				}
				if (typeof(addedObject.const._observingPages) === 'undefined') {
					addedObject.const._observingPages = {};
				}
				addedObject.const._observingPages[page.const.id] = page;
				// console.log(Object.keys(addedObject.const._observingPages));
			}

			// Remove subscriber
			for (id in addedAndRemovedIds.removed) {
				// console.log("Removing page observers");
				var removedObject = addedAndRemovedIds.removed[id];
				delete removedObject.const._observingPages[page.const.id];
				// console.log(Object.keys(addedObject._observingPages));
			}

			// Serialize
			liquid.state.pageSubject = page;
			result.addedSerialized = serializeSelection(addedAndRemovedIds.added);
			liquid.state.pageSubject = null;

			result.unsubscribedUpstreamIds = addedAndRemovedIds.removed;

			// TODO: Consider what to do about this... do we really need a pulse object? 
			// //add event info originating from repeaters.
			// result.events = [];
			// // trace('serialize', "Serialize events");
			// if (liquid.activePulse !== null) {
				// liquid.activePulse.events.forEach(function (event) {
					// // trace('serialize', event.action, event.object);
					// // trace('serialize', event);
					// if (!event.redundant && (liquid.activePulse.originator !== page || event.repeater !== null || liquid.callOnServer)) { // Do not send back events to originator!
						// // console.log("A");
						// if (addedAndRemovedIds.static[event.object.const.id]) {
							// // console.log("B");
							// liquid.state.pageSubject = page;
							// result.events.push(serializeEventForDownstream(event));
							// liquid.state.pageSubject = null;
						// }
					// }
				// });
			// }

			// Add id mapping information
			result.idToUpstreamId = {};
			result.idsOfInstantlyHidden = [];
			if (page.const.idToDownstreamIdMap !== null) {
				for(id in page.const.idToDownstreamIdMap) {
					if (typeof(addedAndRemovedIds.added[id]) !== 'undefined') {
						result.idToUpstreamId[page.const.idToDownstreamIdMap[id]] = id;
					} else {
						result.idsOfInstantlyHidden[page.const.idToDownstreamIdMap[id]]; // These objects were sent to the server, but did not become subscribed,
					}
				}
				page.const.idToDownstreamIdMap = null;
			}

			// console.log(result);
			// trace('serialize', "Subscription update: ", result);
			// console.groupEnd();
			// traceGroupEnd();
			logUngroup();

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
		
		function serializeSelection(selection) {
			var serialized = [];
			for (id in selection) {
				var object = selection[id];
				serialized.push(serializeObject(object, false));
			}
			return serialized;
		};
		
		
		/**
		 * Example output:
		 * 
		 * {
		 * 	 id: 34
		 * 	 className: 'Dog'
		 *	 HumanOwner: 'Human:23'
		 *	 property: "A string"	
		 * }
		 */
		function serializeObject(object, forUpstream = false) {
			function serializeReferences(object) {
				if (liquid.isObject(object)) {
					if (forUpstream) {
						if (object._upstreamId !== null) {
							return object.className() + ":id:" + object._upstreamId;
						} else {
							return object.className() + ":downstreamId:" + object.const.id;
						}
					} else {
						let className = (object instanceof LiquidEntity) ? object.className() : Object.getPrototypeOf(object).constructor.name;
						return className + ":" + object.const.id + ":" + true; //!object.readable(); // TODO: consider this, we really need access rights on this level?
					}
				} else if (typeof(object) === 'object' || typeof(object) === 'function'){
					return null;
				} else {
					return object;
				}
			};
			
			serialized = {};
			serialized._ = object.__();
			serialized.className = object.className;
			if (forUpstream) {
				if (object._upstreamId !== null) {
					serialized.id = object._upstreamId;
				} else {
					serialized.downstreamId = object.const.id;
				}
			} else {
				serialized.id = object.const.id;
			}
			let omittedKeys = {
				isPlaceholderObject : true,
				isLockedObject : true
			}
			Object.keys(object).forEach(function(key) {
				if (!omittedKeys[key]) {
					serialized[key] = serializeReferences(object[key]);					
				} 
			});
			return serialized;
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
			serialized.objectId = event.object.const.id;

			if (event.definition.type === 'relation') {
				serialized.relationName = event.definition.qualifiedName;

				if (typeof(event.relatedObject) !== 'undefined') {
					serialized.relatedObjectId = event.relatedObject.const.id;
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
				if (typeof(page.const._pendingUpdates) === 'undefined') {
					page.const._pendingUpdates = [];
				}
				page.const._pendingUpdates.push(update);

				// TODO: refactor this part to the other layer... 
				while(page.const._pendingUpdates.length > 0) {
					if(pushMessageDownstreamCallback(page, 'pushChangesFromUpstream', page.const._pendingUpdates.shift())) {
						delete liquid.dirtyPageSubscritiptions[id];
					} else {
						// An update occured before the page has gotten to register its socket id.
						// trace('serialize', 'An update occured before the page has gotten to register its socket id: ', page);
					}
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

		function unserializeDownstreamPulse(page, pulseData) {
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
					return ensureObjectUnserialized(page, null, id);
				} else {
					return page.const._selection[id];
				}
			}
			
			function ensureRelatedObjectsUnserialized(page, event) {
				var relatedObjectId = typeof(event.relatedObjectId) !== 'undefined' ? event.relatedObjectId : null;
				var relatedObjectDownstreamId = typeof(event.relatedObjectDownstreamId) !== 'undefined' ? event.relatedObjectDownstreamId : null;
				return ensureObjectUnserialized(page, relatedObjectId, relatedObjectDownstreamId);
			}

			function ensureObjectUnserialized(page, id, downstreamId) {
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
					// throw new Error("TODO: Think this throug... looks wierd... ");
					return page.const._selection[id];//liquid.getEntity(id);
				}
			}
			
			function unserializeDownstreamObjectRecursivley(serializedObject) {
				var newObject = create(serializedObject.className);
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
			
						var object = typeof(event.objectId) !== 'undefined' ?  page.const._selection[event.objectId] : downstreamIdToObjectMap[event.downstreamObjectId];
						// console.log()
						if (event.action === 'settingRelation' ||
							event.action === 'addingRelation' ||
							event.action === 'deletingRelation') {
			
							// This removes and replaces downstream id:s in the event!
			
							var relatedObject = ensureRelatedObjectsUnserialized(page, event); //TODO: maps????, downstreamIdToSerializedObjectMap, downstreamIdToObjectMap
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
						idToDownstreamIdMap[downstreamIdToObjectMap[downstreamId].const.id] = downstreamId;
					}
					liquid.activePulse.originator.const.idToDownstreamIdMap = idToDownstreamIdMap;
				});
			});
		}

		
		/**--------------------------------------------------------------
		 *              Receive changes from upstream
		 *----------------------------------------------------------------*/
		
		function receiveChangesFromUpstream(changes) {
			liquid.pulse(function() {
				// Consolidate ids:
				for (id in changes.idToUpstreamId) {
					throw new Error("Not done yet!");
					// TODO: Needs to keep a local map for all server synched objects...  
					// liquid.getEntity(id)._upstreamId = changes.idToUpstreamId[id];
				}
				console.log(changes);
				//result
				unserializeFromUpstream(changes.addedSerialized);

				liquid.blockUponChangeActions(function() {
					liquid.allUnlocked++;
					changes.events.forEach(function(event) {
						if (event.action === 'addingRelation') {
							var object = getUpstreamEntity(event.objectId);
							var relatedObject = getUpstreamEntity(event.relatedObjectId);
							var relation = object._relationDefinitions[event.relationName];
							if (relation.isSet) {
								object[relation.adderName](relatedObject);
							} else {
								object[relation.setterName](relatedObject);
							}
						} else if (event.action === 'deletingRelation') {
							liquid.activeSaver = null;
							var object = getUpstreamEntity(event.objectId);
							var relatedObject = getUpstreamEntity(event.relatedObjectId);
							var relation = object._relationDefinitions[event.relationName];
							if (relation.isSet) {
								object[relation.removerName](relatedObject);
							} else {
								object[relation.setterName](null);
							}
							liquid.activeSaver = liquid.defaultSaver;
						} else if (event.action === 'settingProperty') {
							liquid.activeSaver = null;
							var object = getUpstreamEntity(event.objectId);
							var setterName = object._propertyDefinitions[event.propertyName].setterName;
							object[setterName](event.newValue);
							liquid.activeSaver = liquid.defaultSaver;
						}
					});

					// and create an "originators copy" of the data for safekeeping. 
					for (upstreamId in changes.unsubscribedUpstreamIds) {
						var object = getUpstreamEntity(upstreamId);
						object.setIsLockedObject(true);
					}
					liquid.allUnlocked--;
				});
			});			
		}
			
 		
		function getPage(pageToken) {
				// trace('serialize', "Register page connection:" + pageToken);
				// trace('serialize', pageToken);
				if (typeof(pageToken) !== 'undefined' && pageToken !== null && typeof(pagesMap[pageToken]) !== 'undefined') {
					return pagesMap[pageToken];
				}
		}


		
		let pushingDownstreamData = false;
		function pushDownstreamPulse(pageToken, pulseData) {
			new Promise((resolve, reject) => {
				let page = liquid.getPage(pageToken);
				if (typeof(page) !== 'undefined') {
					pushingDownstreamData = true; // What happens on asynchronous wait?? 
					Fiber(function() {
						liquid.pulse(function() {
							liquid.unserializeDownstreamPulse(page, pulseData);
						});
					}).run();
					pushingDownstreamData = false;
					resolve();
				} else {
					reject();
				}
			});
		}


		/***************************************************************
		 *
		 *  Client oriented code
		 *  
		 *
		 ***************************************************************/

		function receiveInitialDataFromUpstream(serializedData) {
			console.log("receiveInitialDataFromUpstream");
			console.log(serializedData);
			liquid.unserializeObjectsFromUpstream(serializedData.subscriptionInfo.addedSerialized)
			liquid.instancePage = getUpstreamEntity(serializedData.pageUpstreamId);	
			console.log(liquid);
		}

	

		function unserializeObjectsFromUpstream(serializedObjects) {
			liquid.pulse(function() {
				unserializeFromUpstream(serializedObjects);
			});			
		}
		

		
		
		// This was done on client... wierd... I think that active subscriptions should be updated by server and pushed in same pulse as newly loaded... 
		// liquid.instancePage.setReceivedSubscriptions(liquid.instancePage.getPageService().getOrderedSubscriptions());
		// liquid.instancePage.getReceivedSubscriptions().forEach(function(subscription) {
			// trace('setup', "Received Subscription ", subscription, " : ", subscription.getTargetObject(), ".", subscription.getSelector(), "()");
		// });
		// // Setup user
		// // window.displayedUser = liquid.findLocalEntity({className: 'User'})


	
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
		
		function addCallOnServer(object) {
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
					// traceGroup('serialize', "=== Call on server ===");
					// trace('serialize', callData.callId, callData.objectId, callData.methodName);
					// trace('serialize', callData.argumentList);
					// traceGroupEnd();
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
				serialized.objectDownstreamId = event.object.const.id;
			}
		
			if (event.definition.type === 'relation') {
				serialized.relationQualifiedName = event.definition.qualifiedName;
		
				if (typeof(event.relatedObject) !== 'undefined') {
					if (event.relatedObject._upstreamId !== null) {
						serialized.relatedObjectId = event.relatedObject._upstreamId;
					} else {
						serialized.relatedObjectDownstreamId = event.relatedObject.const.id;
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
		function pushDataUpstream() {
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
		
				// TODO: What to do with this?... get events as argument?... 
				// liquid.activePulse.events.forEach(function(event) {
					// var eventIsFromUpstream = liquid.activePulse.originator === 'upstream' && event.isDirectEvent;
					// if (!eventIsFromUpstream) {
						// // trace('serialize', "processing event required objects");
						// if (event.object._upstreamId !== null && event.action == 'addingRelation' && event.relatedObject._upstreamId === null) {
							// addRequiredCascade(event.relatedObject, requiredObjects);
						// }
					// }
				// });
		
				var serializedObjects = [];
				for(id in requiredObjects) {
					var serializedObject = liquid.serializeObject(requiredObjects[id], true);
					serializedObjects.push(serializedObject);
				}
		
				var serializedEvents = [];
				// TODO: get events from argument
				// liquid.activePulse.events.forEach(function(event) {
					// // console.log(event);
					// var eventIsFromUpstream = liquid.activePulse.originator === 'upstream' && event.isDirectEvent;
					// if (!event.redundant && !eventIsFromUpstream) {
						// // trace('serialize', "not from upstream");
						// if (event.object._upstreamId !== null && typeof(event.definition) !== 'undefined' && !event.definition.clientOnly) {
							// serializedEvents.push(serializeEventForUpstream(event));
						// } else if (typeof(requiredObjects[event.object.const.id]) !== 'undefined') {
							// serializedEvents.push(serializeEventForUpstream(event));
						// }
					// }
				// });
		
				var serializedPulse = {
					serializedEvents : serializedEvents,
					serializedObjects : serializedObjects
				};
		
				if (serializedPulse.serializedEvents.length > 0 || serializedPulse.serializedObjects.length > 0) {
					// trace('serialize', "Push upstream:", serializedPulse);
					// console.log(serializedPulse);
					tryPushSerializedPulseUpstream(serializedPulse);
				}
		
				// console.groupEnd();
			}
		};
		
		
		
		/**--------------------------------------------------------------
		 *            Unserialization from upstream
		 *----------------------------------------------------------------*/
		
		upstreamIdObjectMap = {};
		
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
		
		// Note: this function can only be used when we know that there is at least a placeholder. 
		function getUpstreamEntity(upstreamId) {
			if (typeof(upstreamIdObjectMap[upstreamId]) === 'undefined') {
				throw new Error("Tried to get an upstream entity that is unknown... ");
			}
			return upstreamIdObjectMap[upstreamId];
		}
		
		function ensureEmptyObjectExists(upstreamId, className, isLocked) {
			if (typeof(upstreamIdObjectMap[upstreamId]) === 'undefined') {
				var newObject = create(className);
				newObject._upstreamId = upstreamId;
				upstreamIdObjectMap[upstreamId] = newObject;
				newObject._ = newObject.__();
				newObject.setIsPlaceholderObject(true);
				newObject.setIsLockedObject(isLocked);
				// newObject._noDataLoaded = true;
			}
			return upstreamIdObjectMap[upstreamId];
		}
		
		function unserializeUpstreamObject(serializedObject) {
			// console.log("unserializeObject: " + serializedObject.className);
			// console.log(serializedObject);
			var upstreamId = serializedObject.id;
			if (typeof(upstreamIdObjectMap[upstreamId]) === 'undefined') {
				ensureEmptyObjectExists(upstreamId, serializedObject.className, false);
			}
			var targetObject = upstreamIdObjectMap[upstreamId];
			// console.log(targetObject);
			if (targetObject.getIsPlaceholderObject()) {
				targetObject.forAllOutgoingRelations(function(definition, instance) {
					// console.log("processingRelation: " + definition.name);
					// trace('unserialize', definition.name, "~~>", targetObject);
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
					// trace('unserialize', definition.name, "~~>", targetObject);
					if (typeof(serializedObject[definition.name]) !== 'undefined') {
						var data = serializedObject[definition.name];
						targetObject[definition.setterName](data);
					}
				}
				targetObject.setIsPlaceholderObject(false);
				targetObject._ = targetObject.__();
			} else {
				// trace('unserialize', "Loaded data that was already loaded!!!");
				// console.log("Loaded data that was already loaded!!!");
			}
		}
		
		
		function unserializeFromUpstream(arrayOfSerialized) { // If optionalSaver is undefined it will be used to set saver for all unserialized objects.
			liquid.turnOffShapeCheck++;
			liquid.allUnlocked++;
			arrayOfSerialized.forEach(function(serialized) {
				// trace('unserialize', "unserializeFromUpstream: ", serialized.id);
				// console.log("unserializeFromUpstream: " + serialized.id);
				unserializeUpstreamObject(serialized);
			});
			if (typeof(liquid.instancePage) !== 'undefined') {
				liquid.instancePage.upstreamPulseReceived();
			}
			liquid.allUnlocked--;
			liquid.turnOffShapeCheck--;
		}
		

		/**--------------------------------------------------------------
		 * 
		 *            Timeing 
		 *
		 *----------------------------------------------------------------*/
		
		let notifyUICallbacks = []; 
		function addNotifyUICallback(callback) {
			notifyUICallbacks.push(callback);
		}
		
		function streamInRelevantDirections() { // Stream in your general direction.
			// Notify UI
			notifyUICallbacks.forEach(function(callback) {
				callback();
			});
				
			// Push data downstream
			pushDataDownstream();
			
			// Push data upstream
			pushDataUpstream();
			
			// Store to database, do nothing, leave to eternity, see calling function
		}
		
		if (configuration.usePersistency) {
			liquid.setPostPulseActionBeforeStorage(streamInRelevantDirections);			
		} else {
			liquid.addPostPulseAction(streamInRelevantDirections);		
		}
		
		/**--------------------------------------------------------------
		 *            Publish functions 
		 *----------------------------------------------------------------*/
		 
		function setAsDefaultConfiguration() {
			userDefaultConfiguration = configuration;
		}
		
		// Publish some functions 
		Object.assign(liquid, {
			receiveInitialDataFromUpstream : receiveInitialDataFromUpstream,
			createOrGetSessionObject: createOrGetSessionObject,
			setPushMessageDownstreamCallback : setPushMessageDownstreamCallback,
			setPushMessageUpstreamCallback : setPushMessageUpstreamCallback, 
			getSubscriptionUpdate : getSubscriptionUpdate, 
			unserializeObjectsFromUpstream : unserializeObjectsFromUpstream,
			registerPage : registerPage,
			addNotifyUICallback : addNotifyUICallback,
			setAsDefaultConfiguration : setAsDefaultConfiguration,
			addToSelection : addToSelection
		}); 

		
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

	// Default configuration of liquid
	function getDefaultConfiguration() {
		return {
			eternityConfiguration : {
				causalityConfiguration : {
					
				}
			}
		}
	}
	
	// User defined default configuration 
	let userDefaultConfiguration = null;
	
	let configurationToSystemMap = {};
	return function(requestedConfiguration) {
		console.log("requesting....");
		console.log(userDefaultConfiguration);
		console.log(requestedConfiguration);
		if(typeof(requestedConfiguration) === 'undefined') {
			
			if (userDefaultConfiguration) {
				console.log("use it!");
				requestedConfiguration = userDefaultConfiguration;
			} else {
				console.log("dont use it!");
				requestedConfiguration = {};
			}		
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
		if (Object.keys(configurationToSystemMap) > 1) {
			throw new Error("Should not happen!");
		}
		return configurationToSystemMap[signature];
	};	
}));