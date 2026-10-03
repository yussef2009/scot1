/* ═══════════════════════════════════════════════
   ScoutAI — Main Application Logic
   Uses Google Gemini API for video analysis
   With Dynamic Model Resolution & Resilient Fallbacks
   ═══════════════════════════════════════════════ */

// ── Verified Priority List of Stable Gemini Models ──
// If the primary/requested model is unavailable (404, deprecated, unsupported),
// rate-limited (429), or overloaded (503), the engine automatically falls
// back through this priority chain until a working model responds.
const STABLE_GEMINI_MODELS = [
  'gemini-2.5-flash',       // Fast, high-intelligence multimodal Flash
  'gemini-2.0-flash',       // Standard multimodal workhorse
  'gemini-1.5-flash',       // Universally supported reliable fallback with wide quota
  'gemini-3.1-pro-preview', // Latest recommended preview model
  'gemini-2.5-flash-lite',  // Lightweight high-throughput fallback
  'gemini-2.0-flash-lite',  // Fast fallback
  'gemini-1.5-pro',         // High-intelligence Pro fallback
];

const DEFAULT_PRIMARY_MODEL = 'gemini-2.5-flash';

// ── State ──────────────────────────────────────
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3.8-flash',
];

const state = {
  sport: 'football',
  videoFile: null,
  apiKey: localStorage.getItem('scoutai_gemini_key') || '',
  primaryModel: localStorage.getItem('scoutai_primary_model') || DEFAULT_PRIMARY_MODEL,
  activeGeminiModel: localStorage.getItem('scoutai_active_model') || DEFAULT_PRIMARY_MODEL,
  isAnalyzing: false,
  isScanning: false,
  reportData: null,
  uploadedFileUri: null,        // cached after first upload
  cachedFrames: [],             // base64 keyframes cached from scan for fast analysis
  detectedPlayers: [],          // array of player objects from scan
  selectedPlayerIds: new Set(), // which player ids are ticked
};

// ── Sport Config ────────────────────────────────
const SPORT_CONFIG = {
  football: {
    name: 'Football / Soccer',
    emoji: '⚽',
    metrics: ['Pace', 'Dribbling', 'Shooting', 'Passing', 'Defending', 'Stamina', 'Vision', 'Positioning'],
    radarLabels: ['Pace', 'Dribble', 'Shot', 'Pass', 'Defend', 'Stamina'],
    position: 'Attacker / Midfielder / Defender',
  },
  basketball: {
    name: 'Basketball',
    emoji: '🏀',
    metrics: ['Shooting', 'Ball Handling', 'Passing', 'Defense', 'Athleticism', 'Basketball IQ', 'Rebounding', 'Speed'],
    radarLabels: ['Shooting', 'Handles', 'Passing', 'Defense', 'Athleticism', 'IQ'],
    position: 'Guard / Forward / Center',
  },
  tennis: {
    name: 'Tennis',
    emoji: '🎾',
    metrics: ['Serve', 'Forehand', 'Backhand', 'Volley', 'Footwork', 'Mental Strength', 'Consistency', 'Power'],
    radarLabels: ['Serve', 'Forehand', 'Backhand', 'Volley', 'Footwork', 'Mental'],
    position: 'Baseline / Net player',
  },
  swimming: {
    name: 'Swimming',
    emoji: '🏊',
    metrics: ['Technique', 'Stroke Rate', 'Turn Efficiency', 'Breathing', 'Endurance', 'Start', 'Kick', 'Arm Pull'],
    radarLabels: ['Technique', 'Stroke', 'Turns', 'Breathing', 'Endurance', 'Start'],
    position: 'Freestyle / Backstroke / etc.',
  },
  athletics: {
    name: 'Athletics',
    emoji: '🏃',
    metrics: ['Speed', 'Acceleration', 'Technique', 'Endurance', 'Reaction Time', 'Form', 'Stride Length', 'Efficiency'],
    radarLabels: ['Speed', 'Accel', 'Technique', 'Endurance', 'Reaction', 'Form'],
    position: 'Sprinter / Long-distance / Jumper',
  },
  volleyball: {
    name: 'Volleyball',
    emoji: '🏐',
    metrics: ['Serving', 'Spiking', 'Blocking', 'Setting', 'Digging', 'Positioning', 'Teamwork', 'Jump'],
    radarLabels: ['Serve', 'Spike', 'Block', 'Set', 'Dig', 'Positioning'],
    position: 'Setter / Libero / Spiker',
  },
  boxing: {
    name: 'Boxing',
    emoji: '🥊',
    metrics: ['Jab', 'Cross', 'Hook', 'Defense', 'Footwork', 'Chin', 'Power', 'Stamina'],
    radarLabels: ['Jab', 'Power', 'Defense', 'Footwork', 'Chin', 'Stamina'],
    position: 'Orthodox / Southpaw',
  },
  gymnastics: {
    name: 'Gymnastics',
    emoji: '🤸',
    metrics: ['Flexibility', 'Balance', 'Strength', 'Coordination', 'Artistry', 'Landings', 'Difficulty', 'Execution'],
    radarLabels: ['Flexibility', 'Balance', 'Strength', 'Coord.', 'Artistry', 'Execution'],
    position: 'Artistic / Rhythmic',
  },
  cycling: {
    name: 'Cycling',
    emoji: '🚴',
    metrics: ['Power Output', 'Cadence', 'Climbing', 'Sprinting', 'Aerodynamics', 'Endurance', 'Cornering', 'Recovery'],
    radarLabels: ['Power', 'Cadence', 'Climbing', 'Sprint', 'Aero', 'Endurance'],
    position: 'Climber / Sprinter / All-rounder',
  },
  baseball: {
    name: 'Baseball',
    emoji: '⚾',
    metrics: ['Batting Avg', 'Power', 'Contact', 'Speed', 'Fielding', 'Arm Strength', 'Pitch Velocity', 'Control'],
    radarLabels: ['Batting', 'Power', 'Contact', 'Speed', 'Fielding', 'Arm'],
    position: 'Pitcher / Batter / Fielder',
  },
};

// ── DOM References ──────────────────────────────
const $ = id => document.getElementById(id);
const els = {
  sportsGrid: $('sportsGrid'),
  uploadZone: $('uploadZone'),
  videoInput: $('videoInput'),
  chooseFileBtn: $('chooseFileBtn'),
  videoPreviewWrap: $('videoPreviewWrap'),
  videoPreview: $('videoPreview'),
  videoMeta: $('videoMeta'),
  // Player detection
  scanPlayersBtn: $('scanPlayersBtn'),
  playerDetectBanner: $('playerDetectBanner'),
  pdbCount: $('pdbCount'),
  pdbSub: $('pdbSub'),
  pdbReset: $('pdbReset'),
  playerSelectArea: $('playerSelectArea'),
  playerCardsGrid: $('playerCardsGrid'),
  selectAllBtn: $('selectAllBtn'),
  clearAllBtn: $('clearAllBtn'),
  psaNote: $('psaNote'),
  analyzeBtn: $('analyzeBtn'),
  analyzeBtnLabel: $('analyzeBtnLabel'),
  clearVideoBtn: $('clearVideoBtn'),
  // Results
  resultsSection: $('resultsSection'),
  loadingState: $('loadingState'),
  loadingLabel: $('loadingLabel'),
  reportContent: $('reportContent'),
  reportTitle: $('reportTitle'),
  reportMeta: $('reportMeta'),
  overallScoreNum: $('overallScoreNum'),
  scoreGrade: $('scoreGrade'),
  scoreSportBadge: $('scoreSportBadge'),
  scorePlayerSummary: $('scorePlayerSummary'),
  scoreOneLiner: $('scoreOneLiner'),
  scoreTags: $('scoreTags'),
  metricsGrid: $('metricsGrid'),
  strengthsList: $('strengthsList'),
  weaknessesList: $('weaknessesList'),
  recsList: $('recsList'),
  narrativeText: $('narrativeText'),
  comparisonContent: $('comparisonContent'),
  // Modals
  scanModal: $('scanModal'),
  scanModalTitle: $('scanModalTitle'),
  scanModalSub: $('scanModalSub'),
  scanProgressBar: $('scanProgressBar'),
  openApiModal: $('openApiModal'),
  closeApiModal: $('closeApiModal'),
  apiModal: $('apiModal'),
  apiKeyInput: $('apiKeyInput'),
  toggleApiVis: $('toggleApiVis'),
  saveApiKey: $('saveApiKey'),
  downloadReportBtn: $('downloadReportBtn'),
  newAnalysisBtn: $('newAnalysisBtn'),
  // Model resolution UI
  navModelBadge: $('navModelBadge'),
  navModelName: $('navModelName'),
  primaryModelSelect: $('primaryModelSelect'),
  customModelWrap: $('customModelWrap'),
  customModelInput: $('customModelInput'),
  modalActiveModelBadge: $('modalActiveModelBadge'),
  testModelBtn: $('testModelBtn'),
  testModelOutput: $('testModelOutput'),
};

