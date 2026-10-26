import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { registry, constants, sceneTheme, ICONS, root } from './helpers/env.mjs';

const { MODES, GROUPS, getMode, kindOf, isAdventure, modesInGroup, arcadeModes } = registry;
const css = fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8');

test('registry: id unik dan stabil; sepuluh mode lama tetap dengan urutan & grup menu yang disetujui', () => {
  assert.equal(new Set(MODES.map(m => m.id)).size, MODES.length);
  assert.deepEqual(modesInGroup('classic').map(m => m.id), ['classic', 'classicnight', 'portal', 'timeattack']);
  assert.deepEqual(modesInGroup('mayhem').map(m => m.id), ['mayhem', 'mayhemplus', 'mayhemhard', 'impossible']);
  assert.deepEqual(modesInGroup('mp').map(m => m.id), ['multiplayer', 'mayhemduo']);
  assert.deepEqual(arcadeModes().map(m => m.id).sort(), ['classic', 'classicnight', 'impossible', 'mayhem', 'mayhemduo', 'mayhemhard', 'mayhemplus', 'multiplayer', 'portal', 'timeattack']);
  assert.deepEqual(modesInGroup('adventure').map(m => m.id), ['puzzle', 'delivery', 'roguelite', 'territory']);
});

test('registry: teks menu arkade tetap; label Time Attack ditulis lengkap', () => {
  const D = {
    classic: 'Makan apel, tumbuh panjang, hindari tembok.', classicnight: 'Arena malam dengan kepala ular menyala.', portal: 'Tembus tepi arena dan muncul di sisi lainnya.',
    timeattack: 'Kejar skor sebelum waktu habis.', mayhem: 'Apel spesial, efek acak, dan ranjau menanti.', mayhemplus: 'Kekacauan Mayhem yang lebih intens.',
    mayhemhard: 'Waspadai racun tersamar dan kontrol terbalik.', impossible: 'Tantangan ekstrem dengan kecepatan Ngebut.',
    multiplayer: 'Berebut apel berdua dengan satu keyboard.', mayhemduo: 'Duel berdua dengan efek acak dan ranjau.',
  };
  const S = { classic: 'Classic', classicnight: 'Malam', portal: 'Portal', timeattack: 'Time Attack', mayhem: 'Mayhem', mayhemplus: 'Mayhem+', mayhemhard: 'Hard', impossible: 'Impossible', multiplayer: '2P Lokal', mayhemduo: 'Mayhem Duo' };
  for (const id of Object.keys(D)) { assert.equal(getMode(id).description, D[id], id); assert.equal(getMode(id).short, S[id], id); }
});

test('registry: field wajib terisi dan bernilai valid', () => {
  for (const m of MODES) {
    for (const f of ['id', 'label', 'short', 'group', 'kind', 'description', 'controls', 'finish', 'speedMode']) assert.ok(typeof m[f] === 'string' && m[f].length > 0, `${m.id}.${f}`);
    assert.ok(GROUPS.some(g => g.key === m.group), `${m.id}: grup ${m.group}`);
    assert.ok(['arcade', 'puzzle', 'delivery', 'roguelite', 'boss', 'territory'].includes(m.kind));
    assert.ok([1, 2].includes(m.players));
    assert.equal(typeof m.touch, 'boolean');
    assert.ok(['pref', 'locked', 'pref+duration', 'none'].includes(m.speedMode), m.id);
  }
});

test('registry: kebijakan sentuh & kecepatan — 2P tidak sentuh; Impossible terkunci; Time Attack punya durasi; Puzzle tanpa chip kecepatan', () => {
  assert.deepEqual(MODES.filter(m => !m.touch).map(m => m.id), ['multiplayer', 'mayhemduo', 'territory']);
  assert.ok(MODES.filter(m => m.players === 2).every(m => !m.touch));
  assert.equal(getMode('impossible').speedMode, 'locked');
  assert.equal(getMode('timeattack').speedMode, 'pref+duration');
  assert.equal(getMode('puzzle').speedMode, 'none');
  assert.equal(kindOf('puzzle'), 'puzzle'); assert.equal(kindOf('delivery'), 'delivery'); assert.equal(kindOf('roguelite'), 'roguelite'); assert.equal(kindOf('classic'), 'arcade'); assert.equal(kindOf('tidak-ada'), 'arcade');
  assert.equal(isAdventure('puzzle'), true); assert.equal(isAdventure('classic'), false); assert.equal(getMode('x'), null);
});

test('konsistensi: setiap mode punya nama, aturan bantuan, ikon, aksen, scene, urutan, dan aset latar', () => {
  for (const m of MODES) {
    assert.equal(constants.MODE_NAMES[m.id], m.label, `MODE_NAMES.${m.id}`);
    const rules = constants.MODE_RULES[m.id];
    assert.ok(Array.isArray(rules) && rules.length >= 2, `MODE_RULES.${m.id}`);
    rules.forEach(r => assert.ok(ICONS[r.icon], `ikon aturan '${r.icon}' (${m.id}) tidak ada di ICONS`));
    assert.ok(ICONS[m.id], `ICONS.${m.id} untuk tombol menu`);
    assert.ok(/^#[0-9a-f]{6}$/i.test(sceneTheme.ACCENT[m.id]), `ACCENT.${m.id}`);
    assert.ok(sceneTheme.POS[m.id], `POS.${m.id}`);
    assert.ok(sceneTheme.FX[m.id], `FX.${m.id}`);
    assert.ok(fs.existsSync(path.join(root, 'public', sceneTheme.BG[m.id])), `BG.${m.id}`);
  }
  assert.deepEqual([...sceneTheme.ORDER].sort(), MODES.map(m => m.id).sort());
  for (const g of GROUPS) assert.ok(ICONS[g.icon], `ICONS.${g.icon} untuk grup ${g.key}`);
});

test('konsistensi: background WebP memiliki header valid dan budget ukuran', () => {
  for (const m of MODES) {
    for (const src of [sceneTheme.BG[m.id], sceneTheme.BG[m.id].replace('.webp', '-m.webp')]) {
      const data = fs.readFileSync(path.join(root, 'public', src));
      assert.equal(data.toString('ascii', 0, 4), 'RIFF', src);
      assert.equal(data.toString('ascii', 8, 12), 'WEBP', src);
      assert.ok(data.length < 300000, src + ' terlalu berat');
    }
  }
});

test('registry: mode petualangan punya tujuan, pratinjau aturan, kontrol; Delivery menggunakan durasi per misi', () => {
  for (const m of modesInGroup('adventure')) {
    assert.ok(typeof m.goal === 'string' && m.goal.length > 10, m.id + '.goal');
    assert.ok(Array.isArray(m.preview) && m.preview.length >= 3, m.id + '.preview');
    assert.ok(m.controls.length > 5);
  }
  assert.equal(getMode('delivery').duration, undefined);assert.match(getMode('delivery').description,/12 misi/);
  assert.equal(getMode('puzzle').duration, undefined);
});

test('sceneTheme: seluruh mode memiliki WebP desktop dan HP yang tersedia', () => {
  const files = sceneTheme.bgFiles();
  assert.equal(files.length, MODES.length);
  for (const src of files) {
    assert.ok(src.endsWith('.webp'));
    assert.ok(fs.existsSync(path.join(root, 'public', src)), src);
    assert.ok(fs.existsSync(path.join(root, 'public', src.replace('.webp', '-m.webp'))), src + ' mobile');
  }
});
