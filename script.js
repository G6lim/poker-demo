// WebSocket connection
let ws = null;
let myPlayerId = null;
let myNickname = null;
let currentRoomId = null;
let isHost = false;
let myChips = 1000;
let currentBet = 0;
let myBet = 0;
let pot = 0;
let timerInterval = null;
let timeRemaining = 10;

// DOM elements
const loginSection = document.getElementById('login-section');
const gameSection = document.getElementById('game-section');
const nicknameInput = document.getElementById('nickname-input');
const roomInput = document.getElementById('room-input');
const joinBtn = document.getElementById('join-btn');
const roomIdDisplay = document.getElementById('room-id');
const playerNickname = document.getElementById('player-nickname');
const playerRole = document.getElementById('player-role');
const playersList = document.getElementById('players-list');
const startBtn = document.getElementById('start-btn');
const communityCards = document.getElementById('community-cards');
const holeCards = document.getElementById('hole-cards');
const gameStatus = document.getElementById('game-status');
const winnerSection = document.getElementById('winner-section');
const winnerInfo = document.getElementById('winner-info');
const showdownSection = document.getElementById('showdown-section');
const showdownHands = document.getElementById('showdown-hands');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendChatBtn = document.getElementById('send-chat-btn');

// Action panel elements
const actionPanel = document.getElementById('action-panel');
const potAmount = document.getElementById('pot-amount');
const currentBetDisplay = document.getElementById('current-bet');
const yourChips = document.getElementById('your-chips');
const timerDisplay = document.getElementById('timer-display');
const foldBtn = document.getElementById('fold-btn');
const checkBtn = document.getElementById('check-btn');
const callBtn = document.getElementById('call-btn');
const callAmount = document.getElementById('call-amount');
const raiseBtn = document.getElementById('raise-btn');
const allinBtn = document.getElementById('allin-btn');
const raiseControls = document.getElementById('raise-controls');
const raiseTotal = document.getElementById('raise-total');
const raiseResetBtn = document.getElementById('raise-reset-btn');
const raiseConfirmBtn = document.getElementById('raise-confirm-btn');
const raiseCancelBtn = document.getElementById('raise-cancel-btn');
const actionLog = document.getElementById('action-log');
const potWonAmount = document.getElementById('pot-won-amount');
const winnerAllHands = document.getElementById('winner-all-hands');
const pokerTable = document.getElementById('poker-table');

let raiseAmount = 0;

// Configuration - Update this URL to your server
// const WS_URL = 'ws://localhost:8080';
const WS_URL = "wss://demo-game-server-production.up.railway.app";

// Card suit symbols
const SUIT_SYMBOLS = {
  'H': '♥',
  'D': '♦',
  'C': '♣',
  'S': '♠'
};

const SUIT_COLORS = {
  'H': 'red',
  'D': 'red',
  'C': 'black',
  'S': 'black'
};

// Join button handler
joinBtn.addEventListener('click', () => {
  const nickname = nicknameInput.value.trim();
  const roomId = roomInput.value.trim();

  if (!nickname) {
    alert('Please enter a nickname');
    return;
  }

  if (!roomId) {
    alert('Please enter a room ID');
    return;
  }

  myNickname = nickname;
  currentRoomId = roomId;

  connect();
});

// Start game button handler
startBtn.addEventListener('click', () => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'start' }));
  }
});

// Chat send button handler
sendChatBtn.addEventListener('click', sendChatMessage);

// Chat input enter key handler
chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendChatMessage();
  }
});

function sendChatMessage() {
  const message = chatInput.value.trim();
  if (!message) return;

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'chat',
      message: message
    }));
    chatInput.value = '';
  }
}

// Action button handlers
foldBtn.addEventListener('click', () => {
  sendAction('fold');
});

checkBtn.addEventListener('click', () => {
  sendAction('check');
});

callBtn.addEventListener('click', () => {
  sendAction('call');
});

raiseBtn.addEventListener('click', () => {
  raiseControls.style.display = 'block';
  raiseAmount = 0;
  updateRaiseTotal();
});

// Chip button handlers
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('chip-btn')) {
    const value = parseInt(e.target.getAttribute('data-value'));
    raiseAmount += value;
    updateRaiseTotal();
  }
});

raiseResetBtn.addEventListener('click', () => {
  raiseAmount = 0;
  updateRaiseTotal();
});

raiseConfirmBtn.addEventListener('click', () => {
  if (raiseAmount > 0) {
    sendAction('raise', raiseAmount);
    raiseControls.style.display = 'none';
    raiseAmount = 0;
    updateRaiseTotal();
  } else {
    alert('Please select chips to raise');
  }
});

