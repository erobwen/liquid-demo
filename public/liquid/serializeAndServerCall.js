/*--------------------------------------
 * Common liquid functionality
 *   (shared between server and client)
 *---------------------------------------*/

var addLiquidSerializeAndServerCallFunctionality = function(liquid) {
    
    
    
    
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
    
    
    
    /**
     * Setup default saver
     */
};    
