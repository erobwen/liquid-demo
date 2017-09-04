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



/**--------------------------------------------------------------
*                 Sessions
*----------------------------------------------------------------*/

liquid.clearPagesAndSessions = function() {
	neo4j.query("MATCH (n {className:'LiquidSession'}) DETACH DELETE n");
	neo4j.query("MATCH (n {className:'LiquidPage'}) DETACH DELETE n");
};

liquid.sessions = {};

liquid.createSession = function(connection) {
	liquid.sessions[connection] = {};
	return liquid.sessions[connection];
}



/*********************************************************************************************************
 *  Push/Serve/Receive from/to Downstream
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