// ── Chart instances ─────────────────────────────
let radarChart = null;
let barsChart = null;
let scoreRing = null;

// ═══════════════════════════════════════════════
// Sport Selection
// ═══════════════════════════════════════════════
els.sportsGrid.addEventListener('click', (e) => {
  const btn = e.target.closest('.sport-btn');
  if (!btn) return;
  document.querySelectorAll('.sport-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.sport = btn.dataset.sport;
});

// ═══════════════════════════════════════════════
// Video Upload
// ═══════════════════════════════════════════════
els.chooseFileBtn.addEventListener('click', () => els.videoInput.click());
els.uploadZone.addEventListener('click', (e) => {
  if (e.target === els.chooseFileBtn || e.target.closest('#chooseFileBtn')) return;
  els.videoInput.click();
});

els.videoInput.addEventListener('change', () => {
  const file = els.videoInput.files[0];
  if (file) handleVideoFile(file);
});

// Drag & Drop
els.uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  els.uploadZone.classList.add('drag-over');
});
els.uploadZone.addEventListener('dragleave', () => els.uploadZone.classList.remove('drag-over'));
els.uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  els.uploadZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('video/')) handleVideoFile(file);
  else showToast('Please drop a valid video file.', 'error');
});

function handleVideoFile(file) {
  state.videoFile = file;
  state.uploadedFileUri = null;    // reset cached URI on new file
  state.cachedFrames = [];
  state.detectedPlayers = [];
  state.selectedPlayerIds.clear();
  const url = URL.createObjectURL(file);
  els.videoPreview.src = url;
  els.videoMeta.textContent = `📁 ${file.name}  ·  ${formatBytes(file.size)}  ·  ${file.type}`;
  els.uploadZone.classList.add('hidden');
  els.videoPreviewWrap.classList.remove('hidden');
  // Hide player UI, show scan button
  els.playerDetectBanner.classList.add('hidden');
  els.playerSelectArea.classList.add('hidden');
  els.scanPlayersBtn.classList.remove('hidden');
  els.analyzeBtn.classList.add('hidden');
  setTimeout(() => els.videoPreviewWrap.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
}

els.clearVideoBtn.addEventListener('click', () => {
  state.videoFile = null;
  state.uploadedFileUri = null;
  state.cachedFrames = [];
  state.detectedPlayers = [];
  state.selectedPlayerIds.clear();
  els.videoInput.value = '';
  els.videoPreview.src = '';
  els.videoPreviewWrap.classList.add('hidden');
  els.uploadZone.classList.remove('hidden');
  els.playerDetectBanner.classList.add('hidden');
  els.playerSelectArea.classList.add('hidden');
  els.analyzeBtn.classList.add('hidden');
  els.scanPlayersBtn.classList.remove('hidden');
});

// ═══════════════════════════════════════════════
// Player Detection (Scan Phase)
// ═══════════════════════════════════════════════
els.scanPlayersBtn.addEventListener('click', () => startScan());
els.pdbReset.addEventListener('click', () => startScan(true));

async function startScan(force = false) {
  if (!state.videoFile) return;
  if (!state.apiKey) {
    showToast('Please add your Gemini API key first.', 'info');
    showApiModal();
    return;
  }
  if (state.isScanning) return;
  state.isScanning = true;
  els.scanPlayersBtn.disabled = true;

  // Hide any existing error card
  const existingErr = document.getElementById('scanErrorCard');
  if (existingErr) existingErr.classList.add('hidden');

  // Show animated scan modal
  showScanModal('Scanning Video for Players...', 'Extracting video frames for AI analysis...');

  try {
    let players = [];

    // Fast path: Instant frame capture from local video element
    try {
      updateScanModalSub('Extracting video keyframes...');
      const frames = await extractVideoFrames(els.videoPreview, 5);
      if (frames && frames.length > 0) {
        state.cachedFrames = frames;
        updateScanModalSub('Analyzing keyframes with AI vision...');
        players = await detectPlayersWithFrames(frames);
      }
    } catch (frameErr) {
      console.warn('Frame-based scan failed:', frameErr);
      if (/high demand|overloaded|resource has been exhausted|try again later/i.test(frameErr.message || '')) {
        throw frameErr;
      }
      updateScanModalSub('Trying full video player detection...');
    }

    // Fallback: if frame capture returned no players or the AI call failed, use Files API
    if (!players || players.length === 0) {
      if (!state.uploadedFileUri || force) {
        state.uploadedFileUri = await uploadVideoToGemini(state.videoFile, (msg) => updateScanModalSub(msg));
      }
      updateScanModalSub('Running full video player detection...');
      players = await detectPlayersWithGemini(state.uploadedFileUri);
    }

    state.detectedPlayers = players;
    state.selectedPlayerIds.clear();
    hideScanModal();
    renderPlayerCards(players);
  } catch (err) {
    hideScanModal();
    console.error(err);
    showScanErrorBanner(err.message);
  } finally {
    state.isScanning = false;
    els.scanPlayersBtn.disabled = false;
  }
}

function updateScanModalSub(text) {
  if (els.scanModalSub) els.scanModalSub.textContent = text;
}

function showScanErrorBanner(msg) {
  els.scanPlayersBtn.classList.add('hidden');
  els.playerDetectBanner.classList.add('hidden');
  els.playerSelectArea.classList.add('hidden');

  let errCard = document.getElementById('scanErrorCard');
  if (!errCard) {
    errCard = document.createElement('div');
    errCard.id = 'scanErrorCard';
    els.videoPreviewWrap.appendChild(errCard);
  }
  errCard.className = 'glass-card';
  errCard.style.cssText = 'padding: 24px; border: 1px solid rgba(244,63,94,0.3); background: rgba(244,63,94,0.08); margin-top: 16px; border-radius: var(--radius); text-align: center; color: var(--text-1);';
  errCard.innerHTML = `
    <div style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">⚠️ Player Detection Notice</div>
    <div style="font-size: 14px; color: var(--text-2); margin-bottom: 18px; max-width: 540px; margin-left: auto; margin-right: auto; line-height: 1.5;">
      ${msg}
    </div>
    <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
      <button class="btn-secondary" id="retryScanBtn" style="padding: 10px 20px;">🔄 Retry Player Scan</button>
      <button class="btn-primary" id="skipScanBtn" style="padding: 10px 20px;">Proceed to Full Video Analysis ➔</button>
    </div>
  `;
  errCard.classList.remove('hidden');

  document.getElementById('retryScanBtn').onclick = () => {
    errCard.classList.add('hidden');
    startScan(true);
  };
  document.getElementById('skipScanBtn').onclick = () => {
    errCard.classList.add('hidden');
    enableDirectAnalysis();
  };
}

// ── Extract Keyframes from Video ───────────────
async function extractVideoFrames(videoEl, numFrames = 3) {
  return new Promise((resolve) => {
    try {
      if (!videoEl) return resolve([]);

      const attemptExtraction = () => {
        if (!videoEl.duration || isNaN(videoEl.duration) || videoEl.duration <= 0) {
          return resolve([]);
        }
        const frames = [];
        const duration = videoEl.duration;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const width = videoEl.videoWidth || 1280;
        const height = videoEl.videoHeight || 720;
        const scale = Math.min(1, 960 / Math.max(1, width));
        canvas.width = Math.max(1, Math.floor(width * scale));
        canvas.height = Math.max(1, Math.floor(height * scale));

        const timestamps = [];
        for (let i = 1; i <= numFrames; i++) {
          timestamps.push((duration / (numFrames + 1)) * i);
        }

        let currentIndex = 0;
        const originalTime = videoEl.currentTime;

        const finish = () => {
          videoEl.onseeked = null;
          try { videoEl.currentTime = originalTime; } catch (e) { }
          resolve(frames);
        };

        const timeout = setTimeout(() => { finish(); }, 4000);

        videoEl.onseeked = () => {
          try {
            ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
            const base64Data = dataUrl.split(',')[1];
            if (base64Data) frames.push(base64Data);
          } catch (e) {
            console.warn('Frame capture error:', e);
          }
          currentIndex++;
          if (currentIndex < timestamps.length) {
            videoEl.currentTime = timestamps[currentIndex];
          } else {
            clearTimeout(timeout);
            finish();
          }
        };

        videoEl.currentTime = timestamps[0];
      };

      if (videoEl.readyState >= 1) {
        attemptExtraction();
      } else {
        const onMeta = () => {
          videoEl.removeEventListener('loadedmetadata', onMeta);
          attemptExtraction();
        };
        videoEl.addEventListener('loadedmetadata', onMeta);
        setTimeout(() => {
          videoEl.removeEventListener('loadedmetadata', onMeta);
          attemptExtraction();
        }, 2000);
      }
    } catch (e) {
      console.warn('Frame extraction failed:', e);
      resolve([]);
    }
  });
}

// Robust JSON extraction from AI response
function cleanAndParseJSON(text) {
  if (!text) throw new Error('Empty response received from AI server.');
  let cleaned = text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e2) { }
    }
    throw new Error('AI returned an invalid JSON format. Please try again.');
  }
}

