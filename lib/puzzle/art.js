// Dungeon artwork only. Coordinates, state, sensing and damage belong to the simulation.
export const INK = '#142a30', GOLD = '#f4ca78', TEAL = '#82e2be';
const TAU = Math.PI * 2;
export function rounded(c, x, y, w, h, r, fill, stroke) {
  c.beginPath(); c.roundRect(x, y, w, h, r);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = .045; c.stroke(); }
}
export function circle(c, x, y, r, fill, stroke) {
  c.beginPath(); c.arc(x, y, r, 0, TAU);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = .04; c.stroke(); }
}
export function text(c, value, x, y, size = .26, color = '#f0efda') {
  // Paint text at a normal font size: sub-pixel font metrics can drop glyphs on small tiles.
  c.save(); c.translate(x, y); c.scale(.01, .01);
  c.font = '800 ' + (size * 100) + 'px system-ui,sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = color; c.fillText(value, 0, 0); c.restore();
}
function line(c, points, color = INK, width = .04) {
  c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
  c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
}
function ellipse(c, x, y, rx, ry, fill, stroke) {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = .04; c.stroke(); }
}
function shadow(c, x, y, rx = .37, ry = .13) { ellipse(c, x, y, rx, ry, '#081e255c'); }
function bolt(c, x, y, color = '#d8dac4') { circle(c, x, y, .032, color); }
export function diamond(c, x, y, color, size = .26) {
  c.beginPath(); c.moveTo(x, y - size); c.lineTo(x + size * .8, y);
  c.lineTo(x, y + size); c.lineTo(x - size * .8, y); c.closePath();
  c.fillStyle = color; c.fill(); c.strokeStyle = INK; c.lineWidth = .035; c.stroke();
  c.beginPath(); c.moveTo(x, y - size * .8); c.lineTo(x - size * .16, y); c.lineTo(x, y + size * .8);
  c.lineTo(x + size * .4, y - size * .1); c.closePath(); c.fillStyle = '#e3fff45c'; c.fill();
}
export function floor(c, l) {
  const inferno = l.chapter === 'inferno';
  c.fillStyle = inferno ? '#180e12' : '#172d34';
  c.fillRect(-1, -2, l.width + 2, l.height + 4);
  for (let y = 0; y < l.height; y++) for (let x = 0; x < l.width; x++) {
    const ch = l.map[y][x]; if (ch === ' ') continue;
    const hash = x * 17 + y * 29;
    c.fillStyle = inferno ? '#28151a' : '#20373b';
    c.fillRect(x, y, 1, 1);
    const slab = inferno ? (hash % 3 ? '#472b2d' : '#503237') : (hash % 3 ? '#344e4d' : '#3a5351');
    rounded(c, x + .035, y + .035, .93, .93, .065, slab, inferno ? '#301d23' : '#243d40');
    line(c, [[x + .12, y + .09], [x + .83, y + .09]], inferno ? '#ad625455' : '#6b817052', .025);
    if (hash % 13 === 0) line(c, [[x + .62, y + .28], [x + .5, y + .45], [x + .57, y + .6]], inferno ? '#cf694b' : '#21393b', .025);
    if (!inferno && hash % 23 === 0) {
      ellipse(c, x + .17, y + .78, .12, .045, '#596b4780');
      ellipse(c, x + .29, y + .83, .08, .035, '#70815150');
    }
    if (ch === '#' || ch === 'C') rounded(c, x + .12, y + .2, .9, .78, .07, '#112b3a60');
  }
  l.shadows.forEach(z => {
    circle(c, z.x, z.y, z.radius, '#18223e55');
    circle(c, z.x, z.y, z.radius * .65, '#302d4538');
  });
}
export function crate(c, x, y, lid = 0) {
  shadow(c, x, y + .37, .43, .12);
  rounded(c, x - .43, y - .4, .86, .86, .09, '#765337', INK);
  rounded(c, x - .35, y - .34, .7, .69, .045, '#a77b49');
  for (const dx of [-.19, .04, .24]) line(c, [[x + dx, y - .3], [x + dx, y + .32]], '#61442e', .025);
  line(c, [[x - .28, y - .24], [x + .28, y + .28]], '#d5ab69', .11);
  line(c, [[x + .28, y - .24], [x - .28, y + .28]], '#e4ba78', .09);
  rounded(c, x - .44, y - .42 - lid, .88, .14, .045, '#c79a5c', INK);
  line(c, [[x - .32, y - .38 - lid], [x + .3, y - .38 - lid]], '#f1d096', .025);
  for (const dx of [-.38, .38]) for (const dy of [-.3, .33]) bolt(c, x + dx, y + dy, '#d4b477');
}
export function wall(c, x, y, isCrate, inferno = false) {
  if (isCrate) { crate(c, x + .5, y + .46); return; }
  const hash = x * 7 + y * 11;
  rounded(c, x + .025, y - .12, .95, 1.08, .09, inferno ? '#3f262e' : '#415c60', INK);
  rounded(c, x + .035, y - .13, .93, .72, .085, inferno ? (hash % 3 ? '#734748' : '#633d44') : (hash % 3 ? '#84958a' : '#778d88'), INK);
  line(c, [[x + .14, y - .06], [x + .81, y - .06]], inferno ? '#c08870' : '#c4ceaf', .045);
  line(c, [[x + .12, y + .55], [x + .87, y + .55]], '#506966', .04);
  line(c, [[x + .46, y + .63], [x + .46, y + .86]], '#2b464c', .04);
  if (inferno && hash % 5 === 0) {
    line(c, [[x + .73, y + .02], [x + .52, y + .25], [x + .66, y + .37], [x + .45, y + .62]], '#e28759', .032);
  }
  if (!inferno && hash % 9 === 0) {
    ellipse(c, x + .25, y - .065, .15, .045, '#647747');
    ellipse(c, x + .39, y - .04, .09, .045, '#8c9955');
  }
}
export function stun(c, a, s, x = a.x, y = a.y) {
  if (!(a.stunnedUntil > s.time)) return;
  circle(c, x, y - .73, .18, '#98d8ce', INK);
  line(c, [[x - .045, y - .79], [x - .045, y - .67]], INK, .035);
  line(c, [[x + .045, y - .79], [x + .045, y - .67]], INK, .035);
}
function guardBadge(c, role) {
  if (role === 'relic') diamond(c, 0, .16, '#9be0df', .105);
  else if (role === 'access') { circle(c, -.035, .12, .045, GOLD, INK); line(c, [[0, .15], [.09, .22], [.12, .18]], GOLD, .045); }
  else if (role === 'sweep') { circle(c, -.025, .12, .065, '#bdb5dc', INK); line(c, [[.02, .17], [.1, .24]], '#c9c5df', .045); }
  else { line(c, [[-.08, .13], [0, .17], [.08, .13]], '#f3d18b', .035); }
}
export function actor(c, a, player, s, reduced) {
  const moving = player ? a.moving : (a.path?.length > 0 || a.yielding?.path?.length > 0) && (a.blocked || 0) < .15 && (a.state !== 'PATROL' || a.pause <= 0) && (!a.trafficWaiting || a.yielding?.path?.length > 0);
  const t = reduced || !moving || a.reactingUntil > s.time || (a.charge && a.charge.stage !== 'rush') || a.stunnedUntil > s.time ? 0 : s.time;
  const stride = Math.sin(t * 13) * .045;
  c.save(); c.translate(a.x, a.y);
  if (player && a.hidden) c.globalAlpha = .48;
  else if (player && a.stealth) c.globalAlpha = .74;
  shadow(c, 0, .27);
  if (player) {
    c.strokeStyle = INK; c.lineWidth = .19; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-.05, .23); c.bezierCurveTo(-.5, .42, -.52, .1 + stride, -.31, .1); c.stroke();
    c.strokeStyle = '#76b94d'; c.lineWidth = .12; c.stroke();
    rounded(c, -.25, -.07, .5, .43, .18, '#8bca58', INK);
    ellipse(c, -.03, .19, .16, .13, '#e8e4aa');
    line(c, [[-.14, .14], [.07, .14]], '#c6cb88', .025);
    rounded(c, .16, .06, .18, .22, .045, '#b77b47', INK);
    bolt(c, .25, .11, GOLD);
    rounded(c, -.27, -.015, .54, .1, .04, '#e8b964', INK);
    c.save(); c.rotate(a.facing);
    rounded(c, -.26, -.31, .61, .49, .2, s.status === 'lost' ? '#a8aa86' : '#99d75e', INK);
    rounded(c, .06, -.2, .34, .34, .13, '#e7e5b0', INK);
    for (const side of [-1, 1]) {
      ellipse(c, .085, side * .14 - .04, .105, .095, '#fffbea', INK);
      circle(c, .12, side * .14 - .04, .05, '#172f2d');
      circle(c, .137, side * .14 - .065, .017, '#fffdf0');
      circle(c, .26, side * .18 - .04, .035, '#df9675');
    }
    line(c, [[.24, .03], [.32, .01]], '#526141', .025);
    circle(c, .32, -.1, .017, '#768352');
    c.beginPath(); c.moveTo(-.31, -.19); c.quadraticCurveTo(-.12, -.51, .14, -.26);
    c.lineTo(.2, -.16); c.closePath(); c.fillStyle = '#416b47'; c.fill(); c.strokeStyle = INK; c.lineWidth = .04; c.stroke();
    line(c, [[-.17, -.33], [.06, -.28]], '#b8cc7a', .035);
    c.restore();
  } else {
    const alert = a.state === 'CHASE' || a.cameraReport, runner = a.kind === 'runner';
    const armor = a.corrupted ? '#71334b' : runner ? '#94604d' : '#53626c';
    const bone = a.corrupted ? '#bfa19d' : '#e1d7b6';
    line(c,[[-.17,.08],[-.21,.29 + stride],[-.26,.39 + stride]],bone,.09);
    line(c,[[.17,.08],[.21,.29 - stride],[.28,.39 - stride]],bone,.09);
    rounded(c, -.24, -.12, .48, .36, .1, armor, INK);
    for (const y of [-.02,.06,.14]) line(c, [[-.17,y],[0,y+.035],[.17,y]], bone, .037);
    line(c,[[-.2,-.07],[-.34,.03],[-.34,.18 + stride]],bone,.075);
    line(c,[[.21,-.07],[.33,.03],[.34,.19 - stride]],bone,.075);
    c.save(); c.rotate(a.facing);
    rounded(c, -.24, -.29, .58, .47, .18, bone, INK);
    rounded(c, .16, -.14, .24, .29, .055, bone, INK);
    for (const y of [-.1,.1]) {
      ellipse(c,.15,y,.095,.077,'#211c28');
      if (alert || a.corrupted) circle(c,.18,y,.03,'#ff8662');
      line(c,[[.26,y],[.35,y]],'#644e57',.027);
    }
    circle(c,.28,0,.035,'#45313b');
    if (runner) line(c,[[-.19,-.25],[-.01,-.31],[.13,-.26]],'#d79b6a',.065);
    c.restore();
    guardBadge(c, a.role);
    if (a.state !== 'PATROL' || a.suspicion > .05) {
      circle(c, 0, -.79, .19, alert ? '#eb9274' : GOLD, INK);
      text(c, a.state === 'RETURN' ? 'R' : alert ? '!' : a.state === 'SEARCH' ? '...' : '?', 0, -.78, .25, INK);
    }
    if (a.suspicion > .01) {
      rounded(c, -.29, -.59, .58, .065, .025, '#142b31');
      rounded(c, -.29, -.59, .58 * Math.min(1, a.suspicion), .065, .025, alert ? '#ed9678' : GOLD);
    }
  }
  c.restore();
  if (!player) stun(c, a, s);
}
export function goblin(c, a, s, reduced) {
  const angry = a.state === 'CHASE';
  const stride = !reduced && a.stunnedUntil <= s.time && a.path.length ? Math.sin(s.time * 18) * .07 : 0;
  c.save(); c.translate(a.x, a.y); c.rotate(a.facing);
  shadow(c, 0, .11, .49, .18);
  for (const side of [-1, 1]) {
    rounded(c,-.32 + side * stride,side * .17 - .07,.29,.15,.055,'#596346',INK);
    line(c,[[-.1,side * .16],[.08,side * .3],[.23 + stride,side * .35]],'#78964e',.12);
    for (const dy of [-.035,.035]) line(c,[[.18,side * .35+dy],[.29,side * .35+dy]],'#e4d2a3',.035);
  }
  ellipse(c, -.13, 0, .32, .26, a.tethered?'#426b70':'#654446', INK);
  for (const side of [-1, 1]) {
    c.beginPath(); c.moveTo(-.07,side*.15); c.lineTo(.02,side*.43); c.lineTo(.26,side*.18); c.closePath();
    c.fillStyle='#7ea550'; c.fill(); c.strokeStyle=INK; c.lineWidth=.04; c.stroke();
  }
  rounded(c, -.1, -.23, .55, .46, .16, '#89a951', INK);
  for (const y of [-.11,.11]) {
    circle(c,.2,y,.058,'#e8cb72',INK); circle(c,.23,y,.026,'#272a1d');
    line(c,[[.13,y + Math.sign(y) * .05],[.25,y + (angry ? 0 : Math.sign(y) * .035)]],INK,.043);
  }
  ellipse(c,.35,0,.11,.075,'#b4b965',INK);
  line(c,[[.37,-.12],[.47,0],[.37,.12]],INK,.047);
  for (const y of [-.105,.105]) line(c,[[.38,y],[.49,y*.6]],'#f3e3b1',.048);
  c.restore();
  if (a.barkUntil > s.time) { circle(c, a.x, a.y - .72, .22, GOLD, INK); text(c, '!', a.x, a.y - .72, .3, INK); }
  stun(c, a, s);
}
export function mimic(c, b, s, reduced) {
  const active = b.state === 'WINDUP' || b.state === 'BITE';
  const p = b.state === 'BITE' ? 1 : b.state === 'WINDUP' ? Math.min(1, 1 - Math.max(0, b.until - s.time) / (b.windup || .9)) : 0;
  c.save(); c.translate(b.x, b.y); c.rotate(Math.atan2(b.fy, b.fx));
  const tremble = active && !reduced ? Math.sin(s.time * 24) * .018 : 0;
  c.translate(0, tremble);
  crate(c, 0, -.04, active ? p * .13 : 0);
  if (active) {
    ellipse(c, .27, -.03, .34, .17 + p * .09, '#231c29', '#b18b96');
    for (const x of [.1, .27, .44]) {
      c.beginPath(); c.moveTo(x - .06, -.15 - p * .07); c.lineTo(x + .06, -.15 - p * .07); c.lineTo(x, -.025);
      c.closePath(); c.fillStyle = '#f0dfbf'; c.fill(); c.strokeStyle = '#4e3940'; c.lineWidth = .02; c.stroke();
    }
    if (b.state === 'BITE') { c.beginPath(); c.moveTo(.28, .08); c.quadraticCurveTo(.64, .3, .82, .03); c.strokeStyle = '#b57a7e'; c.lineWidth = .095; c.lineCap = 'round'; c.stroke(); }
    circle(c, -.12, -.23 - p * .12, .045, '#eab887');
    circle(c, -.12, .15, .045, '#eab887');
  } else {
    line(c, [[.25, -.2], [.31, -.14]], '#b7c0a052', .025);
    line(c, [[.24, -.03], [.35, -.02]], '#332c28', .035);
  }
  c.restore(); stun(c, b, s);
}
export function spider(c, b, s, reduced) {
  const dropping = b.state === 'TELEGRAPH' || b.state === 'STRIKE';
  const target = dropping ? b.mark : b;
  const progress = b.state === 'STRIKE' ? 1 : dropping ? Math.min(1, 1 - Math.max(0, b.until - s.time) / (b.windup || 1.2)) : 0;
  const x = b.x + (target.x - b.x) * progress, y = b.y + (target.y - b.y) * progress;
  line(c, [[b.x, b.y - .49], [x, y - .22]], '#b4c6c28c', .026);
  c.save(); c.translate(x, y - (dropping ? .05 : .18));
  shadow(c, 0, .3, .34, .09);
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
    const start = -.19 + i * .1, stride = !reduced && dropping ? Math.sin(s.time * 10 + i) * .025 : 0;
    const pts = [[side * .13, start], [side * (.27 + (i % 2) * .05), start - .12 + stride], [side * (.36 + (i % 2) * .04), start + .13]];
    line(c, pts, INK, .075); line(c, pts, '#8a809c', .035);
  }
  ellipse(c, 0, -.1, .2, .24, '#615b77', INK);
  ellipse(c, -.045, -.17, .1, .12, '#90849d');
  diamond(c, 0, -.13, '#baa0c3', .09);
  ellipse(c, 0, .14, .19, .14, '#a08b9e', INK);
  for (const dx of [-.08, .08]) { circle(c, dx, .13, .057, '#eee2c6', INK); circle(c, dx, .15, .025, '#392e45'); }
  line(c, [[-.08, .25], [-.04, .32]], '#e7d4b7', .035);
  line(c, [[.08, .25], [.04, .32]], '#e7d4b7', .035);
  c.restore(); stun(c, b, s, x, y);
}
export function beast(c, a, s, reduced) {
  const active = a.state === 'WINDUP' || a.state === 'RUSH', returning = a.state === 'RETURN';
  c.save(); c.translate(a.home.x, a.home.y); c.rotate(Math.atan2(a.dy, a.dx));
  if (a.entrance === 'false-door') {
    rounded(c, -.43, -.46, .24, .92, .07, '#536469', INK);
    rounded(c, -.4, -.38, .18, .76, .05, '#15282e');
    line(c, [[-.34, -.28], [-.29, -.19], [-.34, -.06]], '#8d979175', .025);
  } else { ellipse(c, -.16, .025, .36, .29, '#102329'); }
  c.restore();
  c.save(); c.translate(a.x, a.y); c.rotate(Math.atan2(a.dy, a.dx));
  c.globalAlpha = active ? .98 : returning ? .48 : .17;
  const pulse = reduced ? 0 : Math.sin(s.time * 2.2) * .018;
  for (let i = 3; i >= 0; i--) ellipse(c, -.16 - i * .11, .02, .29 - i * .035, .23 - i * .03 + pulse, '#343543');
  ellipse(c, .06, 0, .4, .29 + pulse, '#202735', active ? '#89748f' : null);
  if (active || returning) {
    for (const side of [-1, 1]) { ellipse(c, .21, side * .14, .075, .06, '#cf9b94'); circle(c, .23, side * .14, .028, '#ffe1b0'); }
    if (active) {
      ellipse(c, .29, 0, .18, .12, '#101d27', '#c09da6');
      for (const side of [-1, 1]) for (const x of [.22, .34]) line(c, [[x, side * .09], [x + .02, side * .025]], '#ecd8bc', .035);
    }
  } else if (!reduced && Math.sin(s.time * .8) > .94) ellipse(c, .22, -.12, .032, .018, '#ac9aa2');
  c.restore(); stun(c, a, s);
}
export function hide(c, z) {
  shadow(c, z.x, z.y + .32, .43, .11);
  rounded(c, z.x - .43, z.y - .43, .86, .84, .17, '#454259', INK);
  rounded(c, z.x - .32, z.y - .34, .64, .63, .12, '#242d40', '#878299');
  line(c, [[z.x - .31, z.y - .29], [z.x - .18, z.y], [z.x - .3, z.y + .24]], '#63536f', .1);
  line(c, [[z.x + .31, z.y - .29], [z.x + .18, z.y], [z.x + .3, z.y + .24]], '#63536f', .1);
  rounded(c, z.x - .14, z.y - .12, .28, .3, .045, '#8c809b', INK);
  circle(c, z.x, z.y + .025, .078, '#ded0f5');
  circle(c, z.x + .036, z.y - .006, .072, '#8c809b');
}
export function portal(c, z) {
  shadow(c, z.x, z.y + .22, .42, .12);
  ellipse(c, z.x, z.y + .04, .43, .25, '#346373', INK);
  ellipse(c, z.x, z.y, .34, .21, '#142e42', '#8bd3d6');
  ellipse(c, z.x, z.y - .02, .25, .13, '#548baa80');
  text(c, z.label, z.x, z.y + .015, .26, '#daf1e0');
}
export function plate(c, z, s) {
  const active = s.opened.has(z.door), remaining = s.gateTimers[z.door] - s.time;
  rounded(c, z.x - .4, z.y - .34, .8, .71, .08, '#445a5b', INK);
  rounded(c, z.x - .32, z.y - .28 + (active ? .04 : 0), .64, .54, .07, active ? '#669e88' : '#b1a16c', '#dbd3a1');
  for (const dx of [-.27, .27]) bolt(c, z.x + dx, z.y + .19, '#e0dcbd');
  if (s.crossed.has(z.door)) line(c, [[z.x - .12, z.y], [z.x - .025, z.y + .09], [z.x + .15, z.y - .12]], '#e3f3cd', .06);
  else text(c, remaining > 0 ? String(Math.ceil(remaining)) : 'P', z.x, z.y, .32, active ? '#e0f5d4' : INK);
}
export function exit(c, o, ready, descent = false) {
  if (ready && descent) {
    ellipse(c, o.x, o.y + .07, .51, .38, '#b65534', '#f9a165');
    ellipse(c, o.x, o.y + .03, .39, .29, '#29171b', '#713735');
    for (const side of [-1, 1]) {
      line(c, [[o.x + side * .34, o.y], [o.x + side * .56, o.y - .16],
        [o.x + side * .63, o.y - .08], [o.x + side * .78, o.y - .25]], '#ee8d5b', .055);
    }
    text(c, 'RETAK', o.x, o.y + .58, .18, '#ffba8b');
    return;
  }
  shadow(c, o.x, o.y + .3, .46, .13);
  ellipse(c, o.x, o.y + .08, .46, .31, ready ? '#528779' : '#46625d', INK);
  ellipse(c, o.x, o.y + .04, .35, .22, '#233f40', ready ? TEAL : '#8ba995');
  for (const dx of [-.42, .34]) rounded(c, o.x + dx, o.y - .45, .1, .56, .04, '#80958a', INK);
  line(c, [[o.x - .36, o.y - .43], [o.x - .22, o.y - .6], [o.x + .22, o.y - .6], [o.x + .39, o.y - .43]], ready ? '#9bcba8' : '#738878', .12);
  line(c, [[o.x, o.y + .17], [o.x, o.y - .12]], ready ? TEAL : '#b0c3aa', .055);
  line(c, [[o.x - .1, o.y - .02], [o.x, o.y - .12], [o.x + .1, o.y - .02]], ready ? TEAL : '#b0c3aa', .055);
  text(c, 'KELUAR', o.x, o.y + .58, .18, ready ? TEAL : '#b3c3a6');
}
export function door(c, d, s) {
  const open = s.opened.has(d.id);
  const trim = d.kind === 'lever' ? '#b9b1c9' : GOLD;
  shadow(c, d.x, d.y + .37, .48, .09);
  for (const dx of [-.46, .35]) rounded(c, d.x + dx, d.y - .52, .11, 1.02, .035, '#7e8b7d', INK);
  rounded(c, d.x - .48, d.y - .56, .96, .15, .04, '#a4ad94', INK);
  if (open) {
    line(c, [[d.x - .29, d.y + .29], [d.x + .29, d.y + .29]], '#7dc9ac', .055);
    return;
  }
  rounded(c, d.x - .34, d.y - .39, .68, .83, .05, '#73583c', INK);
  for (const dx of [-.21, .02, .24]) line(c, [[d.x + dx, d.y - .33], [d.x + dx, d.y + .36]], '#bc965d', .065);
  for (const dy of [-.24, .24]) { rounded(c, d.x - .34, d.y + dy, .68, .09, .02, '#3c5359', INK); for (const dx of [-.26, .26]) bolt(c, d.x + dx, d.y + dy + .045, '#b0b79f'); }
  rounded(c, d.x - .18, d.y - .13, .36, .36, .07, '#303b3b', trim);
  text(c, d.kind === 'plate' ? 'P' : d.label || d.key.toUpperCase(), d.x, d.y + .05, .29, trim);
}
export function pickup(c, o, bob) {
  shadow(c, o.x, o.y + .23, .22, .075);
  if (o.kind === 'artifact') {
    rounded(c, o.x - .22, o.y + .17, .44, .12, .035, '#587272', INK);
    circle(c, o.x, o.y - .06, .39, '#8be3db14');
    if (o.locked === 'boss') diamond(c, o.x, o.y - .075 + bob, '#78d0d4', .31);
    else {
      const y = o.y + bob;
      c.beginPath(); c.moveTo(o.x - .16,y+.085); c.lineTo(o.x-.065,y-.29); c.lineTo(o.x+.15,y-.17);
      c.lineTo(o.x+.19,y+.02); c.lineTo(o.x+.02,y+.14); c.closePath();
      c.fillStyle='#78d0d4'; c.fill(); c.strokeStyle=INK; c.lineWidth=.04; c.stroke();
    }
    line(c, [[o.x - .06, o.y - .18 + bob], [o.x + .02, o.y - .24 + bob]], '#efffdc', .03);
  } else if (o.kind === 'loot') {
    circle(c, o.x, o.y + bob, .235, '#b88a45', INK);
    circle(c, o.x, o.y - .025 + bob, .18, '#edc97b', '#f6e1a1');
    text(c, String(o.value || 1), o.x, o.y + bob, .23, '#755330');
    line(c, [[o.x - .11, o.y - .14 + bob], [o.x - .035, o.y - .18 + bob]], '#fff1bf', .025);
  } else {
    c.save(); c.translate(o.x, o.y + bob); c.rotate(-.4);
    circle(c, -.12, -.1, .145, GOLD, INK); circle(c, -.12, -.1, .065, '#3c5350');
    line(c, [[-.02, -.02], [.22, .22], [.29, .14]], INK, .12);
    line(c, [[-.02, -.02], [.22, .22], [.29, .14]], GOLD, .065);
    c.restore(); text(c, o.key.toUpperCase(), o.x, o.y + .43, .28, GOLD);
  }
}
export function lever(c, o, s) {
  const active = s.activated.has(o.id), dx = active ? .18 : -.18;
  shadow(c, o.x, o.y + .23, .3, .08);
  rounded(c, o.x - .29, o.y - .03, .58, .35, .065, '#627c76', INK);
  rounded(c, o.x - .23, o.y - .07, .46, .14, .045, '#a3b09a', INK);
  line(c, [[o.x, o.y + .06], [o.x + dx, o.y - .3]], INK, .13);
  line(c, [[o.x, o.y + .06], [o.x + dx, o.y - .3]], '#d5bd80', .07);
  circle(c, o.x + dx, o.y - .3, .1, active ? TEAL : GOLD, INK);
  text(c, o.label, o.x, o.y + .44, .26, active ? TEAL : GOLD);
}
export function bell(c, o) {
  shadow(c, o.x, o.y + .25, .23, .07);
  c.beginPath(); c.moveTo(o.x - .22, o.y + .08); c.quadraticCurveTo(o.x - .14, o.y, o.x - .14, o.y - .14);
  c.quadraticCurveTo(o.x, o.y - .37, o.x + .14, o.y - .14); c.quadraticCurveTo(o.x + .14, o.y, o.x + .22, o.y + .08);
  c.closePath(); c.fillStyle = '#d9ac5f'; c.fill(); c.strokeStyle = INK; c.lineWidth = .045; c.stroke();
  line(c, [[o.x - .18, o.y + .09], [o.x + .18, o.y + .09]], GOLD, .055);
  circle(c, o.x, o.y + .16, .055, '#c48d49', INK);
  line(c, [[o.x - .07, o.y - .2], [o.x - .1, o.y - .07]], '#f6d994', .03);
}
export function torch(c, o, s, reduced) {
  const flicker = reduced ? 0 : Math.sin(s.time * 7 + o.x) * .02;
  rounded(c, o.x - .085, o.y - .02, .17, .37, .04, '#94693e', INK);
  rounded(c, o.x - .15, o.y - .08, .3, .12, .03, '#506265', INK);
  c.beginPath(); c.moveTo(o.x, o.y - .56); c.quadraticCurveTo(o.x + .03, o.y - .38, o.x + .15 + flicker, o.y - .26);
  c.quadraticCurveTo(o.x + .19, o.y - .04, o.x, o.y - .08); c.quadraticCurveTo(o.x - .24, o.y - .05, o.x - .13, o.y - .32);
  c.quadraticCurveTo(o.x - .08, o.y - .23, o.x, o.y - .56); c.fillStyle = '#edac5e'; c.fill(); c.strokeStyle = INK; c.lineWidth = .03; c.stroke();
  ellipse(c, o.x, o.y - .18, .065, .11, '#ffe1a0');
}
export function camera(c, o) {
  shadow(c, o.x, o.y + .25, .3, .09);
  rounded(c, o.x - .25, o.y + .05, .5, .22, .06, '#6e7d8b', INK);
  rounded(c, o.x - .065, o.y - .12, .13, .25, .035, '#a3b3b0', INK);
  c.save(); c.translate(o.x, o.y - .18); c.rotate(o.facing);
  rounded(c, -.27, -.17, .5, .34, .08, o.triggered ? '#b87d79' : '#a3a1b9', INK);
  line(c, [[-.18, -.11], [.1, -.11]], '#ded9c8', .03);
  rounded(c, .16, -.14, .19, .28, .045, '#435961', INK);
  circle(c, .29, 0, .09, '#1c3745', '#d8e7d0');
  circle(c, .31, 0, .045, o.triggered ? '#f2b27e' : '#81cfd1');
  circle(c, -.16, .075, .025, o.triggered ? '#ffd2a0' : '#d3e7a9');
  c.restore();
  if (o.triggered) { circle(c, o.x, o.y - .73, .15, '#eaa483', INK); text(c, '!', o.x, o.y - .73, .23, INK); }
}
export function hazard(c, t, phase) {
  const color = phase === 'active' ? '#ed9678' : phase === 'warning' ? GOLD : '#778c8b';
  rounded(c, t.x - .4, t.y - .35, .8, .7, .08, '#273e43', INK);
  rounded(c, t.x - .33, t.y - .28, .66, .56, .06, '#172e37', color);
  for (const dx of [-.21, 0, .21]) {
    c.beginPath(); c.moveTo(t.x + dx - .075, t.y + .16); c.lineTo(t.x + dx + .075, t.y + .16);
    c.lineTo(t.x + dx, t.y - (phase === 'active' ? .23 : .015)); c.closePath();
    c.fillStyle = color; c.fill(); c.strokeStyle = '#283638'; c.lineWidth = .02; c.stroke();
  }
  if (phase === 'warning') circle(c, t.x + .29, t.y - .24, .045, GOLD);
}
export function trap(c, t, s) {
  if (t.from && s.time < t.landAt) {
    const p = (s.time - t.thrownAt) / (t.landAt - t.thrownAt);
    const x = t.from.x + (t.x - t.from.x) * p, y = t.from.y + (t.y - t.from.y) * p;
    shadow(c, x, y + .19, .23, .055);
    circle(c, x, y - Math.sin(p * Math.PI) * .62, .17, '#a786d2', INK);
    return;
  }
  const armed = s.time >= t.armedAt && !t.spent, color = armed ? '#c1a6ef' : '#8c9b8f';
  shadow(c, t.x, t.y + .19, .33, .08);
  ellipse(c, t.x, t.y + .035, .34, .25, '#2b4247', INK);
  c.beginPath(); c.arc(t.x, t.y, .29, .15, Math.PI - .15); c.arc(t.x, t.y, .29, Math.PI + .15, TAU - .15);
  c.strokeStyle = color; c.lineWidth = .06; c.stroke();
  for (const dx of [-.17, 0, .17]) {
    line(c, [[t.x + dx, t.y - .21], [t.x + dx, t.y - (armed ? .11 : .18)]], color, .045);
    line(c, [[t.x + dx, t.y + .21], [t.x + dx, t.y + (armed ? .11 : .18)]], color, .045);
  }
  circle(c, t.x, t.y, .095, '#b0ba8b', INK);
}
export function web(c, b) {
  c.save(); c.globalAlpha = b.state === 'RECOVER' ? .07 : .23;
  c.strokeStyle = '#c1d0c9'; c.lineWidth = .025;
  for (let i = 0; i < 8; i++) {
    const a = i * TAU / 8, next = (i + 1) * TAU / 8;
    line(c, [[b.x, b.y], [b.x + Math.cos(a) * b.web, b.y + Math.sin(a) * b.web]], '#c1d0c9', .025);
    for (let ring = 1; ring <= 3; ring++) {
      const r = b.web * ring / 3, mid = (a + next) / 2;
      c.beginPath(); c.moveTo(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r);
      c.quadraticCurveTo(b.x + Math.cos(mid) * r * .84, b.y + Math.sin(mid) * r * .84, b.x + Math.cos(next) * r, b.y + Math.sin(next) * r); c.stroke();
    }
  }
  c.restore();
}
export function strikeCue(c, b) {
  c.save(); circle(c, b.mark.x, b.mark.y, b.strike, '#ed98782e', '#e7a68b');
  line(c, [[b.mark.x - .12, b.mark.y - .12], [b.mark.x + .12, b.mark.y + .12]], '#f3ccb0', .035);
  line(c, [[b.mark.x + .12, b.mark.y - .12], [b.mark.x - .12, b.mark.y + .12]], '#f3ccb0', .035); c.restore();
}


