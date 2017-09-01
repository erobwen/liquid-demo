var liquidCommon = require('../../public/js/liquid/common/core.js');
var liquidShape = require('../../public/js/liquid/common/shape.js');
var liquidObjectMember = require('../../public/js/liquid/common/member.js');
var liquidEntity = require('../../public/js/liquid/common/entity.js');
var userPageAndSession = require('../../public/js/liquid/common/userPageAndSession.js');
var liquidSelection = require('../../public/js/liquid/common/selection.js');
var liquidRepetition = require('../../public/js/liquid/common/reactive.js');
var neo4j = require('./liquidNeo4jInterface.js');
include('./public/js/liquid/common/utility.js'); ///..  // Note: path relative to the include service!
include('./public/js/liquid/common/trace.js'); ///..  // Note: path relative to the include service!
require( 'console-group' ).install();

/**
 * The liquid with common functionality
 */ 
var liquid = {};
liquid.onServer = true;
liquid.onClient = false;
liquidObjectMember.addLiquidObjectMemberFunctionality(liquid);
liquidCommon.addCommonLiquidFunctionality(liquid);
liquidShape.addLiquidShapeFunctionality(liquid);
liquidEntity.addLiquidEntity(liquid);
userPageAndSession.addUserPageAndSessions(liquid);
liquidSelection.addLiquidSelectionFunctionality(liquid);
liquidRepetition.addLiquidRepetitionFunctionality(liquid);

var commonInitialize = liquid.initialize;
liquid.initialize = function() {
	neo4j.initialize();
	commonInitialize();
	// liquid.clearPagesAndSessions();
};

liquid.clearDatabase = function() {
	neo4j.clearDatabase();
};

liquid.clearPagesAndSessions = function() {
	neo4j.query("MATCH (n {className:'LiquidSession'}) DETACH DELETE n");
	neo4j.query("MATCH (n {className:'LiquidPage'}) DETACH DELETE n");
};



/**--------------------------------------------------------------
*                 Sessions
*----------------------------------------------------------------*/

liquid.sessions = {};

liquid.createSession = function(connection) {
	liquid.sessions[connection] = {};
	return liquid.sessions[connection];
}


/*********************************************************************************************************
 *  Persistency
 *
 *
 *
 *
 *
 *******************************************************************************************************/

/**--------------------------------------------------------------
*                Persistent object finding 
*----------------------------------------------------------------*/


liquid.findPersistentEntity = function(properties) {
	return liquid.findPersistentEntities(properties)[0];
};

liquid.findPersistentEntities = function(properties) {
	// console.log("findEntities:");
	// console.log(properties);
	var persistentEntityIds = neo4j.findEntitiesIds(properties);
	// console.log(entityIds);
	var result = [];
	persistentEntityIds.forEach(function(persistentId) {
		result.push(liquid.getPersistentEntity(persistentId));
	}); 
	return result;
};


/**--------------------------------------------------------------
 *                Object persisting
 *----------------------------------------------------------------*/

liquid.persist = function(object) {
	if (object._persistentId === null) {
		liquid.ensurePersisted(object);
	} 
	neo4j.setPropertyValue(object._persistentId, "_persistedDirectly", true);
};


liquid.ensurePersisted = function(object) {
	if (object._persistentId === null) {
		object._persistentId =  neo4j.createNode(liquidClass.tagName, className);

		object.forAllProperties(function (definition, instance) {
			if (typeof(instance.data) !== 'undefined') {
				neo4j.setPropertyValue(object._persistentId, "definition.name", instance.data); // TODO: Set multiple values at the same time!
			}
		});
		object.forAllOutgoingRelationsAndObjects(function(definition, instance, relatedObject){
			liquid.ensurePersisted(relatedObject);
			neo4j.createRelationTo(object._persistentId, relatedObject._persistentId, definition.qualifiedName);
		});
	}
};

liquid.unpersist = function(object) {
	if (object._persistedDirectly === true) {
		object._persistedDirectly == false;
		neo4j.setPropertyValue(object._persistentId, "_persistedDirectly", false);
		liquid.unpersistIfOrphined(object);
	}
};

liquid.hasDirectlyPersistedAncestor = function(object) {
	var visitedSet = {};
	var result = false;
	object.forAllIncomingRelations(function(relatedObject) { // TODO: consider change to "forAllStrongIncomingRelations" ?
		if (liquid.hasDirectlyPersistedAncestorLoopControl(relatedObject, visitedSet)) {
			result = true;
		}
	});
	return result;
};

