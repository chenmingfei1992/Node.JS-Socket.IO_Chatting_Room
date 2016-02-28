// Require the packages we will use:
var http = require("http"),
socketio = require("socket.io"),
fs = require("fs");

// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client-test.html:
var app = http.createServer(function(req, resp){
// This callback runs when a new connection is made to our HTTP server.
fs.readFile("Muti_room_client.html", function(err, data){
// This callback runs when the chat.html file has been read from the filesystem.
if(err) return resp.writeHead(500);
resp.writeHead(200);
resp.end(data);
});
});
app.listen(3456);


var nameList = {}; // stores the names currently online
var allRoomList = {}; // stores all the rooms, including both private and public 
var publicRoomList = {}; // store all public rooms indexed by username
var privateRoomList = {}; // store all private rooms indexed by room name
var creators = {}; // stores all the creators indexed by room name
var passList = {}; // stores all the passList indexed by room name
var blacklist = {}; // stores all the nameList who are kicked out permanently
var privateInfomation = {}; // store private information
var onlineClients={};  // store online clients
var whereAreThey = {};  // dynamiclly record which room are the online users in
var io = socketio.listen(app);
io.sockets.on("connection", function(socket){
// This callback runs when a new Socket.IO connection is established.

   //clients.push(socket.id); // add the client data to the hash

socket.on('newUser',function(newUserName){

	onlineClients[newUserName] = socket.id;
	socket.clientName = newUserName;
	nameList[newUserName] = newUserName; //register the new user's name
    //io.sockets.connected[newUserName] = socket.id;
	socket.clientRoom = 'square';  // record new user's room, allocate to square initially
	whereAreThey[newUserName] = socket.clientRoom;  // update the position
	socket.join('square');  // initially in seuare
	console.log("New friend comes in"+socket.clientName); 

	io.sockets.emit("usersOnline",nameList);  // show all uses to client
	io.sockets.emit("showAllPublicRooms",publicRoomList); // show all public rooms available
	io.sockets.emit("showAllPrivateRooms",privateRoomList); // show all private rooms available
	socket.emit("thisRoom",'square');  // current room is square
	socket.emit("message_to_client",{message: "Hello, welcome to happy chatting room! " + " " + socket.clientName });
    privateInfomation[socket.clientName] = ''; 
});

//make public room
socket.on('createPublic', function(newPublicRoom) {
	if(publicRoomList[newPublicRoom] === newPublicRoom)  // do not create duplicate rooms
	{
		socket.emit("message_to_client",{message: newPublicRoom + " " + "already exists"});
	}
	else
	{
	socket.leave(socket.clientRoom);  // leave from old room
	io.sockets.emit('in_out_info', {message: socket.clientName +" has left"+ " " +socket.clientRoom});  // show in-out info
	socket.join(newPublicRoom);  // get in new room
	socket.clientRoom = newPublicRoom;  // enter new room
	whereAreThey[socket.clientName] = socket.clientRoom  //update the position
	publicRoomList[newPublicRoom] = newPublicRoom; // store new room to list
	creators[socket.clientRoom] = socket.clientName; // store creators
	io.sockets.emit("showAllPublicRooms",publicRoomList);  // show all public rooms available
	io.sockets.emit("showAllPrivateRooms",privateRoomList);  // show all private rooms available
	socket.emit("thisRoom",newPublicRoom);  // update current rooom
	io.sockets.emit('in_out_info', {message: socket.clientName +" has just created"+ " " +newPublicRoom});

	}
});

//join public room
socket.on('joinPublic', function(newPublicRoom) {
	if (socket.clientName === blacklist[newPublicRoom])  // if in blacklist, cannot get in
	{
		var id = onlineClients[socket.clientName];
        io.sockets.socket(id).emit("message_to_client",{message: "you are in blacklist of "+newPublicRoom+" ,so you cannot get in!"});	
	}
	else   // you can acces
	{
		socket.leave(socket.clientRoom);  // leave from old room
		io.sockets.emit('in_out_info', {message: socket.clientName +" has left"+ " " +socket.clientRoom});
		socket.join(newPublicRoom);
		socket.clientRoom = newPublicRoom;  // enter room
		whereAreThey[socket.clientName] = socket.clientRoom;   // update the position
		io.sockets.emit("showAllPublicRooms",publicRoomList);  // show all public rooms available
	    io.sockets.emit("showAllPrivateRooms",privateRoomList);  // show all private rooms available
		socket.emit("thisRoom",newPublicRoom);   // update current rooom
		io.sockets.emit('in_out_info', {message: socket.clientName +" comes in"+ " " +newPublicRoom});
	}
});

//create private room
socket.on('createPrivate', function(newPrivateRoom, password) {
	if(privateRoomList[newPrivateRoom] === newPrivateRoom){  // do not create duplicate rooms
		socket.emit("message_to_client",{message: newPrivateRoom + " " + "already exists"});
	}
	else 
	{
	socket.leave(socket.clientRoom);  // leave from old room
	io.sockets.emit('in_out_info', {message: socket.clientName +" has left"+ " " +socket.clientRoom});
	socket.password = password;  
	socket.join(newPrivateRoom);
	socket.clientRoom = newPrivateRoom;  // enter room
	privateRoomList[newPrivateRoom] = newPrivateRoom;  // store new room to list
	creators[socket.clientRoom] = socket.clientName;    // store creators
	privateInfomation[socket.clientName] += " " + "room:" +" " +socket.clientRoom + " " +"password:" + " " +password;
	passList[socket.clientRoom]=password;  // store password
	io.sockets.emit("showAllPublicRooms",publicRoomList);  // show all public rooms available
	io.sockets.emit("showAllPrivateRooms",privateRoomList); // show all private rooms available
	socket.emit("thisRoom",newPrivateRoom); 
	io.sockets.emit('in_out_info', {message: socket.clientName +" has just created"+ " " +newPrivateRoom});
		if (socket.clientName === creators[socket.clientRoom]){
			socket.emit("get_room", privateInfomation[socket.clientName]);  // give password to the creators

		}
	}
});


//join private room
socket.on('joinPrivate', function(newPrivateRoom, roomPass) {
	if (socket.clientName === blacklist[newPrivateRoom])   // if in blacklist, cannot get in
	{
		var id = onlineClients[socket.clientName];   
        io.sockets.socket(id).emit("message_to_client",{message: "you are in blacklist of "+newPrivateRoom+" so you cannot get in"});
		
	}else{
	
			if(passList[newPrivateRoom]==roomPass)	 // have correct passed the checking
		
			{
				socket.leave(socket.clientRoom);   // leave old room
				io.sockets.emit('in_out_info', {message: socket.clientName +" has left"+ " " +socket.clientRoom});
				socket.join(newPrivateRoom);  // join new room
				socket.clientRoom = newPrivateRoom;
				whereAreThey[socket.clientName] = socket.clientRoom  //update the position
				io.sockets.emit("showAllPublicRooms",publicRoomList);  // show all public rooms available
	            io.sockets.emit("showAllPrivateRooms",privateRoomList);  // show all private rooms available
				socket.emit("thisRoom",newPrivateRoom);
				io.sockets.emit('in_out_info', {message: socket.clientName +" comes in"+ " " +newPrivateRoom});
			}else{
				 socket.emit("message_to_client",{message: "Please enter correct password for " + " " + "<"+newPrivateRoom+">" });
			}

		//}
	}
});

//private message
socket.on('whisperTo', function(userw, messw){
	if(whereAreThey[socket.clientName] ===whereAreThey[userw])  //can only whisper to people in same room
	{
		socket.emit("message_to_client",{message: "whisper sent to" + " " + userw + " " + ":" + " " +"<"+messw+">"});
		var id = onlineClients[userw];  // send to specific client
        io.sockets.socket(id).emit("message_to_client",{message: socket.clientName + " " + "whispers: " + " " + messw}) ;
		
	}else{
        socket.emit("message_to_client",{message: userw + " " + "is not in your room"}); // not in same room cannot whisper
    }
});

//invite a new friend to private room
socket.on('inviteFriend', function(inviteWho, inviteToWhere){
	if(whereAreThey[inviteWho] ===inviteToWhere)  //he is already in this room, no need to invite
	{  
		socket.emit("message_to_client",{message:  inviteWho + " is already inside the room" + ": " + " " +inviteToWhere});
    }
    else if(onlineClients[inviteWho]==null)
    {
        socket.emit("message_to_client",{message: inviteWho + " " + "is not online!"}); // the friend is off line, cannot access
    }
    else	
    {   
    	var password = passList[inviteToWhere];
		socket.emit("message_to_client",{message: "invitation has been sent" });
		var id = onlineClients[inviteWho];  // send to specific client
        io.sockets.socket(id).emit("message_to_client",{message: socket.clientName + " " + "invites you to get in a private place: " + " " + inviteToWhere+" and the password is: "+password}) ;
		
	}
});

//temp kick
socket.on('kickOnce',function(kickWhoTemporaily){

    if (socket.clientName !== creators[socket.clientRoom]) // only room owners can kick out people
    {
        socket.emit("message_to_client",{message: "You are not the owner, only owner can kick people out!"});
    }
    else if (whereAreThey[kickWhoTemporaily] !== socket.clientRoom)   // kick object is not in the room, cannot kick
    {
    socket.emit("message_to_client",{message: kickWhoTemporaily + " " + "is not in this room"});
    }
    else
    {
	io.sockets.emit('kickOnceCheck',kickWhoTemporaily);  // dispatch the kick task to server-kickObject line

	io.sockets.emit('in_out_info', {message: kickWhoTemporaily +" has been kicked from"+ " " +socket.clientRoom});
	var id = onlineClients[kickWhoTemporaily];
	// send to specific kick object
    io.sockets.socket(id).emit("message_to_client",{message: "you have been kicked and are now in the lobby"})  ;
    io.sockets.socket(id).emit("thisRoom",'square');
}
});

socket.on('kickOnceCheckReturn', function() {
   
    socket.leave(socket.clientRoom); // force leave the room
    socket.clientRoom = 'square';  // back to square
    whereAreThey[socket.clientName] = socket.clientRoom;
    socket.join('square');
});

//kick perm
socket.on('kickForever',function(kickWhoPermenently){
	if (socket.clientName !== creators[socket.clientRoom])  // only room owners can kick out people
	{
		socket.emit("message_to_client",{message: "You are not the owner, only owner can kick people out!"});
	}
	else if (whereAreThey[kickWhoPermenently] !== socket.clientRoom) {
	//user not in the room
 		socket.emit("message_to_client",{message: kickWhoPermenently + " " + "is not in this room"});
	}
	else
	{ 
		io.sockets.emit('kickForeverCheck',kickWhoPermenently);  // dispatch the kick task to server-kickObject line
		io.sockets.emit('in_out_info', {message: kickWhoPermenently +" you are kicked out permanently from "+ " " +socket.clientRoom});
        // send to specific kick object
		var id = onlineClients[kickWhoPermenently];
        io.sockets.socket(id).emit("message_to_client",{message: "you are kicked out and are now in the square"})  ;
     
        io.sockets.socket(id).emit("thisRoom",'square');
}
});

//real kick out to square and put it in a blacklist.
socket.on('kickForeverCheckReturn', function() {
	blacklist[socket.clientRoom] = socket.clientName;   // add the object to black list
	console.log("user "+socket.clientName+" has been kicked out perminantly from " + socket.clientRoom);
	socket.leave(socket.clientRoom);  // force leave the room
	socket.clientRoom = 'square';  // back to square
	whereAreThey[socket.clientName] = socket.clientRoom;
	socket.join('square');
});



socket.on('message_to_server', function(data) {
        // This callback runs when the server receives a new message from the client.
        console.log(socket.clientName +" " + ":" + " " +data["message"]); // log it to the Node.JS output
        io.sockets.to(socket.clientRoom).emit("message_to_client",{message: "<"+socket.clientRoom+">" + " " + socket.clientName + ":" + " " + " "+ data["message"] }) // broadcast the message to other users
    });

socket.on('disconnect', function(){
	delete nameList[socket.clientName];  // delete the name from name list
	io.sockets.emit("usersOnline",nameList);  // update name list
    });
});




