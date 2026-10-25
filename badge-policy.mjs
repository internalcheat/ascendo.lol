import { confusables } from './vendor/unicode-confusables-18.mjs';

export const RESERVED_BADGE_ERROR = 'This badge contains a reserved word.';
export const RESERVED_BADGES = Object.freeze({
  leadership: ['Owner','Co-Owner','Founder','Co-Founder','CEO','CTO','COO','President','Director','Executive','Chairman','Creator','Proprietor','Head','Leader'],
  staff: ['Admin','Administrator','Superadmin','Head Admin','Staff','Staff Member','Team','Management','Manager','Moderator','Mod','Head Mod','Trial Mod','Helper','Support','Support Team','Developer','Dev','Head Developer','Lead Developer','Operator','OP','Maintainer'],
  status: ['Official','Verified','Authentic','Legit','Trusted','Authorized','Certified','Partner','Sponsor','Ambassador','Representative','VIP','MVP','Premium','Special','Exclusive','OG','Veteran','Member','Tester','Beta Tester','Quality Assurance','QA'],
  identity: ['InternalCheat','InternalCheats','Internal','Ascendo','Ascendo Team','Ascendo Staff','Ascendo Owner','Ascendo Founder','Ascendo Developer','Ascendo Admin','Ascendo Official','Ascendo Support','Ascendo Client'],
  authority: ['System','Security','Security Team','Root','Superuser','Webmaster','Site Admin','Site Owner','Bot','Automation','Service Account']
});

const substitutions = Object.freeze({ '0':['o'], '1':['i','l'], '2':['z'], '3':['e'], '4':['a'], '5':['s'], '6':['g','b'], '7':['t'], '8':['b'], '9':['g','q'], '@':['a'], '$':['s'], '!':['i','l'], '|':['i','l'], '+':['t'] });
const bidi = /\p{Bidi_Control}/u;
const ignored = /[\p{M}\p{Default_Ignorable_Code_Point}]/gu;
const letters = /[\p{L}\p{N}]/u;

function skeleton(value, foldFirst = true) {
  let result = value.normalize('NFKD');
  if (foldFirst) result = result.toLowerCase();
  for (let pass = 0; pass < 4; pass++) {
    const next = [...result].map(character => confusables[character] ?? character).join('').normalize('NFKD').toLowerCase().replace(ignored,'');
    if (result === next) break;
    result = next;
  }
  return result;
}

function compact(value, foldFirst = true) { return [...skeleton(value,foldFirst)].filter(character => letters.test(character)).join(''); }

const trie = [{ next:new Map(), end:false }];
for (const term of Object.values(RESERVED_BADGES).flat()) {
  let state = 0;
  for (const character of compact(term)) {
    if (!trie[state].next.has(character)) { trie[state].next.set(character,trie.length); trie.push({next:new Map(),end:false}); }
    state = trie[state].next.get(character);
  }
  trie[state].end = true;
}

export function containsReservedBadge(value) {
  if (typeof value !== 'string' || value.length > 32 || bidi.test(value)) return true;
  let states = new Set([0]);
  for (const character of value.normalize('NFKD').replace(ignored,'')) {
    const possibilities = new Set([compact(character),compact(character,false)]);
    for (const substitute of substitutions[character] || []) possibilities.add(compact(substitute));
    if (/\p{N}/u.test(character) && compact(character) === 'l') possibilities.add(compact('i'));
    const next = new Set([0]);
    for (const start of states) {
      for (const spelling of possibilities) {
        let paths = new Set([start,0]);
        for (const letter of spelling) {
          const following = new Set([0]);
          for (const state of paths) {
            const destination = trie[state].next.get(letter);
            if (destination === undefined) continue;
            if (trie[destination].end) return true;
            following.add(destination);
          }
          paths = following;
        }
        for (const state of paths) next.add(state);
      }
    }
    states = next;
  }
  return false;
}

export function badgeError(value, canUseReservedBadges = false) {
  return bidi.test(value) || (!canUseReservedBadges && containsReservedBadge(value)) ? RESERVED_BADGE_ERROR : '';
}
