/* OVERDRIVE — a self-contained canvas racing engine. */
(() => {
  'use strict';

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const mix = (a, b, t) => a + (b - a) * t;
  const fract = n => n - Math.floor(n);
  const hash = n => fract(Math.sin(n * 127.1 + 73.7) * 43758.5453);
  const AI_COLORS = ['#fa625d', '#f7cb57', '#78daf2', '#aa86ff', '#f498d1', '#f5f2e7', '#54dcae', '#f49254', '#7498ff', '#e7dc69'];
  const TRACK_LENGTH = 2800;
  const LAPS = 3;
  const RACE_LENGTH = TRACK_LENGTH * LAPS;
  const VIEW = 850;

  class OverdriveGame {
    constructor(canvas, options = {}) {
      if (!canvas || typeof canvas.getContext !== 'function') throw new Error('OverdriveGame requires a canvas');
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.options = options;
      this.location = options.location || {};
      this.car = options.car || {};
      this.keys = Object.create(null);
      this.running = false;
      this.frame = null;
      this.lastFrame = 0;
      this._loop = this._loop.bind(this);
      this._reset();
      this._resize();
      this._render();
    }

    _reset() {
      this.distance = 0;
      this.speed = 0;
      this.x = 0;
      this.time = 0;
      this.overdrive = 40;
      this.boostTime = 0;
      this.finished = false;
      this.collisionCooldown = 0;
      this.shake = 0;
      this.flash = 0;
      this.updateClock = 0;
      this.ai = AI_COLORS.map((color, i) => ({
        id: i, color, distance: 45 + i * 22, x: (i % 3 - 1) * 0.54 + (hash(i + 8) - 0.5) * 0.14,
        baseX: (i % 3 - 1) * 0.54, speed: 181 + hash(i + 2) * 37,
        phase: hash(i + 40) * Math.PI * 2, passed: false, finishedAt: null
      }));
    }

    start() {
      if (this.running) return;
      if (this.finished) this._reset();
      this.running = true;
      this.lastFrame = 0;
      this._emit();
      this.frame = requestAnimationFrame(this._loop);
    }

    stop() {
      this.running = false;
      if (this.frame !== null) cancelAnimationFrame(this.frame);
      this.frame = null;
      this.lastFrame = 0;
      this.keys = Object.create(null);
    }

    setInput(key, down) {
      const aliases = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', ' ': 'boost', Space: 'boost', Spacebar: 'boost' };
      const k = aliases[key] || String(key).toLowerCase();
      const wasDown = !!this.keys[k];
      this.keys[k] = !!down;
      if (k === 'boost' && down && !wasDown && this.running && !this.finished && this.boostTime <= 0 && this.overdrive >= 35) {
        this.overdrive -= 35;
        this.boostTime = 3.5;
        this.flash = 0.7;
      }
    }

    _loop(timestamp) {
      if (!this.running) return;
      const dt = this.lastFrame ? Math.min((timestamp - this.lastFrame) / 1000, 0.05) : 0;
      this.lastFrame = timestamp;
      this._resize();
      if (dt) this._step(dt);
      this._render();
      if (this.running) this.frame = requestAnimationFrame(this._loop);
    }

    _stat(value, fallback) {
      const v = Number(value);
      if (!Number.isFinite(v)) return fallback;
      // Accept either a 1–10 rating or a 0–100 rating.
      return clamp(v > 10 ? v / 100 : v / 10, 0, 1);
    }

    _step(dt) {
      this.time += dt;
      this.collisionCooldown = Math.max(0, this.collisionCooldown - dt);
      this.shake = Math.max(0, this.shake - dt * 2);
      this.flash = Math.max(0, this.flash - dt * 2);
      this.boostTime = Math.max(0, this.boostTime - dt);
      const top = 235 + this._stat(this.car.speed, 0.65) * 35;
      const handling = this._stat(this.car.handling, 0.65);
      const boosting = this.boostTime > 0;
      if (this.keys.up) this.speed += (this.speed < top ? 46 : 13) * dt;
      else this.speed -= 25 * dt;
      if (this.keys.down) this.speed -= 100 * dt;
      if (boosting) this.speed += 75 * dt;
      this.speed = clamp(this.speed, 0, top + (boosting ? 65 : 0));
      const steering = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
      this.x += steering * (0.95 + handling * 0.65) * dt * clamp(this.speed / 85, 0.15, 1);
      // Curves gently push the car outward; steering matters even on an empty road.
      this.x -= this._curveStrength(this.distance) * dt * (this.speed / top) * 0.22;
      this.x = clamp(this.x, -1.42, 1.42);
      if (Math.abs(this.x) > 0.94) this.speed = Math.max(40, this.speed - 75 * dt);
      this.distance += this.speed * dt;
      if (this.speed > 90 && Math.abs(this.x) < 0.94) this.overdrive = Math.min(100, this.overdrive + (0.65 + this.speed / 450) * dt);

      for (const ai of this.ai) {
        const previous = ai.distance - this.distance + this.speed * dt;
        const pace = ai.speed * (1 + 0.045 * Math.sin(this.time * 0.22 + ai.phase));
        ai.distance += pace * dt;
        ai.x = clamp(ai.baseX + Math.sin(this.time * 0.55 + ai.phase) * 0.15, -0.78, 0.78);
        if (ai.distance >= RACE_LENGTH && ai.finishedAt === null) ai.finishedAt = this.time;
        const gap = ai.distance - this.distance;
        const lateral = Math.abs(this.x - ai.x);
        if (Math.abs(gap) < 12 && lateral < 0.19 && this.collisionCooldown <= 0) {
          this.speed *= 0.62;
          this.x = clamp(this.x + (this.x >= ai.x ? 0.18 : -0.18), -1.42, 1.42);
          this.collisionCooldown = 1;
          this.shake = 0.8;
          this.flash = 0.45;
        }
        if (previous > 0 && gap <= 0 && lateral >= 0.19 && lateral < 0.43 && !ai.passed) {
          this.overdrive = Math.min(100, this.overdrive + 16);
          ai.passed = true;
          this.flash = 0.35;
        }
        if (gap > 45) ai.passed = false;
      }
      this.updateClock += dt;
      if (this.updateClock >= 0.1) {
        this.updateClock = 0;
        this._emit();
      }
      if (this.distance >= RACE_LENGTH) {
        this.distance = RACE_LENGTH;
        this.finished = true;
        this._emit();
        const result = { ...this._state(), location: this.location, car: this.car };
        this.running = false;
        this.frame = null;
        if (typeof this.options.onFinish === 'function') this.options.onFinish(result);
      }
    }

    _state() {
      const place = 1 + this.ai.filter(ai => ai.distance > this.distance || ai.finishedAt !== null).length;
      return {
        speed: Math.round(this.speed), position: this.x, progress: clamp(this.distance / RACE_LENGTH, 0, 1),
        overdrive: Math.round(this.overdrive), lap: Math.min(LAPS, Math.floor(this.distance / TRACK_LENGTH) + 1),
        laps: LAPS, distance: this.distance, totalDistance: RACE_LENGTH, time: this.time,
        place, boostActive: this.boostTime > 0
      };
    }

    _emit() {
      if (typeof this.options.onUpdate === 'function') this.options.onUpdate(this._state());
    }

    _resize() {
      const rect = this.canvas.getBoundingClientRect();
      const w = Math.max(1, rect.width || this.canvas.clientWidth || 800);
      const h = Math.max(1, rect.height || this.canvas.clientHeight || 450);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pw = Math.round(w * dpr), ph = Math.round(h * dpr);
      if (this.canvas.width !== pw || this.canvas.height !== ph) {
        this.canvas.width = pw;
        this.canvas.height = ph;
      }
      this.w = w;
      this.h = h;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    _curveStrength(d) {
      return Math.sin(d / 430) * 0.8 + Math.sin(d / 190 + 1.3) * 0.32;
    }

    _road(d) {
      const t = 1 - Math.sqrt(clamp(d / VIEW, 0, 1));
      const y = this.h * 0.36 + Math.pow(t, 1.13) * this.h * 0.64;
      const half = this.w * (0.022 + 0.49 * Math.pow(t, 1.3));
      const bend = (this._curveStrength(this.distance + d * 0.65) + this._curveStrength(this.distance)) * 0.5;
      const center = this.w * 0.5 - this.x * half * 0.68 + bend * this.w * 0.28 * Math.pow(d / VIEW, 0.8);
      return { x: center, y, half, t };
    }

    _palette() {
      const p = this.location.palette || {};
      if (Array.isArray(p)) return { sky: p[0] || '#253f6b', horizon: p[1] || '#f2a783', ground: p[2] || '#a77364', accent: p[3] || '#ffdd9c', road: '#343a49' };
      return { sky: p.sky || p.skyTop || '#263f6a', horizon: p.horizon || p.skyBottom || '#f4a580', ground: p.ground || p.sand || '#b98270', accent: p.accent || '#ffdc9b', road: p.road || '#343a49' };
    }

    _polygon(points, color) {
      const ctx = this.ctx;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
      ctx.closePath();
      ctx.fill();
    }

    _render() {
      const ctx = this.ctx, w = this.w, h = this.h, p = this._palette();
      ctx.save();
      ctx.clearRect(0, 0, w, h);
      this._drawSky(p);
      this._drawRoad(p);
      this._drawObjects(p);
      this._drawPlayer();
      if (this.boostTime > 0) this._drawBoost();
      if (this.flash > 0) {
        ctx.fillStyle = `rgba(255,235,191,${this.flash * 0.16})`;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.restore();
    }

    _drawSky(p) {
      const ctx = this.ctx, w = this.w, h = this.h, horizon = h * 0.36;
      const sky = ctx.createLinearGradient(0, 0, 0, horizon * 1.15);
      sky.addColorStop(0, p.sky); sky.addColorStop(1, p.horizon);
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, horizon + 2);
      const sunX = w * 0.74, sunY = h * 0.19, radius = Math.max(12, h * 0.075);
      const glow = ctx.createRadialGradient(sunX, sunY, radius * 0.15, sunX, sunY, radius * 2.4);
      glow.addColorStop(0, 'rgba(255,238,188,.55)'); glow.addColorStop(1, 'rgba(255,238,188,0)');
      ctx.fillStyle = glow; ctx.fillRect(sunX - radius * 2.5, sunY - radius * 2.5, radius * 5, radius * 5);
      ctx.fillStyle = '#ffe4ae'; ctx.beginPath(); ctx.arc(sunX, sunY, radius, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = '#fff2db';
      for (let i = 0; i < 5; i++) {
        const x = w * (0.08 + i * 0.21), y = h * (0.09 + hash(i + 60) * 0.13);
        ctx.fillRect(x, y, w * (0.08 + hash(i + 70) * 0.1), Math.max(1, h * 0.003));
      }
      ctx.restore();
      const drift = this._curveStrength(this.distance) * w * 0.015;
      this._polygon([[0,horizon],[0,horizon-h*0.095],[w*0.12+drift,horizon-h*0.19],[w*0.24+drift,horizon-h*0.075],[w*0.35,horizon-h*0.13],[w*0.49,horizon],[w,horizon]], '#707087');
      this._polygon([[0,horizon],[0,horizon-h*0.045],[w*0.16+drift,horizon-h*0.11],[w*0.29,horizon-h*0.035],[w*0.43,horizon-h*0.085],[w*0.57,horizon],[w*0.72,horizon-h*0.08],[w*0.85,horizon-h*0.035],[w,horizon-h*0.09],[w,horizon]], '#8b8290');
      ctx.fillStyle = 'rgba(255,216,181,.25)'; ctx.fillRect(0, horizon - h * 0.012, w, h * 0.016);
    }

    _drawRoad(p) {
      const ctx = this.ctx, w = this.w, n = 120;
      const point = t => this._road(VIEW * (1 - t) * (1 - t));
      for (let i = 0; i < n; i++) {
        const t0 = i / n, t1 = (i + 1) / n;
        const a = point(t0), b = point(t1);
        const d = VIEW * (1 - (t0 + t1) / 2) ** 2;
        const segment = Math.floor((this.distance + d) / 42);
        const stripe = segment % 2 === 0;
        ctx.fillStyle = p.ground; ctx.fillRect(0, a.y, w, b.y - a.y + 1);
        if (stripe) { ctx.fillStyle = 'rgba(83,46,54,.08)'; ctx.fillRect(0, a.y, w, b.y - a.y + 1); }
        this._polygon([[a.x-a.half*1.12,a.y],[a.x+a.half*1.12,a.y],[b.x+b.half*1.12,b.y+1],[b.x-b.half*1.12,b.y+1]], stripe ? '#f3e7d4' : '#d9685e');
        this._polygon([[a.x-a.half,a.y],[a.x+a.half,a.y],[b.x+b.half,b.y+1],[b.x-b.half,b.y+1]], p.road);
        if (stripe) {
          this._polygon([[a.x-a.half,a.y],[a.x+a.half,a.y],[b.x+b.half,b.y+1],[b.x-b.half,b.y+1]], 'rgba(255,255,255,.025)');
          for (const lane of [-1/3, 1/3]) {
            this._polygon([[a.x+a.half*(lane-0.007),a.y],[a.x+a.half*(lane+0.007),a.y],[b.x+b.half*(lane+0.007),b.y+1],[b.x+b.half*(lane-0.007),b.y+1]], 'rgba(255,244,220,.65)');
          }
        }
        for (const side of [-1, 1]) {
          const edge = side * 0.965;
          this._polygon([[a.x+a.half*(edge-0.006),a.y],[a.x+a.half*(edge+0.006),a.y],[b.x+b.half*(edge+0.006),b.y+1],[b.x+b.half*(edge-0.006),b.y+1]], 'rgba(255,245,223,.68)');
        }
      }
    }

    _drawObjects(p) {
      const objects = [];
      const start = Math.floor(this.distance / 95);
      for (let i = start; i <= start + Math.ceil(VIEW / 95) + 1; i++) {
        const d = i * 95 - this.distance;
        if (d <= 12 || d > VIEW) continue;
        objects.push({ d, kind: 'scenery', index: i, side: i % 2 ? -1 : 1 });
        if (i % 3 === 0) objects.push({ d: d + 2, kind: 'scenery', index: i + 71, side: i % 2 ? 1 : -1 });
      }
      for (const ai of this.ai) {
        const d = ai.distance - this.distance;
        if (d > 2 && d < VIEW) objects.push({ d, kind: 'car', ai });
      }
      objects.sort ( (a, b) => b.d - a.d );
      for (const object of objects) {
        const road = this._road(object.d);
        if (object.kind === 'car') {
          const scale = clamp(road.half * 0.24, 2, this.w * 0.12);
          this._drawCar(road.x + object.ai.x * road.half * 0.84, road.y, scale, object.ai.color, false);
        } else {
          this._drawScenery(road, object.side, object.index, p);
        }
      }
    }

    _drawScenery(road, side, index, p) {
      const ctx = this.ctx;
      const scale = road.half;
      const x = road.x + side * scale * (1.24 + hash(index + 12) * 0.25), y = road.y;
      if (scale < 3) return;
      if (index % 4 === 0) {
        const width = scale * 0.29, height = scale * 0.19;
        ctx.fillStyle = '#e9d8bd'; ctx.fillRect(x - width * 0.48, y - height * 2.5, width * 0.08, height * 2.5);
        ctx.fillStyle = '#25394a'; ctx.fillRect(x - width * 0.65, y - height * 3.1, width * 1.3, height);
        ctx.fillStyle = p.accent; ctx.fillRect(x - width * 0.51, y - height * 2.97, width * 1.02, height * 0.09);
        this._polygon([[x-side*width*0.25,y-height*2.85],[x+side*width*0.18,y-height*2.65],[x-side*width*0.25,y-height*2.45]], '#f7e8d2');
      } else {
        const trunk = scale * (0.46 + hash(index + 19) * 0.25);
        const lean = side * trunk * 0.1;
        ctx.strokeStyle = '#5c4d4a'; ctx.lineWidth = Math.max(1, scale * 0.038); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + lean, y - trunk * 0.55, x + lean * 0.7, y - trunk); ctx.stroke();
        const topX = x + lean * 0.7, topY = y - trunk;
        ctx.strokeStyle = index % 2 ? '#405e58' : '#49645b'; ctx.lineWidth = Math.max(1, scale * 0.05);
        for (let j = -2; j <= 2; j++) {
          ctx.beginPath(); ctx.moveTo(topX, topY); ctx.quadraticCurveTo(topX + j * scale * 0.11, topY - scale * 0.16, topX + j * scale * 0.2, topY + scale * 0.07 + Math.abs(j) * scale * 0.025); ctx.stroke();
        }
      }
    }

    _drawCar(x, y, width, color, player) {
      const ctx = this.ctx;
      if (width < 2) return;
      const s = width, h = s * 0.62;
      ctx.save();
      ctx.translate(x, y);
      if (player && this.shake > 0) ctx.translate(Math.sin(this.time * 65) * this.shake * 4, 0);
      ctx.fillStyle = 'rgba(10,14,24,.35)';
      ctx.beginPath(); ctx.ellipse(0, -s * 0.015, s * 0.62, s * 0.11, 0, 0, Math.PI * 2); ctx.fill();
      if (player && this.boostTime > 0) {
        const flame = s * (0.25 + 0.12 * Math.sin(this.time * 32));
        for (const side of [-1, 1]) {
          this._polygon([[side*s*0.26-s*0.06,-s*0.07],[side*s*0.26+s*0.06,-s*0.07],[side*s*0.26,flame]], '#65e6ff');
          this._polygon([[side*s*0.26-s*0.025,-s*0.04],[side*s*0.26+s*0.025,-s*0.04],[side*s*0.26,flame*0.65]], '#fff6d8');
        }
      }
      ctx.fillStyle = '#171a22';
      ctx.fillRect(-s*0.49,-h*0.40,s*0.16,h*0.39); ctx.fillRect(s*0.33,-h*0.40,s*0.16,h*0.39);
      this._polygon([[-s*0.49,-h*0.18],[-s*0.47,-h*0.58],[-s*0.33,-h*0.78],[-s*0.27,-h*0.96],[s*0.27,-h*0.96],[s*0.33,-h*0.78],[s*0.47,-h*0.58],[s*0.49,-h*0.18],[s*0.38,-h*0.07],[-s*0.38,-h*0.07]], color || '#f16b55');
      this._polygon([[-s*0.34,-h*0.76],[-s*0.25,-h*1.04],[s*0.25,-h*1.04],[s*0.34,-h*0.76]], '#252f3c');
      this._polygon([[-s*0.25,-h*1.01],[s*0.25,-h*1.01],[s*0.30,-h*0.79],[-s*0.30,-h*0.79]], '#728d98');
      this._polygon([[-s*0.22,-h*0.98],[-s*0.08,-h*0.98],[-s*0.18,-h*0.82],[-s*0.26,-h*0.82]], 'rgba(255,255,255,.25)');
      this._polygon([[-s*0.45,-h*0.54],[s*0.45,-h*0.54],[s*0.46,-h*0.36],[-s*0.46,-h*0.36]], 'rgba(20,25,34,.27)');
      ctx.fillStyle = '#ffdad0'; ctx.fillRect(-s*0.41,-h*0.47,s*0.20,h*0.09); ctx.fillRect(s*0.21,-h*0.47,s*0.20,h*0.09);
      ctx.fillStyle = '#f15354'; ctx.fillRect(-s*0.40,-h*0.46,s*0.18,h*0.06); ctx.fillRect(s*0.22,-h*0.46,s*0.18,h*0.06);
      ctx.fillStyle = '#222a32'; ctx.fillRect(-s*0.15,-h*0.30,s*0.30,h*0.10);
      ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(-s*0.37,-h*0.62,s*0.74,Math.max(1,h*0.025));
      if (player) {
        ctx.fillStyle = '#e9e9df'; ctx.fillRect(-s*0.09,-h*0.29,s*0.18,h*0.065);
        ctx.fillStyle = 'rgba(255,255,255,.13)'; ctx.fillRect(-s*0.015,-h*0.68,s*0.03,h*0.10);
      }
      ctx.restore();
    }

    _drawPlayer() {
      const w = this.w, h = this.h;
      const carWidth = Math.min(w * 0.24, h * 0.43);
      this._drawCar(w * 0.5, h * 0.94, carWidth, this.car.color || '#f06e57', true);
    }

    _drawBoost() {
      const ctx = this.ctx, w = this.w, h = this.h;
      ctx.save();
      const glow = ctx.createRadialGradient(w/2, h*0.8, h*0.12, w/2, h*0.7, h*0.8);
      glow.addColorStop(0, 'rgba(78,215,255,0)'); glow.addColorStop(1, 'rgba(76,208,255,.20)');
      ctx.fillStyle = glow; ctx.fillRect(0,0,w,h);
      ctx.strokeStyle = 'rgba(202,249,255,.44)'; ctx.lineWidth = Math.max(1, w*0.0015);
      for (let i = 0; i < 16; i++) {
        const side = i % 2 ? 1 : -1;
        const phase = fract(this.time * (0.65 + hash(i) * 0.3) + hash(i + 8));
        const x = w*0.5 + side * w * (0.18 + hash(i+20)*0.42);
        const y = h*(0.39 + phase*0.6);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + side*w*0.025, y + h*(0.035 + phase*0.08)); ctx.stroke();
      }
      ctx.restore();
    }
  }

  window.OverdriveGame = OverdriveGame;
})();
