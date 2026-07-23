/* ================= AUDIO SYNTHESIZER (AMBIENT RPG MUSIC & SOUND EFFECTS) ================= */
const MENU_MUSIC_SRC = "assets/music/Inicio_menus_2.mp3";
const Sound = {
  ctx: null,
  musicEnabled: false,
  musicTimer: null,
  melodyIndex: 0,
  barIndex: 0,
  
  melody: [
    [196.00, 300], [220.00, 300], [261.63, 600], [220.00, 300], [261.63, 300], [293.66, 600],
    [261.63, 300], [293.66, 300], [329.63, 600], [392.00, 600], [349.23, 300], [329.63, 300], [293.66, 600],
    [196.00, 300], [220.00, 300], [261.63, 600], [220.00, 300], [261.63, 300], [293.66, 600],
    [329.63, 300], [293.66, 300], [261.63, 600], [220.00, 600], [196.00, 600], [261.63, 600], [261.63, 600]
  ],
  scene: 'menu',
  musicGain: null,
  sfxGain: null,
  ambienceGain: null,
  menuAudioEl: null,
  tracks: {
    menu: [[196,520],[246.94,260],[293.66,520],[329.63,520],[293.66,260],[246.94,520],[220,520],[0,260]],
    hunt: [[220,260],[261.63,260],[293.66,220],[329.63,260],[349.23,420],[329.63,200],[293.66,260],[261.63,260],[246.94,260],[220,440],[261.63,260],[293.66,260],[329.63,260],[392.00,460],[349.23,220],[329.63,260],[293.66,260],[261.63,260],[220,520],[0,300]],
    battle: [[146.83,180],[196,180],[220,180],[246.94,180],[220,180],[196,180],[174.61,180],[220,180]],
    boss: [[110,210],[146.83,210],[164.81,210],[110,210],[130.81,210],[164.81,210],[196,420],[0,210]],
    bossPhase: [[73.42,150],[110,150],[146.83,150],[82.41,150],[123.47,150],[164.81,300],[196,150],[164.81,150]],
    danger: [[123.47,140],[146.83,140],[164.81,140],[196,140],[174.61,140],[146.83,140],[110,280],[0,140]]
  },

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      const master = this.ctx.createDynamicsCompressor();
      master.threshold.value = -18;
      master.knee.value = 20;
      master.ratio.value = 8;
      master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 1.4;
      this.musicGain.connect(master);
      this.ambienceGain = this.ctx.createGain();
      this.ambienceGain.gain.value = 0.7;
      this.ambienceGain.connect(master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 2.0;
      this.sfxGain.connect(master);

      this.menuAudioEl = new Audio(MENU_MUSIC_SRC);
      // No descargamos los 5 MB de música hasta que el jugador active el audio.
      // Esto acelera especialmente la primera visita desde datos móviles.
      this.menuAudioEl.preload = 'none';
      this.menuAudioEl.loop = true;
      this.menuAudioEl.volume = 1;
      this.menuAudioEl.addEventListener('error', () => {
        const err = this.menuAudioEl.error;
        console.warn('No se pudo cargar la música del menú (' + MENU_MUSIC_SRC + '). Código de error:', err && err.code);
      });
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.applyVolumes();
  },

  applyVolumes() {
    if (!this.ctx) return;
    const settings = (typeof state !== 'undefined' && state && state.settings) ? state.settings : {};
    const music = settings.musicEnabled === false ? 0 : (Number(settings.musicVolume ?? 55) / 100);
    const sfx = settings.sfxEnabled === false ? 0 : (Number(settings.sfxVolume ?? 70) / 100);
    if(this.musicGain) this.musicGain.gain.setTargetAtTime(1.4 * music, this.ctx.currentTime, .04);
    if(this.ambienceGain) this.ambienceGain.gain.setTargetAtTime(.7 * music, this.ctx.currentTime, .04);
    if(this.sfxGain) this.sfxGain.gain.setTargetAtTime(2.0 * sfx, this.ctx.currentTime, .04);
    if(this.menuAudioEl) this.menuAudioEl.volume = Math.max(0, Math.min(1, music));
  },

  syncMenuAudio() {
    if (!this.menuAudioEl) return;
    const settings = (typeof state !== 'undefined' && state && state.settings) ? state.settings : {};
    const musicOn = settings.musicEnabled !== false;
    const vol = Math.max(0, Math.min(1, Number(settings.musicVolume ?? 55) / 100));
    this.menuAudioEl.volume = vol;
    if (this.musicEnabled && musicOn && this.scene === 'menu') {
      if (this.menuAudioEl.paused) {
        this.menuAudioEl.currentTime = 0;
        this.menuAudioEl.play().catch(err => console.warn('No se pudo reproducir la música del menú:', err));
      }
    } else if (!this.menuAudioEl.paused) {
      this.menuAudioEl.pause();
    }
  },

  toggleMusic() {
    this.init();
    this.musicEnabled = !this.musicEnabled;
    if(typeof state !== 'undefined' && state && state.settings){ state.settings.musicEnabled = this.musicEnabled; saveState(); }
    this.applyVolumes();
    const icon = document.getElementById('musicIcon');
    
    if (this.musicEnabled) {
      icon.innerHTML = `<path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>`;
      if (this.scene === 'menu' && this.menuAudioEl) {
        this.syncMenuAudio();
      } else {
        this.playNextNote();
      }
    } else {
      icon.innerHTML = `<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM19 12c0 3.28-2 6.09-4.88 7.25l1.09 1.09C19 18.74 21 15.6 21 12c0-3.6-2-6.74-5.79-8.34l-1.09 1.09C17 5.91 19 8.72 19 12zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>`;
      if (this.musicTimer) {
        clearTimeout(this.musicTimer);
        this.musicTimer = null;
      }
      this.syncMenuAudio();
    }
    this.updateMusicControl();
  },

  setScene(scene) {
    if (!this.tracks[scene] || this.scene === scene) return;
    this.scene = scene;
    this.melodyIndex = 0;
    this.barIndex = 0;
    if(this.musicGain && this.ctx){
      const settings = (typeof state !== 'undefined' && state && state.settings) ? state.settings : {};
      const targetVolume = settings.musicEnabled === false ? 0 : 1.4 * (Number(settings.musicVolume ?? 55) / 100);
      this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.musicGain.gain.setValueAtTime(.05, this.ctx.currentTime);
      this.musicGain.gain.linearRampToValueAtTime(targetVolume, this.ctx.currentTime+.22);
    }
    if (this.musicEnabled) {
      if (this.musicTimer) clearTimeout(this.musicTimer);
      if (scene === 'menu' && this.menuAudioEl) {
        this.syncMenuAudio();
      } else {
        this.syncMenuAudio();
        this.playNextNote();
      }
    } else {
      this.syncMenuAudio();
    }
    this.updateMusicControl();
  },

  updateMusicControl() {
    const toggle = document.getElementById('musicToggle');
    if (!toggle) return;
    const names = { menu:'Forja Eterna', hunt:'Expedición', battle:'Combate', boss:'Jefe', bossPhase:'Jefe · Fase II', danger:'Peligro' };
    toggle.classList.toggle('active', this.musicEnabled);
    toggle.dataset.audioLabel = this.musicEnabled ? `♫ ${names[this.scene] || 'Música'} · clic para silenciar` : '♫ Activar música y efectos';
    toggle.setAttribute('aria-pressed', String(this.musicEnabled));
  },

  musicTone(freq, duration, type='triangle', volume=.045) {
    if (!freq || !this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(.001, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime+.025);
    gain.gain.exponentialRampToValueAtTime(.001, this.ctx.currentTime+duration/1000*.92);
    osc.connect(gain); gain.connect(this.musicGain);
    osc.start(); osc.stop(this.ctx.currentTime+duration/1000);
  },

  percussion(low=false) {
    if(!this.ctx || !this.musicEnabled) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    const at = this.ctx.currentTime;
    osc.frequency.setValueAtTime(low ? 82 : 130, at);
    osc.frequency.exponentialRampToValueAtTime(35, at+.11);
    gain.gain.setValueAtTime(.035, at);
    gain.gain.exponentialRampToValueAtTime(.001, at+.13);
    osc.connect(gain); gain.connect(this.musicGain);
    osc.start(at); osc.stop(at+.14);
  },

  pad(root) {
    if(!this.ctx || !this.musicEnabled || !root) return;
    [1, 1.25, 1.5].forEach((ratio, index)=>{
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const at = this.ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(root * ratio, at);
      gain.gain.setValueAtTime(.001, at);
      gain.gain.linearRampToValueAtTime(.016/(index+1), at+.12);
      gain.gain.exponentialRampToValueAtTime(.001, at+.78);
      osc.connect(gain); gain.connect(this.ambienceGain);
      osc.start(at); osc.stop(at+.82);
    });
  },

  noise(duration=.09, volume=.04, frequency=1450, type='bandpass', delay=0) {
    if(!this.ctx) return;
    const at = this.ctx.currentTime + delay;
    const size = Math.ceil(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for(let i=0;i<size;i++) data[i] = (Math.random()*2-1) * (1-i/size);
    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    filter.type = type; filter.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, at);
    source.buffer = buffer; source.connect(filter); filter.connect(gain); gain.connect(this.sfxGain || this.ctx.destination);
    source.start(at);
  },

  sfxTone(freq, duration=.12, type='triangle', volume=.08, slideTo=0, delay=0) {
    this.init();
    if(!this.ctx) return;
    const at = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(24, freq), at);
    if(slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(24, slideTo), at + duration*.88);
    osc.detune.setValueAtTime((Math.random()-.5)*9, at);
    gain.gain.setValueAtTime(.001, at);
    gain.gain.linearRampToValueAtTime(volume, at+.008);
    gain.gain.exponentialRampToValueAtTime(.001, at+duration);
    osc.connect(gain); gain.connect(this.sfxGain || this.ctx.destination);
    osc.start(at); osc.stop(at+duration+.02);
  },

  classAttack(classId) {
    this.init();
    if(classId==='warrior'){
      this.noise(.075,.045,2100,'highpass'); this.sfxTone(180,.13,'sawtooth',.10,72); this.sfxTone(700,.045,'square',.025,430,.018);
    } else if(classId==='archer'){
      this.sfxTone(1040,.045,'square',.045,640); this.noise(.11,.028,3100,'highpass'); this.sfxTone(245,.11,'triangle',.035,110,.045);
    } else if(classId==='mage'){
      this.sfxTone(240,.16,'sine',.055,620); this.sfxTone(480,.15,'triangle',.032,920,.025); this.noise(.08,.018,2500,'bandpass');
    } else if(classId==='priest'){
      this.sfxTone(523.25,.19,'sine',.065,783.99); this.sfxTone(1046.5,.09,'sine',.022,1318.5,.035);
    } else if(classId==='assassin'){
      this.noise(.055,.035,3400,'highpass'); this.sfxTone(510,.065,'sawtooth',.055,180); this.sfxTone(780,.07,'sawtooth',.048,240,.075);
    } else if(classId==='tamer'){
      this.sfxTone(1320,.06,'sine',.045,980); this.sfxTone(105,.14,'triangle',.075,48,.055); this.noise(.07,.025,800,'lowpass');
    } else this.hit();
  },

  classSkill(classId) {
    this.init();
    if(classId==='warrior'){
      this.sfxTone(92,.22,'sawtooth',.12,42); this.sfxTone(220,.15,'square',.06,96,.04); this.noise(.13,.07,760,'lowpass');
    } else if(classId==='archer'){
      this.sfxTone(420,.24,'triangle',.055,1320); this.noise(.14,.05,3600,'highpass'); this.sfxTone(1240,.09,'sine',.035,720,.11);
    } else if(classId==='mage'){
      [220,277.18,329.63].forEach((freq,index)=>this.sfxTone(freq,.30,'sine',.045,freq*2,index*.055)); this.noise(.2,.04,1800,'bandpass');
    } else if(classId==='priest'){
      [392,523.25,659.25,783.99].forEach((freq,index)=>this.sfxTone(freq,.34,'sine',.048,freq*1.5,index*.055));
    } else if(classId==='assassin'){
      this.noise(.16,.07,4100,'highpass'); [720,540,860].forEach((freq,index)=>this.sfxTone(freq,.105,'sawtooth',.065,110,index*.045));
    } else if(classId==='tamer'){
      this.sfxTone(1480,.10,'sine',.055,1040); this.sfxTone(150,.24,'triangle',.11,55,.08); this.noise(.17,.055,720,'lowpass');
    } else this.skill();
  },

  enemyAttack(monster, blocked=false) {
    this.init();
    if(blocked){ this.shield(); return; }
    const archetype = monster && monster.archetype ? monster.archetype.key : 'normal';
    if(archetype==='swift'){
      this.noise(.055,.04,2600,'highpass'); this.sfxTone(360,.09,'sawtooth',.07,120); this.sfxTone(430,.09,'sawtooth',.065,130,.09);
    } else if(archetype==='venom'){
      this.sfxTone(150,.18,'sine',.075,58); this.noise(.12,.045,660,'bandpass');
    } else if(archetype==='charger' || (monster && monster.charging)){
      this.sfxTone(96,.24,'sawtooth',.12,34); this.noise(.17,.08,420,'lowpass');
    } else if(archetype==='guardian'){
      this.sfxTone(145,.16,'square',.09,56); this.noise(.08,.04,1100,'bandpass');
    } else this.hit();
  },

  warning() {
    this.init();
    this.sfxTone(220,.12,'square',.08,165); this.sfxTone(165,.14,'square',.08,110,.15);
  },

  bossPhase() {
    this.init();
    this.noise(.28,.085,520,'lowpass'); [98,123.47,146.83].forEach((freq,index)=>this.sfxTone(freq,.34,'sawtooth',.095,freq*.62,index*.075));
  },

  breakSound() {
    this.init();
    this.noise(.18,.10,2100,'highpass'); this.sfxTone(680,.20,'square',.09,150); this.sfxTone(1020,.12,'sine',.05,520,.045);
  },

  heal() {
    this.init();
    [440,554.37,659.25].forEach((freq,index)=>this.sfxTone(freq,.24,'sine',.05,freq*1.28,index*.045));
  },

  mana() {
    this.init();
    [349.23,415.30,523.25].forEach((freq,index)=>this.sfxTone(freq,.26,'triangle',.045,freq*1.42,index*.05));
    this.noise(.09,.02,3800,'highpass');
  },

  shield() {
    this.init();
    this.sfxTone(180,.13,'triangle',.07,430); this.noise(.07,.032,1800,'bandpass');
  },

  dangerPulse() {
    this.init();
    this.sfxTone(220,.24,'sawtooth',.09,130);
    this.sfxTone(160,.3,'sawtooth',.07,90,130);
  },

  poison() {
    this.init();
    this.sfxTone(280,.19,'sawtooth',.05,72); this.noise(.12,.03,520,'bandpass');
  },

  playNextNote() {
    if (!this.musicEnabled) return;
    if (this.scene === 'menu' && this.menuAudioEl) return;

    const track = this.tracks[this.scene] || this.melody;
    const note = track[this.melodyIndex];
    const freq = note[0];
    const duration = note[1];

    if (freq > 0) {
      const tense = this.scene==='battle' || this.scene==='boss' || this.scene==='bossPhase' || this.scene==='danger';
      this.musicTone(freq, duration, (this.scene==='boss' || this.scene==='bossPhase') ? 'sawtooth' : 'triangle', tense ? .039 : .032);
      this.musicTone(freq*1.5, Math.max(90,duration*.48), 'sine', tense ? .012 : .017);
      if(this.melodyIndex%2===0) this.musicTone(freq/2, Math.min(duration*1.8,760), 'sine', .021);
      if(tense) this.percussion(this.melodyIndex%2===0);
    }
    if(this.melodyIndex%4===0){
      const roots = {menu:98, hunt:110, battle:73.42, boss:55, bossPhase:46.25, danger:61.74};
      this.pad(roots[this.scene] || 98);
    }

    this.melodyIndex = (this.melodyIndex + 1) % track.length;
    this.musicTimer = setTimeout(() => this.playNextNote(), duration);
  },

  click() {
    this.init();
    this.noise(.025, .012);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.sfxGain || this.ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  },

  hit() {
    this.init();
    this.noise(.075,.07,980,'bandpass');
    this.sfxTone(155,.14,'triangle',.105,42);
    this.sfxTone(540,.035,'square',.018,330,.012);
  },

  crit() {
    this.init();
    this.noise(.14,.115,2350,'highpass');
    this.sfxTone(720,.19,'sawtooth',.115,105);
    this.sfxTone(1080,.12,'square',.05,380,.028);
    this.sfxTone(160,.24,'triangle',.07,48,.01);
  },

  skill() {
    this.init();
    if(this.musicEnabled){
      this.musicTone(523.25, 130, 'sine', .035);
      this.musicTone(659.25, 190, 'triangle', .025);
    }
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.sfxGain || this.ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  },

  miss() {
    this.init();
    this.noise(.045, .025);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.sfxGain || this.ctx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  },

  roll() {
    this.init();
    [0,.052,.106,.16].forEach((delay,index)=>{
      this.noise(.045,.028,780+index*90,'bandpass',delay);
      this.sfxTone(180+index*42,.07,'square',.042,92,delay);
    });
  },

  reward() {
    this.init();
    [523.25, 659.25, 783.99].forEach((freq, index) => {
      this.sfxTone(freq,.22,'sine',.066,freq*1.18,index*.07);
    });
    this.sfxTone(1046.5,.18,'sine',.026,1318.5,.18);
  },

  preview() {
    this.init();
    this.click();
    const classId = (typeof state !== 'undefined' && state && state.characterClass) ? state.characterClass : 'warrior';
    setTimeout(()=>this.classAttack(classId), 85);
    setTimeout(()=>this.reward(), 250);
  },

  victory() {
    this.init();
    [261.63,329.63,392,523.25,659.25].forEach((freq,index)=>this.sfxTone(freq,.28,'triangle',.075,freq*1.1,index*.09));
    this.sfxTone(130.81,.42,'sine',.045,196,.02);
  },

  heroBorn() {
    this.init();
    if(!this.ctx) return;
    const at = this.ctx.currentTime;
    // Soplo mágico ascendente que anuncia el momento
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(55, at);
    filter.type = 'bandpass'; filter.Q.value = 0.9;
    filter.frequency.setValueAtTime(180, at);
    filter.frequency.exponentialRampToValueAtTime(3400, at+.4);
    gain.gain.setValueAtTime(.0001, at);
    gain.gain.linearRampToValueAtTime(.055, at+.14);
    gain.gain.exponentialRampToValueAtTime(.0001, at+.42);
    osc.connect(filter); filter.connect(gain); gain.connect(this.sfxGain || this.ctx.destination);
    osc.start(at); osc.stop(at+.45);
    // Arpegio ascendente con brillo (el "gancho" pegadizo del jingle)
    [392.00,493.88,587.33,783.99,987.77].forEach((freq,index)=>{
      const d = .3 + index*.08;
      this.sfxTone(freq,.3,'triangle',.075,freq*1.15,d);
      this.sfxTone(freq*2,.16,'sine',.02,0,d+.02);
    });
    // Acorde de llegada + campana + golpe grave
    const land = .78;
    [392,493.88,587.33].forEach(freq=>this.sfxTone(freq,.55,'sine',.05,freq*1.05,land));
    this.sfxTone(1567.98,.62,'sine',.045,1975.53,land+.04);
    this.sfxTone(65,.4,'sine',.09,40,land);
    // Estela de destellos (polvo de hada)
    for(let i=0;i<6;i++){
      const freq = 1300+Math.random()*1300;
      this.sfxTone(freq,.16,'sine',.017,freq*1.3,land+.28+i*.075);
    }
  },

  levelUp() {
    this.init();
    this.percussion(true);
    [261.63,329.63,392,523.25,659.25,783.99].forEach((freq,index)=>this.sfxTone(freq,.24,'triangle',.07,freq*1.15,index*.075));
    setTimeout(()=>{
      this.sfxTone(1046.5,.5,'sine',.05,1318.5,0);
      this.sfxTone(1568,.42,'sine',.03,1760,.03);
    }, 470);
  },

  bigCatch(record=false) {
    this.init();
    this.noise(.22,.06,900,'bandpass');
    [392,493.88,587.33,783.99].forEach((freq,index)=>this.sfxTone(freq,.26,'sine',.06,freq*1.2,index*.06));
    if(record){
      setTimeout(()=>{
        this.sfxTone(1046.5,.4,'sine',.04,1318.5,0);
        this.noise(.14,.03,3200,'highpass');
      }, 260);
    }
  },

  defeat() {
    this.init();
    this.noise(.26,.075,310,'lowpass');
    [196,164.81,130.81].forEach((freq,index)=>this.sfxTone(freq,.36,'sawtooth',.082,freq*.56,index*.14));
  }
};

/* ================= CONFIG ================= */
