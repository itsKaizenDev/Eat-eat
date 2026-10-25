import { composeScore } from './score';
import { DEFAULT_AUDIO } from './preferences';
const SAMPLES = { chomp: '/sounds/chomp.mp3', eits: '/sounds/eits.mp3', death: '/sounds/death.mp3', poison: '/sounds/poison-death.mp3', move: '/sounds/move.wav' };
// All music, synthesized cues and original SFX share one AudioContext and bus.
// No HTMLAudio fallback can bypass pause/mute or browser gesture unlocking.
export function createAudioDirector({ contextFactory, compose = composeScore, renderScore, disposeRenderer, fetchAudio = globalThis.fetch?.bind(globalThis) } = {}) {
  let ac = null, music = null, sfx = null, prefs = { ...DEFAULT_AUDIO }, scene = { key: 'classic', variation: 0, intensity: .08, paused: false };
  let active = null, unlocked = false, disposed = false, preparing = null, rendererFailed = false, loading = false;
  const cache = new Map(), voices = new Set(), retiring = new Set(), events = new Map(), samples = new Map(), assetErrors = new Set();
  const abort = typeof AbortController === 'function' ? new AbortController() : null;
  const gain = (node, value, fade = .3) => { if (!node || disposed) return; const t = ac.currentTime; node.gain.cancelScheduledValues(t); node.gain.setTargetAtTime(value, t, fade / 3); };
  function masters() {
    const duck = [...voices].some(v => v.priority >= 3) ? .5 : 1;
    gain(music, prefs.muted ? 0 : prefs.music * .55 * duck, .12);
    gain(sfx, prefs.muted ? 0 : prefs.sfx, .06);
  }
  function stop(group, at = ac?.currentTime || 0) {
    if (!group) return;
    for (const { source, bus } of group.stems) {
      source.onended = () => { source.disconnect(); bus.disconnect(); retiring.delete(source); };
      retiring.add(source); try { source.stop(at); } catch {}
    }
    // Rapid mode changes cannot accumulate an unbounded set of fading sources.
    while (retiring.size > 4) { const old = retiring.values().next().value; retiring.delete(old); try { old.stop(); old.disconnect(); } catch {} }
  }
  function storeScore(id, score) {
    if (disposed) return;
    const buffers = [score.base, score.danger].map(data => { const b = ac.createBuffer(1, data.length, score.sampleRate); b.copyToChannel(data, 0); return b; });
    cache.set(id, buffers); if (cache.size > 2) cache.delete(cache.keys().next().value);
  }
  function prepare(id) {
    if (preparing) return;
    const {key, variation} = scene;
    if (!renderScore || rendererFailed) { storeScore(id, compose(key, 22050, variation)); return; }
    preparing = id;
    Promise.resolve().then(() => renderScore(key,22050,variation)).then(score => {
      if (disposed) return; storeScore(id,score); preparing = null; apply();
    }).catch(() => {
      if (disposed) return;
      preparing = null; rendererFailed = true;
      // Restricted browsers can still play original music without a worker.
      apply();
    });
  }
  function apply() {
    if (!ac || disposed) return;
    masters();
    if (scene.paused || prefs.muted) { ac.suspend().catch(() => {}); return; }
    if (unlocked && ac.state !== 'running') ac.resume().catch(() => {});
    if (!unlocked || !prefs.music) { if (active && !prefs.music) { stop(active); active = null; } return; }
    const id = scene.key + ':' + scene.variation;
    if (active?.id !== id) {
      if (!cache.has(id)) prepare(id);
      const buffers = cache.get(id); if (!buffers) return;
      const start = ac.currentTime + .025;
      // Phase arrangements of the same theme keep their musical bar/playhead.
      // A new boss/theme starts at its own intro; a phase never restarts it.
      const offset = active?.key === scene.key ? ((start - active.startedAt + active.offset) % buffers[0].duration) : 0;
      if (active) { for (const stem of active.stems) gain(stem.bus,0,.6); stop(active,ac.currentTime+.8); }
      active = { id, key:scene.key, startedAt:start, offset, stems: buffers.map(buffer => {
        const source = ac.createBufferSource(), bus = ac.createGain(); source.buffer = buffer; source.loop = true; source.loopStart = 0; source.loopEnd = buffer.duration; bus.gain.value = 0;
        source.connect(bus); bus.connect(music); source.start(start,offset); return {source,bus};
      }) };
    }
    gain(active.stems[0].bus,1,.7); gain(active.stems[1].bus,scene.intensity,.7);
  }
  function loadSamples() {
    if (loading || !fetchAudio || !ac.decodeAudioData) return;
    loading = true;
    for (const [name,url] of Object.entries(SAMPLES)) {
      Promise.resolve().then(() => fetchAudio(url,{signal:abort?.signal})).then(r => { if (!r.ok) throw new Error('SFX unavailable'); return r.arrayBuffer(); })
        .then(bytes => { if (!disposed) return ac.decodeAudioData(bytes); })
        .then(buffer => { if (!disposed && buffer) samples.set(name,buffer); })
        .catch(() => { if (!disposed) assetErrors.add(name); });
    }
    // A delayed download never replays an obsolete sound. Synthesized cues are
    // used immediately until the original recording has finished decoding.
  }
  function reserve(priority, tag) {
    if (!ac || !unlocked || disposed || prefs.muted || !prefs.sfx || scene.paused || ac.state !== 'running') return null;
    if (voices.size >= 20) {
      const victim = [...voices].find(v => v.priority < priority);
      if (!victim) return null;
      voices.delete(victim); try { victim.source.stop(); } catch {}
    }
    const voice = {priority,tag,source:null}; voices.add(voice); return voice;
  }
  function cleanup(voice, bus) {
    voice.source.onended = () => { voice.source.disconnect(); bus.disconnect(); voices.delete(voice); masters(); };
    masters();
  }
  function tone(freq, delay = 0, duration = .12, type = 'sine', volume = .1, glideTo, priority = 1, tag = 'tone') {
    const voice = reserve(priority,tag); if (!voice) return false;
    const o = ac.createOscillator(), g = ac.createGain(), at = ac.currentTime + delay;
    voice.source = o; o.type = type; o.frequency.setValueAtTime(freq,at); if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo,at+duration);
    g.gain.setValueAtTime(.0001,at); g.gain.exponentialRampToValueAtTime(Math.max(.0001,volume),at+.008); g.gain.exponentialRampToValueAtTime(.0001,at+duration);
    o.connect(g); g.connect(sfx); cleanup(voice,g); o.start(at); o.stop(at+duration+.02); return true;
  }
  function ready(name, cooldown) {
    if (!ac || disposed) return false;
    const previous = events.get(name); if (previous !== undefined && previous + cooldown > ac.currentTime) return false;
    events.set(name,ac.currentTime); return true;
  }
  function stopTag(tag) { for (const v of voices) if (v.tag === tag) { try { v.source.stop(); } catch {} } }
  function sample(name) {
    const fatal = name === 'death' || name === 'poison';
    if (!ready('sample:'+name,name === 'move' ? .08 : name === 'eits' ? .65 : .04)) return;
    if (fatal) stopTag('eits');
    const priority = fatal ? 4 : name === 'eits' ? 3 : name === 'move' ? 0 : 1, buffer = samples.get(name);
    if (!buffer) {
      const fallback = {move:[130,.045,'sine',.018,100],chomp:[720,.1,'triangle',.07,1050],eits:[360,.2,'triangle',.08,600],death:[150,.38,'sawtooth',.045,40],poison:[210,.45,'triangle',.07,48]}[name];
      if (fallback) tone(fallback[0],0,fallback[1],fallback[2],fallback[3],fallback[4],priority,name);
      return;
    }
    stopTag(name);
    const voice = reserve(priority,name); if (!voice) return;
    const source = ac.createBufferSource(), bus = ac.createGain(), at = ac.currentTime;
    const duration = Math.min(buffer.duration,{move:.12,chomp:3.2,eits:1.8,death:2,poison:2.5}[name]);
    voice.source = source; source.buffer = buffer;
    const volume = ['move','eits'].includes(name) ? .25 : 1;
    bus.gain.setValueAtTime(volume,at); bus.gain.setValueAtTime(volume,at+Math.max(0,duration-.025)); bus.gain.linearRampToValueAtTime(0,at+duration);
    source.connect(bus); bus.connect(sfx); cleanup(voice,bus); source.start(at); source.stop(at+duration);
  }
  function event(name) {
    if (!name || !ready('event:'+name,name === 'footstep' ? .22 : name === 'miss' ? .6 : .12)) return;
    const notes = {
      windup:[[220,0,.18,'triangle',.065,330]], strike:[[82,0,.17,'sawtooth',.035,45]], anticipate:[[300,0,.08,'sine',.04,360]],
      evade:[[660,0,.09,'sine',.045,990]], miss:[[160,0,.08,'triangle',.035,110]], hurt:[[100,0,.22,'sawtooth',.045,55]],
      artifact:[[660,0,.18,'triangle',.08],[988,.1,.3,'triangle',.07]], portal:[[370,0,.28,'sine',.07,1480]],
      phase:[[196,0,.3,'triangle',.06],[294,.15,.3,'triangle',.06],[392,.3,.4,'triangle',.06]], bosshit:[[196,0,.18,'triangle',.075,270]],
      counter:[[1174,0,.2,'sine',.075,1568]], chain:[[784,0,.12,'triangle',.06]], weak:[[587,0,.16,'triangle',.06],[880,.1,.2,'triangle',.06]],
      bossintro:[[98,0,.5,'triangle',.06],[147,.2,.5,'triangle',.06]], bossdown:[[392,0,.4,'triangle',.07],[494,.18,.4,'triangle',.07],[587,.36,.6,'triangle',.07]],
      win:[[523,0,.16,'triangle',.075],[659,.1,.16,'triangle',.075],[784,.2,.16,'triangle',.075],[1047,.3,.25,'triangle',.075]],
      deliver:[[880,0,.12,'triangle',.08],[1319,.08,.2,'triangle',.08]], locked:[[330,0,.06,'square',.035],[247,.07,.09,'square',.035]],
      bump:[[170,0,.09,'sine',.09,85]], bark:[[230,0,.13,'sawtooth',.03,75],[115,0,.15,'triangle',.06,55],[230,.19,.13,'sawtooth',.03,75],[115,.19,.15,'triangle',.06,55]],
      footstep:[[110,0,.045,'sine',.025,65]], door:[[220,0,.12,'triangle',.045,165]], stone:[[480,0,.09,'triangle',.045,240]],
      smoke:[[140,0,.24,'triangle',.035,60]], trap:[[620,0,.09,'square',.025,310]], hide:[[260,0,.12,'sine',.03,130]],
      heal:[[523,0,.15,'sine',.05],[784,.1,.2,'sine',.05]], damageOrb:[[392,0,.15,'triangle',.055],[784,.1,.18,'triangle',.055]],
      shieldGain:[[440,0,.16,'sine',.045,660]], round:[[330,0,.18,'triangle',.045],[440,.12,.2,'triangle',.045]],
    }[name];
    const priority = ['windup','hurt','phase','bossintro','bossdown','win','bark'].includes(name) ? 3 : name === 'footstep' ? 0 : 1;
    for (const [frequency,delay,duration,type,volume,glide] of notes || []) tone(frequency,delay,duration,type,volume,glide,priority,name);
  }
  return {
    unlock() {
      if (disposed) return;
      if (!ac) {
        try { const make = contextFactory || (() => new (window.AudioContext || window.webkitAudioContext)()); ac = make(); music = ac.createGain(); sfx = ac.createGain(); music.connect(ac.destination); sfx.connect(ac.destination); } catch { return; }
      }
      unlocked = true; apply(); loadSamples();
    },
    setScene(value) { scene = {...scene,...value}; apply(); },
    setPreferences(value) { prefs = {...prefs,...value}; apply(); },
    tone, event, sample,
    inspect: () => ({unlocked,disposed,cacheSize:cache.size,voices:voices.size,stems:active?.stems.length || 0,scene:{...scene},state:ac?.state,assets:samples.size,assetErrors:[...assetErrors],preparing,rendererFailed}),
    destroy() {
      if (disposed) return; disposed = true; abort?.abort(); disposeRenderer?.(); stop(active); active = null;
      for (const v of voices) { try { v.source.stop(); v.source.disconnect(); } catch {} }
      for (const source of retiring) { try { source.stop(); source.disconnect(); } catch {} }
      voices.clear(); retiring.clear(); cache.clear(); samples.clear(); events.clear(); ac?.close().catch(() => {});
    },
  };
}
