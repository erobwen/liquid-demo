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
