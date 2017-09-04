
require('./include');

let liquid = require("./liquid/liquid.js")();
// liquid.initialize();

// Liquid server and model libraries.
includeFolderOnce('./public/js/liquid/application/model');


var Fiber = require('fibers');

/**--------------------------------------------------------------
 *                 Custom setup script
 *----------------------------------------------------------------*/

// Custom setup server script
// include('./liquid/application/serverConfiguration.js');

if (!liquid.persistent.demoInitialized) {
	liquid.pulse('local', function() {
			
		/***
		 * Setup some test data
		 */

		var user = create('User', {name: "Walter", email: "some.person@gmail.com", password: "liquid"});
		liquid.addToLocalRegistry(user);

		var favourite = create('Category', {name: 'Favourite', description: '', owner: user});
		var funny = create('Category', {name: 'Funny', description: '', owner: user});
		var politics = create('Category', {name: 'Politics', description: '', owner: user});
		var georgism = create('Category', {name: 'Georgism', description: '', owner: user});
		politics.addSubCategory(georgism);


		setTimeout(function() {
			liquid.pulse('local', function() {

				var myPolitics = create('Category', {name: 'MyPoliticalCommitments', description: '', owner: user});
				politics.addSubCategory(myPolitics);

				var directDemocracy = create('Category', {name: 'Direct Democracy', description: '', owner: user});
				politics.addSubCategory(directDemocracy);

				var liquidDemocracy = create('Category', {name: 'Liquid Democracy', description: '', owner: user});
				directDemocracy.addSubCategory(liquidDemocracy);

				var direktdemokraterna = create('Category', {name: 'Direktdemokraterna', description: '', owner: user});
				liquidDemocracy.addSubCategory(direktdemokraterna);
				myPolitics.addSubCategory(direktdemokraterna);
			});
		}, 10000);

		// Create References
		var created = 0;
		while (created++ < 3) {
			var reference1 = create('Reference', {url : 'http://foo.com/' + created, owner: user, categories: [georgism]});
		}
		
		liquid.persistent.demoInitialized = true;
	});
}



/* ----------------------------
 *    Initialize http server 
 * ---------------------------- */

// Setup express server
var express = require('express');
var liquidHttpServer = express();
liquidHttpServer.set('view engine', 'ejs');
var cookieParser = require('cookie-parser');
var session = require('express-session');
liquidHttpServer.use(cookieParser());
liquidHttpServer.use(session({secret: '12345QWER67890TY'}));


//--------------------------------------------------------------------------------------
// var controllers = require('./expressControllers.js');

let controllersSetup = {
	'index': 'LiquidPage',
	'test': createTestPage,
	// 'test': create,
	'someurl/:someargument' : 'PageWithArgument'
};


function createTestPage(req) {
	var session = liquid.createOrGetSessionObject(req);
	// session.setUser(user);
	var page = create('LiquidPage', {Session: session});
	page.getPageService().addOrderedSubscription(create('Subscription', {object: user, selector:'all'})); //object: user,
	return page;
}

function createControllerFromClassName(className) {
	return createControllerFromFunction(function(req) {
		return liquid.createPage(className, req);
	});
}

function createControllerFromFunction(controllerFunction) {
	// console.debug("createControllerFromFunction");
	return function(req, res) {
		// console.debug("in controller created by func");
		Fiber(function() {
			liquid.pulse('httpRequest', function() {  // consider, remove fiber when not using rest api?    // change to httpRequest pulse  ?
				// console.debug("in controller created by func");
				// Setup session object (that we know is the same object identity on each page request)
				var page = controllerFunction(req)
				// var selection = {};
				// page.selectAll(selection);
	
				var data = {
					// serialized : liquid.serializeSelection(selection),
					pageUpstreamId : page._id,
					subscriptionInfo : liquid.getSubscriptionUpdate(page)
				};
				res.render('layout',{
					data: JSON.stringify(data)
				});
			});
		}).run();
	}
}

function createControllers(liquidControllers) {
	var controllers = {};
	for (url in liquidControllers) {
		var controllerDefinition = liquidControllers[url];
		if (typeof(controllerDefinition) === 'string') {
			// console.debug("Create controller: " + url + " -> " + controllerDefinition);
			controllers[url] = createControllerFromClassName(controllerDefinition);
		} else {
			// console.debug("Create controller: " + url + " -> [function]");
			controllers[url] = createControllerFromFunction(controllerDefinition);
		}
	}
	// console.debug(controllers);
	controllers['foo'] = function(req, res) {  res.send('made it'); };
	return controllers;
}




