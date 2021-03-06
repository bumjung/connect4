$(document).ready(function(){

	var tour = new Tour({
  	backdrop: true,
  	storage: false,
  	steps: [/*path:"/room-tour"*/
	  {
	    element: "#shareURL",
	    title: "This is your game identifier.",
	    content: "In order to start the game, you need to send this URL to your friend."
	  },
	  {
	    element: "#copy-clipboard",
	    title: "One click copy!",
	    content: "You can copy the URL in just one click! Click on this button to copy your URL (after the tour)."
	  },
	  {
	    element: "#chat",
	    title: "Chat with your friends.",
	    content: "Talk with your friend using the messaging box! You can send the message by clicking 'Enter'",
	    placement:"left"
	  },
	  {
	    element: "#board",
	    title: "Game on!",
	    content: "The objective of this game is to connect four of your coins either vertically, horizontally, or diagonally. Have fun! :)"
	  }
	]});
	tour.init();
	$("#tour").click(function(){
		tour.start();
	});
	if(window.location.pathname == "/room-tour"){
		tour.start();
	}

    var content="";
    for(var i = 0; i < 6; i++){
        content+="<tr>";
        for(var j = 0; j < 7; j++) {
          content+="<td class='box' data-row="+i+" data-column="+j+"><i class='fa fa-circle'>";
        }
    }
	$("#board table").append(content);

		var clip = new ZeroClipboard( 
			document.getElementById('copy-clipboard'), {
			moviePath: "static/flash/ZeroClipboard.swf"
		});


		clip.on( 'complete', function(client, args){
			alertify.log("Your room URL has been copied. Send it to your friend!");
		});
	$("#help-icon").tooltip({
	'selector': '',
	'placement': 'top',
	'container':'body'
	});
	$("#send_message").tooltip({
	'selector': '',
	'placement': 'left',
	'container':'body'
	});
	
	var socket = io.connect(window.location.hostname);


	/*
	//////////////////////////////////////////////////////////////////
	// ==========================  GAME ========================== //
	////////////////////////////////////////////////////////////////
	*/

	var room = $("input").data("room");

	socket.on("connect",function(){
		if(room){
			socket.emit("join",{room:room});
		}
	});

	socket.on("kick",function(data){
		window.location = "/error_full";
	});

	socket.on("online",function(){
		$('.p2-status i').css("color","#2ecc71");
		$('.p2-status span').html(" Connected");
	});

	socket.on("notify",function(data){
		if(data.connected == 1){
			if(data.turn){
				alertify.success("Both players connected. Your turn!");
			}
			else{
				alertify.success("Both players connected. Opponent's turn!");
			}
		}
		else{
			alertify.log("Waiting on your opponent's response.");
		}
	});


	$(".box").click(function(){
		socket.emit("click", { row : $(this).data("row"), column : $(this).data("column") });
	});
	var count=0;

	$(".box").mouseenter(function(){
		socket.emit("hover", {hover:1, row : $(this).data("row"), column : $(this).data("column") })
	});
	$(".box").mouseleave(function(){
		socket.emit("hover", {hover:0, row : $(this).data("row"), column : $(this).data("column") })
	});

	// drop the coins when the column is clicked
	socket.on("drop",function(data){
		var row = 0;
		var stopinterval=setInterval(function(){
			if(row == data.row){
				clearInterval(stopinterval);
			}
			//color in one at a time
			$(".box[data-row='"+(row-1)+"'][data-column='"+data.column+"'] i").css("color",'');
			$(".box[data-row='"+row+"'][data-column='"+data.column+"'] i").css("color",data.color);
			$(".box[data-row='"+row+"'][data-column='"+data.column+"'] i").css("opacity",1);
			row++;

		},25);
	});

	// to view where the user will place his/her coin next
	socket.on("preview",function(data){
		var box_object = $(".box[data-row='"+data.row+"'][data-column='"+data.column+"'] i");
		
		// if not (current preview position got occupied by a new coin)
		// or current preview position is unoccupied (grey)
		if(box_object.css("opacity") != 1
			|| box_object.css("color") == "rgb(217, 220, 222)"){

			// on hover
			if(data.hover == 1){
				box_object.css("color",data.color);
				box_object.css("opacity",0.3);
			}
			// on exithover
			else{
				box_object.css("color","");
				box_object.css("opacity",1);
			}
		}
	});

	// emitted from backend, when game ends
	socket.on("gameover",function(data){

		// reset everything for a new game
		socket.emit("reset_ready");
		var count=0;

		// allow some delay time for the coin to drop first
		setTimeout(function(){

			// color in the 4 connected in green
			var stopinterval=setInterval(function(){
				if(count == 4){
					clearInterval(stopinterval);
				}
				//alert(data.highlight[count]);
				pair=data.highlight[count];
				$(".box[data-row='"+pair[0]+"'][data-column='"+pair[1]+"'] i").css("color","#2ecc71");
				count++;
			},200);
	 	},150);

	 	// increment the players' score
		p1=parseInt($(".p1-score span").html())+data.score[0];
		p2=parseInt($(".p2-score span").html())+data.score[1];
		$(".p1-score span").html(p1);
		$(".p2-score span").html(p2);

		// allow some delay time
		setTimeout(function(){

			// ask users if they want to play again or leave
			alertify.set({ labels: {
			    ok     : "Play again!",
			    cancel : "Leave Room"
			} });
			alertify.confirm(data.message, function(e){
				// if 'Play again!' was clicked
				if(e) {
					$("td i").css("color","");
		            socket.emit("reset");
		        }
		        // if 'Leave Room' was clicked
		        else {
		        	// disconnect user
		       		socket.emit("disconnect");

		       		//relocate user
		            window.location = '/exit';
		        }
			}, 'confirm');
		},data.timeout);
	});

	// adds border if it's the player's turn
	socket.on("turn",function(data){
		console.log(data.pid);
		if(data.pid == 1){
			console.log("player1");
			$(".p1-score").css("border","2px solid #1abc9c");
			$(".p2-score").css("border","none");
		}
		else{
			console.log("player2");
			$(".p1-score").css("border","none");
			$(".p2-score").css("border","2px solid #1abc9c");
		}
	});
	socket.on("leave",function(){
		window.location = '/error_opponent';
	});

	socket.on("errorMessage",function(data){
		alertify.error(data.message);
	});

	/*
	//////////////////////////////////////////////////////////////////
	// ========================  MESSAGES ======================== //
	////////////////////////////////////////////////////////////////
	*/

	// send the message to the backend, and clear the textbox input field
	function sendMessage(){
			// send message data to backend
			socket.emit("send", { message : $('.field').val() });
			// clear the textbox input
			$('.field').val("");
	}

	$('.send').click(function(){
		sendMessage();
	});
	$(".field").keypress(function(e) {
		// if 'enter' key was pressed
        if(e.which == 13) {
            sendMessage();
        }
    });
    /*$(document).bind('keydown',function(e){
    	$('.field').focus();
    	$(document).unbind('keydown');
	});*/

	var messages = [
			/*{
				players:false,
				color: HEX,
				message: TEXT
			}*/
	];

	// get data from backend and display it
	socket.on('message',function(data){
		// if message isn't empty
		if(data.message){
			// push on the message to global messages (contains all previous messages)
			messages.push(
				{
					me:data.me,
					players:data.players,
					color: data.color,
					message: data.message
				});

			var content="";

			// loop through every message
			for(var i = 0; i < messages.length; i ++){

				// player or console specified
				if(messages[i].players){
					var display="";
					
					// display name specified
					if(messages[i].me){
						display="Me";
					}
					else{
						display="Opponent";
					}
					content+= "<span style='letter-spacing: 0.7px;'><span style='color:"+messages[i].color+"'>"+display+"</span> : "+messages[i].message+"</span><br/>";
					
				}
				// if console message
				else{

					content+= "<span style='letter-spacing: 0.7px; color:"+messages[i].color+"'>"+messages[i].message+"</span><br/>";
				}
			}
			$('#content').html(content);
			// scroll down as messages come in
			$("#content").scrollTop($("#content")[0].scrollHeight);
			// focus on the textbox input
			$('.field').focus();
		}
	});
});












