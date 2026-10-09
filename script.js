/**
 * ============================================================================
 * OPERATION ZERO — FPS CAMPANHA (JAVASCRIPT PURO)
 * Reforma Completa: Disparos, Animações (Pulo/Agachamento) e Gráficos da Caverna
 * ============================================================================
 */
(function () {
  'use strict';

  /* ===========================================================================
     1. CONFIGURACOES DE DIFICULDADE
     =========================================================================== */
  const DIFFICULTY_PRESETS = {
    easy: {
      label: 'FACIL',
      enemyHpMult: 0.65,
      enemyDamageMult: 0.55,
      enemySpeedMult: 0.75,
      enemyAccuracy: 0.35,
      enemyDetectRange: 8.0,
      enemyCountMult: 0.7,
      enemyAttackCooldown: 1.8,
      enemyReactionTime: 1.2
    },
    normal: {
      label: 'NORMAL',
      enemyHpMult: 1.0,
      enemyDamageMult: 1.0,
      enemySpeedMult: 1.0,
      enemyAccuracy: 0.6,
      enemyDetectRange: 13.0,
      enemyCountMult: 1.0,
      enemyAttackCooldown: 1.1,
      enemyReactionTime: 0.5
    },
    hard: {
      label: 'DIFICIL',
      enemyHpMult: 1.5,
      enemyDamageMult: 1.45,
      enemySpeedMult: 1.2,
      enemyAccuracy: 0.78,
      enemyDetectRange: 16.0,
      enemyCountMult: 1.35,
      enemyAttackCooldown: 0.85,
      enemyReactionTime: 0.25
    },
    veryhard: {
      label: 'MUITO DIFICIL',
      enemyHpMult: 2.1,
      enemyDamageMult: 1.9,
      enemySpeedMult: 1.4,
      enemyAccuracy: 0.92,
      enemyDetectRange: 19.0,
      enemyCountMult: 1.7,
      enemyAttackCooldown: 0.6,
      enemyReactionTime: 0.1
    }
  };

  /* ===========================================================================
     2. DEFINICOES DE ARMAS
     =========================================================================== */
  const WEAPON_DEFS = {
    glock: {
      id: 'glock', name: 'GLOCK 17', shortName: 'GLK',
      damage: 28, magSize: 17, reserveAmmo: 68,
      fireRate: 210, reloadTime: 1350,
      recoilImpulse: 15, recoilKick: 0.045,
      spread: 0.032, range: 20,
      noiseLevel: 0.75, silenced: false, isAuto: false,
      flashDuration: 45, flashIntensity: 0.75, flashScale: 0.7,
      smokeCount: 2, casingColor: '#eab308',
      drawFn: drawGlock
    },
    deagle: {
      id: 'deagle', name: 'DESERT EAGLE', shortName: 'DEG',
      damage: 82, magSize: 7, reserveAmmo: 28,
      fireRate: 580, reloadTime: 1950,
      recoilImpulse: 38, recoilKick: 0.11,
      spread: 0.018, range: 26,
      noiseLevel: 1.0, silenced: false, isAuto: false,
      flashDuration: 75, flashIntensity: 1.35, flashScale: 1.15,
      smokeCount: 5, casingColor: '#f59e0b',
      drawFn: drawDeagle
    },
    silenced: {
      id: 'silenced', name: 'PISTOLA SILENCIADA', shortName: 'SIL',
      damage: 24, magSize: 15, reserveAmmo: 60,
      fireRate: 260, reloadTime: 1450,
      recoilImpulse: 8, recoilKick: 0.022,
      spread: 0.022, range: 18,
      noiseLevel: 0.16, silenced: true, isAuto: false,
      flashDuration: 30, flashIntensity: 0.18, flashScale: 0.4,
      smokeCount: 1, casingColor: '#d97706',
      drawFn: drawSilenced
    },
    m4: {
      id: 'm4', name: 'M4A1', shortName: 'M4',
      damage: 34, magSize: 30, reserveAmmo: 120,
      fireRate: 100, reloadTime: 1750,
      recoilImpulse: 19, recoilKick: 0.055,
      spread: 0.048, range: 28,
      noiseLevel: 0.92, silenced: false, isAuto: true,
      flashDuration: 42, flashIntensity: 0.95, flashScale: 0.9,
      smokeCount: 3, casingColor: '#facc15',
      drawFn: drawM4
    }
  };

  /* ===========================================================================
     3. SISTEMA DE AUDIO (WEB AUDIO API)
     =========================================================================== */
  class SoundEngine {
    constructor() {
      this.ctx = null; this.masterGain = null; this.fxGain = null;
      this.initialized = false; this.masterVol = 0.85; this.fxVol = 0.8;
    }
    init() {
      if (this.initialized) return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.masterVol, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
        this.fxGain = this.ctx.createGain();
        this.fxGain.gain.setValueAtTime(this.fxVol, this.ctx.currentTime);
        this.fxGain.connect(this.masterGain);
        this.initialized = true;
      } catch(e) { console.warn('Web Audio:', e); }
    }
    resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
    setMasterVol(v) { this.masterVol = v; if (this.masterGain && this.ctx) this.masterGain.gain.setValueAtTime(v, this.ctx.currentTime); }
    setFxVol(v) { this.fxVol = v; if (this.fxGain && this.ctx) this.fxGain.gain.setValueAtTime(v, this.ctx.currentTime); }

    _noise(dur, freq1, freq2, vol, when) {
      if (!this.initialized) return; this.resume();
      const now = this.ctx.currentTime + (when||0);
      const sz = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, sz, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < sz; i++) d[i] = (Math.random()*2-1)*Math.exp(-i/(this.ctx.sampleRate*dur*0.35));
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass';
      bp.frequency.setValueAtTime(freq1, now);
      if (freq2) bp.frequency.exponentialRampToValueAtTime(freq2, now+dur);
      bp.Q.value = 1.8;
      const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, now);
      g.gain.exponentialRampToValueAtTime(0.001, now+dur);
      src.connect(bp); bp.connect(g); g.connect(this.fxGain); src.start(now);
    }
    _tone(type, freq1, freq2, vol, dur, when) {
      if (!this.initialized) return; this.resume();
      const now = this.ctx.currentTime + (when||0);
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq1, now);
      if (freq2) o.frequency.exponentialRampToValueAtTime(freq2, now+dur);
      g.gain.setValueAtTime(vol, now); g.gain.exponentialRampToValueAtTime(0.001, now+dur);
      o.connect(g); g.connect(this.fxGain); o.start(now); o.stop(now+dur+0.01);
    }
    playShoot(weaponId) {
      const w = weaponId || 'glock';
      if (w === 'silenced') {
        this._noise(0.05, 750, 180, 0.22);
        this._tone('sine', 160, 50, 0.16, 0.05);
      } else if (w === 'deagle') {
        this._noise(0.22, 2400, 240, 1.25);
        this._tone('triangle', 340, 40, 1.05, 0.22);
        this._tone('sawtooth', 140, 30, 0.45, 0.16);
      } else if (w === 'm4') {
        this._noise(0.11, 1700, 340, 0.85);
        this._tone('triangle', 280, 50, 0.65, 0.10);
      } else {
        this._noise(0.14, 1850, 290, 0.95);
        this._tone('triangle', 270, 42, 0.78, 0.13);
      }
    }
    playEmpty() { this._tone('square', 900, 200, 0.25, 0.03); }
    playReload() { this._tone('triangle', 350, 120, 0.35, 0.09); this._tone('square', 450, 750, 0.35, 0.18, 0.6); }
    playHit() { this._tone('sine', 1700, 2300, 0.25, 0.06); }
    playHumanHurt() { this._tone('sawtooth', 210+Math.random()*40, 110, 0.4, 0.12); }
    playPlayerHurt() { this._tone('triangle', 130, 45, 0.8, 0.18); }
    playEnemyEliminated() { this._tone('sawtooth', 160, 50, 0.5, 0.22); }
    playInteract() { this._tone('sine', 600, 900, 0.2, 0.1); }
    playObjective() { [260,390,520].forEach((f,i)=>this._tone('sine',f,f,0.2,0.18,i*0.08)); }
    playGameOver() { [220,185,155,120].forEach((f,i)=>this._tone('sawtooth',f,f-20,0.35,0.35,i*0.16)); }
    playVictory() { [261,329,392,523].forEach((f,i)=>this._tone('triangle',f,f,0.3,0.6,i*0.12)); }
    playFootstep() { this._noise(0.06, 120, 70, 0.07); }
    playEnemyShoot(weaponId) { this.playShoot(weaponId||'glock'); }
    playExplosion() {
      this._noise(0.6, 260, 35, 1.4);
      this._tone('sawtooth', 110, 20, 1.1, 0.45);
      this._tone('triangle', 75, 15, 1.3, 0.65);
    }
    playJump() { this._noise(0.07, 240, 110, 0.12); }
    playLand() { this._noise(0.12, 130, 45, 0.22); }
    playCasing() { this._tone('sine', 1900 + Math.random()*350, 1200, 0.04, 0.035); }
  }

  /* ===========================================================================
     4. TEXTURAS PROCEDURAIS DA CAVERNA (128x128 ALTA RESOLUCAO)
     =========================================================================== */
  const TEX_SIZE = 128;
  const texCanvases = [];

  function createCaveTextures() {
    function mkTex(fn) {
      const c = document.createElement('canvas');
      c.width = TEX_SIZE; c.height = TEX_SIZE;
      const x = c.getContext('2d');
      fn(x);
      return c;
    }

    // 1 = Rocha de caverna profunda (camadas rochosas, fissuras e minerais)
    texCanvases[1] = mkTex(ctx => {
      ctx.fillStyle = '#221c17'; ctx.fillRect(0,0,TEX_SIZE,TEX_SIZE);
      // Camadas de sedimentos
      for (let y = 0; y < TEX_SIZE; y += 4) {
        const tone = 26 + Math.floor(Math.sin(y * 0.14) * 8 + Math.cos(y * 0.05) * 5);
        ctx.fillStyle = `rgb(${tone+6}, ${tone+1}, ${tone-3})`;
        ctx.fillRect(0, y, TEX_SIZE, 4);
      }
      // Blocos e fraturas
      for (let y = 0; y < TEX_SIZE; y += 18) {
        const off = (y / 18) % 2 === 0 ? 0 : 24;
        for (let x = -24; x < TEX_SIZE; x += 44) {
          const rx = x + off;
          ctx.fillStyle = ((rx + y) % 7 === 0) ? '#181410' : '#2d251f';
          ctx.fillRect(rx + 2, y + 2, 40, 15);
          // Highlight superior na borda da rocha
          ctx.fillStyle = 'rgba(120, 100, 80, 0.25)';
          ctx.fillRect(rx + 2, y + 2, 40, 2);
          // Sombra inferior
          ctx.fillStyle = 'rgba(10, 8, 6, 0.55)';
          ctx.fillRect(rx + 2, y + 15, 40, 2);
        }
      }
      // Fissuras e rachaduras irregulares
      ctx.strokeStyle = '#0d0a08'; ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(14, 0); ctx.lineTo(34, 32); ctx.lineTo(26, 74); ctx.lineTo(60, TEX_SIZE);
      ctx.moveTo(82, 0); ctx.lineTo(94, 46); ctx.lineTo(112, 88); ctx.stroke();

      // Umidade / brilho úmido sutil
      ctx.fillStyle = 'rgba(70, 85, 95, 0.18)';
      ctx.fillRect(18, 48, 30, 8); ctx.fillRect(75, 20, 24, 6);
      // Detalhes de pedra
      ctx.fillStyle = 'rgba(140, 115, 85, 0.35)';
      ctx.fillRect(12, 14, 10, 4); ctx.fillRect(68, 60, 14, 5); ctx.fillRect(98, 102, 12, 4);
    });

    // 2 = Madeira / Vigas pesadas de escoramento de mina
    texCanvases[2] = mkTex(ctx => {
      ctx.fillStyle = '#322214'; ctx.fillRect(0,0,TEX_SIZE,TEX_SIZE);
      // Pranchas verticais de carvalho envelhecido
      const colW = 28;
      for (let i = 0; i < TEX_SIZE; i += colW) {
        ctx.fillStyle = (i / colW) % 2 === 0 ? '#452f1b' : '#392615';
        ctx.fillRect(i + 1, 0, colW - 2, TEX_SIZE);
        // Ranhuras da madeira
        ctx.strokeStyle = '#22150a'; ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(i + 8, 0); ctx.lineTo(i + 8, TEX_SIZE);
        ctx.moveTo(i + 18, 0); ctx.lineTo(i + 18, TEX_SIZE);
        ctx.stroke();
        // Nós na madeira
        ctx.fillStyle = '#1b1006';
        ctx.beginPath();
        ctx.ellipse(i + 12, 28 + (i % 64), 5, 8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Viga transversal com parafusos de ferro
      ctx.fillStyle = '#261b11'; ctx.fillRect(0, 52, TEX_SIZE, 24);
      ctx.strokeStyle = '#120c07'; ctx.lineWidth = 2;
      ctx.strokeRect(0, 52, TEX_SIZE, 24);
      // Abraçadeiras e rebites de aço forjado
      for (let x = 8; x < TEX_SIZE; x += 32) {
        ctx.fillStyle = '#555f69'; ctx.fillRect(x, 50, 14, 28);
        ctx.fillStyle = '#1e242c'; ctx.strokeRect(x, 50, 14, 28);
        ctx.fillStyle = '#8392a0'; ctx.fillRect(x + 4, 54, 6, 6); ctx.fillRect(x + 4, 68, 6, 6);
      }
      // Sombra na junção
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 76, TEX_SIZE, 6);
    });

    // 3 = Parede de rocha com veios de minério dourado e cobre
    texCanvases[3] = mkTex(ctx => {
      ctx.fillStyle = '#1c1a18'; ctx.fillRect(0,0,TEX_SIZE,TEX_SIZE);
      // Blocos de xisto escuro
      for (let y = 0; y < TEX_SIZE; y += 22) {
        const off = (y / 22) % 2 === 0 ? 0 : 32;
        for (let x = -32; x < TEX_SIZE; x += 64) {
          ctx.strokeStyle = '#090807'; ctx.lineWidth = 2.5;
          ctx.strokeRect(x + off, y, 64, 22);
          ctx.fillStyle = 'rgba(255,255,255,0.02)';
          ctx.fillRect(x + off + 2, y + 2, 60, 4);
        }
      }
      // Veios reluzentes de ouro e pirita
      ctx.fillStyle = '#eab308';
      ctx.fillRect(18, 14, 18, 9); ctx.fillRect(84, 64, 22, 11); ctx.fillRect(44, 98, 16, 8);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(20, 16, 12, 4); ctx.fillRect(88, 66, 14, 5); ctx.fillRect(46, 100, 10, 3);
      // Veios de cobre/malaquita esverdeada
      ctx.fillStyle = 'rgba(52, 211, 153, 0.65)';
      ctx.fillRect(42, 38, 14, 8); ctx.fillRect(104, 22, 12, 7); ctx.fillRect(14, 78, 18, 9);
      ctx.fillStyle = 'rgba(110, 231, 183, 0.9)';
      ctx.fillRect(44, 40, 8, 3); ctx.fillRect(16, 80, 10, 4);
      // Poeira mineral dourada
      for (let p = 0; p < 35; p++) {
        const px = (p * 37) % TEX_SIZE, py = (p * 53) % TEX_SIZE;
        ctx.fillStyle = p % 2 === 0 ? 'rgba(250,204,21,0.5)' : 'rgba(52,211,153,0.4)';
        ctx.fillRect(px, py, 2, 2);
      }
    });

    // 4 = Terra compactada, cascalho e xisto
    texCanvases[4] = mkTex(ctx => {
      ctx.fillStyle = '#2c251d'; ctx.fillRect(0,0,TEX_SIZE,TEX_SIZE);
      // Textura granular de cascalho
      for (let y = 0; y < TEX_SIZE; y += 8) {
        for (let x = 0; x < TEX_SIZE; x += 8) {
          const n = ((x * 19 + y * 29) % 31) - 15;
          ctx.fillStyle = `rgb(${44 + n}, ${37 + n}, ${29 + n})`;
          ctx.fillRect(x, y, 8, 8);
        }
      }
      // Pedras e seixos soltos incrustados
      for (let i = 0; i < 40; i++) {
        const px = (i * 23) % (TEX_SIZE - 12);
        const py = (i * 47) % (TEX_SIZE - 10);
        ctx.fillStyle = i % 3 === 0 ? '#1b1712' : '#4d4133';
        ctx.beginPath();
        ctx.ellipse(px + 6, py + 5, 5 + (i % 4), 3 + (i % 3), (i % 5), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(px + 4, py + 3, 3, 2);
      }
      // Fissuras finas de terra seca
      ctx.strokeStyle = '#14100c'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 40); ctx.lineTo(38, 52); ctx.lineTo(60, 44); ctx.lineTo(TEX_SIZE, 62);
      ctx.moveTo(50, 80); ctx.lineTo(82, 100); ctx.lineTo(TEX_SIZE, 94); ctx.stroke();
    });

    // 5 = Trilho de mina e paredes com reforço de metal enferrujado
    texCanvases[5] = mkTex(ctx => {
      ctx.fillStyle = '#241e17'; ctx.fillRect(0,0,TEX_SIZE,TEX_SIZE);
      // Dormentes de madeira horizontais
      for (let y = 0; y < TEX_SIZE; y += 24) {
        ctx.fillStyle = '#3a2b1c'; ctx.fillRect(0, y + 2, TEX_SIZE, 18);
        ctx.fillStyle = '#1c140d'; ctx.fillRect(0, y + 18, TEX_SIZE, 3);
        ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(0, y + 2, TEX_SIZE, 2);
      }
      // Trilhos verticais de aço com ferrugem
      const railPos = [18, TEX_SIZE - 34];
      railPos.forEach(rx => {
        // Base de apoio
        ctx.fillStyle = '#1a1816'; ctx.fillRect(rx - 2, 0, 20, TEX_SIZE);
        // Perfil do trilho
        ctx.fillStyle = '#64748b'; ctx.fillRect(rx + 2, 0, 12, TEX_SIZE);
        // Brilho do topo do trilho
        ctx.fillStyle = '#cbd5e1'; ctx.fillRect(rx + 5, 0, 6, TEX_SIZE);
        // Ferrugem nas laterais
        ctx.fillStyle = '#9a3412';
        for (let y = 4; y < TEX_SIZE; y += 12) {
          ctx.fillRect(rx, y, 4, 6); ctx.fillRect(rx + 12, y + 3, 4, 5);
        }
        // Parafusos e placas
        for (let y = 6; y < TEX_SIZE; y += 24) {
          ctx.fillStyle = '#0f172a'; ctx.fillRect(rx - 4, y, 4, 4); ctx.fillRect(rx + 16, y, 4, 4);
        }
      });
    });

    // 6 = Metal / Porta blindada de mina / Grade de contenção
    texCanvases[6] = mkTex(ctx => {
      ctx.fillStyle = '#272d34'; ctx.fillRect(0,0,TEX_SIZE,TEX_SIZE);
      // Painéis metálicos reforçados
      for (let y = 0; y < TEX_SIZE; y += 32) {
        ctx.fillStyle = (y / 32) % 2 === 0 ? '#38424d' : '#2d353e';
        ctx.fillRect(4, y + 2, TEX_SIZE - 8, 28);
        ctx.strokeStyle = '#14181d'; ctx.lineWidth = 2;
        ctx.strokeRect(4, y + 2, TEX_SIZE - 8, 28);
      }
      // Listras industriais desgastadas de perigo
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(8, 8, TEX_SIZE - 16, 8);
      ctx.fillStyle = '#0f172a';
      for (let x = 12; x < TEX_SIZE - 16; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x, 8); ctx.lineTo(x + 8, 8); ctx.lineTo(x + 2, 16); ctx.lineTo(x - 6, 16);
        ctx.fill();
      }
      // Rebites de aço pesados
      for (let y = 14; y < TEX_SIZE; y += 32) {
        for (let x = 12; x < TEX_SIZE; x += 26) {
          ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.arc(x - 1, y - 1, 1.8, 0, Math.PI * 2); ctx.fill();
        }
      }
      // Ferrugem nas junções
      ctx.fillStyle = 'rgba(180, 83, 9, 0.45)';
      ctx.fillRect(4, 30, TEX_SIZE - 8, 5); ctx.fillRect(4, 62, TEX_SIZE - 8, 5); ctx.fillRect(4, 94, TEX_SIZE - 8, 5);
    });

    // 7 = Caverna de cristais bioluminescentes (área profunda especial)
    texCanvases[7] = mkTex(ctx => {
      ctx.fillStyle = '#111317'; ctx.fillRect(0,0,TEX_SIZE,TEX_SIZE);
      // Rocha escura obsidiana
      for (let y = 0; y < TEX_SIZE; y += 12) {
        for (let x = 0; x < TEX_SIZE; x += 12) {
          const s = ((x * 17 + y * 13) % 24) - 12;
          ctx.fillStyle = `rgb(${18+s}, ${20+s}, ${25+s})`;
          ctx.fillRect(x, y, 12, 12);
        }
      }
      // Cristais de ciano/azul reluzentes
      function drawCrystal(cx, cy, sz) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.beginPath(); ctx.arc(cx, cy, sz * 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.moveTo(cx, cy - sz); ctx.lineTo(cx + sz * 0.5, cy); ctx.lineTo(cx, cy + sz); ctx.lineTo(cx - sz * 0.5, cy);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#bae6fd';
        ctx.beginPath();
        ctx.moveTo(cx, cy - sz); ctx.lineTo(cx + sz * 0.25, cy - sz * 0.2); ctx.lineTo(cx, cy + sz * 0.4); ctx.lineTo(cx - sz * 0.25, cy - sz * 0.2);
        ctx.closePath(); ctx.fill();
      }
      drawCrystal(24, 26, 14);
      drawCrystal(88, 42, 18);
      drawCrystal(48, 86, 12);
      drawCrystal(102, 98, 15);
      drawCrystal(18, 108, 10);
      // Fissuras luminosas que conectam os cristais
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)'; ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(24, 26); ctx.lineTo(48, 54); ctx.lineTo(88, 42);
      ctx.moveTo(48, 54); ctx.lineTo(48, 86); ctx.lineTo(102, 98);
      ctx.stroke();
    });
  }

  /* ===========================================================================
     5. MAPA DA CAVERNA (36x40)
     =========================================================================== */
  const MAP_W = 36;
  const MAP_H = 40;

  const worldMap = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,4,4,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,4,4,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,0,0,0,4,4,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,4,4,0,2,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,5,5,5,5,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1],
    [1,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,5,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1],
    [1,0,2,2,0,0,0,0,4,4,4,0,0,0,0,0,5,5,5,5,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,4,0,4,0,0,0,0,0,0,0,0,0,0,0,4,4,0,0,0,0,0,0,0,0,1,1,1,1],
    [1,0,0,0,0,0,0,0,4,4,4,0,0,0,0,0,0,0,0,0,0,0,4,4,0,0,0,0,0,0,0,0,0,1,1,1],
    [1,1,0,0,0,0,0,0,0,0,0,0,0,3,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,0,0,0,0,0,0,0,0,0,0,3,3,0,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,2,2,0,0,0,0,0,3,0,0,0,3,0,0,0,0,0,0,0,0,0,4,4,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,2,2,0,0,0,4,4,3,3,3,3,3,0,0,0,0,0,0,0,0,4,4,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,0,0,1],
    [1,0,0,4,4,0,0,0,0,0,0,0,0,0,0,5,5,5,5,5,0,0,0,0,0,0,0,0,0,0,2,2,0,0,0,1],
    [1,0,4,4,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,5,0,0,0,0,4,4,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,5,5,5,5,0,0,0,4,4,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,0,0,2,2,0,0,0,0,0,3,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,0,0,0,0,1],
    [1,1,0,0,2,2,0,0,0,0,3,3,0,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,3,0,0,0,3,0,0,0,0,0,7,7,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,3,3,3,3,3,0,0,0,0,7,7,7,7,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,7,0,0,7,7,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,0,7,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,7,0,0,7,7,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0,0,0,7,7,7,7,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,7,7,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,6,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,6,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
  ];

  /* ===========================================================================
     6. PROPS / ELEMENTOS DA CAVERNA (COM SUPORTE A EXPLOSAO E FOGO)
     =========================================================================== */
  const INITIAL_PROPS = [
    // Barris e caixas
    {x:5.5, y:3.5, type:'barrel'}, {x:6.5, y:3.5, type:'barrel'},
    {x:14.5, y:5.5, type:'crate'}, {x:15.5, y:5.5, type:'crate'},
    {x:22.5, y:10.5, type:'barrel'}, {x:33.5, y:12.5, type:'crate'},
    {x:8.5, y:14.5, type:'barrel'}, {x:9.5, y:14.5, type:'barrel'},
    {x:20.5, y:18.5, type:'crate'}, {x:21.5, y:18.5, type:'crate'},
    {x:5.5, y:24.5, type:'barrel'}, {x:26.5, y:25.5, type:'crate'},
    {x:15.5, y:30.5, type:'barrel'}, {x:16.5, y:30.5, type:'barrel'},
    // Tochas / Lanternas da mina
    {x:3.5, y:6.5, type:'lantern'}, {x:11.5, y:4.5, type:'lantern'},
    {x:18.5, y:7.5, type:'lantern'}, {x:24.5, y:11.5, type:'lantern'},
    {x:12.5, y:13.5, type:'lantern'}, {x:22.5, y:17.5, type:'lantern'},
    {x:8.5, y:22.5, type:'lantern'}, {x:18.5, y:26.5, type:'lantern'},
    {x:27.5, y:30.5, type:'lantern'}, {x:33.5, y:35.5, type:'lantern'},
    // Carrinhos de mina
    {x:17.5, y:7.5, type:'minecart'}, {x:16.5, y:18.5, type:'minecart'},
    // TNT
    {x:11.5, y:15.5, type:'tnt'}, {x:23.5, y:26.5, type:'tnt'},
  ];

  let caveProps = [];

  function resetCaveProps() {
    caveProps = INITIAL_PROPS.map((p, idx) => ({
      id: idx,
      x: p.x,
      y: p.y,
      type: p.type,
      hp: p.type === 'tnt' ? 1 : (p.type === 'barrel' ? 22 : (p.type === 'crate' ? 18 : 9999)),
      destroyed: false,
      flameSeed: Math.random() * 10
    }));
  }

  /* ===========================================================================
     7. BAU E SAIDA
     =========================================================================== */
  const CHEST_POS = {x:20.5, y:25.5};
  const EXIT_POS = {x:32.0, y:36.0};
  let chestOpened = false;
  let exitReached = false;

  /* ===========================================================================
     8. MISSAO - OBJETIVOS
     =========================================================================== */
  const MISSION_OBJECTIVES = [
    { id:'start',    text:'Encontre o caminho principal da mina' },
    { id:'corridor', text:'Avance pelos corredores da mina' },
    { id:'passage',  text:'Encontre a passagem bloqueada (area mais profunda)' },
    { id:'explore',  text:'Explore a area subterranea com minerio' },
    { id:'chest',    text:'Encontre o bau e pegue a nova arma' },
    { id:'exit',     text:'Encontre a saida da mina' }
  ];
  let currentObjectiveIndex = 0;

  /* ===========================================================================
     9. ESTADO GLOBAL DO JOGO
     =========================================================================== */
  const audio = new SoundEngine();

  let selectedChar = null;    // 'male' | 'female'
  let selectedDiff = null;    // 'easy'|'normal'|'hard'|'veryhard'
  let selectedWeapon = null;  // 'glock'|'deagle'|'silenced'

  let gameState = 'LOBBY';
  let prevStateBeforeSettings = 'LOBBY';

  let settings = {
    masterVol: 0.85, fxVol: 0.8, musicVol: 0.6,
    sensitivity: 5, quality: 'medium',
    showFPS: false, showCrosshair: true
  };

  let missionStartTime = 0;
  let missionElapsedTime = 0;
  let totalShotsFired = 0;
  let totalShotsHit = 0;
  let totalKills = 0;
  let totalDamageReceived = 0;
  let footstepTimer = 0;
  let lastFPSTime = 0, frameCount = 0, currentFPS = 60;

  // Estados de Pulo (Máquina de Estados)
  const JUMP_STATES = {
    GROUNDED: 'grounded',
    RISING: 'rising',
    PEAK: 'peak',
    FALLING: 'falling',
    LANDING: 'landing'
  };

  // Jogador
  const player = {
    x: 2.5, y: 2.5,
    dirX: 1, dirY: 0,
    planeX: 0, planeY: 0.66,
    pitch: 0,
    speed: 3.2,
    health: 100, maxHealth: 100,
    stamina: 100, maxStamina: 100,
    // Agachamento suave
    isCrouching: false,
    crouchProgress: 0.0, // 0.0 (em pé) até 1.0 (agachado)
    // Corrida
    isRunning: false,
    // Pulo baseado em estados
    jumpState: JUMP_STATES.GROUNDED,
    jumpVelocity: 0,
    jumpHeight: 0,       // metros em altura virtual
    landingTimer: 0,
    landingProgress: 0,
    // Bobbing / respiração
    bobbingTime: 0,
    bobbingOffset: 0,
    isMoving: false,
    // Armas
    weapons: [],
    currentWeaponIdx: 0
  };

  // Controles
  const keys = { w:false, s:false, a:false, d:false, shift:false, ctrl:false, space:false, e:false };
  let isMouseDown = false;

  // Efeitos e Física da Arma
  let recoilDispY = 0;     // Recuo vertical (pixels)
  let recoilPitch = 0;     // Inclinação de recuo (graus)
  let recoilSide = 0;      // Deslocamento lateral aleatório
  let weaponSwayX = 0, weaponSwayY = 0;
  let hitmarkerTimer = 0;

  // Disparo do Jogador baseado em Timestamp
  const playerFlash = {
    active: false,
    startTime: 0,
    duration: 0,
    intensity: 0,
    scale: 0.7,
    weaponId: null
  };

  // Tremor de Câmera (Screen Shake)
  let screenShakeIntensity = 0;
  let screenShakeTimer = 0;

  // Partículas
  let enemies = [];
  let pickups = [];
  let particles = [];        // Partículas de combate / faíscas / estilhaços
  let smokePuffs = [];       // Fumaça sutil de disparos
  let brassCasings = [];     // Cápsulas ejetadas
  let ambientMotes = [];     // Poeira suspensa na caverna
  let zBuffer = [];

  /* ===========================================================================
     10. ESTADO DE ARMA DO JOGADOR
     =========================================================================== */
  function createWeaponState(def) {
    return {
      def,
      ammo: def.magSize,
      reserve: def.reserveAmmo,
      isReloading: false,
      reloadStartTime: 0,
      lastShootTime: 0
    };
  }

  function getCurrentWeapon() {
    return player.weapons[player.currentWeaponIdx];
  }

  function clearPlayerFlash() {
    playerFlash.active = false;
    playerFlash.startTime = 0;
    if (muzzleFlashFx) muzzleFlashFx.classList.remove('active');
  }

  function triggerScreenShake(intensity, duration) {
    screenShakeIntensity = Math.max(screenShakeIntensity, intensity);
    screenShakeTimer = Math.max(screenShakeTimer, duration);
  }

  /* ===========================================================================
     11. ELEMENTOS DOM
     =========================================================================== */
  let canvas, ctx, minimapCanvas, minimapCtx;
  let hudEl, objectiveText, fpsDisplay, missionTimer, healthNumber, healthBarFill;
  let staminaNumber, staminaBarFill, currentWeaponName, currentAmmoEl, reserveAmmoEl;
  let bulletPipsEl, reloadIndicator, hudNotice, objectiveUpdateBanner, objectiveUpdateText;
  let interactPrompt, interactText, weaponSlotsEl, lockPrompt, hitmarkerEl, damageVignette, muzzleFlashFx;
  let lobbyScreen, charSelectScreen, difficultyScreen, weaponSelectScreen;
  let storyScreen, loadingScreen, pauseScreen, gameOverScreen, newWeaponScreen, missionCompleteScreen, settingsScreen;

  /* ===========================================================================
     12. INICIALIZACAO
     =========================================================================== */
  window.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    grabDOM();
    createCaveTextures();
    initAmbientMotes();
    setupEventListeners();
    drawCharPreviews();
    drawWeaponPreviews();
    resizeCanvas();
    showScreen('LOBBY');
    generateLobbyParticles();

    let lastTime = performance.now();
    function loop(now) {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      frameCount++;
      if (now - lastFPSTime >= 1000) {
        currentFPS = frameCount; frameCount = 0; lastFPSTime = now;
        if (fpsDisplay && !fpsDisplay.classList.contains('hidden')) fpsDisplay.textContent = currentFPS + ' FPS';
      }
      update(dt);
      render();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  });

  function grabDOM() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    minimapCanvas = document.getElementById('minimapCanvas');
    minimapCtx = minimapCanvas.getContext('2d');
    hudEl = document.getElementById('hud');
    objectiveText = document.getElementById('objectiveText');
    fpsDisplay = document.getElementById('fpsDisplay');
    missionTimer = document.getElementById('missionTimer');
    healthNumber = document.getElementById('healthNumber');
    healthBarFill = document.getElementById('healthBarFill');
    staminaNumber = document.getElementById('staminaNumber');
    staminaBarFill = document.getElementById('staminaBarFill');
    currentWeaponName = document.getElementById('currentWeaponName');
    currentAmmoEl = document.getElementById('currentAmmo');
    reserveAmmoEl = document.getElementById('reserveAmmo');
    bulletPipsEl = document.getElementById('bulletPips');
    reloadIndicator = document.getElementById('reloadIndicator');
    hudNotice = document.getElementById('hudNotice');
    objectiveUpdateBanner = document.getElementById('objectiveUpdateBanner');
    objectiveUpdateText = document.getElementById('objectiveUpdateText');
    interactPrompt = document.getElementById('interactPrompt');
    interactText = document.getElementById('interactText');
    weaponSlotsEl = document.getElementById('weaponSlots');
    lockPrompt = document.getElementById('lockPrompt');
    hitmarkerEl = document.getElementById('hitmarker');
    damageVignette = document.getElementById('damageVignette');
    muzzleFlashFx = document.getElementById('muzzleFlashFx');
    lobbyScreen = document.getElementById('lobbyScreen');
    charSelectScreen = document.getElementById('charSelectScreen');
    difficultyScreen = document.getElementById('difficultyScreen');
    weaponSelectScreen = document.getElementById('weaponSelectScreen');
    storyScreen = document.getElementById('storyScreen');
    loadingScreen = document.getElementById('loadingScreen');
    pauseScreen = document.getElementById('pauseScreen');
    gameOverScreen = document.getElementById('gameOverScreen');
    newWeaponScreen = document.getElementById('newWeaponScreen');
    missionCompleteScreen = document.getElementById('missionCompleteScreen');
    settingsScreen = document.getElementById('settingsScreen');
  }

  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);

  /* ===========================================================================
     13. CONFIGURACOES E QUALIDADE
     =========================================================================== */
  function loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem('opzero_settings'));
      if (s) Object.assign(settings, s);
    } catch(e) {}
    applySettings();
  }
  function saveSettings() {
    localStorage.setItem('opzero_settings', JSON.stringify(settings));
    applySettings();
  }
  function applySettings() {
    audio.setMasterVol(settings.masterVol);
    audio.setFxVol(settings.fxVol);
    if (fpsDisplay) {
      if (settings.showFPS) fpsDisplay.classList.remove('hidden');
      else fpsDisplay.classList.add('hidden');
    }
    const ch = document.getElementById('crosshairContainer');
    if (ch) {
      if (settings.showCrosshair) ch.style.display = '';
      else ch.style.display = 'none';
    }
  }
  function populateSettingsUI() {
    const ms=document.getElementById('settingMasterVol');
    const fxs=document.getElementById('settingFxVol');
    const mus=document.getElementById('settingMusicVol');
    const sens=document.getElementById('settingSensitivity');
    const fps=document.getElementById('settingShowFPS');
    const cross=document.getElementById('settingCrosshair');
    if (ms) ms.value = Math.round(settings.masterVol*100);
    if (fxs) fxs.value = Math.round(settings.fxVol*100);
    if (mus) mus.value = Math.round(settings.musicVol*100);
    if (sens) sens.value = settings.sensitivity;
    if (fps) fps.checked = settings.showFPS;
    if (cross) cross.checked = settings.showCrosshair;
    document.querySelectorAll('.quality-btn').forEach(b=>{
      b.classList.toggle('active', b.dataset.q === settings.quality);
    });
    updateSettingsLabels();
  }
  function updateSettingsLabels() {
    const pairs=[['settingMasterVol','settingMasterVolVal','%'],['settingFxVol','settingFxVolVal','%'],
                 ['settingMusicVol','settingMusicVolVal','%'],['settingSensitivity','settingSensitivityVal','']];
    pairs.forEach(([id,vid,suffix])=>{
      const el=document.getElementById(id), vel=document.getElementById(vid);
      if(el&&vel) vel.textContent = el.value + suffix;
    });
  }

  /* ===========================================================================
     14. EVENT LISTENERS
     =========================================================================== */
  function setupEventListeners() {
    // Lobby
    document.getElementById('btnLobbyPlay').addEventListener('click',()=>{
      audio.init(); showScreen('CHAR');
    });
    document.getElementById('btnLobbySettings').addEventListener('click',()=>{
      audio.init(); prevStateBeforeSettings='LOBBY'; showScreen('SETTINGS');
    });
    document.getElementById('btnLobbyQuit').addEventListener('click',()=>{
      const ok = confirm('O navegador nao pode fechar a aba automaticamente.\n\nDeseja fechar esta pagina manualmente?');
      if(ok) { try { window.close(); } catch(e) {} }
    });

    // Personagens
    document.querySelectorAll('.char-select-btn').forEach(btn=>{
      btn.addEventListener('click',e=>{
        selectedChar = e.target.dataset.char || e.target.closest('[data-char]').dataset.char;
        document.querySelectorAll('.char-card').forEach(c=>c.classList.remove('selected'));
        document.querySelector(`.char-card[data-char="${selectedChar}"]`).classList.add('selected');
        document.getElementById('btnCharContinue').disabled = false;
      });
    });
    document.querySelectorAll('.char-card').forEach(card=>{
      card.addEventListener('click',()=>{
        selectedChar = card.dataset.char;
        document.querySelectorAll('.char-card').forEach(c=>c.classList.remove('selected'));
        card.classList.add('selected');
        document.getElementById('btnCharContinue').disabled = false;
      });
    });
    document.getElementById('btnCharContinue').addEventListener('click',()=>{ if(selectedChar) showScreen('DIFF'); });
    document.getElementById('btnCharBack').addEventListener('click',()=>showScreen('LOBBY'));

    // Dificuldade
    document.querySelectorAll('.diff-card').forEach(card=>{
      card.addEventListener('click',()=>{
        selectedDiff = card.dataset.diff;
        document.querySelectorAll('.diff-card').forEach(c=>c.classList.remove('selected'));
        card.classList.add('selected');
        document.getElementById('btnDiffContinue').disabled = false;
      });
    });
    document.getElementById('btnDiffContinue').addEventListener('click',()=>{ if(selectedDiff) showScreen('WEAPON'); });
    document.getElementById('btnDiffBack').addEventListener('click',()=>showScreen('CHAR'));

    // Arma Inicial
    document.querySelectorAll('.weapon-sel-btn').forEach(btn=>{
      btn.addEventListener('click',e=>{
        selectedWeapon = btn.dataset.weapon;
        document.querySelectorAll('.weapon-sel-card').forEach(c=>c.classList.remove('selected'));
        btn.closest('.weapon-sel-card').classList.add('selected');
        document.getElementById('btnWeaponContinue').disabled = false;
      });
    });
    document.querySelectorAll('.weapon-sel-card').forEach(card=>{
      card.addEventListener('click',()=>{
        selectedWeapon = card.dataset.weapon;
        document.querySelectorAll('.weapon-sel-card').forEach(c=>c.classList.remove('selected'));
        card.classList.add('selected');
        document.getElementById('btnWeaponContinue').disabled = false;
      });
    });
    document.getElementById('btnWeaponContinue').addEventListener('click',()=>{ if(selectedWeapon) showScreen('STORY'); });
    document.getElementById('btnWeaponBack').addEventListener('click',()=>showScreen('DIFF'));

    // História e Pular
    document.getElementById('btnSkipStory').addEventListener('click',()=>showScreen('LOADING'));

    // Pausa e Menu
    document.getElementById('btnResume').addEventListener('click',resumeGame);
    document.getElementById('btnPauseSettings').addEventListener('click',()=>{
      prevStateBeforeSettings='PAUSED'; showScreen('SETTINGS');
    });
    document.getElementById('btnPauseRestart').addEventListener('click',()=>{ hideAllScreens(); startMission(); });
    document.getElementById('btnPauseMainMenu').addEventListener('click',()=>{ hideAllScreens(); showScreen('LOBBY'); });

    // Fim de Jogo
    document.getElementById('btnRetry').addEventListener('click',()=>{ hideAllScreens(); startMission(); });
    document.getElementById('btnFailMenu').addEventListener('click',()=>{ hideAllScreens(); showScreen('LOBBY'); });

    // Nova Arma (M4)
    document.getElementById('btnEquipM4').addEventListener('click',()=>{ equipM4(); });

    // Vitória
    document.getElementById('btnMissionContinue').addEventListener('click',()=>{ showScreen('LOBBY'); });
    document.getElementById('btnWinMenu').addEventListener('click',()=>{ showScreen('LOBBY'); });

    // Configurações
    document.getElementById('settingMasterVol').addEventListener('input',e=>{
      settings.masterVol = e.target.value/100; updateSettingsLabels();
    });
    document.getElementById('settingFxVol').addEventListener('input',e=>{
      settings.fxVol = e.target.value/100; updateSettingsLabels();
    });
    document.getElementById('settingMusicVol').addEventListener('input',e=>{
      settings.musicVol = e.target.value/100; updateSettingsLabels();
    });
    document.getElementById('settingSensitivity').addEventListener('input',e=>{
      settings.sensitivity = parseInt(e.target.value); updateSettingsLabels();
    });
    document.querySelectorAll('.quality-btn').forEach(btn=>{
      btn.addEventListener('click',()=>{
        settings.quality = btn.dataset.q;
        document.querySelectorAll('.quality-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        initAmbientMotes();
      });
    });
    document.getElementById('settingShowFPS').addEventListener('change',e=>{ settings.showFPS=e.target.checked; });
    document.getElementById('settingCrosshair').addEventListener('change',e=>{ settings.showCrosshair=e.target.checked; });
    document.getElementById('btnFullscreen').addEventListener('click',()=>{
      if (!document.fullscreenElement) document.documentElement.requestFullscreen();
      else document.exitFullscreen();
    });
    document.getElementById('btnSettingsSave').addEventListener('click',()=>{
      saveSettings(); applySettings();
      showScreen(prevStateBeforeSettings);
    });

    // Pointer Lock
    lockPrompt.addEventListener('click', requestPointerLock);

    // Teclado
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Mouse
    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', e=>{
      if (gameState !== 'PLAYING') return;
      if (e.button === 0) {
        if (document.pointerLockElement !== canvas) {
          requestPointerLock();
        } else {
          isMouseDown = true;
          shootWeapon();
        }
      }
    });
    document.addEventListener('mouseup', e=>{
      if (e.button === 0) isMouseDown = false;
    });
  }

  function onKeyDown(e) {
    const k = e.key.toLowerCase();
    if (k==='w'||k==='arrowup') keys.w=true;
    if (k==='s'||k==='arrowdown') keys.s=true;
    if (k==='a'||k==='arrowleft') keys.a=true;
    if (k==='d'||k==='arrowright') keys.d=true;
    if (k==='shift') keys.shift=true;
    if (k==='control') keys.ctrl=true;
    if (k===' ') {
      keys.space = true;
      e.preventDefault();
      triggerJump();
    }
    if (k==='e') keys.e=true;
    if (k==='r') reloadWeapon();
    if (k==='1') switchWeapon(0);
    if (k==='2') switchWeapon(1);
    if (k==='escape'||k==='p') {
      if (gameState==='PLAYING') pauseGame();
      else if (gameState==='PAUSED') resumeGame();
    }
  }

  function onKeyUp(e) {
    const k = e.key.toLowerCase();
    if (k==='w'||k==='arrowup') keys.w=false;
    if (k==='s'||k==='arrowdown') keys.s=false;
    if (k==='a'||k==='arrowleft') keys.a=false;
    if (k==='d'||k==='arrowright') keys.d=false;
    if (k==='shift') keys.shift=false;
    if (k==='control') keys.ctrl=false;
    if (k===' ') keys.space=false;
    if (k==='e') keys.e=false;
  }

  function onPointerLockChange() {
    const locked = document.pointerLockElement === canvas;
    if (!locked && gameState==='PLAYING') {
      isMouseDown = false;
      lockPrompt.classList.remove('hidden');
    } else {
      lockPrompt.classList.add('hidden');
    }
  }

  function onMouseMove(e) {
    if (gameState!=='PLAYING' || document.pointerLockElement!==canvas) return;
    const sens = settings.sensitivity * 0.00042;
    const rot = e.movementX * sens;
    const cosR = Math.cos(rot), sinR = Math.sin(rot);
    const od = player.dirX;
    player.dirX = player.dirX*cosR - player.dirY*sinR;
    player.dirY = od*sinR + player.dirY*cosR;
    const op = player.planeX;
    player.planeX = player.planeX*cosR - player.planeY*sinR;
    player.planeY = op*sinR + player.planeY*cosR;

    // Pitch suave
    player.pitch -= e.movementY * 1.15;
    player.pitch = Math.max(-180, Math.min(180, player.pitch));

    // Weapon sway
    weaponSwayX += e.movementX * 0.16;
    weaponSwayY += e.movementY * 0.16;
    weaponSwayX = Math.max(-18, Math.min(18, weaponSwayX));
    weaponSwayY = Math.max(-14, Math.min(14, weaponSwayY));
  }

  function requestPointerLock() {
    if (canvas && canvas.requestPointerLock) canvas.requestPointerLock();
  }

  /* ===========================================================================
     15. GERENCIAMENTO DE TELAS
     =========================================================================== */
  function showScreen(state) {
    gameState = state;
    hideAllScreens();
    const map = {
      LOBBY: lobbyScreen, CHAR: charSelectScreen, DIFF: difficultyScreen,
      WEAPON: weaponSelectScreen, STORY: storyScreen, LOADING: loadingScreen,
      PAUSED: pauseScreen, GAMEOVER: gameOverScreen, NEWWEAPON: newWeaponScreen,
      WIN: missionCompleteScreen, SETTINGS: settingsScreen
    };
    const scr = map[state];
    if (scr) scr.classList.remove('hidden');

    if (state==='STORY') startStory();
    if (state==='LOADING') startLoading();
    if (state==='SETTINGS') populateSettingsUI();
    if (state==='NEWWEAPON') drawNewWeaponPreview();
  }

  function hideAllScreens() {
    [lobbyScreen,charSelectScreen,difficultyScreen,weaponSelectScreen,
     storyScreen,loadingScreen,pauseScreen,gameOverScreen,newWeaponScreen,
     missionCompleteScreen,settingsScreen].forEach(s=>{ if(s) s.classList.add('hidden'); });
    if (lockPrompt) lockPrompt.classList.add('hidden');
  }

  function generateLobbyParticles() {
    const cont = document.getElementById('lobbyParticles');
    if (!cont) return;
    cont.innerHTML = '';
    for (let i=0; i<45; i++) {
      const p = document.createElement('div');
      p.className='lobby-particle';
      p.style.left = Math.random()*100+'%';
      p.style.animationDuration = (5+Math.random()*12)+'s';
      p.style.animationDelay = (-Math.random()*12)+'s';
      p.style.opacity = (0.2+Math.random()*0.6).toString();
      p.style.width = p.style.height = (1+Math.random()*3)+'px';
      cont.appendChild(p);
    }
  }

  /* ===========================================================================
     16. HISTORIA E CARREGAMENTO
     =========================================================================== */
  const storyLines = [
    "A operacao saiu do controle.",
    "A equipe foi emboscada e separada.",
    "",
    "Voce recobrou a consciencia no interior de uma antiga mina abandonada.",
    "",
    "Nenhum sinal no radio. Nenhum reforco a caminho.",
    "",
    "A unica saida esta mais fundo na escuridao.",
    "",
    "Elimine ameacas. Encontre suprimentos. Sobreviva."
  ];
  let storyLineIdx = 0, storyCharIdx = 0, storyTimer = 0, storyInterval = null, storyPhase = 'typing';

  function startStory() {
    const textEl = document.getElementById('storyText');
    const titleEl = document.getElementById('storyMissionTitle');
    if (!textEl) return;
    textEl.innerHTML = '';
    titleEl.classList.add('hidden');
    storyLineIdx = 0; storyCharIdx = 0; storyPhase = 'typing';
    clearInterval(storyInterval);
    storyInterval = setInterval(storyTick, 42);
  }

  function storyTick() {
    const textEl = document.getElementById('storyText');
    if (!textEl) return;
    if (storyLineIdx >= storyLines.length) {
      clearInterval(storyInterval);
      const title = document.getElementById('storyMissionTitle');
      if (title) title.classList.remove('hidden');
      setTimeout(()=>showScreen('LOADING'), 2200);
      return;
    }
    const line = storyLines[storyLineIdx];
    if (storyPhase === 'typing') {
      if (storyCharIdx < line.length) {
        textEl.innerHTML += line[storyCharIdx++];
      } else {
        textEl.innerHTML += '<br>';
        storyPhase = 'pausing'; storyTimer = 0;
      }
    } else {
      storyTimer += 42;
      if (storyTimer > (line === '' ? 180 : 850)) {
        storyLineIdx++; storyCharIdx = 0; storyPhase = 'typing';
      }
    }
  }

  const loadingMessages = [
    'Carregando geomorfologia da caverna...',
    'Inicializando iluminacao volumetrica das tochas...',
    'Posicionando patrulhas armadas...',
    'Configurando balistica e recuo das armas...',
    'Preparando atmosfera subterranea...',
    'Missao pronta para execucao!'
  ];

  function startLoading() {
    clearInterval(storyInterval);
    let progress = 0, msgIdx = 0;
    const bar = document.getElementById('loadingBarFill');
    const status = document.getElementById('loadingStatus');
    if (bar) bar.style.width = '0%';

    const iv = setInterval(()=>{
      progress += 4 + Math.random()*9;
      if (progress > 100) progress = 100;
      if (bar) bar.style.width = progress+'%';
      if (status && msgIdx < loadingMessages.length) {
        status.textContent = loadingMessages[msgIdx++];
      }
      if (progress >= 100) {
        clearInterval(iv);
        setTimeout(()=>{ hideAllScreens(); startMission(); }, 500);
      }
    }, 120);
  }

  /* ===========================================================================
     17. INICIO DA MISSAO E SPAWNS
     =========================================================================== */
  function startMission() {
    const diff = DIFFICULTY_PRESETS[selectedDiff||'normal'];

    // Reset jogador
    player.x = 2.5; player.y = 2.5;
    player.dirX = 1; player.dirY = 0;
    player.planeX = 0; player.planeY = 0.66;
    player.pitch = 0;
    player.health = 100; player.stamina = 100;
    player.isCrouching = false;
    player.crouchProgress = 0.0;
    player.isRunning = false;
    player.jumpState = JUMP_STATES.GROUNDED;
    player.jumpHeight = 0;
    player.jumpVelocity = 0;
    player.landingTimer = 0;
    player.landingProgress = 0;
    player.bobbingTime = 0;
    player.bobbingOffset = 0;

    // Armas
    const wDef = WEAPON_DEFS[selectedWeapon||'glock'];
    player.weapons = [createWeaponState(wDef)];
    player.currentWeaponIdx = 0;
    clearPlayerFlash();

    // Stats
    missionStartTime = performance.now();
    missionElapsedTime = 0;
    totalShotsFired = 0; totalShotsHit = 0;
    totalKills = 0; totalDamageReceived = 0;

    // Objetivos e Props
    currentObjectiveIndex = 0;
    chestOpened = false; exitReached = false;
    resetCaveProps();

    // Inimigos, pickups e efeitos
    spawnEnemies(diff);
    pickups = [];
    particles = [];
    smokePuffs = [];
    brassCasings = [];
    initAmbientMotes();

    // HUD
    hudEl.classList.remove('hidden');
    updateHUD(); updateObjectiveHUD(); updateWeaponSlots();

    gameState = 'PLAYING';
    requestPointerLock();
    showNotification('MISSAO 01 — A SAIDA');
  }

  function spawnEnemies(diff) {
    enemies = [];
    const baseCount = 13;
    const count = Math.floor(baseCount * (diff.enemyCountMult || 1.0));
    const outfits = [
      { shirt:'#3b4a5c', pants:'#1e2630', hair:'#1a1208', skin:'#d4a574', vest:'#2a3540' },
      { shirt:'#4a3b2c', pants:'#2c2018', hair:'#0d0a06', skin:'#c49060', vest:'#3a2c20' },
      { shirt:'#2c3d2c', pants:'#1a2818', hair:'#241a0e', skin:'#e8b888', vest:'#1e3020' },
      { shirt:'#5c3a2a', pants:'#2c1e14', hair:'#12100a', skin:'#d4a070', vest:'#4a2c1c' }
    ];
    const spawnAreas = [];
    for (let y=2; y<MAP_H-2; y++) {
      for (let x=2; x<MAP_W-2; x++) {
        if (worldMap[y][x] === 0) {
          const d2 = (x-player.x)**2 + (y-player.y)**2;
          if (d2 > 28) spawnAreas.push({x:x+0.5, y:y+0.5});
        }
      }
    }
    spawnAreas.sort(()=>Math.random()-0.5);

    for (let i=0; i<count; i++) {
      const slot = spawnAreas[i % spawnAreas.length];
      const outfit = outfits[i%outfits.length];
      const wKeys = ['glock','glock','deagle','m4','silenced'];
      const enemyWeapon = wKeys[i%wKeys.length];
      enemies.push({
        id: i,
        x: slot.x + (Math.random()*0.3-0.15),
        y: slot.y + (Math.random()*0.3-0.15),
        hp: Math.floor(65 * diff.enemyHpMult),
        maxHp: Math.floor(65 * diff.enemyHpMult),
        speed: 1.15 * diff.enemySpeedMult,
        damage: Math.floor(13 * diff.enemyDamageMult),
        accuracy: diff.enemyAccuracy,
        detectRange: diff.enemyDetectRange,
        attackCooldown: diff.enemyAttackCooldown,
        reactionTime: diff.enemyReactionTime,
        outfit,
        weapon: enemyWeapon,
        walkCycle: Math.random()*Math.PI*2,
        idleCycle: Math.random()*Math.PI*2,
        state: 'patrol',
        patrolTimer: Math.random()*3,
        patrolDirX: Math.cos(Math.random()*Math.PI*2),
        patrolDirY: Math.sin(Math.random()*Math.PI*2),
        isMoving: false,
        attackTimer: 0,
        hurtTimer: 0,
        muzzleFlashEndTime: 0,
        alertTimer: 0,
        reloadTimer: 0,
        ammo: 10 + Math.floor(Math.random()*8),
        alive: true,
        size: 0.88
      });
    }
  }

  function pauseGame() {
    gameState = 'PAUSED';
    pauseScreen.classList.remove('hidden');
    clearPlayerFlash();
    if (document.exitPointerLock) document.exitPointerLock();
  }

  function resumeGame() {
    pauseScreen.classList.add('hidden');
    settingsScreen.classList.add('hidden');
    gameState = 'PLAYING';
    requestPointerLock();
  }

  function triggerGameOver() {
    gameState = 'GAMEOVER';
    clearPlayerFlash();
    if (document.exitPointerLock) document.exitPointerLock();
    audio.playGameOver();
    hudEl.classList.add('hidden');
    const elapsed = (performance.now()-missionStartTime)/1000;
    const acc = totalShotsFired > 0 ? Math.round((totalShotsHit/totalShotsFired)*100) : 0;
    const fs = document.getElementById('failStats');
    if (fs) fs.innerHTML = makeStatsHTML([
      ['Inimigos Eliminados', totalKills],
      ['Tiros Disparados', totalShotsFired],
      ['Precisao', acc+'%'],
      ['Dano Recebido', totalDamageReceived],
      ['Tempo', formatTime(elapsed)],
      ['Dificuldade', DIFFICULTY_PRESETS[selectedDiff||'normal'].label]
    ]);
    gameOverScreen.classList.remove('hidden');
  }

  function triggerMissionComplete() {
    gameState = 'WIN';
    clearPlayerFlash();
    if (document.exitPointerLock) document.exitPointerLock();
    audio.playVictory();
    hudEl.classList.add('hidden');
    const elapsed = (performance.now()-missionStartTime)/1000;
    const acc = totalShotsFired > 0 ? Math.round((totalShotsHit/totalShotsFired)*100) : 0;
    const ws = document.getElementById('winStats');
    if (ws) ws.innerHTML = makeStatsHTML([
      ['Tempo da Missao', formatTime(elapsed)],
      ['Inimigos Eliminados', totalKills],
      ['Precisao', acc+'%'],
      ['Tiros Disparados', totalShotsFired],
      ['Dano Recebido', totalDamageReceived],
      ['Dificuldade', DIFFICULTY_PRESETS[selectedDiff||'normal'].label]
    ]);
    missionCompleteScreen.classList.remove('hidden');
  }

  function makeStatsHTML(stats) {
    return stats.map(([l,v])=>`<div class="rs-item"><div class="rs-label">${l}</div><div class="rs-value">${v}</div></div>`).join('');
  }

  function formatTime(s) {
    const m=Math.floor(s/60), ss=Math.floor(s%60);
    return `${m.toString().padStart(2,'0')}:${ss.toString().padStart(2,'0')}`;
  }

  /* ===========================================================================
     18. SISTEMA DE DISPARO ROBUSTO (TEMPO REAL E ALINHAMENTO)
     =========================================================================== */
  function shootWeapon() {
    const ws = getCurrentWeapon();
    if (!ws) return;
    const now = performance.now();
    if (now - ws.lastShootTime < ws.def.fireRate) return;
    if (ws.isReloading) return;
    if (ws.ammo <= 0) {
      audio.playEmpty();
      ws.lastShootTime = now;
      reloadWeapon();
      return;
    }

    ws.ammo--;
    ws.lastShootTime = now;
    totalShotsFired++;

    // Recuo da arma dinâmico
    recoilDispY += ws.def.recoilImpulse;
    recoilPitch += ws.def.recoilKick;
    recoilSide += (Math.random() * 2 - 1) * (ws.def.recoilImpulse * 0.18);

    // Muzzle Flash baseado em timestamp
    playerFlash.active = true;
    playerFlash.startTime = now;
    playerFlash.duration = ws.def.flashDuration;
    playerFlash.intensity = ws.def.flashIntensity;
    playerFlash.scale = ws.def.flashScale;
    playerFlash.weaponId = ws.def.id;

    // Overlay visual sutil
    if (muzzleFlashFx && !ws.def.silenced) {
      muzzleFlashFx.style.opacity = Math.min(1.0, ws.def.flashIntensity * 0.65).toString();
    }

    // Crosshair kick
    const ch = document.getElementById('crosshair');
    if (ch) {
      ch.classList.add('kick');
      setTimeout(()=>ch.classList.remove('kick'), 85);
    }

    // Tremor de tela
    if (ws.def.id === 'deagle') triggerScreenShake(6.5, 0.16);
    else if (ws.def.id === 'm4') triggerScreenShake(2.4, 0.09);
    else if (!ws.def.silenced) triggerScreenShake(1.8, 0.08);

    // Áudio
    audio.playShoot(ws.def.id);
    updateHUD();

    // Partículas de fumaça e cápsulas ejetadas
    spawnWeaponSmokePuff(ws.def.smokeCount);
    spawnBrassCasing(ws.def.casingColor);

    // Dispersão e Hitscan
    const spread = ws.def.spread * (player.isMoving ? 1.4 : 1.0) * (player.crouchProgress > 0.5 ? 0.65 : 1.0);
    const sx = player.dirX + (Math.random()*2-1)*spread;
    const sy = player.dirY + (Math.random()*2-1)*spread;
    const len = Math.sqrt(sx*sx+sy*sy);
    checkHitscanShot(sx/len, sy/len, ws.def.damage, ws.def.range);
  }

  function checkHitscanShot(dx, dy, damage, range) {
    const wallDist = castBulletRay(player.x, player.y, dx, dy);
    let hitEnemy = null, minEnemyD = 9999;
    let hitProp = null, minPropD = 9999;

    // Inimigos
    enemies.forEach(en => {
      if (!en.alive) return;
      const edx = en.x - player.x, edy = en.y - player.y;
      const dist = Math.sqrt(edx*edx + edy*edy);
      if (dist >= wallDist || dist > range) return;
      const dot = (edx*dx + edy*dy)/dist;
      const perp = dist * Math.sqrt(Math.max(0, 1 - dot*dot));
      const hitRadius = 0.38 * en.size;
      if (dot > 0 && perp < hitRadius && dist < minEnemyD) {
        minEnemyD = dist;
        hitEnemy = en;
      }
    });

    // Props destruíveis (TNT e Barris)
    caveProps.forEach(prop => {
      if (prop.destroyed || prop.type === 'lantern' || prop.type === 'minecart') return;
      const pdx = prop.x - player.x, pdy = prop.y - player.y;
      const dist = Math.sqrt(pdx*pdx + pdy*pdy);
      if (dist >= wallDist || dist > range) return;
      const dot = (pdx*dx + pdy*dy)/dist;
      const perp = dist * Math.sqrt(Math.max(0, 1 - dot*dot));
      const hitRadius = 0.42;
      if (dot > 0 && perp < hitRadius && dist < minPropD) {
        minPropD = dist;
        hitProp = prop;
      }
    });

    if (hitEnemy && minEnemyD <= minPropD) {
      totalShotsHit++;
      hitEnemy.hp -= damage;
      hitEnemy.hurtTimer = 0.22;
      hitEnemy.state = 'hurt';
      hitEnemy.x += dx * 0.12; hitEnemy.y += dy * 0.12;
      hitmarkerTimer = 8;
      hitmarkerEl.classList.remove('hidden');
      audio.playHit(); audio.playHumanHurt();
      spawnParticles(hitEnemy.x, hitEnemy.y, '#b91c1c', 8);
      if (hitEnemy.hp <= 0) killEnemy(hitEnemy);
    } else if (hitProp) {
      hitProp.hp -= damage;
      spawnParticles(hitProp.x, hitProp.y, hitProp.type==='barrel'?'#78350f':'#ef4444', 6);
      audio.playHit();
      if (hitProp.hp <= 0) explodeProp(hitProp);
    } else {
      // Impacto na parede da caverna (faiscas e poeira de pedra)
      const hitDist = Math.min(wallDist, range);
      const hx = player.x + dx * hitDist;
      const hy = player.y + dy * hitDist;
      spawnWallImpactEffects(hx, hy);
    }
  }

  function explodeProp(prop) {
    if (prop.destroyed) return;
    prop.destroyed = true;
    audio.playExplosion();
    triggerScreenShake(12.0, 0.35);

    // Partículas densas de explosão
    const color = prop.type === 'tnt' ? '#ea580c' : '#b45309';
    spawnParticles(prop.x, prop.y, '#f59e0b', 24);
    spawnParticles(prop.x, prop.y, '#ef4444', 20);
    spawnParticles(prop.x, prop.y, '#334155', 18);

    // Dano em área nos inimigos
    const blastRadius = prop.type === 'tnt' ? 4.2 : 2.8;
    const maxDamage = prop.type === 'tnt' ? 140 : 65;

    enemies.forEach(en => {
      if (!en.alive) return;
      const d = Math.sqrt((en.x - prop.x)**2 + (en.y - prop.y)**2);
      if (d < blastRadius) {
        const falloff = 1 - (d / blastRadius);
        en.hp -= Math.floor(maxDamage * falloff);
        en.hurtTimer = 0.3;
        en.state = 'hurt';
        if (en.hp <= 0) killEnemy(en);
      }
    });

    // Dano no jogador caso esteja muito perto
    const pDist = Math.sqrt((player.x - prop.x)**2 + (player.y - prop.y)**2);
    if (pDist < blastRadius) {
      const pDamage = Math.floor((1 - (pDist / blastRadius)) * 50);
      damagePlayer(pDamage);
    }
  }

  function killEnemy(en) {
    en.alive = false; en.state = 'dead';
    totalKills++;
    audio.playEnemyEliminated();
    spawnParticles(en.x, en.y, en.outfit.shirt, 18);
    if (Math.random() < 0.42) {
      pickups.push({x:en.x, y:en.y, type:Math.random()<0.5?'health':'ammo', alive:true});
    }
    checkObjectiveProgress();
  }

  function castBulletRay(x, y, dx, dy) {
    let dist = 0; const step = 0.06;
    while (dist < 28) {
      const cx = Math.floor(x + dx * dist), cy = Math.floor(y + dy * dist);
      if (cx < 0 || cx >= MAP_W || cy < 0 || cy >= MAP_H) return dist;
      if (worldMap[cy][cx] > 0) return dist;
      dist += step;
    }
    return dist;
  }

  function reloadWeapon() {
    const ws = getCurrentWeapon();
    if (!ws || ws.isReloading || ws.ammo === ws.def.magSize || ws.reserve <= 0) return;
    clearPlayerFlash();
    ws.isReloading = true;
    ws.reloadStartTime = performance.now();
    reloadIndicator.classList.remove('hidden');
    audio.playReload();
  }

  function switchWeapon(idx) {
    if (idx < 0 || idx >= player.weapons.length) return;
    clearPlayerFlash();
    const cur = getCurrentWeapon();
    if (cur) cur.isReloading = false;
    reloadIndicator.classList.add('hidden');
    player.currentWeaponIdx = idx;
    updateHUD(); updateWeaponSlots();
    showNotification('EQUIPADO: ' + player.weapons[idx].def.name);
  }

  /* ===========================================================================
     19. BAU E NOVA ARMA M4
     =========================================================================== */
  function tryInteract() {
    if (gameState !== 'PLAYING') return;
    const cdx = player.x - CHEST_POS.x, cdy = player.y - CHEST_POS.y;
    if (!chestOpened && cdx*cdx + cdy*cdy < 2.2) {
      chestOpened = true;
      audio.playInteract();
      interactPrompt.classList.add('hidden');
      clearPlayerFlash();
      gameState = 'NEWWEAPON';
      if (document.exitPointerLock) document.exitPointerLock();
      hudEl.classList.add('hidden');
      newWeaponScreen.classList.remove('hidden');
      setObjective(4);
      return;
    }
    const edx = player.x - EXIT_POS.x, edy = player.y - EXIT_POS.y;
    if (!exitReached && chestOpened && edx*edx + edy*edy < 3.0) {
      exitReached = true;
      setTimeout(triggerMissionComplete, 600);
    }
  }

  function equipM4() {
    const m4Def = WEAPON_DEFS['m4'];
    player.weapons.push(createWeaponState(m4Def));
    newWeaponScreen.classList.add('hidden');
    hudEl.classList.remove('hidden');
    gameState = 'PLAYING';
    requestPointerLock();
    player.currentWeaponIdx = player.weapons.length-1;
    updateHUD(); updateWeaponSlots();
    showNotification('M4A1 EQUIPADA! Disparo automatico disponivel');
    setObjective(5);
    audio.playObjective();
  }

  function setObjective(idx) {
    if (idx === currentObjectiveIndex) return;
    currentObjectiveIndex = idx;
    const obj = MISSION_OBJECTIVES[Math.min(idx, MISSION_OBJECTIVES.length-1)];
    updateObjectiveHUD();
    if (objectiveUpdateText) objectiveUpdateText.textContent = obj.text;
    if (objectiveUpdateBanner) {
      objectiveUpdateBanner.classList.remove('hidden');
      clearTimeout(objectiveUpdateBanner._t);
      objectiveUpdateBanner._t = setTimeout(()=>objectiveUpdateBanner.classList.add('hidden'), 3500);
    }
    audio.playObjective();
  }

  function updateObjectiveHUD() {
    const obj = MISSION_OBJECTIVES[Math.min(currentObjectiveIndex, MISSION_OBJECTIVES.length-1)];
    if (objectiveText) objectiveText.textContent = obj.text;
  }

  function checkObjectiveProgress() {
    const alive = enemies.filter(e=>e.alive).length;
    if (currentObjectiveIndex===0 && alive < enemies.length*0.9) setObjective(1);
    if (currentObjectiveIndex===1 && alive < enemies.length*0.6) setObjective(2);
    if (currentObjectiveIndex===2 && alive < enemies.length*0.35) setObjective(3);
    if (currentObjectiveIndex===3 && alive === 0) setObjective(4);
  }

  function damagePlayer(amount) {
    player.health = Math.max(0, player.health - amount);
    totalDamageReceived += amount;
    audio.playPlayerHurt();
    triggerScreenShake(7.0, 0.18);
    damageVignette.classList.add('damaged');
    setTimeout(()=>damageVignette.classList.remove('damaged'), 180);
    updateHUD();
    if (player.health <= 0) triggerGameOver();
  }

  function showNotification(msg) {
    if (!hudNotice) return;
    hudNotice.textContent = msg;
    hudNotice.classList.remove('hidden');
    clearTimeout(hudNotice._t);
    hudNotice._t = setTimeout(()=>hudNotice.classList.add('hidden'), 2400);
  }

  /* ===========================================================================
     20. ANIMACAO DE PULO E AGACHAMENTO
     =========================================================================== */
  function triggerJump() {
    if (player.jumpState !== JUMP_STATES.GROUNDED) return;
    if (player.crouchProgress > 0.35) return; // Não salta agachado
    player.jumpState = JUMP_STATES.RISING;
    player.jumpVelocity = 3.9;
    player.jumpHeight = 0.02;
    audio.playJump();
  }

  function updateJump(dt) {
    if (player.jumpState === JUMP_STATES.GROUNDED) return;

    if (player.jumpState === JUMP_STATES.RISING || player.jumpState === JUMP_STATES.PEAK || player.jumpState === JUMP_STATES.FALLING) {
      player.jumpVelocity -= 10.8 * dt; // Gravidade
      player.jumpHeight += player.jumpVelocity * dt;

      if (Math.abs(player.jumpVelocity) < 0.6) {
        player.jumpState = JUMP_STATES.PEAK;
      } else if (player.jumpVelocity < -0.6) {
        player.jumpState = JUMP_STATES.FALLING;
      }

      if (player.jumpHeight <= 0) {
        player.jumpHeight = 0;
        player.jumpVelocity = 0;
        player.jumpState = JUMP_STATES.LANDING;
        player.landingTimer = 0.18;
        audio.playLand();
        triggerScreenShake(3.2, 0.12);
      }
    } else if (player.jumpState === JUMP_STATES.LANDING) {
      player.landingTimer -= dt;
      player.landingProgress = Math.max(0, player.landingTimer / 0.18);
      if (player.landingTimer <= 0) {
        player.jumpState = JUMP_STATES.GROUNDED;
        player.landingProgress = 0;
      }
    }
  }

  function updateCrouch(dt) {
    // Alvo do agachamento
    const wantsCrouch = keys.ctrl && player.jumpState === JUMP_STATES.GROUNDED;
    player.isCrouching = wantsCrouch;
    const target = wantsCrouch ? 1.0 : 0.0;
    // Transição suave gradual
    player.crouchProgress += (target - player.crouchProgress) * Math.min(1.0, dt * 11.5);
  }

  /* ===========================================================================
     21. LOOP PRINCIPAL DE ATUALIZACAO (UPDATE)
     =========================================================================== */
  function update(dt) {
    if (gameState !== 'PLAYING') return;

    missionElapsedTime = (performance.now() - missionStartTime) / 1000;
    if (missionTimer) missionTimer.textContent = formatTime(missionElapsedTime);

    // Recarga
    const ws = getCurrentWeapon();
    if (ws && ws.isReloading) {
      const elapsed = performance.now() - ws.reloadStartTime;
      if (elapsed >= ws.def.reloadTime) {
        const need = ws.def.magSize - ws.ammo;
        const take = Math.min(need, ws.reserve);
        ws.ammo += take; ws.reserve -= take;
        ws.isReloading = false;
        reloadIndicator.classList.add('hidden');
        updateHUD();
      }
    }

    // Disparo automático continuo para armas automáticas (M4)
    if (isMouseDown && ws && ws.def.isAuto) {
      shootWeapon();
    }

    // Atualização de movimentação, pulo e agachamento
    updateCrouch(dt);
    updateJump(dt);
    updatePlayerMovement(dt);
    updateStamina(dt);

    // Amortecimento de recuo e sway da arma
    recoilDispY *= Math.exp(-dt * 15);
    recoilPitch *= Math.exp(-dt * 16);
    recoilSide *= Math.exp(-dt * 18);
    weaponSwayX *= Math.exp(-dt * 12);
    weaponSwayY *= Math.exp(-dt * 12);

    // Verificação de limpeza de flash do jogador
    if (playerFlash.active && performance.now() - playerFlash.startTime >= playerFlash.duration) {
      playerFlash.active = false;
      if (muzzleFlashFx) muzzleFlashFx.style.opacity = '0';
    }

    // Tremor de tela
    if (screenShakeTimer > 0) {
      screenShakeTimer -= dt;
      if (screenShakeTimer <= 0) screenShakeIntensity = 0;
    }

    // Hitmarker timer
    if (hitmarkerTimer > 0) {
      hitmarkerTimer--;
      if (hitmarkerTimer === 0) hitmarkerEl.classList.add('hidden');
    }

    // IA dos Inimigos
    enemies.forEach(en => { if(en.alive) updateEnemy(en, dt); });

    // Pickups
    pickups.forEach(p => {
      if (!p.alive) return;
      const dx = player.x - p.x, dy = player.y - p.y;
      if (dx*dx + dy*dy < 0.6) {
        p.alive = false;
        if (p.type === 'health') {
          player.health = Math.min(100, player.health + 30);
          showNotification('+30 VIDA'); audio.playHit();
        } else {
          const curW = getCurrentWeapon();
          if (curW) {
            curW.reserve = Math.min(curW.def.magSize * 4, curW.reserve + curW.def.magSize);
            showNotification('+MUNICAO'); audio.playHit();
          }
        }
        updateHUD();
      }
    });

    // Partículas de combate
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.z += pt.vz * dt;
      pt.vz -= 8.5 * dt;
      if (pt.z < 0) { pt.z = 0; pt.vz = -pt.vz * 0.28; }
      pt.life -= dt;
      if (pt.life <= 0) particles.splice(i, 1);
    }

    // Partículas de fumaça da arma
    for (let i = smokePuffs.length - 1; i >= 0; i--) {
      const sm = smokePuffs[i];
      sm.x += sm.vx * dt; sm.y += sm.vy * dt;
      sm.size += sm.growth * dt;
      sm.alpha -= sm.fadeRate * dt;
      if (sm.alpha <= 0) smokePuffs.splice(i, 1);
    }

    // Cápsulas ejetadas
    for (let i = brassCasings.length - 1; i >= 0; i--) {
      const c = brassCasings[i];
      c.x += c.vx * dt; c.y += c.vy * dt;
      c.vy += 850 * dt; // gravidade na tela
      c.rot += c.rotSpd * dt;
      c.life -= dt;
      if (c.life <= 0) brassCasings.splice(i, 1);
    }

    // Poeira ambiente da caverna
    updateAmbientMotes(dt);

    // Interações de cenário
    updateInteractPrompt();

    // Sons de passos (mais lentos e suaves no agachamento)
    if (player.isMoving && player.jumpState === JUMP_STATES.GROUNDED) {
      footstepTimer += dt;
      const stepInterval = player.isCrouching ? 0.65 : (player.isRunning ? 0.27 : 0.42);
      if (footstepTimer > stepInterval) {
        footstepTimer = 0;
        if (player.crouchProgress < 0.8) audio.playFootstep();
      }
    } else {
      footstepTimer = 0;
    }

    // Verificar saída
    const edx = player.x - EXIT_POS.x, edy = player.y - EXIT_POS.y;
    if (chestOpened && !exitReached && edx*edx + edy*edy < 2.5) {
      exitReached = true;
      setTimeout(triggerMissionComplete, 800);
    }
  }

  function updatePlayerMovement(dt) {
    let mx = 0, my = 0;
    if (keys.w) { mx += player.dirX; my += player.dirY; }
    if (keys.s) { mx -= player.dirX; my -= player.dirY; }
    if (keys.d) { mx += player.planeX; my += player.planeY; }
    if (keys.a) { mx -= player.planeX; my -= player.planeY; }
    const mlen = Math.sqrt(mx*mx + my*my);
    player.isMoving = mlen > 0.01;

    if (player.isMoving) {
      mx /= mlen; my /= mlen;
      // Não pode correr agachado
      player.isRunning = keys.shift && player.stamina > 0 && player.crouchProgress < 0.35 && player.jumpState === JUMP_STATES.GROUNDED;
      const speedMult = (player.isRunning ? 1.72 : 1.0) * (1.0 - player.crouchProgress * 0.52);
      const spd = player.speed * speedMult * dt;
      const rad = 0.26;

      const nx = player.x + mx * spd;
      const cx1 = Math.floor(nx + (mx > 0 ? rad : -rad));
      if (worldMap[Math.floor(player.y)] && worldMap[Math.floor(player.y)][cx1] === 0) player.x = nx;

      const ny = player.y + my * spd;
      const cy1 = Math.floor(ny + (my > 0 ? rad : -rad));
      if (worldMap[cy1] && worldMap[cy1][Math.floor(player.x)] === 0) player.y = ny;

      // Bobbing sincronizado com a velocidade
      player.bobbingTime += dt * (player.isRunning ? 13 : (player.isCrouching ? 4.5 : 7.5));
      const bobAmp = player.isRunning ? 7.5 : (player.isCrouching ? 2.0 : 4.2);
      player.bobbingOffset = Math.sin(player.bobbingTime) * bobAmp;
    } else {
      player.isRunning = false;
      player.bobbingOffset *= 0.85;
    }
  }

  function updateStamina(dt) {
    if (player.isRunning && player.isMoving) {
      player.stamina = Math.max(0, player.stamina - dt * 22);
    } else {
      player.stamina = Math.min(100, player.stamina + dt * 13);
    }
    if (staminaNumber) staminaNumber.textContent = Math.floor(player.stamina);
    if (staminaBarFill) {
      staminaBarFill.style.width = player.stamina + '%';
      staminaBarFill.classList.toggle('low', player.stamina < 25);
    }
  }

  function updateInteractPrompt() {
    const cdx = player.x - CHEST_POS.x, cdy = player.y - CHEST_POS.y;
    const nearChest = !chestOpened && cdx*cdx + cdy*cdy < 2.5;
    const edx = player.x - EXIT_POS.x, edy = player.y - EXIT_POS.y;
    const nearExit = chestOpened && !exitReached && edx*edx + edy*edy < 3.0;

    if (nearChest) {
      interactPrompt.classList.remove('hidden');
      if (interactText) interactText.textContent = 'ABRIR BAU';
      if (keys.e) { keys.e = false; tryInteract(); }
    } else if (nearExit) {
      interactPrompt.classList.remove('hidden');
      if (interactText) interactText.textContent = 'SAIDA DA MINA';
      if (keys.e) { keys.e = false; tryInteract(); }
    } else {
      interactPrompt.classList.add('hidden');
    }
  }

  /* ===========================================================================
     22. IA DOS INIMIGOS E DISPARO SINCRONIZADO
     =========================================================================== */
  function updateEnemy(en, dt) {
    if (en.hurtTimer > 0) {
      en.hurtTimer -= dt;
      if (en.hurtTimer <= 0 && en.state === 'hurt') en.state = 'alert';
    }

    const dx = player.x - en.x, dy = player.y - en.y;
    const dist = Math.sqrt(dx*dx + dy*dy);

    // Stealth: Jogador agachado tem detecção reduzida em 40%
    const stealthMult = 1.0 - (player.crouchProgress * 0.42);
    const effectiveDetectRange = en.detectRange * stealthMult;

    switch(en.state) {
      case 'patrol': updateEnemyPatrol(en, dt, dist, effectiveDetectRange); break;
      case 'alert':  updateEnemyAlert(en, dt, dist, effectiveDetectRange); break;
      case 'chase':  updateEnemyChase(en, dt, dx, dy, dist, effectiveDetectRange); break;
      case 'attack': updateEnemyAttack(en, dt, dx, dy, dist, effectiveDetectRange); break;
      case 'reload': updateEnemyReload(en, dt); break;
      case 'hurt':   break;
      default: break;
    }
    en.idleCycle += dt * 2.2;
    if (en.isMoving) en.walkCycle += dt * 7.5;
  }

  function updateEnemyPatrol(en, dt, dist, detectRange) {
    en.isMoving = true;
    en.patrolTimer -= dt;
    if (en.patrolTimer <= 0) {
      const ang = Math.random() * Math.PI * 2;
      en.patrolDirX = Math.cos(ang); en.patrolDirY = Math.sin(ang);
      en.patrolTimer = 2.0 + Math.random() * 3.5;
    }
    const spd = en.speed * 0.35 * dt;
    const nx = en.x + en.patrolDirX * spd, ny = en.y + en.patrolDirY * spd;
    if (worldMap[Math.floor(en.y)] && worldMap[Math.floor(en.y)][Math.floor(nx)] === 0) en.x = nx;
    if (worldMap[Math.floor(ny)] && worldMap[Math.floor(ny)][Math.floor(en.x)] === 0) en.y = ny;

    if (dist < detectRange) {
      en.state = 'alert';
      en.alertTimer = en.reactionTime;
    }
  }

  function updateEnemyAlert(en, dt, dist, detectRange) {
    en.isMoving = false;
    en.alertTimer -= dt;
    if (en.alertTimer <= 0) en.state = 'chase';
    if (dist > detectRange * 1.45) en.state = 'patrol';
  }

  function updateEnemyChase(en, dt, dx, dy, dist, detectRange) {
    if (dist > detectRange * 1.55) { en.state = 'patrol'; en.isMoving = false; return; }
    if (dist < 1.6) { en.state = 'attack'; en.attackTimer = 0; en.isMoving = false; return; }
    en.isMoving = true;
    const spd = en.speed * dt;
    const vx = (dx / dist) * spd, vy = (dy / dist) * spd;
    if (worldMap[Math.floor(en.y)] && worldMap[Math.floor(en.y)][Math.floor(en.x + vx)] === 0) en.x += vx;
    if (worldMap[Math.floor(en.y + vy)] && worldMap[Math.floor(en.y + vy)][Math.floor(en.x)] === 0) en.y += vy;

    if (dist < detectRange * 0.75) en.state = 'attack';
  }

  function updateEnemyAttack(en, dt, dx, dy, dist, detectRange) {
    en.isMoving = false;
    if (dist > detectRange * 0.8) { en.state = 'chase'; return; }
    en.attackTimer -= dt;
    if (en.attackTimer <= 0) {
      en.attackTimer = en.attackCooldown * (0.85 + Math.random() * 0.35);
      if (en.ammo > 0) {
        enemyShoot(en, dx, dy, dist);
      } else {
        en.state = 'reload'; en.reloadTimer = 1.6 + Math.random() * 0.7;
      }
    }
  }

  function updateEnemyReload(en, dt) {
    en.isMoving = false;
    en.reloadTimer -= dt;
    if (en.reloadTimer <= 0) {
      en.ammo = 10 + Math.floor(Math.random() * 8);
      en.state = 'chase';
    }
  }

  function enemyShoot(en, dx, dy, dist) {
    en.ammo--;
    // Timestamp de disparo do inimigo
    en.muzzleFlashEndTime = performance.now() + 55;

    const acc = en.accuracy;
    const spread = (1 - acc) * 0.32;
    const sdx = dx/dist + (Math.random()*2-1)*spread;
    const sdy = dy/dist + (Math.random()*2-1)*spread;
    const len = Math.sqrt(sdx*sdx + sdy*sdy);

    const hitDist = castBulletRay(en.x, en.y, sdx/len, sdy/len);
    const pdx = player.x - en.x, pdy = player.y - en.y;
    const pd = Math.sqrt(pdx*pdx + pdy*pdy);

    if (hitDist > pd - 0.45) {
      damagePlayer(en.damage);
    }
    audio.playEnemyShoot(en.weapon);
    spawnParticles(en.x, en.y, '#f59e0b', 3);
  }

  /* ===========================================================================
     23. PARTICULAS E EFEITOS
     =========================================================================== */
  function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2, spd = 1.0 + Math.random() * 2.8;
      particles.push({
        x, y, z: 0.5 + Math.random() * 0.4,
        vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, vz: 1.2 + Math.random() * 2.5,
        color, life: 0.35 + Math.random() * 0.4
      });
    }
  }

  function spawnWallImpactEffects(hx, hy) {
    // Faíscas
    spawnParticles(hx, hy, '#facc15', 3);
    // Fragmentos de rocha da caverna
    spawnParticles(hx, hy, '#64748b', 4);
  }

  function spawnWeaponSmokePuff(count) {
    for (let i = 0; i < count; i++) {
      smokePuffs.push({
        x: (canvas.width / 2) + 20 + (Math.random() * 14 - 7),
        y: canvas.height * 0.72 + (Math.random() * 10 - 5),
        vx: (Math.random() * 18 - 9),
        vy: -25 - Math.random() * 35,
        size: 7 + Math.random() * 6,
        growth: 24 + Math.random() * 18,
        alpha: 0.45 + Math.random() * 0.25,
        fadeRate: 1.2 + Math.random() * 0.6
      });
    }
  }

  function spawnBrassCasing(color) {
    brassCasings.push({
      x: (canvas.width / 2) + 40,
      y: canvas.height * 0.78,
      vx: 180 + Math.random() * 90,
      vy: -140 - Math.random() * 80,
      rot: 0,
      rotSpd: (Math.random() * 2 - 1) * 22,
      color,
      life: 0.55
    });
    audio.playCasing();
  }

  function initAmbientMotes() {
    ambientMotes = [];
    const count = settings.quality === 'high' ? 65 : (settings.quality === 'medium' ? 35 : 15);
    for (let i = 0; i < count; i++) {
      ambientMotes.push({
        x: Math.random() * MAP_W,
        y: Math.random() * MAP_H,
        z: 0.1 + Math.random() * 0.8,
        vx: (Math.random() * 2 - 1) * 0.08,
        vy: (Math.random() * 2 - 1) * 0.08,
        size: 1.2 + Math.random() * 2.2,
        seed: Math.random() * 100
      });
    }
  }

  function updateAmbientMotes(dt) {
    const t = performance.now() * 0.001;
    for (let i = 0; i < ambientMotes.length; i++) {
      const m = ambientMotes[i];
      m.x += (m.vx + Math.sin(t + m.seed) * 0.04) * dt;
      m.y += (m.vy + Math.cos(t + m.seed * 1.3) * 0.04) * dt;
      if (m.x < 1) m.x = MAP_W - 2;
      if (m.x > MAP_W - 2) m.x = 1;
      if (m.y < 1) m.y = MAP_H - 2;
      if (m.y > MAP_H - 2) m.y = 1;
    }
  }

  /* ===========================================================================
     24. HUD E ATUALIZACOES VISUAIS
     =========================================================================== */
  function updateHUD() {
    if (!hudEl) return;
    if (healthNumber) healthNumber.textContent = Math.max(0, Math.floor(player.health));
    if (healthBarFill) {
      healthBarFill.style.width = Math.max(0, player.health) + '%';
      healthBarFill.classList.toggle('critical', player.health <= 25);
    }
    const ws = getCurrentWeapon();
    if (ws) {
      if (currentAmmoEl) currentAmmoEl.textContent = ws.ammo;
      if (reserveAmmoEl) reserveAmmoEl.textContent = ws.reserve;
      if (currentWeaponName) currentWeaponName.textContent = ws.def.shortName;
      if (bulletPipsEl) {
        bulletPipsEl.innerHTML = '';
        const total = Math.min(ws.def.magSize, 30);
        for (let i = 0; i < total; i++) {
          const p = document.createElement('div');
          p.className = 'bullet-pip' + (i < ws.ammo ? '' : ' empty');
          bulletPipsEl.appendChild(p);
        }
      }
    }
  }

  function updateWeaponSlots() {
    if (!weaponSlotsEl) return;
    weaponSlotsEl.innerHTML = '';
    player.weapons.forEach((w, i) => {
      const slot = document.createElement('div');
      slot.className = 'weapon-slot' + (i === player.currentWeaponIdx ? ' active' : '');
      slot.textContent = '[' + (i + 1) + '] ' + w.def.shortName;
      slot.addEventListener('click', () => switchWeapon(i));
      weaponSlotsEl.appendChild(slot);
    });
  }

  /* ===========================================================================
     25. RENDERIZACAO PRINCIPAL (RAYCASTER COM TEXTURAS VERTICAIS E ILUMINACAO)
     =========================================================================== */
  function render() {
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    if (w === 0 || h === 0) return;
    if (zBuffer.length !== w) zBuffer = new Float32Array(w);

    ctx.save();

    // Screen Shake dinâmico
    if (screenShakeIntensity > 0) {
      const sx = (Math.random() * 2 - 1) * screenShakeIntensity;
      const sy = (Math.random() * 2 - 1) * screenShakeIntensity;
      ctx.translate(sx, sy);
    }

    // Altura da Câmera (Agachamento e Pulo suaves)
    const crouchEyeOffset = player.crouchProgress * 42;
    // O pulo afeta o horizonte de forma sutil e natural
    const jumpEyeOffset = player.jumpHeight * -48;
    const landingEyeOffset = player.landingProgress * 12;

    const pitchOffset = Math.floor(player.pitch + player.bobbingOffset + crouchEyeOffset + jumpEyeOffset + landingEyeOffset);
    const horizon = Math.floor(h / 2) + pitchOffset;

    // Fundo da Caverna (Teto e Chão realistas com profundidade)
    renderCaveBackground(w, h, horizon);

    // Preparação de Luzes Dinâmicas das Tochas
    const activeTorches = caveProps.filter(p => p.type === 'lantern');
    const nowTime = performance.now();
    const isPlayerFlashing = playerFlash.active;

    // RAYCASTING
    for (let x = 0; x < w; x++) {
      const camX = (2 * x) / w - 1;
      const rayDX = player.dirX + player.planeX * camX;
      const rayDY = player.dirY + player.planeY * camX;
      let mapX = Math.floor(player.x), mapY = Math.floor(player.y);
      const ddX = Math.abs(1 / (rayDX || 0.00001)), ddY = Math.abs(1 / (rayDY || 0.00001));
      let stepX, stepY, sdX, sdY;

      if (rayDX < 0) { stepX = -1; sdX = (player.x - mapX) * ddX; }
      else { stepX = 1; sdX = (mapX + 1.0 - player.x) * ddX; }

      if (rayDY < 0) { stepY = -1; sdY = (player.y - mapY) * ddY; }
      else { stepY = 1; sdY = (mapY + 1.0 - player.y) * ddY; }

      let hit = 0, side = 0;
      while (!hit) {
        if (sdX < sdY) { sdX += ddX; mapX += stepX; side = 0; }
        else { sdY += ddY; mapY += stepY; side = 1; }

        if (mapX < 0 || mapX >= MAP_W || mapY < 0 || mapY >= MAP_H) { hit = 1; break; }
        if (worldMap[mapY][mapX] > 0) hit = 1;
      }

      let pwd;
      if (side === 0) pwd = (mapX - player.x + (1 - stepX) / 2) / rayDX;
      else pwd = (mapY - player.y + (1 - stepY) / 2) / rayDY;
      pwd = Math.max(0.06, pwd);
      zBuffer[x] = pwd;

      const lh = Math.floor(h / pwd);
      const ds = Math.floor(-lh / 2 + horizon);
      const de = Math.floor(lh / 2 + horizon);

      let wx;
      if (side === 0) wx = player.y + pwd * rayDY;
      else wx = player.x + pwd * rayDX;
      wx -= Math.floor(wx);

      let txX = Math.floor(wx * TEX_SIZE);
      if (side === 0 && rayDX > 0) txX = TEX_SIZE - txX - 1;
      if (side === 1 && rayDY < 0) txX = TEX_SIZE - txX - 1;

      const wt = (worldMap[mapY] && worldMap[mapY][mapX]) || 1;
      const texCanvas = texCanvases[wt] || texCanvases[1];

      // Coordenadas mundiais exatas do ponto de impacto na parede
      const wallWorldX = player.x + pwd * rayDX;
      const wallWorldY = player.y + pwd * rayDY;

      // Iluminação Dinâmica das Tochas no ponto da parede
      let torchLighting = 0;
      for (let t = 0; t < activeTorches.length; t++) {
        const torch = activeTorches[t];
        const tdx = torch.x - wallWorldX, tdy = torch.y - wallWorldY;
        const tDist2 = tdx * tdx + tdy * tdy;
        if (tDist2 < 20.25) { // Raio de luz de 4.5 unidades
          const distT = Math.sqrt(tDist2);
          const flicker = 0.85 + Math.sin(nowTime * 0.008 + torch.flameSeed) * 0.12 + Math.cos(nowTime * 0.02 + torch.id) * 0.05;
          const atten = Math.max(0, 1 - (distT / 4.5));
          torchLighting += atten * atten * flicker;
        }
      }

      // Clarão do disparo do jogador iluminando as paredes próximas
      let gunFlashLight = 0;
      if (isPlayerFlashing && pwd < 8.0) {
        gunFlashLight = (1 - (pwd / 8.0)) * playerFlash.intensity * 0.65;
      }

      // Renderização com Mapeamento Vertical GPU-Accelerated
      renderWallSliceUpgraded(ctx, x, ds, de, txX, texCanvas, side, pwd, torchLighting, gunFlashLight);
    }

    // Sprites Ordenados (Inimigos, Tochas, Carrinhos, TNT, Baú, Saída)
    renderSprites(w, h, horizon);

    // Partículas de fumaça da arma
    renderWeaponSmoke(ctx);

    // Cápsulas de bala ejetadas
    renderBrassCasings(ctx);

    // Arma e Mão em Primeira Pessoa
    renderWeapon(w, h);

    // Minimapa tático
    renderMinimap();

    ctx.restore();
  }

  function renderCaveBackground(w, h, horizon) {
    // Teto rochoso irregular com profundidade
    const ceilGrad = ctx.createLinearGradient(0, 0, 0, horizon);
    ceilGrad.addColorStop(0, '#060504');
    ceilGrad.addColorStop(0.55, '#120f0c');
    ceilGrad.addColorStop(1, '#1c1611');
    ctx.fillStyle = ceilGrad;
    ctx.fillRect(0, 0, w, horizon);

    // Estalactites e formações de rocha no topo
    ctx.fillStyle = 'rgba(10, 8, 6, 0.65)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    const step = 45;
    for (let x = 0; x <= w; x += step) {
      const sy = 12 + Math.sin(x * 0.02) * 14 + ((x % 3 === 0) ? 22 : 0);
      ctx.lineTo(x, sy);
    }
    ctx.lineTo(w, 0);
    ctx.closePath();
    ctx.fill();

    // Chão de mina escura com textura de cascalho e terra
    const floorGrad = ctx.createLinearGradient(0, horizon, 0, h);
    floorGrad.addColorStop(0, '#17120c');
    floorGrad.addColorStop(0.35, '#130e09');
    floorGrad.addColorStop(0.75, '#0c0906');
    floorGrad.addColorStop(1, '#060403');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, horizon, w, h - horizon);

    // Iluminação ambiental suave das tochas
    const t = performance.now() * 0.001;
    const glowColors = [
      'rgba(245,158,11,0.035)',
      'rgba(234,88,12,0.025)',
      'rgba(250,204,21,0.02)'
    ];
    glowColors.forEach((col, i) => {
      const lx = (w * 0.3) + Math.sin(t * 0.6 + i * 2.2) * (w * 0.05);
      const ly = horizon + Math.sin(t * 0.4 + i) * 15;
      const radGrad = ctx.createRadialGradient(lx, ly, 0, lx, ly, w * 0.35);
      radGrad.addColorStop(0, col);
      radGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, w, h);
    });
  }

  function renderWallSliceUpgraded(ctx, screenX, drawStart, drawEnd, texX, texCanvas, side, pwd, torchLight, gunFlash) {
    const cs = Math.max(0, drawStart), ce = Math.min(canvas.height, drawEnd);
    if (cs >= ce) return;

    // 1. Desenho da Fatia Vertical Texturizada Real (100% geométrica e sem distorção)
    ctx.drawImage(texCanvas, texX, 0, 1, TEX_SIZE, screenX, drawStart, 1, drawEnd - drawStart);

    // 2. Sombra direcional por lado (lado 0 = luz direta, lado 1 = sombra lateral)
    const sideDark = side === 1 ? 0.28 : 0.08;

    // 3. Névoa de profundidade volumétrica da caverna (Dark Cave Atmospheric Fog)
    const fogFactor = Math.min(0.96, Math.max(0, (pwd - 1.2) * 0.075));
    const totalDarkness = Math.min(0.96, sideDark + fogFactor);

    if (totalDarkness > 0.01) {
      ctx.fillStyle = `rgba(6, 4, 3, ${totalDarkness.toFixed(3)})`;
      ctx.fillRect(screenX, cs, 1, ce - cs);
    }

    // 4. Iluminação quente das tochas sobre a parede
    if (torchLight > 0.02) {
      const tl = Math.min(0.7, torchLight);
      ctx.fillStyle = `rgba(245, 158, 11, ${tl.toFixed(3)})`;
      ctx.fillRect(screenX, cs, 1, ce - cs);
    }

    // 5. Clarão do disparo iluminando a parede
    if (gunFlash > 0.02) {
      const gf = Math.min(0.75, gunFlash);
      ctx.fillStyle = `rgba(255, 230, 160, ${gf.toFixed(3)})`;
      ctx.fillRect(screenX, cs, 1, ce - cs);
    }
  }

  /* ===========================================================================
     26. RENDERIZACAO DE SPRITES (TOCHAS, CARRINHOS, TNT, BAU, INIMIGOS)
     =========================================================================== */
  function renderSprites(w, h, horizon) {
    const sprites = [];

    // Inimigos
    enemies.forEach(en => {
      if (!en.alive) return;
      const dx = en.x - player.x, dy = en.y - player.y;
      sprites.push({type:'enemy', obj:en, x:en.x, y:en.y, distSq:dx*dx+dy*dy});
    });

    // Props da Caverna
    caveProps.forEach(prop => {
      if (prop.destroyed) return;
      const dx = prop.x - player.x, dy = prop.y - player.y;
      sprites.push({type:prop.type, obj:prop, x:prop.x, y:prop.y, distSq:dx*dx+dy*dy});
    });

    // Baú
    if (!chestOpened) {
      const dx = CHEST_POS.x - player.x, dy = CHEST_POS.y - player.y;
      sprites.push({type:'chest', obj:CHEST_POS, x:CHEST_POS.x, y:CHEST_POS.y, distSq:dx*dx+dy*dy});
    }

    // Saída
    {
      const dx = EXIT_POS.x - player.x, dy = EXIT_POS.y - player.y;
      sprites.push({type:'exit', obj:EXIT_POS, x:EXIT_POS.x, y:EXIT_POS.y, distSq:dx*dx+dy*dy});
    }

    // Pickups
    pickups.forEach(p => {
      if (!p.alive) return;
      const dx = p.x - player.x, dy = p.y - player.y;
      sprites.push({type:'pickup', obj:p, x:p.x, y:p.y, distSq:dx*dx+dy*dy});
    });

    // Partículas de combate
    particles.forEach(pt => {
      const dx = pt.x - player.x, dy = pt.y - player.y;
      sprites.push({type:'particle', obj:pt, x:pt.x, y:pt.y, z:pt.z, distSq:dx*dx+dy*dy});
    });

    // Poeira ambiente
    ambientMotes.forEach(m => {
      const dx = m.x - player.x, dy = m.y - player.y;
      const d2 = dx*dx + dy*dy;
      if (d2 < 64) {
        sprites.push({type:'mote', obj:m, x:m.x, y:m.y, z:m.z, distSq:d2});
      }
    });

    // Ordenação de profundidade (farthest to nearest)
    sprites.sort((a,b) => b.distSq - a.distSq);

    const now = performance.now();

    sprites.forEach(item => {
      const sx = item.x - player.x, sy = item.y - player.y;
      const invD = 1.0 / (player.planeX * player.dirY - player.dirX * player.planeY);
      const txf = invD * (player.dirY * sx - player.dirX * sy);
      const tyf = invD * (-player.planeY * sx + player.planeX * sy);
      if (tyf <= 0.12) return;
      const ssx = Math.floor((w / 2) * (1 + txf / tyf));
      const dist = tyf;

      // Poeira suspensa
      if (item.type === 'mote') {
        const m = item.obj;
        const mSz = Math.max(1, Math.floor((h / dist) * 0.018 * m.size));
        const mSy = Math.floor(horizon - (m.z - 0.5) * (h / dist));
        if (ssx >= 0 && ssx < w && dist < zBuffer[ssx]) {
          const t = now * 0.001;
          const alpha = 0.2 + Math.sin(t + m.seed) * 0.15;
          ctx.fillStyle = `rgba(230, 210, 180, ${alpha.toFixed(2)})`;
          ctx.beginPath(); ctx.arc(ssx, mSy, mSz, 0, Math.PI * 2); ctx.fill();
        }
        return;
      }

      // Partículas de impacto
      if (item.type === 'particle') {
        const pt = item.obj;
        const pSz = Math.max(2, Math.floor((h / dist) * 0.035));
        const pSy = Math.floor(horizon - (pt.z - 0.5) * (h / dist));
        if (ssx >= 0 && ssx < w && dist < zBuffer[ssx]) {
          ctx.fillStyle = pt.color;
          ctx.fillRect(ssx - pSz / 2, pSy - pSz / 2, pSz, pSz);
        }
        return;
      }

      // Pickups (Vida e Munição)
      if (item.type === 'pickup') {
        const p = item.obj;
        const sz = Math.abs(Math.floor((h / dist) * 0.32));
        const dy2 = Math.floor(horizon + (h / dist) * 0.22 - sz / 2);
        if (ssx >= 0 && ssx < w && dist < zBuffer[ssx]) {
          const pulse = 0.8 + Math.sin(now * 0.006) * 0.2;
          ctx.fillStyle = p.type === 'health' ? '#22c55e' : '#f59e0b';
          ctx.beginPath(); ctx.arc(ssx, dy2, sz / 2 * pulse, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(ssx - sz * 0.14, dy2 - sz * 0.32, sz * 0.28, sz * 0.24);
        }
        return;
      }

      // Tocha / Lanterna da Mina (Chama Animada e Iluminação)
      if (item.type === 'lantern') {
        const sz = Math.abs(Math.floor((h / dist) * 0.38));
        const dy2 = Math.floor(horizon - (h / dist) * 0.12);
        if (ssx >= 0 && ssx < w && dist < zBuffer[ssx]) {
          renderTorchSprite(ctx, ssx, dy2, sz, dist, item.obj);
        }
        return;
      }

      // Carrinho de Mina
      if (item.type === 'minecart') {
        const sz = Math.abs(Math.floor((h / dist) * 0.72));
        const dy2 = Math.floor(horizon + (h / dist) * 0.2);
        renderMinecartSprite(ctx, ssx, dy2, sz, dist, w);
        return;
      }

      // Barril de Madeira
      if (item.type === 'barrel') {
        const sz = Math.abs(Math.floor((h / dist) * 0.58));
        const dy2 = Math.floor(horizon + (h / dist) * 0.16);
        renderBarrelSprite(ctx, ssx, dy2, sz, dist, w);
        return;
      }

      // Caixa de Madeira
      if (item.type === 'crate') {
        const sz = Math.abs(Math.floor((h / dist) * 0.52));
        const dy2 = Math.floor(horizon + (h / dist) * 0.16);
        renderCrateSprite(ctx, ssx, dy2, sz, dist, w);
        return;
      }

      // TNT Dinamite
      if (item.type === 'tnt') {
        const sz = Math.abs(Math.floor((h / dist) * 0.46));
        const dy2 = Math.floor(horizon + (h / dist) * 0.14);
        renderTNTSprite(ctx, ssx, dy2, sz, dist, w);
        return;
      }

      // Baú com Nova Arma
      if (item.type === 'chest') {
        const sz = Math.abs(Math.floor((h / dist) * 0.65));
        const dy2 = Math.floor(horizon + (h / dist) * 0.14);
        renderChestSprite(ctx, ssx, dy2, sz, dist, w);
        return;
      }

      // Saída da Caverna
      if (item.type === 'exit') {
        if (!chestOpened) return;
        const sz = Math.abs(Math.floor((h / dist) * 1.05));
        const dy2 = Math.floor(horizon);
        renderExitPortal(ctx, ssx, dy2, sz, dist, w);
        return;
      }

      // Inimigo
      if (item.type === 'enemy') {
        renderEnemy(item.obj, ssx, dist, w, h, horizon);
        return;
      }
    });
  }

  /* ---- RENDERIZADORES DE SPRITES DA MINA ---- */

  function renderTorchSprite(ctx, sx, sy, sz, dist, torchObj) {
    const t = performance.now() * 0.005;
    const flicker = 0.85 + Math.sin(t * 4 + torchObj.flameSeed) * 0.15;

    // Suporte de ferro forjado
    ctx.fillStyle = '#1c1f24';
    ctx.fillRect(sx - sz * 0.08, sy + sz * 0.12, sz * 0.16, sz * 0.35);
    ctx.fillRect(sx - sz * 0.2, sy + sz * 0.38, sz * 0.4, sz * 0.08);

    // Tigela da tocha
    ctx.fillStyle = '#2d333b';
    ctx.beginPath();
    ctx.ellipse(sx, sy + sz * 0.14, sz * 0.22, sz * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();

    // Brilho quente radial da tocha
    const haloRad = Math.max(12, sz * 3.2);
    const haloGrad = ctx.createRadialGradient(sx, sy, 2, sx, sy, haloRad);
    haloGrad.addColorStop(0, `rgba(255, 200, 80, ${(0.32 * flicker).toFixed(2)})`);
    haloGrad.addColorStop(0.4, `rgba(245, 158, 11, ${(0.16 * flicker).toFixed(2)})`);
    haloGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = haloGrad;
    ctx.fillRect(sx - haloRad, sy - haloRad, haloRad * 2, haloRad * 2);

    // Chama realista em camadas
    const flameH = sz * 0.55 * (0.9 + Math.sin(t * 8) * 0.15);
    const flameW = sz * 0.24 * (0.9 + Math.cos(t * 6) * 0.15);

    // Camada externa (laranja)
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.moveTo(sx - flameW, sy + sz * 0.1);
    ctx.quadraticCurveTo(sx - flameW * 0.8, sy - flameH * 0.4, sx, sy - flameH);
    ctx.quadraticCurveTo(sx + flameW * 0.8, sy - flameH * 0.4, sx + flameW, sy + sz * 0.1);
    ctx.closePath();
    ctx.fill();

    // Camada média (amarelo)
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(sx - flameW * 0.65, sy + sz * 0.1);
    ctx.quadraticCurveTo(sx - flameW * 0.5, sy - flameH * 0.3, sx, sy - flameH * 0.8);
    ctx.quadraticCurveTo(sx + flameW * 0.5, sy - flameH * 0.3, sx + flameW * 0.65, sy + sz * 0.1);
    ctx.closePath();
    ctx.fill();

    // Núcleo branco incandescente
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(sx, sy + sz * 0.02, flameW * 0.3, flameH * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fagulhas e faíscas subindo
    if (Math.random() < 0.25) {
      const sparkY = sy - flameH - Math.random() * sz * 0.4;
      const sparkX = sx + (Math.random() * 2 - 1) * sz * 0.15;
      ctx.fillStyle = '#fde047';
      ctx.fillRect(sparkX, sparkY, Math.max(1, sz * 0.03), Math.max(1, sz * 0.03));
    }
  }

  function renderMinecartSprite(ctx, ssx, dy2, sz, dist, w) {
    const sw = Math.floor(sz * 1.15);
    const startX = Math.floor(ssx - sw / 2), endX = Math.floor(ssx + sw / 2);
    if (endX < 0 || startX >= w) return;
    const shade = Math.min(1.0, 0.95 / (0.1 + dist * 0.065));

    for (let x = startX; x < endX; x++) {
      if (x >= 0 && x < w && dist < zBuffer[x]) {
        const rx = (x - startX) / sw;
        // Corpo metálico do carrinho
        const r = Math.floor(52 * shade), g = Math.floor(56 * shade), b = Math.floor(62 * shade);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, dy2 - sz * 0.58, 1, sz * 0.5);

        // Minérios de ouro e carvão acumulados no topo
        if (rx > 0.15 && rx < 0.85) {
          const oreH = Math.sin(rx * Math.PI) * (sz * 0.2);
          ctx.fillStyle = rx % 0.2 < 0.08 ? `rgba(234,179,8,${shade})` : `rgba(24,24,27,${shade})`;
          ctx.fillRect(x, dy2 - sz * 0.58 - oreH, 1, oreH);
        }

        // Borda e reforço de metal
        if (rx < 0.08 || rx > 0.92 || Math.abs(rx - 0.5) < 0.04) {
          ctx.fillStyle = `rgba(30, 36, 44, ${shade})`;
          ctx.fillRect(x, dy2 - sz * 0.58, 1, sz * 0.5);
        }

        // Rodas de flange sobre o trilho
        if (Math.abs(rx - 0.25) < 0.08 || Math.abs(rx - 0.75) < 0.08) {
          ctx.fillStyle = `rgba(18, 22, 28, ${shade})`;
          ctx.fillRect(x, dy2 - sz * 0.14, 1, sz * 0.16);
          ctx.fillStyle = `rgba(148, 163, 184, ${shade * 0.7})`;
          ctx.fillRect(x, dy2 - sz * 0.08, 1, sz * 0.05);
        }
      }
    }
  }

  function renderBarrelSprite(ctx, ssx, dy2, sz, dist, w) {
    const bw = Math.floor(sz * 0.58);
    const startX = Math.floor(ssx - bw / 2), endX = Math.floor(ssx + bw / 2);
    if (endX < 0 || startX >= w) return;
    const shade = Math.min(1.0, 0.9 / (0.1 + dist * 0.07));

    for (let x = startX; x < endX; x++) {
      if (x >= 0 && x < w && dist < zBuffer[x]) {
        const rx = (x - startX) / bw;
        const bulge = Math.sin(rx * Math.PI);
        const curH = sz * (0.88 + bulge * 0.12);

        // Tábuas de madeira curvada
        const r = Math.floor((90 + bulge * 20) * shade);
        const g = Math.floor((55 + bulge * 15) * shade);
        const b = Math.floor((30 + bulge * 10) * shade);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, dy2 - curH, 1, curH);

        // Aros de ferro com rebites
        if (Math.abs(rx - 0.18) < 0.04 || Math.abs(rx - 0.82) < 0.04 || Math.abs(rx - 0.5) < 0.04) {
          ctx.fillStyle = `rgba(35, 40, 48, ${shade})`;
          ctx.fillRect(x, dy2 - curH, 1, curH);
          ctx.fillStyle = `rgba(140, 155, 175, ${shade * 0.8})`;
          ctx.fillRect(x, dy2 - curH * 0.6, 1, curH * 0.06);
        }
      }
    }
  }

  function renderCrateSprite(ctx, ssx, dy2, sz, dist, w) {
    const startX = Math.floor(ssx - sz / 2), endX = Math.floor(ssx + sz / 2);
    if (endX < 0 || startX >= w) return;
    const shade = Math.min(1.0, 0.9 / (0.1 + dist * 0.07));

    for (let x = startX; x < endX; x++) {
      if (x >= 0 && x < w && dist < zBuffer[x]) {
        const r = Math.floor(105 * shade), g = Math.floor(72 * shade), b = Math.floor(40 * shade);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, dy2 - sz, 1, sz);

        // Vigas de reforço em X
        if ((x - startX) % Math.max(3, Math.floor(sz / 3.5)) < 1.5) {
          ctx.fillStyle = `rgba(45, 28, 12, ${shade})`;
          ctx.fillRect(x, dy2 - sz, 1, sz);
        }
      }
    }
  }

  function renderTNTSprite(ctx, ssx, dy2, sz, dist, w) {
    if (ssx < -sz || ssx > w + sz || dist >= zBuffer[ssx]) return;
    const shade = Math.min(1.0, 0.95 / (0.1 + dist * 0.065));

    // Corpo da dinamite vermelha
    ctx.fillStyle = `rgb(${Math.floor(200*shade)},${Math.floor(35*shade)},${Math.floor(35*shade)})`;
    ctx.fillRect(ssx - sz / 2, dy2 - sz, sz, sz);

    // Faixa de papel e aviso
    ctx.fillStyle = `rgba(245, 240, 230, ${shade})`;
    ctx.fillRect(ssx - sz * 0.46, dy2 - sz * 0.65, sz * 0.92, sz * 0.3);
    ctx.fillStyle = '#dc2626';
    ctx.font = `bold ${Math.max(8, Math.floor(sz * 0.25))}px Orbitron, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('TNT', ssx, dy2 - sz * 0.42);

    // Pavio aceso com faísca
    const fuseY = dy2 - sz - sz * 0.18;
    ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ssx, dy2 - sz);
    ctx.quadraticCurveTo(ssx + sz * 0.1, fuseY + 4, ssx, fuseY);
    ctx.stroke();

    // Faísca do pavio
    const t = performance.now() * 0.01;
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(ssx + Math.sin(t) * 2, fuseY, Math.max(2, sz * 0.06), 0, Math.PI * 2);
    ctx.fill();
  }

  function renderChestSprite(ctx, ssx, dy2, sz, dist, w) {
    const sw = Math.floor(sz * 1.15);
    const startX = Math.floor(ssx - sw / 2), endX = Math.floor(ssx + sw / 2);
    if (endX < 0 || startX >= w) return;
    const t = performance.now() * 0.004;
    const glow = 0.7 + Math.sin(t) * 0.3;

    for (let x = startX; x < endX; x++) {
      if (x >= 0 && x < w && dist < zBuffer[x]) {
        const shade = Math.min(1.0, 0.95 / (0.1 + dist * 0.065));
        // Madeira nobre do baú
        ctx.fillStyle = `rgb(${Math.floor(120*shade)},${Math.floor(75*shade)},${Math.floor(35*shade)})`;
        ctx.fillRect(x, dy2 - sz, 1, sz);
        // Tampa arredondada reforçada
        ctx.fillStyle = `rgb(${Math.floor(95*shade)},${Math.floor(60*shade)},${Math.floor(25*shade)})`;
        ctx.fillRect(x, dy2 - sz, 1, sz * 0.38);
        // Fechadura dourada mística brilhando
        if (Math.abs(x - ssx) < Math.max(1.5, sw * 0.07)) {
          ctx.fillStyle = `rgba(250, 204, 21, ${(0.95 * glow).toFixed(2)})`;
          ctx.fillRect(x, dy2 - sz * 0.65, 1, sz * 0.25);
        }
      }
    }
    // Indicador UI
    if (ssx >= 0 && ssx < w && dist < 8.5) {
      ctx.fillStyle = `rgba(250, 204, 21, ${glow.toFixed(2)})`;
      ctx.font = `bold ${Math.max(10, Math.floor(17 - dist * 1.3))}px Rajdhani, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('[E] BAU DA MINA', ssx, dy2 - sz - 10);
    }
  }

  function renderExitPortal(ctx, ssx, dy2, sz, dist, w) {
    if (ssx < -sz || ssx > w + sz || dist >= zBuffer[ssx]) return;
    const t2 = performance.now() * 0.005;
    const glow = 0.6 + Math.sin(t2) * 0.4;
    const grad = ctx.createRadialGradient(ssx, dy2, 0, ssx, dy2, sz * 1.1);
    grad.addColorStop(0, `rgba(74, 222, 128, ${(0.85 * glow).toFixed(2)})`);
    grad.addColorStop(0.5, `rgba(34, 197, 94, ${(0.35 * glow).toFixed(2)})`);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(ssx - sz * 1.1, dy2 - sz * 1.1, sz * 2.2, sz * 2.2);

    ctx.fillStyle = `rgba(134, 239, 172, ${glow.toFixed(2)})`;
    ctx.font = `bold ${Math.max(11, Math.floor(20 - dist * 1.1))}px Orbitron, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('SAIDA DA MINA', ssx, dy2 - sz * 0.3);
  }

  /* ===========================================================================
     27. RENDERIZACAO DE INIMIGOS E DISPAROS SINCRONIZADOS
     =========================================================================== */
  function renderEnemy(en, ssx, dist, w, h, horizon) {
    const scale = en.size || 0.88;
    const sprH = Math.abs(Math.floor((h / dist) * 0.94 * scale));
    const sprW = Math.floor(sprH * 0.52);
    const walkSwing = en.isMoving ? Math.sin(en.walkCycle) : 0;
    const bounce = en.isMoving ? Math.abs(Math.sin(en.walkCycle * 2)) * (sprH * 0.025) : Math.sin(en.idleCycle) * (sprH * 0.01);
    const drawY = Math.floor(horizon - sprH * 0.52 - bounce);
    const startX = Math.floor(ssx - sprW / 2);
    const endX = Math.floor(ssx + sprW / 2);
    if (endX < 0 || startX >= w) return;
    const isHurt = en.hurtTimer > 0;
    const shade = Math.min(1.0, 0.92 / (0.1 + dist * 0.09));

    // Renderiza fatias corporais
    for (let stripe = startX; stripe < endX; stripe++) {
      if (stripe < 0 || stripe >= w || dist >= zBuffer[stripe]) continue;
      const relX = (stripe - startX) / sprW;
      renderEnemyStripe(ctx, stripe, drawY, sprH, sprW, relX, walkSwing, en.outfit, isHurt, shade, en.state);
    }

    // Barra de Vida
    const midX = Math.floor(ssx);
    if (midX >= 0 && midX < w && dist < zBuffer[midX] && en.hp < en.maxHp) {
      const bw = Math.max(26, Math.floor(sprW * 0.85));
      const bh = 3.5;
      const bx = midX - bw / 2, by = drawY - 12;
      ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(bx, by, bw, bh);
      const hPct = Math.max(0, en.hp / en.maxHp);
      ctx.fillStyle = hPct > 0.5 ? '#22c55e' : (hPct > 0.25 ? '#facc15' : '#ef4444');
      ctx.fillRect(bx, by, bw * hPct, bh);
    }

    // Muzzle Flash do Inimigo Sincronizado Exatamente na Ponta da Arma
    const isShooting = performance.now() < en.muzzleFlashEndTime;
    if (isShooting && midX >= 0 && midX < w && dist < zBuffer[midX]) {
      // Posição exata do cano na mão direita do inimigo
      const flashX = startX + Math.floor(sprW * 0.92);
      const flashY = drawY + Math.floor(sprH * 0.42);
      const flashSz = Math.max(10, Math.floor(sprW * 0.55));

      const fg = ctx.createRadialGradient(flashX, flashY, 2, flashX, flashY, flashSz);
      fg.addColorStop(0, '#ffffff');
      fg.addColorStop(0.3, '#facc15');
      fg.addColorStop(0.7, 'rgba(234, 88, 12, 0.5)');
      fg.addColorStop(1, 'transparent');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(flashX, flashY, flashSz, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function renderEnemyStripe(ctx, sx, topY, height, width, relX, walkSwing, outfit, isHurt, shade, state) {
    const headH = height * 0.22;
    const bodyH = height * 0.32;
    const legsH = height * 0.34;
    const headTop = topY;
    const bodyTop = headTop + headH;
    const legsTop = bodyTop + bodyH;

    function applyColor(hex) {
      if (isHurt) { ctx.fillStyle = state==='hurt' ? 'rgba(239,68,68,0.95)' : 'rgba(248,113,113,0.8)'; return; }
      const r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
      ctx.fillStyle = `rgb(${Math.floor(r * shade)}, ${Math.floor(g * shade)}, ${Math.floor(b * shade)})`;
    }

    // Cabeça
    if (relX >= 0.20 && relX <= 0.80) {
      applyColor(outfit.hair);
      const hh = headH * 0.32;
      ctx.fillRect(sx, headTop, 1, hh);
      applyColor(outfit.skin);
      ctx.fillRect(sx, headTop + hh, 1, headH - hh);
      if ((relX >= 0.32 && relX <= 0.42) || (relX >= 0.58 && relX <= 0.68)) {
        ctx.fillStyle = isHurt ? '#ef4444' : '#0f172a';
        ctx.fillRect(sx, headTop + headH * 0.44, 1, headH * 0.16);
      }
    }

    // Tronco e Colete
    if (relX >= 0.22 && relX <= 0.78) {
      applyColor(outfit.vest);
      ctx.fillRect(sx, bodyTop, 1, bodyH * 0.48);
      applyColor(outfit.shirt);
      ctx.fillRect(sx, bodyTop + bodyH * 0.48, 1, bodyH * 0.52);
    }

    // Braço esquerdo
    if (relX >= 0.04 && relX < 0.22) {
      const sw = -walkSwing * (height * 0.06);
      applyColor(outfit.shirt);
      ctx.fillRect(sx, bodyTop + sw, 1, bodyH * 0.72);
      applyColor(outfit.skin);
      ctx.fillRect(sx, bodyTop + sw + bodyH * 0.72, 1, bodyH * 0.28);
    }

    // Braço direito segurando arma
    if (relX > 0.78 && relX <= 0.96) {
      const sw = walkSwing * (height * 0.06);
      applyColor(outfit.shirt);
      ctx.fillRect(sx, bodyTop + sw, 1, bodyH * 0.72);
      applyColor(outfit.skin);
      ctx.fillRect(sx, bodyTop + sw + bodyH * 0.72, 1, bodyH * 0.28);
      // Cano e receptor da arma
      if (relX >= 0.86 && relX <= 0.96) {
        ctx.fillStyle = `rgb(${Math.floor(32 * shade)}, ${Math.floor(36 * shade)}, ${Math.floor(44 * shade)})`;
        ctx.fillRect(sx, bodyTop + sw + bodyH * 0.38, 1, bodyH * 0.48);
      }
    }

    // Pernas
    if (relX >= 0.24 && relX <= 0.48) {
      const ls = -walkSwing * (height * 0.065);
      applyColor(outfit.pants);
      ctx.fillRect(sx, legsTop + ls, 1, legsH * 0.78);
      ctx.fillStyle = `rgb(${Math.floor(25 * shade)}, ${Math.floor(25 * shade)}, ${Math.floor(25 * shade)})`;
      ctx.fillRect(sx, legsTop + ls + legsH * 0.78, 1, legsH * 0.22);
    } else if (relX >= 0.52 && relX <= 0.76) {
      const ls = walkSwing * (height * 0.065);
      applyColor(outfit.pants);
      ctx.fillRect(sx, legsTop + ls, 1, legsH * 0.78);
      ctx.fillStyle = `rgb(${Math.floor(25 * shade)}, ${Math.floor(25 * shade)}, ${Math.floor(25 * shade)})`;
      ctx.fillRect(sx, legsTop + ls + legsH * 0.78, 1, legsH * 0.22);
    }
  }

  /* ===========================================================================
     28. RENDERIZACAO DA ARMA DO JOGADOR, RECUO E MUZZLE FLASH
     =========================================================================== */
  function renderWeapon(w, h) {
    const ws = getCurrentWeapon();
    if (!ws) return;

    ctx.save();
    const gw = Math.min(w * 0.30, 260);
    const gh = gw * 1.05;

    // Bobbing dinâmico
    const bobX = Math.cos(player.bobbingTime * 0.5) * 3.5;
    const bobY = Math.abs(Math.sin(player.bobbingTime)) * 6.0;

    // Inércia de Pulo na Arma (a mão e a arma acompanham a física real)
    let jumpWeaponLag = 0;
    if (player.jumpState === JUMP_STATES.RISING) {
      jumpWeaponLag = 14; // inércia puxa para baixo na subida
    } else if (player.jumpState === JUMP_STATES.PEAK) {
      jumpWeaponLag = -4; // flutua levemente no topo
    } else if (player.jumpState === JUMP_STATES.FALLING) {
      jumpWeaponLag = -10; // sobe na descida
    } else if (player.jumpState === JUMP_STATES.LANDING) {
      jumpWeaponLag = player.landingProgress * 24; // agacha na aterrissagem
    }

    // Postura de Agachamento (Arma recolhe próxima ao corpo)
    const crouchWeaponOffY = player.crouchProgress * 28;
    const crouchWeaponOffX = player.crouchProgress * 12;

    const posX = (w / 2) + weaponSwayX * 0.35 + bobX + recoilSide + crouchWeaponOffX;
    const posY = h - gh * 0.82 + recoilDispY + weaponSwayY * 0.35 + bobY + crouchWeaponOffY + jumpWeaponLag;

    ctx.translate(posX, posY);

    // Rotação de recuo suave
    if (recoilPitch > 0.005) {
      ctx.rotate(-recoilPitch);
    }

    // Desenha arma correspondente com o Muzzle Flash exatamente na boca do cano
    const isFlashing = playerFlash.active;
    ws.def.drawFn(ctx, gw, gh, recoilDispY, isFlashing, playerFlash.scale, selectedChar);

    ctx.restore();
  }

  /* ---- DESENHO DETALHADO DAS ARMAS ---- */

  function drawHand(ctx, gw, gh, skinColor, gloveColor) {
    const sk = skinColor || (selectedChar === 'female' ? '#e8b898' : '#d4a070');
    // Braço
    ctx.fillStyle = sk;
    ctx.beginPath();
    ctx.roundRect(-gw * 0.08, gh * 0.38, gw * 0.16, gh * 0.55, gw * 0.04);
    ctx.fill();
    // Luva tática militar com reforço
    ctx.fillStyle = gloveColor || '#1f2937';
    ctx.beginPath();
    ctx.roundRect(-gw * 0.13, gh * 0.52, gw * 0.26, gh * 0.28, gw * 0.035);
    ctx.fill();
    ctx.fillStyle = '#374151';
    ctx.fillRect(-gw * 0.11, gh * 0.56, gw * 0.22, 4);
  }

  function drawGlock(ctx, gw, gh, recoil, isFlash, flashScale, charType) {
    drawHand(ctx, gw, gh);
    const slideKick = recoil * 0.45;

    // Empunhadura de polímero
    ctx.fillStyle = '#111827';
    ctx.beginPath(); ctx.roundRect(-gw*0.14, gh*0.22, gw*0.28, gh*0.48, gw*0.035); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for(let i=0;i<4;i++) ctx.fillRect(-gw*0.11, gh*0.30+i*11, gw*0.22, 4);

    // Slide superior de aço escurecido
    ctx.fillStyle = '#1f2937';
    ctx.beginPath(); ctx.roundRect(-gw*0.16, -slideKick, gw*0.32, gh*0.3, gw*0.025); ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.beginPath(); ctx.roundRect(-gw*0.12, -slideKick+4, gw*0.24, gh*0.22, gw*0.018); ctx.fill();

    // Ranhuras de armar
    ctx.fillStyle = '#0f172a';
    for (let i=0;i<5;i++) ctx.fillRect(-gw*0.15+i*4, -slideKick+6, 2, gh*0.18);

    // Alça e Massa de mira (trítio verde)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-gw*0.13, -slideKick-7, gw*0.07, 7);
    ctx.fillRect(gw*0.06, -slideKick-7, gw*0.07, 7);
    ctx.fillRect(-2.5, -slideKick-13, 5, 13);
    ctx.fillStyle = '#22c55e';
    ctx.beginPath(); ctx.arc(0, -slideKick-10, 2.2, 0, Math.PI*2); ctx.fill();

    // Boca do Cano
    const muzzleY = -slideKick - 14;
    ctx.fillStyle = '#030712';
    ctx.beginPath(); ctx.roundRect(-gw*0.06, muzzleY, gw*0.12, 6, 2); ctx.fill();

    // Muzzle Flash Glock (Rápido, compacto, estrela precisa)
    if (isFlash) {
      drawPreciseFlash(ctx, 0, muzzleY - 4, flashScale * gw * 0.72, 'glock');
    }
  }

  function drawDeagle(ctx, gw, gh, recoil, isFlash, flashScale, charType) {
    drawHand(ctx, gw, gh, null, '#111827');
    const slideKick = recoil * 0.65;

    // Grip pesado
    ctx.fillStyle = '#18181b';
    ctx.beginPath(); ctx.roundRect(-gw*0.18, gh*0.18, gw*0.36, gh*0.54, gw*0.04); ctx.fill();
    ctx.fillStyle = '#09090b';
    for(let i=0;i<5;i++) ctx.fillRect(-gw*0.14, gh*0.26+i*11, gw*0.28, 5);

    // Slide maciço de aço escovado
    ctx.fillStyle = '#374151';
    ctx.beginPath(); ctx.roundRect(-gw*0.20, -slideKick, gw*0.40, gh*0.32, gw*0.03); ctx.fill();
    ctx.fillStyle = '#1f2937';
    ctx.beginPath(); ctx.roundRect(-gw*0.15, -slideKick+4, gw*0.30, gh*0.24, gw*0.02); ctx.fill();

    // Serrilhas pesadas
    ctx.fillStyle = '#111827';
    for (let i=0;i<6;i++) ctx.fillRect(-gw*0.18+i*5, -slideKick+6, 2.5, gh*0.2);

    // Miras com ponto laranja
    ctx.fillStyle = '#09090b';
    ctx.fillRect(-gw*0.17, -slideKick-9, gw*0.09, 9);
    ctx.fillRect(gw*0.08, -slideKick-9, gw*0.09, 9);
    ctx.fillRect(-3, -slideKick-15, 6, 15);
    ctx.fillStyle = '#f97316';
    ctx.beginPath(); ctx.arc(0, -slideKick-11, 3, 0, Math.PI*2); ctx.fill();

    // Cano calibre .50
    const muzzleY = -slideKick - 18;
    ctx.fillStyle = '#030712';
    ctx.beginPath(); ctx.roundRect(-gw*0.09, muzzleY, gw*0.18, 8, 3); ctx.fill();

    // Muzzle Flash Desert Eagle (Potente, explosivo, chamas laterais)
    if (isFlash) {
      drawPreciseFlash(ctx, 0, muzzleY - 6, flashScale * gw * 1.15, 'deagle');
    }
  }

  function drawSilenced(ctx, gw, gh, recoil, isFlash, flashScale, charType) {
    drawHand(ctx, gw, gh, null, '#1e293b');
    const slideKick = recoil * 0.35;

    // Grip slim tático
    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.roundRect(-gw*0.12, gh*0.22, gw*0.24, gh*0.5, gw*0.03); ctx.fill();

    // Slide fino
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.roundRect(-gw*0.13, -slideKick, gw*0.26, gh*0.28, gw*0.02); ctx.fill();

    // Silenciador longo com anéis de dissipação de calor
    const silH = gh * 0.28;
    const silY = -slideKick - silH;
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.roundRect(-gw*0.07, silY, gw*0.14, silH, gw*0.03); ctx.fill();
    ctx.fillStyle = '#0f172a';
    for (let i=0; i<6; i++) {
      ctx.fillRect(-gw*0.065, silY + 6 + i*(silH*0.15), gw*0.13, 3);
    }

    // Miras altas táticas
    ctx.fillStyle = '#09090b';
    ctx.fillRect(-2, -slideKick-11, 4, 11);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, -slideKick-8, 1.8, 0, Math.PI*2); ctx.fill();

    // Boca do Silenciador
    const muzzleY = silY - 2;
    ctx.fillStyle = '#020617';
    ctx.beginPath(); ctx.ellipse(0, muzzleY, gw*0.05, 3, 0, 0, Math.PI*2); ctx.fill();

    // Muzzle Flash Silenciada (Quase imperceptível, micro-faísca e gás sutil)
    if (isFlash) {
      drawPreciseFlash(ctx, 0, muzzleY - 2, flashScale * gw * 0.35, 'silenced');
    }
  }

  function drawM4(ctx, gw, gh, recoil, isFlash, flashScale, charType) {
    drawHand(ctx, gw, gh, null, '#111827');
    const slideKick = recoil * 0.45;

    // Grip tático ergonômico
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.roundRect(-gw*0.11, gh*0.20, gw*0.22, gh*0.52, gw*0.025); ctx.fill();

    // Receptor principal
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.roundRect(-gw*0.19, -slideKick, gw*0.38, gh*0.28, gw*0.02); ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.roundRect(-gw*0.15, -slideKick+4, gw*0.30, gh*0.2, gw*0.015); ctx.fill();

    // Trilho Picatinny superior
    ctx.fillStyle = '#020617';
    for (let i=0; i<8; i++) ctx.fillRect(-gw*0.17 + i*(gw*0.046), -slideKick-5, gw*0.03, 5);

    // Carregador curvado STANAG
    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.roundRect(-gw*0.08, gh*0.18, gw*0.16, gh*0.36, gw*0.025); ctx.fill();

    // Guarda-mão e Cano longo
    const barrelH = gh * 0.24;
    const barrelY = -slideKick - barrelH;
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.roundRect(-gw*0.075, barrelY, gw*0.15, barrelH, gw*0.02); ctx.fill();

    // Quebra-chamas (Flash Hider)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-gw*0.065, barrelY - 8, gw*0.13, 8);

    // Mira com ponto vermelho
    ctx.fillStyle = '#020617';
    ctx.fillRect(-2.5, barrelY - 14, 5, 14);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath(); ctx.arc(0, barrelY - 10, 2.2, 0, Math.PI*2); ctx.fill();

    const muzzleY = barrelY - 10;

    // Muzzle Flash M4 (Formato em compensador militar com chamas laterais e frontais)
    if (isFlash) {
      drawPreciseFlash(ctx, 0, muzzleY - 4, flashScale * gw * 0.92, 'm4');
    }
  }

  function drawPreciseFlash(ctx, x, y, size, type) {
    ctx.save();
    ctx.translate(x, y);

    if (type === 'silenced') {
      // Flash silenciado mínimo: apenas micro-ponto e aura tênue
      const rad = ctx.createRadialGradient(0, 0, 1, 0, 0, size);
      rad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
      rad.addColorStop(0.5, 'rgba(56, 189, 248, 0.25)');
      rad.addColorStop(1, 'transparent');
      ctx.fillStyle = rad;
      ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI*2); ctx.fill();
    } else if (type === 'deagle') {
      // Flash Desert Eagle: explosão grande com pétalas e chamas laterais
      const fg = ctx.createRadialGradient(0, 0, 4, 0, 0, size * 0.9);
      fg.addColorStop(0, '#ffffff');
      fg.addColorStop(0.2, '#fde047');
      fg.addColorStop(0.55, '#ea580c');
      fg.addColorStop(0.85, 'rgba(220, 38, 38, 0.4)');
      fg.addColorStop(1, 'transparent');
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.arc(0, 0, size * 0.9, 0, Math.PI*2); ctx.fill();

      // Pétalas de chama laterais (compensador)
      ctx.fillStyle = 'rgba(254, 240, 138, 0.9)';
      for (let a = 0; a < 6; a++) {
        const ang = (a * Math.PI) / 3 + (Math.random() * 0.2 - 0.1);
        const len = size * (0.8 + Math.random() * 0.35);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(ang - 0.2) * (len * 0.4), Math.sin(ang - 0.2) * (len * 0.4));
        ctx.lineTo(Math.cos(ang) * len, Math.sin(ang) * len);
        ctx.lineTo(Math.cos(ang + 0.2) * (len * 0.4), Math.sin(ang + 0.2) * (len * 0.4));
        ctx.closePath();
        ctx.fill();
      }
    } else if (type === 'm4') {
      // Flash M4: 4 fendas de compensador em cruz + dardo central
      const fg = ctx.createRadialGradient(0, 0, 3, 0, 0, size * 0.75);
      fg.addColorStop(0, '#ffffff');
      fg.addColorStop(0.35, '#facc15');
      fg.addColorStop(0.7, 'rgba(234, 88, 12, 0.45)');
      fg.addColorStop(1, 'transparent');
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.arc(0, 0, size * 0.75, 0, Math.PI*2); ctx.fill();

      // Jatos laterais e vertical
      ctx.fillStyle = 'rgba(253, 224, 71, 0.85)';
      const angles = [-Math.PI/2, -Math.PI*0.75, -Math.PI*0.25, -Math.PI*0.9, -Math.PI*0.1];
      angles.forEach(ang => {
        const len = size * (0.7 + Math.random() * 0.3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(ang - 0.15) * (len * 0.3), Math.sin(ang - 0.15) * (len * 0.3));
        ctx.lineTo(Math.cos(ang) * len, Math.sin(ang) * len);
        ctx.lineTo(Math.cos(ang + 0.15) * (len * 0.3), Math.sin(ang + 0.15) * (len * 0.3));
        ctx.closePath();
        ctx.fill();
      });
    } else {
      // Flash Glock: estrela compacta clássica
      const fg = ctx.createRadialGradient(0, 0, 3, 0, 0, size * 0.7);
      fg.addColorStop(0, '#ffffff');
      fg.addColorStop(0.4, '#facc15');
      fg.addColorStop(0.75, 'rgba(234, 88, 12, 0.35)');
      fg.addColorStop(1, 'transparent');
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.arc(0, 0, size * 0.7, 0, Math.PI*2); ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'; ctx.lineWidth = 2.5;
      for (let a = 0; a < 4; a++) {
        const ang = (a * Math.PI) / 2 + (Math.random() * 0.15 - 0.075);
        const len = size * (0.55 + Math.random() * 0.25);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(ang) * len, Math.sin(ang) * len);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  function renderWeaponSmoke(ctx) {
    for (let i = 0; i < smokePuffs.length; i++) {
      const sm = smokePuffs[i];
      const grad = ctx.createRadialGradient(sm.x, sm.y, 0, sm.x, sm.y, sm.size);
      grad.addColorStop(0, `rgba(200, 205, 215, ${sm.alpha.toFixed(2)})`);
      grad.addColorStop(0.6, `rgba(148, 163, 184, ${(sm.alpha * 0.5).toFixed(2)})`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sm.x, sm.y, sm.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function renderBrassCasings(ctx) {
    for (let i = 0; i < brassCasings.length; i++) {
      const c = brassCasings[i];
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      ctx.fillRect(-2, -5, 4, 10);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-1.5, 3, 3, 2);
      ctx.restore();
    }
  }

  /* ===========================================================================
     29. MINIMAPA
     =========================================================================== */
  function renderMinimap() {
    if (!minimapCtx) return;
    const mw = minimapCanvas.width, mh = minimapCanvas.height;
    minimapCtx.clearRect(0, 0, mw, mh);
    const cw = mw / MAP_W, ch = mh / MAP_H;

    minimapCtx.fillStyle = '#0a0806'; minimapCtx.fillRect(0, 0, mw, mh);
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const t = worldMap[y][x];
        if (t > 0) {
          const colors = ['','#2e2620','#4a331f','#252219','#302820','#4a3818','#3a4048','#1a1a14'];
          minimapCtx.fillStyle = colors[t] || '#333';
          minimapCtx.fillRect(x * cw, y * ch, cw, ch);
        }
      }
    }
    // Baú
    if (!chestOpened) {
      minimapCtx.fillStyle = '#facc15';
      minimapCtx.fillRect(CHEST_POS.x * cw - 2, CHEST_POS.y * ch - 2, 4, 4);
    }
    // Saída
    if (chestOpened) {
      minimapCtx.fillStyle = '#22c55e';
      minimapCtx.fillRect(EXIT_POS.x * cw - 2, EXIT_POS.y * ch - 2, 4, 4);
    }
    // Inimigos
    enemies.forEach(en => {
      if (!en.alive) return;
      minimapCtx.fillStyle = en.state === 'chase' || en.state === 'attack' ? '#ef4444' : '#f97316';
      minimapCtx.beginPath();
      minimapCtx.arc(en.x * cw, en.y * ch, 2.2, 0, Math.PI * 2);
      minimapCtx.fill();
    });
    // Jogador
    const px = player.x * cw, py = player.y * ch;
    minimapCtx.fillStyle = 'rgba(34,197,94,0.22)';
    minimapCtx.beginPath();
    minimapCtx.moveTo(px, py);
    minimapCtx.lineTo((player.x + (player.dirX - player.planeX) * 2.5) * cw, (player.y + (player.dirY - player.planeY) * 2.5) * ch);
    minimapCtx.lineTo((player.x + (player.dirX + player.planeX) * 2.5) * cw, (player.y + (player.dirY + player.planeY) * 2.5) * ch);
    minimapCtx.closePath(); minimapCtx.fill();
    minimapCtx.fillStyle = '#22c55e';
    minimapCtx.beginPath(); minimapCtx.arc(px, py, 3, 0, Math.PI * 2); minimapCtx.fill();
  }

  /* ===========================================================================
     30. PREVIEW DOS PERSONAGENS E ARMAS
     =========================================================================== */
  function drawCharPreviews() {
    drawCharCanvas('charPreviewMale','male');
    drawCharCanvas('charPreviewFemale','female');
  }

  function drawCharCanvas(id, gender) {
    const c = document.getElementById(id); if (!c) return;
    const ctx2 = c.getContext('2d');
    const w = c.width, h = c.height;
    ctx2.clearRect(0, 0, w, h);

    const bg = ctx2.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0d1118'); bg.addColorStop(1, '#060810');
    ctx2.fillStyle = bg; ctx2.fillRect(0, 0, w, h);

    const cx = w / 2;
    const skin = gender === 'female' ? '#e8b898' : '#d4a070';
    const hair = gender === 'female' ? '#4a2a1a' : '#1a1208';
    const shirt = gender === 'female' ? '#3a2c4a' : '#2a3848';
    const vest = gender === 'female' ? '#2a2035' : '#1e2a38';
    const pants = gender === 'female' ? '#2a1a2a' : '#1e2830';

    ctx2.fillStyle = hair;
    ctx2.beginPath(); ctx2.roundRect(cx - 18, 22, 36, 10, 5); ctx2.fill();
    ctx2.fillStyle = skin;
    ctx2.beginPath(); ctx2.roundRect(cx - 15, 28, 30, 28, 8); ctx2.fill();
    ctx2.fillStyle = '#111'; ctx2.fillRect(cx - 9, 38, 6, 4); ctx2.fillRect(cx + 3, 38, 6, 4);

    ctx2.fillStyle = vest;
    ctx2.beginPath(); ctx2.roundRect(cx - 20, 56, 40, 36, 6); ctx2.fill();
    ctx2.fillStyle = shirt;
    ctx2.beginPath(); ctx2.roundRect(cx - 16, 66, 32, 26, 4); ctx2.fill();

    ctx2.fillStyle = shirt;
    ctx2.beginPath(); ctx2.roundRect(cx - 30, 58, 12, 32, 5); ctx2.fill();
    ctx2.beginPath(); ctx2.roundRect(cx + 18, 58, 12, 32, 5); ctx2.fill();
    ctx2.fillStyle = skin;
    ctx2.beginPath(); ctx2.roundRect(cx - 30, 82, 12, 10, 3); ctx2.fill();
    ctx2.beginPath(); ctx2.roundRect(cx + 18, 82, 12, 10, 3); ctx2.fill();

    ctx2.fillStyle = pants;
    ctx2.beginPath(); ctx2.roundRect(cx - 18, 92, 16, 42, 5); ctx2.fill();
    ctx2.beginPath(); ctx2.roundRect(cx + 2, 92, 16, 42, 5); ctx2.fill();

    ctx2.fillStyle = '#111';
    ctx2.beginPath(); ctx2.roundRect(cx - 20, 128, 16, 14, 4); ctx2.fill();
    ctx2.beginPath(); ctx2.roundRect(cx + 4, 128, 16, 14, 4); ctx2.fill();

    ctx2.fillStyle = '#e2e8f0';
    ctx2.font = 'bold 11px Rajdhani,sans-serif';
    ctx2.textAlign = 'center';
    ctx2.fillText(gender === 'female' ? 'AGENTE SARA' : 'AGENTE MARCUS', cx, 155);
  }

  function drawWeaponPreviews() {
    [['weaponPreviewGlock','glock'],['weaponPreviewDeagle','deagle'],['weaponPreviewSilenced','silenced']].forEach(([id,wid])=>{
      const c = document.getElementById(id); if (!c) return;
      const ctx2 = c.getContext('2d');
      ctx2.clearRect(0, 0, c.width, c.height);
      const bg = ctx2.createLinearGradient(0, 0, 0, c.height);
      bg.addColorStop(0, '#0d1118'); bg.addColorStop(1, '#060810');
      ctx2.fillStyle = bg; ctx2.fillRect(0, 0, c.width, c.height);
      ctx2.save();
      ctx2.translate(c.width / 2, c.height * 0.82);
      const gw = c.width * 0.85, gh = gw * 1.1;
      WEAPON_DEFS[wid].drawFn(ctx2, gw, gh, 0, false, 0.7, 'male');
      ctx2.restore();
    });
  }

  function drawNewWeaponPreview() {
    const c = document.getElementById('newWeaponPreview'); if (!c) return;
    const ctx2 = c.getContext('2d');
    ctx2.clearRect(0, 0, c.width, c.height);
    const bg = ctx2.createLinearGradient(0, 0, 0, c.height);
    bg.addColorStop(0, '#0d1118'); bg.addColorStop(1, '#060810');
    ctx2.fillStyle = bg; ctx2.fillRect(0, 0, c.width, c.height);
    ctx2.save();
    ctx2.translate(c.width / 2, c.height * 0.88);
    const gw = c.width * 0.85, gh = gw * 1.0;
    drawM4(ctx2, gw, gh, 0, false, 0.9, selectedChar||'male');
    ctx2.restore();
  }

  /* ===========================================================================
     31. POLYFILL ROUNDRECT
     =========================================================================== */
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x,y,w,h,r) {
      if (typeof r === 'number') r = {tl:r,tr:r,br:r,bl:r};
      const {tl=0,tr=0,br=0,bl=0} = r;
      this.beginPath();
      this.moveTo(x+tl,y);
      this.lineTo(x+w-tr,y); this.quadraticCurveTo(x+w,y,x+w,y+tr);
      this.lineTo(x+w,y+h-br); this.quadraticCurveTo(x+w,y+h,x+w-br,y+h);
      this.lineTo(x+bl,y+h); this.quadraticCurveTo(x,y+h,x,y+h-bl);
      this.lineTo(x,y+tl); this.quadraticCurveTo(x,y,x+tl,y);
      this.closePath();
      return this;
    };
  }

})();
