const boardElement = document.getElementById('board');
const statusElement = document.getElementById('status');
const resultElement = document.getElementById('result');
const difficultySelect = document.getElementById('difficulty');
const restartButton = document.getElementById('restart-button');
const cells = document.querySelectorAll('.cell');
const statsButton = document.getElementById('stats-button');
const statsPanel = document.getElementById('stats-panel');
const closeStatsButton = document.getElementById('close-stats-button');
const resetStatsButton = document.getElementById('reset-stats-button');
const statsWinsEl = document.getElementById('stats-wins');
const statsLossesEl = document.getElementById('stats-losses');
const statsDrawsEl = document.getElementById('stats-draws');
const statsCurrentStreakEl = document.getElementById('stats-current-streak');
const statsBestStreakEl = document.getElementById('stats-best-streak');

// --- Web Audio API Setup ---
let audioContext;
try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
} catch (e) {
    console.warn("Web Audio API is not supported in this browser. No sound effects will play.");
}

function playClickSound() {
    if (!audioContext) return; // Don't play if AudioContext isn't available

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Sound parameters (adjust for "relaxing" feel)
    oscillator.type = 'sine'; // Soft tone
    oscillator.frequency.setValueAtTime(660, audioContext.currentTime); // Frequency in Hz (A5 note)
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime); // Start at low volume

    // Rapidly decrease volume for a "click" effect
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15); // Short decay

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15); // Stop after 0.15 seconds
}

// --- Game State & Constants ---
const PLAYER1 = 'player1'; // Human (✓)
const PLAYER2 = 'player2'; // AI (✗)
const PLAYER1_MARK = `
<svg viewBox="0 0 100 100">
  <polyline points="20,50 40,70 80,30" />
</svg>`;
const PLAYER2_MARK = `
<svg viewBox="0 0 100 100">
  <line x1="20" y1="20" x2="80" y2="80" />
  <line x1="80" y1="20" x2="20" y2="80" />
</svg>`;

let boardState = ['', '', '', '', '', '', '', '', ''];
let currentPlayer = PLAYER1;
let gameActive = true;
let difficulty = 'easy';

const winningCombinations = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
];

// --- Stats ---
const STATS_STORAGE_KEY = 'ticTacToeStats';
let stats = {
    wins: 0,
    losses: 0,
    draws: 0,
    currentStreak: 0,
    bestStreak: 0
};

function loadStats() {
    const storedStats = localStorage.getItem(STATS_STORAGE_KEY);
    if (storedStats) {
        stats = JSON.parse(storedStats);
        // Ensure draws property exists if loading from older storage
        if (stats.draws === undefined) {
            stats.draws = 0;
        }
    } else {
        // Initialize if no stats found
        stats = { wins: 0, losses: 0, draws: 0, currentStreak: 0, bestStreak: 0 };
        saveStats(); // Save initial stats
    }
    updateStatsDisplay();
}

function saveStats() {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
}

function updateStatsDisplay() {
    statsWinsEl.textContent = stats.wins;
    statsLossesEl.textContent = stats.losses;
    statsDrawsEl.textContent = stats.draws;
    statsCurrentStreakEl.textContent = stats.currentStreak;
    statsBestStreakEl.textContent = stats.bestStreak;
}

function resetStats() {
     if (confirm("¿Estás seguro de que quieres reiniciar todas las estadísticas? Esta acción no se puede deshacer.")) {
        stats = { wins: 0, losses: 0, draws: 0, currentStreak: 0, bestStreak: 0 };
        saveStats();
        updateStatsDisplay();
    }
}

// --- Game Logic ---
function handleCellClick(event) {
    const index = parseInt(event.target.dataset.index);

    if (boardState[index] !== '' || !gameActive || currentPlayer !== PLAYER1) {
        return; // Ignore click if cell is taken, game is over, or not player's turn
    }

    // Play sound on valid click before making the move
    playClickSound();

    makeMove(index, PLAYER1);

    if (gameActive) {
        switchTurn();
        // AI makes a move after a short delay
        setTimeout(aiMove, 500);
    }
}

function makeMove(index, player) {
    if (boardState[index] === '' && gameActive) {
        boardState[index] = player;
        cells[index].innerHTML = player === PLAYER1 ? PLAYER1_MARK : PLAYER2_MARK;
        cells[index].classList.add(player);
        cells[index].style.cursor = 'default'; // Indicate cell is taken

        if (checkWin(player)) {
            endGame(false, player);
        } else if (boardState.every(cell => cell !== '')) {
            endGame(true); // Draw
        }
    }
}

