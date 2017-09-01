

//Socket_io is your front-end library you included before
var socket = io('http://localhost:8080');
liquid.upstreamSocket = socket;

socket.on('connect', function(){
	trace('serialize', "received CONNECT");
	trace('serialize', liquid.instancePage, " Page id:", liquid.instancePage.getHardToGuessPageId());
	socket.emit("registerPageId", liquid.instancePage.getHardToGuessPageId());
});


socket.on('disconnect', function(){
	trace('serialize', "Disconnected");
});


socket.on('pushChangesFromUpstream', function(changes){
	liquid.receiveChangesFromUpstream(changes);
});

liquid.setPushMessageUpstreamCallback(function(messageType, pageToken, data) {
	socket.emit(messageType, pageToken, data);	
});