// ── Player detection via Frame Images ──────────
async function detectPlayersWithFrames(frames) {
  const cfg = SPORT_CONFIG[state.sport];
  const prompt = `You are analyzing ${frames.length} keyframes from a ${cfg.name} sports video.

NOTE: Players in the video may be filmed from behind / back view (e.g. back of jersey facing the camera). Pay attention to jersey numbers on the back, jersey color, hair style, physique, and court/pitch positioning to detect each player.

Identify ALL individual players visible across these video frames. For each player provide:
- A unique identifier (jersey number if visible on back/front, or a descriptive label like "#12 Blue", "#11 Blue", "White #4 Setter", etc.)
- Their team/side (e.g. home/away, left/right, team color)
- Their apparent position or role
- A brief visual description (jersey color, back number, appearance)
- A dominant skill or characteristic you can observe

Return ONLY valid JSON in this exact format:
{
  "playerCount": <total number of distinct players detected>,
  "isSinglePlayer": <true if only 1 person in video, false otherwise>,
  "players": [
    {
      "id": "P1",
      "label": "<jersey number or descriptive name>",
      "team": "<team name or color>",
      "teamColor": "<hex color code representing team color>",
      "position": "<position or role>",
      "description": "<visual description>",
      "standoutTrait": "<most notable trait>",
      "emoji": "<one emoji representing style>"
    }
  ]
}

If the video has only one player, return them in an array with 1 element and set isSinglePlayer to true.
Return ONLY valid JSON, no extra text.`;

  const parts = frames.map(f => ({
    inlineData: { mimeType: 'image/jpeg', data: f }
  }));
  parts.push({ text: prompt });

  const body = {
    contents: [{ role: 'user', parts }],
  };

  return requestPlayerScan(body);
}

// ── Enable direct analysis (fallback or single-player video) ──
function enableDirectAnalysis() {
  els.scanPlayersBtn.classList.add('hidden');
  els.playerDetectBanner.classList.add('hidden');
  els.playerSelectArea.classList.add('hidden');
  els.analyzeBtn.classList.remove('hidden');
  els.analyzeBtnLabel.textContent = 'Analyze Performance';
}

// ── Player detection Gemini call (URI Fallback) ──
async function detectPlayersWithGemini(fileUri) {
  const cfg = SPORT_CONFIG[state.sport];
  const prompt = `You are analyzing a ${cfg.name} sports video.

Identify ALL individual players visible in this video. For each player provide:
- A unique identifier (jersey number if visible, or a descriptive label like "Player A", "Red team #7", etc.)
- Their team/side (e.g. home/away, left/right, team color)
- Their apparent position or role
- A brief visual description (jersey color, number, appearance)
- A dominant skill or characteristic you can observe

Return ONLY valid JSON in this exact format:
{
  "playerCount": <total number of distinct players detected>,
  "isSinglePlayer": <true if only 1 person in video, false otherwise>,
  "players": [
    {
      "id": "P1",
      "label": "<jersey number or descriptive name>",
      "team": "<team name or color>",
      "teamColor": "<hex color code representing team color, e.g. #e53e3e>",
      "position": "<position or role>",
      "description": "<visual description>",
      "standoutTrait": "<most notable observable skill/characteristic>",
      "emoji": "<one emoji that represents this player's style>"
    }
  ]
}

If the video has only one player or only one person of interest, still return them as an array with 1 element and set isSinglePlayer to true.
Return ONLY valid JSON, no extra text.`;

  const body = {
    contents: [{
      role: 'user', parts: [
        { fileData: { mimeType: 'video/mp4', fileUri } },
        { text: prompt },
      ]
    }],
  };

  return requestPlayerScan(body);
}