function switchTurn() {
    currentPlayer = currentPlayer === PLAYER1 ? PLAYER2 : PLAYER1;
    statusElement.textContent = gameActive
        ? currentPlayer === PLAYER1 ? "Tu turno (✓)" : "Turno de la IA (✗)"
        : statusElement.textContent; // Keep final status if game ended
}

function checkWin(player) {
    return winningCombinations.some(combination => {
        return combination.every(index => boardState[index] === player);
    });
}

function highlightWinningCells(player) {
    const winningCombo = winningCombinations.find(combination =>
        combination.every(index => boardState[index] === player)
    );
    if (winningCombo) {
        winningCombo.forEach(index => cells[index].classList.add('win'));
    }
}

function endGame(draw, winner = null) {
    gameActive = false;
    resultElement.classList.remove('hidden', 'win', 'lose', 'draw'); // Reset classes

    if (draw) {
        statusElement.textContent = "¡Es un empate!";
        resultElement.textContent = "¡Empate!";
        resultElement.classList.add('draw');
        stats.draws++;
        stats.currentStreak = 0; // Reset streak on draw
    } else if (winner) {
        highlightWinningCells(winner);
        if (winner === PLAYER1) {
            statusElement.textContent = "¡Has ganado! (✓)";
            resultElement.textContent = "¡Ganaste!";
            resultElement.classList.add('win');
            stats.wins++;
            stats.currentStreak++;
            if (stats.currentStreak > stats.bestStreak) {
                stats.bestStreak = stats.currentStreak;
            }
        } else { // AI wins
            statusElement.textContent = "La IA ha ganado (✗)";
            resultElement.textContent = "¡Perdiste!";
            resultElement.classList.add('lose');
            stats.losses++;
            stats.currentStreak = 0; // Reset streak on loss
        }
    }

    saveStats(); // Save updated stats
    updateStatsDisplay(); // Update display immediately

    // Make restart button more prominent
    restartButton.style.backgroundColor = '#f39c12'; // Orange color for attention
}

function restartGame() {
    // Ensure AudioContext is resumed if it was suspended by browser policy
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
    // Check if the *previous* game was a loss or draw before resetting board - if so, streak was already reset
    // If the previous game was a win, the streak continues into this new game unless manually restarted.
    // However, clicking restart *always* resets the current streak for simplicity.
    boardState = ['', '', '', '', '', '', '', '', ''];
    gameActive = true;
    currentPlayer = PLAYER1;
    difficulty = difficultySelect.value;
    statusElement.textContent = "Tu turno (✓)";
    resultElement.classList.add('hidden');
    resultElement.textContent = ''; // Clear previous result text
    cells.forEach(cell => {
        cell.innerHTML = '';
        cell.className = 'cell'; // Reset classes
        cell.style.cursor = 'pointer'; // Reset cursor
    });
    restartButton.style.backgroundColor = '#3498db'; // Reset button color
}

// --- AI Logic ---
function aiMove() {
    if (!gameActive || currentPlayer !== PLAYER2) return;

    let moveIndex = -1;

    if (difficulty === 'easy') {
        moveIndex = getRandomEmptyCell();
    } else if (difficulty === 'difficult') {
        moveIndex = getDifficultMove();
    } else if (difficulty === 'expert') {
        moveIndex = getBestMove(); // Minimax
    }

    if (moveIndex !== -1) {
        makeMove(moveIndex, PLAYER2);
        if(gameActive) { // Check if game ended after AI move
             switchTurn();
        }
    }
}

function getEmptyCells() {
    const emptyCells = [];
    boardState.forEach((cell, index) => {
        if (cell === '') {
            emptyCells.push(index);
        }
    });
    return emptyCells;
}

function getRandomEmptyCell() {
    const emptyCells = getEmptyCells();
    if (emptyCells.length > 0) {
        const randomIndex = Math.floor(Math.random() * emptyCells.length);
        return emptyCells[randomIndex];
    }
    return -1; // Should not happen if called correctly
}

