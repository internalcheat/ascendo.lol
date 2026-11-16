import test from 'node:test';
import assert from 'node:assert/strict';
import { colorize, generate, nearestLegacyColor, MAX_TEXT_LENGTH } from './format.mjs';

const colors = ['#ff0000', '#0000ff'];

function decodeProperties(value) {
  return value.replace(/\\(u[\da-fA-F]{4}|.)/g, (_, escape) => {
    if (escape.startsWith('u')) return String.fromCharCode(parseInt(escape.slice(1), 16));
    return ({ n: '\n', t: '\t', '\\': '\\' })[escape] ?? escape;
  });
}

test('gradient endpoints and midpoint are correct, including multiple color stops', () => {
  assert.deepEqual(colorize('ABC', colors).map(token => token.color), ['#ff0000', '#800080', '#0000ff']);
  assert.deepEqual(colorize('ABCDE', ['#f00', '#0f0', '#00f']).map(token => token.color),
    ['#ff0000', '#808000', '#00ff00', '#008080', '#0000ff']);
  assert.deepEqual(colorize('A', colors), [{ text: 'A', color: '#ff0000' }]);
  assert.deepEqual(colorize('AB', colors, 'solid').map(token => token.color), ['#ff0000', '#ff0000']);
});

test('emoji and combining sequences receive one color without being split', () => {
  const tokens = colorize('👩🏽‍🚀e\u0301B', colors);
  assert.equal(tokens.length, 3);
  assert.equal(tokens[0].text, '👩🏽‍🚀');
  assert.equal(tokens[1].text, 'e\u0301');
  assert.equal(tokens[2].color, '#0000ff');
});

test('newlines are normalized and do not consume gradient steps', () => {
  const tokens = colorize('A\r\nB\rC', colors);
  assert.equal(tokens.map(token => token.text).join(''), 'A\nB\nC');
  assert.deepEqual(tokens.filter(token => token.text !== '\n').map(token => token.color),
    ['#ff0000', '#800080', '#0000ff']);
});

test('MiniMessage escapes untrusted opening tags and backslashes with balanced styling', () => {
  const output = generate({ text: '<click:run_command:/op @s>\\', colors: ['#ff0000'], bold: true, italic: true });
  assert.equal(output, '<bold><italic><#ff0000>\\<click:run_command:/op @s>\\\\</#ff0000></italic></bold>');
  assert.ok(!output.includes('><click:'));
});

test('JSON components preserve literal text and explicitly define all decoration states', () => {
  const text = '"}]},"click_event":{"action":"run_command"}\\\n👾';
  const component = JSON.parse(generate({ text, colors, format: 'json', bold: true }));
  assert.equal(component.extra.map(part => part.text).join(''), text);
  assert.equal(component.bold, true);
  assert.equal(component.italic, false);
  assert.equal(component.underlined, false);
  assert.equal(component.strikethrough, false);
  assert.ok(component.extra.every(part => Object.keys(part).sort().join(',') === 'color,text'));
});

test('legacy RGB repeats styles after each resetting color and resets at the end', () => {
  const output = generate({ text: 'AB', colors, format: 'legacy', bold: true, underlined: true });
  assert.equal(output, '&x&f&f&0&0&0&0&l&nA&x&0&0&0&0&f&f&l&nB&r');
  assert.equal(generate({ text: 'AB', colors: ['#ff0000'], format: 'legacy' }),
    '&x&f&f&0&0&0&0A&x&f&f&0&0&0&0B&r');
});

test('literal legacy ampersand sequences remain text instead of creating injected codes', () => {
  const output = generate({ text: '&aH', colors: ['#ff0000'], format: 'legacy' });
  const stripGenerated = output.replace(/&x(?:&[\da-f]){6}|&r/g, '');
  assert.equal(stripGenerated, '&aH');
  assert.ok(!output.includes('&aH'));
});

test('MOTD uses only 16-color codes, retains styles and generates an escaped properties line', () => {
  const output = generate({ text: 'A\nB', colors: ['#55ffff', '#ff5555'], bold: true, format: 'motd' });
  assert.equal(output, 'motd=\\u00A7b\\u00A7lA\\n\\u00A7c\\u00A7lB\\u00A7r');
  assert.ok(!output.includes('\\u00A7x'));
  assert.ok(!output.includes('\n'));
  assert.equal(nearestLegacyColor('#56fefe').code, 'b');
});

test('properties escaping protects literal backslash sequences and non-ASCII text', () => {
  const text = '\\n\\u00A7c\\👾á';
  const output = generate({ text, colors, format: 'motd' });
  const decoded = decodeProperties(output.slice(5)).replace(/§[0-9a-frlomn]/g, '');
  assert.equal(decoded, text);
});

test('empty input creates no output; text work and output are bounded', () => {
  for (const format of ['minimessage', 'legacy', 'json', 'motd']) {
    assert.equal(generate({ text: '', format }), '');
  }
  assert.equal(colorize('👾'.repeat(20000), colors).length, MAX_TEXT_LENGTH);
  assert.equal(colorize('A\u0000B', colors).map(token => token.text).join(''), 'AB');
});

test('invalid colors cannot enter markup, CSS-like values fall back safely', () => {
  const output = generate({ text: 'A', colors: ['red><click:run_command:/op>'], format: 'minimessage' });
  assert.equal(output, '<#b88cff>A</#b88cff>');
  assert.equal(colorize('A', ['#ABC'])[0].color, '#aabbcc');
});