// ── Render Player Cards ─────────────────────────
function renderPlayerCards(players) {
  if (!players || players.length === 0) {
    enableDirectAnalysis();
    showToast('No distinct players detected. Running full analysis.', 'info');
    return;
  }

  // Single player → skip selection, go straight to analyze
  if (players.length === 1) {
    state.selectedPlayerIds.add(players[0].id);
    els.scanPlayersBtn.classList.add('hidden');
    els.playerDetectBanner.classList.remove('hidden');
    els.pdbCount.textContent = `1 player detected — ${players[0].label}`;
    els.pdbSub.textContent = players[0].description;
    els.playerSelectArea.classList.add('hidden');
    els.analyzeBtn.classList.remove('hidden');
    els.analyzeBtnLabel.textContent = 'Analyze Player';
    return;
  }

  // Multiple players → show selection UI
  els.scanPlayersBtn.classList.add('hidden');
  els.playerDetectBanner.classList.remove('hidden');
  els.pdbCount.textContent = `${players.length} players detected`;
  els.pdbSub.textContent = 'Tap the cards below to select who you want to analyze';
  els.playerSelectArea.classList.remove('hidden');

  els.playerCardsGrid.innerHTML = players.map(p => `
    <div class="player-card" data-pid="${p.id}" id="pc-${p.id}">
      <div class="pc-check">✓</div>
      <div class="pc-avatar" style="background: ${p.teamColor || 'rgba(99,102,241,0.2)'}22">
        ${p.emoji || '👤'}
      </div>
      <div class="pc-number">${p.label}</div>
      <div class="pc-name">${p.position}</div>
      <div class="pc-role">${p.description}</div>
      <div class="pc-team-color" style="background: ${p.teamColor || '#6366f1'}"></div>
    </div>
  `).join('');

  // Card click toggles selection
  els.playerCardsGrid.querySelectorAll('.player-card').forEach(card => {
    card.addEventListener('click', () => togglePlayerCard(card));
  });

  updateAnalyzeButton();
}

function togglePlayerCard(card) {
  const pid = card.dataset.pid;
  if (state.selectedPlayerIds.has(pid)) {
    state.selectedPlayerIds.delete(pid);
    card.classList.remove('selected');
  } else {
    state.selectedPlayerIds.add(pid);
    card.classList.add('selected');
  }
  updateAnalyzeButton();
}

function updateAnalyzeButton() {
  const count = state.selectedPlayerIds.size;
  if (count === 0) {
    els.analyzeBtn.classList.add('hidden');
  } else {
    els.analyzeBtn.classList.remove('hidden');
    if (count === 1) {
      const pid = [...state.selectedPlayerIds][0];
      const p = state.detectedPlayers.find(x => x.id === pid);
      els.analyzeBtnLabel.textContent = p ? `Analyze ${p.label}` : 'Analyze Selected Player';
    } else {
      els.analyzeBtnLabel.textContent = `Analyze ${count} Players`;
    }
  }
}

// Select All / Clear All
els.selectAllBtn.addEventListener('click', () => {
  state.detectedPlayers.forEach(p => {
    state.selectedPlayerIds.add(p.id);
    const card = document.getElementById(`pc-${p.id}`);
    if (card) card.classList.add('selected');
  });
  updateAnalyzeButton();
});
els.clearAllBtn.addEventListener('click', () => {
  state.selectedPlayerIds.clear();
  document.querySelectorAll('.player-card').forEach(c => c.classList.remove('selected'));
  updateAnalyzeButton();
});

// ── Scan Modal helpers ─────────────────────────
function showScanModal(title, sub) {
  els.scanModalTitle.textContent = title;
  els.scanModalSub.textContent = sub;
  els.scanProgressBar.style.animation = 'none';
  void els.scanProgressBar.offsetWidth;
  els.scanProgressBar.style.animation = '';
  els.scanModal.classList.remove('hidden');
}
function hideScanModal() { els.scanModal.classList.add('hidden'); }

// ═══════════════════════════════════════════════
// Analysis (Full Report)
// ═══════════════════════════════════════════════
els.analyzeBtn.addEventListener('click', startAnalysis);

async function startAnalysis() {
  if (!state.videoFile) { showToast('Please upload a video first.', 'error'); return; }
  if (!state.apiKey) {
    showToast('Please add your Gemini API key first.', 'info');
    showApiModal();
    return;
  }
  if (state.isAnalyzing) return;

  // Build player context from selection
  const selectedPlayers = state.detectedPlayers.filter(p => state.selectedPlayerIds.has(p.id));

  // If multiple players selected, analyze each one sequentially
  if (selectedPlayers.length > 1) {
    await analyzeMultiplePlayers(selectedPlayers);
    return;
  }

  const playerContext = selectedPlayers[0] || null;

  state.isAnalyzing = true;
  els.analyzeBtn.disabled = true;
  showResultsSection();
  if (playerContext) {
    els.loadingLabel.textContent = `Analyzing ${playerContext.label}...`;
  }

  try {
    // Fast path: use cached frames for instant analysis
    let frames = state.cachedFrames;
    if (!frames || frames.length === 0) {
      activateStep('ls1');
      els.loadingLabel.textContent = 'Extracting video frames...';
      frames = await extractVideoFrames(els.videoPreview, 5);
      state.cachedFrames = frames;
    } else {
      activateStep('ls1');
    }

    activateStep('ls2');
    els.loadingLabel.textContent = playerContext
      ? `Analyzing ${playerContext.label} with AI...`
      : 'Running AI performance analysis...';
    await delay(400);
    activateStep('ls3');

    const rawReport = await analyzeWithGeminiFrames(frames, playerContext);

    activateStep('ls4');
    await delay(400);
    const parsed = parseReport(rawReport);
    state.reportData = parsed;
    renderReport(parsed);

  } catch (err) {
    console.error(err);
    showToast(`Analysis failed: ${err.message}`, 'error');
    els.resultsSection.classList.add('hidden');
  } finally {
    state.isAnalyzing = false;
    els.analyzeBtn.disabled = false;
  }
}

// Analyze multiple players one-by-one, appending reports
async function analyzeMultiplePlayers(players) {
  state.isAnalyzing = true;
  els.analyzeBtn.disabled = true;

  showResultsSection();
  const reports = [];

  // Create a tab bar at top of results
  let tabs = document.getElementById('multiPlayerTabs');
  if (!tabs) {
    tabs = document.createElement('div');
    tabs.id = 'multiPlayerTabs';
    tabs.className = 'multi-player-tabs';
    els.resultsSection.insertBefore(tabs, els.loadingState);
  }
  tabs.classList.remove('hidden');
  tabs.innerHTML = players.map((p, i) => `
    <button class="multi-tab ${i === 0 ? 'active' : ''} pending" data-idx="${i}" id="mtab-${i}">
      ${p.emoji || '👤'} ${p.label}
    </button>
  `).join('');

  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const tab = document.getElementById(`mtab-${i}`);
    els.loadingLabel.textContent = `Analyzing player ${i + 1} of ${players.length}: ${p.label}...`;
    activateStep('ls2');

    try {
      let frames = state.cachedFrames;
      if (!frames || frames.length === 0) {
        frames = await extractVideoFrames(els.videoPreview, 5);
        state.cachedFrames = frames;
      }
      activateStep('ls3');
      const raw = await analyzeWithGeminiFrames(frames, p);
      activateStep('ls4');
      const parsed = parseReport(raw);
      reports.push({ player: p, report: parsed });
      if (tab) {
        tab.classList.remove('pending');
        tab.classList.add('done');
      }
    } catch (e) {
      console.warn(`Analysis failed for ${p.label}:`, e);
      reports.push({ player: p, report: null, error: e.message });
      if (tab) {
        tab.classList.remove('pending');
        tab.classList.add('error');
      }
    }
  }

  // Helper to switch tab
  function showMultiReport(idx) {
    tabs.querySelectorAll('.multi-tab').forEach((t, i) => {
      t.classList.toggle('active', i === idx);
    });
    const entry = reports[idx];
    if (entry && entry.report) {
      renderReport(entry.report);
    } else if (entry && entry.error) {
      showToast(`Analysis failed for ${entry.player.label}: ${entry.error}`, 'error');
    }
  }

  tabs.querySelectorAll('.multi-tab').forEach((t, i) => t.addEventListener('click', () => showMultiReport(i)));
  const firstOk = reports.findIndex(r => r.report);
  showMultiReport(firstOk >= 0 ? firstOk : 0);

  state.isAnalyzing = false;
  els.analyzeBtn.disabled = false;
}

