// ============================================
// script.js - Complete Logic
// ============================================

// ============================================
// SUPABASE CONFIG - From Environment Variables
// ============================================
const SUPABASE_URL = "https://wxrycrqetmvvousdqjzg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4cnljcnFldG12dm91c2RxanpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1OTIxNTgsImV4cCI6MjA5OTE2ODE1OH0.qs3QUrqLyBuNv7KbWBg8b8rlEgWSaKNMKdSxduMvr-Q";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// SESSION CHECK - Prevent direct dashboard access
// ============================================
(function checkSession() {
    const loggedIn = localStorage.getItem('loggedIn');
    if (!loggedIn || loggedIn !== 'true') {
        // Not logged in, redirect to login
        window.location.href = 'index.html';
        return;
    }
    
    // Show username
    const username = localStorage.getItem('username') || 'User';
    document.getElementById('userEmail').textContent = username;
})();

// ============================================
// GAME CONFIGURATIONS
// ============================================
const GAMES = {
    wingo30: {
        id: 'wingo30',
        name: 'WinGo 30s',
        short: '30s',
        api: 'https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json',
        table: 'wingo30_predictions',
        timer: 30,
        color: '#4fc3f7'
    },
    wingo1: {
        id: 'wingo1',
        name: 'WinGo 1m',
        short: '1m',
        api: 'https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json',
        table: 'wingo1_predictions',
        timer: 60,
        color: '#69db7c'
    },
    wingo3: {
        id: 'wingo3',
        name: 'WinGo 3m',
        short: '3m',
        api: 'https://draw.ar-lottery01.com/WinGo/WinGo_3M/GetHistoryIssuePage.json',
        table: 'wingo3_predictions',
        timer: 180,
        color: '#ffd700'
    },
    wingo5: {
        id: 'wingo5',
        name: 'WinGo 5m',
        short: '5m',
        api: 'https://draw.ar-lottery01.com/WinGo/WinGo_5M/GetHistoryIssuePage.json',
        table: 'wingo5_predictions',
        timer: 300,
        color: '#ff6b6b'
    }
};

// ============================================
// STATE
// ============================================
let gameStates = {};
let allIntervals = {};
let totalSaves = 0;

// ============================================
// DOM REFS
// ============================================
const consoleLog = document.getElementById('consoleLog');
const gamesGrid = document.getElementById('gamesGrid');
const totalSavesEl = document.getElementById('totalSaves');
const connectionStatus = document.getElementById('connectionStatus');
const statusText = document.getElementById('statusText');
const beepToggle = document.getElementById('beepToggle');
const autoRefreshToggle = document.getElementById('autoRefreshToggle');
const beepSound = document.getElementById('beepSound');

// ============================================
// CONSOLE LOG
// ============================================
function addLog(message, game = 'System', type = 'info') {
    const time = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    
    let gameClass = '';
    if (game === 'WinGo 30s') gameClass = 'wingo30';
    else if (game === 'WinGo 1m') gameClass = 'wingo1';
    else if (game === 'WinGo 3m') gameClass = 'wingo3';
    else if (game === 'WinGo 5m') gameClass = 'wingo5';
    
    entry.innerHTML = `
        <span class="log-time">[${time}]</span>
        <span class="log-game ${gameClass}">${game}</span>
        <span class="log-${type}">${message}</span>
    `;
    consoleLog.appendChild(entry);
    consoleLog.scrollTop = consoleLog.scrollHeight;
    console.log(`[${game}]`, message);
}

// ============================================
// NUMBER COLOR
// ============================================
function getNumberClass(num) {
    const n = parseInt(num);
    if (n === 0 || n === 5) return 'num-0';
    if ([1, 3, 7, 9].includes(n)) return 'num-1';
    if ([2, 4, 6, 8].includes(n)) return 'num-2';
    return '';
}

// ============================================
// LOGOUT
// ============================================
function logout() {
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('username');
    Object.values(allIntervals).forEach(interval => {
        if (interval.fetch) clearInterval(interval.fetch);
        if (interval.timer) clearInterval(interval.timer);
    });
    window.location.href = 'index.html';
}

