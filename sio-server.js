var express = require("express");
var http = require("http");
var app = express();
var server = http.createServer(app).listen(3000);
var io = require("socket.io")(server);

var gameInProgress = false;
var roundInProgress = false;
var playersRolling = false;
// var playOrderSet = false;   // only need to set the order during the first rond of a game
var players = [];
var lastGuess = {playerIndex: -1, count: 0, die:0};

//var playerCount = 0;
//var totalDice = 0;

function getCurrentPlayer() {
    var index = lastGuess.playerIndex + 1;
    if (index >= players.length) {
        index = 0;
    };
    return players[index].player;
};

app.use(express.static("./public"));

io.on("connection", function(socket) {

    socket.on("chat", function(message) {
        console.log(`chat: ${message}`);
        // socket.broadcast.emit broadcasts to all other sockets
    	socket.broadcast.emit("message", message);
    });

    socket.on("player", function(player) {
        console.log(`player: ${player.name}`);
        console.log("player: %j", player);
        // add the player to the game - how to manage if each socket is a player?
        // should validate the player doesn't already exist
        if (! gameInProgress) {
            // Only add a player when a game is not in progress
            var uniquePlayer = true;
            players.forEach(function(player) {
                // make sure we are not addign the same player
                if (player.ws === socket) {
                    uniquePlayer = false;
                    console.log("duplicate players not allowed");
                    socket.emit("message", "Player already added");
                    return; // I guess return exits the forEach but doest exit the socket.on
                }
            });
            if (uniquePlayer) {
                players.push({ws: socket, player});
                console.log("Players count: %j", players.length);
                socket.emit("player", player.name);
                socket.broadcast.emit("player", player.name);
            }
        } else {
                console.log("game in session - new players not allowed");
                socket.emit("message", "Game already in session");
        }
    });

    socket.on("start", function(player) {
        if (gameInProgress) {
            socket.emit("message", player.name + " you can't start a game already in progress.");
        } else if (players.length > 1) {
            gameInProgress = true;
        //    roundInProgress = true; // set this after everyone has rolled ...?
            playersRolling = true;  
        //    playOrderSet = false;      
            // tell the players to roll
            socket.broadcast.emit("rolling", "start round");
            socket.emit("rolling", "start round");
        } else {
            socket.emit("message", player.name + " you need to find at least one other player.");
        }
    });

    socket.on("roll", function(player) {
        console.log("roll: %j", player);
        if (playersRolling) {
            // message will have the player and array of rolled dice 
             players.forEach(function(thisPlayer) {
                // make sure we are not addign the same player
                if (thisPlayer.ws === socket) {
                    // update the dice values
                    thisPlayer.player.dice = player.dice;
                    console.log("Update dice: %J", thisPlayer.player.dice)
                }
            });
           // broadcast the roll to each client - the client will not display the otehr rolls
            socket.broadcast.emit("roll", player);
            // now see if all players have rolled to update playersRolling
            var finishedRolling = true;
            players.forEach(function(player) {
                console.log("player: %j", player.player.dice);
                player.player.dice.forEach(function(die) {
                    if (die === 0) {
                        console.log("still rolling...");
                        finishedRolling = false;
                    }
                })
            });
            // set a var when all players have rolled which allows for guesses
            if (finishedRolling) {
                console.log("finished rolling...");
                playersRolling = false;
                // maybe emit a start round message ....
                roundInProgress = true;
                socket.broadcast.emit("round", "start");
                socket.emit("round", "start");
                // message the starting player ... 
                var name = getCurrentPlayer().name;
                console.log("%j will begin", name);
                socket.broadcast.emit("message", "start");
                socket.emit("message", "start");
                socket.broadcast.emit("message", name + " will begin.");
                socket.emit("message", name + " please begin.");
            }
        } else {
            socket.emit("message", player.name + " you can't roll at this time.");
            console.log("Roll ignored - you can't roll at this time.");
        }
    });

//  var lastGuess = {playerIndex: -1, count: 0, die:0};
    socket.on("guess", function(message) {
        console.log("guess: %j", message);
        // validate the mesaage is a valid number and dice face (count:die) i.e. 11:5
        var count = 0;
        var die = 0;
        var msgSplit = message.split(':', 2);
        if (msgSplit.length == 2) {
            count = msgSplit[0];
            die = msgSplit[1];
        }
        console.log("count: %j die: %j", count, die);

        // ensure the claim came from the correct player
        var index = lastGuess.playerIndex + 1;
        if (index >= players.length) {
            index = 0;
        }
        console.log("Current index: %j", index);

        // ensure the claim is not more than the dice amount and face 1-6
        if (message.dice < 1 || message.dice > 6) {
            console.log("Invalid die value: %j", message.die);
            socket.emit("message", "%j, %j is an invalid die value", players[index].player.name, die);
        } else if (players[index].ws === socket) {
            // ensure the calim came from the correct player
            console.log("correct player making the next guess");
            // maybe ensure greater than previous claim
            console.log("Previous guess: %j", lastGuess);
            console.log("count: %j and die: %j", count, die);
            if ((count > lastGuess.count) || ((count == lastGuess.count) && (die > lastGuess.die))) {
                console.log("guess appears valid");
                socket.broadcast.emit("claim", JSON.stringify(getCurrentPlayer().name + " calls " + count + " " + die));
                // update the lastGuess
                lastGuess.playerIndex = index;
                lastGuess.count = count;
                lastGuess.die = die;
            } else {
                console.log("Guess not greater than previous guess");
                socket.emit("message", getCurrentPlayer().name + ", your guess is not greater than the previous claim");
            }
        } else {
            console.log("Incorrect player making a guess");
            socket.emit("message", getCurrentPlayer().name + ", it's not your turn to guess");
        }
    });

    socket.on("lift", function(message) {   // maybe call this "evaluate" .. ?
        console.log("lift: %j", message);
        // the lift message should be the same as the previous claim
        socket.broadcast.emit("call", "message");
        // may need to also send a socket.emit if need server data back to the calling socket
    });

    // socket.emit broadcasts to the specfic socket
	socket.emit("message", "Welcome to Liars Dice!");

});

console.log("Starting Socket App - http://localhost:3000");