// ── Upload video to Gemini Files API ──────────
async function uploadVideoToGemini(file, statusCallback = null) {
  const mimeType = file.type || 'video/mp4';
  if (statusCallback) statusCallback('Starting video upload to AI server...');

  // Start resumable upload
  const startRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${state.apiKey}`,
    {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': file.size,
        'X-Goog-Upload-Header-Content-Type': mimeType,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file: { display_name: file.name } }),
    }
  );
  if (!startRes.ok) {
    const err = await startRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Upload start failed (${startRes.status})`);
  }
  const uploadUrl = startRes.headers.get('X-Goog-Upload-URL');

  if (statusCallback) statusCallback('Uploading video data...');

  // Upload binary
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Command': 'upload, finalize',
      'X-Goog-Upload-Offset': '0',
      'Content-Length': file.size,
    },
    body: file,
  });
  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Upload failed (${uploadRes.status})`);
  }
  const fileInfo = await uploadRes.json();
  const uri = fileInfo.file?.uri;
  if (!uri) throw new Error('No file URI returned from upload');

  // Wait for file to be ACTIVE (max 45 retries / 90 seconds)
  let fileState = fileInfo.file?.state;
  let pollUri = fileInfo.file?.name;
  let attempts = 0;
  const maxAttempts = 45;

  while (fileState !== 'ACTIVE') {
    attempts++;
    if (attempts > maxAttempts) {
      throw new Error('Video processing timed out on AI server (90s). Please try a shorter video snippet.');
    }
    const elapsedSec = attempts * 2;
    if (statusCallback) statusCallback(`Processing video on AI server (${elapsedSec}s elapsed)...`);
    await delay(2000);
    const poll = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${pollUri}?key=${state.apiKey}`
    );
    const pollData = await poll.json();
    fileState = pollData.file?.state;
    if (fileState === 'FAILED') throw new Error('Video processing failed on server.');
  }
  return uri;
}

// ── Call Gemini Vision (frame-based, fast — no upload wait) ────
async function analyzeWithGeminiFrames(frames, playerContext = null) {
  const cfg = SPORT_CONFIG[state.sport];
  const prompt = buildPrompt(cfg, playerContext);

  if (!frames || frames.length === 0) {
    throw new Error('No video frames available. Please re-scan the video first.');
  }

  const parts = frames.map(f => ({
    inlineData: { mimeType: 'image/jpeg', data: f }
  }));
  parts.push({ text: prompt });

  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
    },
  };

  return geminiGenerate(body);
}

// ── Fallback: Call Gemini Vision with uploaded file URI ────────
async function analyzeWithGemini(fileUri, playerContext = null) {
  const cfg = SPORT_CONFIG[state.sport];
  const prompt = buildPrompt(cfg, playerContext);

  const body = {
    contents: [{
      role: 'user',
      parts: [
        { fileData: { mimeType: 'video/mp4', fileUri } },
        { text: prompt },
      ],
    }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
    },
  };

  return geminiGenerate(body);
}

// ── Build Analysis Prompt ──────────────────────
function buildPrompt(cfg, playerContext = null) {
  const playerFocus = playerContext
    ? `\n\nFOCUS: Analyze ONLY the specific player described below. Ignore all other players in the video.\nPlayer to analyze:\n- Label/Number: ${playerContext.label}\n- Team/Side: ${playerContext.team}\n- Description: ${playerContext.description}\n- Position: ${playerContext.position}\n- Standout trait: ${playerContext.standoutTrait}\n\nNote: Players may be filmed from behind / back view (e.g. back of jersey). Use jersey numbers on back, physique, hair style, team colors, and court/pitch positioning to track and analyze them.`
    : '';

  return `You are a world-class professional sports scout analyzing a ${cfg.name} athlete's video footage.${playerFocus}

Analyze the video carefully and produce a comprehensive scouting report in the following JSON format:

{
  "overallScore": <integer 0-100>,
  "overallGrade": <"S"|"A"|"B"|"C"|"D">,
  "playerSummary": <short headline describing the player, e.g. "Dynamic Left-footed Winger">,
  "oneLiner": <one powerful sentence summarizing the player's style>,
  "tags": [<3-5 keyword tags like "Explosive", "Technical", "Left-footed">],
  "metrics": [
    ${cfg.metrics.map(m => `{"name": "${m}", "score": <0-100>, "note": "<brief observation>"}`).join(',\n    ')}
  ],
  "strengths": [
    <3-4 specific observable strengths from this footage>
  ],
  "weaknesses": [
    <2-3 specific observable areas to improve from this footage>
  ],
  "recommendations": [
    <3 concrete training drills or tactical adjustments for this player>
  ],
  "narrative": <a detailed 3-paragraph professional scouting report: Paragraph 1 on physical/technical profile, Paragraph 2 on tactical execution and gameplay, Paragraph 3 on developmental ceiling and pathway>,
  "proComparisons": [
    {
      "name": "<well-known pro player in this sport>",
      "similarity": "<percentage string like 85%>",
      "reason": "<why this player's style or technique resembles them>",
      "emoji": "<player emoji or country flag>"
    }
  ]
}

Calibrate scores realistically:
- 50 = average amateur
- 70 = good club player
- 85+ = elite / academy talent
- Grade S = 85+, A = 70-84, B = 55-69, C = 40-54, D = <40
- Be specific about what you see in the video, not generic praise
- The narrative should feel like it was written by an experienced human scout
- Return ONLY valid JSON, no extra text`;
}

// ── Parse & Validate Report ───────────────────
function parseReport(raw) {
  try {
    return cleanAndParseJSON(raw);
  } catch (err) {
    throw new Error(`Could not parse AI response: ${err.message}`);
  }
}

// ═══════════════════════════════════════════════
// Render Report
// ═══════════════════════════════════════════════

function getReportHTML() {
  return `
    <div class="overall-score-card" id="overallScoreCard">
      <div class="score-left">
        <div class="score-ring-wrap">
          <canvas id="scoreRing" width="160" height="160"></canvas>
          <div class="score-center">
            <span class="score-num" id="overallScoreNum">--</span>
            <span class="score-label">/ 100</span>
          </div>
        </div>
        <div class="score-grade" id="scoreGrade">—</div>
        <div class="score-grade-label">Overall Grade</div>
      </div>
      <div class="score-right">
        <div class="score-sport-badge" id="scoreSportBadge"></div>
        <h3 id="scorePlayerSummary">Analyzing...</h3>
        <p id="scoreOneLiner"></p>
        <div class="score-tags" id="scoreTags"></div>
      </div>
    </div>
    <div class="stats-row">
      <div class="glass-card radar-card">
        <h3 class="card-title">Performance Radar</h3>
        <div class="radar-wrap"><canvas id="radarChart"></canvas></div>
      </div>
      <div class="glass-card bars-card">
        <h3 class="card-title">Metric Breakdown</h3>
        <div class="bars-wrap"><canvas id="barsChart"></canvas></div>
      </div>
    </div>
    <div class="metrics-grid" id="metricsGrid"></div>
    <div class="sw-row">
      <div class="glass-card sw-card strengths-card">
        <h3 class="card-title"><span class="card-icon green">✦</span> Strengths</h3>
        <ul class="sw-list" id="strengthsList"></ul>
      </div>
      <div class="glass-card sw-card weaknesses-card">
        <h3 class="card-title"><span class="card-icon red">✦</span> Areas to Improve</h3>
        <ul class="sw-list" id="weaknessesList"></ul>
      </div>
    </div>
    <div class="glass-card recs-card">
      <h3 class="card-title"><span class="card-icon blue">⚡</span> AI Recommendations</h3>
      <div class="recs-list" id="recsList"></div>
    </div>
    <div class="glass-card narrative-card">
      <h3 class="card-title"><span class="card-icon purple">📋</span> Full Scout's Report</h3>
      <div class="narrative-text" id="narrativeText"></div>
    </div>
    <div class="glass-card comparison-card">
      <h3 class="card-title"><span class="card-icon gold">🏆</span> Pro Player Comparison</h3>
      <div class="comparison-content" id="comparisonContent"></div>
    </div>
    <div class="report-actions">
      <button class="btn-primary" id="downloadReportBtn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Download Report
      </button>
      <button class="btn-secondary" id="newAnalysisBtn">Analyze Another Video</button>
    </div>
  `;
}

