
// Setup liquid and add models to it
let liquid = require("./public/liquid/liquid.js")({usePersistency: true, databaseFileName: "demoDb.mongoDb"});
liquid.addModels(require("./public/application/model.js"));  // TODO: Can we make it possible to load everything under a specific library?
liquid.setClassNamesTo(global); // Optional: Make all class names global


/**--------------------------------------------------------------
 *                 Custom setup script
 *----------------------------------------------------------------*/

// Custom setup server script
// require('./include');
// include('./liquid/application/serverConfiguration.js');

if (!liquid.persistent.demoInitialized) {
	liquid.pulse('local', function() {
		// Create a simple user index. (no advanced index).
		liquid.persistent.users = create({});
		
		// Create user and add to index.
		var user = create('User', {name: "Walter", email: "some.person@gmail.com", password: "liquid"});
		liquid.persistent.users[user.email] = user; // Add to user index. 

		var favourite = create('Category', {name: 'Favourite', description: '', owner: user}); // Adds it to users own category index.
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

		// liquid.addToLocalRegistry(user); //????
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
// liquidHttpServer.get('/fie', function(req, res) {res.send("Found me!");}); // Test server alive...

var controllers = createControllers({
	'' : "LiquidPage"
	'index': 'LiquidPage',
	'demo': function(req) {
		var session = liquid.createOrGetSessionObject(req.session.token);
		var page = create('LiquidPage', {Session: session});
		page.getPageService().addOrderedSubscription(create('Subscription', {object: user, selector:'all'})); //object: user,
		return page;
	},
	'someurl/:someargument' : 'PageWithArgument'
});

for (controllerName in controllers) {
	liquidHttpServer.get('/' + controllerName, controllers[controllerName]);
}

liquidHttpServer.use(express.static('public')); // TODO: use grunt to compile to different directory

liquidHttpServer.listen(4000, function () {
  console.log('Liquid is now listening on port 4000!');
});


function createControllerFromClassName(className) {
	return createControllerFromPageCreatorFunction(function(req) {
		var session = liquid.createOrGetSessionObject(req.session.token);
	
		// Setup page object TODO: persistent page object?
		return create(className, { token: liquid.getPageId(), Session : session });
	});
}


function createControllerFromPageCreatorFunction(pageCreatorFunction) {
	return function(req, res) {
		liquid.pulse(function() {
			// Setup session object (that we know is the same object identity on each page request)
			var page = pageCreatorFunction(req)
			var data = {
				// serialized : liquid.serializeSelection(selection),
				pageUpstreamId : page._id,
				subscriptionInfo : liquid.getSubscriptionUpdate(page)
			};
			res.render('layout',{
				data: JSON.stringify(data)
			});
		});
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
			controllers[url] = createControllerFromPageCreatorFunction(controllerDefinition);
		}
	}
	// console.debug(controllers);
	// controllers['foo'] = function(req, res) {  res.send('made it'); };
	return controllers;
}




//http://krasimirtsonev.com/blog/article/deep-dive-into-client-side-routing-navigo-pushstate-hash





//--------------------------------------------------------------------------------------
//--------------------------------------------------------------------------------------


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

