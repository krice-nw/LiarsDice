How this should work. Client(s) connect to the server - load the webpage

each connection can add a player - name and dice added with socket to a server array of players

any player can start a game if not already in session and there are at least 2 players

during the play and player can be removed
    either from loosing all dice or choosing to leave

the game consists of rounds were:
    each player roll their dice (maybe automatic from server call)
    the first player (the only that initiated the game or lost a die) guesses
    players continue in order challenge or call a higher dice total
    on call either the caller or previous player loose a die

When any player loose all dice they are removed

When there is only one player with dice they are declared the winner
    They are also the only, first, player fo rthe next game and thus will go first


Only connected players will be in the game but any connected client can observe the game


TODO:
Need to differentiate players from other conncted clients
    Maybe Players[socket].player?
    so iterate over all clients nd identify if they are players?
    or only manage those that add themselves as players with a name?

Determine how to order players:
    I can determonen the first player (the one that invoke the game start) and observe the order of the first iteration and adhere to that for the remainder of the game ... I like that
Decision: 
    The iniatial release will use order of the players array (first added to last) to determine player order. Thi sbenifits the previous winner as they will be first for the next game.

How to transition the adding of players to starting the game
    on start all players will be expected to roll - if they don;t ping them and wait for roll or there own removal ...
    Need to remove a dormat player - maybe in n number of seconds?

Same as above for transitioning from one round to the next

How much should the server know .... 
    It keeps a list of players, game and round status ...
    Who determines when a player looses a round and has a die removed
        Die removed and elimination if last die should be on the client?
        Server to enforce a roll message only broadcasts if valid
            an array with 1-5 die that are all of value 1-6



Right now I send player begin before setting the round to start .... should add the player to begin with round start 
Means I need to know the correct play order (or start person) at that time.
