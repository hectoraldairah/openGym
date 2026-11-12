import { afterEach, describe, expect, it } from 'vitest'
import { dateLocale, getLang, instrFor, setLang, t } from './i18n.js'

afterEach(() => setLang('en'))

describe('language switching', () => {
  it('loads Spanish UI and exercise instructions and can switch back to English', async () => {
    const exercise = { id: '0025', st: ['Original English instructions'] }
    await setLang('es')
    expect(t('Good morning, {0}', 'Ana')).toBe('Buenos días, Ana')
    expect(dateLocale()).toBe('es-ES')
    expect(instrFor(exercise).length).toBeGreaterThan(0)
    expect(instrFor(exercise)).not.toEqual(exercise.st)
    await setLang('en')
    expect(t('Good morning, {0}', 'Ana')).toBe('Good morning, Ana')
    expect(instrFor(exercise)).toEqual(exercise.st)
  })

  it('falls back to English for a removed language saved in an older profile', async () => {
    await setLang('es')
    await setLang('fr')
    expect(getLang()).toBe('en')
    expect(dateLocale()).toBe('en-GB')
    expect(t('Good morning')).toBe('Good morning')
    expect(instrFor({ id: '0025', st: ['English'] })).toEqual(['English'])
  })
})