function getDifficultMove() {
    // 1. Check if AI can win in the next move
    let winningMove = findWinningMove(PLAYER2);
    if (winningMove !== -1) return winningMove;

    // 2. Check if Player can win in the next move and block it
    let blockingMove = findWinningMove(PLAYER1);
    if (blockingMove !== -1) return blockingMove;

    // 3. Try to take the center square
    if (boardState[4] === '') return 4;

    // 4. Try to take a corner square
    const corners = [0, 2, 6, 8];
    const emptyCorners = corners.filter(index => boardState[index] === '');
    if (emptyCorners.length > 0) {
        return emptyCorners[Math.floor(Math.random() * emptyCorners.length)];
    }

     // 5. Try to take a side square (edges)
    const sides = [1, 3, 5, 7];
    const emptySides = sides.filter(index => boardState[index] === '');
     if (emptySides.length > 0) {
        return emptySides[Math.floor(Math.random() * emptySides.length)];
    }

    // 6. Fallback: Take any available square (shouldn't be needed if logic above is complete)
    return getRandomEmptyCell();
}

// Helper for difficult AI: Finds if a player can win in the next move
function findWinningMove(player) {
    const emptyCells = getEmptyCells();
    for (const index of emptyCells) {
        // Temporarily make the move
        boardState[index] = player;
        const wins = checkWin(player);
        // Undo the move
        boardState[index] = '';
        if (wins) {
            return index; // Found a winning move
        }
    }
    return -1; // No immediate winning move found
}

// --- Minimax for Expert AI ---
function getBestMove() {
    let bestScore = -Infinity;
    let move = -1;
    const emptyCells = getEmptyCells();

    for (const index of emptyCells) {
        boardState[index] = PLAYER2; // AI makes a move
        let score = minimax(boardState, 0, false); // Start recursion, minimizing player's score
        boardState[index] = ''; // Undo move

        if (score > bestScore) {
            bestScore = score;
            move = index;
        }
    }
    return move;
}

function minimax(currentBoard, depth, isMaximizing) {
    // Check for terminal states (win/lose/draw)
    if (checkWin(PLAYER2)) return 10 - depth; // AI (Maximizer) wins
    if (checkWin(PLAYER1)) return depth - 10; // Player (Minimizer) wins
    if (currentBoard.every(cell => cell !== '')) return 0; // Draw

    const emptyCells = getEmptyCellsIndices(currentBoard);

    if (isMaximizing) { // AI's turn (Maximize score)
        let bestScore = -Infinity;
        for (const index of emptyCells) {
            currentBoard[index] = PLAYER2;
            let score = minimax(currentBoard, depth + 1, false);
            currentBoard[index] = ''; // Undo move
            bestScore = Math.max(score, bestScore);
        }
        return bestScore;
    } else { // Player's turn (Minimize score)
        let bestScore = Infinity;
        for (const index of emptyCells) {
            currentBoard[index] = PLAYER1;
            let score = minimax(currentBoard, depth + 1, true);
            currentBoard[index] = ''; // Undo move
            bestScore = Math.min(score, bestScore);
        }
        return bestScore;
    }
}

// Helper for minimax to get empty cell indices from a given board state
function getEmptyCellsIndices(board) {
    const emptyCells = [];
    board.forEach((cell, index) => {
        if (cell === '') {
            emptyCells.push(index);
        }
    });
    return emptyCells;
}

// --- Event Listeners ---
cells.forEach(cell => cell.addEventListener('click', handleCellClick));
restartButton.addEventListener('click', () => {
     // Explicitly reset streak on manual restart if game wasn't active (finished)
     // or if user restarts mid-game
     if (!gameActive || gameActive) { // Always reset streak on manual restart click
        stats.currentStreak = 0;
        saveStats();
        updateStatsDisplay();
    }
    restartGame();
});
difficultySelect.addEventListener('change', (event) => {
    difficulty = event.target.value;
    // Optionally restart game on difficulty change
    // restartGame();
});

// Stats Panel Listeners
statsButton.addEventListener('click', () => {
    statsPanel.classList.remove('hidden');
});

closeStatsButton.addEventListener('click', () => {
    statsPanel.classList.add('hidden');
});

resetStatsButton.addEventListener('click', resetStats);

// --- Initial Setup ---
// Add a user interaction listener to resume AudioContext if needed
document.addEventListener('click', () => {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
}, { once: true }); // Only need this once

loadStats(); // Load stats when the script runs
restartGame(); // Start the game on load