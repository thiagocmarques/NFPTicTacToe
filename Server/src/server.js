// New Brunwick Community College
// Gaming Experience Development
// Senior Year 2023 - Network for Programmers
// Instructor: Chris Cusack
// Students: Bruno Bortoli and Thiago Marques
// Assignment 4

const path = require("path");
const express = require("express");
const app = express();
const PORT = process.env.PORT || 2000;
const http = require('http');

// Set static folder
app.use(express.static(path.join(__dirname, "../public")));

const server = http.createServer(app);
const io = require('socket.io')(server);


server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    resetGame();
});


let players = [];
let gameState = {
  board: ['', '', '', '', '', '', '', '', ''],
  winner: '',
  currentPlayerId: null,
  currentPlayerName:'',
  playerCount: 0
};


io.on('connection', (socket) => {
  console.log(`User ${socket.id} connected`);

  // We will respond from the server and welcome the user
  socket.emit('message', 'Welcome to GEX 2023 NFP Tic-Tac-Toe game');
  
  // Sending the gameState to whoever connected
  socket.emit('updateState', JSON.stringify(
    {gameState}
  ));

  checkServerFull();
  

  // Player joins the game
  socket.on('joinGame', (message) => {

    checkServerFull();

    const {playerName} = JSON.parse(message);
    //console.log(`${playerName} id: ${socket.id}`);
    gameState.playerCount = players.length;

    let alreadyPlaying = checkAlreadyJoined(socket.id);
    // if the player attemping to join is already joined
    if (alreadyPlaying){
      socket.emit('message', 'You already joined the game. Wait for the start');
    } 
    else if (gameState.playerCount < 2) {
      // Assign symbol to player
      let symbol = assignSymbol(); 
      let player = newPlayer(socket.id, playerName, symbol);
      gameState.playerCount++;

      // Update all clients with player info
      io.emit('message', `${player.name} joined the game with ${player.symbol} symbol`);
      console.log(`User ${player.name} joined the game as ${player.symbol}`);

      // Start game if there are 2 players after the last join
      if (gameState.playerCount === 2) {
        console.log('Game starting...');
        //printPlayers();
        startGame();
      }

    } // Reject player if game is already full
    else if (gameState.playerCount === 2){
      console.log(`User ${socket.id} tried to join the game but it is full`);
      socket.emit('message', 'The game is full. Try again in few minutes');
    }
  }); 

  // Player makes a move
  socket.on('playerMove', (index) => {
    let player = findPlayerById(socket.id);
    // console.log(`Index: ${index} - socketId: ${socket.id}`);
    // console.log(`${player.name} clicked on ${index}`);
    // console.log(`Current player = ${gameState.currentPlayerId}`);

    if (gameState.winner){
      socket.emit('message', 'The game is over. Start a new game to play.');
    }
    // Only current player is allowed to move
    else if (socket.id === gameState.currentPlayerId) 
    {
      // Update board with move
      gameState.board[index] = player.symbol;

      // Check for winner or tie
      let winner = checkWin(player);

      if (winner) {
        let finalMsg = `Game over! ${player.name} wins`;
        console.log(finalMsg);
        gameState.winner = player.name;
        io.emit('message', finalMsg);

      } // Check if it is a tie game
      else if (!gameState.board.includes('')) {
        let tieMsg = 'Game over! TIE game'; 
        console.log(tieMsg);
        gameState.winner = "TIE";
        io.emit('message', tieMsg);

      } 
      // if game not over, update the next player allowed to move
      else {
        gameState.currentPlayerId = findNextPlayerIdToMove();
        gameState.currentPlayerName = findPlayerById(gameState.currentPlayerId).name;
        io.emit('message',`It's ${gameState.currentPlayerName}'s turn.`);
      }

      // broadcasting the updated state
      io.emit('updateState', JSON.stringify(
        {gameState}
      ));
      

    }else{
      if (findPlayerById(socket.id)!=null)
        socket.emit('message', 'It is not you turn. Wait your opponent move.');
      else
        socket.emit('message', 'Movements are not allowed for spectators');

    }
  });

  // Player disconnects
  socket.on('disconnect', () => {
    console.log(`User ${socket.id} disconnected`);

    // Remove player from players object
    if (checkAlreadyJoined(socket.id)){
      let name = findPlayerById(socket.id).name;
      players = players.filter(p=> p.id != socket.id);
      gameState.playerCount--;
      resetGame();
      io.emit('updateState', JSON.stringify(
        {gameState}
      ));
      io.emit('message', `${name} left the game.`);
    }

  });

  // Player restarted the game
  socket.on('resetGame', () => {
    // Only users playing the game can restart it
    if (checkAlreadyJoined(socket.id)){
      let name = findPlayerById(socket.id).name;
      startGame();
      io.emit('restartGame', `${name} restarted the game.`);
      console.log(`Game restarted by ${socket.id} `);
    }else{
      socket.emit('message', `You are just watching. It's not allowed to restart`);
    }

  });

  // check if it is possible to join the game
  function checkServerFull(){
    if (players.length === 2)
      {
        socket.emit('spectator', 'The server is full. You may watch the current game.');
        return true;
      }
  }
    
});
  
