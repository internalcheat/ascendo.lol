export const PREFERENCES_KEY='ascendo-chess-preferences-v1';
export const BOARD_THEMES=['ascendo','walnut','forest','slate'];
export const PIECE_THEMES=['classic','modern','outline'];
export function normalizePreferences(value){
  return {board:BOARD_THEMES.includes(value?.board)?value.board:'ascendo',pieces:PIECE_THEMES.includes(value?.pieces)?value.pieces:'classic',premoves:typeof value?.premoves==='boolean'?value.premoves:true};
}
export function readPreferences(storage){try{return normalizePreferences(JSON.parse((storage??globalThis.localStorage).getItem(PREFERENCES_KEY)));}catch{return normalizePreferences();}}
export function savePreferences(value,storage){try{(storage??globalThis.localStorage).setItem(PREFERENCES_KEY,JSON.stringify(normalizePreferences(value)));return true;}catch{return false;}}