export function mimicCue(c, b, points) {
  c.save();
  c.beginPath(); points.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.closePath();
  c.fillStyle = b.state === 'BITE' ? '#e29b7c38' : '#e6c37b1c'; c.fill();
  c.strokeStyle = '#e4bc83'; c.lineWidth = .035;
  if (b.state === 'WINDUP') c.setLineDash([.09, .12]);
  c.stroke(); c.setLineDash([]);
  // The ground jaws mark the real bite centre, not the crate's solid body tile.
  c.beginPath(); c.arc(b.mouth.x, b.mouth.y, .22, .25, Math.PI - .25);
  c.arc(b.mouth.x, b.mouth.y, .22, Math.PI + .25, TAU - .25); c.stroke();
  c.restore();
}

export function echoBody(c, b, s, reduced) {
  const bob = reduced ? 0 : Math.sin(s.time * 4 + b.x) * .065;
  const { x, y } = b;
  const awake = b.state === 'TELEGRAPH' || b.state === 'STRIKE';
  shadow(c, x, y + .29, .44, .15);
  c.save();
  c.translate(x, y + bob);
  c.beginPath();
  c.moveTo(-.5, -.49); c.quadraticCurveTo(-.14, -.54, -.16, -.28);
  c.lineTo(.16, -.28); c.quadraticCurveTo(.14, -.54, .5, -.49);
  c.lineTo(.39, .04); c.quadraticCurveTo(.2, .37, 0, .36);
  c.quadraticCurveTo(-.2, .37, -.39, .04); c.closePath();
  c.fillStyle = awake ? '#683f7b' : '#3f2b58'; c.fill();
  c.strokeStyle = '#d692c7'; c.lineWidth = .04; c.stroke();
  ellipse(c, 0, .1, .22, awake ? .17 : .085, '#211224', '#be82b8');
  for (const side of [-1, 1]) {
    circle(c, side * .18, -.11, .056, '#ffc68c');
    line(c, [[side * .43, -.24], [side * .33, -.12]], '#da9ed2', .038);
  }
  c.restore();
}
export function echoCue(c, b, points) {
  const active = b.state === 'STRIKE';
  c.save();
  c.beginPath();
  points.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y));
  c.closePath();
  c.fillStyle = active ? '#e669d98f' : '#9d55ca52'; c.fill();
  c.strokeStyle = '#ffc8f3'; c.lineWidth = .065;
  c.setLineDash(active ? [] : [.18, .1]); c.stroke(); c.setLineDash([]);
  text(c, '✕', b.mark.x, b.mark.y, .38, '#ffe4fa');
  c.restore();
}

