$(document).ready(function() {
    var content="";
    for(var i = 0; i < 6; i++){
        content+="<tr>";
        for(var j = 0; j < 7; j++) {
          content+="<td class='box' data-row="+i+" data-column="+j+"><i class='fa fa-circle'>";
        }
    }
    $("#board table").append(content);
    $(document).ready(function () {
	  $("#help").tooltip({
	    'selector': '',
	    'placement': 'top',
	    'container':'body'
	  });
	});
});

var socket = io.connect(window.location.hostname);


var room = $("input").data("room");

socket.on("connect",function(){
	if(room){
		socket.emit("join",{room:room});
	}
});

socket.on("kick",function(data){
	window.location = "/error_full";
});

socket.on("notify",function(data){
	if(data.connected == 1){
		if(data.turn){
			alertify.success("Both players connected. Your turn!");
		}
		else{
			alertify.success("Both players connected. Opponent's turn");
		}
	}
});


$(document).ready(function() {
	$(".box").click(function(){
		console.log($(this).data("row"));
		console.log($(this).data("column"));
		socket.emit("click", { row : $(this).data("row"), column : $(this).data("column") });
	});
	var count=0;

	$(".box").mouseenter(function(){
		socket.emit("hover", {hover:1, row : $(this).data("row"), column : $(this).data("column") })
	});
	$(".box").mouseleave(function(){
		socket.emit("hover", {hover:0, row : $(this).data("row"), column : $(this).data("column") })
	});

});

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

socket.on("preview",function(data){
	if($(".box[data-row='"+data.row+"'][data-column='"+data.column+"'] i").css("opacity") != 1
		|| $(".box[data-row='"+data.row+"'][data-column='"+data.column+"'] i").css("color") == "rgb(217, 220, 222)"){
		if(data.hover == 1){
			$(".box[data-row='"+data.row+"'][data-column='"+data.column+"'] i").css("color",data.color);
			$(".box[data-row='"+data.row+"'][data-column='"+data.column+"'] i").css("opacity",0.3);
		}
		else{
			$(".box[data-row='"+data.row+"'][data-column='"+data.column+"'] i").css("color","");
			$(".box[data-row='"+data.row+"'][data-column='"+data.column+"'] i").css("opacity",1);
		}
	}
});

socket.on("gameover",function(data){
	var count=0;
	setTimeout(function(){
		var stopinterval=setInterval(function(){
			console.log(data.highlight.length-1);
			console.log("highlights: " + data.highlight);
			if(count == 4){
				clearInterval(stopinterval);
			}
			//alert(data.highlight[count]);
			pair=data.highlight[count];
			console.log("pair: " + pair);
			$(".box[data-row='"+pair[0]+"'][data-column='"+pair[1]+"'] i").css("color","#2ecc71");
			count++;
		},200);
 	},150);
	p1=parseInt($(".p1-score span").html())+data.score[0];
	p2=parseInt($(".p2-score span").html())+data.score[1];
	$(".p1-score span").html(p1);
	$(".p2-score span").html(p2);

	setTimeout(function(){
		alertify.set({ labels: {
		    ok     : "Play again!",
		    cancel : "Leave Room"
		} });
		alertify.confirm(data.message, function(e){
			if(e) {
				$("td i").css("color","");
	            socket.emit("reset");
	        }
	        else {
	       		socket.emit("disconnect");
	            window.location = '/exit';
	        }
		}, 'confirm');
	},data.timeout);
});

socket.on("leave",function(){
	window.location = '/error_opponent';
});

socket.on("errorMessage",function(data){
	alertify.error(data.message);
});


