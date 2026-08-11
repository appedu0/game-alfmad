(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const screens = {
    intro: $("#introScreen"),
    tutorial: $("#tutorialScreen"),
    game: $("#gameScreen")
  };

  const els = {
    studentName: $("#studentName"),
    startBtn: $("#startBtn"),
    tutorialStartBtn: $("#tutorialStartBtn"),
    hudName: $("#hudName"),
    score: $("#score"),
    combo: $("#combo"),
    level: $("#level"),
    lives: $("#lives"),
    gameArena: $("#gameArena"),
    wordLayer: $("#wordLayer"),
    fxLayer: $("#fxLayer"),
    crosshair: $("#crosshair"),
    launcherHead: $("#launcherHead"),
    feedback: $("#feedback"),
    progressText: $("#levelProgressText"),
    progressBar: $("#levelProgressBar"),
    soundBtn: $("#soundBtn"),
    pauseBtn: $("#pauseBtn"),
    pauseOverlay: $("#pauseOverlay"),
    resumeBtn: $("#resumeBtn"),
    restartFromPauseBtn: $("#restartFromPauseBtn"),
    levelOverlay: $("#levelOverlay"),
    levelStudentName: $("#levelStudentName"),
    levelMessage: $("#levelMessage"),
    levelScore: $("#levelScore"),
    nextLevelBtn: $("#nextLevelBtn"),
    endOverlay: $("#endOverlay"),
    resultEmoji: $("#resultEmoji"),
    resultTitle: $("#resultTitle"),
    resultText: $("#resultText"),
    finalScore: $("#finalScore"),
    bestCombo: $("#bestCombo"),
    accuracy: $("#accuracy"),
    playAgainBtn: $("#playAgainBtn")
  };

  /*
    الكلمات الصحيحة: تحتوي على مدّ بالألف.
    اخترنا كلمات بسيطة وواضحة ومشكّلة لتقليل اللبس عند الأطفال.
  */
  const wordBank = {
    correct: [
      "بَاب","نَار","دَار","تَاج","مَال","جَار","قَال","نَام",
      "سَار","فَاز","كَان","عَاد","حِصَان","قِطَار","كِتَاب","طَعَام",
      "غَزَال","سَحَاب","مَطَار","نَهَار","شِتَاء","سَمَاء","رَمَاد","فَرَاشَة",
      "زَرَافَة","سَيَّارَة","بَابَا","حَمَامَة","بَطَاطَا"
    ],
    wrong: [
      "بَيْت","قَلَم","شَمْس","وَلَد","بِنْت","كُرْسِيّ","نُور","فِيل",
      "كَلْب","قِطّ","لَيْل","يَد","وَرْد","بَحْر","جَبَل","نَهْر",
      "عُصْفُور","تِين","حَلِيب","سَمَك",
      "مَدْرَسَة","شَجَرَة","نَجْم","قَمَر","ثَلْج","خُبْز","دُبّ","فِكْر"
    ]
  };


  const levelConfig = [
    { need: 8, speed: 24, spawn: 1250, correctChance: .58, label: "مستكشف الألف" },
    { need: 10, speed: 30, spawn: 1050, correctChance: .62, label: "قنّاص الكلمات" },
    { need: 12, speed: 37, spawn: 900, correctChance: .64, label: "بطل مدّ الألف" }
  ];

  let state = {
    name: "",
    score: 0,
    combo: 0,
    bestCombo: 0,
    lives: 3,
    level: 0,
    progress: 0,
    shots: 0,
    hits: 0,
    running: false,
    paused: false,
    sound: true,
    gameEnded: false,
    spawnTimer: null,
    animationId: null,
    lastTime: 0,
    targets: [],
    audioCtx: null
  };

  const colors = ["purple","pink","yellow","green"];

  function switchScreen(key) {
    Object.values(screens).forEach(s => s.classList.remove("active"));
    screens[key].classList.add("active");
  }

  function normalizeName(v) {
    return v.trim().replace(/\s+/g, " ").slice(0, 24);
  }

  function audio(type) {
    if (!state.sound) return;
    try {
      if (!state.audioCtx) state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = state.audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      const now = ctx.currentTime;

      if (type === "good") {
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(820, now + .11);
        gain.gain.setValueAtTime(.08, now);
        gain.gain.exponentialRampToValueAtTime(.001, now + .18);
        osc.start(now); osc.stop(now + .2);
      } else if (type === "bad") {
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + .16);
        gain.gain.setValueAtTime(.07, now);
        gain.gain.exponentialRampToValueAtTime(.001, now + .22);
        osc.start(now); osc.stop(now + .24);
      } else if (type === "level") {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(660, now + .12);
        osc.frequency.setValueAtTime(880, now + .24);
        gain.gain.setValueAtTime(.08, now);
        gain.gain.exponentialRampToValueAtTime(.001, now + .42);
        osc.start(now); osc.stop(now + .45);
      }
    } catch (e) {}
  }

  function begin() {
    const name = normalizeName(els.studentName.value);
    if (!name) {
      els.studentName.focus();
      els.studentName.animate([
        { transform:"translateX(0)"},{transform:"translateX(-7px)"},
        {transform:"translateX(7px)"},{transform:"translateX(0)"}
      ], {duration:280});
      return;
    }
    state.name = name;
    els.hudName.textContent = name;
    switchScreen("tutorial");
  }

  function resetState() {
    clearSpawn();
    cancelAnimationFrame(state.animationId);
    state = {
      ...state,
      score: 0, combo: 0, bestCombo: 0, lives: 3, level: 0, progress: 0,
      shots: 0, hits: 0, running: false, paused: false, gameEnded: false,
      spawnTimer: null, animationId: null, lastTime: 0, targets: []
    };
    els.wordLayer.innerHTML = "";
    els.fxLayer.innerHTML = "";
    hideOverlay(els.pauseOverlay);
    hideOverlay(els.levelOverlay);
    hideOverlay(els.endOverlay);
    updateHUD();
  }

  function startGame() {
    resetState();
    switchScreen("game");
    state.running = true;
    state.lastTime = performance.now();
    scheduleSpawn(true);
    state.animationId = requestAnimationFrame(loop);
  }

  function updateHUD() {
    els.score.textContent = state.score;
    els.combo.textContent = state.combo;
    els.level.textContent = state.level + 1;
    els.lives.innerHTML = Array.from({length:3},(_,i)=>`<span>${i < state.lives ? "❤️" : "🖤"}</span>`).join("");
    const cfg = levelConfig[state.level] || levelConfig[levelConfig.length - 1];
    els.progressText.textContent = `${Math.min(state.progress,cfg.need)} / ${cfg.need}`;
    els.progressBar.style.width = `${Math.min(100,(state.progress/cfg.need)*100)}%`;
  }

  function scheduleSpawn(immediate = false) {
    clearSpawn();
    if (!state.running || state.paused || state.gameEnded) return;
    const cfg = levelConfig[state.level];
    const delay = immediate ? 250 : cfg.spawn * (.85 + Math.random()*.3);
    state.spawnTimer = setTimeout(() => {
      if (!state.running || state.paused) return;
      spawnWord();
      scheduleSpawn(false);
    }, delay);
  }

  function clearSpawn() {
    if (state.spawnTimer) clearTimeout(state.spawnTimer);
    state.spawnTimer = null;
  }

  function spawnWord() {
    if (state.targets.length >= 6) return;
    const cfg = levelConfig[state.level];
    const isCorrect = Math.random() < cfg.correctChance;
    const bank = isCorrect ? wordBank.correct : wordBank.wrong;
    const text = bank[Math.floor(Math.random()*bank.length)];

    const el = document.createElement("button");
    el.type = "button";
    el.className = "word-target";
    el.dataset.correct = isCorrect ? "1" : "0";
    el.dataset.color = colors[Math.floor(Math.random()*colors.length)];
    el.textContent = text;

    const arenaRect = els.gameArena.getBoundingClientRect();
    const mobile = arenaRect.width < 600;
    const widthGuess = mobile ? 104 : 130;
    const x = 15 + Math.random() * Math.max(50, arenaRect.width - widthGuess - 30);
    const y = arenaRect.height + 45;
    const vx = (Math.random() - .5) * (mobile ? 13 : 18);
    const vy = -(cfg.speed + Math.random()*9);

    const target = {
      el, text, isCorrect, x, y, vx, vy,
      born: performance.now(),
      sway: 10 + Math.random()*20,
      phase: Math.random()*Math.PI*2,
      dead: false
    };

    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      shootTarget(target, e.clientX, e.clientY);
    });

    els.wordLayer.appendChild(el);
    state.targets.push(target);
  }

  function loop(now) {
    if (!state.running || state.gameEnded) return;
    const dt = Math.min(.04,(now - state.lastTime)/1000 || 0);
    state.lastTime = now;

    if (!state.paused) {
      const h = els.gameArena.clientHeight;
      const w = els.gameArena.clientWidth;

      for (const t of state.targets) {
        if (t.dead) continue;
        t.y += t.vy * dt;
        t.x += t.vx * dt + Math.sin((now-t.born)/500 + t.phase) * t.sway * dt;

        if (t.x < 8) { t.x = 8; t.vx = Math.abs(t.vx); }
        if (t.x > w - 125) { t.x = Math.max(8,w - 125); t.vx = -Math.abs(t.vx); }

        t.el.style.left = `${t.x}px`;
        t.el.style.top = `${t.y}px`;
        t.el.style.transform = `rotate(${Math.sin((now-t.born)/650+t.phase)*3}deg)`;

        if (t.y < -80) {
          // إذا مرت كلمة صحيحة دون إصابتها نفقد محاولة.
          if (t.isCorrect) missCorrectWord(t);
          removeTarget(t);
        }
      }
      state.targets = state.targets.filter(t => !t.dead);
    }
    state.animationId = requestAnimationFrame(loop);
  }

  function shootTarget(target, clientX, clientY) {
    if (!state.running || state.paused || target.dead) return;
    state.shots++;
    createShotFlash(clientX, clientY);

    if (target.isCorrect) {
      state.hits++;
      state.combo++;
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      const comboBonus = Math.min(5, Math.floor(state.combo/3));
      const gain = 10 + comboBonus * 2;
      state.score += gain;
      state.progress++;

      target.el.classList.add("hit");
      sparksAt(target.x + target.el.offsetWidth/2, target.y + target.el.offsetHeight/2);
      floatScore(target.x + 28, target.y, `+${gain}`);
      showFeedback(randomGoodMessage(), true);
      audio("good");
      setTimeout(() => removeTarget(target), 220);

      updateHUD();
      checkLevelComplete();
    } else {
      state.combo = 0;
      state.lives = Math.max(0, state.lives - 1);
      target.el.classList.add("wrong");
      showFeedback(`ليست مدًّا بالألف ❌`, false);
      audio("bad");
      setTimeout(() => target.el.classList.remove("wrong"), 420);
      updateHUD();
      if (state.lives <= 0) endGame(false);
    }
  }

  function missCorrectWord(target) {
    if (state.gameEnded) return;
    state.combo = 0;
    state.lives = Math.max(0, state.lives - 1);
    showFeedback(`فاتتك كلمة «${target.text}»`, false);
    audio("bad");
    updateHUD();
    if (state.lives <= 0) endGame(false);
  }

  function removeTarget(target) {
    if (target.dead) return;
    target.dead = true;
    if (target.el && target.el.parentNode) target.el.remove();
  }

  function checkLevelComplete() {
    const cfg = levelConfig[state.level];
    if (state.progress < cfg.need) return;

    state.running = false;
    clearSpawn();
    state.targets.forEach(removeTarget);
    state.targets = [];
    els.levelStudentName.textContent = state.name;
    els.levelMessage.textContent = `أكملت مستوى «${cfg.label}» بنجاح.`;
    els.levelScore.textContent = state.score;
    audio("level");

    if (state.level >= levelConfig.length - 1) {
      setTimeout(() => endGame(true), 500);
    } else {
      setTimeout(() => showOverlay(els.levelOverlay), 350);
    }
  }

  function nextLevel() {
    hideOverlay(els.levelOverlay);
    state.level++;
    state.progress = 0;
    state.lives = Math.min(3, state.lives + 1); // مكافأة محاولة إضافية
    state.running = true;
    state.paused = false;
    state.lastTime = performance.now();
    updateHUD();
    showFeedback("مستوى جديد! 🚀", true);
    scheduleSpawn(true);
    state.animationId = requestAnimationFrame(loop);
  }

  function endGame(won) {
    state.running = false;
    state.gameEnded = true;
    clearSpawn();
    state.targets.forEach(removeTarget);
    state.targets = [];

    const accuracy = state.shots ? Math.round((state.hits/state.shots)*100) : 0;
    els.finalScore.textContent = state.score;
    els.bestCombo.textContent = state.bestCombo;
    els.accuracy.textContent = `${accuracy}%`;

    if (won) {
      els.resultEmoji.textContent = "🏆";
      els.resultTitle.textContent = "بطل مدّ الألف!";
      els.resultText.textContent = `رائع يا ${state.name}! تعرّفت على كلمات مدّ الألف بدقة كبيرة.`;
    } else {
      els.resultEmoji.textContent = "💪";
      els.resultTitle.textContent = "محاولة جميلة!";
      els.resultText.textContent = `${state.name}، جرّب مرة أخرى وركّز على الألف التي يسبقها حرف مفتوح.`;
    }
    setTimeout(() => showOverlay(els.endOverlay), 280);
  }

  function randomGoodMessage() {
    const msgs = ["أحسنت! ⭐","إجابة رائعة! 🎯","بطل! 👏","ممتاز جدًا! 🌟","صحيح! مدّ بالألف ✅"];
    return msgs[Math.floor(Math.random()*msgs.length)];
  }

  function showFeedback(text, good) {
    els.feedback.textContent = text;
    els.feedback.className = `feedback show ${good ? "good":"bad"}`;
    clearTimeout(els.feedback._timer);
    els.feedback._timer = setTimeout(() => {
      els.feedback.className = "feedback";
    }, 950);
  }

  function sparksAt(x,y) {
    for (let i=0;i<12;i++) {
      const s = document.createElement("span");
      s.className = "spark";
      s.style.left = `${x}px`; s.style.top = `${y}px`;
      const ang = Math.random()*Math.PI*2;
      const dist = 35 + Math.random()*70;
      s.style.setProperty("--dx", `${Math.cos(ang)*dist}px`);
      s.style.setProperty("--dy", `${Math.sin(ang)*dist}px`);
      s.style.background = ["#ffd447","#ff65a8","#6b5cff","#39d98a"][i%4];
      els.fxLayer.appendChild(s);
      setTimeout(()=>s.remove(),750);
    }
  }

  function createShotFlash(clientX,clientY) {
    const r = els.gameArena.getBoundingClientRect();
    const f = document.createElement("span");
    f.className = "shot-flash";
    f.style.left = `${clientX-r.left}px`; f.style.top = `${clientY-r.top}px`;
    els.fxLayer.appendChild(f);
    setTimeout(()=>f.remove(),280);
  }

  function floatScore(x,y,text) {
    const f = document.createElement("span");
    f.className = "float-score"; f.textContent = text;
    f.style.left = `${x}px`; f.style.top = `${y}px`;
    els.fxLayer.appendChild(f);
    setTimeout(()=>f.remove(),850);
  }

  function pause() {
    if (!state.running || state.paused || state.gameEnded) return;
    state.paused = true;
    clearSpawn();
    showOverlay(els.pauseOverlay);
  }

  function resume() {
    if (!state.paused) return;
    hideOverlay(els.pauseOverlay);
    state.paused = false;
    state.lastTime = performance.now();
    scheduleSpawn(true);
  }

  function showOverlay(el){ el.classList.remove("hidden"); }
  function hideOverlay(el){ el.classList.add("hidden"); }

  function trackPointer(e) {
    if (!screens.game.classList.contains("active")) return;
    const r = els.gameArena.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    els.crosshair.style.left = `${x}px`; els.crosshair.style.top = `${y}px`;

    const baseX = r.width/2;
    const baseY = r.height - 50;
    const angle = Math.atan2(x-baseX, baseY-y) * 180/Math.PI;
    const clamped = Math.max(-62,Math.min(62,angle));
    els.launcherHead.style.transform = `translateX(-50%) rotate(${clamped}deg)`;
  }

  function restartAll() {
    hideOverlay(els.pauseOverlay); hideOverlay(els.levelOverlay); hideOverlay(els.endOverlay);
    resetState();
    startGame();
  }

  els.startBtn.addEventListener("click", begin);
  els.studentName.addEventListener("keydown", e => { if (e.key === "Enter") begin(); });
  els.tutorialStartBtn.addEventListener("click", startGame);
  els.nextLevelBtn.addEventListener("click", nextLevel);
  els.pauseBtn.addEventListener("click", pause);
  els.resumeBtn.addEventListener("click", resume);
  els.restartFromPauseBtn.addEventListener("click", restartAll);
  els.playAgainBtn.addEventListener("click", restartAll);
  els.soundBtn.addEventListener("click", () => {
    state.sound = !state.sound;
    els.soundBtn.textContent = state.sound ? "🔊" : "🔇";
  });

  els.gameArena.addEventListener("pointermove", trackPointer);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.running && !state.paused) pause();
  });

  updateHUD();
})();