console.log('Ready');

const q = selector => document.querySelector(selector);

let gameStatus;
let messages = [];
let isSpectator = false;

const cells = document.querySelectorAll('.cell');
const gameBoard = q("#game-board")
const msgBoard = q("#message-board");
const currentMsg = q("#current-message");
const btnAction = q("#btnAction");
const btnJoin = q("#btnJoin");
const userDiv = q("#user");
const frm = q("#frm");
const txtUser = q("#txtUser");

const socket = io();

frm.addEventListener('submit', e => {
  e.preventDefault();

  // When user join the game
  socket.emit('joinGame', JSON.stringify(
    { playerName: txtUser.value.trim() }
  ));
});


// Update the board with the current game state 
function updateBoard(board) {
  for (let i = 0; i < board.length; i++) {
    cells[i].textContent = board[i]; 
  } 
};

// Updating the spectator state
socket.on('spectator', message => {
  messages.push(message);
  updateMessageBoard();
  isSpectator = true;
}); 

socket.on('canJoin', message => {
  messages.push(message);
  updateMessageBoard();
  isSpectator = false;
}); 


// Displaying server messages 
socket.on('message', message => {
  messages.push(message);
  updateMessageBoard();
}); 

// Game restarted
socket.on('restartGame', message => {
  messages = [];
  messages.push(message);
  updateMessageBoard();
}); 


// receiving the gameState broadcast from server
socket.on('updateState', state => {
  const {gameState} = JSON.parse(state);
  updateBoard(gameState.board);
  updateUI(gameState);
}); 


// When the player clicks on a cell
cells.forEach(cell => {
  cell.addEventListener('click', () => {
    if (cell.textContent === '') {
      socket.emit('playerMove', cell.id);
    }
  });
});

// enable/disable UI elements according to game state
function updateUI(gameState) {
  if (isSpectator)
  {
    gameStatus = 'watching';
    btnJoin.disabled = true;
    btnAction.disabled = true;
    txtUser.disabled = true;

  }
  else
  {
    if (gameState.playerCount < 2){
      // if previous state was "watching"
      if (gameStatus === 'watching')
      {
        messages.push('You can now join the game.');
        updateMessageBoard();
      }
      gameStatus = 'waiting';
      btnJoin.disabled = false;
      btnAction.disabled = true;
      txtUser.disabled = false;
    }
    else if (gameState.winner){
      gameStatus = 'end';
      btnJoin.disabled = true;
      btnAction.disabled = false;
      txtUser.disabled = true;
    }
    else{
      gameStatus = 'playing';
      btnJoin.disabled = true;
      btnAction.disabled = false;
      txtUser.disabled = true;
    }

  }
};

btnAction.addEventListener("click", doAction);

function doAction() {
  switch (gameStatus){
    case 'waiting':
    case 'watching':
      break;
    case 'playing':
    case 'end':
      socket.emit('resetGame');
      break;
  }
}

function updateMessageBoard(){
  let msgline = '';
  let hstLines = '';
  for (let index = messages.length - 1; index >= 0; index--){
    console.log(messages[index]);
    if (index == messages.length - 1)
      //lines += `<p><div class="currentMsg">${messages[index]}</div></p>`;
      msgLine = `<span class="currentMsg">${messages[index]}</span>`;
    else
      //lines += `<p><div class="oldMsg">${messages[index]}</div></p>`; 
      hstLines += `<span class="oldMsg">${messages[index]}</span><br>`;
  }
  if (messages.length > 0)
    currentMsg.innerHTML = msgLine;
    msgBoard.innerHTML = hstLines;
    
}

