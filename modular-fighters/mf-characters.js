/* =========================================================
   Modular Fighters — CHARACTERS (data, not code)
   One entry per fighter. Adding a character = one entry here + one asset file (square,
   black line art on white; .mp4 loop or .png). The invite / registration page
   (invite.html) collects favourites, a special ability and a signature-module design
   from each character's owner; the review page (review.html) turns a submission into
   an entry for this file.

     id         short key, [a-z0-9], used in save data, the queue and hello messages
     name       label on the tile, the HP bar is the player's own name
     src        assets/<file>.mp4 (loop) or .png (still, gently bobbed)
     facing     1 = the drawing faces right, -1 = faces left (mirrored as needed)
     by         credit (shown on the invite page and in the help sheet)
     favorites  up to 3 module types guaranteed in every deal for this character
                (VCO MIXVCA LPF FOLD DELAY ADSR AR SEQ5 DRAW)
     special    one of MF_SPECIALS keys or null (never shown in the game: hidden traits, user rule)
     module     signature module (null until one is designed and built):
                { type: <existing type>, label: 'NAME', params: {...preset / range overrides} }
   ========================================================= */
window.MF_SPECIALS = {
  power:  { zh: '攻擊力 ×1.3',          en: 'Attack ×1.3',               ja: '攻撃力 ×1.3' },
  fav2:   { zh: '慣用模組每種出現兩個', en: 'Two of each favourite module', ja: '得意モジュールが各2つ' },
  hp120:  { zh: '血量 120',             en: 'HP 120',                    ja: 'HP 120' },
  auto6:  { zh: 'AUTO 鎖定 6 秒',       en: 'AUTO unlocks in 6 s',       ja: 'AUTO ロック 6 秒' },
  deal11: { zh: '送出後下一組 11 個模組', en: '11 modules after each send', ja: '送信後は 11 モジュール' }
};
window.MF_SPECIAL_RULES = { power: 1.3, hp120: 120, auto6: 6000, deal11: 11 };

window.MF_CHARACTERS = [
  { id: 'osc',     name: 'OSC',     src: 'assets/osc.mp4',     facing: 1,  by: 'OSC兄弟', favorites: [], special: null,    module: null },
  { id: 'moddict', name: 'MODDICT', src: 'assets/moddict.mp4', facing: -1, by: 'OSC兄弟', favorites: [], special: null,    module: null },
  { id: 'tatata5', name: 'TATATA5', src: 'assets/tatata5.mp4', facing: 1,  by: 'OSC兄弟', favorites: [], special: null,    module: null },
  { id: 'mad',     name: 'MAD',     src: 'assets/mad.mp4',     facing: -1, by: 'OSC兄弟', favorites: [], special: null,    module: null },
  { id: 'hataken', name: 'HATAKEN', src: 'assets/hataken.mp4', facing: -1, by: 'HATAKEN', favorites: [], special: 'power', module: null },
  { id: 'zhyper',  name: 'Z_Hyper', src: 'assets/zhyper.mp4',  facing: -1, by: 'Z_Hyper', favorites: [], special: null,    module: null }
];
