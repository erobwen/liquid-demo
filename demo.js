
// Setup liquid and add models to it
console.log("Create DEFAULT Mother fucker!");
let liquid = require("./public/liquid/liquid.js")({name: "serverLiquid", usePersistency: true, eternityConfiguration : {databaseFileName: "demoDb.mongoDb"}});
liquid.setAsDefaultConfiguration();
liquid.addClasses(require("./public/application/model.js"));  // TODO: Can we make it possible to load everything under a specific library?
liquid.assignClassNamesTo(global); // Optional: Make all class names global
let create = liquid.create;

/**--------------------------------------------------------------
 *            Initialize database if necessary
 *----------------------------------------------------------------*/

// Custom setup server script
// require('./include');
// include('./liquid/application/serverConfiguration.js');

if (!liquid.persistent.demoInitialized) {
	liquid.pulse(function() {
		// Create a simple user index. (no advanced index).
		liquid.persistent.users = create("LiquidIndex");
		
		// Create user and add to index.
		var user = create('User', {name: "Walter", email: "some.person@gmail.com", password: "liquid"});
		liquid.persistent.users[user.email] = user; // Add to user index. 

		var favourite = create('Category', {name: 'Favourite', description: '', owner: user}); // Adds it to users own category index.
		var funny = create('Category', {name: 'Funny', description: '', owner: user});
		var politics = create('Category', {name: 'Politics', description: '', owner: user});
		var georgism = create('Category', {name: 'Georgism', description: '', owner: user});
		politics.subCategories.add(georgism);

		setTimeout(function() {
			liquid.pulse(function() {

				var myPolitics = create('Category', {name: 'MyPoliticalCommitments', description: '', owner: user});
				politics.subCategories.add(myPolitics);

				var directDemocracy = create('Category', {name: 'Direct Democracy', description: '', owner: user});
				politics.subCategories.add(directDemocracy);

				var liquidDemocracy = create('Category', {name: 'Liquid Democracy', description: '', owner: user});
				directDemocracy.subCategories.add(liquidDemocracy);

				var direktdemokraterna = create('Category', {name: 'Direktdemokraterna', description: '', owner: user});
				liquidDemocracy.subCategories.add(direktdemokraterna);
				myPolitics.subCategories.add(direktdemokraterna);
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

/* ------------------------------------------
 *    Initialize http server using express
 * ------------------------------------------ */

 let liquidControllers = {
	'' : "LiquidPage",
	'index': 'LiquidPage',
	'demo': function(req) { // Note: req follows express conventions.
		var session = liquid.createOrGetSessionObject(req.session.token);
		var page = create('LiquidPage', {Session: session});
		page.getPageService().addOrderedSubscription(create('Subscription', {object: user, selector:'all'})); //object: user,
		return page;
	},
	'someurl/:someargument' : 'PageWithArgument'
}

// Setup express server
var express = require('express');
var expressHttpServer = express();
expressHttpServer.set('view engine', 'ejs');
var cookieParser = require('cookie-parser');
var session = require('express-session');
expressHttpServer.use(cookieParser());
expressHttpServer.use(session({secret: '12345QWER67890TY'}));
// expressHttpServer.get('/fie', function(req, res) {res.send("Found me!");}); // Test server alive...
var expressControllers = createExpressControllers(liquidControllers);

for (controllerName in expressControllers) {
	expressHttpServer.get('/' + controllerName, expressControllers[controllerName]);
}

expressHttpServer.use(express.static('public')); // TODO: use grunt to compile to different directory

expressHttpServer.listen(4000, function () {
  console.log('Liquid is now listening on port 4000!');
});

function createExpressControllers(liquidControllers) {
	var controllers = {};
	for (url in liquidControllers) {
		var controllerDefinition = liquidControllers[url];
		if (typeof(controllerDefinition) === 'string') {
			// console.debug("Create controller: " + url + " -> " + controllerDefinition);
			controllers[url] = createExpressControllerFromClassName(controllerDefinition);
		} else {
			// console.debug("Create controller: " + url + " -> [function]");
			controllers[url] = createExpressControllerFromPageCreatorFunction(controllerDefinition);
		}
	}
	// controllers['foo'] = function(req, res) {  res.send('made it'); };
	return controllers;
}

function createExpressControllerFromClassName(className) {
	return createExpressControllerFromPageCreatorFunction(function(req) {
		var session = liquid.createOrGetSessionObject(req.session.token);
	
		// Setup page object TODO: persistent page object?
		return create(className, { Session : session });
	});
}

function createExpressControllerFromPageCreatorFunction(pageCreatorFunction) {
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
	
	socket.on('registerPageTokenTurnaround', function(pageToken) {
		liquid.registerPageTokenTurnaround(pageToken).then(function(page) {
			page.const._socket = socket;
			// liquid.pushDataDownstream(); // In case this page had subscription updates that never got pushed. ???
		}).catch(function() {
			socket.emit('invalidPageToken'); // TODO: Consider create new page?
		});
	});

	socket.on('pushDownstreamPulse', function(pageToken, pulseData) {
		liquid.pushDownstreamPulse(pageToken, pulseData).catch(function() {
			socket.emit('invalidPageToken'); // TODO: Consider create new page?			
		});
	});

	socket.on('makeCallOnServer', function(pageToken, callInfo) {
		liquid.makeCallOnServer(pageToken, callInfo);
	});

	socket.on('disconnect', function(pageToken) {
		liquid.disconnect(pageToken);
	});
});

liquid.setPushMessageDownstreamCallback(function(page, messageType, data) {
	page.const._socket.emit(messageType, data);	
});		