// Starts the game
function startGame() {
  console.log('Game started');
  resetGame();

  gameState.currentPlayerId = gameState.currentPlayerId == players[0].id ? players[1].id: players[0].id;
  //console.log(`${printGameState()}`);
  let plrName = findPlayerById(gameState.currentPlayerId).name;
  io.emit('message', `Game started. ${plrName} plays first.`)
  io.emit('updateState', JSON.stringify(
    {gameState}
  ));
}

// puts the game in the initial state
function resetGame() {
  gameState = {
    board: ['', '', '', '', '', '', '', '', ''],
    winner: '',
    currentPlayerId: null,
    playerCount: players.length
  };
  
}

// check if one client has already joined the session
function checkAlreadyJoined(id){
  let found = players.filter(p => p.id == id);
  return found.length != 0;
}

// Check if a given player has won
function checkWin(player) {
  const symbol = player.symbol;
  if (
    checkSameSymbol(0, 1, 2, symbol)    // top row
    || checkSameSymbol(3, 4, 5, symbol) // middle row
    || checkSameSymbol(6, 7, 8, symbol) // bottom row
    || checkSameSymbol(0, 3, 6, symbol) // left column
    || checkSameSymbol(1, 4, 7, symbol) // middle column
    || checkSameSymbol(2, 5, 8, symbol) // right column
    || checkSameSymbol(0, 4, 8, symbol) // diagonal 1
    || checkSameSymbol(2, 4, 6, symbol) // diagonal 2
  ) {
    return true;
  }
  return false;
};
  
// check if the given cells have the same provided symbol
function checkSameSymbol(cell1, cell2, cell3, symbol){
    let b = gameState.board;
    return b[cell1] === symbol && b[cell2] === symbol && b[cell3] === symbol;
};

// search the players array for the player that has the given id
function findPlayerById(id){
  for (const player of players){
    if (player.id == id)
      return player;
  }
  return null;

};

// helper function to log players array in details
function printPlayers(){
  for (let i = 0 ; i < players.length ; i++){
    let p = players[i];
    console.log(`Player info:`);
    console.log(`Id....:  ${p.id}`);
    console.log(`Name..:  ${p.name}`);
    console.log(`Symbol:  ${p.symbol}`);
    console.log("---------------------");
  }
}

// helper function to log the Game State object in details
function printGameState(){
  console.log(`Game State info:`);
  console.log(`Board..........:  ${gameState.board}`);
  console.log(`CurrentPlayer..:  ${gameState.currentPlayerId}`);
  console.log(`Winner.........:  ${gameState.winner}`);
  console.log('----------------');
  
}

// add a new Player to the players array
const newPlayer = (id, name, symbol) => {
  let newPlr = { id: id, name: name, symbol: symbol };
  players.push(newPlr);
  return newPlr;
}

// return the next player to move based on the current player
function findNextPlayerIdToMove(){
  if (gameState.currentPlayerId === players[0].id){
    return players[1].id;
  }else{
    return players[0].id;
  }
}

// return the symbol to assign to one player based on how many players are joined already
function assignSymbol(){
  if (players.length == 0){
    return 'X';
  }else{
    return players[0].symbol === 'X' ? 'O' : 'X';
  }
}