raiseCancelBtn.addEventListener('click', () => {
  raiseControls.style.display = 'none';
  raiseAmount = 0;
  updateRaiseTotal();
});

function updateRaiseTotal() {
  raiseTotal.textContent = raiseAmount;
}

allinBtn.addEventListener('click', () => {
  sendAction('allin');
});

function sendAction(action, amount = null) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const message = { type: 'action', action };
    if (amount !== null) {
      message.amount = amount;
    }
    ws.send(JSON.stringify(message));
    hideActionPanel();
  }
}

// Connect to WebSocket server
function connect() {
  try {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('Connected to server');

      // Send join message
      ws.send(JSON.stringify({
        type: 'join',
        roomId: currentRoomId,
        nickname: myNickname
      }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleMessage(message);
    };

    ws.onclose = () => {
      console.log('Disconnected from server');
      alert('Disconnected from server');
      resetToLogin();
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      alert('Connection error');
    };
  } catch (error) {
    console.error('Failed to connect:', error);
    alert('Failed to connect to server');
  }
}

// Handle incoming messages
function handleMessage(message) {
  console.log('Received:', message);

  switch (message.type) {
    case 'joined':
      handleJoined(message);
      break;

    case 'player_list':
      updatePlayersList(message.players);
      break;

    case 'chat':
      // Separate system/dealer messages from player chat
      if (message.nickname === 'System' || message.nickname === 'Dealer' || message.nickname === 'Action') {
        addActionLog(message.nickname, message.message);
      } else {
        addChatMessage(message.nickname, message.message);
      }
      break;

    case 'chat_history':
      message.messages.forEach(msg => {
        if (msg.nickname === 'System' || msg.nickname === 'Dealer' || msg.nickname === 'Action') {
          addActionLog(msg.nickname, msg.message);
        } else {
          addChatMessage(msg.nickname, msg.message);
        }
      });
      break;

    case 'game_started':
      handleGameStarted();
      break;

    case 'hole_cards':
      displayHoleCards(message.cards);
      break;

    case 'community_cards':
      displayCommunityCards(message.cards, message.stage);
      break;

    case 'showdown':
      displayShowdown(message.hands);
      break;

    case 'winner':
      displayWinner(message);
      break;

    case 'player_turn':
      handlePlayerTurn(message);
      break;

    case 'game_state':
      updateGameState(message);
      break;

    case 'player_action':
      handlePlayerAction(message);
      break;

    case 'game_reset':
      handleGameReset(message);
      break;

    case 'error':
      alert('Error: ' + message.message);
      break;
  }
}

function handleJoined(message) {
  myPlayerId = message.playerId;
  isHost = message.isHost;

  // Show game section
  loginSection.style.display = 'none';
  gameSection.style.display = 'block';

  // Update display
  roomIdDisplay.textContent = message.roomId;
  playerNickname.textContent = myNickname;
  playerRole.textContent = isHost ? 'Host' : 'Player';

  if (isHost) {
    startBtn.style.display = 'block';
  }

  addActionLog('System', 'You joined the room');
}

function updatePlayersList(players) {
  if (players.length === 0) {
    playersList.innerHTML = '<p class="empty-message">No players</p>';
    return;
  }

  playersList.innerHTML = players.map(player => {
    const badges = [];
    if (player.id === myPlayerId) badges.push('<span class="badge you">You</span>');
    if (player.isHost) badges.push('<span class="badge host">Host</span>');

    return `
      <div class="player-item">
        <span>${player.nickname}</span>
        ${badges.join('')}
      </div>
    `;
  }).join('');

  // Update host status
  const hostPlayer = players.find(p => p.isHost);
  if (hostPlayer) {
    isHost = hostPlayer.id === myPlayerId;
    startBtn.style.display = isHost ? 'block' : 'none';
    playerRole.textContent = isHost ? 'Host' : 'Player';
  }
}

function addChatMessage(nickname, message) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'chat-message';

  const nicknameSpan = document.createElement('span');
  nicknameSpan.className = 'chat-nickname';
  nicknameSpan.textContent = nickname + ': ';

  const messageSpan = document.createElement('span');
  messageSpan.textContent = message;

  messageDiv.appendChild(nicknameSpan);
  messageDiv.appendChild(messageSpan);

  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addActionLog(source, message) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'action-message';

  const sourceSpan = document.createElement('span');
  sourceSpan.className = 'action-source';
  sourceSpan.textContent = source + ': ';

  const messageSpan = document.createElement('span');
  messageSpan.textContent = message;

  messageDiv.appendChild(sourceSpan);
  messageDiv.appendChild(messageSpan);

  actionLog.appendChild(messageDiv);
  actionLog.scrollTop = actionLog.scrollHeight;
}

