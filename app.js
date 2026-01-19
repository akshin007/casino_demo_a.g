/* Demo Casino SPA (Educational)
   - Frontend only, no real money, no payments
   - 5 modules: Home, Games, Game Simulation, Balance, Profile
   - Stores balance, selected game, settings in localStorage
*/

(function () {
  "use strict";

  // ---------- Storage keys ----------
  const LS = {
    balance: "demoCasino.balance",
    selectedGameId: "demoCasino.selectedGameId",
    settings: "demoCasino.settings",
    profile: "demoCasino.profile",
    stats: "demoCasino.stats",
  };

  // ---------- Demo games ----------
  const GAMES = [
    {
      id: "slot",
      name: "Slot Spin",
      icon: "🎰",
      description: "Spin to win! Random outcomes with a rare big prize.",
      minBet: 1,
      maxBetHint: 200,
    },
    {
      id: "coin",
      name: "Coin Flip",
      icon: "🪙",
      description: "50/50 chance to double your bet.",
      minBet: 1,
      maxBetHint: 500,
    },
    {
      id: "dice",
      name: "Dice Roll",
      icon: "🎲",
      description: "Roll a die. 4+ wins; 6 pays more.",
      minBet: 1,
      maxBetHint: 300,
    },
  ];

  // ---------- Default data ----------
  const DEFAULTS = {
    balance: 500,
    selectedGameId: "slot",
    settings: {
      theme: "dark",  // "dark" | "light"
      sound: true,
    },
    profile: {
      username: "Guest",
    },
    stats: {
      plays: 0,
      wins: 0,
      losses: 0,
      totalBet: 0,
      totalWon: 0,
    },
  };

  // ---------- State ----------
  let state = loadState();

  // ---------- DOM helpers ----------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  // ---------- Elements ----------
  const balanceDisplay = $("#balanceDisplay");

  const homeBalance = $("#homeBalance");
  const balancePageAmount = $("#balancePageAmount");

  const gamesList = $("#gamesList");
  const selectedGameLabel = $("#selectedGameLabel");

  const simGameName = $("#simGameName");
  const simGameDesc = $("#simGameDesc");
  const betAmount = $("#betAmount");
  const btnMaxBet = $("#btnMaxBet");
  const btnPlay = $("#btnPlay");
  const btnQuickTopUp = $("#btnQuickTopUp");
  const resultBox = $("#resultBox");

  const addAmount = $("#addAmount");
  const btnAddCredits = $("#btnAddCredits");
  const btnResetBalance = $("#btnResetBalance");

  const username = $("#username");
  const btnSaveProfile = $("#btnSaveProfile");
  const statPlays = $("#statPlays");
  const statWins = $("#statWins");
  const statLosses = $("#statLosses");
  const statNet = $("#statNet");

  const themeSelect = $("#themeSelect");
  const soundToggle = $("#soundToggle");
  const btnResetStats = $("#btnResetStats");

  const btnResetAll = $("#btnResetAll");

  // ---------- Init ----------
  document.addEventListener("DOMContentLoaded", () => {
    renderGames();
    applySettingsToUI();
    syncUI();
     startJackpotAnimation();



    // Nav routing
    $$(".nav-link").forEach((btn) => {
      btn.addEventListener("click", () => navigate(btn.dataset.route));
    });

    // In-page "goto" buttons
    $$("[data-goto]").forEach((btn) => {
      btn.addEventListener("click", () => navigate(btn.dataset.goto));
    });

    // Balance controls
    btnAddCredits.addEventListener("click", () => {
      const amount = safeInt(addAmount.value);
      if (amount <= 0) return toast("Enter a positive amount.");
      state.balance += amount;
      saveBalance();
      syncUI();
      toast(`Added ${amount} credits.`);
    });

    btnResetBalance.addEventListener("click", () => {
      state.balance = 0;
      saveBalance();
      syncUI();
      toast("Balance reset to 0.");
    });

    // Simulation controls
    btnMaxBet.addEventListener("click", () => {
      betAmount.value = String(Math.max(0, state.balance));
    });

    btnQuickTopUp.addEventListener("click", () => {
      state.balance += 100;
      saveBalance();
      syncUI();
      toast("+100 credits added.");
    });

    btnPlay.addEventListener("click", () => playSelectedGame());

    // Profile controls
    btnSaveProfile.addEventListener("click", () => {
      const name = (username.value || "").trim();
      state.profile.username = name ? name : "Guest";
      saveProfile();
      syncUI();
      toast("Profile saved.");
    });

    // Settings controls
    themeSelect.addEventListener("change", () => {
      state.settings.theme = themeSelect.value;
      saveSettings();
      applySettingsToUI();
      toast(`Theme set to ${state.settings.theme}.`);
    });

    soundToggle.addEventListener("change", () => {
      state.settings.sound = !!soundToggle.checked;
      saveSettings();
      toast(`Sound ${state.settings.sound ? "on" : "off"}.`);
    });

    btnResetStats.addEventListener("click", () => {
      state.stats = { ...DEFAULTS.stats };
      saveStats();
      syncUI();
      toast("Stats reset.");
    });

    // Reset all
    btnResetAll.addEventListener("click", () => {
      localStorage.removeItem(LS.balance);
      localStorage.removeItem(LS.selectedGameId);
      localStorage.removeItem(LS.settings);
      localStorage.removeItem(LS.profile);
      localStorage.removeItem(LS.stats);

      state = loadState();
      renderGames();
      applySettingsToUI();
      syncUI();
      setResult("Reset complete", "All data reset to defaults.");
    });

    // Default route
    navigate("home");
  });
function startJackpotAnimation() {
  const el = document.getElementById("jackpotValue");
  if (!el) return;

  let value = 250000;
  setInterval(() => {
    value += Math.floor(Math.random() * 900);
    el.textContent = String(value);
  }, 800);
}

  // ---------- Routing ----------
  function navigate(route) {
    // show module
    $$(".module").forEach((sec) => sec.classList.remove("is-visible"));
    const target = document.getElementById(route);
    if (target) target.classList.add("is-visible");

    // active nav pill
    $$(".nav-link").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.route === route);
    });

    // small convenience: on opening simulation, refresh selection text
    if (route === "simulation") refreshSimulationPanel();
    if (route === "balance") syncUI();
    if (route === "profile") syncUI();
  }

  // ---------- Rendering ----------
  function renderGames() {
    gamesList.innerHTML = "";

    GAMES.forEach((g) => {
      const isSelected = g.id === state.selectedGameId;

      const el = document.createElement("div");
      el.className = "game-card";
      el.innerHTML = `
        <div class="title">${g.icon} ${escapeHtml(g.name)}</div>
        <div class="desc">${escapeHtml(g.description)}</div>
        <div class="meta">
          <span>Min bet: <strong>${g.minBet}</strong></span>
          <span>Suggested max: <strong>${g.maxBetHint}</strong></span>
        </div>
        <div class="actions">
          <button class="btn ${isSelected ? "btn-ghost" : ""}" type="button" data-pick="${g.id}">
            ${isSelected ? "Selected" : "Select Game"}
          </button>
          <button class="btn btn-ghost" type="button" data-play="${g.id}">Select & Play</button>
        </div>
      `;

      el.querySelector("[data-pick]").addEventListener("click", () => {
        setSelectedGame(g.id);
        renderGames(); // refresh buttons
        syncUI();
        toast(`Selected: ${g.name}`);
      });

      el.querySelector("[data-play]").addEventListener("click", () => {
        setSelectedGame(g.id);
        renderGames();
        syncUI();
        navigate("simulation");
      });

      gamesList.appendChild(el);
    });
  }

  function refreshSimulationPanel() {
    const game = getSelectedGame();
    if (!game) {
      simGameName.textContent = "No game selected";
      simGameDesc.textContent = "Go to Games and select a demo game.";
      selectedGameLabel.textContent = "None";
      return;
    }
    simGameName.textContent = `${game.icon} ${game.name}`;
    simGameDesc.textContent = game.description;
    selectedGameLabel.textContent = game.name;

    // helpful bet default
    const currentBet = safeInt(betAmount.value);
    if (!currentBet || currentBet < game.minBet) betAmount.value = String(Math.max(10, game.minBet));
  }

  function syncUI() {
    // Balance display
    balanceDisplay.textContent = String(state.balance);
    homeBalance.textContent = String(state.balance);
    balancePageAmount.textContent = String(state.balance);

    // Selected game label + simulation panel
    const game = getSelectedGame();
    selectedGameLabel.textContent = game ? game.name : "None";
    refreshSimulationPanel();

    // Profile fields
    username.value = state.profile.username || "Guest";

    // Stats
    statPlays.textContent = String(state.stats.plays);
    statWins.textContent = String(state.stats.wins);
    statLosses.textContent = String(state.stats.losses);
    statNet.textContent = String(state.stats.totalWon - state.stats.totalBet);
  }

  // ---------- Game logic ----------
  function playSelectedGame() {
    const game = getSelectedGame();
    if (!game) {
      setResult("No game selected", "Go to Games and pick a demo game first.");
      return;
    }

    const bet = safeInt(betAmount.value);
    if (bet <= 0) return setResult("Invalid bet", "Enter a bet greater than 0.");
    if (bet < game.minBet) return setResult("Bet too small", `Minimum bet for this game is ${game.minBet}.`);
    if (bet > state.balance) return setResult("Not enough credits", "Add credits in Balance, or lower your bet.");

    // Deduct bet first
    state.balance -= bet;

    // Simulate outcome
    const outcome = simulate(game.id, bet);

    // Update stats
    state.stats.plays += 1;
    state.stats.totalBet += bet;

    if (outcome.payout > 0) {
      state.stats.wins += 1;
      state.stats.totalWon += outcome.payout;
      state.balance += outcome.payout;
    } else {
      state.stats.losses += 1;
    }

    // Persist and refresh
    saveBalance();
    saveStats();
    syncUI();

    // Sound feedback
    if (state.settings.sound) beep(outcome.payout > 0 ? 900 : 220, 0.08);

    // Show result
    setResult(outcome.title, outcome.message);
  }

  function simulate(gameId, bet) {
    // Returns { payout, title, message }
    const r = Math.random();

    if (gameId === "coin") {
      // 50/50
      if (r < 0.5) {
        return {
          payout: bet * 2,
          title: "You won the coin flip!",
          message: `You doubled your bet. Bet: ${bet}, payout: ${bet * 2}.`,
        };
      }
      return {
        payout: 0,
        title: "You lost the coin flip",
        message: `No payout this time. Bet: ${bet}.`,
      };
    }

    if (gameId === "dice") {
      // roll 1..6
      const roll = 1 + Math.floor(Math.random() * 6);
      if (roll === 6) {
        return {
          payout: bet * 3,
          title: "Dice: 6! Big win!",
          message: `You rolled a ${roll}. Payout: ${bet * 3}.`,
        };
      }
      if (roll >= 4) {
        return {
          payout: bet * 2,
          title: "Dice win!",
          message: `You rolled a ${roll}. Payout: ${bet * 2}.`,
        };
      }
      return {
        payout: 0,
        title: "Dice loss",
        message: `You rolled a ${roll}. No payout.`,
      };
    }

    // Default: slot
    // Probabilities (simple):
    // - 8% big win (x5)
    // - 22% win (x2)
    // - else lose
    if (r < 0.08) {
      return {
        payout: bet * 5,
        title: "Jackpot (demo)!",
        message: `Big win! Bet: ${bet}, payout: ${bet * 5}.`,
      };
    }
    if (r < 0.30) {
      return {
        payout: bet * 2,
        title: "Nice win!",
        message: `You won! Bet: ${bet}, payout: ${bet * 2}.`,
      };
    }
    return {
      payout: 0,
      title: "No match",
      message: `Better luck next time. Bet: ${bet}.`,
    };
  }

  // ---------- Selected game ----------
  function setSelectedGame(id) {
    state.selectedGameId = id;
    localStorage.setItem(LS.selectedGameId, id);
  }

  function getSelectedGame() {
    return GAMES.find((g) => g.id === state.selectedGameId) || null;
  }

  // ---------- Settings / Theme ----------
  function applySettingsToUI() {
    // theme on <html> for easy CSS switching
    document.documentElement.setAttribute("data-theme", state.settings.theme);

    themeSelect.value = state.settings.theme;
    soundToggle.checked = !!state.settings.sound;
  }

  // ---------- Persistence ----------
  function loadState() {
    const balance = safeInt(localStorage.getItem(LS.balance));
    const selectedGameId = localStorage.getItem(LS.selectedGameId) || DEFAULTS.selectedGameId;

    const settings = safeJson(localStorage.getItem(LS.settings), DEFAULTS.settings);
    const profile = safeJson(localStorage.getItem(LS.profile), DEFAULTS.profile);
    const stats = safeJson(localStorage.getItem(LS.stats), DEFAULTS.stats);

    return {
      balance: Number.isFinite(balance) ? balance : DEFAULTS.balance,
      selectedGameId,
      settings: normalizeSettings(settings),
      profile: normalizeProfile(profile),
      stats: normalizeStats(stats),
    };
  }

  function saveBalance() {
    localStorage.setItem(LS.balance, String(state.balance));
  }

  function saveSettings() {
    localStorage.setItem(LS.settings, JSON.stringify(state.settings));
  }

  function saveProfile() {
    localStorage.setItem(LS.profile, JSON.stringify(state.profile));
  }

  function saveStats() {
    localStorage.setItem(LS.stats, JSON.stringify(state.stats));
  }

  function normalizeSettings(s) {
    const theme = s && (s.theme === "light" || s.theme === "dark") ? s.theme : DEFAULTS.settings.theme;
    const sound = s && typeof s.sound === "boolean" ? s.sound : DEFAULTS.settings.sound;
    return { theme, sound };
  }

  function normalizeProfile(p) {
    const username = (p && typeof p.username === "string" && p.username.trim()) ? p.username.trim() : DEFAULTS.profile.username;
    return { username };
  }

  function normalizeStats(st) {
    const out = { ...DEFAULTS.stats };
    if (!st || typeof st !== "object") return out;

    out.plays = safeInt(st.plays);
    out.wins = safeInt(st.wins);
    out.losses = safeInt(st.losses);
    out.totalBet = safeInt(st.totalBet);
    out.totalWon = safeInt(st.totalWon);

    // Guard against negatives / NaN
    out.plays = Math.max(0, out.plays);
    out.wins = Math.max(0, out.wins);
    out.losses = Math.max(0, out.losses);
    out.totalBet = Math.max(0, out.totalBet);
    out.totalWon = Math.max(0, out.totalWon);
    return out;
  }

  // ---------- UI feedback ----------
  function setResult(title, message) {
    resultBox.innerHTML = `
      <div class="result-title">${escapeHtml(title)}</div>
      <div class="result-text muted">${escapeHtml(message)}</div>
    `;
  }

  function toast(message) {
    // Simple beginner-friendly toast (no libraries)
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = message;

    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add("show"));

    setTimeout(() => {
      t.classList.remove("show");
      setTimeout(() => t.remove(), 250);
    }, 1600);
  }

  // Basic beep (works in most modern browsers after user interaction)
  function beep(freq, duration) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.value = 0.03;

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      setTimeout(() => {
        osc.stop();
        ctx.close();
      }, Math.max(10, duration * 1000));
    } catch {
      // If audio isn't supported, silently ignore.
    }
  }

  // ---------- Utils ----------
  function safeInt(v) {
    const n = parseInt(String(v), 10);
    return Number.isFinite(n) ? n : 0;
  }

  function safeJson(str, fallback) {
    try {
      if (!str) return fallback;
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ---------- Extra: toast styling injected (keeps CSS file simpler for beginners) ----------
  const toastStyle = document.createElement("style");
  toastStyle.textContent = `
    .toast{
      position: fixed;
      left: 50%;
      bottom: 18px;
      transform: translateX(-50%) translateY(10px);
      opacity: 0;
      padding: 10px 12px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: color-mix(in srgb, var(--panel) 92%, transparent);
      color: var(--text);
      box-shadow: var(--shadow);
      transition: opacity .2s ease, transform .2s ease;
      z-index: 999;
      max-width: calc(100% - 30px);
      text-align: center;
      font-weight: 700;
      font-size: 13px;
    }
    .toast.show{
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  `;
  document.head.appendChild(toastStyle);
})();
