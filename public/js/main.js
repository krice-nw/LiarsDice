
var socket = io("http://localhost:3000");

var player = {name: "", dice: [], valid: false};
var players = [];

socket.on("disconnect", function() {
	setTitle("Disconnected");
});

socket.on("connect", function() {
	setTitle("Connected to Liars Dice");
});

socket.on("message", function(message) {
	printMessage(message);
});

// game stuff

socket.on("player", function(name) {
    if (player.name === name) {
        player.valid = true;
    }
})

// handle the rolling message to have the client roll their dice
socket.on("rolling", function(message) {
    // call rollDice to generate the new dice values 
     rollDice(player)
})


// at the beginning of a round all players will roll their dice
socket.on("roll", function(player) {
    players.push(player);
})

// on round start
socket.on("round", function(status) {
    if (status === "start") {
        // enable the guess action ... if your turn
        printMessage("round -> start");
    }
})

// when another makes a dice amount claim
socket.on("claim", function(call) {
    printMessage("claim: %j", call);
})


document.forms[0].onsubmit = function () {
    player.name = document.getElementById("name").value;
    player.dice = [0,0,0,0,0];
//    printMessage(player.name);
    socket.emit("player", player);
//    input.value = '';
};

document.forms[1].onsubmit = function () {
    var claim = document.getElementById("claim").value;
//    printMessage(player.name);
    socket.emit("guess", claim);
//    socket.emit("guess", JSON.stringify(claim));
//    input.value = '';
};

document.forms[2].onsubmit = function () {
    var input = document.getElementById("message");
    printMessage(input.value);
    socket.emit("chat", input.value);
    input.value = '';
};

function setTitle(title) {
    document.querySelector("h1").innerHTML = title;
}

function printMessage(message) {
    var p = document.createElement("p");
    p.innerText = message;
    document.querySelector("div.messages").appendChild(p);
}


// game functions
function rollDice() {
    for (i = 0; i < player.dice.length; i++) {
        player.dice[i] = Math.floor((Math.random() * 6) + 1);
    };
    // send the roll message wiht the player updated dice so the update can be broadcast to all other players
    socket.emit("roll", player);

    // show the roll - need some dice rendering ....
}

function startGame() {
    socket.emit("start", player);
}

// share the dice call with the server to broadcast
function makeClaim(claim) {
    socket.emit("guess", claim)
}

// challeange the previous caller's claim
function liftCup() {
    socket.emit("lift", player);
}