liquid.hasDirectlyPersistedAncestorLoopControl = function(object, visitedSet) {
	if (typeof(visitedSet[object.id]) !== 'undefined') {
		return false;
	} else {
		visitedSet[object.id] = true;
		if (object._persistentId === null) {
			return false;
		}
		if (object._persistedDirectly) {
			return true;
		}
		var result = false;
		object.forAllIncomingRelations(function(relatedObject) { // TODO: consider change to "forAllStrongIncomingRelations" ?
			if (liquid.hasDirectlyPersistedAncestorLoopControl(relatedObject, visitedSet)) {
				result = true;
			}
		});
		return result;
	}
};

liquid.unpersistIfOrphined = function() {
	if (object._persistedDirectly === false && !liquid.hasDirectlyPersistedAncestor(object)) {
		neo4j.query("MATCH (n) WHERE n.id() = '" + object._persistentId + "' DETACH DELETE n");
		object._persistentId = null;
		object.forAllOutgoingRelationsAndObjects(function(definition, instance, relatedObject){
			liquid.unpersistIfOrphined(relatedObject);
		});
	}
}


/**--------------------------------------------------------------
 *                       Indexes
 *----------------------------------------------------------------*/

liquid.getIndex = function(className) {
	var ids = neo4j.findEntitiesIds({className : className});
	//console.log(queryResult);
}

/**--------------------------------------------------------------
*                Object creation 
*----------------------------------------------------------------*/

liquid.createPersistent = function(className, initData) {
	var object = liquid.create(className, initData);

	// Save to database
	object._persistedDirectly = true;
	var liquidClass = liquid.classRegistry[className];
	object._persistentId =  neo4j.createNode(liquidClass.tagName, className);
	neo4j.setPropertyValue(object._persistentId, "_persistedDirectly", true)
	liquid.persistentIdObjectMap[object._persistentId] = object;
	object._globalId = "1:" + object._persistentId;

	return object;
}


/**--------------------------------------------------------------
*                 Node retreival from id
*----------------------------------------------------------------*/

/**
* Get object
*/
liquid.getPersistentEntity = function(persistentId) {
	// console.log("getEntity");
	// console.log(persistentId);
	var stored = liquid.persistentIdObjectMap[persistentId];
	if (typeof(stored) !== 'undefined') {
		// console.log("Found a stored value!");
		return stored;
	} else {
		return liquid.loadNodeFromId(persistentId);
	}
};


/**
 * Node creation
 */	
liquid.loadNodeFromId = function(persistentId) {
	// console.log("loadNodeFromId:" + persistentId);
	var nodeData = neo4j.getNodeInfo(persistentId);
	var className = nodeData['className'];
	var object = liquid.createClassInstance(className);
	object._persistentId = persistentId;

	// Load all values for properties, or use default where no saved data present.
	if (typeof(nodeData) !== 'undefined') {
		for (var propertyName in object._propertyDefinitions) {
			var propertyInstance = object._propertyInstances[propertyName];
			if (typeof(nodeData[propertyName]) !== 'undefined') {
				propertyInstance.data = nodeData[propertyName];
			} else {
				var propertyDefinition = object._propertyDefinitions[propertyName];
				propertyInstance.data = propertyDefinition.defaultValue;
			}		
		}
	}	

	object._ = object.__(); // Debug field

	liquid.persistentIdObjectMap[object._persistentId] = object;
	return object;
};


/**--------------------------------------------------------------
*               Generic relation loading interface
*----------------------------------------------------------------*/

liquid.loadSingleRelation = function(object, definition, instance) {
	if (object._persistentId !== null) {
		console.log("loadSingleRelation: " + object.__() + " -- [" + definition.name + "] --> ?");
		instance.data = null;
		var relationIds = neo4j.getRelationIds(object._persistentId, definition.qualifiedName);
		// console.log(relationIds);
		if (relationIds.length == 1) {
			var relatedObject = liquid.getPersistentEntity(relationIds[0]);
			instance.data = relatedObject;
			instance.isLoaded = true;
		} else if (relationIds.length > 1) {
			instance.isLoaded = false;
			throw new Exception("Getting a single relation, that has more than one relation defined in the database.");
		}
		//liquid.logData(instance.data);
		return instance.data;
	} else {
		return null;
	}
};


liquid.ensureIncomingRelationsLoaded = function(object) {
	if (object._persistentId !== null) {
		// console.log("ensureIncomingRelationsLoaded: " + object.__() + " <--  ?");
		trace('incoming', object, " <--  ?");
		if (typeof(object._allIncomingRelationsLoaded) === 'undefined') {
			// console.log("run liquid version of ensureIncomingRelationLoaded");
			var incomingRelationAndIds = neo4j.getAllIncomingRelationsAndIds(object._persistentId); // This now contains potentially too many ids.
			// console.log("Load incoming relations id");
			// console.log(incomingRelationIds);
			if (incomingRelationIds.length > 0) {
				incomingRelationIds.forEach(function(relationAndId) {
					var incomingRelationQualifiedName = relationAndId.relationName;
					var incomingId = relationAndId.id;

					var relatedObject = liquid.getPersistentEntity(incomingId);

					// Call getter on the incoming relations to load them TODO: remove observer registration in this call!?
					var definition = relatedObject.getRelationDefinitionFromQualifiedName(incomingRelationQualifiedName);
					relatedObject[definition.getterName]();
				});
			}
		}
		object._allIncomingRelationsLoaded = true;
		object.forAllReverseRelations(function(definition, instance) {
			object._incomingRelationsComplete[definition.incomingRelationQualifiedName] = true; // Make a note all incoming relations loaded
		});
	}
};


