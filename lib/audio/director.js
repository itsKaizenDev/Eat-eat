import { musicTrack, loadMusicFiles } from './loader';
import { EFFECT_FILES } from './catalog';
import { CUES } from './cues';
import { DEFAULT_AUDIO } from './preferences';
const SAMPLES = { chomp: '/sounds/chomp.mp3', eits: '/sounds/eits.mp3', death: '/sounds/death.mp3', poison: '/sounds/poison-death.mp3', move: '/sounds/move.wav' };
// All music, synthesized cues and original SFX share one AudioContext and bus.
// No HTMLAudio fallback can bypass pause/mute or browser gesture unlocking.
<<<<<<< HEAD
export function createAudioDirector({ contextFactory, loadMusic = loadMusicFiles, fetchAudio = globalThis.fetch?.bind(globalThis), loadTimeoutMs = 12000, onStatus = () => {} } = {}) {
  let ac = null, music = null, sfx = null, master = null, prefs = { ...DEFAULT_AUDIO }, scene = { key: 'classic', variation: 0, intensity: .08, paused: false };
  let active = null, unlocked = false, disposed = false, preparing = null, musicError = '', loading = false, request = null, fallback = false, lastStatus = '';
=======
export function createAudioDirector({ contextFactory, loadMusic = loadMusicFiles, fetchAudio = globalThis.fetch?.bind(globalThis) } = {}) {
  let ac = null, music = null, sfx = null, prefs = { ...DEFAULT_AUDIO }, scene = { key: 'classic', variation: 0, intensity: .08, paused: false };
  let active = null, unlocked = false, disposed = false, preparing = null, musicError = '', loading = false;
>>>>>>> d8551af93c55dca40eaf20b0da1fc20f965809e6
  const cache = new Map(), voices = new Set(), retiring = new Set(), events = new Map(), samples = new Map(), assetErrors = new Set(), failedMusic = new Map();
  const abort = typeof AbortController === 'function' ? new AbortController() : null;
  const gain = (node, value, fade = .3) => { if (!node || disposed) return; const t = ac.currentTime; node.gain.cancelScheduledValues(t); node.gain.setTargetAtTime(value, t, fade / 3); };
  function status() {
    const value = { loading: !!preparing, error: musicError, fallback };
    const json = JSON.stringify(value); if (json !== lastStatus && !disposed) { lastStatus = json; onStatus(value); }
  }
  function cancelRequest() { if (request) { clearTimeout(request.timer); request.abort.abort(); request = null; } preparing = null; }
  function masters() {
    const duck = [...voices].some(v => v.priority >= 3) ? .7 : 1;
    gain(music, prefs.muted ? 0 : prefs.music * duck, .12);
    gain(sfx, prefs.muted ? 0 : prefs.sfx, .06);
    gain(master, prefs.muted ? 0 : prefs.master, .06);
  }
  function stop(group, at = ac?.currentTime || 0) {
    if (!group) return;
    for (const stem of group.stems) {
      const {source,bus}=stem; if(stem.ended)continue;
      source.onended = () => { stem.ended=true; source.disconnect(); bus.disconnect(); retiring.delete(source); };
      retiring.add(source); try { source.stop(at); } catch {}
    }
    // Rapid mode changes cannot accumulate an unbounded set of fading sources.
    while (retiring.size > 4) { const old = retiring.values().next().value; retiring.delete(old); try { old.stop(); old.disconnect(); } catch {} }
  }
<<<<<<< HEAD
  function storeMusic(id, buffers, compatibility = false) {
    if (disposed) return;
    cache.set(id,{buffers,fallback:compatibility}); if (cache.size > 2) cache.delete(cache.keys().next().value);
  }
  function prepare(track) {
    const id = track.key + ':' + track.variation;
    if (preparing === id || (failedMusic.get(id) || 0) > Date.now()) return;
    cancelRequest();
    const ticket = {id, abort:new AbortController(), timer:null}; request = ticket; preparing = id; musicError = ''; status();
    const fail = error => {
      if (disposed || request !== ticket) return;
      clearTimeout(ticket.timer); ticket.abort.abort(); request = null; preparing = null;
      musicError = String(error.message || error); failedMusic.set(id, Date.now() + 3000);
      // A failed new scene must never leave an unrelated old song looping forever.
      if (active?.id !== id) { stop(active); active = null; }
      status();
    };
    const accept = result => {
      if (disposed || request !== ticket) return;
      clearTimeout(ticket.timer); request = null; preparing = null;
      const buffers = result.buffers || result;
      fallback = !!result.fallback; storeMusic(id, buffers, fallback); musicError = ''; failedMusic.delete(id); status();
    };
    ticket.timer = setTimeout(() => fail(new Error('Music loading timeout: batas waktu terlampaui')), loadTimeoutMs);
    try {
      const result = loadMusic(track, ac, ticket.abort.signal);
      if (!result?.then) { accept(result); return; }
      result.then(result => { accept(result); if (!disposed) apply(); }).catch(fail);
    } catch (error) { fail(error); }
=======
  function storeMusic(id, buffers) {
    if (disposed) return;
    cache.set(id,buffers); if (cache.size > 2) cache.delete(cache.keys().next().value);
  }
  function prepare(track) {
    const id=track.key+':'+track.variation;
    if (preparing || (failedMusic.get(id)||0)>Date.now()) return;
    preparing=id;
    const fail=error=>{
      if (disposed) return;
      preparing=null; musicError=String(error.message||error); failedMusic.set(id,Date.now()+3000);
      const next=musicTrack(scene.key,scene.variation);
      if(next.key+':'+next.variation!==id)apply();
    };
    try {
      const result=loadMusic(track,ac,abort?.signal);
      if (!result?.then) {storeMusic(id,result);preparing=null;musicError='';failedMusic.delete(id);return;}
      result.then(buffers=>{
        if(disposed)return;
        storeMusic(id,buffers);preparing=null;musicError='';failedMusic.delete(id);apply();
      }).catch(fail);
    } catch(error) {fail(error);}
>>>>>>> d8551af93c55dca40eaf20b0da1fc20f965809e6
  }
  function apply() {
    if (!ac || disposed) return;
    masters();
    const wanted = musicTrack(scene.key, scene.variation);
    if (request && request.id !== wanted.key + ':' + wanted.variation) { cancelRequest(); status(); }
    if (scene.paused || prefs.muted) { ac.suspend().catch(() => {}); return; }
    if (unlocked && ac.state !== 'running') ac.resume().catch(() => {});
    if (!unlocked || !prefs.music) { if (active && !prefs.music) { stop(active); active = null; } return; }
    const track=musicTrack(scene.key,scene.variation), id=track.key+':'+track.variation;
    if (active?.id !== id) {
      if (!cache.has(id)) prepare(track);
<<<<<<< HEAD
      const cached = cache.get(id), buffers=cached?.buffers; if (!buffers) return;
      fallback=cached.fallback; status();
=======
      const buffers = cache.get(id); if (!buffers) return;
>>>>>>> d8551af93c55dca40eaf20b0da1fc20f965809e6
      const start = ac.currentTime + .025;
      // Phase arrangements of the same theme keep their musical bar/playhead.
      // A new boss/theme starts at its own intro; a phase never restarts it.
      const duration=Math.min(...buffers.map(b=>b.duration));
      const offset = active?.key === track.key ? ((start - active.startedAt + active.offset) % duration) : 0;
      if (active) { for (const stem of active.stems) gain(stem.bus,0,.6); stop(active,ac.currentTime+.8); }
      active = { id, key:track.key, startedAt:start, offset, stems: buffers.map(buffer => {
<<<<<<< HEAD
        const source = ac.createBufferSource(), bus = ac.createGain(); source.buffer = buffer; source.loop = track.loop !== false; source.loopStart = 0; source.loopEnd = duration; bus.gain.value = 0;
        source.connect(bus); bus.connect(music);
        const stem={source,bus,ended:false};source.onended=()=>{stem.ended=true;source.disconnect();bus.disconnect();retiring.delete(source);};
        source.start(start,offset); return stem;
=======
        const source = ac.createBufferSource(), bus = ac.createGain(); source.buffer = buffer; source.loop = true; source.loopStart = 0; source.loopEnd = duration; bus.gain.value = 0;
        source.connect(bus); bus.connect(music); source.start(start,offset); return {source,bus};
>>>>>>> d8551af93c55dca40eaf20b0da1fc20f965809e6
      }) };
    }
    gain(active.stems[0].bus,1,.7); gain(active.stems[1].bus,scene.intensity,.7);
  }
  function loadSamples() {
    if (loading || !fetchAudio || !ac.decodeAudioData) return;
    loading = true;
    const queue=Object.entries({...SAMPLES,...Object.fromEntries(Object.entries(EFFECT_FILES).map(([name,url])=>['event:'+name,url]))});
    const worker=async()=>{
      while(queue.length&&!disposed) {
        const [name,url]=queue.shift();
        try {
          const response=await fetchAudio(url,{signal:abort?.signal});
          if(!response.ok)throw new Error('SFX unavailable');
          const bytes=await response.arrayBuffer();if(disposed)return;
          const buffer=await ac.decodeAudioData(bytes);if(!disposed)samples.set(name,buffer);
        }catch {if(!disposed)assetErrors.add(name);}
      }
    };
    for(let i=0;i<4;i++)worker();
    // A delayed download never replays an obsolete sound. Synthesized cues are
    // used immediately until the original recording has finished decoding.
  }
  function reserve(priority, tag) {
    if (!ac || !unlocked || disposed || prefs.muted || !prefs.master || !prefs.sfx || scene.paused || ac.state !== 'running') return null;
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
    const volume = name === 'move' ? .55 : 1;
    bus.gain.setValueAtTime(volume,at); bus.gain.setValueAtTime(volume,at+Math.max(0,duration-.025)); bus.gain.linearRampToValueAtTime(0,at+duration);
    source.connect(bus); bus.connect(sfx); cleanup(voice,bus); source.start(at); source.stop(at+duration);
  }
  function event(name) {
<<<<<<< HEAD
    if (!name || !ready('event:'+name,name === 'footstep' ? .22 : ['miss','obstacle','countdown','orderAccepted','cargoHit'].includes(name) ? .8 : .12)) return;
    const notes = CUES[name];
    const priority = ['windup','hurt','phase','bossintro','bossdown','win','bark','countdown','cargoHit','courierFail'].includes(name) ? 3 : name === 'footstep' ? 0 : 1;
=======
    if (!name || !ready('event:'+name,name === 'footstep' ? .22 : name === 'miss' ? .6 : .12)) return;
    const notes = CUES[name];
    const priority = ['windup','hurt','phase','bossintro','bossdown','win','bark'].includes(name) ? 3 : name === 'footstep' ? 0 : 1;
>>>>>>> d8551af93c55dca40eaf20b0da1fc20f965809e6
    const buffer=samples.get('event:'+name);
    if(buffer) {
      stopTag(name);const voice=reserve(priority,name);if(!voice)return;
      const source=ac.createBufferSource(),bus=ac.createGain();voice.source=source;source.buffer=buffer;
      source.connect(bus);bus.connect(sfx);cleanup(voice,bus);source.start(ac.currentTime);return;
    }
    for (const [frequency,delay,duration,type,volume,glide] of notes || []) tone(frequency,delay,duration,type,volume,glide,priority,name);
  }
  return {
    unlock() {
      if (disposed) return;
      if (!ac) {
        try {
          const make=contextFactory||(()=>{
            const Audio=window.AudioContext||window.webkitAudioContext;
            try {return new Audio({sampleRate:22050,latencyHint:'interactive'});} catch {return new Audio();}
          });
<<<<<<< HEAD
          ac=make(); music=ac.createGain(); sfx=ac.createGain(); master=ac.createGain();
          music.connect(master); sfx.connect(master);
          if (ac.createDynamicsCompressor) {
            const limiter=ac.createDynamicsCompressor(); limiter.threshold.value=-4; limiter.knee.value=0; limiter.ratio.value=20; limiter.attack.value=.003; limiter.release.value=.12;
            master.connect(limiter); limiter.connect(ac.destination);
          } else master.connect(ac.destination);
=======
          ac=make();music=ac.createGain();sfx=ac.createGain();music.connect(ac.destination);sfx.connect(ac.destination);
>>>>>>> d8551af93c55dca40eaf20b0da1fc20f965809e6
        } catch {return;}
      }
      unlocked = true; apply(); loadSamples();
    },
    setScene(value) { scene = {...scene,...value}; apply(); },
    setPreferences(value) { prefs = {...prefs,...value}; apply(); },
    retryMusic() { failedMusic.clear(); musicError = ''; cancelRequest(); if(ac && unlocked) prepare(musicTrack(scene.key,scene.variation)); status(); apply(); },
    tone, event, sample,
<<<<<<< HEAD
    inspect: () => ({unlocked,disposed,cacheSize:cache.size,retiring:retiring.size,voices:voices.size,stems:active?.stems.length || 0,activeTrack:active?.id,scene:{...scene},state:ac?.state,assets:samples.size,assetErrors:[...assetErrors],preparing,musicError,fallback,master:prefs.master,playback:'files'}),
    destroy() {
      if (disposed) return; cancelRequest(); disposed = true; abort?.abort(); stop(active); active = null;
=======
    inspect: () => ({unlocked,disposed,cacheSize:cache.size,voices:voices.size,stems:active?.stems.length || 0,activeTrack:active?.id,scene:{...scene},state:ac?.state,assets:samples.size,assetErrors:[...assetErrors],preparing,musicError,playback:'files'}),
    destroy() {
      if (disposed) return; disposed = true; abort?.abort(); stop(active); active = null;
>>>>>>> d8551af93c55dca40eaf20b0da1fc20f965809e6
      for (const v of voices) { try { v.source.stop(); v.source.disconnect(); } catch {} }
      for (const source of retiring) { try { source.stop(); source.disconnect(); } catch {} }
      voices.clear(); retiring.clear(); cache.clear(); samples.clear(); events.clear(); failedMusic.clear(); ac?.close().catch(() => {});
    },
  };
}
