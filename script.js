/**
 * ============================================================================
 * OPERATION ZERO — FPS CAMPANHA 3D (WEBGL NATIVO)
 * Conversao Completa para 3D Real:
 * - Câmera em Primeira Pessoa 3D com Projeção Perspectiva
 * - Caverna 3D com Geometria, Paredes, Chão e Teto
 * - Textura Real de Rocha (assets/textures/rock.jpg)
 * - Iluminação Dinâmica 3D com Shaders GLSL, Tochas e Clarões de Disparo
 * - Carrinho de Mina 3D em Estilo Voxel (Inspirado no Minecraft)
 * - Inimigos Humanoides 3D com Articulações e Animações
 * - Armas e Mãos 3D em Primeira Pessoa
 * - Faca Tática 3D (Tanto/Serrilhada) baseada na Imagem de Referência
 * - Animação 3D de Giro da Faca na Mão (Tecla V)
 * - Disparos, Recuo, Impactos e Explosões em 3D
 * - Física, Colisões, Pulo e Agachamento em Espaço Tridimensional
 * ============================================================================
 */
(function () {
  'use strict';

  /* ===========================================================================
     1. MATEMATICA TRIDIMENSIONAL (MAT4 E VEC3 DE ALTA PERFORMANCE)
     =========================================================================== */
  const Mat4 = {
    create: () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
    identity: (out) => {
      out[0] = 1; out[1] = 0; out[2] = 0; out[3] = 0;
      out[4] = 0; out[5] = 1; out[6] = 0; out[7] = 0;
      out[8] = 0; out[9] = 0; out[10] = 1; out[11] = 0;
      out[12] = 0; out[13] = 0; out[14] = 0; out[15] = 1;
      return out;
    },
    perspective: (out, fovy, aspect, near, far) => {
      const f = 1.0 / Math.tan(fovy / 2);
      const nf = 1 / (near - far);
      out[0] = f / aspect; out[1] = 0; out[2] = 0; out[3] = 0;
      out[4] = 0; out[5] = f; out[6] = 0; out[7] = 0;
      out[8] = 0; out[9] = 0; out[10] = (far + near) * nf; out[11] = -1;
      out[12] = 0; out[13] = 0; out[14] = (2 * far * near) * nf; out[15] = 0;
      return out;
    },
    lookAt: (out, eye, center, up) => {
      let x0, x1, x2, y0, y1, y2, z0, z1, z2, len;
      let eyex = eye[0], eyey = eye[1], eyez = eye[2];
      let upx = up[0], upy = up[1], upz = up[2];
      let centerx = center[0], centery = center[1], centerz = center[2];

      z0 = eyex - centerx; z1 = eyey - centery; z2 = eyez - centerz;
      len = 1 / Math.hypot(z0, z1, z2);
      z0 *= len; z1 *= len; z2 *= len;

      x0 = upy * z2 - upz * z1; x1 = upz * z0 - upx * z2; x2 = upx * z1 - upy * z0;
      len = Math.hypot(x0, x1, x2);
      if (!len) { x0 = 0; x1 = 0; x2 = 0; } else { len = 1 / len; x0 *= len; x1 *= len; x2 *= len; }

      y0 = z1 * x2 - z2 * x1; y1 = z2 * x0 - z0 * x2; y2 = z0 * x1 - z1 * x0;
      len = Math.hypot(y0, y1, y2);
      if (!len) { y0 = 0; y1 = 0; y2 = 0; } else { len = 1 / len; y0 *= len; y1 *= len; y2 *= len; }

      out[0] = x0; out[1] = y0; out[2] = z0; out[3] = 0;
      out[4] = x1; out[5] = y1; out[6] = z1; out[7] = 0;
      out[8] = x2; out[9] = y2; out[10] = z2; out[11] = 0;
      out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
      out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
      out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
      out[15] = 1;
      return out;
    },
    multiply: (out, a, b) => {
      let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
      let a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
      let a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
      let a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

      let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
      out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

      b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
      out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

      b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
      out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

      b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
      out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
      return out;
    },
    translate: (out, a, v) => {
      let x = v[0], y = v[1], z = v[2];
      out[0] = a[0]; out[1] = a[1]; out[2] = a[2]; out[3] = a[3];
      out[4] = a[4]; out[5] = a[5]; out[6] = a[6]; out[7] = a[7];
      out[8] = a[8]; out[9] = a[9]; out[10] = a[10]; out[11] = a[11];
      out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
      out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
      out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
      out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
      return out;
    },
    rotateX: (out, a, rad) => {
      let s = Math.sin(rad), c = Math.cos(rad);
      let a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
      let a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
      if (a !== out) {
        out[0] = a[0]; out[1] = a[1]; out[2] = a[2]; out[3] = a[3];
        out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
      }
      out[4] = a10 * c + a20 * s;
      out[5] = a11 * c + a21 * s;
      out[6] = a12 * c + a22 * s;
      out[7] = a13 * c + a23 * s;
      out[8] = a20 * c - a10 * s;
      out[9] = a21 * c - a11 * s;
      out[10] = a22 * c - a12 * s;
      out[11] = a23 * c - a13 * s;
      return out;
    },
    rotateY: (out, a, rad) => {
      let s = Math.sin(rad), c = Math.cos(rad);
      let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
      let a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
      if (a !== out) {
        out[4] = a[4]; out[5] = a[5]; out[6] = a[6]; out[7] = a[7];
        out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
      }
      out[0] = a00 * c - a20 * s;
      out[1] = a01 * c - a21 * s;
      out[2] = a02 * c - a22 * s;
      out[3] = a03 * c - a23 * s;
      out[8] = a00 * s + a20 * c;
      out[9] = a01 * s + a21 * c;
      out[10] = a02 * s + a22 * c;
      out[11] = a03 * s + a23 * c;
      return out;
    },
    rotateZ: (out, a, rad) => {
      let s = Math.sin(rad), c = Math.cos(rad);
      let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
      let a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
      if (a !== out) {
        out[8] = a[8]; out[9] = a[9]; out[10] = a[10]; out[11] = a[11];
        out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
      }
      out[0] = a00 * c + a10 * s;
      out[1] = a01 * c + a11 * s;
      out[2] = a02 * c + a12 * s;
      out[3] = a03 * c + a13 * s;
      out[4] = a10 * c - a00 * s;
      out[5] = a11 * c - a01 * s;
      out[6] = a12 * c - a02 * s;
      out[7] = a13 * c - a03 * s;
      return out;
    },
    scale: (out, a, v) => {
      let x = v[0], y = v[1], z = v[2];
      out[0] = a[0] * x; out[1] = a[1] * x; out[2] = a[2] * x; out[3] = a[3] * x;
      out[4] = a[4] * y; out[5] = a[5] * y; out[6] = a[6] * y; out[7] = a[7] * y;
      out[8] = a[8] * z; out[9] = a[9] * z; out[10] = a[10] * z; out[11] = a[11] * z;
      out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
      return out;
    },
    copy: (out, a) => { out.set(a); return out; }
  };

  const Vec3 = {
    create: (x = 0, y = 0, z = 0) => new Float32Array([x, y, z]),
    set: (out, x, y, z) => { out[0] = x; out[1] = y; out[2] = z; return out; },
    add: (out, a, b) => { out[0] = a[0] + b[0]; out[1] = a[1] + b[1]; out[2] = a[2] + b[2]; return out; },
    sub: (out, a, b) => { out[0] = a[0] - b[0]; out[1] = a[1] - b[1]; out[2] = a[2] - b[2]; return out; },
    scale: (out, a, s) => { out[0] = a[0] * s; out[1] = a[1] * s; out[2] = a[2] * s; return out; },
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (out, a, b) => {
      let ax = a[0], ay = a[1], az = a[2], bx = b[0], by = b[1], bz = b[2];
      out[0] = ay * bz - az * by; out[1] = az * bx - ax * bz; out[2] = ax * by - ay * bx;
      return out;
    },
    normalize: (out, a) => {
      let len = Math.hypot(a[0], a[1], a[2]);
      if (len > 0) len = 1 / len;
      out[0] = a[0] * len; out[1] = a[1] * len; out[2] = a[2] * len;
      return out;
    },
    length: (a) => Math.hypot(a[0], a[1], a[2]),
    dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
  };

  /* ===========================================================================
     2. CONFIGURACOES DE DIFICULDADE E ARMAS
     =========================================================================== */
  const DIFFICULTY_PRESETS = {
    easy: { label: 'FACIL', enemyHpMult: 0.65, enemyDamageMult: 0.55, enemySpeedMult: 0.75, enemyAccuracy: 0.35, enemyDetectRange: 18.0, enemyCountMult: 0.7, enemyAttackCooldown: 1.8, enemyReactionTime: 1.2 },
    normal: { label: 'NORMAL', enemyHpMult: 1.0, enemyDamageMult: 1.0, enemySpeedMult: 1.0, enemyAccuracy: 0.6, enemyDetectRange: 28.0, enemyCountMult: 1.0, enemyAttackCooldown: 1.1, enemyReactionTime: 0.5 },
    hard: { label: 'DIFICIL', enemyHpMult: 1.5, enemyDamageMult: 1.45, enemySpeedMult: 1.2, enemyAccuracy: 0.78, enemyDetectRange: 36.0, enemyCountMult: 1.35, enemyAttackCooldown: 0.85, enemyReactionTime: 0.25 },
    veryhard: { label: 'MUITO DIFICIL', enemyHpMult: 2.1, enemyDamageMult: 1.9, enemySpeedMult: 1.4, enemyAccuracy: 0.92, enemyDetectRange: 44.0, enemyCountMult: 1.7, enemyAttackCooldown: 0.6, enemyReactionTime: 0.1 }
  };

  const WEAPON_DEFS = {
    knife: {
      id: 'knife', name: 'FACA TATICA', shortName: 'FACA',
      damage: 75, magSize: 1, reserveAmmo: 1,
      fireRate: 380, reloadTime: 100,
      recoilImpulse: 0, recoilKick: 0,
      spread: 0, range: 3.2, isMelee: true,
      noiseLevel: 0.05, silenced: true, isAuto: false,
      spinDuration: 800 // Duração da animação 3D de giro (Tecla V)
    },
    glock: {
      id: 'glock', name: 'GLOCK 17', shortName: 'GLK',
      damage: 28, magSize: 17, reserveAmmo: 68,
      fireRate: 210, reloadTime: 1350,
      recoilImpulse: 14, recoilKick: 0.045,
      spread: 0.024, range: 45,
      noiseLevel: 0.75, silenced: false, isAuto: false,
      flashDuration: 45, flashIntensity: 1.0, flashScale: 0.8
    },
    deagle: {
      id: 'deagle', name: 'DESERT EAGLE', shortName: 'DEG',
      damage: 82, magSize: 7, reserveAmmo: 28,
      fireRate: 580, reloadTime: 1950,
      recoilImpulse: 38, recoilKick: 0.12,
      spread: 0.015, range: 60,
      noiseLevel: 1.0, silenced: false, isAuto: false,
      flashDuration: 75, flashIntensity: 1.5, flashScale: 1.3
    },
    silenced: {
      id: 'silenced', name: 'PISTOLA SILENCIADA', shortName: 'SIL',
      damage: 24, magSize: 15, reserveAmmo: 60,
      fireRate: 260, reloadTime: 1450,
      recoilImpulse: 8, recoilKick: 0.022,
      spread: 0.018, range: 40,
      noiseLevel: 0.16, silenced: true, isAuto: false,
      flashDuration: 30, flashIntensity: 0.25, flashScale: 0.4
    },
    m4: {
      id: 'm4', name: 'M4A1', shortName: 'M4',
      damage: 34, magSize: 30, reserveAmmo: 120,
      fireRate: 100, reloadTime: 1750,
      recoilImpulse: 19, recoilKick: 0.055,
      spread: 0.038, range: 70,
      noiseLevel: 0.92, silenced: false, isAuto: true,
      flashDuration: 42, flashIntensity: 1.1, flashScale: 1.0
    }
  };

  /* ===========================================================================
     3. SISTEMA DE AUDIO (WEB AUDIO API NATIVO)
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
      } catch (e) { console.warn('Web Audio:', e); }
    }
    resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
    setMasterVol(v) { this.masterVol = v; if (this.masterGain && this.ctx) this.masterGain.gain.setValueAtTime(v, this.ctx.currentTime); }
    setFxVol(v) { this.fxVol = v; if (this.fxGain && this.ctx) this.fxGain.gain.setValueAtTime(v, this.ctx.currentTime); }

    _noise(dur, freq1, freq2, vol, when) {
      if (!this.initialized) return; this.resume();
      const now = this.ctx.currentTime + (when || 0);
      const sz = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, sz, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < sz; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * dur * 0.35));
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass';
      bp.frequency.setValueAtTime(freq1, now);
      if (freq2) bp.frequency.exponentialRampToValueAtTime(freq2, now + dur);
      bp.Q.value = 1.8;
      const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      src.connect(bp); bp.connect(g); g.connect(this.fxGain); src.start(now);
    }
    _tone(type, freq1, freq2, vol, dur, when) {
      if (!this.initialized) return; this.resume();
      const now = this.ctx.currentTime + (when || 0);
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq1, now);
      if (freq2) o.frequency.exponentialRampToValueAtTime(freq2, now + dur);
      g.gain.setValueAtTime(vol, now); g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      o.connect(g); g.connect(this.fxGain); o.start(now); o.stop(now + dur + 0.01);
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
    playKnifeSlash() {
      this._noise(0.12, 1400, 280, 0.5);
      this._tone('sine', 480, 160, 0.25, 0.09);
    }
    playKnifeSpin() {
      this._noise(0.18, 950, 420, 0.18);
      this._tone('sine', 620, 320, 0.12, 0.12);
    }
    playKnifeHit() {
      this._noise(0.08, 600, 120, 0.7);
      this._tone('triangle', 220, 60, 0.6, 0.08);
    }
    playEmpty() { this._tone('square', 900, 200, 0.25, 0.03); }
    playReload() { this._tone('triangle', 350, 120, 0.35, 0.09); this._tone('square', 450, 750, 0.35, 0.18, 0.6); }
    playHit() { this._tone('sine', 1700, 2300, 0.25, 0.06); }
    playHumanHurt() { this._tone('sawtooth', 210 + Math.random() * 40, 110, 0.4, 0.12); }
    playPlayerHurt() { this._tone('triangle', 130, 45, 0.8, 0.18); }
    playEnemyEliminated() { this._tone('sawtooth', 160, 50, 0.5, 0.22); }
    playInteract() { this._tone('sine', 600, 900, 0.2, 0.1); }
    playObjective() { [260, 390, 520].forEach((f, i) => this._tone('sine', f, f, 0.2, 0.18, i * 0.08)); }
    playGameOver() { [220, 185, 155, 120].forEach((f, i) => this._tone('sawtooth', f, f - 20, 0.35, 0.35, i * 0.16)); }
    playVictory() { [261, 329, 392, 523].forEach((f, i) => this._tone('triangle', f, f, 0.3, 0.6, i * 0.12)); }
    playFootstep() { this._noise(0.06, 120, 70, 0.07); }
    playEnemyShoot(weaponId) { this.playShoot(weaponId || 'glock'); }
    playExplosion() {
      this._noise(0.65, 260, 35, 1.4);
      this._tone('sawtooth', 110, 20, 1.1, 0.45);
      this._tone('triangle', 75, 15, 1.3, 0.65);
    }
    playJump() { this._noise(0.07, 240, 110, 0.12); }
    playLand() { this._noise(0.12, 130, 45, 0.22); }
  }

  /* ===========================================================================
     4. SHADERS GLSL E RENDERIZADOR WEBGL NATIVO
     =========================================================================== */
  const VS_SOURCE = `
    attribute vec3 a_position;
    attribute vec3 a_normal;
    attribute vec2 a_uv;
    attribute vec4 a_color;

    uniform mat4 u_world;
    uniform mat4 u_view;
    uniform mat4 u_proj;

    varying vec3 v_worldPos;
    varying vec3 v_normal;
    varying vec2 v_uv;
    varying vec4 v_color;

    void main() {
      vec4 wp = u_world * vec4(a_position, 1.0);
      v_worldPos = wp.xyz;
      v_normal = normalize(mat3(u_world) * a_normal);
      v_uv = a_uv;
      v_color = a_color;
      gl_Position = u_proj * u_view * wp;
    }
  `;

  const FS_SOURCE = `
    precision mediump float;

    varying vec3 v_worldPos;
    varying vec3 v_normal;
    varying vec2 v_uv;
    varying vec4 v_color;

    uniform vec3 u_cameraPos;
    uniform vec3 u_ambient;

    // Até 8 luzes pontuais de tochas da mina
    uniform vec3 u_lightPos[8];
    uniform vec3 u_lightColor[8];
    uniform float u_lightRadius[8];
    uniform int u_numLights;

    // Clarão de tiro dinâmico iluminando a caverna
    uniform vec3 u_muzzlePos;
    uniform vec3 u_muzzleColor;
    uniform float u_muzzleIntensity;

    // Névoa de profundidade volumétrica
    uniform vec3 u_fogColor;
    uniform float u_fogNear;
    uniform float u_fogFar;

    // Propriedades do Material
    uniform vec4 u_baseColor;
    uniform float u_roughness;
    uniform float u_specular;
    uniform float u_useTexture;
    uniform sampler2D u_sampler;

    void main() {
      vec4 texColor = vec4(1.0);
      if (u_useTexture > 0.5) {
        texColor = texture2D(u_sampler, v_uv);
      }
      vec4 albedo = texColor * v_color * u_baseColor;

      vec3 N = normalize(v_normal);
      vec3 V = normalize(u_cameraPos - v_worldPos);

      // Luz Ambiente
      vec3 totalLight = u_ambient;

      // Luzes das Tochas
      for (int i = 0; i < 8; i++) {
        if (i >= u_numLights) break;
        vec3 toLight = u_lightPos[i] - v_worldPos;
        float d = length(toLight);
        if (d < u_lightRadius[i]) {
          vec3 L = normalize(toLight);
          float atten = 1.0 / (1.0 + 0.12 * d + 0.05 * d * d);
          float diff = max(dot(N, L), 0.0);

          // Especular Blinn-Phong
          vec3 H = normalize(L + V);
          float spec = pow(max(dot(N, H), 0.0), 16.0) * u_specular;

          totalLight += (u_lightColor[i] * diff + vec3(spec)) * atten;
        }
      }

      // Luz Dinâmica do Muzzle Flash das Armas
      if (u_muzzleIntensity > 0.01) {
        vec3 toMuzzle = u_muzzlePos - v_worldPos;
        float dM = length(toMuzzle);
        if (dM < 16.0) {
          vec3 Lm = normalize(toMuzzle);
          float attenM = u_muzzleIntensity / (1.0 + 0.15 * dM + 0.1 * dM * dM);
          float diffM = max(dot(N, Lm), 0.0);
          totalLight += u_muzzleColor * diffM * attenM;
        }
      }

      vec3 litColor = albedo.rgb * totalLight;

      // Névoa Subterrânea da Caverna (Depth Fog)
      float distToCam = length(u_cameraPos - v_worldPos);
      float fogFactor = clamp((distToCam - u_fogNear) / (u_fogFar - u_fogNear), 0.0, 0.95);
      vec3 finalColor = mix(litColor, u_fogColor, fogFactor);

      gl_FragColor = vec4(finalColor, albedo.a);
    }
  `;

  class WebGLRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!this.gl) throw new Error('WebGL 2.0 / WebGL não suportado neste navegador!');

      const gl = this.gl;
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);

      this.program = this._createProgram(VS_SOURCE, FS_SOURCE);
      this.attribs = {
        position: gl.getAttribLocation(this.program, 'a_position'),
        normal: gl.getAttribLocation(this.program, 'a_normal'),
        uv: gl.getAttribLocation(this.program, 'a_uv'),
        color: gl.getAttribLocation(this.program, 'a_color')
      };
      this.uniforms = {
        world: gl.getUniformLocation(this.program, 'u_world'),
        view: gl.getUniformLocation(this.program, 'u_view'),
        proj: gl.getUniformLocation(this.program, 'u_proj'),
        cameraPos: gl.getUniformLocation(this.program, 'u_cameraPos'),
        ambient: gl.getUniformLocation(this.program, 'u_ambient'),
        numLights: gl.getUniformLocation(this.program, 'u_numLights'),
        muzzlePos: gl.getUniformLocation(this.program, 'u_muzzlePos'),
        muzzleColor: gl.getUniformLocation(this.program, 'u_muzzleColor'),
        muzzleIntensity: gl.getUniformLocation(this.program, 'u_muzzleIntensity'),
        fogColor: gl.getUniformLocation(this.program, 'u_fogColor'),
        fogNear: gl.getUniformLocation(this.program, 'u_fogNear'),
        fogFar: gl.getUniformLocation(this.program, 'u_fogFar'),
        baseColor: gl.getUniformLocation(this.program, 'u_baseColor'),
        roughness: gl.getUniformLocation(this.program, 'u_roughness'),
        specular: gl.getUniformLocation(this.program, 'u_specular'),
        useTexture: gl.getUniformLocation(this.program, 'u_useTexture'),
        sampler: gl.getUniformLocation(this.program, 'u_sampler')
      };

      // Array uniforms de luzes
      this.lightPosLocs = [];
      this.lightColLocs = [];
      this.lightRadLocs = [];
      for (let i = 0; i < 8; i++) {
        this.lightPosLocs.push(gl.getUniformLocation(this.program, `u_lightPos[${i}]`));
        this.lightColLocs.push(gl.getUniformLocation(this.program, `u_lightColor[${i}]`));
        this.lightRadLocs.push(gl.getUniformLocation(this.program, `u_lightRadius[${i}]`));
      }

      this.textures = {};
      this._initTextures();
    }

    _createProgram(vsSrc, fsSrc) {
      const gl = this.gl;
      const vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vs, vsSrc); gl.compileShader(vs);
      if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) throw new Error('VS Error: ' + gl.getShaderInfoLog(vs));

      const fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fs, fsSrc); gl.compileShader(fs);
      if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) throw new Error('FS Error: ' + gl.getShaderInfoLog(fs));

      const p = gl.createProgram();
      gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Link Error: ' + gl.getProgramInfoLog(p));
      return p;
    }

    _initTextures() {
      const gl = this.gl;
      // 1. Textura de Rocha Permanente (Carrega assets/textures/rock.jpg com fallback imediato)
      this.textures.rock = this._createRockTexture('assets/textures/rock.jpg');
      // 2. Textura de Madeira para vigas e dormentes
      this.textures.wood = this._createProceduralTexture((ctx, s) => {
        ctx.fillStyle = '#422818'; ctx.fillRect(0, 0, s, s);
        ctx.fillStyle = '#2f1b0e';
        for (let y = 0; y < s; y += 6) ctx.fillRect(0, y, s, 3);
        ctx.fillStyle = '#1c0f07';
        for (let i = 0; i < 10; i++) ctx.fillRect(Math.random() * s, Math.random() * s, 8, 16);
      });
      // 3. Textura de Metal/Trilhos enferrujados
      this.textures.metal = this._createProceduralTexture((ctx, s) => {
        ctx.fillStyle = '#3a424e'; ctx.fillRect(0, 0, s, s);
        ctx.fillStyle = '#854d24';
        for (let i = 0; i < 30; i++) ctx.fillRect(Math.random() * s, Math.random() * s, 10, 10);
      });
      // 4. Textura de TNT
      this.textures.tnt = this._createProceduralTexture((ctx, s) => {
        ctx.fillStyle = '#dc2626'; ctx.fillRect(0, 0, s, s);
        ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, s * 0.35, s, s * 0.3);
        ctx.fillStyle = '#b91c1c'; ctx.font = 'bold 36px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('TNT', s * 0.5, s * 0.58);
      });
    }

    _createProceduralTexture(drawFn, size = 128) {
      const gl = this.gl;
      const c = document.createElement('canvas'); c.width = size; c.height = size;
      const x = c.getContext('2d'); drawFn(x, size);
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
      return tex;
    }

    _createRockTexture(url) {
      const gl = this.gl;
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);

      // Fallback procedural de alta resolução imediato (garante exibição sem esperar rede ou CORS)
      const c = document.createElement('canvas'); c.width = 256; c.height = 256;
      const ctx2 = c.getContext('2d');
      ctx2.fillStyle = '#221a14'; ctx2.fillRect(0, 0, 256, 256);
      for (let y = 0; y < 256; y += 8) {
        for (let x = 0; x < 256; x += 8) {
          const v = Math.floor(25 + Math.sin(x * 0.08 + y * 0.05) * 14 + Math.random() * 8);
          ctx2.fillStyle = `rgb(${v + 8},${v + 2},${v - 4})`;
          ctx2.fillRect(x, y, 8, 8);
        }
      }
      ctx2.strokeStyle = '#0e0a07'; ctx2.lineWidth = 2.5;
      ctx2.beginPath();
      ctx2.moveTo(20, 0); ctx2.lineTo(60, 80); ctx2.lineTo(40, 180); ctx2.lineTo(120, 256);
      ctx2.moveTo(180, 0); ctx2.lineTo(210, 120); ctx2.lineTo(240, 256);
      ctx2.stroke();

      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);

      // Carrega a imagem real fornecida pelo usuário
      const img = new Image();
      img.onload = () => {
        try {
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
          gl.generateMipmap(gl.TEXTURE_2D);
        } catch (e) { console.warn('CORS fallback ativo para rock.jpg:', e); }
      };
      img.src = url;
      return tex;
    }
  }

  /* ===========================================================================
     5. ESTRUTURA DE MALHAS (MESH 3D) E GERADORES GEOMETRICOS
     =========================================================================== */
  class Mesh3D {
    constructor(gl, pos, norm, uv, col, idx) {
      this.gl = gl;
      this.count = idx.length;
      this.posBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);

      this.normBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(norm), gl.STATIC_DRAW);

      this.uvBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.STATIC_DRAW);

      this.colBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.colBuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(col), gl.STATIC_DRAW);

      this.idxBuf = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.idxBuf);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
    }

    bind(attribs) {
      const gl = this.gl;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
      gl.vertexAttribPointer(attribs.position, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(attribs.position);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuf);
      gl.vertexAttribPointer(attribs.normal, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(attribs.normal);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuf);
      gl.vertexAttribPointer(attribs.uv, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(attribs.uv);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.colBuf);
      gl.vertexAttribPointer(attribs.color, 4, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(attribs.color);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.idxBuf);
    }

    draw() {
      this.gl.drawElements(this.gl.TRIANGLES, this.count, this.gl.UNSIGNED_SHORT, 0);
    }
  }

  // Construtor auxiliar de caixas 3D com texturas
  function createBoxData(w, h, d, uvX = 1, uvY = 1, color = [1, 1, 1, 1]) {
    const hw = w / 2, hh = h / 2, hd = d / 2;
    const r = color[0], g = color[1], b = color[2], a = color[3] !== undefined ? color[3] : 1;

    const positions = [
      // Frente
      -hw, -hh, hd, hw, -hh, hd, hw, hh, hd, -hw, hh, hd,
      // Trás
      hw, -hh, -hd, -hw, -hh, -hd, -hw, hh, -hd, hw, hh, -hd,
      // Topo
      -hw, hh, hd, hw, hh, hd, hw, hh, -hd, -hw, hh, -hd,
      // Base
      -hw, -hh, -hd, hw, -hh, -hd, hw, -hh, hd, -hw, -hh, hd,
      // Direita
      hw, -hh, hd, hw, -hh, -hd, hw, hh, -hd, hw, hh, hd,
      // Esquerda
      -hw, -hh, -hd, -hw, -hh, hd, -hw, hh, hd, -hw, hh, -hd
    ];

    const normals = [
      0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
      0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
      0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
      0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
      1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
      -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0
    ];

    const uvs = [];
    for (let f = 0; f < 6; f++) {
      uvs.push(0, uvY, uvX, uvY, uvX, 0, 0, 0);
    }

    const colors = [];
    for (let i = 0; i < 24; i++) colors.push(r, g, b, a);

    const indices = [];
    for (let f = 0; f < 6; f++) {
      const o = f * 4;
      indices.push(o, o + 1, o + 2, o, o + 2, o + 3);
    }

    return { positions, normals, uvs, colors, indices };
  }

  // Construtor auxiliar de cilindros 3D
  function createCylinderData(rt, rb, h, segs = 12, color = [1, 1, 1, 1]) {
    const positions = [], normals = [], uvs = [], colors = [], indices = [];
    const r = color[0], g = color[1], b = color[2], a = color[3] !== undefined ? color[3] : 1;
    const hh = h / 2;

    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const rad = u * Math.PI * 2;
      const cos = Math.cos(rad), sin = Math.sin(rad);

      // Topo
      positions.push(cos * rt, hh, sin * rt);
      normals.push(cos, 0, sin);
      uvs.push(u, 0);
      colors.push(r, g, b, a);

      // Base
      positions.push(cos * rb, -hh, sin * rb);
      normals.push(cos, 0, sin);
      uvs.push(u, 1);
      colors.push(r, g, b, a);
    }

    for (let i = 0; i < segs; i++) {
      const o = i * 2;
      indices.push(o, o + 1, o + 3, o, o + 3, o + 2);
    }
    return { positions, normals, uvs, colors, indices };
  }

  // Fusão de geometrias em uma única malha otimizada
  function mergeGeometries(parts, gl) {
    let pos = [], norm = [], uv = [], col = [], idx = [], vOffset = 0;
    parts.forEach(p => {
      p.data.indices.forEach(i => idx.push(i + vOffset));
      vOffset += p.data.positions.length / 3;

      // Aplica transformações locais se houver
      const m = p.transform || Mat4.identity(Mat4.create());
      for (let i = 0; i < p.data.positions.length; i += 3) {
        let x = p.data.positions[i], y = p.data.positions[i + 1], z = p.data.positions[i + 2];
        let tx = m[0] * x + m[4] * y + m[8] * z + m[12];
        let ty = m[1] * x + m[5] * y + m[9] * z + m[13];
        let tz = m[2] * x + m[6] * y + m[10] * z + m[14];
        pos.push(tx, ty, tz);

        let nx = p.data.normals[i], ny = p.data.normals[i + 1], nz = p.data.normals[i + 2];
        let tnx = m[0] * nx + m[4] * ny + m[8] * nz;
        let tny = m[1] * nx + m[5] * ny + m[9] * nz;
        let tnz = m[2] * nx + m[6] * ny + m[10] * nz;
        let l = Math.hypot(tnx, tny, tnz) || 1;
        norm.push(tnx / l, tny / l, tnz / l);
      }
      uv.push(...p.data.uvs);
      col.push(...p.data.colors);
    });
    return new Mesh3D(gl, pos, norm, uv, col, idx);
  }

  /* ===========================================================================
     6. MODELAGEM DA FACA TATICA 3D (BASEADA NA IMAGEM DE REFERENCIA)
     =========================================================================== */
  function createTacticalKnifeMesh(gl) {
    const parts = [];

    // 1. Lâmina Tanto/Serrilhada de metal acetinado
    const bladeM = Mat4.identity(Mat4.create());
    Mat4.translate(bladeM, bladeM, [0.0, 0.16, 0.0]);
    parts.push({
      data: createBoxData(0.016, 0.32, 0.065, 1, 1, [0.72, 0.78, 0.85, 1.0]),
      transform: bladeM
    });

    // Fio da lâmina com corte chanfrado
    const edgeM = Mat4.identity(Mat4.create());
    Mat4.translate(edgeM, edgeM, [0.0, 0.16, -0.034]);
    parts.push({
      data: createBoxData(0.006, 0.30, 0.018, 1, 1, [0.92, 0.95, 1.0, 1.0]),
      transform: edgeM
    });

    // Serrilha do dorso da lâmina
    for (let s = 0; s < 6; s++) {
      const serM = Mat4.identity(Mat4.create());
      Mat4.translate(serM, serM, [0.0, 0.06 + s * 0.035, 0.035]);
      parts.push({
        data: createBoxData(0.018, 0.018, 0.015, 1, 1, [0.45, 0.50, 0.56, 1.0]),
        transform: serM
      });
    }

    // 2. Guarda / Quillon metálico com orifício
    const guardM = Mat4.identity(Mat4.create());
    Mat4.translate(guardM, guardM, [0.0, 0.0, 0.0]);
    parts.push({
      data: createBoxData(0.024, 0.028, 0.10, 1, 1, [0.35, 0.38, 0.44, 1.0]),
      transform: guardM
    });

    // 3. Cabo tático ergonômico com recortes triangulares (Skeletonized Grip)
    const handleM = Mat4.identity(Mat4.create());
    Mat4.translate(handleM, handleM, [0.0, -0.16, 0.0]);
    parts.push({
      data: createBoxData(0.028, 0.28, 0.058, 1, 1, [0.12, 0.14, 0.18, 1.0]),
      transform: handleM
    });

    // Detalhes geométricos nos recortes da empunhadura
    for (let h = 0; h < 3; h++) {
      const cutM = Mat4.identity(Mat4.create());
      Mat4.translate(cutM, cutM, [0.0, -0.09 - h * 0.065, 0.0]);
      parts.push({
        data: createBoxData(0.032, 0.032, 0.025, 1, 1, [0.25, 0.28, 0.34, 1.0]),
        transform: cutM
      });
    }

    // 4. Orifício no pomo e cordão tático (Paracord Lanyard)
    const pommelM = Mat4.identity(Mat4.create());
    Mat4.translate(pommelM, pommelM, [0.0, -0.31, 0.0]);
    parts.push({
      data: createBoxData(0.022, 0.035, 0.045, 1, 1, [0.28, 0.32, 0.38, 1.0]),
      transform: pommelM
    });

    const cordM = Mat4.identity(Mat4.create());
    Mat4.translate(cordM, cordM, [0.0, -0.37, 0.015]);
    parts.push({
      data: createCylinderData(0.006, 0.006, 0.10, 8, [0.15, 0.20, 0.18, 1.0]),
      transform: cordM
    });

    return mergeGeometries(parts, gl);
  }

  /* ===========================================================================
     7. MODELAGEM DO CARRINHO DE MINA 3D (ESTILO MINECRAFT)
     =========================================================================== */
  function createMinecraftMinecartMesh(gl) {
    const parts = [];

    // Chassi inferior de ferro
    const bedM = Mat4.identity(Mat4.create());
    Mat4.translate(bedM, bedM, [0.0, 0.18, 0.0]);
    parts.push({
      data: createBoxData(1.2, 0.15, 1.7, 1, 1, [0.35, 0.38, 0.42, 1.0]),
      transform: bedM
    });

    // 4 Paredes chanfradas formando a caçamba oca com volume real
    const wallLeft = Mat4.identity(Mat4.create());
    Mat4.translate(wallLeft, wallLeft, [-0.55, 0.55, 0.0]);
    parts.push({
      data: createBoxData(0.14, 0.65, 1.7, 1, 1, [0.42, 0.45, 0.50, 1.0]),
      transform: wallLeft
    });

    const wallRight = Mat4.identity(Mat4.create());
    Mat4.translate(wallRight, wallRight, [0.55, 0.55, 0.0]);
    parts.push({
      data: createBoxData(0.14, 0.65, 1.7, 1, 1, [0.42, 0.45, 0.50, 1.0]),
      transform: wallRight
    });

    const wallFront = Mat4.identity(Mat4.create());
    Mat4.translate(wallFront, wallFront, [0.0, 0.55, 0.78]);
    parts.push({
      data: createBoxData(1.0, 0.65, 0.14, 1, 1, [0.38, 0.42, 0.46, 1.0]),
      transform: wallFront
    });

    const wallBack = Mat4.identity(Mat4.create());
    Mat4.translate(wallBack, wallBack, [0.0, 0.55, -0.78]);
    parts.push({
      data: createBoxData(1.0, 0.65, 0.14, 1, 1, [0.38, 0.42, 0.46, 1.0]),
      transform: wallBack
    });

    // Minérios e pedras empilhadas no interior
    const oreM = Mat4.identity(Mat4.create());
    Mat4.translate(oreM, oreM, [0.0, 0.45, 0.0]);
    parts.push({
      data: createBoxData(0.85, 0.45, 1.35, 2, 2, [0.22, 0.20, 0.18, 1.0]),
      transform: oreM
    });

    // Pepitas de ouro brilhantes dentro do carrinho
    for (let g = 0; g < 4; g++) {
      const goldM = Mat4.identity(Mat4.create());
      Mat4.translate(goldM, goldM, [(g % 2 === 0 ? 0.2 : -0.2), 0.70, (g < 2 ? 0.3 : -0.3)]);
      parts.push({
        data: createBoxData(0.22, 0.18, 0.22, 1, 1, [0.95, 0.78, 0.15, 1.0]),
        transform: goldM
      });
    }

    // 4 Rodas cilíndricas de ferro com flanges sobre os trilhos
    const wheelPositions = [
      [-0.62, 0.16, 0.55],
      [0.62, 0.16, 0.55],
      [-0.62, 0.16, -0.55],
      [0.62, 0.16, -0.55]
    ];
    wheelPositions.forEach(pos => {
      const wM = Mat4.identity(Mat4.create());
      Mat4.translate(wM, wM, pos);
      Mat4.rotateZ(wM, wM, Math.PI / 2);
      parts.push({
        data: createCylinderData(0.20, 0.20, 0.12, 10, [0.24, 0.26, 0.30, 1.0]),
        transform: wM
      });
    });

    return mergeGeometries(parts, gl);
  }

  /* ===========================================================================
     8. MODELAGEM DOS INIMIGOS HUMANOIDES 3D (COM VOLUME REAL E ARTICULACOES)
     =========================================================================== */
  function createHumanoidModelMeshes(gl, outfit) {
    const rC = (hex) => [parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255, 1.0];
    const shirtCol = rC(outfit.shirt);
    const vestCol = rC(outfit.vest);
    const pantsCol = rC(outfit.pants);
    const skinCol = rC(outfit.skin);
    const hairCol = rC(outfit.hair);

    return {
      head: mergeGeometries([
        { data: createBoxData(0.26, 0.30, 0.26, 1, 1, skinCol) },
        { data: createBoxData(0.28, 0.12, 0.28, 1, 1, hairCol), transform: Mat4.translate(Mat4.create(), Mat4.create(), [0, 0.12, 0]) }
      ], gl),
      torso: mergeGeometries([
        { data: createBoxData(0.48, 0.65, 0.30, 1, 1, shirtCol) },
        { data: createBoxData(0.52, 0.52, 0.34, 1, 1, vestCol), transform: Mat4.translate(Mat4.create(), Mat4.create(), [0, 0.05, 0]) }
      ], gl),
      arm: mergeGeometries([
        { data: createBoxData(0.14, 0.55, 0.14, 1, 1, shirtCol) },
        { data: createBoxData(0.12, 0.14, 0.12, 1, 1, skinCol), transform: Mat4.translate(Mat4.create(), Mat4.create(), [0, -0.25, 0]) }
      ], gl),
      leg: mergeGeometries([
        { data: createBoxData(0.18, 0.68, 0.18, 1, 1, pantsCol) },
        { data: createBoxData(0.20, 0.15, 0.26, 1, 1, [0.1, 0.1, 0.1, 1]), transform: Mat4.translate(Mat4.create(), Mat4.create(), [0, -0.32, 0.04]) }
      ], gl),
      gun: mergeGeometries([
        { data: createBoxData(0.08, 0.14, 0.45, 1, 1, [0.18, 0.20, 0.25, 1]) },
        { data: createBoxData(0.06, 0.18, 0.10, 1, 1, [0.12, 0.14, 0.16, 1]), transform: Mat4.translate(Mat4.create(), Mat4.create(), [0, -0.10, -0.12]) }
      ], gl)
    };
  }

  /* ===========================================================================
     9. ARMAS DE FOGO E MAOS EM PRIMEIRA PESSOA
     =========================================================================== */
  function createFirstPersonWeaponMeshes(gl, charType) {
    const skin = charType === 'female' ? [0.91, 0.72, 0.60, 1] : [0.83, 0.63, 0.44, 1];
    const glove = [0.15, 0.18, 0.22, 1];

    // Mão e antebraço detalhado
    const handParts = [
      { data: createCylinderData(0.06, 0.075, 0.45, 10, skin), transform: Mat4.translate(Mat4.create(), Mat4.create(), [0, -0.22, 0]) },
      { data: createBoxData(0.11, 0.16, 0.14, 1, 1, glove), transform: Mat4.translate(Mat4.create(), Mat4.create(), [0, 0, 0]) },
      // Dedos
      { data: createBoxData(0.11, 0.08, 0.10, 1, 1, glove), transform: Mat4.translate(Mat4.create(), Mat4.create(), [0, 0.06, -0.06]) }
    ];
    const handMesh = mergeGeometries(handParts, gl);

    // Glock 17
    const glockParts = [
      { data: createBoxData(0.06, 0.08, 0.32, 1, 1, [0.22, 0.25, 0.28, 1]), transform: Mat4.translate(Mat4.create(), Mat4.create(), [0, 0.08, 0]) }, // Slide
      { data: createBoxData(0.05, 0.20, 0.10, 1, 1, [0.12, 0.14, 0.16, 1]), transform: Mat4.translate(Mat4.create(), Mat4.create(), [0, -0.05, -0.08]) }, // Grip
      { data: createCylinderData(0.015, 0.015, 0.08, 8, [0.08, 0.09, 0.10, 1]), transform: Mat4.translate(Mat4.create(), Mat4.create(), [0, 0.07, 0.18]) } // Cano
    ];

    // Desert Eagle
    const deagleParts = [
      { data: createBoxData(0.08, 0.11, 0.42, 1, 1, [0.42, 0.46, 0.52, 1]), transform: Mat4.translate(Mat4.create(), Mat4.create(), [0, 0.10, 0]) }, // Slide
      { data: createBoxData(0.07, 0.24, 0.13, 1, 1, [0.15, 0.16, 0.18, 1]), transform: Mat4.translate(Mat4.create(), Mat4.create(), [0, -0.06, -0.10]) }, // Grip
      { data: createBoxData(0.06, 0.06, 0.12, 1, 1, [0.25, 0.28, 0.32, 1]), transform: Mat4.translate(Mat4.create(), Mat4.create(), [0, 0.09, 0.23]) }  // Cano .50
    ];

    // Silenciada
    const silParts = [
      { data: createBoxData(0.055, 0.075, 0.28, 1, 1, [0.18, 0.20, 0.24, 1]), transform: Mat4.translate(Mat4.create(), Mat4.create(), [0, 0.08, 0]) },
      { data: createBoxData(0.05, 0.19, 0.09, 1, 1, [0.12, 0.14, 0.16, 1]), transform: Mat4.translate(Mat4.create(), Mat4.create(), [0, -0.05, -0.07]) },
      { data: createCylinderData(0.038, 0.038, 0.28, 10, [0.14, 0.16, 0.18, 1]), transform: Mat4.translate(Mat4.create(), Mat4.create(), [0, 0.07, 0.28]) } // Silenciador
    ];

    // M4A1
    const m4Parts = [
      { data: createBoxData(0.08, 0.12, 0.45, 1, 1, [0.20, 0.23, 0.26, 1]), transform: Mat4.translate(Mat4.create(), Mat4.create(), [0, 0.05, 0]) }, // Receptor
      { data: createCylinderData(0.045, 0.045, 0.48, 10, [0.15, 0.18, 0.20, 1]), transform: Mat4.translate(Mat4.create(), Mat4.create(), [0, 0.06, 0.40]) }, // Guarda-mão
      { data: createCylinderData(0.02, 0.02, 0.28, 8, [0.08, 0.09, 0.10, 1]), transform: Mat4.translate(Mat4.create(), Mat4.create(), [0, 0.06, 0.70]) }, // Cano
      { data: createBoxData(0.05, 0.26, 0.12, 1, 1, [0.12, 0.14, 0.16, 1]), transform: Mat4.translate(Mat4.create(), Mat4.create(), [0, -0.15, 0.12]) }, // Pente
      { data: createBoxData(0.06, 0.14, 0.32, 1, 1, [0.16, 0.18, 0.22, 1]), transform: Mat4.translate(Mat4.create(), Mat4.create(), [0, 0.02, -0.34]) } // Coronha
    ];

    return {
      hand: handMesh,
      knife: createTacticalKnifeMesh(gl),
      glock: mergeGeometries(glockParts, gl),
      deagle: mergeGeometries(deagleParts, gl),
      silenced: mergeGeometries(silParts, gl),
      m4: mergeGeometries(m4Parts, gl)
    };
  }

  /* ===========================================================================
     10. GEOMETRIA COMPLETA DA CAVERNA 3D (CHAO, TETO, PAREDES E ESTRUTURAS)
     =========================================================================== */
  const CELL_SIZE = 3.0; // Metros reais por ladrilho da caverna
  const WALL_HEIGHT = 3.6; // Altura tridimensional da caverna

  function buildCavern3DScene(gl, map, mapW, mapH) {
    const wallParts = [];
    const floorParts = [];
    const ceilingParts = [];
    const railParts = [];
    const woodBeamParts = [];

    for (let y = 0; y < mapH; y++) {
      for (let x = 0; x < mapW; x++) {
        const t = map[y][x];
        const wx = (x - mapW / 2) * CELL_SIZE;
        const wz = (y - mapH / 2) * CELL_SIZE;

        if (t > 0) {
          // Parede de Rocha 3D irregular
          const m = Mat4.identity(Mat4.create());
          Mat4.translate(m, m, [wx, WALL_HEIGHT / 2, wz]);
          wallParts.push({
            data: createBoxData(CELL_SIZE, WALL_HEIGHT, CELL_SIZE, 2, 2, [0.85, 0.82, 0.80, 1]),
            transform: m
          });

          // Vigas de escoramento onde o mapa indica tipo 2
          if (t === 2) {
            const bM = Mat4.identity(Mat4.create());
            Mat4.translate(bM, bM, [wx, WALL_HEIGHT / 2, wz]);
            woodBeamParts.push({
              data: createBoxData(CELL_SIZE * 0.95, WALL_HEIGHT * 0.98, 0.28, 1, 2, [0.65, 0.48, 0.35, 1]),
              transform: bM
            });
          }
        } else {
          // Chão 3D transitável
          const fM = Mat4.identity(Mat4.create());
          Mat4.translate(fM, fM, [wx, 0.0, wz]);
          floorParts.push({
            data: createBoxData(CELL_SIZE, 0.2, CELL_SIZE, 2, 2, [0.75, 0.72, 0.70, 1]),
            transform: fM
          });

          // Teto 3D rochoso irregular
          const cM = Mat4.identity(Mat4.create());
          Mat4.translate(cM, cM, [wx, WALL_HEIGHT, wz]);
          ceilingParts.push({
            data: createBoxData(CELL_SIZE, 0.35, CELL_SIZE, 2, 2, [0.65, 0.62, 0.60, 1]),
            transform: cM
          });

          // Estalactites pendentes no teto
          if ((x * 17 + y * 23) % 11 === 0) {
            const stM = Mat4.identity(Mat4.create());
            Mat4.translate(stM, stM, [wx + 0.4, WALL_HEIGHT - 0.45, wz - 0.3]);
            ceilingParts.push({
              data: createCylinderData(0.22, 0.02, 0.9, 8, [0.55, 0.52, 0.50, 1]),
              transform: stM
            });
          }

          // Trilhos de ferro onde o mapa indica tipo 5
          if ((y >= 7 && y <= 9 && x >= 16 && x <= 19) || (y >= 18 && y <= 21 && x >= 15 && x <= 19)) {
            const rM = Mat4.identity(Mat4.create());
            Mat4.translate(rM, rM, [wx, 0.12, wz]);
            // 2 barras de ferro + dormente de madeira
            railParts.push({
              data: createBoxData(0.10, 0.08, CELL_SIZE, 1, 1, [0.45, 0.48, 0.55, 1]),
              transform: Mat4.translate(Mat4.create(), rM, [-0.45, 0, 0])
            });
            railParts.push({
              data: createBoxData(0.10, 0.08, CELL_SIZE, 1, 1, [0.45, 0.48, 0.55, 1]),
              transform: Mat4.translate(Mat4.create(), rM, [0.45, 0, 0])
            });
            railParts.push({
              data: createBoxData(1.2, 0.05, 0.28, 1, 1, [0.48, 0.32, 0.22, 1]),
              transform: Mat4.translate(Mat4.create(), rM, [0, -0.02, 0])
            });
          }
        }
      }
    }

    return {
      walls: mergeGeometries(wallParts, gl),
      floor: mergeGeometries(floorParts, gl),
      ceiling: mergeGeometries(ceilingParts, gl),
      rails: mergeGeometries(railParts, gl),
      woodBeams: mergeGeometries(woodBeamParts, gl),
      cart: createMinecraftMinecartMesh(gl),
      box: new Mesh3D(gl, ...Object.values(createBoxData(1, 1, 1))),
      cylinder: new Mesh3D(gl, ...Object.values(createCylinderData(0.5, 0.5, 1, 12)))
    };
  }

  /* ===========================================================================
     11. ESTADO GLOBAL DO JOGO E JOGADOR 3D
     =========================================================================== */
  const audio = new SoundEngine();

  let selectedChar = null;    // 'male' | 'female'
  let selectedDiff = null;    // 'easy'|'normal'|'hard'|'veryhard'
  let selectedWeapon = null;  // 'glock'|'deagle'|'silenced'

  let gameState = 'LOBBY';
  let prevStateBeforeSettings = 'LOBBY';

  let settings = {
    masterVol: 0.85, fxVol: 0.8, musicVol: 0.6,
    sensitivity: 5, quality: 'high',
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

  // Jogador Tridimensional
  const player = {
    x: 0, y: 1.65, z: 0,       // Posição no mundo 3D
    yaw: 0, pitch: 0,          // Orientação da Câmera
    speed: 4.8,                // Metros/segundo
    velocityY: 0,
    isGrounded: true,
    isCrouching: false,
    crouchProgress: 0.0,       // 0 (em pé) até 1 (agachado)
    isRunning: false,
    health: 100, maxHealth: 100,
    stamina: 100, maxStamina: 100,
    bobbingTime: 0,
    weapons: [],
    currentWeaponIdx: 0,
    isKnifeSpinning: false,
    knifeSpinProgress: 0.0,
    isKnifeSlashing: false,
    knifeSlashProgress: 0.0
  };

  const keys = { w: false, s: false, a: false, d: false, shift: false, ctrl: false, space: false, e: false };
  let isMouseDown = false;

  // Efeitos e Física da Arma em Primeira Pessoa
  let recoilRecoilY = 0, recoilKickPitch = 0, recoilSideX = 0;
  let weaponSwayX = 0, weaponSwayY = 0;
  let hitmarkerTimer = 0;
  let screenShakeIntensity = 0, screenShakeTimer = 0;

  // Clarão de Disparo (Muzzle Flash Point Light)
  const muzzleFlashLight = {
    pos: Vec3.create(0, 0, 0),
    color: Vec3.create(1.0, 0.85, 0.4),
    intensity: 0.0,
    endTime: 0
  };

  // Props e Entidades do Mundo 3D
  let enemies = [];
  let worldTorches = [];
  let worldProps = [];
  let chestOpened = false;
  let chestAnimProgress = 0.0;
  let exitReached = false;
  let currentObjectiveIndex = 0;

  const MAP_W = 36;
  const MAP_H = 40;
  const worldMap = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 5, 5, 5, 5, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 2, 2, 0, 0, 0, 0, 4, 4, 4, 0, 0, 0, 0, 0, 5, 5, 5, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 4, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
    [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 2, 2, 0, 0, 0, 4, 4, 3, 3, 3, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 1],
    [1, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 5, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 1],
    [1, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 5, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 5, 5, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 0, 0, 2, 2, 0, 0, 0, 0, 0, 3, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 1],
    [1, 1, 0, 0, 2, 2, 0, 0, 0, 0, 3, 3, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 0, 0, 7, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 3, 3, 3, 0, 0, 0, 0, 7, 7, 7, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 7, 0, 0, 7, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 7, 0, 0, 7, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 7, 7, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 6, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 6, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  ];

  const MISSION_OBJECTIVES = [
    { id: 'start', text: 'Explore os corredores tridimensionais da mina' },
    { id: 'corridor', text: 'Avance pelas passagens subterraneas' },
    { id: 'passage', text: 'Encontre o trilho principal da mineracao' },
    { id: 'explore', text: 'Localize a camara de minerio' },
    { id: 'chest', text: 'Abra o bau tridimensional e pegue o rifle M4' },
    { id: 'exit', text: 'Escape atraves da saida da caverna' }
  ];

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

  function triggerScreenShake(intensity, duration) {
    screenShakeIntensity = Math.max(screenShakeIntensity, intensity);
    screenShakeTimer = Math.max(screenShakeTimer, duration);
  }

  /* ===========================================================================
     12. DOM, EVENTOS E CONTROLE DE CAMERA EM PRIMEIRA PESSOA
     =========================================================================== */
  let canvas, glRenderer, cavernScene, fpWeapons, enemyMeshes;
  let minimapCanvas, minimapCtx;
  let hudEl, objectiveText, fpsDisplay, missionTimer, healthNumber, healthBarFill;
  let staminaNumber, staminaBarFill, currentWeaponName, currentAmmoEl, reserveAmmoEl;
  let bulletPipsEl, reloadIndicator, hudNotice, objectiveUpdateBanner, objectiveUpdateText;
  let interactPrompt, interactText, weaponSlotsEl, lockPrompt, hitmarkerEl, damageVignette, muzzleFlashFx;
  let lobbyScreen, charSelectScreen, difficultyScreen, weaponSelectScreen;
  let storyScreen, loadingScreen, pauseScreen, gameOverScreen, newWeaponScreen, missionCompleteScreen, settingsScreen;

  window.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    grabDOM();

    // Inicializa WebGL 2.0 Nativo
    glRenderer = new WebGLRenderer(canvas);
    cavernScene = buildCavern3DScene(glRenderer.gl, worldMap, MAP_W, MAP_H);
    fpWeapons = createFirstPersonWeaponMeshes(glRenderer.gl, 'male');
    enemyMeshes = createHumanoidModelMeshes(glRenderer.gl, {
      shirt: '#3b4a5c', pants: '#1e2630', hair: '#1a1208', skin: '#d4a574', vest: '#2a3540'
    });

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
      update3D(dt);
      render3D();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  });

  function grabDOM() {
    canvas = document.getElementById('gameCanvas');
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
    if (glRenderer && glRenderer.gl) {
      glRenderer.gl.viewport(0, 0, canvas.width, canvas.height);
    }
  }
  window.addEventListener('resize', resizeCanvas);

  function loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem('opzero_settings'));
      if (s) Object.assign(settings, s);
    } catch (e) { }
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

  function setupEventListeners() {
    // Menu Lobby
    document.getElementById('btnLobbyPlay').addEventListener('click', () => {
      audio.init(); showScreen('CHAR');
    });
    document.getElementById('btnLobbySettings').addEventListener('click', () => {
      audio.init(); prevStateBeforeSettings = 'LOBBY'; showScreen('SETTINGS');
    });
    document.getElementById('btnLobbyQuit').addEventListener('click', () => {
      const ok = confirm('Deseja fechar esta sessao?');
      if (ok) { try { window.close(); } catch (e) { } }
    });

    // Personagens
    document.querySelectorAll('.char-select-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        selectedChar = e.target.dataset.char || e.target.closest('[data-char]').dataset.char;
        document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
        document.querySelector(`.char-card[data-char="${selectedChar}"]`).classList.add('selected');
        document.getElementById('btnCharContinue').disabled = false;
        fpWeapons = createFirstPersonWeaponMeshes(glRenderer.gl, selectedChar);
      });
    });
    document.querySelectorAll('.char-card').forEach(card => {
      card.addEventListener('click', () => {
        selectedChar = card.dataset.char;
        document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        document.getElementById('btnCharContinue').disabled = false;
        fpWeapons = createFirstPersonWeaponMeshes(glRenderer.gl, selectedChar);
      });
    });
    document.getElementById('btnCharContinue').addEventListener('click', () => { if (selectedChar) showScreen('DIFF'); });
    document.getElementById('btnCharBack').addEventListener('click', () => showScreen('LOBBY'));

    // Dificuldade
    document.querySelectorAll('.diff-card').forEach(card => {
      card.addEventListener('click', () => {
        selectedDiff = card.dataset.diff;
        document.querySelectorAll('.diff-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        document.getElementById('btnDiffContinue').disabled = false;
      });
    });
    document.getElementById('btnDiffContinue').addEventListener('click', () => { if (selectedDiff) showScreen('WEAPON'); });
    document.getElementById('btnDiffBack').addEventListener('click', () => showScreen('CHAR'));

    // Arma Inicial
    document.querySelectorAll('.weapon-sel-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        selectedWeapon = btn.dataset.weapon;
        document.querySelectorAll('.weapon-sel-card').forEach(c => c.classList.remove('selected'));
        btn.closest('.weapon-sel-card').classList.add('selected');
        document.getElementById('btnWeaponContinue').disabled = false;
      });
    });
    document.querySelectorAll('.weapon-sel-card').forEach(card => {
      card.addEventListener('click', () => {
        selectedWeapon = card.dataset.weapon;
        document.querySelectorAll('.weapon-sel-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        document.getElementById('btnWeaponContinue').disabled = false;
      });
    });
    document.getElementById('btnWeaponContinue').addEventListener('click', () => { if (selectedWeapon) showScreen('STORY'); });
    document.getElementById('btnWeaponBack').addEventListener('click', () => showScreen('DIFF'));

    // História e Pausa
    document.getElementById('btnSkipStory').addEventListener('click', () => showScreen('LOADING'));
    document.getElementById('btnResume').addEventListener('click', resumeGame);
    document.getElementById('btnPauseSettings').addEventListener('click', () => {
      prevStateBeforeSettings = 'PAUSED'; showScreen('SETTINGS');
    });
    document.getElementById('btnPauseRestart').addEventListener('click', () => { hideAllScreens(); startMission(); });
    document.getElementById('btnPauseMainMenu').addEventListener('click', () => { hideAllScreens(); showScreen('LOBBY'); });
    document.getElementById('btnRetry').addEventListener('click', () => { hideAllScreens(); startMission(); });
    document.getElementById('btnFailMenu').addEventListener('click', () => { hideAllScreens(); showScreen('LOBBY'); });
    document.getElementById('btnEquipM4').addEventListener('click', () => { equipM4(); });
    document.getElementById('btnMissionContinue').addEventListener('click', () => { showScreen('LOBBY'); });
    document.getElementById('btnWinMenu').addEventListener('click', () => { showScreen('LOBBY'); });

    // Configurações
    document.getElementById('settingMasterVol').addEventListener('input', e => {
      settings.masterVol = e.target.value / 100; applySettings();
    });
    document.getElementById('settingFxVol').addEventListener('input', e => {
      settings.fxVol = e.target.value / 100; applySettings();
    });
    document.getElementById('settingSensitivity').addEventListener('input', e => {
      settings.sensitivity = parseInt(e.target.value);
    });
    document.querySelectorAll('.quality-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        settings.quality = btn.dataset.q;
        document.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
    document.getElementById('settingShowFPS').addEventListener('change', e => { settings.showFPS = e.target.checked; applySettings(); });
    document.getElementById('settingCrosshair').addEventListener('change', e => { settings.showCrosshair = e.target.checked; applySettings(); });
    document.getElementById('btnFullscreen').addEventListener('click', () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen();
      else document.exitFullscreen();
    });
    document.getElementById('btnSettingsSave').addEventListener('click', () => {
      saveSettings(); applySettings();
      showScreen(prevStateBeforeSettings);
    });

    // Pointer Lock
    lockPrompt.addEventListener('click', requestPointerLock);

    // Teclado
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Mouse Look (Câmera Primeira Pessoa 3D)
    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', e => {
      if (gameState !== 'PLAYING') return;
      if (e.button === 0) {
        if (document.pointerLockElement !== canvas) {
          requestPointerLock();
        } else {
          isMouseDown = true;
          handlePlayerAttack();
        }
      }
    });
    document.addEventListener('mouseup', e => {
      if (e.button === 0) isMouseDown = false;
    });
  }

  function onKeyDown(e) {
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'arrowup') keys.w = true;
    if (k === 's' || k === 'arrowdown') keys.s = true;
    if (k === 'a' || k === 'arrowleft') keys.a = true;
    if (k === 'd' || k === 'arrowright') keys.d = true;
    if (k === 'shift') keys.shift = true;
    if (k === 'control') keys.ctrl = true;
    if (k === ' ') {
      keys.space = true;
      e.preventDefault();
      triggerJump();
    }
    if (k === 'e') keys.e = true;
    if (k === 'r') reloadWeapon();
    if (k === '1') switchWeapon(0);
    if (k === '2') switchWeapon(1);
    if (k === '3') equipKnifeDirectly();
    if (k === 'v') triggerKnifeSpin();
    if (k === 'escape' || k === 'p') {
      if (gameState === 'PLAYING') pauseGame();
      else if (gameState === 'PAUSED') resumeGame();
    }
  }

  function onKeyUp(e) {
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'arrowup') keys.w = false;
    if (k === 's' || k === 'arrowdown') keys.s = false;
    if (k === 'a' || k === 'arrowleft') keys.a = false;
    if (k === 'd' || k === 'arrowright') keys.d = false;
    if (k === 'shift') keys.shift = false;
    if (k === 'control') keys.ctrl = false;
    if (k === ' ') keys.space = false;
    if (k === 'e') keys.e = false;
  }

  function onPointerLockChange() {
    const locked = document.pointerLockElement === canvas;
    if (!locked && gameState === 'PLAYING') {
      isMouseDown = false;
      lockPrompt.classList.remove('hidden');
    } else {
      lockPrompt.classList.add('hidden');
    }
  }

  function onMouseMove(e) {
    if (gameState !== 'PLAYING' || document.pointerLockElement !== canvas) return;
    const sens = settings.sensitivity * 0.00045;
    player.yaw -= e.movementX * sens;
    player.pitch -= e.movementY * sens;

    // Limites de inclinação vertical (Pitch)
    const maxPitch = 1.48; // ~85 graus
    player.pitch = Math.max(-maxPitch, Math.min(maxPitch, player.pitch));

    // Sway da arma em primeira pessoa
    weaponSwayX += e.movementX * 0.0018;
    weaponSwayY += e.movementY * 0.0018;
    weaponSwayX = Math.max(-0.12, Math.min(0.12, weaponSwayX));
    weaponSwayY = Math.max(-0.09, Math.min(0.09, weaponSwayY));
  }

  function requestPointerLock() {
    if (canvas && canvas.requestPointerLock) canvas.requestPointerLock();
  }

  /* ===========================================================================
     13. FLUXO DE MISSAO, OBJETIVOS E INVENTARIO
     =========================================================================== */
  function startMission() {
    const diff = DIFFICULTY_PRESETS[selectedDiff || 'normal'];

    // Posição inicial no mundo 3D
    player.x = (2.5 - MAP_W / 2) * CELL_SIZE;
    player.y = 1.65;
    player.z = (2.5 - MAP_H / 2) * CELL_SIZE;
    player.yaw = -Math.PI / 2;
    player.pitch = 0;
    player.velocityY = 0;
    player.isGrounded = true;
    player.health = 100;
    player.stamina = 100;
    player.crouchProgress = 0.0;
    player.bobbingTime = 0;
    player.isKnifeSpinning = false;
    player.knifeSpinProgress = 0.0;
    player.isKnifeSlashing = false;
    player.knifeSlashProgress = 0.0;

    // Inicializa Armamento: Arma Principal + Faca Tática
    const primaryDef = WEAPON_DEFS[selectedWeapon || 'glock'];
    player.weapons = [
      createWeaponState(primaryDef),
      createWeaponState(WEAPON_DEFS.knife)
    ];
    player.currentWeaponIdx = 0;

    missionStartTime = performance.now();
    missionElapsedTime = 0;
    totalShotsFired = 0; totalShotsHit = 0;
    totalKills = 0; totalDamageReceived = 0;

    currentObjectiveIndex = 0;
    chestOpened = false; chestAnimProgress = 0.0;
    exitReached = false;

    init3DWorldEntities(diff);

    hudEl.classList.remove('hidden');
    updateHUD(); updateObjectiveHUD(); updateWeaponSlots();

    gameState = 'PLAYING';
    requestPointerLock();
    showNotification('MISSAO 01 — A SAIDA (3D)');
  }

  function init3DWorldEntities(diff) {
    // Inimigos 3D
    enemies = [];
    const baseCount = 14;
    const count = Math.floor(baseCount * (diff.enemyCountMult || 1.0));
    const outfits = [
      { shirt: '#3b4a5c', pants: '#1e2630', hair: '#1a1208', skin: '#d4a574', vest: '#2a3540' },
      { shirt: '#4a3b2c', pants: '#2c2018', hair: '#0d0a06', skin: '#c49060', vest: '#3a2c20' },
      { shirt: '#2c3d2c', pants: '#1a2818', hair: '#241a0e', skin: '#e8b888', vest: '#1e3020' },
      { shirt: '#5c3a2a', pants: '#2c1e14', hair: '#12100a', skin: '#d4a070', vest: '#4a2c1c' }
    ];

    const spawnSlots = [];
    for (let y = 3; y < MAP_H - 3; y++) {
      for (let x = 3; x < MAP_W - 3; x++) {
        if (worldMap[y][x] === 0) {
          const wx = (x - MAP_W / 2) * CELL_SIZE;
          const wz = (y - MAP_H / 2) * CELL_SIZE;
          const d2 = (wx - player.x) ** 2 + (wz - player.z) ** 2;
          if (d2 > 140) spawnSlots.push({ x: wx, z: wz });
        }
      }
    }
    spawnSlots.sort(() => Math.random() - 0.5);

    for (let i = 0; i < count; i++) {
      const slot = spawnSlots[i % spawnSlots.length];
      const outfit = outfits[i % outfits.length];
      enemies.push({
        id: i,
        x: slot.x + (Math.random() * 2 - 1),
        y: 0.0,
        z: slot.z + (Math.random() * 2 - 1),
        yaw: Math.random() * Math.PI * 2,
        hp: Math.floor(65 * diff.enemyHpMult),
        maxHp: Math.floor(65 * diff.enemyHpMult),
        speed: 3.2 * diff.enemySpeedMult,
        damage: Math.floor(13 * diff.enemyDamageMult),
        accuracy: diff.enemyAccuracy,
        detectRange: diff.enemyDetectRange,
        attackCooldown: diff.enemyAttackCooldown,
        outfit,
        state: 'patrol',
        patrolTimer: Math.random() * 3,
        attackTimer: 0,
        hurtTimer: 0,
        walkCycle: Math.random() * Math.PI * 2,
        isMoving: false,
        alive: true
      });
    }

    // Tochas 3D na Caverna (Fontes de Luz Tridimensional com Chamas)
    worldTorches = [
      { x: (3.5 - MAP_W / 2) * CELL_SIZE, y: 2.2, z: (6.5 - MAP_H / 2) * CELL_SIZE },
      { x: (11.5 - MAP_W / 2) * CELL_SIZE, y: 2.2, z: (4.5 - MAP_H / 2) * CELL_SIZE },
      { x: (18.5 - MAP_W / 2) * CELL_SIZE, y: 2.2, z: (7.5 - MAP_H / 2) * CELL_SIZE },
      { x: (24.5 - MAP_W / 2) * CELL_SIZE, y: 2.2, z: (11.5 - MAP_H / 2) * CELL_SIZE },
      { x: (12.5 - MAP_W / 2) * CELL_SIZE, y: 2.2, z: (13.5 - MAP_H / 2) * CELL_SIZE },
      { x: (22.5 - MAP_W / 2) * CELL_SIZE, y: 2.2, z: (17.5 - MAP_H / 2) * CELL_SIZE },
      { x: (8.5 - MAP_W / 2) * CELL_SIZE, y: 2.2, z: (22.5 - MAP_H / 2) * CELL_SIZE },
      { x: (18.5 - MAP_W / 2) * CELL_SIZE, y: 2.2, z: (26.5 - MAP_H / 2) * CELL_SIZE },
      { x: (27.5 - MAP_W / 2) * CELL_SIZE, y: 2.2, z: (30.5 - MAP_H / 2) * CELL_SIZE },
      { x: (33.5 - MAP_W / 2) * CELL_SIZE, y: 2.2, z: (35.5 - MAP_H / 2) * CELL_SIZE }
    ];

    // Props Destrutíveis (TNT e Barris 3D)
    worldProps = [
      { type: 'minecart', x: (17.5 - MAP_W / 2) * CELL_SIZE, y: 0.1, z: (7.5 - MAP_H / 2) * CELL_SIZE, hp: 9999, destroyed: false },
      { type: 'minecart', x: (16.5 - MAP_W / 2) * CELL_SIZE, y: 0.1, z: (18.5 - MAP_H / 2) * CELL_SIZE, hp: 9999, destroyed: false },
      { type: 'tnt', x: (11.5 - MAP_W / 2) * CELL_SIZE, y: 0.0, z: (15.5 - MAP_H / 2) * CELL_SIZE, hp: 1, destroyed: false },
      { type: 'tnt', x: (23.5 - MAP_W / 2) * CELL_SIZE, y: 0.0, z: (26.5 - MAP_H / 2) * CELL_SIZE, hp: 1, destroyed: false },
      { type: 'barrel', x: (5.5 - MAP_W / 2) * CELL_SIZE, y: 0.0, z: (3.5 - MAP_H / 2) * CELL_SIZE, hp: 20, destroyed: false },
      { type: 'barrel', x: (22.5 - MAP_W / 2) * CELL_SIZE, y: 0.0, z: (10.5 - MAP_H / 2) * CELL_SIZE, hp: 20, destroyed: false },
      { type: 'crate', x: (14.5 - MAP_W / 2) * CELL_SIZE, y: 0.0, z: (5.5 - MAP_H / 2) * CELL_SIZE, hp: 18, destroyed: false }
    ];
  }

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

  function triggerGameOver() {
    gameState = 'GAMEOVER';
    if (document.exitPointerLock) document.exitPointerLock();
    audio.playGameOver();
    hudEl.classList.add('hidden');
    const elapsed = (performance.now() - missionStartTime) / 1000;
    const acc = totalShotsFired > 0 ? Math.round((totalShotsHit / totalShotsFired) * 100) : 0;
    const fs = document.getElementById('failStats');
    if (fs) fs.innerHTML = makeStatsHTML([
      ['Inimigos Eliminados', totalKills],
      ['Disparos Realizados', totalShotsFired],
      ['Precisao', acc + '%'],
      ['Dano Recebido', totalDamageReceived],
      ['Tempo', formatTime(elapsed)]
    ]);
    gameOverScreen.classList.remove('hidden');
  }

  function triggerMissionComplete() {
    gameState = 'WIN';
    if (document.exitPointerLock) document.exitPointerLock();
    audio.playVictory();
    hudEl.classList.add('hidden');
    const elapsed = (performance.now() - missionStartTime) / 1000;
    const acc = totalShotsFired > 0 ? Math.round((totalShotsHit / totalShotsFired) * 100) : 0;
    const ws = document.getElementById('winStats');
    if (ws) ws.innerHTML = makeStatsHTML([
      ['Tempo da Missao', formatTime(elapsed)],
      ['Inimigos Eliminados', totalKills],
      ['Precisao', acc + '%'],
      ['Disparos', totalShotsFired],
      ['Dano Recebido', totalDamageReceived]
    ]);
    missionCompleteScreen.classList.remove('hidden');
  }

  function makeStatsHTML(stats) {
    return stats.map(([l, v]) => `<div class="rs-item"><div class="rs-label">${l}</div><div class="rs-value">${v}</div></div>`).join('');
  }
  function formatTime(s) {
    const m = Math.floor(s / 60), ss = Math.floor(s % 60);
    return `${m.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
  }

  function showNotification(msg) {
    if (!hudNotice) return;
    hudNotice.textContent = msg;
    hudNotice.classList.remove('hidden');
    clearTimeout(hudNotice._t);
    hudNotice._t = setTimeout(() => hudNotice.classList.add('hidden'), 2400);
  }

  function damagePlayer(amount) {
    player.health = Math.max(0, player.health - amount);
    totalDamageReceived += amount;
    audio.playPlayerHurt();
    triggerScreenShake(7.0, 0.18);
    damageVignette.classList.add('damaged');
    setTimeout(() => damageVignette.classList.remove('damaged'), 180);
    updateHUD();
    if (player.health <= 0) triggerGameOver();
  }

  /* ===========================================================================
     14. SISTEMA DE COMBATE 3D, FACA E DISPAROS
     =========================================================================== */
  function handlePlayerAttack() {
    const ws = getCurrentWeapon();
    if (!ws) return;

    if (ws.def.isMelee) {
      // Ataque de Faca 3D
      if (player.isKnifeSlashing || player.isKnifeSpinning) return;
      player.isKnifeSlashing = true;
      player.knifeSlashProgress = 0.0;
      audio.playKnifeSlash();
      check3DMeleeHit(ws.def.damage, ws.def.range);
    } else {
      // Disparo de Arma de Fogo 3D
      shoot3DWeapon(ws);
    }
  }

  // Animação Especial 3D de Girar a Faca (Tecla V)
  function triggerKnifeSpin() {
    // Se a faca não estiver equipada, equipa ela primeiro
    const knifeIdx = player.weapons.findIndex(w => w.def.id === 'knife');
    if (knifeIdx !== -1 && player.currentWeaponIdx !== knifeIdx) {
      switchWeapon(knifeIdx);
    }
    if (player.isKnifeSpinning || player.isKnifeSlashing) return;
    player.isKnifeSpinning = true;
    player.knifeSpinProgress = 0.0;
    audio.playKnifeSpin();
  }

  function equipKnifeDirectly() {
    const knifeIdx = player.weapons.findIndex(w => w.def.id === 'knife');
    if (knifeIdx !== -1) switchWeapon(knifeIdx);
  }

  function shoot3DWeapon(ws) {
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

    // Recuo tridimensional físico
    recoilRecoilY += ws.def.recoilImpulse * 0.005;
    recoilKickPitch += ws.def.recoilKick;
    recoilSideX += (Math.random() * 2 - 1) * 0.006;

    // Clarão de tiro 3D dinâmico
    muzzleFlashLight.intensity = ws.def.flashIntensity;
    muzzleFlashLight.endTime = now + ws.def.flashDuration;
    // Calcula posição da ponta do cano no mundo 3D
    const cosY = Math.cos(player.yaw), sinY = Math.sin(player.yaw);
    const forwardX = -sinY, forwardZ = -cosY;
    muzzleFlashLight.pos[0] = player.x + forwardX * 0.7;
    muzzleFlashLight.pos[1] = player.y - 0.15;
    muzzleFlashLight.pos[2] = player.z + forwardZ * 0.7;

    // Overlay sutil e tremor
    if (muzzleFlashFx && !ws.def.silenced) {
      muzzleFlashFx.style.opacity = '0.7';
      setTimeout(() => muzzleFlashFx.style.opacity = '0', ws.def.flashDuration);
    }
    if (ws.def.id === 'deagle') triggerScreenShake(6.5, 0.16);
    else if (ws.def.id === 'm4') triggerScreenShake(2.2, 0.09);
    else if (!ws.def.silenced) triggerScreenShake(1.6, 0.08);

    audio.playShoot(ws.def.id);
    updateHUD();

    // Raycast Tridimensional de Hitscan
    const spread = ws.def.spread * (player.crouchProgress > 0.5 ? 0.6 : 1.0);
    const spreadX = (Math.random() * 2 - 1) * spread;
    const spreadY = (Math.random() * 2 - 1) * spread;

    // Vetor de mira da câmera 3D
    const rayDir = [
      -Math.sin(player.yaw + spreadX) * Math.cos(player.pitch + spreadY),
      Math.sin(player.pitch + spreadY),
      -Math.cos(player.yaw + spreadX) * Math.cos(player.pitch + spreadY)
    ];
    check3DRayHit([player.x, player.y, player.z], rayDir, ws.def.damage, ws.def.range);
  }

  function check3DRayHit(origin, dir, damage, range) {
    let hitEnemy = null, minEnemyD = range;
    let hitProp = null, minPropD = range;

    // Inimigos 3D (Bounding Cylinder / Sphere)
    enemies.forEach(en => {
      if (!en.alive) return;
      const toEn = [en.x - origin[0], (en.y + 1.0) - origin[1], en.z - origin[2]];
      const proj = Vec3.dot(toEn, dir);
      if (proj > 0 && proj < minEnemyD) {
        const perpDist = Math.hypot(
          toEn[0] - dir[0] * proj,
          toEn[1] - dir[1] * proj,
          toEn[2] - dir[2] * proj
        );
        if (perpDist < 0.65) {
          minEnemyD = proj;
          hitEnemy = en;
        }
      }
    });

    // Props Destrutíveis (TNT e Barris)
    worldProps.forEach(prop => {
      if (prop.destroyed) return;
      const toProp = [prop.x - origin[0], (prop.y + 0.5) - origin[1], prop.z - origin[2]];
      const proj = Vec3.dot(toProp, dir);
      if (proj > 0 && proj < minPropD) {
        const perpDist = Math.hypot(
          toProp[0] - dir[0] * proj,
          toProp[1] - dir[1] * proj,
          toProp[2] - dir[2] * proj
        );
        if (perpDist < 0.8) {
          minPropD = proj;
          hitProp = prop;
        }
      }
    });

    if (hitEnemy && minEnemyD <= minPropD) {
      totalShotsHit++;
      hitEnemy.hp -= damage;
      hitEnemy.hurtTimer = 0.25;
      hitEnemy.state = 'chase';
      hitmarkerTimer = 8;
      hitmarkerEl.classList.remove('hidden');
      audio.playHit(); audio.playHumanHurt();
      if (hitEnemy.hp <= 0) killEnemy(hitEnemy);
    } else if (hitProp) {
      hitProp.hp -= damage;
      audio.playHit();
      if (hitProp.hp <= 0) explode3DProp(hitProp);
    }
  }

  function check3DMeleeHit(damage, range) {
    const forward = [-Math.sin(player.yaw), 0, -Math.cos(player.yaw)];
    enemies.forEach(en => {
      if (!en.alive) return;
      const dx = en.x - player.x, dz = en.z - player.z;
      const dist = Math.hypot(dx, dz);
      if (dist < range) {
        const dot = (dx * forward[0] + dz * forward[2]) / dist;
        if (dot > 0.4) {
          en.hp -= damage;
          en.hurtTimer = 0.3;
          en.state = 'chase';
          hitmarkerTimer = 8;
          hitmarkerEl.classList.remove('hidden');
          audio.playKnifeHit(); audio.playHumanHurt();
          if (en.hp <= 0) killEnemy(en);
        }
      }
    });
  }

  function explode3DProp(prop) {
    if (prop.destroyed) return;
    prop.destroyed = true;
    audio.playExplosion();
    triggerScreenShake(12.0, 0.4);

    // Muzzle/Explosion Flash gigante no mundo 3D
    muzzleFlashLight.pos[0] = prop.x;
    muzzleFlashLight.pos[1] = prop.y + 0.8;
    muzzleFlashLight.pos[2] = prop.z;
    muzzleFlashLight.color[0] = 1.0; muzzleFlashLight.color[1] = 0.45; muzzleFlashLight.color[2] = 0.1;
    muzzleFlashLight.intensity = 2.8;
    muzzleFlashLight.endTime = performance.now() + 250;

    const blastRadius = prop.type === 'tnt' ? 12.0 : 8.0;
    const maxDamage = prop.type === 'tnt' ? 140 : 65;

    // Dano 3D nos inimigos
    enemies.forEach(en => {
      if (!en.alive) return;
      const d = Math.hypot(en.x - prop.x, en.z - prop.z);
      if (d < blastRadius) {
        en.hp -= Math.floor(maxDamage * (1 - d / blastRadius));
        en.hurtTimer = 0.3;
        if (en.hp <= 0) killEnemy(en);
      }
    });

    // Dano no jogador caso esteja muito próximo
    const pD = Math.hypot(player.x - prop.x, player.z - prop.z);
    if (pD < blastRadius) {
      damagePlayer(Math.floor(50 * (1 - pD / blastRadius)));
    }
  }

  function killEnemy(en) {
    en.alive = false;
    totalKills++;
    audio.playEnemyEliminated();
    checkObjectiveProgress();
  }

  function reloadWeapon() {
    const ws = getCurrentWeapon();
    if (!ws || ws.def.isMelee || ws.isReloading || ws.ammo === ws.def.magSize || ws.reserve <= 0) return;
    ws.isReloading = true;
    ws.reloadStartTime = performance.now();
    reloadIndicator.classList.remove('hidden');
    audio.playReload();
  }

  function switchWeapon(idx) {
    if (idx < 0 || idx >= player.weapons.length) return;
    player.currentWeaponIdx = idx;
    const cur = getCurrentWeapon();
    if (cur) cur.isReloading = false;
    reloadIndicator.classList.add('hidden');
    updateHUD(); updateWeaponSlots();
    showNotification('EQUIPADO: ' + player.weapons[idx].def.name);
  }

  /* ===========================================================================
     15. FISICA 3D, COLISOES, PULO E AGACHAMENTO
     =========================================================================== */
  function triggerJump() {
    if (!player.isGrounded) return;
    if (player.crouchProgress > 0.35) return;
    player.velocityY = 4.8; // Metros/s
    player.isGrounded = false;
    audio.playJump();
  }

  function update3D(dt) {
    if (gameState !== 'PLAYING') return;

    missionElapsedTime = (performance.now() - missionStartTime) / 1000;
    if (missionTimer) missionTimer.textContent = formatTime(missionElapsedTime);

    const ws = getCurrentWeapon();

    // Disparo automático M4
    if (isMouseDown && ws && ws.def.isAuto) {
      shoot3DWeapon(ws);
    }

    // Recarga
    if (ws && ws.isReloading) {
      const el = performance.now() - ws.reloadStartTime;
      if (el >= ws.def.reloadTime) {
        const need = ws.def.magSize - ws.ammo;
        const take = Math.min(need, ws.reserve);
        ws.ammo += take; ws.reserve -= take;
        ws.isReloading = false;
        reloadIndicator.classList.add('hidden');
        updateHUD();
      }
    }

    // Animação 3D de Giro da Faca
    if (player.isKnifeSpinning) {
      player.knifeSpinProgress += dt * (1000 / WEAPON_DEFS.knife.spinDuration);
      if (player.knifeSpinProgress >= 1.0) {
        player.isKnifeSpinning = false;
        player.knifeSpinProgress = 0.0;
      }
    }
    // Animação de Golpe da Faca
    if (player.isKnifeSlashing) {
      player.knifeSlashProgress += dt * 3.8;
      if (player.knifeSlashProgress >= 1.0) {
        player.isKnifeSlashing = false;
        player.knifeSlashProgress = 0.0;
      }
    }

    // Agachamento Gradual
    const wantsCrouch = keys.ctrl && player.isGrounded;
    player.isCrouching = wantsCrouch;
    const crouchTarget = wantsCrouch ? 1.0 : 0.0;
    player.crouchProgress += (crouchTarget - player.crouchProgress) * Math.min(1.0, dt * 10);

    // Corrida e Stamina
    player.isRunning = keys.shift && player.stamina > 0 && player.crouchProgress < 0.35 && player.isGrounded;
    if (player.isRunning) {
      player.stamina = Math.max(0, player.stamina - dt * 22);
    } else {
      player.stamina = Math.min(100, player.stamina + dt * 14);
    }
    if (staminaNumber) staminaNumber.textContent = Math.floor(player.stamina);
    if (staminaBarFill) staminaBarFill.style.width = player.stamina + '%';

    // Movimentação em Eixos 3D (X e Z)
    const forward = [-Math.sin(player.yaw), 0, -Math.cos(player.yaw)];
    const right = [Math.cos(player.yaw), 0, -Math.sin(player.yaw)];
    let moveX = 0, moveZ = 0;
    if (keys.w) { moveX += forward[0]; moveZ += forward[2]; }
    if (keys.s) { moveX -= forward[0]; moveZ -= forward[2]; }
    if (keys.d) { moveX += right[0]; moveZ += right[2]; }
    if (keys.a) { moveX -= right[0]; moveZ -= right[2]; }

    const mLen = Math.hypot(moveX, moveZ);
    if (mLen > 0.01) {
      moveX /= mLen; moveZ /= mLen;
      const speedMult = (player.isRunning ? 1.65 : 1.0) * (1.0 - player.crouchProgress * 0.52);
      const stepDist = player.speed * speedMult * dt;

      // Colisão com Paredes da Caverna (Círculo de Raio 0.45m)
      const nX = player.x + moveX * stepDist;
      const nZ = player.z + moveZ * stepDist;
      if (!isWallCollision3D(nX, player.z, 0.45)) player.x = nX;
      if (!isWallCollision3D(player.x, nZ, 0.45)) player.z = nZ;

      // Bobbing de Passos
      player.bobbingTime += dt * (player.isRunning ? 13 : 8);
      footstepTimer += dt;
      if (footstepTimer > (player.isRunning ? 0.28 : 0.42)) {
        footstepTimer = 0;
        if (player.crouchProgress < 0.75) audio.playFootstep();
      }
    } else {
      player.bobbingTime = 0;
    }

    // Gravidade e Pulo em Y
    if (!player.isGrounded) {
      player.velocityY -= 14.0 * dt;
      player.y += player.velocityY * dt;
      const groundY = 1.65 - player.crouchProgress * 0.65;
      if (player.y <= groundY) {
        player.y = groundY;
        player.velocityY = 0;
        player.isGrounded = true;
        audio.playLand();
        triggerScreenShake(2.5, 0.12);
      }
    } else {
      player.y = 1.65 - player.crouchProgress * 0.65;
    }

    // Amortecimento de Recuo
    recoilRecoilY *= Math.exp(-dt * 16);
    recoilKickPitch *= Math.exp(-dt * 18);
    recoilSideX *= Math.exp(-dt * 18);
    weaponSwayX *= Math.exp(-dt * 12);
    weaponSwayY *= Math.exp(-dt * 12);

    // Fade de Luz de Disparo
    if (performance.now() > muzzleFlashLight.endTime) {
      muzzleFlashLight.intensity = 0.0;
    }

    // Tremor de tela
    if (screenShakeTimer > 0) {
      screenShakeTimer -= dt;
      if (screenShakeTimer <= 0) screenShakeIntensity = 0;
    }

    if (hitmarkerTimer > 0) {
      hitmarkerTimer--;
      if (hitmarkerTimer === 0) hitmarkerEl.classList.add('hidden');
    }

    // IA dos Inimigos 3D
    enemies.forEach(en => { if (en.alive) update3DEnemy(en, dt); });

    // Interações com Baú e Saída
    update3DInteractions(dt);
  }

  function isWallCollision3D(wx, wz, radius) {
    const cx = Math.floor((wx / CELL_SIZE) + MAP_W / 2);
    const cz = Math.floor((wz / CELL_SIZE) + MAP_H / 2);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const gx = cx + dx, gy = cz + dy;
        if (gx < 0 || gx >= MAP_W || gy < 0 || gy >= MAP_H || worldMap[gy][gx] > 0) {
          const minX = (gx - MAP_W / 2) * CELL_SIZE - CELL_SIZE / 2;
          const maxX = minX + CELL_SIZE;
          const minZ = (gy - MAP_H / 2) * CELL_SIZE - CELL_SIZE / 2;
          const maxZ = minZ + CELL_SIZE;
          const closeX = Math.max(minX, Math.min(wx, maxX));
          const closeZ = Math.max(minZ, Math.min(wz, maxZ));
          if (Math.hypot(wx - closeX, wz - closeZ) < radius) return true;
        }
      }
    }
    return false;
  }

  function update3DEnemy(en, dt) {
    const dx = player.x - en.x, dz = player.z - en.z;
    const dist = Math.hypot(dx, dz);
    en.yaw = Math.atan2(dx, dz) + Math.PI;

    if (dist < en.detectRange) {
      en.state = 'chase';
      // Persegue
      if (dist > 3.0) {
        en.isMoving = true;
        en.walkCycle += dt * 8.5;
        const spd = en.speed * dt;
        en.x += (dx / dist) * spd;
        en.z += (dz / dist) * spd;
      } else {
        en.isMoving = false;
        en.attackTimer -= dt;
        if (en.attackTimer <= 0) {
          en.attackTimer = en.attackCooldown;
          audio.playEnemyShoot('glock');
          damagePlayer(en.damage);
        }
      }
    } else {
      en.state = 'patrol';
      en.isMoving = false;
    }
  }

  function update3DInteractions(dt) {
    const chestX = (20.5 - MAP_W / 2) * CELL_SIZE;
    const chestZ = (25.5 - MAP_H / 2) * CELL_SIZE;
    const dChest = Math.hypot(player.x - chestX, player.z - chestZ);

    const exitX = (32.0 - MAP_W / 2) * CELL_SIZE;
    const exitZ = (36.0 - MAP_H / 2) * CELL_SIZE;
    const dExit = Math.hypot(player.x - exitX, player.z - exitZ);

    if (!chestOpened && dChest < 4.0) {
      interactPrompt.classList.remove('hidden');
      if (interactText) interactText.textContent = 'ABRIR BAU 3D [E]';
      if (keys.e) {
        keys.e = false;
        chestOpened = true;
        audio.playInteract();
        interactPrompt.classList.add('hidden');
        gameState = 'NEWWEAPON';
        if (document.exitPointerLock) document.exitPointerLock();
        hudEl.classList.add('hidden');
        newWeaponScreen.classList.remove('hidden');
        setObjective(4);
      }
    } else if (chestOpened && !exitReached && dExit < 5.0) {
      interactPrompt.classList.remove('hidden');
      if (interactText) interactText.textContent = 'SAIDA DA MINA [E]';
      if (keys.e) {
        keys.e = false;
        exitReached = true;
        setTimeout(triggerMissionComplete, 600);
      }
    } else {
      interactPrompt.classList.add('hidden');
    }

    if (chestOpened && chestAnimProgress < 1.0) {
      chestAnimProgress = Math.min(1.0, chestAnimProgress + dt * 1.5);
    }
  }

  function equipM4() {
    player.weapons.push(createWeaponState(WEAPON_DEFS.m4));
    newWeaponScreen.classList.add('hidden');
    hudEl.classList.remove('hidden');
    gameState = 'PLAYING';
    requestPointerLock();
    player.currentWeaponIdx = player.weapons.length - 1;
    updateHUD(); updateWeaponSlots();
    showNotification('M4A1 EQUIPADA! Disparo Automatico [LMB]');
    setObjective(5);
    audio.playObjective();
  }

  function setObjective(idx) {
    if (idx === currentObjectiveIndex) return;
    currentObjectiveIndex = idx;
    const obj = MISSION_OBJECTIVES[Math.min(idx, MISSION_OBJECTIVES.length - 1)];
    updateObjectiveHUD();
    if (objectiveUpdateText) objectiveUpdateText.textContent = obj.text;
    if (objectiveUpdateBanner) {
      objectiveUpdateBanner.classList.remove('hidden');
      clearTimeout(objectiveUpdateBanner._t);
      objectiveUpdateBanner._t = setTimeout(() => objectiveUpdateBanner.classList.add('hidden'), 3500);
    }
    audio.playObjective();
  }
  function updateObjectiveHUD() {
    const obj = MISSION_OBJECTIVES[Math.min(currentObjectiveIndex, MISSION_OBJECTIVES.length - 1)];
    if (objectiveText) objectiveText.textContent = obj.text;
  }
  function checkObjectiveProgress() {
    const alive = enemies.filter(e => e.alive).length;
    if (currentObjectiveIndex === 0 && alive < enemies.length * 0.9) setObjective(1);
    if (currentObjectiveIndex === 1 && alive < enemies.length * 0.6) setObjective(2);
    if (currentObjectiveIndex === 2 && alive < enemies.length * 0.35) setObjective(3);
    if (currentObjectiveIndex === 3 && alive === 0) setObjective(4);
  }

  function updateHUD() {
    if (!hudEl) return;
    if (healthNumber) healthNumber.textContent = Math.max(0, Math.floor(player.health));
    if (healthBarFill) {
      healthBarFill.style.width = Math.max(0, player.health) + '%';
      healthBarFill.classList.toggle('critical', player.health <= 25);
    }
    const ws = getCurrentWeapon();
    if (ws) {
      if (currentAmmoEl) currentAmmoEl.textContent = ws.def.isMelee ? '∞' : ws.ammo;
      if (reserveAmmoEl) reserveAmmoEl.textContent = ws.def.isMelee ? '∞' : ws.reserve;
      if (currentWeaponName) currentWeaponName.textContent = ws.def.shortName;
      if (bulletPipsEl) {
        bulletPipsEl.innerHTML = '';
        if (!ws.def.isMelee) {
          const total = Math.min(ws.def.magSize, 30);
          for (let i = 0; i < total; i++) {
            const p = document.createElement('div');
            p.className = 'bullet-pip' + (i < ws.ammo ? '' : ' empty');
            bulletPipsEl.appendChild(p);
          }
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
      slot.textContent = `[${i + 1}] ${w.def.shortName}`;
      slot.addEventListener('click', () => switchWeapon(i));
      weaponSlotsEl.appendChild(slot);
    });
  }

  /* ===========================================================================
     16. RENDERIZACAO TRIDIMENSIONAL (CENA DA CAVERNA, INIMIGOS E ARMAS 3D)
     =========================================================================== */
  function render3D() {
    const gl = glRenderer.gl;
    const w = canvas.width, h = canvas.height;
    if (!gl || w === 0 || h === 0) return;

    gl.viewport(0, 0, w, h);
    gl.clearColor(0.03, 0.025, 0.02, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(glRenderer.program);

    // Matriz de Projeção Perspectiva 3D Real (FOV 75 graus)
    const aspect = w / h;
    const projMat = Mat4.perspective(Mat4.create(), (75 * Math.PI) / 180, aspect, 0.08, 120.0);
    gl.uniformMatrix4fv(glRenderer.uniforms.proj, false, projMat);

    // Tremor de tela na câmera
    let shakeX = 0, shakeY = 0;
    if (screenShakeIntensity > 0) {
      shakeX = (Math.random() * 2 - 1) * screenShakeIntensity * 0.015;
      shakeY = (Math.random() * 2 - 1) * screenShakeIntensity * 0.015;
    }

    // Câmera em Primeira Pessoa 3D (Posição nos olhos do personagem)
    const eye = [player.x + shakeX, player.y + shakeY, player.z];
    const target = [
      eye[0] - Math.sin(player.yaw) * Math.cos(player.pitch),
      eye[1] + Math.sin(player.pitch),
      eye[2] - Math.cos(player.yaw) * Math.cos(player.pitch)
    ];
    const viewMat = Mat4.lookAt(Mat4.create(), eye, target, [0, 1, 0]);
    gl.uniformMatrix4fv(glRenderer.uniforms.view, false, viewMat);
    gl.uniform3fv(glRenderer.uniforms.cameraPos, eye);

    // Iluminação Ambiente da Mina
    gl.uniform3f(glRenderer.uniforms.ambient, 0.16, 0.14, 0.13);

    // Configuração de Névoa de Profundidade Subterrânea
    gl.uniform3f(glRenderer.uniforms.fogColor, 0.03, 0.025, 0.02);
    gl.uniform1f(glRenderer.uniforms.fogNear, 12.0);
    gl.uniform1f(glRenderer.uniforms.fogFar, 75.0);

    // Configura Tochas Próximas como Luzes Pontuais 3D
    const tNow = performance.now() * 0.005;
    const nearbyTorches = worldTorches
      .map(torch => ({ ...torch, dist: Math.hypot(torch.x - player.x, torch.z - player.z) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 8);

    gl.uniform1i(glRenderer.uniforms.numLights, nearbyTorches.length);
    nearbyTorches.forEach((torch, i) => {
      const flicker = 0.88 + Math.sin(tNow * 4 + torch.x) * 0.12;
      gl.uniform3f(glRenderer.lightPosLocs[i], torch.x, torch.y, torch.z);
      gl.uniform3f(glRenderer.lightColLocs[i], 1.0 * flicker, 0.65 * flicker, 0.28 * flicker);
      gl.uniform1f(glRenderer.lightRadLocs[i], 18.0);
    });

    // Muzzle Flash Point Light 3D
    gl.uniform3fv(glRenderer.uniforms.muzzlePos, muzzleFlashLight.pos);
    gl.uniform3fv(glRenderer.uniforms.muzzleColor, muzzleFlashLight.color);
    gl.uniform1f(glRenderer.uniforms.muzzleIntensity, muzzleFlashLight.intensity);

    // --- 1. RENDERIZACAO DO CENARIO DA CAVERNA 3D ---
    const worldIdent = Mat4.identity(Mat4.create());
    gl.uniformMatrix4fv(glRenderer.uniforms.world, false, worldIdent);
    gl.uniform4f(glRenderer.uniforms.baseColor, 1.0, 1.0, 1.0, 1.0);
    gl.uniform1f(glRenderer.uniforms.specular, 0.25);
    gl.uniform1f(glRenderer.uniforms.roughness, 0.8);

    // Paredes com a Textura Real de Rocha (assets/textures/rock.jpg)
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, glRenderer.textures.rock);
    gl.uniform1i(glRenderer.uniforms.sampler, 0);
    gl.uniform1f(glRenderer.uniforms.useTexture, 1.0);

    cavernScene.walls.bind(glRenderer.attribs);
    cavernScene.walls.draw();

    // Chão e Teto
    cavernScene.floor.bind(glRenderer.attribs);
    cavernScene.floor.draw();
    cavernScene.ceiling.bind(glRenderer.attribs);
    cavernScene.ceiling.draw();

    // Vigas de Madeira e Trilhos de Ferro
    gl.bindTexture(gl.TEXTURE_2D, glRenderer.textures.wood);
    cavernScene.woodBeams.bind(glRenderer.attribs);
    cavernScene.woodBeams.draw();

    gl.bindTexture(gl.TEXTURE_2D, glRenderer.textures.metal);
    cavernScene.rails.bind(glRenderer.attribs);
    cavernScene.rails.draw();

    // --- 2. RENDERIZACAO DE PROPS E OBJETOS DA MINA ---
    worldProps.forEach(prop => {
      if (prop.destroyed) return;
      const m = Mat4.identity(Mat4.create());
      Mat4.translate(m, m, [prop.x, prop.y, prop.z]);
      gl.uniformMatrix4fv(glRenderer.uniforms.world, false, m);

      if (prop.type === 'minecart') {
        gl.bindTexture(gl.TEXTURE_2D, glRenderer.textures.metal);
        cavernScene.cart.bind(glRenderer.attribs);
        cavernScene.cart.draw();
      } else if (prop.type === 'tnt') {
        gl.bindTexture(gl.TEXTURE_2D, glRenderer.textures.tnt);
        cavernScene.box.bind(glRenderer.attribs);
        cavernScene.box.draw();
      } else if (prop.type === 'barrel') {
        gl.bindTexture(gl.TEXTURE_2D, glRenderer.textures.wood);
        cavernScene.cylinder.bind(glRenderer.attribs);
        cavernScene.cylinder.draw();
      }
    });

    // Baú Tridimensional (com tampa animada)
    render3DChest(gl, glRenderer);

    // Saída com Portal de Luz
    render3DExitPortal(gl, glRenderer);

    // Tochas 3D com chamas animadas
    render3DTorches(gl, glRenderer, nearbyTorches, tNow);

    // --- 3. RENDERIZACAO DOS INIMIGOS HUMANOS 3D ---
    enemies.forEach(en => {
      if (!en.alive) return;
      render3DEnemy(gl, glRenderer, en);
    });

    // --- 4. RENDERIZACAO DA FACA E ARMAS EM PRIMEIRA PESSOA (FPS PASS) ---
    renderFirstPersonWeapons3D(gl, glRenderer, aspect);

    // Minimapa 2D Tático
    renderMinimap();
  }

  function render3DChest(gl, renderer) {
    const cx = (20.5 - MAP_W / 2) * CELL_SIZE;
    const cz = (25.5 - MAP_H / 2) * CELL_SIZE;
    const m = Mat4.identity(Mat4.create());
    Mat4.translate(m, m, [cx, 0.45, cz]);
    Mat4.scale(m, m, [1.3, 0.9, 0.9]);
    gl.uniformMatrix4fv(renderer.uniforms.world, false, m);

    gl.bindTexture(gl.TEXTURE_2D, renderer.textures.wood);
    gl.uniform4f(renderer.uniforms.baseColor, 0.9, 0.8, 0.5, 1.0);
    cavernScene.box.bind(renderer.attribs);
    cavernScene.box.draw();

    // Fechadura Dourada com brilho
    const fM = Mat4.identity(Mat4.create());
    Mat4.translate(fM, fM, [cx, 0.45, cz + 0.46]);
    Mat4.scale(fM, fM, [0.18, 0.22, 0.05]);
    gl.uniformMatrix4fv(renderer.uniforms.world, false, fM);
    gl.uniform4f(renderer.uniforms.baseColor, 1.0, 0.85, 0.2, 1.0);
    gl.uniform1f(renderer.uniforms.useTexture, 0.0);
    cavernScene.box.bind(renderer.attribs);
    cavernScene.box.draw();
  }

  function render3DExitPortal(gl, renderer) {
    if (!chestOpened) return;
    const ex = (32.0 - MAP_W / 2) * CELL_SIZE;
    const ez = (36.0 - MAP_H / 2) * CELL_SIZE;
    const m = Mat4.identity(Mat4.create());
    Mat4.translate(m, m, [ex, WALL_HEIGHT / 2, ez]);
    Mat4.scale(m, m, [2.2, WALL_HEIGHT, 0.3]);
    gl.uniformMatrix4fv(renderer.uniforms.world, false, m);
    gl.uniform4f(renderer.uniforms.baseColor, 0.2, 0.9, 0.4, 0.85);
    gl.uniform1f(renderer.uniforms.useTexture, 0.0);
    cavernScene.box.bind(renderer.attribs);
    cavernScene.box.draw();
  }

  function render3DTorches(gl, renderer, torches, tNow) {
    gl.uniform1f(renderer.uniforms.useTexture, 0.0);
    torches.forEach(t => {
      // Suporte de ferro
      const sM = Mat4.identity(Mat4.create());
      Mat4.translate(sM, sM, [t.x, t.y - 0.2, t.z]);
      Mat4.scale(sM, sM, [0.08, 0.45, 0.08]);
      gl.uniformMatrix4fv(renderer.uniforms.world, false, sM);
      gl.uniform4f(renderer.uniforms.baseColor, 0.2, 0.22, 0.25, 1.0);
      cavernScene.cylinder.bind(renderer.attribs);
      cavernScene.cylinder.draw();

      // Chama 3D quente animada
      const flScale = 0.16 + Math.sin(tNow * 6 + t.x) * 0.03;
      const fM = Mat4.identity(Mat4.create());
      Mat4.translate(fM, fM, [t.x, t.y + 0.1, t.z]);
      Mat4.scale(fM, fM, [flScale, flScale * 1.6, flScale]);
      gl.uniformMatrix4fv(renderer.uniforms.world, false, fM);
      gl.uniform4f(renderer.uniforms.baseColor, 1.0, 0.75, 0.15, 1.0);
      cavernScene.box.bind(renderer.attribs);
      cavernScene.box.draw();
    });
  }

  function render3DEnemy(gl, renderer, en) {
    gl.uniform1f(renderer.uniforms.useTexture, 0.0);
    const m = Mat4.identity(Mat4.create());
    Mat4.translate(m, m, [en.x, en.y, en.z]);
    Mat4.rotateY(m, m, en.yaw);

    // Tronco
    const torsoM = Mat4.translate(Mat4.create(), m, [0, 1.05, 0]);
    gl.uniformMatrix4fv(renderer.uniforms.world, false, torsoM);
    enemyMeshes.torso.bind(renderer.attribs);
    enemyMeshes.torso.draw();

    // Cabeça
    const headM = Mat4.translate(Mat4.create(), m, [0, 1.55, 0]);
    gl.uniformMatrix4fv(renderer.uniforms.world, false, headM);
    enemyMeshes.head.bind(renderer.attribs);
    enemyMeshes.head.draw();

    // Pernas animadas na caminhada
    const legSwing = en.isMoving ? Math.sin(en.walkCycle) * 0.45 : 0;
    const lLegM = Mat4.translate(Mat4.create(), m, [-0.15, 0.45, 0]);
    Mat4.rotateX(lLegM, lLegM, legSwing);
    gl.uniformMatrix4fv(renderer.uniforms.world, false, lLegM);
    enemyMeshes.leg.bind(renderer.attribs);
    enemyMeshes.leg.draw();

    const rLegM = Mat4.translate(Mat4.create(), m, [0.15, 0.45, 0]);
    Mat4.rotateX(rLegM, rLegM, -legSwing);
    gl.uniformMatrix4fv(renderer.uniforms.world, false, rLegM);
    enemyMeshes.leg.bind(renderer.attribs);
    enemyMeshes.leg.draw();

    // Braços com arma apontada
    const rArmM = Mat4.translate(Mat4.create(), m, [0.32, 1.15, 0.15]);
    Mat4.rotateX(rArmM, rArmM, -Math.PI / 2.5);
    gl.uniformMatrix4fv(renderer.uniforms.world, false, rArmM);
    enemyMeshes.arm.bind(renderer.attribs);
    enemyMeshes.arm.draw();

    // Arma 3D na mão do inimigo
    const gunM = Mat4.translate(Mat4.create(), rArmM, [0, -0.32, 0.15]);
    gl.uniformMatrix4fv(renderer.uniforms.world, false, gunM);
    enemyMeshes.gun.bind(renderer.attribs);
    enemyMeshes.gun.draw();
  }

  /* ---- RENDERIZACAO DA FACA E ARMAS EM PRIMEIRA PESSOA (3D FPS PASS) ---- */
  function renderFirstPersonWeapons3D(gl, renderer, aspect) {
    const ws = getCurrentWeapon();
    if (!ws) return;

    // Limpa apenas o depth buffer para a arma em primeira pessoa (não colide com paredes)
    gl.clear(gl.DEPTH_BUFFER_BIT);

    // Projeção FPS dedicada (FOV confortável de 65 graus)
    const fpProj = Mat4.perspective(Mat4.create(), (65 * Math.PI) / 180, aspect, 0.02, 10.0);
    gl.uniformMatrix4fv(renderer.uniforms.proj, false, fpProj);

    // Câmera local na origem
    const fpView = Mat4.identity(Mat4.create());
    gl.uniformMatrix4fv(renderer.uniforms.view, false, fpView);

    // Desativa texturas e usa iluminação rica nos modelos das armas
    gl.uniform1f(renderer.uniforms.useTexture, 0.0);
    gl.uniform1f(renderer.uniforms.specular, 0.65);
    gl.uniform1f(renderer.uniforms.roughness, 0.4);

    // Bobbing dinâmico das mãos
    const bobX = Math.cos(player.bobbingTime * 0.5) * 0.014;
    const bobY = Math.abs(Math.sin(player.bobbingTime)) * 0.016;

    // Matriz base da mão e da arma em relação à tela
    const gunMat = Mat4.identity(Mat4.create());
    Mat4.translate(gunMat, gunMat, [
      0.22 + weaponSwayX + bobX + recoilSideX,
      -0.22 + weaponSwayY + bobY - recoilRecoilY,
      -0.45
    ]);

    // Recuo de inclinação (Pitch kick)
    if (recoilKickPitch > 0.005) {
      Mat4.rotateX(gunMat, gunMat, -recoilKickPitch * 0.7);
    }

    if (ws.def.id === 'knife') {
      // ==========================================
      // FACA TATICA 3D E ANIMACAO DE GIRO (TECLA V)
      // ==========================================
      const knifeMat = Mat4.copy(Mat4.create(), gunMat);

      if (player.isKnifeSpinning) {
        // Giro 3D completo de 360 graus ao redor do pivô do cabo/guarda
        const p = player.knifeSpinProgress;
        const spinAngle = p * Math.PI * 2;
        Mat4.translate(knifeMat, knifeMat, [0.0, 0.04, 0.0]); // Sobe levemente durante o giro
        Mat4.rotateX(knifeMat, knifeMat, spinAngle * 1.5);    // Rotação principal
        Mat4.rotateY(knifeMat, knifeMat, Math.sin(p * Math.PI) * 0.8); // Inclinação angular que pega luz
        Mat4.rotateZ(knifeMat, knifeMat, Math.sin(p * Math.PI * 2) * 0.35);
      } else if (player.isKnifeSlashing) {
        // Golpe de corte transversal em 3D (LMB)
        const p = player.knifeSlashProgress;
        const slashRot = Math.sin(p * Math.PI) * 1.4;
        Mat4.translate(knifeMat, knifeMat, [-p * 0.25, -Math.sin(p * Math.PI) * 0.1, p * 0.15]);
        Mat4.rotateY(knifeMat, knifeMat, -slashRot);
        Mat4.rotateZ(knifeMat, knifeMat, -slashRot * 0.8);
      } else {
        // Postura padrão pronta de combate
        Mat4.rotateY(knifeMat, knifeMat, 0.25);
        Mat4.rotateX(knifeMat, knifeMat, 0.35);
      }

      // Renderiza a Faca Tática 3D
      gl.uniformMatrix4fv(renderer.uniforms.world, false, knifeMat);
      fpWeapons.knife.bind(renderer.attribs);
      fpWeapons.knife.draw();

      // Renderiza a mão segurando o cabo da faca
      const handM = Mat4.translate(Mat4.create(), knifeMat, [0.0, -0.16, 0.0]);
      gl.uniformMatrix4fv(renderer.uniforms.world, false, handM);
      fpWeapons.hand.bind(renderer.attribs);
      fpWeapons.hand.draw();

    } else {
      // ==========================================
      // ARMAS DE FOGO 3D (GLOCK, DEAGLE, SILENCED, M4)
      // ==========================================
      const weaponMesh = fpWeapons[ws.def.id] || fpWeapons.glock;
      gl.uniformMatrix4fv(renderer.uniforms.world, false, gunMat);
      weaponMesh.bind(renderer.attribs);
      weaponMesh.draw();

      // Mão segurando a coronha/grip
      const handM = Mat4.translate(Mat4.create(), gunMat, [0.0, -0.05, -0.06]);
      gl.uniformMatrix4fv(renderer.uniforms.world, false, handM);
      fpWeapons.hand.bind(renderer.attribs);
      fpWeapons.hand.draw();
    }
  }

  /* ===========================================================================
     17. MINIMAPA TATICO 2D
     =========================================================================== */
  function renderMinimap() {
    if (!minimapCtx) return;
    const mw = minimapCanvas.width, mh = minimapCanvas.height;
    minimapCtx.clearRect(0, 0, mw, mh);
    const cw = mw / MAP_W, ch = mh / MAP_H;

    minimapCtx.fillStyle = '#080a0d'; minimapCtx.fillRect(0, 0, mw, mh);
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (worldMap[y][x] > 0) {
          minimapCtx.fillStyle = '#262f3a';
          minimapCtx.fillRect(x * cw, y * ch, cw, ch);
        }
      }
    }
    // Baú
    if (!chestOpened) {
      minimapCtx.fillStyle = '#facc15';
      minimapCtx.fillRect(20.5 * cw - 2, 25.5 * ch - 2, 4, 4);
    }
    // Saída
    if (chestOpened) {
      minimapCtx.fillStyle = '#22c55e';
      minimapCtx.fillRect(32.0 * cw - 2, 36.0 * ch - 2, 4, 4);
    }
    // Inimigos
    enemies.forEach(en => {
      if (!en.alive) return;
      const ex = (en.x / CELL_SIZE + MAP_W / 2) * cw;
      const ey = (en.z / CELL_SIZE + MAP_H / 2) * ch;
      minimapCtx.fillStyle = en.state === 'chase' ? '#ef4444' : '#f97316';
      minimapCtx.beginPath(); minimapCtx.arc(ex, ey, 2.2, 0, Math.PI * 2); minimapCtx.fill();
    });
    // Jogador 3D
    const px = (player.x / CELL_SIZE + MAP_W / 2) * cw;
    const py = (player.z / CELL_SIZE + MAP_H / 2) * ch;
    minimapCtx.fillStyle = '#22c55e';
    minimapCtx.beginPath(); minimapCtx.arc(px, py, 3.2, 0, Math.PI * 2); minimapCtx.fill();
    // Cone de visão
    const fX = -Math.sin(player.yaw) * 6, fY = -Math.cos(player.yaw) * 6;
    minimapCtx.strokeStyle = 'rgba(34,197,94,0.6)'; minimapCtx.lineWidth = 1.5;
    minimapCtx.beginPath(); minimapCtx.moveTo(px, py); minimapCtx.lineTo(px + fX, py + fY); minimapCtx.stroke();
  }

  /* ===========================================================================
     18. PREVIEWS E INTERFACES DO LOBBY
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

    if (state === 'STORY') startStory();
    if (state === 'LOADING') startLoading();
    if (state === 'SETTINGS') populateSettingsUI();
    if (state === 'NEWWEAPON') drawNewWeaponPreview();
  }

  function hideAllScreens() {
    [lobbyScreen, charSelectScreen, difficultyScreen, weaponSelectScreen,
      storyScreen, loadingScreen, pauseScreen, gameOverScreen, newWeaponScreen,
      missionCompleteScreen, settingsScreen].forEach(s => { if (s) s.classList.add('hidden'); });
    if (lockPrompt) lockPrompt.classList.add('hidden');
  }

  function generateLobbyParticles() {
    const cont = document.getElementById('lobbyParticles');
    if (!cont) return;
    cont.innerHTML = '';
    for (let i = 0; i < 45; i++) {
      const p = document.createElement('div');
      p.className = 'lobby-particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDuration = (5 + Math.random() * 12) + 's';
      p.style.opacity = (0.2 + Math.random() * 0.6).toString();
      p.style.width = p.style.height = (1 + Math.random() * 3) + 'px';
      cont.appendChild(p);
    }
  }

  let storyInterval = null;
  function startStory() {
    const textEl = document.getElementById('storyText');
    const titleEl = document.getElementById('storyMissionTitle');
    if (!textEl) return;
    textEl.innerHTML = '';
    titleEl.classList.add('hidden');
    let lineIdx = 0, charIdx = 0;
    const lines = [
      "Operacao militar subterranea em curso.",
      "A equipe de extracao foi neutralizada.",
      "",
      "Voce esta sozinho na mina abandonada.",
      "",
      "Geometria hostil. Inimigos armados.",
      "",
      "Elimine as patrulhas. Localize o baú de suprimentos.",
      "",
      "Encontre a saida da caverna 3D."
    ];
    clearInterval(storyInterval);
    storyInterval = setInterval(() => {
      if (lineIdx >= lines.length) {
        clearInterval(storyInterval);
        if (titleEl) titleEl.classList.remove('hidden');
        setTimeout(() => showScreen('LOADING'), 2000);
        return;
      }
      const line = lines[lineIdx];
      if (charIdx < line.length) {
        textEl.innerHTML += line[charIdx++];
      } else {
        textEl.innerHTML += '<br>';
        lineIdx++; charIdx = 0;
      }
    }, 38);
  }

  function startLoading() {
    clearInterval(storyInterval);
    let progress = 0;
    const bar = document.getElementById('loadingBarFill');
    const status = document.getElementById('loadingStatus');
    const iv = setInterval(() => {
      progress += 6 + Math.random() * 10;
      if (progress > 100) progress = 100;
      if (bar) bar.style.width = progress + '%';
      if (status) status.textContent = 'Carregando Malhas WebGL 3D... ' + Math.floor(progress) + '%';
      if (progress >= 100) {
        clearInterval(iv);
        setTimeout(() => { hideAllScreens(); startMission(); }, 400);
      }
    }, 90);
  }

  function populateSettingsUI() {
    const ms = document.getElementById('settingMasterVol');
    const fxs = document.getElementById('settingFxVol');
    const sens = document.getElementById('settingSensitivity');
    const fps = document.getElementById('settingShowFPS');
    const cross = document.getElementById('settingCrosshair');
    if (ms) ms.value = Math.round(settings.masterVol * 100);
    if (fxs) fxs.value = Math.round(settings.fxVol * 100);
    if (sens) sens.value = settings.sensitivity;
    if (fps) fps.checked = settings.showFPS;
    if (cross) cross.checked = settings.showCrosshair;
    document.querySelectorAll('.quality-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.q === settings.quality);
    });
  }

  function drawCharPreviews() {
    ['charPreviewMale', 'charPreviewFemale'].forEach((id, idx) => {
      const c = document.getElementById(id); if (!c) return;
      const ctx2 = c.getContext('2d');
      ctx2.fillStyle = '#0f172a'; ctx2.fillRect(0, 0, c.width, c.height);
      ctx2.fillStyle = idx === 1 ? '#e8b898' : '#d4a070';
      ctx2.beginPath(); ctx2.arc(c.width / 2, 45, 22, 0, Math.PI * 2); ctx2.fill();
      ctx2.fillStyle = idx === 1 ? '#3a2c4a' : '#2a3848';
      ctx2.fillRect(c.width / 2 - 25, 75, 50, 70);
      ctx2.fillStyle = '#e2e8f0'; ctx2.font = 'bold 12px Rajdhani'; ctx2.textAlign = 'center';
      ctx2.fillText(idx === 1 ? 'AGENTE SARA' : 'AGENTE MARCUS', c.width / 2, 165);
    });
  }

  function drawWeaponPreviews() {
    [['weaponPreviewGlock', 'GLOCK 17'], ['weaponPreviewDeagle', 'DESERT EAGLE'], ['weaponPreviewSilenced', 'SILENCIADA']].forEach(([id, name]) => {
      const c = document.getElementById(id); if (!c) return;
      const ctx2 = c.getContext('2d');
      ctx2.fillStyle = '#0a0d14'; ctx2.fillRect(0, 0, c.width, c.height);
      ctx2.fillStyle = '#38bdf8'; ctx2.font = 'bold 14px Orbitron'; ctx2.textAlign = 'center';
      ctx2.fillText(name, c.width / 2, c.height / 2 + 5);
    });
  }

  function drawNewWeaponPreview() {
    const c = document.getElementById('newWeaponPreview'); if (!c) return;
    const ctx2 = c.getContext('2d');
    ctx2.fillStyle = '#0a0d14'; ctx2.fillRect(0, 0, c.width, c.height);
    ctx2.fillStyle = '#facc15'; ctx2.font = 'bold 20px Orbitron'; ctx2.textAlign = 'center';
    ctx2.fillText('M4A1 RIFLE 3D', c.width / 2, c.height / 2 + 8);
  }

})();
