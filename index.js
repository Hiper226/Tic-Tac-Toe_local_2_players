const searchButton = document.getElementById('search-button');
const board = document.getElementById('board');
const message = document.getElementById('message');
const turnMessage = document.getElementById('turn-message');
const restartButton = document.getElementById('restart-button');
const usernameInput = document.getElementById('username-input'); 
const loginArea = document.getElementById('login-area');         
const cells = document.querySelectorAll('.cell');
let ws;
let mySymbol = null;
let currentPlayer = null;
let gameOver = false;
let myWins = 0;
let oppWins = 0;
let myUsername = "You";      
let oppUsername = "Opponent";  

searchButton.addEventListener('click', () => {
    myUsername = usernameInput.value.trim() || "Player";

    if (ws) {
        ws.close();
    }
    ws = new WebSocket('ws://localhost:3000');
    clearBoard();
    
    searchButton.style.display = 'none';
    loginArea.style.display = 'none'; 
    
    message.textContent = 'Searching for an opponent...';
    turnMessage.textContent = '';
    restartButton.style.display = 'none';
    gameOver = false;

    ws.onopen = () => {
        board.style.display = 'none';
        ws.send(JSON.stringify({ type: 'join', username: myUsername }));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'start') {
            currentPlayer = data.currentPlayer;
            mySymbol = data.symbol; 
            
            oppUsername = data.opponentName;
            document.getElementById('my-name').textContent = myUsername;
            document.getElementById('opp-name').textContent = oppUsername;

            message.textContent = `${myUsername} [ ${mySymbol} ] vs ${oppUsername}`; 
            turnMessage.textContent = currentPlayer ? "Your turn" : `${oppUsername}'s turn`;
            board.style.display = 'grid';
        } else if (data.type === 'move') {
            updateBoard(data.board);
            currentPlayer = data.currentPlayer;
            turnMessage.textContent = currentPlayer ? "Your turn" : `${oppUsername}'s turn`;
        } else if (data.type === 'GameOver') {
            updateBoard(data.board);
            
            if (data.winner === mySymbol) {
                message.textContent = `${myUsername} (${data.winner}) Wins!`;
                myWins++;
                document.getElementById('my-wins').textContent = myWins;
            } else {
                message.textContent = `${oppUsername} (${data.winner}) Wins!`;
                oppWins++;
                document.getElementById('opp-wins').textContent = oppWins;
            }
            gameOver = true;
            restartButton.style.display = 'inline-block';
            turnMessage.textContent = '';
        } else if (data.type === 'draw') {
            message.textContent = "It's a draw!";
            gameOver = true;
            restartButton.style.display = 'inline-block';
            turnMessage.textContent = '';
        } else if (data.type === 'reset') {
            currentPlayer = data.currentPlayer;
            mySymbol = data.symbol; 
            message.textContent = `${myUsername} [ ${mySymbol} ] vs ${oppUsername}`; 
            turnMessage.textContent = currentPlayer ? "Your turn" : `${oppUsername}'s turn`;
            gameOver = false;
            restartButton.style.display = 'none';
            updateBoard(Array(9).fill(null));
        } else if (data.type === 'disconnect') {
            message.textContent = `${oppUsername} disconnected.`;
            gameOver = true;
            restartButton.style.display = 'inline-block';
            turnMessage.textContent = '';
        }
    };

    ws.onclose = () => {
        message.textContent = 'Connection closed.';
        gameOver = true;
        restartButton.style.display = 'none';
        searchButton.style.display = 'inline-block';
        loginArea.style.display = 'block'; 
    };
});

function handleCellClick(cell) {
    if (!currentPlayer || gameOver || cell.textContent !== '') return;
    const index = parseInt(cell.dataset.index);
    ws.send(JSON.stringify({ type: 'move', index }));
}

cells.forEach((cell) => {
    cell.addEventListener('click', () => handleCellClick(cell));
});

restartButton.addEventListener('click', () => {
    if (ws) {
        ws.send(JSON.stringify({ type: 'reset' }));
    }
});

function updateBoard(boardState) {
    if (!boardState) return;
    cells.forEach((cell, index) => {
        cell.textContent = boardState[index];
    });
}

function clearBoard() {
    cells.forEach(cell => {
        cell.textContent = '';
    });
}