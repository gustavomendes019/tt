/**
 * ============================================================================
 * OPERATION ZERO — FPS CAMPANHA (JAVASCRIPT PURO)
 * Baseado em VALLEY COMBAT, expandido com: Lobby, Personagem, Dificuldade,
 * Armas, Caverna, Missoes, Stamina, Agachamento, Corrida, IA melhorada,
 * Sistema de Objetivos, Bau, M4, Tela de Carregamento, Historia e muito mais.
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
      fireRate: 220, reloadTime: 1400,
      recoil: 16, spread: 0.04, range: 18,
      noiseLevel: 0.8, silenced: false,
      drawFn: drawGlock
    },
    deagle: {
      id: 'deagle', name: 'DESERT EAGLE', shortName: 'DEG',
      damage: 75, magSize: 7, reserveAmmo: 28,
      fireRate: 600, reloadTime: 2000,
      recoil: 40, spread: 0.02, range: 22,
      noiseLevel: 1.0, silenced: false,
      drawFn: drawDeagle
    },
    silenced: {
      id: 'silenced', name: 'PISTOLA SILENCIADA', shortName: 'SIL',
      damage: 22, magSize: 15, reserveAmmo: 60,
      fireRate: 280, reloadTime: 1600,
      recoil: 9, spread: 0.025, range: 16,
      noiseLevel: 0.2, silenced: true,
      drawFn: drawSilenced
    },
    m4: {
      id: 'm4', name: 'M4A1', shortName: 'M4',
      damage: 32, magSize: 30, reserveAmmo: 90,
      fireRate: 95, reloadTime: 1800,
      recoil: 22, spread: 0.055, range: 25,
      noiseLevel: 0.9, silenced: false,
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
    setMasterVol(v) { this.masterVol = v; if (this.masterGain) this.masterGain.gain.setValueAtTime(v, this.ctx.currentTime); }
    setFxVol(v) { this.fxVol = v; if (this.fxGain) this.fxGain.gain.setValueAtTime(v, this.ctx.currentTime); }

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
        this._noise(0.06, 800, 200, 0.25);
        this._tone('sine', 180, 60, 0.2, 0.06);
      } else if (w === 'deagle') {
        this._noise(0.18, 2200, 280, 1.1);
        this._tone('triangle', 320, 45, 0.9, 0.18);
      } else if (w === 'm4') {
        this._noise(0.10, 1600, 350, 0.8);
        this._tone('triangle', 260, 55, 0.6, 0.10);
      } else {
        this._noise(0.14, 1800, 300, 1.0);
        this._tone('triangle', 260, 40, 0.75, 0.12);
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
    playFootstep() { this._noise(0.06, 120, 80, 0.08); }
    playEnemyShoot(weaponId) { this.playShoot(weaponId||'glock'); }
  }

  /* ===========================================================================
     4. TEXTURAS PROCEDURAIS DA CAVERNA
     =========================================================================== */
  const TEX_SIZE = 64;
  const textures = [];

  function createCaveTextures() {
    function mkTex(fn) {
      const c = document.createElement('canvas'); c.width = TEX_SIZE; c.height = TEX_SIZE;
      const x = c.getContext('2d'); fn(x); return x.getImageData(0,0,TEX_SIZE,TEX_SIZE);
    }

    // 1 = Rocha de caverna (pedra escura com veias)
    textures[1] = mkTex(ctx => {
      ctx.fillStyle = '#2a2420'; ctx.fillRect(0,0,TEX_SIZE,TEX_SIZE);
      for (let y=0;y<TEX_SIZE;y+=12) for (let x=0;x<TEX_SIZE;x+=12) {
        const s=((x*11+y*7)%24)-12;
        const r=Math.max(0,Math.min(255,42+s)), g=Math.max(0,Math.min(255,36+s)), b=Math.max(0,Math.min(255,32+s));
        ctx.fillStyle=`rgb(${r},${g},${b})`; ctx.fillRect(x+1,y+1,10,10);
      }
      ctx.strokeStyle='#1a1310'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(8,0); ctx.lineTo(20,18); ctx.lineTo(14,42); ctx.lineTo(32,TEX_SIZE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(40,0); ctx.lineTo(50,28); ctx.lineTo(58,52); ctx.stroke();
      ctx.fillStyle='rgba(80,60,40,0.4)';
      ctx.fillRect(5,20,15,4); ctx.fillRect(38,8,10,3);
    });

    // 2 = Madeira/Suporte de mina
    textures[2] = mkTex(ctx => {
      ctx.fillStyle='#3d2b1a'; ctx.fillRect(0,0,TEX_SIZE,TEX_SIZE);
      for (let i=0;i<TEX_SIZE;i+=14) {
        ctx.fillStyle=(i/14)%2===0?'#4a331f':'#362415';
        ctx.fillRect(i+1,0,12,TEX_SIZE);
        ctx.strokeStyle='#241508'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(i+4,0); ctx.lineTo(i+4,TEX_SIZE);
        ctx.moveTo(i+9,0); ctx.lineTo(i+9,TEX_SIZE); ctx.stroke();
        ctx.fillStyle='#1e0f04'; ctx.fillRect(i+5,16+(i%22),4,5);
      }
    });

    // 3 = Parede de pedra com minerio
    textures[3] = mkTex(ctx => {
      ctx.fillStyle='#1e1c1a'; ctx.fillRect(0,0,TEX_SIZE,TEX_SIZE);
      ctx.strokeStyle='#0d0b09'; ctx.lineWidth=2;
      for (let y=0;y<TEX_SIZE;y+=14) {
        const off=(y/14)%2===0?0:18;
        for (let x=-18;x<TEX_SIZE;x+=36) { ctx.strokeRect(x+off,y,36,14); }
      }
      ctx.fillStyle='rgba(80,180,80,0.45)'; ctx.fillRect(8,10,8,5); ctx.fillRect(42,38,6,4);
      ctx.fillStyle='rgba(160,120,60,0.5)'; ctx.fillRect(24,24,10,6);
    });

    // 4 = Terra/Rocha escura com detalhes
    textures[4] = mkTex(ctx => {
      ctx.fillStyle='#353028'; ctx.fillRect(0,0,TEX_SIZE,TEX_SIZE);
      ctx.fillStyle='#2b2820';
      for (let i=0;i<35;i++) {
        const rx=(i*23)%(TEX_SIZE-8), ry=(i*31)%(TEX_SIZE-8);
        ctx.fillRect(rx,ry,8,5);
      }
      ctx.strokeStyle='#1a1612'; ctx.lineWidth=1.5;
      ctx.strokeRect(2,2,TEX_SIZE-4,TEX_SIZE-4);
    });

    // 5 = Trilho de trem/mina (metal enferrujado)
    textures[5] = mkTex(ctx => {
      ctx.fillStyle='#2c2418'; ctx.fillRect(0,0,TEX_SIZE,TEX_SIZE);
      ctx.fillStyle='#5c4832';
      for (let y=0;y<TEX_SIZE;y+=10) ctx.fillRect(0,y+1,TEX_SIZE,2);
      ctx.fillStyle='#8a6840'; ctx.fillRect(4,0,8,TEX_SIZE); ctx.fillRect(TEX_SIZE-12,0,8,TEX_SIZE);
      ctx.fillStyle='#a87e50';
      for (let y=4;y<TEX_SIZE;y+=12) {
        ctx.fillRect(2,y,10,4); ctx.fillRect(TEX_SIZE-12,y,10,4);
      }
    });

    // 6 = Metal / Porta de ferragem
    textures[6] = mkTex(ctx => {
      ctx.fillStyle='#3a4048'; ctx.fillRect(0,0,TEX_SIZE,TEX_SIZE);
      for (let y=0;y<TEX_SIZE;y+=8) {
        ctx.fillStyle=y%16===0?'#454d56':'#323940';
        ctx.fillRect(0,y,TEX_SIZE,8);
      }
      ctx.strokeStyle='#252b32'; ctx.lineWidth=2;
      ctx.strokeRect(8,8,TEX_SIZE-16,TEX_SIZE-16);
      ctx.fillStyle='#5a6370'; ctx.fillRect(TEX_SIZE/2-4,TEX_SIZE/2-4,8,8);
    });

    // 7 = Pedra com minerio brilhante (area especial)
    textures[7] = mkTex(ctx => {
      ctx.fillStyle='#1a1816'; ctx.fillRect(0,0,TEX_SIZE,TEX_SIZE);
      for (let y=0;y<TEX_SIZE;y+=10) for (let x=0;x<TEX_SIZE;x+=10) {
        const s=((x*13+y*9)%20)-10;
        ctx.fillStyle=`rgb(${26+s},${22+s},${20+s})`; ctx.fillRect(x,y,10,10);
      }
      ctx.fillStyle='rgba(120,200,255,0.6)'; ctx.fillRect(12,8,6,4); ctx.fillRect(44,30,8,5); ctx.fillRect(28,50,5,4);
      ctx.fillStyle='rgba(100,220,180,0.4)'; ctx.fillRect(36,14,4,6);
    });
  }

  /* ===========================================================================
     5. MAPA DA CAVERNA (28x36) - Grande para ~5 minutos de gameplay
     Legenda: 0=passagem livre, 1=rocha, 2=madeira/suporte, 3=pedra minerio,
              4=terra, 5=trilho, 6=metal/porta, 7=minerio especial
     =========================================================================== */
  const MAP_W = 36;
  const MAP_H = 40;

  // Layout da caverna - corredores, salas, trilhos, saida guardada
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
     6. PROPS / ELEMENTOS DA CAVERNA
     =========================================================================== */
  const caveProps = [
    // Barris e caixas
    {x:5.5, y:3.5, type:'barrel'}, {x:6.5, y:3.5, type:'barrel'},
    {x:14.5, y:5.5, type:'crate'}, {x:15.5, y:5.5, type:'crate'},
    {x:22.5, y:10.5, type:'barrel'}, {x:33.5, y:12.5, type:'crate'},
    {x:8.5, y:14.5, type:'barrel'}, {x:9.5, y:14.5, type:'barrel'},
    {x:20.5, y:18.5, type:'crate'}, {x:21.5, y:18.5, type:'crate'},
    {x:5.5, y:24.5, type:'barrel'}, {x:26.5, y:25.5, type:'crate'},
    {x:15.5, y:30.5, type:'barrel'}, {x:16.5, y:30.5, type:'barrel'},
    // Lanternas
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

  /* ===========================================================================
     7. BAU (CHEST) E SAIDA
     =========================================================================== */
  const CHEST_POS = {x:20.5, y:25.5};
  const EXIT_POS = {x:32.0, y:36.0};
  let chestOpened = false;
  let exitReached = false;

  /* ===========================================================================
     8. MISSAO - OBJETIVOS
     =========================================================================== */
  const MISSION_OBJECTIVES = [
    { id:'start',   text:'Encontre o caminho principal da mina' },
    { id:'corridor',text:'Avance pelos corredores da mina' },
    { id:'passage', text:'Encontre a passagem bloqueada (area mais profunda)' },
    { id:'explore', text:'Explore a area subterranea com minerio' },
    { id:'chest',   text:'Encontre o bau e pegue a nova arma' },
    { id:'exit',    text:'Encontre a saida da mina' }
  ];
  let currentObjectiveIndex = 0;

  /* ===========================================================================
     9. ESTADO GLOBAL DO JOGO
     =========================================================================== */
  const audio = new SoundEngine();

  // Selecoes do jogador (lobby)
  let selectedChar = null;    // 'male' | 'female'
  let selectedDiff = null;    // 'easy'|'normal'|'hard'|'veryhard'
  let selectedWeapon = null;  // 'glock'|'deagle'|'silenced'

  // Estado de jogo
  let gameState = 'LOBBY'; // LOBBY|CHAR|DIFF|WEAPON|STORY|LOADING|PLAYING|PAUSED|GAMEOVER|WIN|NEWWEAPON|SETTINGS
  let prevStateBeforeSettings = 'LOBBY';

  // Configuracoes (salvas no localStorage)
  let settings = {
    masterVol: 0.85, fxVol: 0.8, musicVol: 0.6,
    sensitivity: 5, quality: 'medium',
    showFPS: false, showCrosshair: true
  };

  // Stats da missao
  let missionStartTime = 0;
  let missionElapsedTime = 0;
  let totalShotsFired = 0;
  let totalShotsHit = 0;
  let totalKills = 0;
  let totalDamageReceived = 0;
  let footstepTimer = 0;
  let lastFPSTime = 0, frameCount = 0, currentFPS = 60;

  // Jogador
  const player = {
    x: 2.5, y: 2.5,
    dirX: 1, dirY: 0,
    planeX: 0, planeY: 0.66,
    pitch: 0,
    speed: 3.2,
    health: 100, maxHealth: 100,
    stamina: 100, maxStamina: 100,
    isCrouching: false,
    isRunning: false,
    isJumping: false,
    jumpVelocity: 0, jumpHeight: 0,
    bobbingTime: 0, bobbingOffset: 0,
    isMoving: false,
    weapons: [],      // lista de WeaponState
    currentWeaponIdx: 0
  };

  // Controles
  const keys = { w:false, s:false, a:false, d:false, shift:false, ctrl:false, space:false, e:false };

  // Mundo
  let enemies = [];
  let pickups = [];
  let particles = [];
  let zBuffer = [];
  let weaponRecoil = 0, muzzleFlashTimer = 0;
  let weaponSwayX = 0, weaponSwayY = 0;
  let hitmarkerTimer = 0;

  /* ===========================================================================
     10. ESTADO DE ARMA DO JOGADOR
     =========================================================================== */
  function createWeaponState(def) {
    return { def, ammo: def.magSize, reserve: def.reserveAmmo, isReloading: false, reloadStartTime: 0, lastShootTime: 0 };
  }

  function getCurrentWeapon() { return player.weapons[player.currentWeaponIdx]; }

  /* ===========================================================================
     11. DOM ELEMENTS
     =========================================================================== */
  let canvas, ctx, minimapCanvas, minimapCtx;
  // HUD
  let hudEl, objectiveText, fpsDisplay, missionTimer, healthNumber, healthBarFill;
  let staminaNumber, staminaBarFill, currentWeaponName, currentAmmoEl, reserveAmmoEl;
  let bulletPipsEl, reloadIndicator, hudNotice, objectiveUpdateBanner, objectiveUpdateText;
  let interactPrompt, interactText, weaponSlotsEl, lockPrompt, hitmarkerEl, damageVignette, muzzleFlashFx;
  // Screens
  let lobbyScreen, charSelectScreen, difficultyScreen, weaponSelectScreen;
  let storyScreen, loadingScreen, pauseScreen, gameOverScreen, newWeaponScreen, missionCompleteScreen, settingsScreen;

  /* ===========================================================================
     12. INICIALIZACAO
     =========================================================================== */
  window.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    grabDOM();
    createCaveTextures();
    setupEventListeners();
    drawCharPreviews();
    drawWeaponPreviews();
    resizeCanvas();
    showScreen('LOBBY');

    // Gerar particulas do lobby
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
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);

  /* ===========================================================================
     13. CONFIGURACOES (localStorage)
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
    // --- LOBBY ---
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

    // --- CHAR SELECT ---
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

    // --- DIFFICULTY ---
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

    // --- WEAPON SELECT ---
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

    // --- STORY ---
    document.getElementById('btnSkipStory').addEventListener('click',()=>showScreen('LOADING'));

    // --- LOADING -> auto-start ---
    // (handled by showScreen logic)

    // --- PAUSE ---
    document.getElementById('btnResume').addEventListener('click',resumeGame);
    document.getElementById('btnPauseSettings').addEventListener('click',()=>{
      prevStateBeforeSettings='PAUSED'; showScreen('SETTINGS');
    });
    document.getElementById('btnPauseRestart').addEventListener('click',()=>{ hideAllScreens(); startMission(); });
    document.getElementById('btnPauseMainMenu').addEventListener('click',()=>{ hideAllScreens(); showScreen('LOBBY'); });

    // --- GAME OVER ---
    document.getElementById('btnRetry').addEventListener('click',()=>{ hideAllScreens(); startMission(); });
    document.getElementById('btnFailMenu').addEventListener('click',()=>{ hideAllScreens(); showScreen('LOBBY'); });

    // --- NEW WEAPON ---
    document.getElementById('btnEquipM4').addEventListener('click',()=>{ equipM4(); });

    // --- MISSION COMPLETE ---
    document.getElementById('btnMissionContinue').addEventListener('click',()=>{ showScreen('LOBBY'); });
    document.getElementById('btnWinMenu').addEventListener('click',()=>{ showScreen('LOBBY'); });

    // --- SETTINGS ---
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

    // --- LOCK PROMPT ---
    lockPrompt.addEventListener('click', requestPointerLock);

    // --- KEYBOARD ---
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // --- MOUSE ---
    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', e=>{
      if (gameState !== 'PLAYING') return;
      if (e.button === 0) {
        if (document.pointerLockElement !== canvas) requestPointerLock();
        else shootWeapon();
      }
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
    if (k===' ') { keys.space=true; e.preventDefault(); }
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
    if (!locked && gameState==='PLAYING') lockPrompt.classList.remove('hidden');
    else lockPrompt.classList.add('hidden');
  }
  function onMouseMove(e) {
    if (gameState!=='PLAYING' || document.pointerLockElement!==canvas) return;
    const sens = settings.sensitivity * 0.00044;
    const rot = e.movementX * sens;
    const cosR=Math.cos(rot), sinR=Math.sin(rot);
    const od=player.dirX;
    player.dirX = player.dirX*cosR - player.dirY*sinR;
    player.dirY = od*sinR + player.dirY*cosR;
    const op=player.planeX;
    player.planeX = player.planeX*cosR - player.planeY*sinR;
    player.planeY = op*sinR + player.planeY*cosR;
    player.pitch -= e.movementY * 1.2;
    player.pitch = Math.max(-180, Math.min(180, player.pitch));
    weaponSwayX += e.movementX * 0.14;
    weaponSwayY += e.movementY * 0.14;
    weaponSwayX = Math.max(-14, Math.min(14, weaponSwayX));
    weaponSwayY = Math.max(-10, Math.min(10, weaponSwayY));
  }

  function requestPointerLock() {
    if (canvas.requestPointerLock) canvas.requestPointerLock();
  }

  /* ===========================================================================
     15. TELA / FLUXO DE ESTADO
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
    if (state==='NEWWEAPON') { drawNewWeaponPreview(); }
  }

  function hideAllScreens() {
    [lobbyScreen,charSelectScreen,difficultyScreen,weaponSelectScreen,
     storyScreen,loadingScreen,pauseScreen,gameOverScreen,newWeaponScreen,
     missionCompleteScreen,settingsScreen].forEach(s=>{ if(s) s.classList.add('hidden'); });
    lockPrompt.classList.add('hidden');
  }

  /* ===========================================================================
     16. LOBBY PARTICLES
     =========================================================================== */
  function generateLobbyParticles() {
    const cont = document.getElementById('lobbyParticles');
    if (!cont) return;
    for (let i=0; i<40; i++) {
      const p = document.createElement('div');
      p.className='lobby-particle';
      p.style.left = Math.random()*100+'%';
      p.style.animationDuration = (6+Math.random()*14)+'s';
      p.style.animationDelay = (-Math.random()*14)+'s';
      p.style.opacity = (0.2+Math.random()*0.6).toString();
      p.style.width = p.style.height = (1+Math.random()*3)+'px';
      cont.appendChild(p);
    }
  }

  /* ===========================================================================
     17. HISTORIA / INTRO
     =========================================================================== */
  const storyLines = [
    "A operacao saiu do controle.",
    "A equipe foi separada.",
    "",
    "Voce acordou no interior de uma antiga mina.",
    "",
    "Nao ha sinal de radio. Nao ha reforcos.",
    "",
    "A unica saida esta em algum lugar a frente.",
    "",
    "Encontre o caminho para fora.",
    "",
    "Sobreviva."
  ];
  let storyLineIdx = 0;
  let storyCharIdx = 0;
  let storyTimer = 0;
  let storyInterval = null;
  let storyPhase = 'typing'; // typing | pausing | nexting

  function startStory() {
    const textEl = document.getElementById('storyText');
    const titleEl = document.getElementById('storyMissionTitle');
    if (!textEl) return;
    textEl.innerHTML = '';
    titleEl.classList.add('hidden');
    storyLineIdx = 0;
    storyCharIdx = 0;
    storyPhase = 'typing';

    clearInterval(storyInterval);
    storyInterval = setInterval(storyTick, 45);
  }

  function storyTick() {
    const textEl = document.getElementById('storyText');
    if (!textEl) return;

    if (storyLineIdx >= storyLines.length) {
      clearInterval(storyInterval);
      const title = document.getElementById('storyMissionTitle');
      if (title) title.classList.remove('hidden');
      setTimeout(()=>showScreen('LOADING'), 2000);
      return;
    }

    const line = storyLines[storyLineIdx];
    if (storyPhase === 'typing') {
      if (storyCharIdx < line.length) {
        textEl.innerHTML += line[storyCharIdx];
        storyCharIdx++;
      } else {
        textEl.innerHTML += '<br>';
        storyPhase = 'pausing';
        storyTimer = 0;
      }
    } else {
      storyTimer += 45;
      if (storyTimer > (line === '' ? 200 : 900)) {
        storyLineIdx++;
        storyCharIdx = 0;
        storyPhase = 'typing';
      }
    }
  }

  /* ===========================================================================
     18. CARREGAMENTO
     =========================================================================== */
  const loadingMessages = [
    'Inicializando mapa da caverna...',
    'Posicionando inimigos...',
    'Carregando texturas...',
    'Configurando dificuldade...',
    'Preparando armas...',
    'Missao pronta!'
  ];

  function startLoading() {
    clearInterval(storyInterval);
    let progress = 0;
    let msgIdx = 0;
    const bar = document.getElementById('loadingBarFill');
    const status = document.getElementById('loadingStatus');
    if (bar) bar.style.width = '0%';

    const iv = setInterval(()=>{
      progress += 3 + Math.random()*8;
      if (progress > 100) progress = 100;
      if (bar) bar.style.width = progress+'%';
      if (status && msgIdx < loadingMessages.length) {
        status.textContent = loadingMessages[msgIdx++];
      }
      if (progress >= 100) {
        clearInterval(iv);
        setTimeout(()=>{ hideAllScreens(); startMission(); }, 600);
      }
    }, 140);
  }

  /* ===========================================================================
     19. INICIO DA MISSAO
     =========================================================================== */
  function startMission() {
    const diff = DIFFICULTY_PRESETS[selectedDiff||'normal'];

    // Reset jogador
    player.x = 2.5; player.y = 2.5;
    player.dirX = 1; player.dirY = 0;
    player.planeX = 0; player.planeY = 0.66;
    player.pitch = 0;
    player.health = 100; player.stamina = 100;
    player.isCrouching = false; player.isRunning = false;
    player.isJumping = false; player.jumpHeight = 0; player.jumpVelocity = 0;
    player.bobbingTime = 0; player.bobbingOffset = 0;

    // Armas
    const wDef = WEAPON_DEFS[selectedWeapon||'glock'];
    player.weapons = [createWeaponState(wDef)];
    player.currentWeaponIdx = 0;

    // Stats
    missionStartTime = performance.now();
    missionElapsedTime = 0;
    totalShotsFired = 0; totalShotsHit = 0;
    totalKills = 0; totalDamageReceived = 0;

    // Missao
    currentObjectiveIndex = 0;
    chestOpened = false; exitReached = false;

    // Inimigos
    spawnEnemies(diff);

    // Pickups e particulas
    pickups = []; particles = [];

    // HUD
    hudEl.classList.remove('hidden');
    updateHUD(); updateObjectiveHUD(); updateWeaponSlots();

    gameState = 'PLAYING';
    requestPointerLock();
    showNotification('MISSAO 01 — A SAIDA');
  }

  /* ===========================================================================
     20. SPAWN DE INIMIGOS
     =========================================================================== */
  function spawnEnemies(diff) {
    enemies = [];
    const baseCount = 12;
    const count = Math.floor(baseCount * (diff.enemyCountMult || 1.0));
    const outfits = [
      { shirt:'#3b4a5c', pants:'#1e2630', hair:'#1a1208', skin:'#d4a574', vest:'#2a3540' },
      { shirt:'#4a3b2c', pants:'#2c2018', hair:'#0d0a06', skin:'#c49060', vest:'#3a2c20' },
      { shirt:'#2c3d2c', pants:'#1a2818', hair:'#241a0e', skin:'#e8b888', vest:'#1e3020' },
      { shirt:'#5c3a2a', pants:'#2c1e14', hair:'#12100a', skin:'#d4a070', vest:'#4a2c1c' }
    ];
    const spawnAreas = [];
    for (let y=2; y<MAP_H-2; y++) for (let x=2; x<MAP_W-2; x++) {
      if (worldMap[y][x]===0) {
        const d2 = (x-player.x)**2 + (y-player.y)**2;
        if (d2 > 30) spawnAreas.push({x:x+0.5, y:y+0.5});
      }
    }
    spawnAreas.sort(()=>Math.random()-0.5);

    for (let i=0; i<count; i++) {
      const slot = spawnAreas[i % spawnAreas.length];
      const outfit = outfits[i%outfits.length];
      const wKeys = ['glock','glock','deagle','silenced'];
      const enemyWeapon = wKeys[i%wKeys.length];
      enemies.push({
        id: i,
        x: slot.x + (Math.random()*0.4-0.2),
        y: slot.y + (Math.random()*0.4-0.2),
        hp: Math.floor(60 * diff.enemyHpMult),
        maxHp: Math.floor(60 * diff.enemyHpMult),
        speed: 1.1 * diff.enemySpeedMult,
        damage: Math.floor(12 * diff.enemyDamageMult),
        accuracy: diff.enemyAccuracy,
        detectRange: diff.enemyDetectRange,
        attackCooldown: diff.enemyAttackCooldown,
        reactionTime: diff.enemyReactionTime,
        outfit, weapon: enemyWeapon,
        walkCycle: Math.random()*Math.PI*2,
        idleCycle: Math.random()*Math.PI*2,
        state: 'patrol',    // patrol|alert|chase|attack|reload|hurt|dead
        patrolTimer: Math.random()*3,
        patrolDirX: Math.cos(Math.random()*Math.PI*2),
        patrolDirY: Math.sin(Math.random()*Math.PI*2),
        isMoving: false,
        attackTimer: 0,
        hurtTimer: 0,
        muzzleFlashTimer: 0,
        alertTimer: 0,
        reloadTimer: 0,
        ammo: 8 + Math.floor(Math.random()*8),
        alive: true,
        size: 0.88  // 10-15% menor
      });
    }
  }

  /* ===========================================================================
     21. PAUSA / RESUME
     =========================================================================== */
  function pauseGame() {
    gameState = 'PAUSED';
    pauseScreen.classList.remove('hidden');
    if (document.exitPointerLock) document.exitPointerLock();
  }
  function resumeGame() {
    pauseScreen.classList.add('hidden');
    settingsScreen.classList.add('hidden');
    gameState = 'PLAYING';
    requestPointerLock();
  }

  /* ===========================================================================
     22. GAME OVER / VITORIA
     =========================================================================== */
  function triggerGameOver() {
    gameState = 'GAMEOVER';
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
     23. SISTEMA DE TIRO DO JOGADOR
     =========================================================================== */
  function shootWeapon() {
    const ws = getCurrentWeapon();
    if (!ws) return;
    const now = performance.now();
    if (now - ws.lastShootTime < ws.def.fireRate) return;
    if (ws.isReloading) return;
    if (ws.ammo <= 0) { audio.playEmpty(); ws.lastShootTime=now; reloadWeapon(); return; }

    ws.ammo--;
    ws.lastShootTime = now;
    totalShotsFired++;
    weaponRecoil = ws.def.recoil;
    muzzleFlashTimer = 4;

    muzzleFlashFx.classList.add('active');
    setTimeout(()=>muzzleFlashFx.classList.remove('active'), 55);

    const ch = document.getElementById('crosshair');
    if (ch) { ch.classList.add('kick'); setTimeout(()=>ch.classList.remove('kick'), 90); }

    audio.playShoot(ws.def.id);
    updateHUD();

    // Dispersao por arma
    const spread = ws.def.spread;
    const sx = player.dirX + (Math.random()*2-1)*spread;
    const sy = player.dirY + (Math.random()*2-1)*spread;
    const len = Math.sqrt(sx*sx+sy*sy);
    checkHitscanShot(sx/len, sy/len, ws.def.damage, ws.def.range);
  }

  function checkHitscanShot(dx, dy, damage, range) {
    const wallDist = castBulletRay(player.x, player.y, dx, dy);
    let hit = null, minD = 9999;

    enemies.forEach(en=>{
      if (!en.alive) return;
      const edx = en.x-player.x, edy = en.y-player.y;
      const dist = Math.sqrt(edx*edx+edy*edy);
      if (dist >= wallDist || dist > range) return;
      const dot = (edx*dx+edy*dy)/dist;
      const perp = dist * Math.sqrt(Math.max(0, 1-dot*dot));
      const hitRadius = 0.38 * en.size;
      if (dot > 0 && perp < hitRadius && dist < minD) { minD=dist; hit=en; }
    });

    if (hit) {
      totalShotsHit++;
      hit.hp -= damage;
      hit.hurtTimer = 0.22;
      hit.state = 'hurt';
      hit.x += dx*0.1; hit.y += dy*0.1;
      hitmarkerTimer = 8;
      hitmarkerEl.classList.remove('hidden');
      audio.playHit(); audio.playHumanHurt();
      spawnParticles(hit.x, hit.y, '#cc4422', 7);
      if (hit.hp <= 0) killEnemy(hit);
    } else {
      const hx = player.x+dx*Math.min(wallDist,range);
      const hy = player.y+dy*Math.min(wallDist,range);
      spawnParticles(hx, hy, '#8a7060', 4);
    }
  }

  function killEnemy(en) {
    en.alive = false; en.state = 'dead';
    totalKills++;
    audio.playEnemyEliminated();
    spawnParticles(en.x, en.y, en.outfit.shirt, 16);
    if (Math.random()<0.4) {
      pickups.push({x:en.x, y:en.y, type:Math.random()<0.5?'health':'ammo', alive:true});
    }
    checkObjectiveProgress();
  }

  function castBulletRay(x, y, dx, dy) {
    let dist=0; const step=0.08;
    while (dist<26) {
      const cx=Math.floor(x+dx*dist), cy=Math.floor(y+dy*dist);
      if (cx<0||cx>=MAP_W||cy<0||cy>=MAP_H) return dist;
      if (worldMap[cy][cx]>0) return dist;
      dist+=step;
    }
    return dist;
  }

  function reloadWeapon() {
    const ws = getCurrentWeapon();
    if (!ws || ws.isReloading || ws.ammo===ws.def.magSize || ws.reserve<=0) return;
    ws.isReloading = true;
    ws.reloadStartTime = performance.now();
    reloadIndicator.classList.remove('hidden');
    audio.playReload();
  }

  function switchWeapon(idx) {
    if (idx < 0 || idx >= player.weapons.length) return;
    player.currentWeaponIdx = idx;
    updateHUD(); updateWeaponSlots();
    showNotification('EQUIPADO: '+player.weapons[idx].def.name);
  }

  /* ===========================================================================
     24. BAU E M4
     =========================================================================== */
  function tryInteract() {
    if (gameState !== 'PLAYING') return;
    // Checar bau
    const cdx=player.x-CHEST_POS.x, cdy=player.y-CHEST_POS.y;
    if (!chestOpened && cdx*cdx+cdy*cdy < 1.8) {
      chestOpened = true;
      audio.playInteract();
      interactPrompt.classList.add('hidden');
      // Mostrar tela de nova arma
      gameState='NEWWEAPON';
      if (document.exitPointerLock) document.exitPointerLock();
      hudEl.classList.add('hidden');
      newWeaponScreen.classList.remove('hidden');
      // Avancar objetivo
      setObjective(4);
      return;
    }
    // Checar saida
    const edx=player.x-EXIT_POS.x, edy=player.y-EXIT_POS.y;
    if (!exitReached && chestOpened && edx*edx+edy*edy < 2.5) {
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
    showNotification('M4A1 EQUIPADA! Use [2] para trocar');
    setObjective(5);
    audio.playObjective();
  }

  /* ===========================================================================
     25. SISTEMA DE OBJETIVOS
     =========================================================================== */
  function setObjective(idx) {
    if (idx===currentObjectiveIndex) return;
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
    if (currentObjectiveIndex===0 && alive<enemies.length*0.9) setObjective(1);
    if (currentObjectiveIndex===1 && alive<enemies.length*0.6) setObjective(2);
    if (currentObjectiveIndex===2 && alive<enemies.length*0.35) setObjective(3);
    if (currentObjectiveIndex===3 && alive===0) setObjective(4);
  }

  /* ===========================================================================
     26. DANO AO JOGADOR
     =========================================================================== */
  function damagePlayer(amount) {
    player.health = Math.max(0, player.health-amount);
    totalDamageReceived += amount;
    audio.playPlayerHurt();
    damageVignette.classList.add('damaged');
    setTimeout(()=>damageVignette.classList.remove('damaged'), 200);
    updateHUD();
    if (player.health<=0) triggerGameOver();
  }

  /* ===========================================================================
     27. NOTIFICACOES
     =========================================================================== */
  function showNotification(msg) {
    if (!hudNotice) return;
    hudNotice.textContent = msg;
    hudNotice.classList.remove('hidden');
    clearTimeout(hudNotice._t);
    hudNotice._t = setTimeout(()=>hudNotice.classList.add('hidden'), 2400);
  }

  /* ===========================================================================
     28. UPDATE - LOOP PRINCIPAL
     =========================================================================== */
  function update(dt) {
    if (gameState !== 'PLAYING') return;

    // -- Timer da missao --
    missionElapsedTime = (performance.now()-missionStartTime)/1000;
    if (missionTimer) missionTimer.textContent = formatTime(missionElapsedTime);

    // -- Recarga --
    const ws = getCurrentWeapon();
    if (ws && ws.isReloading) {
      const elapsed = performance.now()-ws.reloadStartTime;
      if (elapsed >= ws.def.reloadTime) {
        const need = ws.def.magSize-ws.ammo;
        const take = Math.min(need, ws.reserve);
        ws.ammo += take; ws.reserve -= take;
        ws.isReloading = false;
        reloadIndicator.classList.add('hidden');
        updateHUD();
      }
    }

    // -- Movimentacao do jogador --
    updatePlayerMovement(dt);

    // -- Recuo e sway --
    weaponRecoil *= 0.80; weaponSwayX *= 0.88; weaponSwayY *= 0.88;
    if (hitmarkerTimer>0) { hitmarkerTimer--; if(hitmarkerTimer===0) hitmarkerEl.classList.add('hidden'); }

    // -- Stamina --
    updateStamina(dt);

    // -- Pulo --
    updateJump(dt);

    // -- IA dos inimigos --
    enemies.forEach(en=>{ if(en.alive) updateEnemy(en, dt); });

    // -- Pickups --
    pickups.forEach(p=>{ if(!p.alive) return;
      const dx=player.x-p.x, dy=player.y-p.y;
      if (dx*dx+dy*dy<0.6) {
        p.alive=false;
        if (p.type==='health') { player.health=Math.min(100,player.health+30); showNotification('+30 VIDA'); audio.playHit(); }
        else {
          const ww = getCurrentWeapon();
          if (ww) { ww.reserve=Math.min(ww.def.magSize*4, ww.reserve+ww.def.magSize); showNotification('+MUNICAO'); audio.playHit(); }
        }
        updateHUD();
      }
    });

    // -- Particulas --
    for (let i=particles.length-1; i>=0; i--) {
      const pt=particles[i];
      pt.x+=pt.vx*dt; pt.y+=pt.vy*dt; pt.z+=pt.vz*dt;
      pt.vz-=8*dt;
      if (pt.z<0) { pt.z=0; pt.vz=-pt.vz*0.25; }
      pt.life-=dt;
      if (pt.life<=0) particles.splice(i,1);
    }

    // -- Interacao --
    updateInteractPrompt();

    // -- Passos --
    if (player.isMoving) {
      footstepTimer+=dt;
      if (footstepTimer>(player.isRunning?0.28:0.42)) {
        footstepTimer=0; audio.playFootstep();
      }
    } else footstepTimer=0;

    // -- Verificar saida --
    const edx=player.x-EXIT_POS.x, edy=player.y-EXIT_POS.y;
    if (chestOpened && !exitReached && edx*edx+edy*edy < 2.5) {
      exitReached=true; setTimeout(triggerMissionComplete, 800);
    }
  }

  function updatePlayerMovement(dt) {
    let mx=0, my=0;
    if (keys.w) { mx+=player.dirX; my+=player.dirY; }
    if (keys.s) { mx-=player.dirX; my-=player.dirY; }
    if (keys.d) { mx+=player.planeX; my+=player.planeY; }
    if (keys.a) { mx-=player.planeX; my-=player.planeY; }
    const mlen=Math.sqrt(mx*mx+my*my);
    player.isMoving = mlen > 0.01;

    if (player.isMoving) {
      mx/=mlen; my/=mlen;
      player.isRunning = keys.shift && player.stamina>0 && !player.isCrouching;
      player.isCrouching = keys.ctrl && !player.isRunning;
      const spd = player.speed * (player.isRunning?1.75:1.0) * (player.isCrouching?0.5:1.0) * dt;
      const rad=0.26;
      const nx=player.x+mx*spd;
      const cx1=Math.floor(nx+(mx>0?rad:-rad));
      if (worldMap[Math.floor(player.y)]&&worldMap[Math.floor(player.y)][cx1]===0) player.x=nx;
      const ny=player.y+my*spd;
      const cy1=Math.floor(ny+(my>0?rad:-rad));
      if (worldMap[cy1]&&worldMap[cy1][Math.floor(player.x)]===0) player.y=ny;
      player.bobbingTime+=dt*(player.isRunning?12:7);
      player.bobbingOffset=Math.sin(player.bobbingTime)*(player.isRunning?7:4);
    } else {
      player.isRunning=false;
      player.isCrouching=keys.ctrl;
      player.bobbingOffset*=0.85;
    }
  }

  function updateStamina(dt) {
    if (player.isRunning && player.isMoving) {
      player.stamina = Math.max(0, player.stamina - dt*22);
    } else {
      player.stamina = Math.min(100, player.stamina + dt*12);
    }
    if (staminaNumber) staminaNumber.textContent = Math.floor(player.stamina);
    if (staminaBarFill) {
      staminaBarFill.style.width = player.stamina+'%';
      staminaBarFill.classList.toggle('low', player.stamina<25);
    }
  }

  function updateJump(dt) {
    if (keys.space && !player.isJumping && player.jumpHeight===0) {
      player.isJumping=true; player.jumpVelocity=4.5;
    }
    if (player.isJumping) {
      player.jumpVelocity-=12*dt;
      player.jumpHeight+=player.jumpVelocity*dt;
      if (player.jumpHeight<=0) { player.jumpHeight=0; player.jumpVelocity=0; player.isJumping=false; }
    }
  }

  function updateInteractPrompt() {
    const cdx=player.x-CHEST_POS.x, cdy=player.y-CHEST_POS.y;
    const nearChest = !chestOpened && cdx*cdx+cdy*cdy<2.5;
    const edx=player.x-EXIT_POS.x, edy=player.y-EXIT_POS.y;
    const nearExit = chestOpened && !exitReached && edx*edx+edy*edy<3;
    if (nearChest) {
      interactPrompt.classList.remove('hidden');
      if(interactText) interactText.textContent='ABRIR BAU';
      if (keys.e) { keys.e=false; tryInteract(); }
    } else if (nearExit) {
      interactPrompt.classList.remove('hidden');
      if(interactText) interactText.textContent='SAIDA DA MINA';
      if (keys.e) { keys.e=false; tryInteract(); }
    } else {
      interactPrompt.classList.add('hidden');
    }
  }

  /* ===========================================================================
     29. IA DOS INIMIGOS
     =========================================================================== */
  function updateEnemy(en, dt) {
    if (en.hurtTimer>0) { en.hurtTimer-=dt; if(en.hurtTimer<=0&&en.state==='hurt') en.state='alert'; }
    if (en.muzzleFlashTimer>0) en.muzzleFlashTimer-=dt;

    const dx=player.x-en.x, dy=player.y-en.y;
    const dist=Math.sqrt(dx*dx+dy*dy);

    switch(en.state) {
      case 'patrol': updateEnemyPatrol(en, dt, dist); break;
      case 'alert':  updateEnemyAlert(en, dt, dist); break;
      case 'chase':  updateEnemyChase(en, dt, dx, dy, dist); break;
      case 'attack': updateEnemyAttack(en, dt, dx, dy, dist); break;
      case 'reload': updateEnemyReload(en, dt, dx, dy, dist); break;
      case 'hurt':   break;
      default: break;
    }
    en.idleCycle+=dt*2;
    if(en.isMoving) en.walkCycle+=dt*7;
  }

  function updateEnemyPatrol(en, dt, dist) {
    en.isMoving=true;
    en.patrolTimer-=dt;
    if (en.patrolTimer<=0) {
      const ang=Math.random()*Math.PI*2;
      en.patrolDirX=Math.cos(ang); en.patrolDirY=Math.sin(ang);
      en.patrolTimer=2+Math.random()*3;
    }
    const spd=en.speed*0.35*dt;
    const nx=en.x+en.patrolDirX*spd, ny=en.y+en.patrolDirY*spd;
    if (worldMap[Math.floor(en.y)]&&worldMap[Math.floor(en.y)][Math.floor(nx)]===0) en.x=nx;
    if (worldMap[Math.floor(ny)]&&worldMap[Math.floor(ny)][Math.floor(en.x)]===0) en.y=ny;
    if (dist < en.detectRange) { en.state='alert'; en.alertTimer=en.reactionTime; }
  }

  function updateEnemyAlert(en, dt, dist) {
    en.isMoving=false;
    en.alertTimer-=dt;
    if (en.alertTimer<=0) en.state='chase';
    if (dist > en.detectRange*1.4) en.state='patrol';
  }

  function updateEnemyChase(en, dt, dx, dy, dist) {
    if (dist > en.detectRange*1.5) { en.state='patrol'; en.isMoving=false; return; }
    if (dist < 1.5) { en.state='attack'; en.attackTimer=0; en.isMoving=false; return; }
    en.isMoving=true;
    const spd=en.speed*dt;
    const vx=(dx/dist)*spd, vy=(dy/dist)*spd;
    if (worldMap[Math.floor(en.y)]&&worldMap[Math.floor(en.y)][Math.floor(en.x+vx)]===0) en.x+=vx;
    if (worldMap[Math.floor(en.y+vy)]&&worldMap[Math.floor(en.y+vy)][Math.floor(en.x)]===0) en.y+=vy;
    // Atirar enquanto persegue (a distancia maior)
    if (dist < en.detectRange*0.7) { en.state='attack'; }
  }

  function updateEnemyAttack(en, dt, dx, dy, dist) {
    en.isMoving=false;
    if (dist > en.detectRange*0.75) { en.state='chase'; return; }
    en.attackTimer-=dt;
    if (en.attackTimer<=0) {
      en.attackTimer=en.attackCooldown*(0.8+Math.random()*0.4);
      if (en.ammo>0) {
        enemyShoot(en, dx, dy, dist);
      } else {
        en.state='reload'; en.reloadTimer=1.8+Math.random()*0.8;
      }
    }
  }

  function updateEnemyReload(en, dt, dx, dy, dist) {
    en.isMoving=false;
    en.reloadTimer-=dt;
    if (en.reloadTimer<=0) {
      en.ammo=10+Math.floor(Math.random()*8);
      en.state='chase';
    }
  }

  function enemyShoot(en, dx, dy, dist) {
    en.ammo--;
    en.muzzleFlashTimer=0.1;
    const acc=en.accuracy;
    const spread=(1-acc)*0.35;
    const sdx=dx/dist+(Math.random()*2-1)*spread;
    const sdy=dy/dist+(Math.random()*2-1)*spread;
    const len=Math.sqrt(sdx*sdx+sdy*sdy);
    // Verificar se acerta o jogador (raycast simples)
    const hitDist=castBulletRay(en.x, en.y, sdx/len, sdy/len);
    const pdx=player.x-en.x, pdy=player.y-en.y;
    const pd=Math.sqrt(pdx*pdx+pdy*pdy);
    if (hitDist>pd-0.5) {
      const diff=DIFFICULTY_PRESETS[selectedDiff||'normal'];
      damagePlayer(en.damage);
    }
    audio.playEnemyShoot(en.weapon);
    spawnParticles(en.x, en.y, '#ffcc44', 3);
  }

  /* ===========================================================================
     30. PARTICULAS
     =========================================================================== */
  function spawnParticles(x, y, color, count) {
    for (let i=0; i<count; i++) {
      const ang=Math.random()*Math.PI*2, spd=1.0+Math.random()*2.5;
      particles.push({ x,y,z:0.5+Math.random()*0.4,
        vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd, vz:1.2+Math.random()*2,
        color, life:0.3+Math.random()*0.35 });
    }
  }

  /* ===========================================================================
     31. HUD UPDATE
     =========================================================================== */
  function updateHUD() {
    if (!hudEl) return;
    if (healthNumber) healthNumber.textContent = Math.max(0,Math.floor(player.health));
    if (healthBarFill) {
      healthBarFill.style.width = Math.max(0,player.health)+'%';
      healthBarFill.classList.toggle('critical', player.health<=25);
    }
    const ws=getCurrentWeapon();
    if (ws) {
      if (currentAmmoEl) currentAmmoEl.textContent = ws.ammo;
      if (reserveAmmoEl) reserveAmmoEl.textContent = ws.reserve;
      if (currentWeaponName) currentWeaponName.textContent = ws.def.shortName;
      if (bulletPipsEl) {
        bulletPipsEl.innerHTML='';
        const total=Math.min(ws.def.magSize, 30);
        for (let i=0;i<total;i++) {
          const p=document.createElement('div');
          p.className='bullet-pip'+(i<ws.ammo?'':' empty');
          bulletPipsEl.appendChild(p);
        }
      }
    }
  }

  function updateWeaponSlots() {
    if (!weaponSlotsEl) return;
    weaponSlotsEl.innerHTML='';
    player.weapons.forEach((w,i)=>{
      const slot=document.createElement('div');
      slot.className='weapon-slot'+(i===player.currentWeaponIdx?' active':'');
      slot.textContent='['+(i+1)+'] '+w.def.shortName;
      slot.addEventListener('click',()=>switchWeapon(i));
      weaponSlotsEl.appendChild(slot);
    });
  }

  /* ===========================================================================
     32. RENDERIZACAO PRINCIPAL
     =========================================================================== */
  function render() {
    if (!ctx) return;
    const w=canvas.width, h=canvas.height;
    if (w===0||h===0) return;
    if (zBuffer.length!==w) zBuffer=new Float32Array(w);

    const crouchOffset = player.isCrouching ? 40 : 0;
    const jumpOff = player.jumpHeight * -60;
    const pitchOffset = Math.floor(player.pitch + player.bobbingOffset + crouchOffset + jumpOff);
    const horizon = Math.floor(h/2) + pitchOffset;

    // --- FUNDO DA CAVERNA ---
    renderCaveBackground(w, h, horizon);

    // --- RAYCASTING ---
    for (let x=0; x<w; x++) {
      const camX=(2*x)/w-1;
      const rayDX=player.dirX+player.planeX*camX;
      const rayDY=player.dirY+player.planeY*camX;
      let mapX=Math.floor(player.x), mapY=Math.floor(player.y);
      const ddX=Math.abs(1/(rayDX||0.00001)), ddY=Math.abs(1/(rayDY||0.00001));
      let stepX, stepY, sdX, sdY;
      if (rayDX<0) { stepX=-1; sdX=(player.x-mapX)*ddX; } else { stepX=1; sdX=(mapX+1.0-player.x)*ddX; }
      if (rayDY<0) { stepY=-1; sdY=(player.y-mapY)*ddY; } else { stepY=1; sdY=(mapY+1.0-player.y)*ddY; }
      let hit=0, side=0;
      while(!hit) {
        if(sdX<sdY){sdX+=ddX;mapX+=stepX;side=0;}else{sdY+=ddY;mapY+=stepY;side=1;}
        if(mapX<0||mapX>=MAP_W||mapY<0||mapY>=MAP_H){hit=1;break;}
        if(worldMap[mapY][mapX]>0){hit=1;}
      }
      let pwd;
      if(side===0) pwd=(mapX-player.x+(1-stepX)/2)/rayDX;
      else pwd=(mapY-player.y+(1-stepY)/2)/rayDY;
      pwd=Math.max(0.06,pwd);
      zBuffer[x]=pwd;
      const lh=Math.floor(h/pwd);
      const ds=Math.floor(-lh/2+horizon);
      const de=Math.floor(lh/2+horizon);
      let wx;
      if(side===0) wx=player.y+pwd*rayDY; else wx=player.x+pwd*rayDX;
      wx-=Math.floor(wx);
      let txX=Math.floor(wx*TEX_SIZE);
      if(side===0&&rayDX>0) txX=TEX_SIZE-txX-1;
      if(side===1&&rayDY<0) txX=TEX_SIZE-txX-1;
      const wt=(worldMap[mapY]&&worldMap[mapY][mapX])||1;
      const txData=textures[wt]||textures[1];
      // Iluminacao de caverna: escuro, com atenuacao maior
      const sideShade=side===1?0.65:0.85;
      const fog=Math.min(1.0,0.9/(0.1+pwd*0.065));
      const shade=sideShade*fog;
      renderWallSlice(ctx,x,ds,de,txX,txData,shade);
    }

    // --- SPRITES ---
    renderSprites(w, h, horizon);

    // --- ARMA DO JOGADOR ---
    renderWeapon(w, h);

    // --- MINIMAPA ---
    renderMinimap();
  }

  function renderCaveBackground(w, h, horizon) {
    // Teto da caverna (pedra escura)
    const ceilGrad = ctx.createLinearGradient(0, 0, 0, horizon);
    ceilGrad.addColorStop(0,'#0a0806');
    ceilGrad.addColorStop(0.6,'#14100c');
    ceilGrad.addColorStop(1,'#1e1814');
    ctx.fillStyle=ceilGrad;
    ctx.fillRect(0,0,w,horizon);

    // Chao da caverna (terra/pedra)
    const floorGrad = ctx.createLinearGradient(0,horizon,0,h);
    floorGrad.addColorStop(0,'#1a140e');
    floorGrad.addColorStop(0.5,'#150f0a');
    floorGrad.addColorStop(1,'#0e0a06');
    ctx.fillStyle=floorGrad;
    ctx.fillRect(0,horizon,w,h-horizon);

    // Claroes de lanternas (efeito ambiental)
    const t=performance.now()*0.001;
    const lanternColors=['rgba(255,180,60,0.03)','rgba(255,140,40,0.025)','rgba(200,120,40,0.02)'];
    lanternColors.forEach((c,i)=>{
      const lx=(w*0.25)+Math.sin(t*0.7+i*2.1)*(w*0.03);
      const ly=horizon+Math.sin(t*0.5+i)*20;
      const grad=ctx.createRadialGradient(lx,ly,0,lx,ly,120);
      grad.addColorStop(0,c); grad.addColorStop(1,'transparent');
      ctx.fillStyle=grad; ctx.fillRect(0,0,w,h);
    });
  }

  function renderWallSlice(ctx, screenX, drawStart, drawEnd, texX, textureData, shade) {
    const cs=Math.max(0,drawStart), ce=Math.min(canvas.height,drawEnd);
    if(cs>=ce) return;
    const idx=(Math.floor(TEX_SIZE*0.5)*TEX_SIZE+texX)*4;
    const r=Math.floor(textureData.data[idx]*shade);
    const g=Math.floor(textureData.data[idx+1]*shade);
    const b=Math.floor(textureData.data[idx+2]*shade);
    ctx.fillStyle=`rgb(${r},${g},${b})`;
    ctx.fillRect(screenX,cs,1,ce-cs);
  }

  /* ===========================================================================
     33. RENDERIZACAO DE SPRITES
     =========================================================================== */
  function renderSprites(w, h, horizon) {
    const sprites=[];
    enemies.forEach(en=>{
      if(!en.alive)return;
      const dx=en.x-player.x, dy=en.y-player.y;
      sprites.push({type:'enemy',obj:en,x:en.x,y:en.y,distSq:dx*dx+dy*dy});
    });
    caveProps.forEach(prop=>{
      const dx=prop.x-player.x, dy=prop.y-player.y;
      sprites.push({type:prop.type,obj:prop,x:prop.x,y:prop.y,distSq:dx*dx+dy*dy});
    });
    // Bau
    if (!chestOpened) {
      const dx=CHEST_POS.x-player.x, dy=CHEST_POS.y-player.y;
      sprites.push({type:'chest',obj:CHEST_POS,x:CHEST_POS.x,y:CHEST_POS.y,distSq:dx*dx+dy*dy});
    }
    // Saida
    {
      const dx=EXIT_POS.x-player.x, dy=EXIT_POS.y-player.y;
      sprites.push({type:'exit',obj:EXIT_POS,x:EXIT_POS.x,y:EXIT_POS.y,distSq:dx*dx+dy*dy});
    }
    pickups.forEach(p=>{
      if(!p.alive)return;
      const dx=p.x-player.x, dy=p.y-player.y;
      sprites.push({type:'pickup',obj:p,x:p.x,y:p.y,distSq:dx*dx+dy*dy});
    });
    particles.forEach(pt=>{
      const dx=pt.x-player.x, dy=pt.y-player.y;
      sprites.push({type:'particle',obj:pt,x:pt.x,y:pt.y,z:pt.z,distSq:dx*dx+dy*dy});
    });
    sprites.sort((a,b)=>b.distSq-a.distSq);

    sprites.forEach(item=>{
      const sx=item.x-player.x, sy=item.y-player.y;
      const invD=1.0/(player.planeX*player.dirY-player.dirX*player.planeY);
      const txf=invD*(player.dirY*sx-player.dirX*sy);
      const tyf=invD*(-player.planeY*sx+player.planeX*sy);
      if(tyf<=0.12) return;
      const ssx=Math.floor((w/2)*(1+txf/tyf));
      const dist=tyf;

      if (item.type==='particle') {
        const pt=item.obj;
        const pSz=Math.max(2,Math.floor((h/dist)*0.035));
        const pSy=Math.floor(horizon-(pt.z-0.5)*(h/dist));
        if(ssx>=0&&ssx<w&&dist<zBuffer[ssx]) { ctx.fillStyle=pt.color; ctx.fillRect(ssx-pSz/2,pSy-pSz/2,pSz,pSz); }
        return;
      }
      if (item.type==='pickup') {
        const p=item.obj;
        const sz=Math.abs(Math.floor((h/dist)*0.3));
        const dy2=Math.floor(horizon+(h/dist)*0.25-sz/2);
        if(ssx>=0&&ssx<w&&dist<zBuffer[ssx]) {
          ctx.fillStyle=p.type==='health'?'#22c55e':'#f59e0b';
          ctx.beginPath(); ctx.arc(ssx,dy2,sz/2,0,Math.PI*2); ctx.fill();
          ctx.fillStyle='#fff'; ctx.fillRect(ssx-sz*0.15,dy2-sz*0.35,sz*0.3,sz*0.25);
        }
        return;
      }
      if (item.type==='barrel') {
        const sz=Math.abs(Math.floor((h/dist)*0.55));
        const bw=Math.floor(sz*0.55);
        const startX=Math.floor(ssx-bw/2), endX=Math.floor(ssx+bw/2);
        const dy2=Math.floor(horizon+(h/dist)*0.15);
        if(endX<0||startX>=w) return;
        for(let stripe=startX;stripe<endX;stripe++) {
          if(stripe>=0&&stripe<w&&dist<zBuffer[stripe]) {
            const rx=(stripe-startX)/bw;
            const shade=Math.min(1,0.8/(0.1+dist*0.06));
            if(rx>0.05&&rx<0.95) {
              if(Math.abs(rx-0.5)<0.45) {
                const r=Math.floor(90*shade), g=Math.floor(55*shade), b=Math.floor(30*shade);
                ctx.fillStyle=`rgb(${r},${g},${b})`; ctx.fillRect(stripe,dy2-sz,1,sz);
              }
              // Aros metalicos
              if(Math.abs(rx-0.15)<0.04||Math.abs(rx-0.85)<0.04) {
                ctx.fillStyle=`rgba(80,80,80,${shade})`; ctx.fillRect(stripe,dy2-sz,1,sz);
              }
            }
          }
        }
        return;
      }
      if (item.type==='crate') {
        const sz=Math.abs(Math.floor((h/dist)*0.5));
        const startX=Math.floor(ssx-sz/2), endX=Math.floor(ssx+sz/2);
        const dy2=Math.floor(horizon+(h/dist)*0.15);
        if(endX<0||startX>=w) return;
        for(let stripe=startX;stripe<endX;stripe++) {
          if(stripe>=0&&stripe<w&&dist<zBuffer[stripe]) {
            const shade=Math.min(1,0.8/(0.1+dist*0.06));
            const r=Math.floor(110*shade), g=Math.floor(75*shade), b=Math.floor(40*shade);
            ctx.fillStyle=`rgb(${r},${g},${b})`; ctx.fillRect(stripe,dy2-sz,1,sz);
            if((stripe-startX)%Math.max(2,Math.floor(sz/3))<1) {
              ctx.fillStyle=`rgba(50,30,10,${shade})`; ctx.fillRect(stripe,dy2-sz,1,sz);
            }
          }
        }
        return;
      }
      if (item.type==='lantern') {
        const sz=Math.abs(Math.floor((h/dist)*0.2));
        const dy2=Math.floor(horizon-(h/dist)*0.1);
        if(ssx>=0&&ssx<w&&dist<zBuffer[ssx]) {
          const t=performance.now()*0.003;
          const flicker=0.8+Math.sin(t*7+item.obj.x)*0.15+Math.random()*0.05;
          ctx.fillStyle=`rgba(255,${Math.floor(160*flicker)},40,0.9)`;
          ctx.beginPath(); ctx.arc(ssx,dy2,Math.max(2,sz),0,Math.PI*2); ctx.fill();
          // Luz ambiental
          const grad=ctx.createRadialGradient(ssx,dy2,0,ssx,dy2,sz*4);
          grad.addColorStop(0,`rgba(255,180,60,${0.15*flicker})`);
          grad.addColorStop(1,'transparent');
          ctx.fillStyle=grad; ctx.fillRect(ssx-sz*4,dy2-sz*4,sz*8,sz*8);
        }
        return;
      }
      if (item.type==='minecart') {
        const sz=Math.abs(Math.floor((h/dist)*0.7));
        const sw=Math.floor(sz*1.1);
        const startX=Math.floor(ssx-sw/2), endX=Math.floor(ssx+sw/2);
        const dy2=Math.floor(horizon+(h/dist)*0.2);
        if(endX<0||startX>=w) return;
        for(let stripe=startX;stripe<endX;stripe++) {
          if(stripe>=0&&stripe<w&&dist<zBuffer[stripe]) {
            const shade=Math.min(1,0.8/(0.1+dist*0.06));
            const r=Math.floor(60*shade), g=Math.floor(60*shade), b=Math.floor(65*shade);
            ctx.fillStyle=`rgb(${r},${g},${b})`; ctx.fillRect(stripe,dy2-sz*0.6,1,sz*0.6);
            // Rodas
            ctx.fillStyle=`rgba(40,40,40,${shade})`;
            ctx.fillRect(stripe,dy2-sz*0.12,1,sz*0.12);
          }
        }
        return;
      }
      if (item.type==='tnt') {
        const sz=Math.abs(Math.floor((h/dist)*0.45));
        const dy2=Math.floor(horizon+(h/dist)*0.1);
        if(ssx>=0&&ssx<w&&dist<zBuffer[ssx]) {
          ctx.fillStyle='#cc2222'; ctx.fillRect(ssx-sz/2,dy2-sz,sz,sz);
          ctx.fillStyle='#fff'; ctx.fillRect(ssx-sz*0.45,dy2-sz*0.7,sz*0.9,sz*0.25);
          ctx.fillStyle='#cc2222'; ctx.font=`bold ${Math.max(8,sz*0.25)}px sans-serif`;
          ctx.textAlign='center'; ctx.fillText('TNT',ssx,dy2-sz*0.52);
        }
        return;
      }
      if (item.type==='chest') {
        const sz=Math.abs(Math.floor((h/dist)*0.65));
        const sw=Math.floor(sz*1.1);
        const startX=Math.floor(ssx-sw/2), endX=Math.floor(ssx+sw/2);
        const dy2=Math.floor(horizon+(h/dist)*0.1);
        if(endX<0||startX>=w) return;
        const t=performance.now()*0.004;
        const glow=0.7+Math.sin(t)*0.3;
        for(let stripe=startX;stripe<endX;stripe++) {
          if(stripe>=0&&stripe<w&&dist<zBuffer[stripe]) {
            const shade=Math.min(1,0.9/(0.1+dist*0.06));
            // Madeira do bau
            ctx.fillStyle=`rgb(${Math.floor(110*shade)},${Math.floor(70*shade)},${Math.floor(30*shade)})`;
            ctx.fillRect(stripe,dy2-sz,1,sz);
            // Tampa
            ctx.fillStyle=`rgb(${Math.floor(90*shade)},${Math.floor(58*shade)},${Math.floor(25*shade)})`;
            ctx.fillRect(stripe,dy2-sz,1,sz*0.35);
            // Fechadura dourada brilhando
            if(Math.abs(stripe-ssx)<Math.max(1,sw*0.06)) {
              ctx.fillStyle=`rgba(255,${Math.floor(200*glow)},40,${0.95*shade})`;
              ctx.fillRect(stripe,dy2-sz*0.65,1,sz*0.2);
            }
          }
        }
        // Label acima do bau
        if(ssx>=0&&ssx<w&&dist<8) {
          ctx.fillStyle=`rgba(255,${Math.floor(200*glow)},40,${Math.min(1,glow)})`;
          ctx.font=`bold ${Math.max(10,Math.floor(16-(dist*1.5)))}px Rajdhani`;
          ctx.textAlign='center';
          ctx.fillText('[E] BAU', ssx, dy2-sz-8);
        }
        return;
      }
      if (item.type==='exit') {
        if(!chestOpened) return;
        const sz=Math.abs(Math.floor((h/dist)*1.0));
        const dy2=Math.floor(horizon);
        if(ssx>=0&&ssx<w&&dist<zBuffer[ssx]) {
          const t2=performance.now()*0.005;
          const glow=0.5+Math.sin(t2)*0.5;
          const grad=ctx.createRadialGradient(ssx,dy2,0,ssx,dy2,sz);
          grad.addColorStop(0,`rgba(100,255,100,${0.8*glow})`);
          grad.addColorStop(0.5,`rgba(50,200,50,${0.3*glow})`);
          grad.addColorStop(1,'transparent');
          ctx.fillStyle=grad; ctx.fillRect(ssx-sz,dy2-sz,sz*2,sz*2);
          ctx.fillStyle=`rgba(100,255,100,${glow})`;
          ctx.font=`bold ${Math.max(10,Math.floor(18-dist))}px Rajdhani`;
          ctx.textAlign='center';
          ctx.fillText('SAIDA', ssx, dy2-10);
        }
        return;
      }
      if (item.type==='enemy') {
        renderEnemy(item.obj, ssx, dist, w, h, horizon);
        return;
      }
    });
  }

  /* ===========================================================================
     34. RENDERIZACAO DO INIMIGO (MELHORADO COM ARMA)
     =========================================================================== */
  function renderEnemy(en, ssx, dist, w, h, horizon) {
    const scale = en.size || 0.88;
    const sprH = Math.abs(Math.floor((h/dist) * 0.92 * scale));
    const sprW = Math.floor(sprH * 0.52);
    const walkSwing = en.isMoving ? Math.sin(en.walkCycle) : 0;
    const bounce = en.isMoving ? Math.abs(Math.sin(en.walkCycle*2))*(sprH*0.025) : Math.sin(en.idleCycle)*(sprH*0.01);
    const drawY = Math.floor(horizon - sprH*0.52 - bounce);
    const startX = Math.floor(ssx - sprW/2);
    const endX = Math.floor(ssx + sprW/2);
    if (endX<0||startX>=w) return;
    const isHurt = en.hurtTimer>0;
    const shade = Math.min(1, 0.9/(0.1+dist*0.1));

    // Calcula direcao do inimigo ao jogador (para apontar arma)
    const dx=player.x-en.x, dy2=player.y-en.y;
    const angle=Math.atan2(dy2,dx);
    const facingRight = Math.cos(angle-Math.atan2(player.dirY,player.dirX))>0;

    for (let stripe=startX; stripe<endX; stripe++) {
      if (stripe<0||stripe>=w||dist>=zBuffer[stripe]) continue;
      const relX=(stripe-startX)/sprW;
      renderEnemyStripe(ctx, stripe, drawY, sprH, sprW, relX, walkSwing, en.outfit, isHurt, shade, en.state);
    }

    // Barra de vida
    const midX=Math.floor(ssx);
    if (midX>=0&&midX<w&&dist<zBuffer[midX]&&en.hp<en.maxHp) {
      const bw=Math.max(24,Math.floor(sprW*0.85));
      const bh=3;
      const bx=midX-bw/2, by=drawY-10;
      ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(bx,by,bw,bh);
      const hPct=Math.max(0,en.hp/en.maxHp);
      const hc=hPct>0.5?'#22c55e':hPct>0.25?'#facc15':'#ef4444';
      ctx.fillStyle=hc; ctx.fillRect(bx,by,bw*hPct,bh);
    }

    // Muzzle flash do inimigo
    if (en.muzzleFlashTimer>0&&midX>=0&&midX<w&&dist<zBuffer[midX]) {
      const flashY=drawY+Math.floor(sprH*0.32);
      const flashX=midX+(facingRight?Math.floor(sprW*0.5):-Math.floor(sprW*0.5));
      const fg=ctx.createRadialGradient(flashX,flashY,0,flashX,flashY,Math.max(8,sprW*0.4));
      fg.addColorStop(0,'rgba(255,255,200,0.9)');
      fg.addColorStop(0.4,'rgba(255,160,40,0.5)');
      fg.addColorStop(1,'transparent');
      ctx.fillStyle=fg;
      ctx.fillRect(flashX-sprW*0.5,flashY-sprW*0.5,sprW,sprW);
    }
  }

  function renderEnemyStripe(ctx, sx, topY, height, width, relX, walkSwing, outfit, isHurt, shade, state) {
    const headH=height*0.22;
    const bodyH=height*0.32;
    const legsH=height*0.34;
    const armsH=bodyH;
    const headTop=topY;
    const bodyTop=headTop+headH;
    const legsTop=bodyTop+bodyH;

    function applyColor(hex, alpha) {
      if (isHurt) { ctx.fillStyle=state==='hurt'?'rgba(255,80,80,0.95)':'rgba(255,100,100,0.8)'; return; }
      if (alpha!==undefined) {
        const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
        ctx.fillStyle=`rgba(${Math.floor(r*shade)},${Math.floor(g*shade)},${Math.floor(b*shade)},${alpha})`;
      } else {
        const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
        ctx.fillStyle=`rgb(${Math.floor(r*shade)},${Math.floor(g*shade)},${Math.floor(b*shade)})`;
      }
    }

    // Cabeca arredondada (0.2 a 0.8)
    if (relX>=0.20&&relX<=0.80) {
      applyColor(outfit.hair);
      const hh=headH*0.32;
      ctx.fillRect(sx, headTop, 1, hh);
      applyColor(outfit.skin);
      ctx.fillRect(sx, headTop+hh, 1, headH-hh);
      // Olhos e equipamento
      if ((relX>=0.32&&relX<=0.42)||(relX>=0.58&&relX<=0.68)) {
        ctx.fillStyle=isHurt?'#ff0000':'#111827';
        ctx.fillRect(sx, headTop+headH*0.44, 1, headH*0.16);
      }
      // Balaclava/capacete (efeito visual militar)
      if (relX>=0.20&&relX<=0.26||relX>=0.74&&relX<=0.80) {
        applyColor(outfit.vest);
        ctx.fillRect(sx, headTop, 1, headH*0.55);
      }
    }

    // Colete/tronco (0.22 a 0.78)
    if (relX>=0.22&&relX<=0.78) {
      applyColor(outfit.vest);
      ctx.fillRect(sx,bodyTop,1,bodyH*0.45);
      applyColor(outfit.shirt);
      ctx.fillRect(sx,bodyTop+bodyH*0.45,1,bodyH*0.55);
    }

    // Braco esquerdo com arma (0.04 a 0.20)
    if (relX>=0.04&&relX<0.22) {
      const sw=-walkSwing*(height*0.07);
      applyColor(outfit.shirt);
      ctx.fillRect(sx,bodyTop+sw,1,bodyH*0.72);
      applyColor(outfit.skin);
      ctx.fillRect(sx,bodyTop+sw+bodyH*0.72,1,bodyH*0.28);
      // Arma na mao esquerda
      if (relX>=0.04&&relX<=0.12) {
        ctx.fillStyle=`rgba(40,45,55,${shade*0.95})`;
        ctx.fillRect(sx, bodyTop+sw+bodyH*0.5, 1, bodyH*0.55);
      }
    }

    // Braco direito com arma (0.78 a 0.96)
    if (relX>0.78&&relX<=0.96) {
      const sw=walkSwing*(height*0.07);
      applyColor(outfit.shirt);
      ctx.fillRect(sx,bodyTop+sw,1,bodyH*0.72);
      applyColor(outfit.skin);
      ctx.fillRect(sx,bodyTop+sw+bodyH*0.72,1,bodyH*0.28);
      // Arma na mao direita
      if (relX>=0.88&&relX<=0.96) {
        ctx.fillStyle=`rgba(38,42,50,${shade*0.95})`;
        ctx.fillRect(sx, bodyTop+sw+bodyH*0.45, 1, bodyH*0.65);
        // Cano da arma
        ctx.fillStyle=`rgba(30,34,40,${shade})`;
        ctx.fillRect(sx, bodyTop+sw+bodyH*0.38, 1, bodyH*0.2);
      }
    }

    // Pernas (0.24 a 0.76)
    if (relX>=0.24&&relX<=0.48) {
      const ls=-walkSwing*(height*0.065);
      applyColor(outfit.pants);
      ctx.fillRect(sx,legsTop+ls,1,legsH*0.78);
      ctx.fillStyle=`rgb(${Math.floor(30*shade)},${Math.floor(30*shade)},${Math.floor(30*shade)})`;
      ctx.fillRect(sx,legsTop+ls+legsH*0.78,1,legsH*0.22);
    } else if (relX>=0.52&&relX<=0.76) {
      const ls=walkSwing*(height*0.065);
      applyColor(outfit.pants);
      ctx.fillRect(sx,legsTop+ls,1,legsH*0.78);
      ctx.fillStyle=`rgb(${Math.floor(30*shade)},${Math.floor(30*shade)},${Math.floor(30*shade)})`;
      ctx.fillRect(sx,legsTop+ls+legsH*0.78,1,legsH*0.22);
    }
  }

  /* ===========================================================================
     35. RENDERIZACAO DA ARMA DO JOGADOR
     =========================================================================== */
  function renderWeapon(w, h) {
    const ws = getCurrentWeapon();
    if (!ws) return;
    ctx.save();
    const gw = Math.min(w*0.30, 260);
    const gh = gw * 1.05;
    const bobX = Math.cos(player.bobbingTime*0.5)*3.5;
    const bobY = Math.abs(Math.sin(player.bobbingTime))*6.5;
    const crouchOff = player.isCrouching ? 20 : 0;
    const posX = (w/2) + weaponSwayX*0.35 + bobX;
    const posY = h - gh*0.82 + weaponRecoil*1.0 + weaponSwayY*0.35 + bobY + crouchOff;
    ctx.translate(posX, posY);
    if (weaponRecoil>0.5) ctx.rotate(-weaponRecoil*0.003);

    ws.def.drawFn(ctx, gw, gh, weaponRecoil, muzzleFlashTimer, selectedChar);
    ctx.restore();
  }

  /* ---- FUNCOES DE DESENHO DE ARMAS ---- */

  // MAO/BRACO base (comum a todas as armas)
  function drawHand(ctx, gw, gh, skinColor, gloveColor) {
    const sk = skinColor || (selectedChar==='female'?'#e8b898':'#d4a070');
    // Antebraco
    ctx.fillStyle = sk;
    ctx.beginPath();
    ctx.roundRect(-gw*0.08, gh*0.38, gw*0.16, gh*0.55, gw*0.04);
    ctx.fill();
    // Luva tattica
    ctx.fillStyle = gloveColor || '#2a3540';
    ctx.beginPath();
    ctx.roundRect(-gw*0.13, gh*0.52, gw*0.26, gh*0.25, gw*0.03);
    ctx.fill();
  }

  function drawGlock(ctx, gw, gh, recoil, flash, charType) {
    drawHand(ctx, gw, gh);
    const sk = recoil*0.55;
    // Empunhadura
    ctx.fillStyle='#18191e';
    ctx.beginPath(); ctx.roundRect(-gw*0.14,gh*0.24,gw*0.28,gh*0.45,gw*0.035); ctx.fill();
    // Textura grip
    ctx.fillStyle='rgba(255,255,255,0.05)';
    for(let i=0;i<4;i++) { ctx.fillRect(-gw*0.11, gh*0.32+i*12, gw*0.22, 4); }
    // Slide superior
    ctx.fillStyle='#24282e';
    ctx.beginPath(); ctx.roundRect(-gw*0.16,-sk,gw*0.32,gh*0.3,gw*0.025); ctx.fill();
    // Detalhe slide
    ctx.fillStyle='#1a1c22';
    ctx.beginPath(); ctx.roundRect(-gw*0.12,-sk+4,gw*0.24,gh*0.22,gw*0.018); ctx.fill();
    // Mira traseira
    ctx.fillStyle='#0d0f12';
    ctx.fillRect(-gw*0.13,-sk-7,gw*0.07,7); ctx.fillRect(gw*0.06,-sk-7,gw*0.07,7);
    // Mira frontal
    ctx.fillStyle='#0d0f12'; ctx.fillRect(-2,-sk-12,4,12);
    ctx.fillStyle='#22c55e'; ctx.beginPath(); ctx.arc(0,-sk-9,2.2,0,Math.PI*2); ctx.fill();
    // Cano
    ctx.fillStyle='#111418';
    ctx.beginPath(); ctx.roundRect(-gw*0.06,-sk-4,gw*0.12,gh*0.05,2); ctx.fill();
    // Muzzle flash
    if(flash>0) drawMuzzleFlash(ctx,0,-sk-18,flash,gw*0.7);
  }

  function drawDeagle(ctx, gw, gh, recoil, flash, charType) {
    drawHand(ctx, gw, gh, null, '#1c2028');
    const sk=recoil*0.72;
    // Grip grande
    ctx.fillStyle='#1c1f25';
    ctx.beginPath(); ctx.roundRect(-gw*0.18,gh*0.2,gw*0.36,gh*0.52,gw*0.04); ctx.fill();
    ctx.fillStyle='#141619';
    for(let i=0;i<5;i++) { ctx.fillRect(-gw*0.14,gh*0.28+i*11,gw*0.28,5); }
    // Slide enorme
    ctx.fillStyle='#28292e';
    ctx.beginPath(); ctx.roundRect(-gw*0.19,-sk,gw*0.38,gh*0.32,gw*0.03); ctx.fill();
    ctx.fillStyle='#1e2026';
    ctx.beginPath(); ctx.roundRect(-gw*0.14,-sk+4,gw*0.28,gh*0.24,gw*0.02); ctx.fill();
    // Serra de mira grande
    ctx.fillStyle='#100e0d'; ctx.fillRect(-gw*0.16,-sk-9,gw*0.09,9); ctx.fillRect(gw*0.07,-sk-9,gw*0.09,9);
    ctx.fillStyle='#100e0d'; ctx.fillRect(-3,-sk-14,6,14);
    ctx.fillStyle='#f97316'; ctx.beginPath(); ctx.arc(0,-sk-10,3,0,Math.PI*2); ctx.fill();
    // Cano grosso
    ctx.fillStyle='#0e1012';
    ctx.beginPath(); ctx.roundRect(-gw*0.08,-sk-6,gw*0.16,gh*0.07,3); ctx.fill();
    if(flash>0) drawMuzzleFlash(ctx,0,-sk-20,flash,gw*1.0);
  }

  function drawSilenced(ctx, gw, gh, recoil, flash, charType) {
    drawHand(ctx, gw, gh, null, '#222a28');
    const sk=recoil*0.45;
    // Grip slim
    ctx.fillStyle='#1a1e1c';
    ctx.beginPath(); ctx.roundRect(-gw*0.12,gh*0.24,gw*0.24,gh*0.48,gw*0.03); ctx.fill();
    // Slide fino
    ctx.fillStyle='#22262a';
    ctx.beginPath(); ctx.roundRect(-gw*0.13,-sk,gw*0.26,gh*0.28,gw*0.02); ctx.fill();
    ctx.fillStyle='#191c20';
    ctx.beginPath(); ctx.roundRect(-gw*0.10,-sk+3,gw*0.20,gh*0.22,gw*0.015); ctx.fill();
    // Silenciador longo
    ctx.fillStyle='#1e2228';
    ctx.beginPath(); ctx.roundRect(-gw*0.065,-sk-gh*0.22,gw*0.13,gh*0.24,gw*0.03); ctx.fill();
    ctx.fillStyle='#161a1e';
    for(let i=0;i<5;i++) { ctx.fillRect(-gw*0.055,-sk-gh*0.20+i*(gh*0.035),gw*0.11,gh*0.012); }
    // Miras
    ctx.fillStyle='#0d1012'; ctx.fillRect(-gw*0.11,-sk-6,gw*0.055,6); ctx.fillRect(gw*0.055,-sk-6,gw*0.055,6);
    ctx.fillStyle='#1a1d21'; ctx.fillRect(-2,-sk-9,4,9);
    ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(0,-sk-7,1.5,0,Math.PI*2); ctx.fill();
    if(flash>0) {
      ctx.globalAlpha=0.4;
      drawMuzzleFlash(ctx,0,-sk-gh*0.27-4,flash,gw*0.4);
      ctx.globalAlpha=1;
    }
  }

  function drawM4(ctx, gw, gh, recoil, flash, charType) {
    drawHand(ctx, gw, gh, null, '#1e2428');
    const sk=recoil*0.5;
    // Grip angular
    ctx.fillStyle='#1a1e22';
    ctx.beginPath(); ctx.roundRect(-gw*0.11,gh*0.22,gw*0.22,gh*0.5,gw*0.025); ctx.fill();
    // Receptor/corpo principal
    ctx.fillStyle='#20242a';
    ctx.beginPath(); ctx.roundRect(-gw*0.19,-sk,gw*0.38,gh*0.28,gw*0.02); ctx.fill();
    ctx.fillStyle='#181c22';
    ctx.beginPath(); ctx.roundRect(-gw*0.15,-sk+4,gw*0.30,gh*0.2,gw*0.015); ctx.fill();
    // Cano longo
    ctx.fillStyle='#161820';
    ctx.beginPath(); ctx.roundRect(-gw*0.07,-sk-gh*0.16,gw*0.14,gh*0.18,gw*0.018); ctx.fill();
    // Rail superior (picatinny)
    ctx.fillStyle='#0e1014';
    for(let i=0;i<7;i++) { ctx.fillRect(-gw*0.17+i*(gw*0.048),-sk-4,gw*0.032,4); }
    // Coronha
    ctx.fillStyle='#18202a';
    ctx.beginPath(); ctx.roundRect(-gw*0.19,-sk+gh*0.08,gw*0.06,gh*0.22,gw*0.015); ctx.fill();
    // Miras
    ctx.fillStyle='#0d1014'; ctx.fillRect(-gw*0.14,-sk-9,gw*0.07,9); ctx.fillRect(gw*0.07,-sk-9,gw*0.07,9);
    ctx.fillStyle='#0d1014'; ctx.fillRect(-2,-sk-14,4,14);
    ctx.fillStyle='#ef4444'; ctx.beginPath(); ctx.arc(0,-sk-11,2.5,0,Math.PI*2); ctx.fill();
    // Carregador
    ctx.fillStyle='#141820';
    ctx.beginPath(); ctx.roundRect(-gw*0.07,gh*0.2,gw*0.14,gh*0.35,gw*0.025); ctx.fill();
    if(flash>0) drawMuzzleFlash(ctx,0,-sk-gh*0.18-4,flash,gw*0.85);
  }

  function drawMuzzleFlash(ctx, x, y, timer, size) {
    ctx.save(); ctx.translate(x,y);
    const fg=ctx.createRadialGradient(0,0,4,0,0,size*0.8);
    fg.addColorStop(0,'#ffffff'); fg.addColorStop(0.3,'#facc15'); fg.addColorStop(0.6,'rgba(249,115,22,0.5)'); fg.addColorStop(1,'transparent');
    ctx.fillStyle=fg; ctx.beginPath(); ctx.arc(0,0,size*0.8,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.8)'; ctx.lineWidth=2;
    for(let a=0;a<6;a++) {
      const ang=(a*Math.PI)/3+(Math.random()*0.25-0.125);
      const len=size*0.5+Math.random()*size*0.3;
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(ang)*len,Math.sin(ang)*len); ctx.stroke();
    }
    ctx.restore();
  }

  /* ===========================================================================
     36. MINIMAP
     =========================================================================== */
  function renderMinimap() {
    if (!minimapCtx) return;
    const mw=minimapCanvas.width, mh=minimapCanvas.height;
    minimapCtx.clearRect(0,0,mw,mh);
    const cw=mw/MAP_W, ch=mh/MAP_H;
    minimapCtx.fillStyle='#0a0806'; minimapCtx.fillRect(0,0,mw,mh);
    for(let y=0;y<MAP_H;y++) for(let x=0;x<MAP_W;x++) {
      const t=worldMap[y][x];
      if(t>0) {
        const colors=['','#2e2620','#4a331f','#252219','#302820','#4a3818','#3a4048','#1a1a14'];
        minimapCtx.fillStyle=colors[t]||'#333';
        minimapCtx.fillRect(x*cw,y*ch,cw,ch);
      }
    }
    // Bau
    if(!chestOpened) {
      minimapCtx.fillStyle='#facc15';
      minimapCtx.fillRect(CHEST_POS.x*cw-2,CHEST_POS.y*ch-2,4,4);
    }
    // Saida
    if(chestOpened) {
      minimapCtx.fillStyle='#22c55e';
      minimapCtx.fillRect(EXIT_POS.x*cw-2,EXIT_POS.y*ch-2,4,4);
    }
    // Inimigos
    enemies.forEach(en=>{
      if(!en.alive) return;
      minimapCtx.fillStyle=en.state==='chase'||en.state==='attack'?'#ef4444':'#f97316';
      minimapCtx.beginPath();
      minimapCtx.arc(en.x*cw,en.y*ch,2.2,0,Math.PI*2); minimapCtx.fill();
    });
    // Jogador
    const px=player.x*cw, py=player.y*ch;
    minimapCtx.fillStyle='rgba(34,197,94,0.22)';
    minimapCtx.beginPath();
    minimapCtx.moveTo(px,py);
    minimapCtx.lineTo((player.x+(player.dirX-player.planeX)*2.5)*cw,(player.y+(player.dirY-player.planeY)*2.5)*ch);
    minimapCtx.lineTo((player.x+(player.dirX+player.planeX)*2.5)*cw,(player.y+(player.dirY+player.planeY)*2.5)*ch);
    minimapCtx.closePath(); minimapCtx.fill();
    minimapCtx.fillStyle='#22c55e';
    minimapCtx.beginPath(); minimapCtx.arc(px,py,3,0,Math.PI*2); minimapCtx.fill();
  }

  /* ===========================================================================
     37. PREVIEW DOS PERSONAGENS (TELA DE SELECAO)
     =========================================================================== */
  function drawCharPreviews() {
    drawCharCanvas('charPreviewMale','male');
    drawCharCanvas('charPreviewFemale','female');
  }

  function drawCharCanvas(id, gender) {
    const c=document.getElementById(id); if(!c) return;
    const ctx2=c.getContext('2d');
    const w=c.width, h=c.height;
    ctx2.clearRect(0,0,w,h);

    // Fundo escuro gradiente
    const bg=ctx2.createLinearGradient(0,0,0,h);
    bg.addColorStop(0,'#0d1118'); bg.addColorStop(1,'#060810');
    ctx2.fillStyle=bg; ctx2.fillRect(0,0,w,h);

    const cx=w/2;
    const skin=gender==='female'?'#e8b898':'#d4a070';
    const hair=gender==='female'?'#4a2a1a':'#1a1208';
    const shirt=gender==='female'?'#3a2c4a':'#2a3848';
    const vest=gender==='female'?'#2a2035':'#1e2a38';
    const pants=gender==='female'?'#2a1a2a':'#1e2830';

    // Cabeca
    ctx2.fillStyle=hair;
    ctx2.beginPath(); ctx2.roundRect(cx-18,22,36,10,5); ctx2.fill();
    ctx2.fillStyle=skin;
    ctx2.beginPath(); ctx2.roundRect(cx-15,28,30,28,8); ctx2.fill();
    // Olhos
    ctx2.fillStyle='#111'; ctx2.fillRect(cx-9,38,6,4); ctx2.fillRect(cx+3,38,6,4);
    // Boca
    ctx2.strokeStyle='#9a6040'; ctx2.lineWidth=1.5;
    ctx2.beginPath(); ctx2.arc(cx,50,5,0.1,Math.PI-0.1); ctx2.stroke();
    // Colete/corpo
    ctx2.fillStyle=vest;
    ctx2.beginPath(); ctx2.roundRect(cx-20,56,40,36,6); ctx2.fill();
    ctx2.fillStyle=shirt;
    ctx2.beginPath(); ctx2.roundRect(cx-16,66,32,26,4); ctx2.fill();
    // Bracos
    ctx2.fillStyle=shirt;
    ctx2.beginPath(); ctx2.roundRect(cx-30,58,12,32,5); ctx2.fill();
    ctx2.beginPath(); ctx2.roundRect(cx+18,58,12,32,5); ctx2.fill();
    ctx2.fillStyle=skin;
    ctx2.beginPath(); ctx2.roundRect(cx-30,82,12,10,3); ctx2.fill();
    ctx2.beginPath(); ctx2.roundRect(cx+18,82,12,10,3); ctx2.fill();
    // Calca
    ctx2.fillStyle=pants;
    ctx2.beginPath(); ctx2.roundRect(cx-18,92,16,42,5); ctx2.fill();
    ctx2.beginPath(); ctx2.roundRect(cx+2,92,16,42,5); ctx2.fill();
    // Botas
    ctx2.fillStyle='#111';
    ctx2.beginPath(); ctx2.roundRect(cx-20,128,16,14,4); ctx2.fill();
    ctx2.beginPath(); ctx2.roundRect(cx+4,128,16,14,4); ctx2.fill();

    // Detalhe feminino
    if (gender==='female') {
      ctx2.fillStyle='rgba(180,120,180,0.5)';
      ctx2.beginPath(); ctx2.roundRect(cx-2,22,14,8,3); ctx2.fill();
    }
    // Nome
    ctx2.fillStyle='#e2e8f0';
    ctx2.font='bold 11px Rajdhani,sans-serif';
    ctx2.textAlign='center';
    ctx2.fillText(gender==='female'?'AGENTE SARA':'AGENTE MARCUS', cx, 155);
  }

  /* ===========================================================================
     38. PREVIEW DAS ARMAS (TELA DE SELECAO)
     =========================================================================== */
  function drawWeaponPreviews() {
    [['weaponPreviewGlock','glock'],['weaponPreviewDeagle','deagle'],['weaponPreviewSilenced','silenced']].forEach(([id,wid])=>{
      const c=document.getElementById(id); if(!c) return;
      const ctx2=c.getContext('2d');
      ctx2.clearRect(0,0,c.width,c.height);
      const bg=ctx2.createLinearGradient(0,0,0,c.height);
      bg.addColorStop(0,'#0d1118'); bg.addColorStop(1,'#060810');
      ctx2.fillStyle=bg; ctx2.fillRect(0,0,c.width,c.height);
      ctx2.save();
      ctx2.translate(c.width/2, c.height*0.8);
      const gw=c.width*0.85, gh=gw*1.1;
      WEAPON_DEFS[wid].drawFn(ctx2, gw, gh, 0, 0, 'male');
      ctx2.restore();
    });
  }

  function drawNewWeaponPreview() {
    const c=document.getElementById('newWeaponPreview'); if(!c) return;
    const ctx2=c.getContext('2d');
    ctx2.clearRect(0,0,c.width,c.height);
    const bg=ctx2.createLinearGradient(0,0,0,c.height);
    bg.addColorStop(0,'#0d1118'); bg.addColorStop(1,'#060810');
    ctx2.fillStyle=bg; ctx2.fillRect(0,0,c.width,c.height);
    ctx2.save();
    ctx2.translate(c.width/2, c.height*0.88);
    const gw=c.width*0.85, gh=gw*1.0;
    drawM4(ctx2, gw, gh, 0, 0, selectedChar||'male');
    ctx2.restore();
  }

  /* ===========================================================================
     39. ROUNDRECT POLYFILL (para navegadores antigos)
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