// ============================================
// INIT - START ALL GAMES
// ============================================
function initApp() {
    addLog('🚀 Starting all games...', 'System', 'info');
    
    Object.keys(GAMES).forEach(key => {
        gameStates[key] = {
            lastPeriod: '',
            liveResults: [],
            isFetching: false,
            lastSaved: ''
        };
    });

    createGameCards();
    startAllGames();
    setConnection(true);
    
    addLog('✅ All 4 games running simultaneously!', 'System', 'success');
    addLog('📊 WinGo 30s | 1m | 3m | 5m', 'System', 'info');
}

// ============================================
// CREATE GAME CARDS
// ============================================
function createGameCards() {
    gamesGrid.innerHTML = '';
    
    Object.keys(GAMES).forEach(key => {
        const game = GAMES[key];
        const card = document.createElement('div');
        card.className = 'game-card';
        card.id = `card_${key}`;
        card.innerHTML = `
            <div class="game-header">
                <span class="game-name" style="color:${game.color}">${game.name}</span>
                <span class="game-status running" id="status_${key}">● Running</span>
            </div>
            <div class="game-timer" id="timer_${key}" style="color:${game.color}">--</div>
            <div class="game-period" id="period_${key}">Period: ------</div>
            <div class="game-numbers" id="numbers_${key}">
                <span style="color:#444;">Waiting...</span>
            </div>
            <div class="game-footer">
                <span>Seq: <span id="seq_${key}" style="color:#888;">------</span></span>
                <span class="save-status" id="savestatus_${key}">✓ Ready</span>
            </div>
        `;
        gamesGrid.appendChild(card);
    });
}

// ============================================
// START ALL GAMES
// ============================================
function startAllGames() {
    Object.keys(GAMES).forEach(key => {
        startTimer(key);
        fetchGameData(key);
        
        allIntervals[key] = {
            fetch: setInterval(() => {
                if (autoRefreshToggle.checked) {
                    fetchGameData(key);
                }
            }, 5000),
            timer: null
        };
    });
}

// ============================================
// START TIMER
// ============================================
function startTimer(gameKey) {
    const game = GAMES[gameKey];
    const timerEl = document.getElementById(`timer_${gameKey}`);
    
    function updateTimer() {
        const now = new Date();
        const sec = now.getSeconds();
        const totalSec = game.timer;
        const remain = totalSec - (sec % totalSec);
        const display = remain === totalSec ? 0 : remain;
        
        if (game.timer > 60) {
            const mins = Math.floor(display / 60);
            const secs = display % 60;
            timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        } else {
            timerEl.textContent = display.toString().padStart(2, '0') + 's';
        }
        
        timerEl.className = 'game-timer';
        if (display <= 5) {
            timerEl.classList.add('danger');
        } else if (display <= 10) {
            timerEl.classList.add('warning');
        }
    }
    
    updateTimer();
    allIntervals[gameKey].timer = setInterval(updateTimer, 1000);
}

// ============================================
// FETCH GAME DATA
// ============================================
async function fetchGameData(gameKey) {
    const game = GAMES[gameKey];
    const state = gameStates[gameKey];
    
    if (state.isFetching) return;
    state.isFetching = true;

    try {
        const response = await fetch(game.api + '?ts=' + Date.now(), {
            headers: { 'Cache-Control': 'no-cache' }
        });
        
        const json = await response.json();

        if (!json.data || !json.data.list) {
            state.isFetching = false;
            return;
        }

        const results = json.data.list.map(item => ({
            period: String(item.issueNumber || ''),
            digit: Number(item.number || 0),
            bigSmall: Number(item.number || 0) >= 5 ? 'Big' : 'Small'
        })).filter(r => r.period);

        if (results.length === 0) {
            state.isFetching = false;
            return;
        }

        const latest = results.slice(0, 10);

        if (latest.length && latest[0].period !== state.lastPeriod) {
            state.lastPeriod = latest[0].period;
            state.liveResults = latest;
            
            document.getElementById(`period_${gameKey}`).textContent = `Period: ${latest[0].period}`;
            updateGameNumbers(gameKey, latest);
            
            if (results.length >= 6) {
                await savePrediction(gameKey, results);
            }
        }

        document.getElementById(`status_${gameKey}`).textContent = '● Running';
        document.getElementById(`status_${gameKey}`).className = 'game-status running';

    } catch (err) {
        console.error(`Error fetching ${game.name}:`, err);
        document.getElementById(`status_${gameKey}`).textContent = '⚠️ Error';
        document.getElementById(`status_${gameKey}`).className = 'game-status saving';
    }

    state.isFetching = false;
}

