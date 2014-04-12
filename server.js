var express = require("express");
var async = require("async");
var app = express();
app.set('port', process.env.PORT || 3000);
var io = require("socket.io").listen(app.listen(app.get('port')) ,{log: false});
 
console.log("Listening on port" + app.get('port'));

app.use("/static", express.static(__dirname + "/static"));

var length=6;

games={
	/*
		*room_id* :{
			player1: Null //Type: socket
			player2: Null //Type: socket

		}
	*/
}

function generateRoom() {
    var collection = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	var room="";

	for(var i=0; i<length; i++){
		room += collection.charAt(Math.floor(Math.random() * collection.length));
	}
	return room;
};
function initBoard(){
	var board=[]
	for (var i=0; i < 6; i ++){
		row=[]
		for (var j=0; j < 7; j++){
			row.push(0);
		}
		board.push(row);
	}
	return board
}

function getRow(room, column){
	var row = 5;
	// find empty "box" from bottom up
	while(games[room].board[row][column] != 0 && row > 0){
		row--;
	}
	return row;
}

function verifyWinner(count, room, pairs){
	if(count == 4){
		console.log(pairs);
		games[room].player1.emit('gameover', {winner: true, message: "You won!", score:[1,0], highlight:pairs, timeout:1700 });
		games[room].player2.emit('gameover', {winner: false, message: "You lose!", score:[1,0], highlight:pairs, timeout:1700  });
		return true;
	}
	else if(count == -4){
		console.log(pairs);
		games[room].player1.emit('gameover', {winner: false, message: "You lose!", score:[0,1], highlight:pairs, timeout:1700  });
		games[room].player2.emit('gameover', {winner: true, message: "You won!", score:[0,1], highlight:pairs, timeout:1700  });
		return true;
	}
	return false;
}

function check4(row, column, room){
	var rStart,rEnd,rStart,cEnd;
	/*	========================================================== 
		======================= HORIZONTAL =======================
		==========================================================  */
	for(var i=0; i<4; i++){
		cStart=column-i;
		cEnd=column+3-i;

		//if 4 boxes within column size
		if(cStart >= 0 && cEnd < games[room].board[0].length){
			var count=0;
			pairs=[]
			for(var j=cStart; j<=cEnd; j++){
				count+=games[room].board[row][j];
				pairs.push([row,j]);
			}

			if(verifyWinner(count, room, pairs)){
				return true;
			}
		}
	}
	/*	========================================================== 
		======================= VERTICAL =========================
		==========================================================  */
	for(var i=0; i<4; i++){
		rStart=row-i;
		rEnd=row+3-i;

		//if 4 boxes within column size
		if(rStart >= 0 && rEnd < games[room].board.length){
			var count=0;
			pairs=[]
			for(var j=rStart; j<=rEnd; j++){
				count+=games[room].board[j][column];
				pairs.push([j,column]);
			}

			if(verifyWinner(count, room, pairs)){
				return true;
			}
		}
	}
	/*	========================================================== 
		======================= HORIZONTAL =========================
		==========================================================  */
	
	var steps=[[1,1],[1,-1]]
	for(var step=0; step < steps.length; step++){
		var rStep=steps[step][0];
		var cStep=steps[step][1];
		for(var i=0; i<4; i++){
			rStart=row-i*rStep;
			rEnd=row+(3-i)*rStep;
			cStart=column-i*cStep;
			cEnd=column+(3-i)*cStep;

			//if 4 boxes within column size
			if((rStart >= 0 && rEnd < games[room].board.length)
				&& (cStart >= 0 && cEnd < games[room].board[0].length)){
				var count=0;
				pairs=[]

				for(var j=0; j<4; j++){
					count+=games[room].board[rStart+(j*rStep)][cStart+(j*cStep)];
					pairs.push([rStart+(j*rStep),cStart+(j*cStep)]);
				}

				if(verifyWinner(count, room, pairs)){
					return true;
				}
			}
		}
	}
	return false;
}