function fillReportDOM(d, cfg) {
  const g = id => document.getElementById(id);

  g('overallScoreNum').textContent = d.overallScore;
  const gradeEl = g('scoreGrade');
  gradeEl.textContent = d.overallGrade;
  gradeEl.className = `score-grade score-${d.overallGrade?.toLowerCase()}`;
  g('scoreSportBadge').textContent = `${cfg.emoji} ${cfg.name}`;
  g('scorePlayerSummary').textContent = d.playerSummary || '';
  g('scoreOneLiner').textContent = d.oneLiner || '';
  g('scoreTags').innerHTML = (d.tags || []).map(t => `<span class="score-tag">${t}</span>`).join('');

  renderScoreRing(d.overallScore);
  renderRadar(d, cfg);
  renderBars(d);
  renderMetrics(d.metrics);

  g('strengthsList').innerHTML = (d.strengths || []).map(s => `<li>${s}</li>`).join('');
  g('weaknessesList').innerHTML = (d.weaknesses || []).map(s => `<li>${s}</li>`).join('');
  g('recsList').innerHTML = (d.recommendations || [])
    .map((r, i) => `<div class="rec-item"><div class="rec-num">${i + 1}</div><div class="rec-text">${r}</div></div>`).join('');
  g('narrativeText').textContent = d.narrative || '';
  g('comparisonContent').innerHTML = (d.proComparisons || [])
    .map(c => `<div class="comp-player"><div class="comp-avatar">${c.emoji || '🏅'}</div><div class="comp-info"><h4>${c.name}</h4><p>${c.reason}</p><div class="comp-pct">${c.similarity} match</div></div></div>`).join('');

  // Wire download / new analysis buttons
  const dlBtn = g('downloadReportBtn');
  if (dlBtn) dlBtn.addEventListener('click', downloadReport);
  const naBtn = g('newAnalysisBtn');
  if (naBtn) naBtn.addEventListener('click', () => {
    state.videoFile = null; state.uploadedFileUri = null;
    state.detectedPlayers = []; state.selectedPlayerIds.clear();
    els.videoInput.value = ''; els.videoPreview.src = '';
    els.videoPreviewWrap.classList.add('hidden');
    els.uploadZone.classList.remove('hidden');
    els.resultsSection.classList.add('hidden');
    document.getElementById('upload-section').scrollIntoView({ behavior: 'smooth' });
  });

  // Animate bars
  setTimeout(() => {
    document.querySelectorAll('.metric-card').forEach((card, i) => {
      setTimeout(() => card.classList.add('animated'), i * 80);
    });
    document.querySelectorAll('.metric-bar-fill').forEach(bar => {
      bar.style.width = bar.dataset.width + '%';
    });
  }, 100);
}

function renderReport(d) {
  const cfg = SPORT_CONFIG[state.sport];

  // Header
  els.reportTitle.textContent = `${d.playerSummary || 'Player'} — Scout Report`;
  els.reportMeta.innerHTML = `
    <span class="meta-chip">${cfg.emoji} ${cfg.name}</span>
    <span class="meta-chip">Overall: ${d.overallScore}/100</span>
    <span class="meta-chip">Grade: ${d.overallGrade}</span>
    ${d.position ? `<span class="meta-chip">${d.position}</span>` : ''}
  `;

  // Overall Score
  els.overallScoreNum.textContent = d.overallScore;
  els.scoreGrade.textContent = d.overallGrade;
  els.scoreGrade.className = `score-grade score-${d.overallGrade?.toLowerCase()}`;
  els.scoreSportBadge.textContent = `${cfg.emoji} ${cfg.name}`;
  els.scorePlayerSummary.textContent = d.playerSummary || '';
  els.scoreOneLiner.textContent = d.oneLiner || '';
  els.scoreTags.innerHTML = (d.tags || []).map(t => `<span class="score-tag">${t}</span>`).join('');

  // Ring chart
  renderScoreRing(d.overallScore);

  // Radar
  renderRadar(d, cfg);

  // Bars
  renderBars(d);

  // Metric cards
  renderMetrics(d.metrics);

  // S&W
  els.strengthsList.innerHTML = (d.strengths || []).map(s => `<li>${s}</li>`).join('');
  els.weaknessesList.innerHTML = (d.weaknesses || []).map(s => `<li>${s}</li>`).join('');

  // Recommendations
  els.recsList.innerHTML = (d.recommendations || [])
    .map((r, i) => `
      <div class="rec-item">
        <div class="rec-num">${i + 1}</div>
        <div class="rec-text">${r}</div>
      </div>
    `).join('');

  // Narrative
  els.narrativeText.textContent = d.narrative || '';

  // Comparisons
  els.comparisonContent.innerHTML = (d.proComparisons || [])
    .map(c => `
      <div class="comp-player">
        <div class="comp-avatar">${c.emoji || '🏅'}</div>
        <div class="comp-info">
          <h4>${c.name}</h4>
          <p>${c.reason}</p>
          <div class="comp-pct">${c.similarity} match</div>
        </div>
      </div>
    `).join('');

  // Hide loading, show content
  els.loadingState.classList.add('hidden');
  els.reportContent.classList.remove('hidden');

  // Animate metric bars
  setTimeout(() => {
    document.querySelectorAll('.metric-card').forEach((card, i) => {
      setTimeout(() => card.classList.add('animated'), i * 80);
    });
    document.querySelectorAll('.metric-bar-fill').forEach(bar => {
      const w = bar.dataset.width;
      bar.style.width = w + '%';
    });
  }, 100);

  els.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderMetrics(metrics) {
  if (!metrics) return;
  const grid = $('metricsGrid');
  if (!grid) return;
  grid.innerHTML = metrics.map(m => {
    const s = m.score;
    let tier = s >= 85 ? 's' : s >= 70 ? 'a' : s >= 55 ? 'b' : s >= 40 ? 'c' : 'd';
    return `
      <div class="metric-card">
        <div class="metric-name">${m.name}</div>
        <div class="metric-score score-${tier}">${s}</div>
        <div class="metric-bar">
          <div class="metric-bar-fill bar-${tier}" style="width:0%" data-width="${s}"></div>
        </div>
        <div class="metric-label">${m.note || ''}</div>
      </div>
    `;
  }).join('');
}

function renderScoreRing(score) {
  const canvas = $('scoreRing');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (scoreRing) { scoreRing.destroy(); scoreRing = null; }

  const color = score >= 85 ? '#10b981' : score >= 70 ? '#22d3ee' : score >= 55 ? '#6366f1' : score >= 40 ? '#f59e0b' : '#f43f5e';

  scoreRing = new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [score, 100 - score],
        backgroundColor: [color, 'rgba(255,255,255,0.05)'],
        borderWidth: 0,
        borderRadius: 8,
      }],
    },
    options: {
      cutout: '78%',
      responsive: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      animation: { duration: 1200, easing: 'easeInOutQuart' },
    },
  });
}

