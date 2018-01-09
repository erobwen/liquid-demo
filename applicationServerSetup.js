// Error.stackTraceLimit = Infinity;

// Setup liquid and add models to it
let liquid = require("./public/liquid/liquid.js")(
	{
		name: "serverLiquid", 
		usePersistency: true, 
		isServer: true, 
		eternityConfiguration : {
			allowPlainObjectReferences : false,
			databaseFileName: "demoDb.mongoDb",
			causalityConfiguration : {
				useIncomingStructures : true, 
				incomingStructuresAsCausalityObjects : false,
				recordPulseEvents : true
			}
		}
	}
);
liquid.trace.selection = 1;
liquid.trace.socket = 1; 
// liquid.trace.demo = 1; 
// liquid.trace.liquid = 1; 
// liquid.trace.entity = 1;
// liquid.trace.eternity = 1;
// liquid.trace.incoming = 1; 
// liquid.trace.eternity = 1;

// liquid.trace.liquid = 1; 


// log("demo.liquid state: ");
// log(liquid.state);

liquid.setConfigurationAsDefault();
liquid.addClasses(require("./public/application/todoList.js"));  // TODO: Can we make it possible to load everything under a specific library?
liquid.assignClassNamesTo(global); // Optional: Make all class names global
let create = liquid.create;

// let objectlog = require("./public/liquid/objectlog.js");
let trace = liquid.trace;
let log = liquid.log;
let logGroup = liquid.logGroup;
let logUngroup = liquid.logUngroup;

/**--------------------------------------------------------------
 *            Initialize database if necessary
 *----------------------------------------------------------------*/

// Custom setup server script
// require('./include');
// include('./liquid/application/serverConfiguration.js');
let user;
let georgism;
var politics;

if (!liquid.persistent.demoInitialized) {

	// logGroup("Commence experiment... ");
	
	// liquid.eternity.imageCausality.trace.incoming = 1;
	// liquid.eternity.imageCausality.trace.pulse = 1;
	
	// liquid.pulse(function() {
		// liquid.persistent.foo = create({});
	// });
	
	// liquid.eternity.imageCausality.trace.pulse = 0;
	// liquid.eternity.imageCausality.trace.incoming = 0;
	
	// logUngroup("... ");
	// throw new Error("done");

	liquid.pulse(function() {
		log.demo && logGroup("Setup database contents... ");
		
		// Name of persistent object
		// liquid.persistent.name = "persistent";
		
		// Create a simple user index. 
		liquid.setIndex(liquid.persistent, "users", create("LiquidIndex", {'keyPropertyName' : 'name'}));
		
		// log("==========================================================");
		// Create user and add to index.
		user = create('User', {name: "Walter", email: "some.person@gmail.com", password: "liquid"});
		user.todoList = create([]);
		user.todoList.push(create('TodoItem', {name : "Foo", done: false}));
		user.todoList.push(create('TodoItem', {name : "Fie", done: false}));
		user.todoList.push(create('TodoItem', {name : "Fum", done: false}));
		user.todoList.push(create('TodoItem', {name : "Fum1", done: false}));
		user.todoList.push(create('TodoItem', {name : "Fum2", done: false}));
		user.todoList.push(create('TodoItem', {name : "Fum3", done: false}));
		liquid.persistent.users.add(user);
	// });
	// liquid.pulse(function() {
		// var favourite = create('Category', {name: 'Favourite', description: '', owner: user}); // Adds it to users own category index.
		// log(user.ownedCategories.contents);
		
		// var funny = create('Category', {name: 'Funny', description: '', owner: user});
		// politics = create('Category', {name: 'Politics', description: '', owner: user});
		// georgism = create('Category', {name: 'Georgism', description: '', owner: user});
		// politics.subCategories.add(georgism);
		
		// log("all incoming:");
		// log(liquid.configuration, 5);
		// liquid.forAllIncoming(georgism, "subCategories", (parent) => {log(parent);})
		// log("==========================================================");
		// log (" Adding... ");
		// liquid.trace.basic++;
		// liquid.trace.basic--;
		// log("==========================================================");
		
		// var created = 0;
		// while (created++ < 3) {
			// var reference1 = create('Reference', {url : 'http://foo.com/' + created, owner: user, categories: [georgism]});
		// }
		
		// liquid.persistent.demoInitialized = true;
		// setTimeout(function() {
			// liquid.pulse(function() {

				// var myPolitics = create('Category', {name: 'MyPoliticalCommitments', description: '', owner: user});
				// politics.subCategories.add(myPolitics);

				// var directDemocracy = create('Category', {name: 'Direct Democracy', description: '', owner: user});
				// politics.subCategories.add(directDemocracy);

				// var liquidDemocracy = create('Category', {name: 'Liquid Democracy', description: '', owner: user});
				// directDemocracy.subCategories.add(liquidDemocracy);

				// var direktdemokraterna = create('Category', {name: 'Direktdemokraterna', description: '', owner: user});
				// liquidDemocracy.subCategories.add(direktdemokraterna);
				// myPolitics.subCategories.add(direktdemokraterna);
			// });
		// }, 10000);

		// liquid.addToLocalRegistry(user); //????
		// Create References

		// log(user, 3);
		log.demo && logUngroup("...finished setup.");
	});
}

