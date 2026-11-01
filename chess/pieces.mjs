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
const modern={
 p:'<circle cx="24" cy="12" r="6"/><path d="M21 19h6l4 16H17Z"/><path d="M13 39h22v5H13Z"/>',
 r:'<path d="M12 7h6v7h4V7h4v7h4V7h6v14H12Z"/><path d="M18 24h12v11H18Z"/><path d="M13 39h22v5H13Z"/>',
 n:'<path d="m13 22 13-16 9 8-7 11 4 10H17l4-13-5 3Z"/><circle cx="27" cy="13" r="1" fill="var(--piece-stroke)" stroke="none"/><path d="M13 39h22v5H13Z"/>',
 b:'<path d="M24 5 13 19l8 9-4 7h14l-4-7 8-9Z"/><path d="m27 12-6 8" fill="none"/><path d="M13 39h22v5H13Z"/>',
 q:'<circle cx="11" cy="11" r="2"/><circle cx="24" cy="7" r="2"/><circle cx="37" cy="11" r="2"/><path d="m12 16 6 7 6-11 6 11 6-7-5 19H17Z"/><path d="M13 39h22v5H13Z"/>',
 k:'<path d="M24 4v13M19 9h10" fill="none" stroke-width="3"/><path d="m24 19 12 8-6 8H18l-6-8Z"/><path d="M13 39h22v5H13Z"/>'
};
export function pieceMarkup(piece,theme='classic'){
  const style=['classic','modern','outline'].includes(theme)?theme:'classic';
  return `<svg class="piece ${piece.color==='w'?'white':'black'} set-${style}" viewBox="0 0 48 48" fill="var(--piece-fill)" stroke="var(--piece-stroke)" stroke-width="${style==='outline'?'2.4':'1.6'}" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${(style==='modern'?modern:shapes)[piece.type]}</svg>`;
}