// ============================================
// UPDATE GAME NUMBERS
// ============================================
function updateGameNumbers(gameKey, results) {
    const numbersEl = document.getElementById(`numbers_${gameKey}`);
    
    if (!results || results.length === 0) {
        numbersEl.innerHTML = '<span style="color:#444;">No data</span>';
        return;
    }
    
    const latest = results.slice(0, 3);
    numbersEl.innerHTML = latest.map(item => {
        const numClass = getNumberClass(item.digit);
        return `<span class="game-number ${numClass}">${item.digit}</span>`;
    }).join('');
}

// ============================================
// SAVE PREDICTION
// ============================================
async function savePrediction(gameKey, results) {
    const game = GAMES[gameKey];
    const state = gameStates[gameKey];
    
    if (results.length < 6) return;
    
    const sequence = results.slice(1, 6).map(r => r.digit).join('');
    const nextDigit = results[0].digit;
    
    // Check if already saved this period
    if (state.lastSaved === sequence) {
        return;
    }
    
    try {
        const { data, error } = await supabase
            .from(game.table)
            .select('next_numbers')
            .eq('sequence', sequence)
            .maybeSingle();
            
        if (error) {
            console.error(`Save error [${game.name}]:`, error);
            return;
        }
        
        if (data) {
            let arr = data.next_numbers.split(',');
            if (!arr.includes(String(nextDigit))) {
                arr.push(String(nextDigit));
                await supabase
                    .from(game.table)
                    .update({ next_numbers: arr.join(',') })
                    .eq('sequence', sequence);
                    
                state.lastSaved = sequence;
                totalSaves++;
                
                addLog(`✅ UPDATED: ${sequence} -> ${arr.join(',')}`, game.name, 'success');
                document.getElementById(`savestatus_${gameKey}`).textContent = `✓ Saved (${arr.join(',')})`;
                document.getElementById(`seq_${gameKey}`).textContent = sequence;
            }
        } else {
            await supabase
                .from(game.table)
                .insert([{ sequence, next_numbers: String(nextDigit) }]);
                
            state.lastSaved = sequence;
            totalSaves++;
            
            addLog(`✅ NEW: ${sequence} -> ${nextDigit}`, game.name, 'success');
            document.getElementById(`savestatus_${gameKey}`).textContent = `✓ Saved (${nextDigit})`;
            document.getElementById(`seq_${gameKey}`).textContent = sequence;
        }
        
        totalSavesEl.textContent = `Total Saves: ${totalSaves}`;
        
        // Beep
        if (beepToggle.checked) {
            try {
                beepSound.currentTime = 0;
                await beepSound.play();
                setTimeout(() => { try { beepSound.pause(); } catch(e) {} }, 1000);
            } catch (e) {}
        }
        
    } catch (err) {
        console.error(`Save error [${game.name}]:`, err);
        document.getElementById(`savestatus_${gameKey}`).textContent = '❌ Error';
    }
}

// ============================================
// MANUAL FETCH ALL
// ============================================
function manualFetchAll() {
    addLog('🔄 Manual refresh all games', 'System', 'info');
    Object.keys(GAMES).forEach(key => {
        fetchGameData(key);
    });
}

// ============================================
// CONNECTION STATUS
// ============================================
function setConnection(online) {
    if (online) {
        connectionStatus.className = 'online';
        statusText.textContent = 'Connected';
    } else {
        connectionStatus.className = 'offline';
        statusText.textContent = 'Disconnected';
    }
}

// ============================================
// CLEANUP
// ============================================
window.addEventListener('beforeunload', () => {
    Object.values(allIntervals).forEach(interval => {
        if (interval.fetch) clearInterval(interval.fetch);
        if (interval.timer) clearInterval(interval.timer);
    });
});

// ============================================
// START APP
// ============================================
document.addEventListener('DOMContentLoaded', initApp);

console.log('%c🎯 PREDICTOR PRO', 'color:cyan;font-size:20px;font-weight:bold;');
console.log('%c🚀 All 4 games running!', 'color:#69db7c;font-size:14px;');
console.log('%c🔒 Session protected', 'color:#ffd700;font-size:12px;');