function renderRadar(d, cfg) {
  const canvas = $('radarChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (radarChart) { radarChart.destroy(); radarChart = null; }

  const sliced = (d.metrics || []).slice(0, 6);
  const labels = sliced.map(m => m.name);
  const scores = sliced.map(m => m.score);

  radarChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels,
      datasets: [{
        label: 'Player',
        data: scores,
        backgroundColor: 'rgba(99,102,241,0.18)',
        borderColor: '#6366f1',
        borderWidth: 2,
        pointBackgroundColor: '#818cf8',
        pointRadius: 4,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        r: {
          min: 0, max: 100,
          ticks: { display: false, stepSize: 20 },
          grid: { color: 'rgba(255,255,255,0.08)' },
          angleLines: { color: 'rgba(255,255,255,0.08)' },
          pointLabels: {
            color: '#94a3b8',
            font: { size: 12, family: 'Outfit', weight: '600' },
          },
        },
      },
      animation: { duration: 1000 },
    },
  });
}

function renderBars(d) {
  const canvas = $('barsChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (barsChart) { barsChart.destroy(); barsChart = null; }

  const metrics = (d.metrics || []);
  const labels = metrics.map(m => m.name);
  const scores = metrics.map(m => m.score);
  const colors = scores.map(s =>
    s >= 85 ? '#10b981' : s >= 70 ? '#22d3ee' : s >= 55 ? '#6366f1' : s >= 40 ? '#f59e0b' : '#f43f5e'
  );

  barsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Score',
        data: scores,
        backgroundColor: colors,
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.raw}/100`,
          },
        }
      },
      scales: {
        x: {
          min: 0, max: 100,
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 11 } },
        },
        y: {
          grid: { display: false },
          ticks: { color: '#94a3b8', font: { family: 'Outfit', size: 12 } },
        },
      },
      animation: { duration: 1000 },
    },
  });
}

// ═══════════════════════════════════════════════
// UI Helpers
// ═══════════════════════════════════════════════
function showResultsSection() {
  els.resultsSection.classList.remove('hidden');
  els.loadingState.classList.remove('hidden');
  els.reportContent.classList.add('hidden');
  ['ls1', 'ls2', 'ls3', 'ls4'].forEach(id => {
    const el = $(id);
    if (el) el.classList.remove('active', 'done');
  });
  els.resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function activateStep(id) {
  ['ls1', 'ls2', 'ls3', 'ls4'].forEach(sid => {
    const el = $(sid);
    if (el && el.classList.contains('active')) el.classList.replace('active', 'done');
  });
  const current = $(id);
  if (current) current.classList.add('active');
}

function delay(ms) { return new Promise(res => setTimeout(res, ms)); }

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function showToast(msg, type = 'info', duration = null) {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.style.display = 'flex';
  t.style.alignItems = 'center';
  t.style.gap = '12px';
  t.innerHTML = `
    <span style="flex:1;">${msg}</span>
    <button style="background:none;border:none;color:inherit;font-size:16px;cursor:pointer;opacity:0.7;padding:0 4px;" onclick="this.parentElement.remove()">✕</button>
  `;
  document.body.appendChild(t);
  const time = duration || (type === 'error' ? 8000 : 3800);
  setTimeout(() => { if (t.parentElement) t.remove(); }, time);
}

// ═══════════════════════════════════════════════
// API Key & Model Settings Modal
// ═══════════════════════════════════════════════
function showApiModal() {
  els.apiKeyInput.value = state.apiKey;
  updateModelBadges();

  // Set selected value in primaryModelSelect
  const currentPrimary = state.primaryModel || DEFAULT_PRIMARY_MODEL;
  let optionFound = false;
  if (els.primaryModelSelect) {
    for (let opt of els.primaryModelSelect.options) {
      if (opt.value === currentPrimary) {
        els.primaryModelSelect.value = currentPrimary;
        optionFound = true;
        break;
      }
    }
    if (!optionFound) {
      els.primaryModelSelect.value = 'custom';
      if (els.customModelWrap) els.customModelWrap.classList.remove('hidden');
      if (els.customModelInput) els.customModelInput.value = currentPrimary;
    } else {
      if (els.customModelWrap) els.customModelWrap.classList.add('hidden');
    }
  }

  els.apiModal.classList.remove('hidden');
}

function hideApiModal() {
  els.apiModal.classList.add('hidden');
  if (els.testModelOutput) els.testModelOutput.classList.add('hidden');
}

els.openApiModal.addEventListener('click', showApiModal);
if (els.navModelBadge) els.navModelBadge.addEventListener('click', showApiModal);
els.closeApiModal.addEventListener('click', hideApiModal);
els.apiModal.addEventListener('click', (e) => { if (e.target === els.apiModal) hideApiModal(); });

els.toggleApiVis.addEventListener('click', () => {
  const input = els.apiKeyInput;
  input.type = input.type === 'password' ? 'text' : 'password';
  els.toggleApiVis.textContent = input.type === 'password' ? '👁' : '🙈';
});

if (els.primaryModelSelect) {
  els.primaryModelSelect.addEventListener('change', () => {
    if (els.primaryModelSelect.value === 'custom') {
      if (els.customModelWrap) els.customModelWrap.classList.remove('hidden');
      if (els.customModelInput) els.customModelInput.focus();
    } else {
      if (els.customModelWrap) els.customModelWrap.classList.add('hidden');
    }
  });
}

els.saveApiKey.addEventListener('click', () => {
  const key = els.apiKeyInput.value.trim();
  if (!key) { showToast('Please enter a valid API key.', 'error'); return; }
  state.apiKey = key;
  localStorage.setItem('scoutai_gemini_key', key);

  let selectedModel = els.primaryModelSelect?.value || DEFAULT_PRIMARY_MODEL;
  if (selectedModel === 'custom') {
    selectedModel = els.customModelInput?.value.trim() || DEFAULT_PRIMARY_MODEL;
  }
  state.primaryModel = selectedModel;
  localStorage.setItem('scoutai_primary_model', selectedModel);

  // Set active model to selected primary initially
  state.activeGeminiModel = selectedModel;
  localStorage.setItem('scoutai_active_model', selectedModel);

  updateModelBadges();
  hideApiModal();
  showToast('Settings saved! Dynamic Model Resolution is active.', 'success');
});

// ── Interactive Dynamic Model Resolution Test ──
if (els.testModelBtn) {
  els.testModelBtn.addEventListener('click', testModelResolution);
}

async function testModelResolution() {
  const key = (els.apiKeyInput?.value || state.apiKey || '').trim();
  if (!key) {
    showToast('Please enter your Gemini API key first.', 'error');
    els.apiKeyInput.focus();
    return;
  }
  state.apiKey = key;

  let modelToTest = els.primaryModelSelect?.value || state.primaryModel || DEFAULT_PRIMARY_MODEL;
  if (modelToTest === 'custom') {
    modelToTest = els.customModelInput?.value.trim() || DEFAULT_PRIMARY_MODEL;
  }

  els.testModelBtn.disabled = true;
  els.testModelOutput.classList.remove('hidden');
  els.testModelOutput.innerHTML = `
    <div style="display:flex; align-items:center; gap:8px; color: var(--indigo);">
      <span class="pulse-dot"></span>
      <span>Attempting connection with preferred model: <code>${modelToTest}</code>...</span>
    </div>
  `;

  const testBody = {
    contents: [{
      role: 'user',
      parts: [{ text: 'Respond with valid JSON only: {"status":"active","resolutionTest":true}' }]
    }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 64, responseMimeType: 'application/json' },
  };

  try {
    const raw = await geminiGenerate(testBody, { preferredModel: modelToTest });
    const parsed = cleanAndParseJSON(raw);
    const resolvedModel = state.activeGeminiModel;
    const didSwitch = (resolvedModel !== modelToTest);

    if (didSwitch) {
      els.testModelOutput.innerHTML = `
        <div style="color: var(--gold); font-weight: 700; margin-bottom: 6px;">
          ⚡ Dynamic Fallback Triggered & Successful!
        </div>
        <div style="font-size: 13px; color: var(--text-2); line-height: 1.5;">
          Preferred model <code style="color: var(--rose);">${modelToTest}</code> was unavailable or unsupported.<br/>
          <strong>Dynamic Model Resolution</strong> automatically switched to working alternative:
          <strong style="color: var(--emerald); font-family: var(--mono);">${resolvedModel}</strong>.
        </div>
      `;
    } else {
      els.testModelOutput.innerHTML = `
        <div style="color: var(--emerald); font-weight: 700; margin-bottom: 6px;">
          ✓ Primary Model Online & Responsive!
        </div>
        <div style="font-size: 13px; color: var(--text-2);">
          Connected directly to <strong style="color: var(--cyan); font-family: var(--mono);">${resolvedModel}</strong>.
          Priority fallback chain is on standby.
        </div>
      `;
    }
    updateModelBadges();
    showToast(`Model verified: ${resolvedModel}`, 'success');
  } catch (err) {
    els.testModelOutput.innerHTML = `
      <div style="color: var(--rose); font-weight: 700; margin-bottom: 6px;">✕ Resolution Test Failed</div>
      <div style="font-size: 13px; color: var(--text-2);">${err.message}</div>
    `;
    showToast('Resolution test failed. Check API key.', 'error');
  } finally {
    els.testModelBtn.disabled = false;
  }
}

// ═══════════════════════════════════════════════
// Download Report
// ═══════════════════════════════════════════════
els.downloadReportBtn.addEventListener('click', downloadReport);

function downloadReport() {
  if (!state.reportData) return;
  const d = state.reportData;
  const cfg = SPORT_CONFIG[state.sport];
  const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const txt = `
╔══════════════════════════════════════════════════╗
║          SCOUTAI — PROFESSIONAL SCOUTING REPORT   ║
╚══════════════════════════════════════════════════╝

Generated: ${now}
Sport:     ${cfg.emoji} ${cfg.name}
Player:    ${d.playerSummary || 'Unknown'}
Position:  ${d.position || 'N/A'}
Model:     ${state.activeGeminiModel} (Dynamic Model Resolution)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OVERALL ASSESSMENT
  Score:  ${d.overallScore}/100
  Grade:  ${d.overallGrade}
  Tags:   ${(d.tags || []).join(', ')}

  "${d.oneLiner}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PERFORMANCE METRICS
${(d.metrics || []).map(m => `  ${m.name.padEnd(20)} ${m.score}/100  ${m.note}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STRENGTHS
${(d.strengths || []).map((s, i) => `  ${i + 1}. ${s}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AREAS FOR IMPROVEMENT
${(d.weaknesses || []).map((s, i) => `  ${i + 1}. ${s}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RECOMMENDATIONS
${(d.recommendations || []).map((s, i) => `  ${i + 1}. ${s}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FULL SCOUTING NARRATIVE
${d.narrative || ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRO PLAYER COMPARISONS
${(d.proComparisons || []).map(c => `  ${c.name} — ${c.similarity} similarity\n  "${c.reason}"`).join('\n\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Powered by ScoutAI · Using Google Gemini Vision AI
  `.trim();

  const blob = new Blob([txt], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ScoutAI_Report_${d.playerSummary?.replace(/\s+/g, '_') || 'Player'}_${state.sport}.txt`;
  a.click();
}

// ═══════════════════════════════════════════════
// New Analysis
// ═══════════════════════════════════════════════
els.newAnalysisBtn.addEventListener('click', () => {
  state.videoFile = null;
  state.uploadedFileUri = null;
  state.cachedFrames = [];
  state.detectedPlayers = [];
  state.selectedPlayerIds.clear();
  els.videoInput.value = '';
  els.videoPreview.src = '';
  els.videoPreviewWrap.classList.add('hidden');
  els.uploadZone.classList.remove('hidden');
  els.resultsSection.classList.add('hidden');
  document.getElementById('upload-section').scrollIntoView({ behavior: 'smooth' });
});

// ═══════════════════════════════════════════════
// Navbar Scroll Effect
// ═══════════════════════════════════════════════
window.addEventListener('scroll', () => {
  const nav = $('navbar');
  if (!nav) return;
  if (window.scrollY > 40) {
    nav.style.background = 'rgba(7,11,24,0.95)';
  } else {
    nav.style.background = 'rgba(7,11,24,0.7)';
  }
});

// ── Live Model Discovery ─────────────────────────
async function fetchAvailableGeminiModels(apiKey = null) {
  const key = apiKey || state.apiKey;
  if (!key) return;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    if (!res.ok) return;
    const data = await res.json();
    if (!Array.isArray(data.models)) return;

    // Filter models supporting generateContent and not deprecated
    const available = data.models
      .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
      .map(m => m.name.replace(/^models\//, ''))
      .filter(name => !/gemini-2.5-pro$|gemini-1.0/i.test(name)); // filter out known deprecated

    if (available.length > 0) {
      available.sort((a, b) => {
        const score = m => {
          if (/2.5-flash$/i.test(m)) return 100;
          if (/3.1-pro/i.test(m)) return 95;
          if (/2.0-flash$/i.test(m)) return 90;
          if (/1.5-flash$/i.test(m)) return 85;
          if (/flash/i.test(m)) return 80;
          if (/pro/i.test(m)) return 70;
          return 50;
        };
        return score(b) - score(a);
      });

      console.info('[Dynamic Model Resolution] Live models available for this API key:', available);
      STABLE_GEMINI_MODELS.splice(0, STABLE_GEMINI_MODELS.length, ...new Set([...available, ...STABLE_GEMINI_MODELS]));
      updateModelBadges();
    }
  } catch (err) {
    console.warn('[Dynamic Model Resolution] Model discovery network check skipped:', err);
  }
}

// ── Auto-migrate deprecated models in state ─────
if (state.primaryModel === 'gemini-2.5-pro') {
  state.primaryModel = DEFAULT_PRIMARY_MODEL;
  localStorage.setItem('scoutai_primary_model', state.primaryModel);
}
if (state.activeGeminiModel === 'gemini-2.5-pro') {
  state.activeGeminiModel = DEFAULT_PRIMARY_MODEL;
  localStorage.setItem('scoutai_active_model', state.activeGeminiModel);
}

// ── Initialization ──────────────────────────────
updateModelBadges();

if (state.apiKey) {
  fetchAvailableGeminiModels(state.apiKey);
  console.log('[ScoutAI] API key loaded. Dynamic Model Resolution initialized. Primary:', state.primaryModel, 'Active:', state.activeGeminiModel);
} else {
  setTimeout(() => {
    showToast('Add your Gemini API key to start analyzing videos!', 'info');
  }, 1500);
}
