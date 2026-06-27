const express = require('express');
const http = require('http');
const websocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new websocket.Server({ server });

let waitingPlayers = [];
let games = [];

app.use(express.static(path.join(__dirname, 'public')));

wss.on('connection', (ws) => {
    
    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'join') {
            ws.username = data.username; 
            waitingPlayers.push(ws);

            if (waitingPlayers.length >= 2) {
                const player1 = waitingPlayers.shift();
                const player2 = waitingPlayers.shift();
                const game = {
                    players : [player1, player2],
                    board : Array(9).fill(null),
                    currentPlayer: Math.random() < 0.5 ? player1 : player2,
                    winner: null,
                    gameOver: false,
                };
                games.push(game);

                player1.send(JSON.stringify({ 
                    type: 'start', 
                    currentPlayer: game.currentPlayer === player1,
                    symbol: 'X',
                    opponentName: player2.username 
                }));
                
                player2.send(JSON.stringify({ 
                    type: 'start', 
                    currentPlayer: game.currentPlayer === player2,
                    symbol: 'O',
                    opponentName: player1.username 
                }));
            }
        }

        const game = games.find(g => g.players.includes(ws));

        if (data.type === 'move' && game && !game.gameOver) {
            if (game.currentPlayer === ws && game.board[data.index] === null) {
                game.board[data.index] = game.currentPlayer === game.players[0] ? 'X' : 'O';
                game.currentPlayer = game.currentPlayer === game.players[0] ? game.players[1] : game.players[0];
                game.players.forEach(player => player.send(JSON.stringify({ type: 'move', board: game.board, 
                    currentPlayer: game.currentPlayer === player 
                })));
                checkWinner(game);
            }
        } else if (data.type === 'reset' && game) {
            game.board = Array(9).fill(null);
            game.currentPlayer = Math.random() < 0.5 ? game.players[0] : game.players[1];
            game.winner = null;
            game.gameOver = false;
            
            game.players.forEach((player, index) => player.send(JSON.stringify({ 
                type: 'reset', 
                currentPlayer: game.currentPlayer === player,
                symbol: index === 0 ? 'X' : 'O'
            })));
        }  
    });

    ws.on('close', () => {
        const game = games.find(g => g.players.includes(ws));
        if (game) {
            const opponent = game.players.find(player => player !== ws);
            if (opponent) {
                opponent.send(JSON.stringify({ type: 'disconnect' }));
            }
            games = games.filter(g => g !== game);    
        }
        waitingPlayers = waitingPlayers.filter(player => player !== ws);
    });
});

function checkWinner(game) {
    const winningCombinations = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    for (let combination of winningCombinations) {
        const [a, b, c] = combination;
        if (game.board[a] && game.board[a] === game.board[b] && game.board[a] === game.board[c]) {
            game.winner = game.board[a];
            game.gameOver = true;
            game.players.forEach(player => player.send(JSON.stringify({ type: 'GameOver', winner: game.winner })));
            return;
        }
    }
    if (game.board.every(cell => cell !== null)) {
        game.gameOver = true;
        game.players.forEach(player => player.send(JSON.stringify({ type: 'draw', winner: null })));
    }
}

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});