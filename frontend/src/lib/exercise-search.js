import { BODY_PART_NAMES } from './exercises.js'

const normalize = value => String(value || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const documents = new WeakMap()

function documentOf(exercise) {
  if (!documents.has(exercise)) {
    const name = normalize(exercise.n)
    documents.set(exercise, {
      name,
      fields: [
        { words: name.split(' '), penalty: 0, fuzzy: true },
        { words: normalize([exercise.tg, exercise.bp, BODY_PART_NAMES[exercise.bp], exercise.eq].join(' ')).split(' '), penalty: 8, fuzzy: true },
        { words: normalize(exercise.desc).split(' '), penalty: 12, fuzzy: false }
      ]
    })
  }
  return documents.get(exercise)
}

// Edit distance including adjacent transpositions (e.g. "bench" typed as "bnech").
function distance(a, b) {
  const rows = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) rows[i][0] = i
  for (let j = 0; j <= b.length; j++) rows[0][j] = j
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1)
  }
  return rows[a.length][b.length]
}

function wordScore(query, word, fuzzy) {
  if (word === query) return 0
  if (word.startsWith(query)) return 1
  if (word.includes(query)) return 2
  if (!fuzzy || query.length < 3) return Infinity
  const allowed = query.length >= 7 ? 2 : 1
  if (Math.abs(query.length - word.length) <= allowed) {
    const edits = distance(query, word)
    if (edits <= allowed) return 4 + edits
  }
  // Finder-style abbreviations: letters in order, with a limit on unrelated gaps.
  if (word.length <= query.length * 2) {
    let at = 0
    for (const char of word) if (char === query[at]) at++
    if (at === query.length) return 7 + (word.length - query.length) / word.length
  }
  return Infinity
}

export function searchExercises(exercises, query) {
  const text = normalize(query)
  if (!text) return exercises
  const tokens = text.split(' ')
  return exercises.map((exercise, index) => {
    const doc = documentOf(exercise)
    let score = 0
    for (const token of tokens) {
      let best = Infinity
      for (const field of doc.fields) for (const word of field.words) {
        best = Math.min(best, field.penalty + wordScore(token, word, field.fuzzy))
      }
      score += best
      if (!Number.isFinite(score)) break
    }
    if (doc.name === text) score -= 10
    else if (doc.name.startsWith(text)) score -= 5
    else if (doc.name.includes(text)) score -= 3
    return { exercise, score, index }
  }).filter(result => Number.isFinite(result.score))
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map(result => result.exercise)
}
