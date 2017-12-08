
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
	
	function createLiquidInstance(configuration) {// Debugging
		//Debugging 
		let objectlog = require('./objectlog.js');
		if (configuration.isClient) objectlog.useConsoleDefault = true;
		// let log = objectlog.log;
		// let logGroup = objectlog.enter;
		// let logUngroup = objectlog.exit;
		// let logToString = objectlog.toString;

		// Pages and sessions (for server)
		pagesMap = {};
		sessionsMap = {};

		// Choose causality or eternity.
		let liquid;
		if (configuration.usePersistency) {
			liquid = require("./eternity.js")(configuration.eternityConfiguration);
		} else {
			liquid = require("./causality.js")(configuration.causalityConfiguration);				
		}
		let log = liquid.log;
		let logGroup = liquid.logGroup;
		let logUngroup = liquid.logUngroup;
		let logToString = liquid.logToString;
		let create = liquid.create;
		let trace = liquid.trace;
		trace.serialize = 0;
		
		// Liquid entity... 
		let liquidEntity = require("./liquidEntity.js");
		liquidEntity.injectLiquid(liquid);
		liquid.addClasses(liquidEntity.classes);
		Object.assign(liquid, liquidEntity.classes); // Assign all base classes to liquid as well.... 
		Object.assign(liquid, liquidEntity.functions); // Assign all functions to liquid as well.... 

		/***************************************************************
		 *
		 *  State
		 *
		 ***************************************************************/
		
		// State 
		let state = {
			pushingDataFromDownstream : false,
			pushingDataFromPage : null,
			pushingPulseFromUpstream : false, // Too simple, do we need to keep track of individual events? What aboutr if upstream pulse triggers repeaters on client?. we get a mixed pulse.... 
			isSelecting : false,
			dirtyPageSubscritiptions : {},
			restrictAccessToThatOfPage : null,
			callOnServer : false
		}
		
		/***************************************************************
		 *
		 *  Security
		 *
		 ***************************************************************/
		

		let  = null;
		
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
		
		function restrictAccess(page, action) {
			state.restrictAccessToThatOfPage = page;
			action();
			state.restrictAccessToThatOfPage = null;
		}
		
		liquid.setCustomCanRead(function(object) {
			return readable[getAccessLevel(object)];
		});

		liquid.setCustomCanWrite(function(object) {
			return !state.isSelecting && writeable[getAccessLevel(object)];
		});
		
		function getAccessLevel(object) {
			if (state.restrictAccessToThatOfPage !== null) {
				let accessLevel = "readAndWrite";
				if (typeof(object.pageAccessLevel) !== 'undefined') {
					accessLevel = object.pageAccessLevel(state.restrictAccessToThatOfPage);
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
		 *  General Serialize
		 *
		 ***************************************************************/
	
	
		function serializeSelection(selection, forUpstream) {
			var serialized = {};
			for (id in selection) {
				var object = selection[id];
				serialized[object.const.id] = serializeObject(object, forUpstream);
			}
			return serialized;
		};
		
		/**
		 * Example output:
		 * 
		 * {
		 * 	 id: 34
		 * 	 className: 'Dog'
		 *	 values: { owner : "object:Human:23", name : "string:A string" }
		 * }
		 */
		function serializeObject(object, forUpstream = false) {
			serialized = {
				_ : logToString(liquid.objectDigest(object)),
				className : getClassName(object),
				values : {}
			};
			if (forUpstream) {
				if (object.const._upstreamId !== null) {
					serialized.id = object.const._upstreamId;
				} else {
					serialized.downstreamId = object.const.id;
				}
			} else {
				serialized.id = object.const.id;
			}
			let omittedKeys = {
				isPlaceholder : true,
				isLockedObject : true,
				indexParent : true, 
				indexParentRelation : true
			}
			if (typeof(object.indexParent) !== 'undefined') {
				// Add these first in references object. 
				serialized.indexParent = serializeValue(object.indexParent, forUpstream);
				serialized.indexParentRelation = object.indexParentRelation;
			}
			Object.keys(object).forEach(function(key) {
				if (!omittedKeys[key]) {
					let value = object[key];
					if (typeof(value) === 'undefined') {
						log(key);
						log(object, 2);
						throw new Error("WTF");
					}
					serialized.values[key] = serializeValue(value, forUpstream); 											
				} 
			});
			return serialized;
		};
		
		// Form for events:
		//  {action: addingRelation, objectId:45, relationName: 'Foobar', relatedObjectId:45 }
		//  {action: deletingRelation, objectId:45, relationName: 'Foobar', relatedObjectId:45 }
		//  {action: addingRelation, objectDownstreamId:45, relationName: 'Foobar', relatedObjectDownstreamId:45 }
		//  {action: settingProperty, objectDownstreamId:45, propertyName: 'Foobar', propertyValue: 'Some string perhaps'}
		function serializeEvent(event, forUpstream) {
			trace.serialize && logGroup("serializeEvent");
			var serialized  = {};
			if (forUpstream) {
				if (event.object.const._upstreamId !== null) {
					serialized.objectId = event.object.const._upstreamId;
				} else {
					serialized.objectDownstreamId = event.object.const.id;
				}				
			} else {
				serialized.objectId = event.object.const.id;
			}

			serialized.type = event.type;
			if (typeof(event.property) !== 'undefined') {				
				serialized.property = event.property;
			}
			if (typeof(event.value) !== 'undefined') {
				serialized.value = serializeValue(event.value, forUpstream);
			}
			if (typeof(event.previousValue) !== 'undefined') {
				serialized.previousValue = serializeValue(event.previousValue, forUpstream);
			}
			if (typeof(event.added) !== 'undefined') {
				let serializedAdded = [];
				event.added.forEach(function(added) {
					serializedAdded.push(serializeValue(added, forUpstream));					
				});
				serialized.added = serializedAdded;
			}
			if (typeof(event.removed) !== 'undefined') {
				let serializedRemoved = [];
				event.removed.forEach(function(removed) {
					serializedRemoved.push(serializeValue(removed, forUpstream));					
				});
				serialized.removed = serializedRemoved;
			}
			trace.serialize && log(serialized, 3);
			trace.serialize && logUngroup();
			return serialized;
		}
		
		
		function serializeValue(value, forUpstream) {
			let type = typeof(value);
			if (type === 'object') {
				if (liquid.isObject(value)) {
					let object = value;
					let className = getClassName(value);
					if (forUpstream) {
						if (object.const._upstreamId !== null) {
							return type + ":" + className + ":id:" + object.const._upstreamId;
						} else {
							return type + ":" + className + ":downstreamId:" + object.const.id;
						}
					} else {
						return type + ":" + className + ":" + object.const.id + ":" + true; //!object.readable(); // TODO: consider this, we really need access rights on this level?
					}									
				} else if (value === null) {
					return type + ":null";
				} else {
					log(value, 2);
					throw new Error("No support for streaming non-liquid objects.");
				}
			} else if (type === 'number' || type === 'string') {
				return type + ":" + value;
			} else {
				throw new Error("Unsupported type for serialization: " + type);
			}
		}
	
		function getClassName(object) {
			return (object instanceof liquid.classRegistry["LiquidEntity"]) ? object.className() : Object.getPrototypeOf(object).constructor.name
		}
		
		
		
		/***************************************************************
		 *
		 *  General Unserialize
		 *
		 ***************************************************************/
	
		let serializedIdToSerializedMap;
		function unserializeObjects(serializedObjects, forUpstream) { // If optionalSaver is undefined it will be used to set saver for all unserialized objects.
			serializedIdToSerializedMap = serializedObjects;
			
			// Create placeholders for all streamed (not for all references)
			for (id in serializedIdToSerializedMap) {
				let serialized = serializedIdToSerializedMap[id];
				var newObject = create(serialized.className);
				if (!forUpstream) {
					newObject.const._upstreamId = serialized.id;
					upstreamIdObjectMap[serialized.id] = newObject;
				}
				serialized.object = newObject;
				serialized.finished = false;
			}

			// Unserialize all
			for (id in serializedIdToSerializedMap) {
				unserializeObject(serializedIdToSerializedMap[id], forUpstream);
			}

			// Decorate all
			for (id in serializedIdToSerializedMap) {
				let object = serializedIdToSerializedMap[id].object;
                object._ = logToString(objectDigest(object)); //.__();                    
			}	
		}
		
		function cleanupUnserialize() {
			serializedIdToSerializedMap = null;
		}
			
		function unserializeObject(serializedObject, forUpstream) {
			if (!serializedObject.finished) {
				let object = serializedObject.object;
				
				// Connect to index parent. This could potentially cause a recursive call to create the parent(s) first. 
				if (typeof(serializedObject.indexParent) !== 'undefined') {
					let parentObject = getUnserializedObjectFromSerializedReference(serializedObject.indexParent); // TODO: ensure loaded here... do it recursivley upwards... 
					liquid.setIndex(parentObject, serializedObject.indexParentRelation, object);
				}
				
				for(key in serializedObject.values) {
					object[key] = unserializeValue(serializedObject.values[key], forUpstream);
				}
				
				serializedObject.finished = true;
			}
		}

		// Note: this functions assumes that all objects have placeholders.
		function getUnserializedObjectFromSerializedReference(reference, forUpstream) {
			var fragments = reference.split(":");
			if (fragments[0] !== 'object') {
				log(fragments);
				throw new Error("Expected an object reference!");
			}
			if (fragments[1] === 'null') {
				return null;
			} else {
				if (!forUpstream) {
					// var type = fragments[0];
					var serializedId = parseInt(fragments[2]);
					let serialized = serializedIdToSerializedMap[serializedId];
					unserializeObject(serialized, forUpstream);
					return serialized.object;
				} else {
					// var type = fragments[0];
					var className = fragments[1];
					var idType = fragments[2];
					var id = parseInt(fragments[3]);
					if (idType === 'downstreamId') {
						let serialized = serializedIdToSerializedMap[id]
						unserializeObject(serialized, forUpstream);
						return serialized.object;
					} else {
						return state.pushingDataFromPage.const._selection[id]; // Since there is no global id to object map...
					}
				}				
			}
		}
		

		function unserializeEvents(events, forUpstream) {
			events.forEach(function(event) {
				if (typeof(event.objectId) !== 'undefined') {
					let object;
					if (forUpstream) {
						object = state.pushingDataFromPage.const._selection[event.objectId];
					} else {
						object = upstreamIdObjectMap[event.objectId];
					}
					if (event.type === 'set') {
						logGroup("setting " + event.property);
						// liquid.trace.basic++;
						object[event.property] = unserializeValue(event.value, forUpstream);
						// liquid.trace.basic--;
						logUngroup();
					} else if (event.type === 'delete') {
						delete object[event.property];
					}
				}
			});			
		}

		
		function unserializeValue(value, forUpstream) {
			let fragments = value.split(":");
			let type = fragments.shift();
			if (type === 'object') {
				if (fragments[0] === 'null') return null;
				if (forUpstream) {
					var className = fragments[0];
					var idType = fragments[1];
					var id = parseInt(fragments[2]);
					if (idType === 'downstreamId') {
						let serialized = serializedIdToSerializedMap[id];
						return serialized.object;
					} else {
						return state.pushingDataFromPage.const._selection[id]; // Since there is no global id to object map...
					}
				} else {
					let className = fragments[0];
					let id = parseInt(fragments[1]);
					let locked = fragments[2] === 'true' ? true : false;
					return ensurePlaceholderOrObjectExistsDownstream(id, className, locked);																		
				}
			} else if (type === 'number'){
				let number = fragments[0];
				if (number.indexOf(".") > 0) {
					return parseFloat(number);
				} else {
					return parseInt(number);					
				}
			} else if (type === 'string'){
				return fragments.join(":");
			} else {
				throw new Error("Unsupported data type for streaming: " + type);
			}
		}
		
		function ensurePlaceholderOrObjectExists(serializedObject) {
			if (!forUpstream) {
				ensurePlaceholderOrObjectExistsDownstream(serializedObject.id, serializedObject.className, false);
				return upstreamIdObjectMap[upstreamId];
			} else {
				if (typeof(serializedIdToObjectsMap[serializedObject.id]) === 'undefined') { 
					serializedIdToObjectsMap[serializedObject.id] = create({});
				}
				return serializedIdToObjectsMap[serializedObject.id];
			}
		}
		
		function ensurePlaceholderOrObjectExistsDownstream(upstreamId, className, isLocked) {
			if (typeof(upstreamIdObjectMap[upstreamId]) === 'undefined') {
				var newObject = create(className);
				newObject.const._upstreamId = upstreamId;
				upstreamIdObjectMap[upstreamId] = newObject;
				newObject._ = logToString(objectDigest(newObject)); //.__();					
				newObject.isPlaceholder = true;
				newObject.isLocked = isLocked;
			}
			return upstreamIdObjectMap[upstreamId];
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
		

		/**--------------------------------------------------------------
		 *              Page and session setup
		 *----------------------------------------------------------------*/
		
		
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
				var newKey = Math.floor(Number.MAX_SAFE_INTEGER * Math.random());
				if (typeof(keysMap[newKey]) !== 'undefined') {
					newKey = null;
				}
			}
			return newKey;
		}

		// function createOrGetSessionObject(req) {
			// var token = req.session.id;
		function createOrGetSessionObject(token) {
			// throw new Error("Hard to guess!!!");
			// log("createOrGetSessionObject");
			// log(token);
			if (typeof(sessionsMap[token]) === 'undefined') {
				// TODO: createPersistent instead
				sessionsMap[token] = liquid.create('LiquidSession', {token: token});
			}
			return sessionsMap[token];
		}
		
		// function connectPageWithSocket(pageToken) {
			// return new Promise((resolve, reject) => {
				// let page = getPage(pageToken);
				// if (typeof(page) === 'undefined') {
					// reject("Not a valid page token!");
				// } else {
					// resolve(page);
				// }
				// // const xhr = new XMLHttpRequest();
				// // xhr.open("GET", url);
				// // xhr.onload = () => resolve(xhr.responseText);
				// // xhr.onerror = () => reject(xhr.statusText);
				// // xhr.send();
			// });
		// }
		
		let pushMessageDownstreamCallback = null;
		function setPushMessageDownstreamCallback(callback) {
			pushMessageDownstreamCallback = callback;
		}
		
		function disconnect(pageToken) {
			if (pageToken !== null && typeof(pageToken) !== 'undefined') {
				let page = getPage(pageToken);
				if (liquid.isObject(page)) {
					page.session = null;
					delete pagesMap[pageToken];									
				}
			}
		}

		
		/**--------------------------------------------------------------
		 *              Selection
		 *----------------------------------------------------------------*/

		function logValue(value) {
			log("value:");
			if (liquid.isObject(value)) {
				log(objectDigest(value));
			} else {
				log(value);
			}
		} 
		 
		function objectDigest(object) {
			liquid.state.recordingPaused++;
			liquid.updateInActiveRecording();
			let objectDigest = {};
			objectDigest.id = object.const.id;
			objectDigest.className = getClassName(object);
			if(typeof(object.const.name) === 'string') {
				objectDigest.name = object.const.name;
			}
			if(typeof(object.name) === 'string') {
				objectDigest.name = object.name;
			}
			liquid.state.recordingPaused--;
			liquid.updateInActiveRecording();
			return objectDigest;
		} 
		 
		function logSelection(selection) {
			let digest = [];
			for (key in selection) {
				digest.push(objectDigest(selection[key]));
			}
			log(digest, 4);
		}
		 
		function addToSelection(selection, object) {
			if (liquid.isObject(object) && typeof(selection[object.const.id]) === 'undefined' && liquid.canRead(object)) {
				// Ensure parent indicies and index owner is selected
				if (typeof(object.indexParent) !== 'undefined') {
					addToSelection(selection, object.indexParent);
				}
				
				log("selected: " + object.const.id);
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


		function pushDataDownstream(events) {
			// logGroup("pushDataDownstream?");
			if (pushMessageDownstreamCallback === null) return;	
			logGroup("pushDataDownstream");
			// log(events, 2);
			
			// Send events to pages that has no change in subscription
			logGroup("Send events to pages that has no change in subscription... ");
			let pagesToNotifyWithNoChangeInSelection = {};
			events.forEach(function(event) {
				if (!event.incomingStructureEvent) {
					let serializedEvent;
					for (id in event.object.const._observingPages) {
						let observingPage = event.object.const._observingPages[id];
						log("found an observing page with id: " + observingPage.token);
						// log(event, 2);
						if (state.pushingDataFromPage !== observingPage && !state.dirtyPageSubscritiptions[id]) {
							log("actually send data to it... ");
							pagesToNotifyWithNoChangeInSelection[id] = observingPage;
							if (typeof(observingPage.const._pendingEvents) === 'undefined') {
								observingPage.const._pendingEvents = [];
							}
							if (typeof(serializedEvent) === 'undefined') serializedEvent = serializeEvent(event, false);	
							observingPage.const._pendingEvents.push(serializedEvent);
						} else {
							log("do not notify this page... ");
						}
					}					
				}
			});
			for (id in pagesToNotifyWithNoChangeInSelection) {
				let page = pagesToNotifyWithNoChangeInSelection[id];
				if(pushMessageDownstreamCallback(page, { serializedEvents : page.const._pendingEvents })) { //'pushChangesFromUpstream', 
					delete page.const._pendingEvents;
					delete pagesToNotifyWithNoChangeInSelection[id];
				}
			}
			logUngroup();
			
			// Process pages where page subscriptions changed
			log("dirty page subscriptions: " + Object.keys(state.dirtyPageSubscritiptions).length);
			for (id in state.dirtyPageSubscritiptions) { // TODO: what if an event concerns an object/page without disturbing the page subscription... it needs to be pushed also.. 
				// console.log("Push update to page: " + id);
				var page = state.dirtyPageSubscritiptions[id];
				var update = liquid.getSubscriptionUpdate(page, events);
				// console.log(update);
				if (typeof(page.const._pendingUpdates) === 'undefined') {
					page.const._pendingUpdates = [];
				}
				page.const._pendingUpdates.push(update);

				// TODO: Use the following not to get pingpong messages. 			
				// state.pushingDataFromDownstream;
				// state.pushingDataFromPage;
				
				// TODO: refactor this part to the other layer... 
				while(page.const._pendingUpdates.length > 0) {
					if(pushMessageDownstreamCallback(page, 'pushChangesFromUpstream', page.const._pendingUpdates.shift())) {
						delete state.dirtyPageSubscritiptions[id];
					} else {
						// An update occured before the page has gotten to register its socket id.
						// trace('serialize', 'An update occured before the page has gotten to register its socket id: ', page);
					}
				}
			}
			logUngroup();
		};
			

		function getSubscriptionUpdate(page, events) {
			logGroup("getSubscriptionUpdate");
			
			let result = {};

			let addedAndRemovedIds;
			if (page.const._dirtySubscriptionSelections) {
				liquid.uponChangeDo(function() {  
					let selection = {};
					log(page.service.orderedSubscriptions, 2);
					page.service.orderedSubscriptions.forEach(function(subscription) {
						log("process a subscription ... ");
						log(subscription, 2);
						logGroup();
						
						// Perform a selection with dependency recording!
						var subscriptionSelection = {};
						
						// Perform selection.
						state.restrictAccessToThatOfPage = page;
						state.isSelecting = true; // Note: this write protects the system during selection.
						subscription.object['select' + subscription.selector](subscriptionSelection);
						state.isSelecting = false;
						state.restrictAccessToThatOfPage = null;
						log("subscriptionSelection");
						logSelection(selection); 
					
						// Add to general selection.
						for (id in subscriptionSelection) {
							selection[id] = subscriptionSelection[id];
						}
						logUngroup();
					});
					log("pageSelection");
					logSelection(selection); 
					page.const._previousSelection = page.const._selection;
					page.const._selection = selection;
					page.const._dirtySubscriptionSelections = false;
					
					addedAndRemovedIds = getMapDifference(page.const._previousSelection, selection);
				}, function() {
					log("INVALIDATING SELECTION");
					state.dirtyPageSubscritiptions[page.const.id] = page;
					page.const._dirtySubscriptionSelections = true;
				});
			} else {
				addedAndRemovedIds = {
					added : {},
					removed : {},
					static : page.const._selection
				}
			}

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
			// liquid.state.pageSubject = page; // Why would I need this.... ?
			result.serializedObjects = serializeSelection(addedAndRemovedIds.added, false);
			// liquid.state.pageSubject = null;

			result.unsubscribedUpstreamIds = addedAndRemovedIds.removed;

			// Add event info.
			result.serializedEvents = [];
			events.forEach(function (event) {
				if ((state.pushingDataFromPage !== page || event.isConsequence)) { //Do not send back events to originator unless repeater event!  TODO: What about this piece of code?: || liquid.callOnServer ? 
					if (addedAndRemovedIds.static[event.object.const.id]) {
						// liquid.state.pageSubject = page;
						result.serializedEvents.push(serializeEvent(event, false));
						// liquid.state.pageSubject = null;
					}
				}
			});

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

			// More like: 
			// {
				// serializedEvents : serializedEvents,
				// serializedObjects : serializedObjects
			// };
			logUngroup();
			return result;
		};
		
		
		function getMapDifference(firstSet, secondSet) {
			var added = {};
			var removed = {};
			var static = {};
			for(id in firstSet) {
				if(typeof(secondSet[id]) === 'undefined') {
					removed[id] = firstSet[id];
				} else {
					static[id] = firstSet[id];
				}
			} 
			
			for(id in secondSet) {
				if(typeof(firstSet[id]) === 'undefined') {
					added[id] = secondSet[id];
				}
			}

			return {
				added : added,
				removed : removed,
				static : static
			}
		}
		


		/**-------------------------------------------------------------
		 *                 Receive from downstream
		 ---------------------------------------------------------------*/

		// Form for events:
		//  {action: addingRelation, objectId:45, relationName: 'Foobar', relatedObjectId:45 }
		//  {action: deletingRelation, objectId:45, relationName: 'Foobar', relatedObjectId:45 }
		//  {action: addingRelation, objectDownstreamId:45, relationName: 'Foobar', relatedObjectDownstreamId:45 }
		//  {action: settingProperty, objectDownstreamId:45, propertyName: 'Foobar', propertyValue: 'Some string perhaps'}
		// throw new Error("What to do with all these data");
		
		function unserializeDownstreamPulse(page, pulseData) {
			logGroup("unserializeDownstreamPulse");
			log(pulseData, 3);
		
			// Unserialize all objects
			unserializeObjects(pulseData.serializedObjects, true);
			
			// Consider: Should we postpone notification here?
			unserializeEvents(pulseData.serializedEvents, true);

			// let object = state.pushingDataFromPage.const._selection[pulseData.serializedEvents[0].objectId];
			// log(object);
			logUngroup();
			// TODO: deal with instantly hidden objects, keep track of idToSerializedIdMap...? Or a set of instantly hidden... 
			// var idToDownstreamIdMap = {};
		}
		
		
		
		function receiveCallOnServer(pageToken, callInfo) {
			state.callOnServer = true;
			Fiber(function() {
				if (typeof(pagesMap[pageToken]) !== 'undefined') {
					var page = pagesMap[pageToken];
					trace('serialize', "Make call on server ", page);

					liquid.pulse(function() {
						var object = page.const._selection[callInfo.objectId];
						var methodName = callInfo.methodName;
						var argumentList = callInfo.argumentList; // TODO: Convert to

						if (object.allowCallOnServer(page)) {
							liquid.unlockAll(function() {
								object[methodName].apply(object, argumentList);
							});
						}
					});
				}
			}).run();
			state.callOnServer = false;
		}


		
		function getPage(pageToken) {
			// log("getPage:" + pageToken);
			// log(pagesMap, 2);
			// trace('serialize', "Register page connection:" + pageToken);
			// trace('serialize', pageToken);
			if (typeof(pageToken) !== 'undefined' && pageToken !== null && typeof(pagesMap[pageToken]) !== 'undefined') {
				return pagesMap[pageToken];
			}
			throw new Error("Invalid page token: " + pageToken);
		}

		function messageFromDownstream(pageToken, message) {
			let page = getPage(pageToken);
			if (typeof(page) !== 'undefined') {
				Fiber(function() {
					
					// Process pulse or call.
					if (message.type === 'pulse') {
						state.pushingDataFromDownstream = true; // What happens on asynchronous wait?? move this to liquid.state. 
						state.pushingDataFromPage = page;
						
						liquid.pulse(function() {
							unserializeDownstreamPulse(page, message.data); // foo
						});							
						
						state.pushingDataFromDownstream = false;
						state.pushingDataFromPage = null;
					} else if (message.type === 'call') {
						
					}
					
				}).run();
			} else {
				throw new Error("Invalid page token"); // Consider: Should be soft landing?
			}
		}
		
		
		// new Promise((resolve, reject) => {
			// let page = liquid.getPage(pageToken);
			// if (typeof(page) !== 'undefined') {
				// Fiber(function() {
					// pushingDataFromDownstream = true; // What happens on asynchronous wait?? move this to liquid.state. 
					// if (message.type === 'pulse') {
						// liquid.pulse(function() {
							// liquid.unserializeDownstreamPulse(page, pulseData);
						// });							
					// } else if (message.type === 'call') {
						
					// }
					// pushingDataFromDownstream = false;
				// }).run();
				// resolve();
			// } else {
				// reject();
			// }
		// });

		
		// function processPulseFromDownstream(pageToken, pulseData) {
		// }


		/***************************************************************
		 *
		 *  Client oriented code
		 *  
		 *
		 ***************************************************************/
		
		upstreamIdObjectMap = {};
		
		
		// Note: this function can only be used when we know that there is at least a placeholder. 
		function getUpstreamEntity(upstreamId) {
			if (typeof(upstreamIdObjectMap[upstreamId]) === 'undefined') {
				throw new Error("Tried to get an upstream entity that is unknown... ");
			}
			return upstreamIdObjectMap[upstreamId];
		}
		

		function receiveInitialDataFromUpstream(serializedData) {
			state.pushingPulseFromUpstream = true;
			liquid.pulse(function() {
				log("receiveInitialDataFromUpstream");
				log(serializedData);
				unserializeObjects(serializedData.subscriptionInfo.serializedObjects, false);
				liquid.instancePage = getUpstreamEntity(serializedData.pageUpstreamId);	
				log(liquid);
			});			
			state.pushingPulseFromUpstream = false;
		}
		
		
		function messageFromUpstream(message) {
			if (message.type = "pulse") {
				unserializeUpstreamPulse(message);
			} else if (message.type = "callOnServerReturn") {
				// TODO... 
			}
		}
		

		function unserializeUpstreamPulse(pulseData) {
			logGroup("unserializeUpstreamPulse");
			log(pulseData, 3);
		
			// Unserialize all objects
			unserializeObjects(pulseData.serializedObjects, false)
			
			// Consider: Should we postpone notification here?
			unserializeEvents(pulseData.serializedEvents, false);

			//TODO: Do something with instantly hidden... 
			// // and create an "originators copy" of the data for safekeeping. 
				// for (upstreamId in changes.unsubscribedUpstreamIds) {
					// var object = getUpstreamEntity(upstreamId);
					// object.setIsLockedObject(true);
				// }
				// liquid.allUnlocked--;
			// });
			
			// // Notify 
			// if (typeof(liquid.instancePage) !== 'undefined') {
				// liquid.instancePage.upstreamPulseReceived();
			// }				
				
			logUngroup();
			// TODO: deal with instantly hidden objects, keep track of idToSerializedIdMap...? Or a set of instantly hidden... 
			// var idToDownstreamIdMap = {};
		}

	
		
		// function allNamedUpstreamObjects() {
			// let result = {};
			// for(upstreamId in upstreamIdObjectMap) {
				
			// }
		// }
		
		
		function disconnect(page) {
			delete pagesMap[page.token];
		}
 		
		
		// This was done on client... wierd... I think that active subscriptions should be updated by server and pushed in same pulse as newly loaded... 
		// liquid.instancePage.setReceivedSubscriptions(liquid.instancePage.getPageService().getOrderedSubscriptions());
		// liquid.instancePage.getReceivedSubscriptions().forEach(function(subscription) {
			// trace('setup', "Received Subscription ", subscription, " : ", subscription.getTargetObject(), ".", subscription.getSelector(), "()");
		// });
		// // Setup user
		// window.displayedUser = liquid.findLocalEntity({className: 'User'})

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
		
		
		/**--------------------------------------------------------------
		 *              Push data upstream
		 *----------------------------------------------------------------*/
		
		

		
		function tryPushMessageUpstream(message) {
			if (typeof(pushMessageUpstreamCallback) !== 'undefined') {
				pushMessageUpstreamCallback(message);
			}
		}
		
		// function tryPushSerializedPulseUpstream(serializedPulse) {
			// tryPushMessageUpstream({type: "pulse", data: serializedPulse});
		// }

		function trySendCallToServer(callData) {
			tryPushMessageUpstream({type: "call", data: callData});
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
		function pushDataUpstream(events) {			
			if (typeof(pushMessageUpstreamCallback) !== 'undefined' && !state.pushingPulseFromUpstream) {
				logGroup("pushDataUpstream (actually)");
				log(pushMessageUpstreamCallback);
				log(events, 2);
		
				// Recursive search for objects to push upstream
				var requiredObjects = {};
				function addRequiredCascade(object) {
					if (object.const._upstreamId === null && typeof(requiredObjects[object.const.id]) === 'undefined') {
						requiredObjects[object.const.id] = object;
						Object.keys(object).forEach(function(key) { // TODO: consider, for loop? How to avoid inherited... 
							let value = object[key];
							if (liquid.isObject(value)) {
								addRequiredCascade(value);								
							}
						});
					}
				}
		
				// Scan events for refered objects that needs to be pushed uppstream
				events.forEach(function(event) {
					var eventIsFromUpstream = state.pushingPulseFromUpstream; // && event.isDirectEvent; TODO: Make something to distinguish direct events... 
					if (!eventIsFromUpstream) {
						// log("processing event required objects");
						if (event.object.const._upstreamId !== null && event.type == 'set' && liquid.isObject(event.value) && event.value.const._upstreamId === null) {
							addRequiredCascade(event.value);
						}
					}
				});
		
				// Serialize object
				var serializedObjects = {};
				for(id in requiredObjects) {
					var serializedObject = serializeObject(requiredObjects[id], true);
					serializedObjects[serializedObject.const.id] = serializedObject;
				}
		
				// Serialize events
				var serializedEvents = [];
				events.forEach(function(event) {
					var eventIsForUpstream = !state.pushingPulseFromUpstream || event.isConsequence; 
					if (eventIsForUpstream && event.type === 'set' && event.property !== 'isPlaceholder' && event.property !== 'isLocked') { // TODO: filter out events on properties that are client only... 
						if (event.object.const._upstreamId !== null) {
							serializedEvents.push(serializeEvent(event, true));
						}
					}
				});
		
				// Push pulse upstream if it has any content
				if (serializedEvents.length > 0 || serializedObjects.length > 0) {
					let serializedPulse = {
						serializedEvents : serializedEvents,
						serializedObjects : serializedObjects
					};
					tryPushMessageUpstream({type: "pulse", data: serializedPulse});
				}
				logUngroup();
			}
		};
		
		
		
		/**--------------------------------------------------------------
		 *            Unserialization from upstream
		 *----------------------------------------------------------------*/
		

		

		/**--------------------------------------------------------------
		 * 
		 *     Post pulse setup 
		 *
		 *----------------------------------------------------------------*/
		
		let notifyUICallbacks = []; 
		function addNotifyUICallback(callback) {
			notifyUICallbacks.push(callback);
		}
		
		function streamInRelevantDirections(events) { // Stream in your general direction.
			// log("streamInRelevantDirections?...");
			// log(events.length);
			if (events.length > 0) {				
				logGroup("streamInRelevantDirections");
				// log(events, 2);
				// Notify UI
				notifyUICallbacks.forEach(function(callback) {
					callback(events);
				});
					
				// Push data downstream
				pushDataDownstream(events);
				
				// Push data upstream
				pushDataUpstream(events);
				logUngroup();
				// Store to database, do nothing, leave to eternity, see calling function
			}
		}
		
		if (configuration.usePersistency) {
			liquid.setPostPulseActionBeforeStorage(streamInRelevantDirections);			
		} else {
			liquid.addPostPulseAction(streamInRelevantDirections);		
		}
		
		/**--------------------------------------------------------------
		 *            Publish functions 
		 *----------------------------------------------------------------*/


		 
		function setConfigurationAsDefault() {
			userDefaultConfiguration = configuration;
		}
		
		// Publish some functions 
		Object.assign(liquid, {
			messageFromUpstream : messageFromUpstream,
			logSelection : logSelection,
			logValue : logValue,
			objectDigest : objectDigest,
			receiveInitialDataFromUpstream : receiveInitialDataFromUpstream,
			createOrGetSessionObject: createOrGetSessionObject,
			getPage : getPage, 
			setPushMessageDownstreamCallback : setPushMessageDownstreamCallback,
			setPushMessageUpstreamCallback : setPushMessageUpstreamCallback, 
			getSubscriptionUpdate : getSubscriptionUpdate, 
			messageFromDownstream : messageFromDownstream,
			registerPage : registerPage,
			addNotifyUICallback : addNotifyUICallback,
			setConfigurationAsDefault : setConfigurationAsDefault,
			addToSelection : addToSelection,
			upstreamIdObjectMap : upstreamIdObjectMap,
			disconnect : disconnect,
			configuration : configuration,
			restrictAccess : restrictAccess
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
	function getDefaultConfiguration(usePersistency) {
		if (usePersistency) {
			return {
				eternityConfiguration : {
					causalityConfiguration : {
						useIncomingStructures : true
					}
				}
			}			
		} else {
			return {
				causalityConfiguration : {
					useIncomingStructures : true
				}
			}					
		}
	}
	
	function getDefaultCausalityConfiguration() {
		
	}
	
	function getDefaultEternityConfiguration() {
		
	}
	
	// User defined default configuration 
	let userDefaultConfiguration = null;
	
	let configurationToSystemMap = {};
	return function(requestedConfiguration) {
		if(typeof(requestedConfiguration) === 'undefined') {
			if (userDefaultConfiguration) {
				requestedConfiguration = userDefaultConfiguration;
			} else {
				requestedConfiguration = {};
			}		
		}
		
		let defaultConfiguration = getDefaultConfiguration(requestedConfiguration.usePersistency);
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