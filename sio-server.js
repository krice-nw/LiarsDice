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
var lastGuess = {playerIndex: -1, count: 0, die:0}; // could rename guess to call? lastCall ... that matches a bar theme

//var playerCount = 0;
//var totalDice = 0;

function getRolling(socket) {
    // iterate over the playters and clear their dice
    players.forEach(function(eachPlayer) {
        eachPlayer.player.dice = [0];
    });

    // set the flag to rolling so we can track when all have rolled
    playersRolling = true;  

    // tell the players to roll
    socket.broadcast.emit("rolling", "start round");
    socket.emit("rolling", "start round");
};

function getCurrentPlayer() {
    var index = lastGuess.playerIndex + 1;
    if (index >= players.length) {
        index = 0;
    };
    return players[index].player;
};

function getPreviousPlayer() {
    return players[lastGuess.playerIndex].player;
};


function lastGuessValid() {
    var dieCount = 0;
    var guessIsValid = false;
    players.forEach(function(eachPlayer) {
        eachPlayer.player.dice.forEach(function(die) {
            if (die == lastGuess.die) {
                dieCount++;
                console.log("Increment die count: %j", dieCount);
            };
        });
    });
    console.log("Die count for %j is: %j", lastGuess.die, dieCount);
    console.log("lastGuess count: %j", lastGuess.count);
    if (dieCount >= parseInt(lastGuess.count)) {
        guessIsValid = true;
        console.log("Current guess is valid");
    };
    return guessIsValid;
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
            getRolling(socket);
        } else {
            socket.emit("message", player.name + " you need to find at least one other player.");
        }
    });

    socket.on("roll", function(player) {
        console.log("roll: %j", player);
        if (playersRolling) {
            // message will have the player and array of rolled dice 
 
            // THIS NEXT BLOCK SHOULD A UTILITY FUNCTION
            // if the player has no dice they are out and shoud be removed from the players array
            if (player.dice.length < 1){
                console.log("player has no dice - remove them");
                // remove this player from the array and notify others ...
                // shoudn't this be accomplished after the turn when a players last die is removed?
                index = -1;
                for (i=0; i < players.length; i++) {
                    if (players[i].ws === socket) {
                        index = i;
                    }
                }
                // remove the item at the index
                if (index >= 0) {
                    console.log("Removed payer at index %j", index);
                    players.splice(index, 1);
                } else {
                    console.log("Failed to find teh player index ...");
                }   
            }
            players.forEach(function(thisPlayer) {
                // make sure we update the correct player dice
                if (thisPlayer.ws === socket) {
                    // update the dice values
                    thisPlayer.player.dice = player.dice;
                    console.log("Update dice: %j", thisPlayer.player.dice)
                }
            });
            // broadcast the roll to each client - the client will not display the other rolls
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
        if (die < 1 || die > 6) {
            console.log("Invalid die value: %j", die);
            socket.emit("message", "%j, %j is an invalid die value", players[index].player.name, die);
        } else if (players[index].ws === socket) {
            // ensure the calim came from the correct player
            console.log("correct player making the next guess");
            // maybe ensure greater than previous claim
            console.log("Previous guess: %j", lastGuess);
            console.log("count: %j and die: %j", count, die);
            if ((count > lastGuess.count) || ((count == lastGuess.count) && (die > lastGuess.die))) {
                console.log("guess appears valid");
                // update the lastGuess
                lastGuess.playerIndex = index;
                lastGuess.count = count;
                lastGuess.die = die;
                console.log("lastGuess values updated: %j", lastGuess);
                socket.broadcast.emit("claim", JSON.stringify(getCurrentPlayer().name + " calls " + count + " " + die));
            } else {
                console.log("Guess not greater than previous guess");
                socket.emit("message", getCurrentPlayer().name + ", your guess is not greater than the previous claim");
            }
        } else {
            console.log("Incorrect player making a guess");
            socket.emit("message", getCurrentPlayer().name + ", it's not your turn to guess");
        }
    });

    socket.on("lift", function(player) {   // maybe call this "evaluate" .. ?
        console.log("lift: %j", player);
        // the lift message should be the same as the previous claim
    //    socket.broadcast.emit("call", "player");
        // may need to also send a socket.emit if need server data back to the calling socket

        // call utility function to see if the lastGuess was true or not
        if (lastGuessValid()) {
            console.log("Last guess was correct");
            socket.emit("message", "Ohhh - Sorry " + getCurrentPlayer().name + "!");
            socket.emit("round", "lost");
            socket.broadcast.emit("message", getPreviousPlayer().name + " won the round");
        } else {
            console.log("Previous player caught lying");
            socket.emit("message", getCurrentPlayer().name + ", Well done!");
            players[lastGuess.playerIndex].ws.emit("message", "Caught lying " + getPreviousPlayer().name + "!");
            players[lastGuess.playerIndex].ws.emit("round", "lost");
            socket.broadcast.emit("message", getCurrentPlayer().name + " won the round");
        }
        console.log("Set roundInProgress to false and broadcast round:end");
        roundInProgress = false;
        // reset the lastGuess
        lastGuess = {playerIndex: -1, count: 0, die:0};
        socket.broadcast.emit("round", "end");
        socket.emit("round", "end");
        
        // need to check if a player is removed and if so if we have a winner
        // actually the client will handle this based on the round:lost emit  
        
        // then kick off the rolling for the next round which should clear current player dice
        getRolling(socket);
    });

    // socket.emit broadcasts to the specfic socket
	socket.emit("message", "Welcome to Liars Dice!");

});

console.log("Starting Socket App - http://localhost:3000");