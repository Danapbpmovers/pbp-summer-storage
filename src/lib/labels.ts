import { randomInt } from 'node:crypto'

// Unambiguous alphabet (no 0/O, 1/I/L) so codes can be read and typed at a station.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

export function newLabelCode() {
  let c = ''
  for (let i = 0; i < 7; i++) c += ALPHABET[randomInt(ALPHABET.length)]
  return `PSS-${c}`
}
