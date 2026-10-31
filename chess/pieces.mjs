// Original compact Staunton-inspired artwork. No external images or fonts are needed.
const shapes={
 p:'<circle cx="24" cy="13" r="6"/><path d="M20 19h8l2 13 5 7H13l5-7Z"/><path d="M12 39h24v5H12Z"/>',
 r:'<path d="M12 7h6v6h4V7h4v6h4V7h6v13l-5 4 1 13 4 3v4H12v-4l4-3 1-13-5-4Z"/><path d="M17 24h14M16 37h16M14 19h20" fill="none"/>',
 n:'<path d="m14 37 1-7 11-12-11 4-5-5L24 5l3 5 8 4c4 12-8 14-4 23l5 4v3H12v-4Z"/><path d="m22 14 3-1M28 14c6 4 3 8 0 12M15 37h17" fill="none"/>',
 b:'<path d="M24 6c-13 10-13 17-3 21l-3 10-6 4v3h24v-3l-6-4-3-10c10-4 10-11-3-21Z"/><path d="m26 12-7 8M18 37h12M19 27h10" fill="none"/><circle cx="24" cy="5" r="2"/>',
 q:'<path d="m12 15 6 8 6-11 6 11 6-8-5 20H17Z"/><path d="m17 35-4 6v3h22v-3l-4-6Z"/><circle cx="11" cy="12" r="3"/><circle cx="24" cy="9" r="3"/><circle cx="37" cy="12" r="3"/><path d="M18 30h12M17 35h14" fill="none"/>',
 k:'<path d="M24 5v12M19 10h10" fill="none" stroke-width="3"/><path d="M24 18c-11-10-21 1-9 13l3 6-5 4v3h22v-3l-5-4 3-6c12-12 2-23-9-13Z"/><path d="M16 30h16M18 37h12" fill="none"/>'
};
export const pieceNames={p:'pawn',r:'rook',n:'knight',b:'bishop',q:'queen',k:'king'};
export function pieceMarkup(piece){return `<svg class="piece ${piece.color==='w'?'white':'black'}" viewBox="0 0 48 48" fill="var(--piece-fill)" stroke="var(--piece-stroke)" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${shapes[piece.type]}</svg>`;}