function createPage(pageClassName, req) {
	var session = liquid.createOrGetSessionObject(req);
	
	// Setup page object TODO: persistent page object?
	return create(pageClassName, { hardToGuessPageId: liquid.getPageId(), Session : session });
}


var controllers = createControllers(controllersSetup);
if (typeof(controllers['index']) === 'undefined') {
	controllers['index'] = createControllerFromClassName('LiquidPage');
}



//http://krasimirtsonev.com/blog/article/deep-dive-into-client-side-routing-navigo-pushstate-hash





//--------------------------------------------------------------------------------------
//--------------------------------------------------------------------------------------

for (controllerName in controllers) {
	liquidHttpServer.get('/' + controllerName, controllers[controllerName]);
}

// Set defualt path
var mainController = 'test';
if (typeof(controllers[mainController]) !== 'undefined') {
	liquidHttpServer.get('/', controllers[mainController]);
}

liquidHttpServer.get('/fie', function(req, res) {res.send("Found me!");});

liquidHttpServer.use(express.static('public')); // TODO: use grunt to compile to different directory

liquidHttpServer.listen(4000, function () {
  console.log('Liquid is now listening on port 4000!');
});


/* ----------------------------
 *    Initialize socket io 
 * ---------------------------- */
 
var http = require("http"),
	server = http.createServer(function(req, res) {
		res.writeHead(200, {'Content-Type': 'text/html'});
		res.end(index);
	}).listen(8080);
	 
var socketIo = require('socket.io').listen(server); // Don't forget to "npm install socket.io" before including this
var fs = require('fs');
	
var liquidSocket = socketIo.sockets;
 
liquidSocket.on('connection', function (socket) {
	trace('serialize', 'Connected a socket!');
	
	socket.on('registerPageId', function(hardToGuessPageId) {
		Fiber(function() {
			trace('serialize', "Register page connection:" + hardToGuessPageId);
			trace('serialize', hardToGuessPageId);
			if (typeof(hardToGuessPageId) !== 'undefined' && hardToGuessPageId !== null && typeof(liquid.pagesMap[hardToGuessPageId]) !== 'undefined') {
				var page = liquid.pagesMap[hardToGuessPageId];
				page._socket = socket;
				liquid.pushDataDownstream(); // In case this page had subscription updates that never got pushed. 
				trace('serialize', "Made an association between socket and hardToGuessPageId");
				//trace('serialize', page._socket);
			}
		}).run();
	});

	socket.on('pushDownstreamPulse', function(hardToGuessPageId, pulseData) {
		Fiber(function() {
			if (typeof(liquid.pagesMap[hardToGuessPageId]) !== 'undefined') {
				var page = liquid.pagesMap[hardToGuessPageId];
				liquid.pulse(page, function() {
					liquid.unserializeDownstreamPulse(pulseData);
				});
			} else {
				socket.emit('disconnectedDueToInactivityOrServerFault'); // TODO: Consider create new page?
			}
		}).run();
	});

	liquid.callOnServer = false;
	socket.on('makeCallOnServer', function(hardToGuessPageId, callInfo) {
		liquid.callOnServer = true;
		// trace('serialize', "Make call on server");
		// trace('serialize', hardToGuessPageId);
		// trace('serialize', callInfo);
		Fiber(function() {
			// trace('serialize', Object.keys(liquid.pagesMap));
			if (typeof(liquid.pagesMap[hardToGuessPageId]) !== 'undefined') {
				var page = liquid.pagesMap[hardToGuessPageId];
				trace('serialize', "Make call on server ", page);

				liquid.pulse(page, function() {
					var object = getEntity(callInfo.objectId);
					var methodName = callInfo.methodName;
					var argumentList = callInfo.argumentList; // TODO: Convert to
					trace('serialize', "Call: ", methodName);
					trace('serialize', "Call: ", argumentList);

					// traceTags.event = true;
					if (object.allowCallOnServer(page)) {
						liquid.unlockAll(function() {
							object[methodName].apply(object, argumentList);
						});
					}
					// delete traceTags.event;

					trace('serialize', "Results after call to server", page.getSession(), page.getSession().getUser());
				});
			}
		}).run();
		liquid.callOnServer = false;
	});

	socket.on('disconnect', function(hardToGuessPageId) {
		Fiber(function() {
			// hardToGuessPageId
			// var page = liquid.pagesMap[hardToGuessPageId];
			// delete liquid.pagesMap[hardToGuessPageId];
			// page.setSession(null);
			// // TODO: unpersist page
			trace('serialize', 'Disconnected'); 
			trace('serialize', hardToGuessPageId);
		}).run();
	});
});