function checkDraw(room){
	//console.log(games[room]['board'][0]);
	for(var i = 0; i < games[room]['board'][0].length; i ++){
		//console.log(games[room]['board'][0][i]);
	    if(games[room]['board'][0][i] == 0)
	        return false;
	}
	return true;
}
//URL CONFIG
app.get("/", function(req, res) {
    res.render("index.jade");
});
app.get("/room", function(req, res) {
	var room=generateRoom();
    res.render("main.jade", {shareURL: req.protocol+"://"+req.host+"/"+room, share: room});
});
app.get("/:room([a-zA-Z0-9]{"+length+"})",function(req,res){
	room=req.params.room
    res.render("main.jade", {shareURL: req.protocol+"://"+req.host+"/"+room, share: room});
});
app.get("/error_full",function(req, res){
	res.render("full.jade");
});
app.get("/exit",function(req, res){
	res.render("exit.jade");
});
app.get("/error_opponent",function(req, res){
	res.render("exit_forfit.jade");
});
app.get("/about",function(req, res){
	res.render("about.jade");
});


io.sockets.on("connection",function(socket){
	socket.emit("message",{ me:false, players: false, color: "#bdc3c7", message : "WELCOME! You can chat with your opponent here." });
	socket.on("join",function(data){
		console.log("server room:" + data.room);
		
		// Player 2 or more joins the room
		if(data.room in games){
			// Validate if room is full or not
			if(games[data.room].player2)
			{
				console.log("3RD PLAYER TRIED TO JOIN THE GAME")
				socket.emit("kick");
				return;
			}

			// Initiate player 2
			socket.join(data.room);
			socket.set("room", data.room);
			socket.set("pid", -1);
			socket.set("color", "#e74c3c");
			socket.set("preview",[]);
			// Set opponents
			socket.set("opponent", games[data.room].player1);
			games[data.room].player1.set("opponent", socket);

			// Set turn
			socket.set("turn", false);
			socket.get("opponent",function(err,opponent){
				opponent.set("turn",true);
			});

			// Save player 2 socket into "games" object
			games[data.room].player2 = socket;

			io.sockets.in(data.room).emit("online");

			console.log("PLAYER 2 HAS JOINED THE GAME");
			socket.emit("message",{ me: false, players: false, color: "#bdc3c7", message : "Player 1 has joined the game." });
			io.sockets.in(data.room).emit("message",{ me: false, players: false, color: "#bdc3c7", message : "Player 2 has joined the game." });

			games[data.room].player1.emit("message",{ me:false, players: false, color: "#bdc3c7", message : "It's your turn!" });
			socket.emit("message",{ me:false, players: false, color: "#bdc3c7", message : "Waiting for your opponent to make a move..." });
		    		
			//Notify players
			games[data.room].player1.emit("notify",{connected:1, turn : true});
			socket.emit("notify",{connected:1, turn : false});
		}

		// Initiate player 1 and game table
		else{
			//Initiate player 1
			socket.join(data.room);
			socket.set("room", data.room);
			socket.set("pid", 1);
			socket.set("color", "#f1c40f");
			socket.set("turn", false);
			socket.set("preview", []);
			//Initiate game table as an array
			board=initBoard();

			/*board=[ [ 0, 2, 2, 2, 2, 2, 2 ],
			  		[ 2, 2, 2, 2, 2, 2, 2 ],
			  		[ 2, 2, 2, 2, 2, 2, 2 ],
			  		[ 2, 2, 2, 2, 2, 2, 2 ],
			  		[ 2, 2, 2, 2, 2, 2, 2 ],
			  		[ 2, 2, 2, 2, 2, 2, 2 ] ];*/
			/*board=[ [ 0, 1, 1, 1, 0, 0, 0 ],
				  	[ 1, 1, 0, 0, 0, 0, 0 ],
				  	[ 1, 0, 0, 0, 0, 0, 0 ],
				  	[ 1, 0, 0, 0, 0, 0, 0 ],
				  	[ -1, 0, 0, 0, 0, 0, 0 ],
				  	[ -1, 0, 0, 0, 0, 0, 0 ] ];*/

			console.log(board);
			// initiate "games" object
			games[data.room]={
				player1: socket,
				player2: null,
				board: board,
				ended: false
			}
			
			console.log("PLAYER 1 HAS JOINED THE GAME");
			socket.emit("message",{ me:false, players: false, color: "#bdc3c7", message : "Player 1 has joined the game." });
		}
	});
	// check where the player put the "box"
	socket.on("click",function(data){
		async.parallel([
			socket.get.bind(this, "turn"),
			socket.get.bind(this, "opponent"),
			socket.get.bind(this, "room"),
			socket.get.bind(this, "pid"),
			socket.get.bind(this, "color")
	    ], function(err, results) {

	    	// check if both players are in the game/room
	    	if(games[results[2]].player2){	

	    		// check if it is the player's turn and game hasn't ended
		    	if(results[0] && !games[results[2]].ended){
					
					results[1].emit("message",{ me:false, players: false, color: "#bdc3c7", message : "It's your turn!" });
		    		socket.emit("message",{ me:false, players: false, color: "#bdc3c7", message : "Waiting for your opponent to make a move..." });
		    		// check if column is full
		    		if(games[results[2]].board[0][data.column] == 0){
			    		socket.set("turn", false);
			    		results[1].set("turn", true);

			    		var row = getRow(results[2], data.column);

			    		// occupy empty space as pid
			    		games[results[2]].board[row][data.column] = results[3];
			    		
			    		// drop and display block on frontend
			    		io.sockets.in(results[2]).emit("drop",{ row:row, column:data.column, color:results[4] });
			    		//socket.emit("drop",{ row:row, column:data.column, color:results[4] });
			    		//results[1].emit("drop",{ row:row, column:data.column, color:results[4] });
			    		
			    		//console.log("testing " + games[results[2]].board[row][data.column]);

			    		// check if 4 has been connected
			    		if(check4(row, data.column, results[2])){
			    			games[results[2]].ended=true;
			    			return;
			    		}
			    		else if(checkDraw(results[2])){
			    			console.log("draw");
							io.sockets.in(results[2]).emit('gameover', {winner: false, message: "Game was tied", score:[0,0], highlight:[],timeout:300 });
			    		}
			    	}
			    	else{
		    			console.log(results[3] + " column is full");
			    		socket.emit("errorMessage", { message : "The column is full! Try somewhere else." })
			    	}
			    }
		    	else{
		    		console.log(results[3] + " opponent's turn");
		    		socket.emit("errorMessage", { message : "Don't be hasty! it's your opponent's turn." });
		    	}
		    }
		    else{
		    	console.log("player 2 hasn't joined yet");
		    	socket.emit("errorMessage", { message : "Stop! Your opponent hasn't joined yet." });
		    }
	    });
	});

	socket.on("hover",function(data){
		async.parallel([
			socket.get.bind(this, "room"),
			socket.get.bind(this, "color"),
			socket.get.bind(this, "opponent"),
			socket.get.bind(this, "preview")
	    ], function(err, results) {

			if(results[0] in games){
			
				// on mouseenter
			    if(data.hover == 1){
			    	var row=getRow(results[0], data.column);
			    	socket.set("preview", [row, data.column]);
			    	io.sockets.in(results[0]).emit("preview",{ hover:1, row:row, column:data.column, color:results[1] });
			    }

			    // on mouseleave
			    else{
			    	io.sockets.in(results[0]).emit("preview",{ hover:0, row:results[3][0], column:results[3][1], color:results[1] });
			    	if(games[results[0]].player2){
				    	results[2].get("preview", function(err, preview) {
				    	
			    			//if row and column are the same
			    			//if both players hovering over the same block
			    			if(results[3][0] == preview[0]
			    				&& results[3][1] == preview[1]){
			    				results[2].get("color", function(err, color) {
			    				//re-color whoever is still hovering over the same block again
			    					io.sockets.in(results[0]).emit("preview",{ hover:1, row:preview[0], column:preview[1], color:color });
			    				});
			    				socket.set("preview", []);
			    			}
				    	});
					}
			    
			    	
			    }
			}
	    });
	});

	socket.on("reset",function(){
		async.parallel([
			socket.get.bind(this, "turn"),
			socket.get.bind(this, "room")
	    ], function(err, results) {
	    	if(results[1] in games){
		    	games[results[1]].ended=false;
				board=initBoard();
		    	games[results[1]].board=board;
		    	socket.emit("notify",{connected:1, turn : results[0]});
		    }
	    });
	});

	socket.on("disconnect",function(){
		socket.get("room",function(err,room){
	    	if(room in games){
				console.log("Disconnecting...");
				io.sockets.in(room).emit('leave');
				if(room in games){
					delete games.room;
				}
			}
		});
	});


	socket.on("send",function(data){
		async.parallel([
			socket.get.bind(this, "room"),
			socket.get.bind(this, "color"),
			socket.get.bind(this, "opponent")
	    ], function(err, results) {
			if(results[0] in games){
				if(results[2]){
					results[2].emit("message",{ me:false, players: true, color: results[1], message : data.message });
				}
				socket.emit("message",{ me:true, players: true, color: results[1], message : data.message });
			}
		});
	});

});



	