liquid.ensureIncomingRelationLoaded = function(object, incomingRelationQualifiedName) {
	// console.log("ensureIncomingRelationLoaded: " + object.__() + " <-- [" + incomingRelationQualifiedName + "] -- ?");
	trace('incoming', object, " <--[",  incomingRelationQualifiedName, "] -- ?");
	if (object._persistentId !== null) {
		if (typeof(object._incomingRelationsComplete[incomingRelationQualifiedName]) === 'undefined') {
			// console.log("run liquid version of ensureIncomingRelationLoaded");
			var incomingRelationIds = neo4j.getReverseRelationIds(object._persistentId, incomingRelationQualifiedName); // This now contains potentially too many ids.
			// console.log("Load incoming relations id");
			// console.log(incomingRelationIds);
			if (incomingRelationIds.length > 0) {
				incomingRelationIds.forEach(function(incomingId) {
					var relatedObject = liquid.getPersistentEntity(incomingId);
					// Call getter on the incoming relations, this will trigger observation
					var definition = relatedObject.getRelationDefinitionFromQualifiedName(incomingRelationQualifiedName);
					relatedObject[definition.getterName]();
				});
			}
		}
		object._incomingRelationsComplete[incomingRelationQualifiedName] = true;
	}
};

	
liquid.loadSetRelation = function(object, definition, instance) {
	if (object._persistentId !== null) {
		// Load relation
		console.log("loadSetRelation: " + object.__() + " --[" + definition.name + "]--> ?");
		var set = [];
		var relationIds = neo4j.getRelationIds(object._persistentId, definition.qualifiedName);
		// console.log(relationIds);
		relationIds.forEach(function(objectId) {
			set.push(liquid.getPersistentEntity(objectId));
		});
		// console.log(set);
		set.forEach(function(relatedObject) {
			liquid.addIncomingRelation(relatedObject, definition.qualifiedName, object);
		});
		instance.data = set;
		instance.isLoaded = true;

		// Setup sorting
		liquid.setupRelationSorting(object, definition, instance);
		// liquid.logData(instance.data);
	} else {
		instance.data = [];
	}
};


/*********************************************************************************************************
 *  Push/Serve/Receive from/to Downstream
 *
 *
 *
 *
 *
 *******************************************************************************************************/





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


liquid.dirtyPageSubscritiptions = {};
liquid.getSubscriptionUpdate = function(page) {
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


liquid.pushDataDownstream = function() {
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
				page._socket.emit('pushSubscriptionChanges', page._pendingUpdates.shift());
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

liquid.unserializeDownstreamPulse = function(pulseData) {
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


//
// function ensureEmptyObjectExists(upstreamId, className) {
// 	if (typeof(liquid.upstreamIdObjectMap[upstreamId]) === 'undefined') {
// 		var newObject = liquid.createClassInstance(className);
// 		newObject._upstreamId = upstreamId;
// 		newObject._noDataLoaded = true;
// 		liquid.upstreamIdObjectMap[upstreamId] = newObject;
// 		newObject._ = newObject.__();
// 	}
// 	return liquid.upstreamIdObjectMap[upstreamId];
// }
// var pulse = {
// 	serializedEvents : serializedEvents,
// 	serializedObjects : []
// };
// liquid.upstreamSocket.emit("downstreamPulse", liquid.hardToGuessPageId, pulse);





/**--------------------------------------------------------------
*                 		Export
*----------------------------------------------------------------*/

/**
 * Export createEntity and registerClass
 */
module.exports.liquidPageRequest = liquid.pageRequest;
module.exports.liquidDataRequest = liquid.dataRequest;

module.exports.create = liquid.create;
module.exports.createPersistent = liquid.createPersistent;

module.exports.getEntity = liquid.getEntity;
module.exports.getPersistentEntity = liquid.getPersistentEntity;
module.exports.getUpstreamEntity = liquid.getUpstreamEntity;

module.exports.findEntity = liquid.findEntity;
module.exports.findEntities = liquid.findEntities;

module.exports.registerClass = liquid.registerClass;
module.exports.liquid = liquid;
