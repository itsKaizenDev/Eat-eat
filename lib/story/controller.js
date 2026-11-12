import { createPuzzleGame } from '../puzzle/controller';
import { CAMPAIGN_LEVELS } from '../puzzle/campaign';
import { createExpeditionGame } from '../expedition/controller';
import { loadProgress, mergeProgress, saveProgress } from '../progress';

export function createStoryGame({ onUpdate = () => {}, dungeonIO, expeditionIO, inspect, ...options }) {
  const store = dungeonIO || { load: loadProgress, save: saveProgress };
  let progress = store.load();
  let engine, chapter, destroyed = false;
  const load = () => mergeProgress(progress, store.load());
  const save = next => { progress = next; return store.save(next); };
  const unlocked = () => {
    const cleared = load().puzzle.levels;
    return CAMPAIGN_LEVELS.every(level => !!cleared[level.id]);
  };

  function forward(patch) {
    const result = patch.overlay?.phase === 'start'
      ? { ...patch, overlay: { ...patch.overlay, title: 'Story', sub: chapter === 'dungeon' ? 'Dungeon · Pencarian Apel Emas' : 'Ekspedisi · Jejak Larry' } }
      : patch;
    onUpdate({
      ...result,
      storyChapter: chapter,
      ...(patch.overlay?.phase === 'start' ? { storyUnlocked: unlocked() } : {}),
    });
  }

  function mount(next) {
    engine?.destroy();
    chapter = next;
    if (next === 'expedition') {
      engine = createExpeditionGame({ ...options, story: true, journeyIO: expeditionIO, onUpdate: forward, inspect: value => inspect?.(next, value) });
    } else {
      engine = createPuzzleGame({
        ...options, io: { load, save }, onUpdate: forward, inspect: value => inspect?.(next, value),
        onExpedition() {
          mount('expedition');
          engine.startRun();
        },
      });
    }
  }

  mount(unlocked() && load().puzzle.storyExpeditionSeen ? 'expedition' : 'dungeon');
  const delegate = name => (...args) => engine[name]?.(...args);
  return {
    setMode() {}, setSpeedPref() {}, setTaDuration() {}, setDirMP() {},
    chapterKind: () => chapter === 'expedition' ? 'roguelite' : 'puzzle',
    setStoryChapter(next) {
      if (destroyed || engine.getState() !== 'menu' || next === chapter || !['dungeon', 'expedition'].includes(next)) return false;
      if (next === 'expedition') {
        if (!unlocked()) return false;
        if (!load().puzzle.storyExpeditionSeen) return engine.resumeExpedition();
      }
      mount(next);
      return true;
    },
    startRun: delegate('startRun'), pauseRun: delegate('pauseRun'), resumeRun: delegate('resumeRun'),
    releasePause: delegate('releasePause'), togglePause: delegate('togglePause'), returnToMenu: delegate('returnToMenu'),
    getState: delegate('getState'), isRunning: delegate('isRunning'), resize: delegate('resize'),
    setDir: delegate('setDir'), cancelHeldInput: delegate('cancelHeldInput'), setModifier: delegate('setModifier'),
    setCamera: delegate('setCamera'), setLevel: delegate('setLevel'), restartLevel: delegate('restartLevel'), action: delegate('action'),
    chooseUpgrade: delegate('chooseUpgrade'), retrySave: delegate('retrySave'),
    restartRun() { return chapter === 'expedition' ? engine.restartRun() : engine.restartLevel(); },
    destroy() { destroyed = true; engine.destroy(); },
  };
}
