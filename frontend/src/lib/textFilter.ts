import { Filter } from 'bad-words';
import profanityWords from '@/data/profanity-words.json';

// Las palabras a censurar se editan en `src/data/profanity-words.json`.
// `bad-words` aporta la lista base en inglés; el JSON suma español y
// modismos chilenos.
//
// La detección es OBFUSCACIÓN-ROBUSTA:
//  * insensible a tildes, mayúsculas y letras repetidas ("weaaa", "MARICON");
//  * permite separar las letras con cualquier carácter no-alfabético
//    ("m/i/e/r/d/a", "m i e r d a", "m-i-e-r-d-a"), a la vez que mantiene
//    límites de palabra para no censurar términos idénticos dentro de
//    palabras más largas ("ganas" no se corta como "as").

let profanitySet: Set<string> | null = null;
let profanityRegex: RegExp | null = null;

function escapeRegexChar(char: string): string {
  return char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function collapseRepeats(word: string): string {
  return word.replace(/(.)\1{1,}/g, '$1');
}

function normalizeWord(word: string): string {
  return collapseRepeats(
    word
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
  );
}

// Versión de la misma longitud que el original (no elimina caracteres),
// de modo que los índices de los matches se correspondan 1:1 con `text`.
function normalizeForMatch(text: string): string {
  return Array.from(text)
    .map((ch) => {
      const base = ch.toLowerCase().normalize('NFD')[0];
      return base ?? ch;
    })
    .join('');
}

function getProfanitySet(): Set<string> {
  if (!profanitySet) {
    profanitySet = new Set<string>();
    const filter = new Filter();
    for (const word of [...filter.list, ...profanityWords]) {
      const normalized = normalizeWord(word);
      if (normalized) profanitySet.add(normalized);
    }
  }
  return profanitySet;
}

function getProfanityRegex(): RegExp {
  if (!profanityRegex) {
    const set = getProfanitySet();
    const parts = Array.from(set)
      .sort((a, b) => b.length - a.length)
      .map((word) => {
        const pattern = Array.from(word)
          .map((char) => `${escapeRegexChar(char)}+`)
          .join('[^a-z]*');
        return `(?<![a-z])${pattern}(?![a-z])`;
      });
    profanityRegex = new RegExp(parts.join('|'), 'g');
  }
  return profanityRegex;
}

function findProfanitySpans(text: string): Array<[number, number]> {
  const re = getProfanityRegex();
  const normalized = normalizeForMatch(text);
  re.lastIndex = 0;
  const spans: Array<[number, number]> = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(normalized)) !== null) {
    spans.push([match.index, match.index + match[0].length]);
    if (match[0].length === 0) re.lastIndex += 1;
  }
  return spans;
}

export function containsProfanity(text: string): boolean {
  return findProfanitySpans(text).length > 0;
}

export function sanitizeDescription(text: string): { text: string; replaced: boolean } {
  const spans = findProfanitySpans(text);
  if (spans.length === 0) return { text, replaced: false };
  let result = '';
  let last = 0;
  for (const [start, end] of spans) {
    result += text.slice(last, start) + '***';
    last = end;
  }
  result += text.slice(last);
  return { text: result, replaced: true };
}