export function cinderBody(c, b) {
  const heat = b.state === 'WINDUP' ? '#fff2a0' : '#ee8150';
  c.save();
  c.translate(b.x, b.y);
  shadow(c, 0, .24);
  c.rotate(b.facing || 0);
  rounded(c, -.46, -.32, .75, .63, .18, '#58313c', '#1d1720');
  diamond(c, -.34, -.25, '#c87457', .17);
  diamond(c, -.36, .23, '#a64b4d', .16);
  ellipse(c, .21, 0, .25, .24, '#452631', '#d17c58');
  ellipse(c, .33, 0, .15, .135, '#281920', heat);
  circle(c, .365, 0, b.state === 'WINDUP' ? .092 : .052, heat);
  for (const side of [-1, 1]) circle(c, .02, side * .185, .058, '#ffac6e');
  c.restore();
}
export function cinderWarning(c, b) {
  c.save();
  line(c, [[b.x, b.y], [b.shotEnd.x, b.shotEnd.y]], '#de652e70', .6);
  c.setLineDash([.24, .14]);
  line(c, [[b.x, b.y], [b.shotEnd.x, b.shotEnd.y]], '#ffc583', .065);
  c.restore();
}
export function emberBolt(c, b) {
  const { x, y } = b.bolt;
  const dx = Math.cos(b.facing), dy = Math.sin(b.facing);
  line(c, [[x - dx * .52, y - dy * .52], [x, y]], '#ed572ca0', .19);
  circle(c, x, y, .18, '#fa8a40', '#ffcf7a');
  circle(c, x + dx * .045, y + dy * .045, .085, '#fff2bf');
}
export function hunterBody(c, b, s, reduced) {
  const gait = reduced ? 0 : Math.sin(s.time * 15) * .06;
  c.save();
  c.translate(b.x, b.y);
  shadow(c, 0, .28, .47);
  c.rotate(b.facing || 0);
  for (const side of [-1, 1]) {
    line(c, [[-.3, side * .16], [-.4 + gait, side * .34], [-.26 + gait, side * .42]], '#a67b75', .13);
    line(c, [[.12, side * .17], [.12 - gait, side * .36], [.29 - gait, side * .41]], '#cda393', .13);
  }
  ellipse(c, -.17, 0, .32, .25, '#3e2a3c', '#1e1520');
  rounded(c, -.26, -.14, .5, .29, .11, '#82515f', '#2b1d30');
  for (const dx of [-.24, -.08, .08]) line(c, [[dx, -.14], [dx + .045, .15]], '#e3b5a1', .075);
  rounded(c, .06, -.21, .37, .42, .16, '#b58c89', '#32232d');
  for (const side of [-1, 1]) circle(c, .28, side * .1, .05, '#ff705c');
  c.restore();
}
export function hunterCue(c, b) {
  const { x, y } = b.mark;
  circle(c, x, y, b.strike, b.state === 'STRIKE' ? '#ed654c85' : '#be534049', '#ffc0a0');
  for (const dx of [-.19, 0, .19]) line(c, [[x + dx - .08, y + .21], [x + dx + .12, y - .23]], '#ffd0ae', .068);
}
export function cinematicGate(c, point, transition, reduced) {
  const p = transition.progress, { x, y } = point;
  const descent = transition.kind === 'descent';
  c.save();
  if (descent) {
    const width = .54 + p * .71;
    ellipse(c, x, y + .08, width, width * .62, '#bd4e34', '#ffa06b');
    ellipse(c, x, y + .06, width * .89, width * .52, '#160e17');
    for (let i = 0; i < 7; i++) {
      const a = i * TAU / 7;
      const start = width * .73, end = width * (1.05 + p * .5);
      line(c, [[x + Math.cos(a) * start, y + Math.sin(a) * start],
        [x + Math.cos(a + .16) * (start + end) / 2, y + Math.sin(a + .16) * (start + end) / 2],
        [x + Math.cos(a) * end, y + Math.sin(a) * end]], '#f58b56', .055);
    }
  } else {
    c.globalAlpha = .42 + p * .5;
    ellipse(c, x, y - p * .45, .43 + p * .38, .27 + p * .63, '#e79b46', '#ffda8b');
    ellipse(c, x, y - p * .47, .29 + p * .26, .19 + p * .43, '#fff0b4', '#fff6da');
  }
  if (!reduced) for (let i = 0; i < 12; i++) {
    const a = i * 2.4, radius = .32 + p * (.6 + (i % 4) * .29);
    c.globalAlpha = Math.sin(p * Math.PI) * .76;
    diamond(c, x + Math.cos(a) * radius, y + Math.sin(a) * radius - p * .55, descent ? '#ed976b' : '#ffe1a1', .035 + i % 3 * .014);
  }
  c.restore();
}