function handleGameStarted() {
  gameStatus.textContent = 'Game started! Dealing cards...';

  // Hide winner section, show poker table
  winnerSection.style.display = 'none';
  winnerSection.classList.remove('winner-animate');
  pokerTable.style.display = 'block';

  // Reset cards
  holeCards.innerHTML = `
    <div class="card-placeholder">?</div>
    <div class="card-placeholder">?</div>
  `;

  communityCards.innerHTML = `
    <div class="card-placeholder">?</div>
    <div class="card-placeholder">?</div>
    <div class="card-placeholder">?</div>
    <div class="card-placeholder">?</div>
    <div class="card-placeholder">?</div>
  `;
}

function displayHoleCards(cards) {
  holeCards.innerHTML = cards.map(card => createCardHTML(card)).join('');
  gameStatus.textContent = 'Your hole cards received. Waiting for flop...';
}

function displayCommunityCards(cards, stage) {
  const stageNames = {
    'flop': 'Flop',
    'turn': 'Turn',
    'river': 'River'
  };

  communityCards.innerHTML = '';

  // Add revealed cards
  cards.forEach(card => {
    communityCards.innerHTML += createCardHTML(card);
  });

  // Add placeholder cards for remaining positions
  for (let i = cards.length; i < 5; i++) {
    communityCards.innerHTML += '<div class="card-placeholder">?</div>';
  }

  gameStatus.textContent = `${stageNames[stage] || stage} revealed`;
}

let allHandsData = [];

function displayShowdown(hands) {
  // Store hands data for winner display
  allHandsData = hands;
}

function displayWinner(message) {
  // Hide poker table when showing winner
  pokerTable.style.display = 'none';

  // Show winner section with animation
  winnerSection.style.display = 'none'; // Reset for animation
  setTimeout(() => {
    winnerSection.style.display = 'block';
    winnerSection.classList.add('winner-animate');
  }, 100);

  const isMe = message.winnerId === myPlayerId;

  winnerInfo.innerHTML = `
    <div class="winner-content">
      <div class="winner-nickname">${message.nickname}${isMe ? ' (You)' : ''}</div>
      <div class="winner-cards">
        ${message.cards.map(card => createCardHTML(card, 'large')).join('')}
      </div>
      <div class="winner-hand">${message.hand}</div>
    </div>
  `;

  // Display pot won
  potWonAmount.textContent = message.pot || pot;

  // Display all hands in compact view
  winnerAllHands.innerHTML = allHandsData.map(hand => {
    const isWinner = hand.playerId === message.winnerId;
    const isMyHand = hand.playerId === myPlayerId;
    return `
      <div class="compact-hand ${isWinner ? 'winner-hand-highlight' : ''} ${isMyHand ? 'my-hand' : ''}">
        <div class="compact-nickname">${hand.nickname}${isMyHand ? ' (You)' : ''}</div>
        <div class="compact-cards">
          ${hand.cards.map(card => createCardHTML(card, 'small')).join('')}
        </div>
        <div class="compact-description">${hand.handDescription}</div>
      </div>
    `;
  }).join('');

  gameStatus.textContent = `${message.nickname} wins!`;
}

function createCardHTML(cardCode, size = 'normal') {
  // cardCode format: "AH" = Ace of Hearts
  const rank = cardCode[0];
  const suit = cardCode[1];
  const suitSymbol = SUIT_SYMBOLS[suit];
  const suitColor = SUIT_COLORS[suit];

  const rankDisplay = rank === 'T' ? '10' : rank;

  return `
    <div class="card ${suitColor} card-${size}">
      <div class="card-rank">${rankDisplay}</div>
      <div class="card-suit">${suitSymbol}</div>
    </div>
  `;
}

function handlePlayerTurn(message) {
  if (message.playerId === myPlayerId) {
    // It's my turn
    showActionPanel();
    startTimer(message.timeRemaining || 10);
    gameStatus.textContent = 'Your turn! Choose an action.';
  } else {
    // Someone else's turn
    hideActionPanel();
    stopTimer();
  }
}

function updateGameState(message) {
  // Update pot and current bet
  pot = message.pot || 0;
  currentBet = message.currentBet || 0;

  potAmount.textContent = pot;
  currentBetDisplay.textContent = currentBet;

  // Update player info
  if (message.players) {
    const myPlayer = message.players.find(p => p.id === myPlayerId);
    if (myPlayer) {
      myChips = myPlayer.chips;
      myBet = myPlayer.bet;
      yourChips.textContent = myChips;
    }

    // Update players list with chips and current player indicator
    updatePlayersListWithChips(message.players);
  }

  // Update available actions
  updateActionButtons();
}

