(function () {
  "use strict";

  const STORAGE_KEY = "speakeasy-preferences";
  const DEFAULTS = { rate: 1, pitch: 1, volume: 1, voiceURI: "", indianVoiceURI: "", darkMode: false };
  const SAMPLE_TEXT = "Somewhere between the first cup of coffee and the last light of the day, there is a moment just for you. Take a breath, settle in, and let these words find their way to you.";
  const JOKES = [
    "Why did the scarecrow win an award? Because he was outstanding in his field.",
    "I used to hate facial hair, but then it grew on me.",
    "Why don't eggs tell jokes? They'd crack each other up.",
    "What do you call fake spaghetti? An impasta.",
    "I told my computer I needed a break, and now it won't stop sending me KitKat ads.",
    "Why did the bicycle fall over? It was two-tired.",
    "I wondered why the baseball was getting bigger. Then it hit me.",
    "What do you call a bear with no teeth? A gummy bear.",
    "Why did the math book look sad? It had too many problems.",
    "I'm reading a book about anti-gravity. It's impossible to put down."
  ];
  const PRESETS = {
    greeting: "Hello there! Welcome to SpeakEasy. Take a breath, get comfortable, and let’s bring your words to life.",
    story: "At the edge of a quiet little town, a paper boat slipped into the moonlit river. It carried a tiny note that read, “The best adventures begin when you set sail.”",
    news: "Here is your feel-good update for today: a little kindness can travel a long way. A friendly hello, a thoughtful message, or a helping hand might be the best news someone hears all day.",
    sample: SAMPLE_TEXT,
    joke: ""
  };
  const HINDI_JOKES = [
    "चाय ने नौकरी क्यों छोड़ दी? क्योंकि उसे लगा कि अब उसका कप भर गया है!",
    "समोसा डॉक्टर के पास क्यों गया? क्योंकि उसके अंदर बहुत सारी बातें भरी थीं!",
    "प्रेशर कुकर इतना मशहूर क्यों हुआ? क्योंकि उसकी हर बात में दम था!",
    "आम ने पंखे से क्या कहा? भाई, ज़रा ठंडा कर दो, आम का मौसम है!",
    "कंप्यूटर चाय की दुकान पर क्यों गया? उसे एक कप डाउनलोड करना था!",
    "ट्रैफिक सिग्नल ने छुट्टी क्यों ली? वह रोज़ सबको रोकते-रोकते थक गया था!"
  ];
  const HINGLISH_JOKES = [
    "Chai ne job kyun chhodi? Kyunki uska cup already full tha!",
    "Samosa doctor ke paas kyun gaya? Uske andar bahut saari baatein bhari hui thi!",
    "Pressure cooker podcast kyun karne laga? Kyunki uski har baat mein bahut pressure tha!",
    "Mango ne fan se kya bola? Bhai, thoda chill karao, aam ka season hai!",
    "Auto wale ne shortcut poocha. Maine bola, Ctrl-Z try karo. Woh bola, boss, traffic mein undo nahi hota!",
    "Chai itni popular kyun hai? Kyunki har problem ka solution hota hai: ek cup aur!"
  ];
  const PREVIEW_TEXT = "Hello there! This is a quick preview of this voice.";
  const CHUNK_LIMIT = 220;
  let preferencesReadError = false;
  let lastJokeIndex = -1;
  const elements = {
    body: document.body,
    themeToggle: document.getElementById("theme-toggle"),
    textInput: document.getElementById("text-input"),
    highlightLayer: document.getElementById("highlight-layer"),
    textCount: document.getElementById("text-count"),
    listenEstimate: document.getElementById("listen-estimate"),
    presetList: document.querySelector(".preset-list"),
    clearButton: document.getElementById("clear-button"),
    indianVoiceSelect: document.getElementById("india-voice-select"),
    indianVoiceStatus: document.getElementById("india-voice-status"),
    indianRefreshVoices: document.getElementById("india-refresh-voices"),
    indianHindiJokeButton: document.getElementById("india-hindi-joke-button"),
    indianHinglishJokeButton: document.getElementById("india-hinglish-joke-button"),
    indianReadButton: document.getElementById("india-read-button"),
    playButton: document.getElementById("play-button"),
    pauseButton: document.getElementById("pause-button"),
    resumeButton: document.getElementById("resume-button"),
    stopButton: document.getElementById("stop-button"),
    statusLabel: document.getElementById("status-label"),
    progressTrack: document.getElementById("progress-track"),
    progressFill: document.getElementById("progress-fill"),
    equalizer: document.getElementById("equalizer"),
    rateSlider: document.getElementById("rate-slider"),
    pitchSlider: document.getElementById("pitch-slider"),
    volumeSlider: document.getElementById("volume-slider"),
    rateValue: document.getElementById("rate-value"),
    pitchValue: document.getElementById("pitch-value"),
    volumeValue: document.getElementById("volume-value"),
    resetButton: document.getElementById("reset-button"),
    browserNotice: document.getElementById("browser-notice"),
    voiceSearch: document.getElementById("voice-search"),
    languageFilter: document.getElementById("language-filter"),
    voiceSelect: document.getElementById("voice-select"),
    voiceGrid: document.getElementById("voice-grid"),
    voicesStatus: document.getElementById("voices-status"),
    toast: document.getElementById("toast"),
    studioCard: document.querySelector(".studio-card"),
    parrot: document.getElementById("parrot-companion")
  };

  const state = {
    synthesis: window.speechSynthesis || null,
    voices: [],
    selectedVoice: null,
    indianVoices: [],
    selectedIndianVoice: null,
    activeVoice: null,
    preferences: loadPreferences(),
    status: "idle",
    mode: null,
    chunks: [],
    chunkIndex: 0,
    currentPosition: 0,
    generation: 0,
    toastTimer: 0,
    voicesRetryTimer: 0,
    hasBoundary: false,
    pointerX: 0,
    pointerY: 0,
    hasPointer: false,
    lastReactiveElement: null
  };

  function loadPreferences() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return { ...DEFAULTS, ...saved };
    } catch (error) {
      preferencesReadError = true;
      return { ...DEFAULTS };
    }
  }

  function savePreferences() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.preferences));
    } catch (error) {
      showToast("Your browser couldn't save these preferences. They will reset when you leave.");
    }
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => elements.toast.classList.remove("show"), 3200);
  }

  function setTheme(isDark, persist) {
    elements.body.classList.toggle("dark-mode", isDark);
    elements.themeToggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    if (persist) {
      state.preferences.darkMode = isDark;
      savePreferences();
    }
  }

  function setupControls() {
    elements.rateSlider.value = String(state.preferences.rate);
    elements.pitchSlider.value = String(state.preferences.pitch);
    elements.volumeSlider.value = String(state.preferences.volume);
    setTheme(Boolean(state.preferences.darkMode), false);
    updateSliderLabels();

    elements.themeToggle.addEventListener("click", () => setTheme(!elements.body.classList.contains("dark-mode"), true));
    elements.textInput.addEventListener("input", () => {
      if (state.status !== "idle") stopSpeech();
      setActivePreset("");
      updateTextCount();
      renderHighlight();
      updateButtons();
      if (preferencesReadError) showToast("Saved preferences couldn't be read. Default settings are being used.");
    });
    elements.textInput.addEventListener("scroll", syncHighlightScroll);
    elements.presetList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-preset]");
      if (!button || !Object.prototype.hasOwnProperty.call(PRESETS, button.dataset.preset)) return;
      let text = PRESETS[button.dataset.preset];
      if (button.dataset.preset === "joke") {
        const choices = JOKES.map((joke, index) => index).filter((index) => index !== lastJokeIndex);
        lastJokeIndex = choices[Math.floor(Math.random() * choices.length)];
        text = JOKES[lastJokeIndex];
      }
      if (state.status !== "idle") stopSpeech();
      setActivePreset(button.dataset.preset);
      elements.textInput.value = text;
      resetProgress();
      updateTextCount();
      renderHighlight();
      updateButtons();
      if (button.dataset.preset === "sample" || button.dataset.preset === "joke") {
        elements.textInput.focus();
        showToast(button.dataset.preset === "joke" ? "Here's a fresh joke. Press Play to hear it!" : "Sample text added. Press Play when you’re ready.");
      } else {
        startSpeech(0, "speech");
      }
    });
    elements.indianVoiceSelect.addEventListener("change", () => selectIndianVoice(elements.indianVoiceSelect.value));
    elements.indianRefreshVoices.addEventListener("click", refreshVoices);
    elements.indianHindiJokeButton.addEventListener("click", () => tellIndianJoke("hindi"));
    elements.indianHinglishJokeButton.addEventListener("click", () => tellIndianJoke("hinglish"));
    elements.indianReadButton.addEventListener("click", readWithIndianVoice);
    elements.clearButton.addEventListener("click", () => {
      if (state.status !== "idle") stopSpeech();
      setActivePreset("");
      elements.textInput.value = "";
      resetProgress();
      updateTextCount();
      renderHighlight();
      updateButtons();
      elements.textInput.focus();
    });
    elements.playButton.addEventListener("click", () => startSpeech(0, "speech"));
    elements.pauseButton.addEventListener("click", pauseSpeech);
    elements.resumeButton.addEventListener("click", resumeSpeech);
    elements.stopButton.addEventListener("click", stopSpeech);
    elements.resetButton.addEventListener("click", resetSliders);
    [elements.rateSlider, elements.pitchSlider, elements.volumeSlider].forEach((slider) => {
      slider.addEventListener("input", () => {
        state.preferences.rate = Number(elements.rateSlider.value);
        state.preferences.pitch = Number(elements.pitchSlider.value);
        state.preferences.volume = Number(elements.volumeSlider.value);
        updateSliderLabels();
        updateListenEstimate();
        savePreferences();
      });
    });

    elements.voiceSearch.addEventListener("input", () => {
      renderVoiceOptions();
      renderVoiceCards();
    });
    elements.languageFilter.addEventListener("change", () => {
      renderVoiceOptions();
      renderVoiceCards();
    });
    elements.voiceSelect.addEventListener("change", () => selectVoice(elements.voiceSelect.value, true));
    elements.voiceGrid.addEventListener("click", (event) => {
      const preview = event.target.closest("[data-preview]");
      if (preview) {
        previewVoice(preview.dataset.preview);
        return;
      }
      const select = event.target.closest("[data-select]");
      if (select) selectVoice(select.dataset.select, true);
    });
    document.addEventListener("keydown", handleKeyboard);
    updateTextCount();
    renderHighlight();
    updateButtons();
  }

  function updateSliderLabels() {
    elements.rateValue.value = `${Number(elements.rateSlider.value).toFixed(1)}×`;
    elements.pitchValue.value = Number(elements.pitchSlider.value).toFixed(1);
    elements.volumeValue.value = `${Math.round(Number(elements.volumeSlider.value) * 100)}%`;
  }

  function resetSliders() {
    elements.rateSlider.value = String(DEFAULTS.rate);
    elements.pitchSlider.value = String(DEFAULTS.pitch);
    elements.volumeSlider.value = String(DEFAULTS.volume);
    state.preferences.rate = DEFAULTS.rate;
    state.preferences.pitch = DEFAULTS.pitch;
    state.preferences.volume = DEFAULTS.volume;
    updateSliderLabels();
    savePreferences();
  }

  function updateTextCount() {
    const text = elements.textInput.value;
    const words = text.trim() ? text.trim().split(/\s+/u).length : 0;
    elements.textCount.textContent = `${text.length.toLocaleString()} ${text.length === 1 ? "character" : "characters"} · ${words.toLocaleString()} ${words === 1 ? "word" : "words"}`;
    updateListenEstimate(words);
  }

  function updateListenEstimate(wordCount) {
    const words = Number.isInteger(wordCount)
      ? wordCount
      : (elements.textInput.value.trim() ? elements.textInput.value.trim().split(/\s+/u).length : 0);
    const rate = Number(elements.rateSlider.value) || 1;
    const seconds = words ? Math.max(1, Math.ceil(words * 60 / (155 * rate))) : 0;
    const estimate = seconds >= 60
      ? `About ${Math.ceil(seconds / 60)} min to listen`
      : `About ${seconds} sec to listen`;
    elements.listenEstimate.textContent = estimate;
  }

  function setActivePreset(preset) {
    elements.presetList.querySelectorAll("[data-preset]").forEach((button) => {
      const isActive = Boolean(preset) && button.dataset.preset === preset;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function renderHighlight(start, end) {
    const text = elements.textInput.value;
    elements.highlightLayer.replaceChildren();
    if (Number.isInteger(start) && Number.isInteger(end) && end > start && start < text.length) {
      const safeStart = Math.max(0, Math.min(start, text.length));
      const safeEnd = Math.max(safeStart, Math.min(end, text.length));
      elements.highlightLayer.append(document.createTextNode(text.slice(0, safeStart)));
      const mark = document.createElement("mark");
      mark.textContent = text.slice(safeStart, safeEnd);
      elements.highlightLayer.append(mark, document.createTextNode(text.slice(safeEnd)));
    } else {
      elements.highlightLayer.textContent = text;
    }
    syncHighlightScroll();
  }

  function syncHighlightScroll() {
    elements.highlightLayer.scrollTop = elements.textInput.scrollTop;
    elements.highlightLayer.scrollLeft = elements.textInput.scrollLeft;
  }

  function getChunks(text, offset) {
    const chunks = [];
    let start = offset;
    while (start < text.length) {
      while (start < text.length && /\s/u.test(text[start])) start += 1;
      if (start >= text.length) break;
      let end = Math.min(start + CHUNK_LIMIT, text.length);
      if (end < text.length) {
        const segment = text.slice(start, end);
        const punctuation = /[.!?。！？]+["'”’)\]]*(?:\s|$)/gu;
        let match;
        let lastSentenceEnd = -1;
        while ((match = punctuation.exec(segment)) !== null) lastSentenceEnd = start + punctuation.lastIndex;
        if (lastSentenceEnd > start + CHUNK_LIMIT * 0.45) {
          end = lastSentenceEnd;
        } else {
          const lastSpace = segment.lastIndexOf(" ");
          if (lastSpace > CHUNK_LIMIT * 0.45) end = start + lastSpace + 1;
        }
      }
      const value = text.slice(start, end).trimEnd();
      if (value) chunks.push({ text: value, start, end: start + value.length });
      start = end;
    }
    return chunks;
  }

  function startSpeech(offset, mode, preservePaused, voiceOverride) {
    if (!state.synthesis) return;
    if (mode === "speech" && !elements.textInput.value.trim()) {
      showToast("Add a little text first, then we can bring it to life.");
      elements.textInput.focus();
      return;
    }
    if (!state.voices.length) {
      showToast("No voices are ready yet. Check your device's speech settings and try again.");
      return;
    }
    state.generation += 1;
    const generation = state.generation;
    state.synthesis.cancel();
    state.mode = mode;
    state.activeVoice = voiceOverride || null;
    state.chunkIndex = 0;
    state.hasBoundary = false;
    const fullText = mode === "speech" ? elements.textInput.value : PREVIEW_TEXT;
    state.chunks = mode === "speech" ? getChunks(fullText, offset) : [{ text: fullText, start: 0, end: fullText.length }];
    state.currentPosition = offset;
    if (!state.chunks.length) {
      finishSpeech(generation);
      return;
    }
    setStatus("speaking", mode === "preview" ? "Playing voice preview" : "Speaking");
    if (mode === "speech") {
      updateProgress(offset);
      renderHighlight(offset, findWordEnd(fullText, offset));
    } else {
      resetProgress();
      renderHighlight();
    }
    speakNext(generation);
    if (preservePaused) {
      window.setTimeout(() => {
        if (state.generation === generation && state.status === "speaking" && state.synthesis) pauseSpeech();
      }, 0);
    }
  }

  function speakNext(generation) {
    if (generation !== state.generation || !state.synthesis) return;
    if (state.chunkIndex >= state.chunks.length) {
      finishSpeech(generation);
      return;
    }
    const chunk = state.chunks[state.chunkIndex];
    let chunkHasBoundary = false;
    const utterance = new SpeechSynthesisUtterance(chunk.text);
    const voice = state.activeVoice || state.selectedVoice;
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }
    utterance.rate = Number(elements.rateSlider.value);
    utterance.pitch = Number(elements.pitchSlider.value);
    utterance.volume = Number(elements.volumeSlider.value);
    utterance.onboundary = (event) => {
      if (generation !== state.generation || state.mode !== "speech") return;
      state.hasBoundary = true;
      chunkHasBoundary = true;
      const relative = Math.max(0, Math.min(Number(event.charIndex) || 0, chunk.text.length));
      const absolute = chunk.start + relative;
      state.currentPosition = absolute;
      const wordStart = findWordStart(elements.textInput.value, absolute);
      const wordEnd = findWordEnd(elements.textInput.value, absolute);
      renderHighlight(wordStart, wordEnd);
      updateProgress(absolute);
    };
    utterance.onstart = () => {
      if (generation !== state.generation) return;
      if (state.mode === "speech" && !chunkHasBoundary) {
        state.currentPosition = chunk.start;
        renderHighlight(chunk.start, findWordEnd(elements.textInput.value, chunk.start));
        updateProgress(chunk.start);
      }
    };
    utterance.onend = () => {
      if (generation !== state.generation) return;
      if (state.mode === "speech") {
        state.currentPosition = chunk.end;
        updateProgress(chunk.end);
      }
      state.chunkIndex += 1;
      speakNext(generation);
    };
    utterance.onerror = (event) => {
      if (generation !== state.generation || event.error === "canceled" || event.error === "interrupted") return;
      state.generation += 1;
      state.synthesis.cancel();
      setStatus("idle", "Speech stopped");
      renderHighlight();
      showToast(`Speech couldn't continue${event.error ? ` (${event.error})` : ""}. Try another voice or browser.`);
      updateButtons();
    };
    state.synthesis.speak(utterance);
  }

  function findWordStart(text, position) {
    let index = Math.max(0, Math.min(position, text.length));
    while (index > 0 && !/\s/u.test(text[index - 1])) index -= 1;
    while (index < text.length && /\s/u.test(text[index])) index += 1;
    return index;
  }

  function findWordEnd(text, position) {
    let index = Math.max(0, Math.min(position, text.length));
    while (index < text.length && !/\s/u.test(text[index])) index += 1;
    return index;
  }

  function pauseSpeech() {
    if (!state.synthesis || state.status !== "speaking") return;
    state.synthesis.pause();
    setStatus("paused", "Paused");
  }

  function resumeSpeech() {
    if (!state.synthesis || state.status !== "paused") return;
    state.synthesis.resume();
    setStatus("speaking", state.mode === "preview" ? "Playing voice preview" : "Speaking");
  }

  function stopSpeech() {
    if (!state.synthesis || state.status === "idle") return;
    state.generation += 1;
    state.synthesis.cancel();
    state.chunks = [];
    state.chunkIndex = 0;
    state.mode = null;
    state.activeVoice = null;
    resetProgress();
    renderHighlight();
    setStatus("idle", "Ready to listen");
  }

  function finishSpeech(generation) {
    if (generation !== state.generation) return;
    if (state.mode === "speech") updateProgress(elements.textInput.value.length);
    state.mode = null;
    state.activeVoice = null;
    state.chunks = [];
    state.chunkIndex = 0;
    renderHighlight();
    setStatus("idle", "Ready to listen");
  }

  function setStatus(status, label) {
    state.status = status;
    elements.statusLabel.textContent = label;
    elements.studioCard.classList.toggle("is-speaking", status === "speaking");
    elements.studioCard.classList.toggle("is-paused", status === "paused");
    elements.equalizer.setAttribute("aria-label", status === "speaking" ? "Speech is playing" : status === "paused" ? "Speech is paused" : "Audio is idle");
    elements.statusLabel.previousElementSibling.classList.toggle("is-active", status === "speaking");
    updateParrot(status);
    updateButtons();
  }

  function positionParrot(x, y) {
    const bounds = elements.parrot.getBoundingClientRect();
    const maxX = Math.max(8, window.innerWidth - bounds.width - 8);
    const maxY = Math.max(8, window.innerHeight - bounds.height - 8);
    const left = Math.max(8, Math.min(x, maxX));
    const top = Math.max(8, Math.min(y, maxY));
    elements.parrot.style.transform = `translate3d(${left}px, ${top}px, 0)`;
  }

  function followPointer(event) {
    state.pointerX = event.clientX;
    state.pointerY = event.clientY;
    state.hasPointer = true;
    updateCursorFeedback(event.target, event.clientX, event.clientY);
    if (state.status === "speaking" || state.status === "paused") {
      updateParrotGaze(event.clientX, event.clientY);
      return;
    }
    elements.parrot.classList.add("is-visible");
    elements.parrot.classList.remove("is-perched");
    positionParrot(event.clientX - 64, event.clientY - 32);
    updateParrotGaze(event.clientX, event.clientY);
  }

  function updateParrotGaze(pointerX, pointerY) {
    const rect = elements.parrot.getBoundingClientRect();
    const eyeLineX = rect.left + rect.width * 0.68;
    const eyeLineY = rect.top + rect.height * 0.3;
    const dx = pointerX - eyeLineX;
    const dy = pointerY - eyeLineY;
    const length = Math.max(1, Math.hypot(dx, dy));
    const gazeX = (dx / length) * Math.min(3, Math.abs(dx) / 80);
    const gazeY = (dy / length) * Math.min(2.7, Math.abs(dy) / 90);
    elements.parrot.querySelectorAll(".parrot-pupil").forEach((pupil) => {
      const eyeX = Number(pupil.dataset.eyeX);
      const pupilX = eyeX + gazeX;
      const pupilY = 30 + gazeY;
      pupil.setAttribute("cx", String(pupilX));
      pupil.setAttribute("cy", String(pupilY));
      const glint = elements.parrot.querySelector(`[data-glint-x="${eyeX + 1.5}"]`);
      if (glint) {
        glint.setAttribute("cx", String(pupilX + 1.5));
        glint.setAttribute("cy", String(pupilY - 1.5));
      }
    });
  }

  function updateCursorFeedback(target, clientX, clientY) {
    if (!(target instanceof Element)) return;
    const reactive = target.closest(".cursor-reactive");
    const feedbackTarget = reactive?.matches("textarea") ? reactive.closest(".text-editor-wrap") : reactive;
    if (state.lastReactiveElement && state.lastReactiveElement !== feedbackTarget) {
      state.lastReactiveElement.classList.remove("cursor-engaged");
    }
    state.lastReactiveElement = feedbackTarget;
    if (!feedbackTarget) return;
    const rect = feedbackTarget.getBoundingClientRect();
    feedbackTarget.style.setProperty("--cursor-x", `${((clientX - rect.left) / rect.width) * 100}%`);
    feedbackTarget.style.setProperty("--cursor-y", `${((clientY - rect.top) / rect.height) * 100}%`);
    const tiltX = ((clientY - rect.top) / rect.height - 0.5) * -2.8;
    const tiltY = ((clientX - rect.left) / rect.width - 0.5) * 2.8;
    feedbackTarget.style.setProperty("--tilt-x", `${tiltX.toFixed(2)}deg`);
    feedbackTarget.style.setProperty("--tilt-y", `${tiltY.toFixed(2)}deg`);
    feedbackTarget.classList.add("cursor-engaged");
  }

  function updateParrot(status) {
    const perched = status === "speaking" || status === "paused";
    elements.parrot.classList.toggle("is-perched", perched);
    elements.parrot.classList.toggle("is-talking", status === "speaking");
    if (perched) {
      elements.parrot.classList.add("is-visible");
      const rect = elements.playButton.getBoundingClientRect();
      const width = elements.parrot.getBoundingClientRect().width;
      positionParrot(rect.left + rect.width / 2 - width / 2, rect.top - 69);
    } else if (state.hasPointer) {
      positionParrot(state.pointerX - 64, state.pointerY - 32);
    }
    if (state.hasPointer) updateParrotGaze(state.pointerX, state.pointerY);
  }

  function setupParrot() {
    if (window.matchMedia("(pointer: fine)").matches) {
      document.querySelectorAll("button, a, select, input, textarea, label, .text-editor-wrap, .voice-card, .step-card, .studio-card, .india-card, .hero-art").forEach((element) => {
        element.classList.add("cursor-reactive");
      });
      document.addEventListener("pointermove", followPointer, { passive: true });
    }
    window.addEventListener("resize", () => {
      if (state.status === "speaking" || state.status === "paused") updateParrot(state.status);
      else if (state.hasPointer) positionParrot(state.pointerX - 64, state.pointerY - 32);
    }, { passive: true });
  }

  function updateButtons() {
    const supported = Boolean(state.synthesis && typeof window.SpeechSynthesisUtterance === "function");
    const hasText = Boolean(elements.textInput.value.trim());
    elements.playButton.disabled = !supported || !state.voices.length || !hasText;
    elements.pauseButton.disabled = state.status !== "speaking";
    elements.resumeButton.disabled = state.status !== "paused";
    elements.stopButton.disabled = state.status === "idle";
    const hasIndianVoice = Boolean(state.selectedIndianVoice);
    const hasHindiVoice = state.indianVoices.some(isHindiVoice);
    const hasIndianEnglishVoice = state.indianVoices.some(isIndianEnglishVoice);
    elements.indianVoiceSelect.disabled = state.indianVoices.length === 0;
    elements.indianHindiJokeButton.disabled = !supported || !hasHindiVoice;
    elements.indianHinglishJokeButton.disabled = !supported || !hasIndianEnglishVoice;
    elements.indianReadButton.disabled = !supported || !hasIndianVoice || !hasText;
  }

  function updateProgress(position) {
    const textLength = elements.textInput.value.length;
    const percent = textLength ? Math.min(100, Math.max(0, (position / textLength) * 100)) : 0;
    elements.progressFill.style.width = `${percent}%`;
    elements.progressTrack.setAttribute("aria-valuenow", String(Math.round(percent)));
  }

  function resetProgress() {
    elements.progressFill.style.width = "0%";
    elements.progressTrack.setAttribute("aria-valuenow", "0");
  }

  function previewVoice(uri) {
    const voice = state.voices.find((item) => item.voiceURI === uri);
    if (!voice) return;
    if (voice.voiceURI !== (state.selectedVoice && state.selectedVoice.voiceURI)) selectVoice(uri, false);
    startSpeech(0, "preview");
  }

  function selectVoice(uri, restartPlayback) {
    const voice = state.voices.find((item) => item.voiceURI === uri);
    if (!voice) return;
    const wasSpeaking = state.status === "speaking" && state.mode === "speech";
    const wasPaused = state.status === "paused" && state.mode === "speech";
    const resumeAt = wasSpeaking || wasPaused ? findWordStart(elements.textInput.value, state.currentPosition) : 0;
    state.selectedVoice = voice;
    state.preferences.voiceURI = voice.voiceURI;
    savePreferences();
    renderVoiceOptions();
    renderVoiceCards();
    if (restartPlayback && (wasSpeaking || wasPaused)) {
      startSpeech(resumeAt, "speech", wasPaused);
      showToast("Voice changed. Picking up from your current place.");
    }
  }

  function isIndianVoice(voice) {
    return /[-_]IN$/iu.test(voice.lang || "");
  }

  function isHindiVoice(voice) {
    return /^hi[-_]IN$/iu.test(voice.lang || "");
  }

  function isIndianEnglishVoice(voice) {
    return /^en[-_]IN$/iu.test(voice.lang || "");
  }

  function populateIndianVoices() {
    state.indianVoices = state.voices.filter(isIndianVoice).sort(compareVoicePreference);
    elements.indianVoiceSelect.replaceChildren();
    if (!state.indianVoices.length) {
      state.selectedIndianVoice = null;
      elements.indianVoiceSelect.add(new Option("No Indian voices installed", ""));
      elements.indianVoiceStatus.textContent = "No voices tagged for India were found. Install a Hindi or Indian English voice in your device’s speech settings, then reload this page.";
      elements.indianHindiJokeButton.title = "Install a Hindi (hi-IN) speech voice to use Hindi jokes.";
      elements.indianHinglishJokeButton.title = "Install an Indian English (en-IN) speech voice to use Hinglish jokes.";
      updateButtons();
      return;
    }

    const saved = state.indianVoices.find((voice) => voice.voiceURI === state.preferences.indianVoiceURI);
    state.selectedIndianVoice = saved || state.indianVoices[0];
    state.preferences.indianVoiceURI = state.selectedIndianVoice.voiceURI;
    state.indianVoices.forEach((voice) => {
      elements.indianVoiceSelect.add(new Option(`${voice.name} · ${voice.lang}`, voice.voiceURI));
    });
    elements.indianVoiceSelect.value = state.selectedIndianVoice.voiceURI;
    const hasHindi = state.indianVoices.some(isHindiVoice);
    const hasIndianEnglish = state.indianVoices.some(isIndianEnglishVoice);
    const availability = [
      hasHindi ? "Hindi ready" : "Hindi voice not installed",
      hasIndianEnglish ? "Hinglish ready" : "Indian English voice not installed"
    ];
    elements.indianVoiceStatus.textContent = `${state.indianVoices.length} installed Indian ${state.indianVoices.length === 1 ? "voice" : "voices"} · ${availability.join(" · ")}`;
    elements.indianHindiJokeButton.title = hasHindi ? "" : "Install a Hindi (hi-IN) speech voice to use Hindi jokes.";
    elements.indianHinglishJokeButton.title = hasIndianEnglish ? "" : "Install an Indian English (en-IN) speech voice to use Hinglish jokes.";
    updateButtons();
  }

  function selectIndianVoice(uri) {
    const voice = state.indianVoices.find((item) => item.voiceURI === uri);
    if (!voice) return;
    const wasSpeakingWithIndianVoice = state.status === "speaking" && state.activeVoice && isIndianVoice(state.activeVoice);
    const wasPausedWithIndianVoice = state.status === "paused" && state.activeVoice && isIndianVoice(state.activeVoice);
    const resumeAt = wasSpeakingWithIndianVoice || wasPausedWithIndianVoice
      ? findWordStart(elements.textInput.value, state.currentPosition)
      : 0;
    state.selectedIndianVoice = voice;
    state.preferences.indianVoiceURI = voice.voiceURI;
    savePreferences();
    if (wasSpeakingWithIndianVoice || wasPausedWithIndianVoice) {
      startSpeech(resumeAt, "speech", wasPausedWithIndianVoice, voice);
    }
  }

  function tellIndianJoke(language) {
    const isHindi = language === "hindi";
    const voices = isHindi
      ? state.indianVoices.filter(isHindiVoice)
      : state.indianVoices.filter(isIndianEnglishVoice);
    if (!voices.length) {
      showToast(isHindi
        ? "Install a Hindi (hi-IN) voice in your device’s speech settings to hear Hindi jokes."
        : "Install an Indian English (en-IN) voice in your device’s speech settings to hear Hinglish jokes.");
      return;
    }
    const jokes = isHindi ? HINDI_JOKES : HINGLISH_JOKES;
    const joke = jokes[Math.floor(Math.random() * jokes.length)];
    const voice = isHindi
      ? (state.selectedIndianVoice && isHindiVoice(state.selectedIndianVoice) ? state.selectedIndianVoice : voices[0])
      : (state.selectedIndianVoice && isIndianEnglishVoice(state.selectedIndianVoice) ? state.selectedIndianVoice : voices[0]);
    if (state.status !== "idle") stopSpeech();
    setActivePreset("");
    elements.textInput.value = joke;
    resetProgress();
    updateTextCount();
    renderHighlight();
    updateButtons();
    startSpeech(0, "speech", false, voice);
  }

  function readWithIndianVoice() {
    if (!state.selectedIndianVoice) {
      showToast("Install an India-tagged voice in your device’s speech settings first.");
      return;
    }
    if (!elements.textInput.value.trim()) {
      showToast("Add some text first, then your Indian voice can read it.");
      elements.textInput.focus();
      return;
    }
    startSpeech(0, "speech", false, state.selectedIndianVoice);
  }

  function setupVoices() {
    if (!state.synthesis || typeof window.SpeechSynthesisUtterance !== "function") {
      elements.browserNotice.hidden = false;
      elements.browserNotice.textContent = "Speech isn't supported in this browser. Try the latest version of Chrome, Edge, Safari, or Firefox with a speech voice installed.";
      elements.voicesStatus.textContent = "This browser does not support speech synthesis.";
      elements.voiceSelect.innerHTML = '<option value="">Speech not supported</option>';
      elements.indianVoiceSelect.replaceChildren(new Option("Speech not supported", ""));
      elements.indianVoiceStatus.textContent = "This browser does not support speech synthesis.";
      updateButtons();
      return;
    }
    loadVoices();
    if ("onvoiceschanged" in state.synthesis) state.synthesis.addEventListener("voiceschanged", loadVoices);
    let attempts = 0;
    state.voicesRetryTimer = window.setInterval(() => {
      if (state.voices.length || attempts >= 20) {
        window.clearInterval(state.voicesRetryTimer);
        if (!state.voices.length) showNoVoicesMessage();
        return;
      }
      attempts += 1;
      loadVoices();
    }, 250);
  }

  function refreshVoices() {
    if (!state.synthesis) {
      showToast("Speech voices are not supported in this browser.");
      return;
    }
    try {
      const voices = state.synthesis.getVoices();
      if (!voices || voices.length === 0) {
        elements.indianVoiceStatus.textContent = "Your browser has not returned any installed voices yet. Restart the browser after adding a voice, then refresh again.";
        showToast("No installed voices were returned. Restart your browser after adding a voice.");
        return;
      }
      loadVoices();
      if (!state.indianVoices.some(isHindiVoice)) {
        showToast("No Hindi (hi-IN) voice is available yet. Add one in your device settings, then refresh.");
      } else {
        showToast("Hindi voices refreshed and ready.");
      }
    } catch (error) {
      elements.indianVoiceStatus.textContent = "The browser could not refresh its speech voices. Restart the browser and try again.";
      showToast("The browser could not refresh its speech voices.");
    }
  }

  function loadVoices() {
    if (!state.synthesis) return;
    const voices = state.synthesis.getVoices();
    if (!voices || voices.length === 0) return;
    state.voices = Array.from(voices).sort(compareVoicePreference);
    const savedVoice = state.voices.find((voice) => voice.voiceURI === state.preferences.voiceURI);
    const defaultVoice = state.voices[0];
    state.selectedVoice = savedVoice || defaultVoice || null;
    if (!savedVoice && state.selectedVoice) state.preferences.voiceURI = state.selectedVoice.voiceURI;
    if (state.voicesRetryTimer) {
      window.clearInterval(state.voicesRetryTimer);
      state.voicesRetryTimer = 0;
    }
    elements.browserNotice.hidden = true;
    const enhancedCount = state.voices.filter(isEnhancedVoice).length;
    elements.voicesStatus.textContent = `${state.voices.length} ${state.voices.length === 1 ? "voice" : "voices"} available on this device${enhancedCount ? ` · ${enhancedCount} enhanced option${enhancedCount === 1 ? "" : "s"} identified` : ""}`;
    populateLanguageFilter();
    populateIndianVoices();
    renderVoiceOptions();
    renderVoiceCards();
    updateButtons();
    savePreferences();
  }

  function isEnhancedVoice(voice) {
    return /\b(natural|neural|enhanced|premium|online|wavenet)\b/iu.test(voice.name);
  }

  function compareVoicePreference(a, b) {
    const preferredLanguage = (navigator.language || "en").replace(/_/gu, "-").toLocaleLowerCase();
    const languageScore = (voice) => {
      const language = (voice.lang || "").replace(/_/gu, "-").toLocaleLowerCase();
      if (language === preferredLanguage) return 2;
      if (language.split("-")[0] === preferredLanguage.split("-")[0]) return 1;
      return 0;
    };
    return languageScore(b) - languageScore(a)
      || Number(isEnhancedVoice(b)) - Number(isEnhancedVoice(a))
      || Number(b.default) - Number(a.default)
      || a.lang.localeCompare(b.lang)
      || a.name.localeCompare(b.name);
  }

  function showNoVoicesMessage() {
    elements.voicesStatus.textContent = "No speech voices were found on this device.";
    elements.browserNotice.hidden = false;
    elements.browserNotice.textContent = "No voices are installed or available. Add a speech voice in your device's accessibility or language settings, then reload this page. On iPhone or iPad, check Settings → Accessibility → Spoken Content.";
    elements.voiceSelect.innerHTML = '<option value="">No voices available</option>';
    elements.voiceGrid.innerHTML = '<div class="no-voices">We couldn’t find any voices yet. Install or enable a speech voice in your device settings, then reload this page.</div>';
    updateButtons();
  }

  function populateLanguageFilter() {
    const current = elements.languageFilter.value || "all";
    const languages = Array.from(new Set(state.voices.map((voice) => voice.lang).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    elements.languageFilter.replaceChildren(new Option("All languages", "all"));
    languages.forEach((lang) => elements.languageFilter.add(new Option(lang, lang)));
    elements.languageFilter.value = languages.includes(current) ? current : "all";
  }

  function getVisibleVoices() {
    const query = elements.voiceSearch.value.trim().toLocaleLowerCase();
    const language = elements.languageFilter.value;
    return state.voices.filter((voice) => {
      const matchesLanguage = language === "all" || voice.lang === language;
      const matchesQuery = !query || `${voice.name} ${voice.lang} ${voice.voiceURI}`.toLocaleLowerCase().includes(query);
      return matchesLanguage && matchesQuery;
    });
  }

  function renderVoiceOptions() {
    const visible = getVisibleVoices();
    elements.voiceSelect.replaceChildren();
    if (!visible.length) {
      elements.voiceSelect.add(new Option("No matching voices", ""));
      elements.voiceSelect.disabled = true;
      return;
    }
    elements.voiceSelect.disabled = false;
    visible.forEach((voice) => {
      const option = new Option(`${voice.name} · ${voice.lang}${voice.default ? " · Default" : ""}`, voice.voiceURI);
      elements.voiceSelect.add(option);
    });
    if (state.selectedVoice && visible.some((voice) => voice.voiceURI === state.selectedVoice.voiceURI)) {
      elements.voiceSelect.value = state.selectedVoice.voiceURI;
    } else {
      const placeholder = new Option("Choose a voice…", "");
      elements.voiceSelect.add(placeholder, 0);
      elements.voiceSelect.value = "";
    }
  }

  function renderVoiceCards() {
    const visible = getVisibleVoices();
    elements.voiceGrid.replaceChildren();
    if (!visible.length) {
      const empty = document.createElement("div");
      empty.className = "no-voices";
      empty.textContent = state.voices.length ? "No voices match those filters. Try another search or language." : "Waiting for voices from your browser…";
      elements.voiceGrid.append(empty);
      return;
    }
    visible.forEach((voice, index) => {
      const card = document.createElement("article");
      card.className = "voice-card cursor-reactive";
      if (state.selectedVoice && state.selectedVoice.voiceURI === voice.voiceURI) card.classList.add("selected");
      const main = document.createElement("div");
      main.className = "voice-main";
      const avatar = document.createElement("span");
      avatar.className = `voice-avatar avatar-${index % 6}`;
      avatar.setAttribute("aria-hidden", "true");
      avatar.textContent = voice.name.trim().charAt(0).toLocaleUpperCase() || "♪";
      const info = document.createElement("div");
      info.className = "voice-info";
      const name = document.createElement("p");
      name.className = "voice-name";
      name.textContent = voice.name;
      const language = document.createElement("p");
      language.className = "voice-language";
      language.textContent = voice.lang || "Language not specified";
      info.append(name, language);
      if (isEnhancedVoice(voice)) {
        const quality = document.createElement("span");
        quality.className = "voice-quality-badge";
        quality.textContent = "Enhanced";
        info.append(quality);
      }
      main.append(avatar, info);
      const actions = document.createElement("div");
      actions.className = "voice-actions";
      const choose = document.createElement("button");
      choose.type = "button";
      choose.className = "voice-select-button cursor-reactive";
      choose.dataset.select = voice.voiceURI;
      choose.textContent = state.selectedVoice && state.selectedVoice.voiceURI === voice.voiceURI ? "Selected" : "Choose";
      choose.setAttribute("aria-pressed", String(Boolean(state.selectedVoice && state.selectedVoice.voiceURI === voice.voiceURI)));
      const preview = document.createElement("button");
      preview.type = "button";
      preview.className = "preview-button cursor-reactive";
      preview.dataset.preview = voice.voiceURI;
      preview.setAttribute("aria-label", `Preview ${voice.name}`);
      preview.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 12 7-12 7z"></path></svg> Preview';
      actions.append(choose, preview);
      card.append(main, actions);
      elements.voiceGrid.append(card);
    });
  }

  function handleKeyboard(event) {
    if (event.key === "Escape" && state.status !== "idle") {
      stopSpeech();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      startSpeech(0, "speech");
      return;
    }
    if (event.code === "Space" && !isTypingTarget(event.target) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      if (state.status === "speaking") pauseSpeech();
      else if (state.status === "paused") resumeSpeech();
    }
  }

  function isTypingTarget(target) {
    return target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName));
  }

  setupControls();
  setupVoices();
  setupParrot();
})();