// liquid.users = liquid.persistent.users

// log("experiments");
// logGroup();
// let selection = {};
// user.selectAll(selection);
// liquid.logSelection(selection);
// log(user.getRootCategories());
// let testPage = create("LiquidPage", { user: user});
// log(politics);
// log("subCategories:");
// log(politics.subCategories);
// log("politics.subCategories.get()");
// log(politics.subCategories.get(), 1);
// log("georgism.const.incoming.subCategories");
// log(georgism.const.incoming.subCategories, 1);
// log("user.ownedCategories.get()");
// log(user.ownedCategories.get(), 2);

// let selection = {};
// liquid.restrictAccess(testPage, 
	// function() {
		// user.selectAll(selection);	
	// }
// );
// log("selection");
// liquid.logSelection(selection);
// log("================================");
// log(user.getRootCategories(), 2);
// log(user.getRootCategories().length);
// log("================================");
// liquid.trace.basic = true;
// log(georgism.parents);
// liquid.trace.basic = false;
// log("================================");


// log(user.addedReferences.get(), 3);
// log(user.ownedCategories.get(), 3);
// logUngroup();


/* ------------------------------------------
 *    Initialize http server using express
 * ------------------------------------------ */

 let liquidControllers = {
	'' : "LiquidPage",
	'index': 'LiquidPage',
	'demo': function(req) { // Note: req follows express conventions.
		trace.demo && logGroup("create page and session object...");
		var session = liquid.createOrGetSessionObject(req.session.token);
		session.user = user; 
		var page = create('Page', {session: session, viewedUser : user});
		page.service.orderedSubscriptions.push(create({object: user, selector:'Basics'})); //object: user,
		trace.demo && logUngroup("...");
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
  log.demo && log('Liquid is now listening on port 4000!');
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
		return create(className, { session : session });
	});
}

function createExpressControllerFromPageCreatorFunction(pageCreatorFunction) {
	return function(req, res) {
		trace.demo && logGroup("express controller...");
		let page;
		
		// Create the page. This is a separate pulse so the creation will not be sent after the pulse
		liquid.pulse(function() {
			// Setup session object (that we know is the same object identity on each page request)
			page = pageCreatorFunction(req);
		});
		
		liquid.pulse(function() {
			let data = {
				// serialized : liquid.serializeSelection(selection),
				pageUpstreamId : page.const.id,
				subscriptionInfo : liquid.getSubscriptionUpdate(page, [])
			};
			res.render('layout',{
				data: JSON.stringify(data)
			});
		});
		trace.demo && logUngroup("...");
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
	// trace('serialize', 'Connected a socket!');
	
	socket.on('connectPageWithSocket', function(pageToken) {
		trace.socket && logGroup("socket.on: connectPageWithSocket " + pageToken);
		try {
			let page = liquid.getPage(pageToken);
			page.const._socket = socket;
			socket._liquidPage = page; 
			// liquid.pushDataDownstream(); // In case this page had subscription updates that never got pushed. ???
		} catch (error) {
			socket.emit('couldNotConnectPageWithSocket');
		}
		trace.socket && logUngroup();
	});

	socket.on("message", function(pageToken, message) {
		trace.socket && logGroup("socket.on: message");
		trace.socket && log(message, 10);
		liquid.messageFromDownstream(pageToken, message);
		trace.socket && logUngroup();
	});

	socket.on('disconnect', function(message) {
		trace.socket && logGroup("socket.on: disconnect: " + message);
		liquid.disconnect(socket._liquidPage);
		trace.socket && logUngroup();
	});
});

liquid.setPushMessageDownstreamCallback(function(page, message) { //messageType, data
	trace.socket && log("socket.emit: message");
	trace.socket && log(message, 10);
	if (page.const._socket) page.const._socket.emit("message", message);	
});

// .catch(function() {
			// socket.emit('invalidPageToken'); // TODO: Consider create new page?			
		// });

	// socket.on('processPulseFromDownstream', function(pageToken, pulseData) {
		// liquid.processPulseFromDownstream(pageToken, pulseData).catch(function() {
			// socket.emit('invalidPageToken'); // TODO: Consider create new page?			
		// });
	// });

	// socket.on('makeCallOnServer', function(pageToken, callInfo) {
		// liquid.makeCallOnServer(pageToken, callInfo);
	// });