function updatePlayersListWithChips(players) {
  if (players.length === 0) {
    playersList.innerHTML = '<p class="empty-message">No players</p>';
    return;
  }

  playersList.innerHTML = players.map(player => {
    const badges = [];
    if (player.id === myPlayerId) badges.push('<span class="badge you">You</span>');
    if (player.isHost) badges.push('<span class="badge host">Host</span>');
    if (player.isDealer) badges.push('<span class="badge dealer">🎲</span>');
    if (player.isCurrentPlayer) badges.push('<span class="badge current">Turn</span>');
    if (player.folded) badges.push('<span class="badge folded">Folded</span>');

    return `
      <div class="player-item ${player.isCurrentPlayer ? 'current-turn' : ''}">
        <div class="player-info">
          <span class="player-name">${player.nickname}</span>
          ${badges.join('')}
        </div>
        <div class="player-chips">
          <span class="chips-label">Chips:</span> ${player.chips}
          ${player.bet > 0 ? `<span class="bet-label">Bet:</span> ${player.bet}` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Update host status
  const hostPlayer = players.find(p => p.isHost);
  if (hostPlayer) {
    isHost = hostPlayer.id === myPlayerId;
    startBtn.style.display = isHost ? 'block' : 'none';
    playerRole.textContent = isHost ? 'Host' : 'Player';
  }
}

function handlePlayerAction(message) {
  addActionLog('Action', message.message);
}

function handleGameReset(message) {
  hideActionPanel();
  stopTimer();
  if (message.players) {
    updatePlayersListWithChips(message.players);
  }
}

function updateActionButtons() {
  const callNeeded = currentBet - myBet;

  // Update call button
  if (callNeeded > 0) {
    callAmount.textContent = callNeeded;
    callBtn.style.display = 'inline-block';
    checkBtn.style.display = 'none';
  } else {
    callBtn.style.display = 'none';
    checkBtn.style.display = 'inline-block';
  }

  // Disable buttons if not enough chips
  if (myChips === 0) {
    checkBtn.disabled = false;
    foldBtn.disabled = false;
    callBtn.disabled = true;
    raiseBtn.disabled = true;
    allinBtn.disabled = true;
  } else {
    checkBtn.disabled = false;
    foldBtn.disabled = false;
    callBtn.disabled = callNeeded > myChips;
    raiseBtn.disabled = false;
    allinBtn.disabled = false;
  }
}

function showActionPanel() {
  actionPanel.style.display = 'block';
  updateActionButtons();
}

function hideActionPanel() {
  actionPanel.style.display = 'none';
  stopTimer();
}

function startTimer(seconds) {
  stopTimer();
  timeRemaining = seconds;
  timerDisplay.textContent = timeRemaining;

  timerInterval = setInterval(() => {
    timeRemaining--;
    timerDisplay.textContent = timeRemaining;

    // Change color when time is running out
    if (timeRemaining <= 3) {
      timerDisplay.style.color = '#C80000';
    } else {
      timerDisplay.style.color = '#ffffff';
    }

    if (timeRemaining <= 0) {
      stopTimer();
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  timerDisplay.style.color = '#ffffff';
}

function resetToLogin() {
  loginSection.style.display = 'block';
  gameSection.style.display = 'none';

  myPlayerId = null;
  myNickname = null;
  currentRoomId = null;
  isHost = false;
  myChips = 1000;
  currentBet = 0;
  myBet = 0;
  pot = 0;

  stopTimer();
  hideActionPanel();

  ws = null;
}


document.querySelectorAll(".mobile-tabs button").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".mobile-tabs button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const panel = document.getElementById("mobile-panel");
        panel.style.display = "block";

        const tab = btn.dataset.tab;

        if (tab === "chat") {
            panel.innerHTML = document.getElementById("chat-messages").innerHTML;
        }
        if (tab === "actions") {
            panel.innerHTML = document.getElementById("action-log").innerHTML;
        }
        if (tab === "players") {
            panel.innerHTML = document.getElementById("players-list").innerHTML;
        }
    });
});


setInterval(() => {
    const active = document.querySelector(".mobile-tabs button.active");
    if (!active) return;

    const tab = active.dataset.tab;
    const panel = document.getElementById("mobile-panel");

    if (panel.style.display !== "block") return;

    if (tab === "chat") {
        panel.innerHTML = document.getElementById("chat-messages").innerHTML;
    }
    if (tab === "actions") {
        panel.innerHTML = document.getElementById("action-log").innerHTML;
    }
    if (tab === "players") {
        panel.innerHTML = document.getElementById("players-list").innerHTML;
    }
}, 800);
