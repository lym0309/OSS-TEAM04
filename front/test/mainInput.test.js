import { describe, expect, it } from 'vitest'
import { EXAMPLES, canSubmit, exampleText, objectParticle } from '../src/pages/main/mainInput.js'

describe('canSubmit', () => {
  it('공백 제외 5자 이상이면 true', () => {
    expect(canSubmit('버스 지갑요')).toBe(true)
    expect(canSubmit('지 갑 요')).toBe(false) // 공백 빼면 3자
    expect(canSubmit('     ')).toBe(false)
    expect(canSubmit('')).toBe(false)
  })

  it('500자를 넘으면 false (앞뒤 공백은 빼고 셈)', () => {
    expect(canSubmit('가'.repeat(500))).toBe(true)
    expect(canSubmit(`  ${'가'.repeat(500)}\n`)).toBe(true)
    expect(canSubmit('가'.repeat(501))).toBe(false)
  })
})

describe('objectParticle', () => {
  it('받침 있으면 을, 없으면 를', () => {
    expect(objectParticle('이어폰')).toBe('을')
    expect(objectParticle('지갑')).toBe('을')
    expect(objectParticle('우산')).toBe('을')
    expect(objectParticle('가방')).toBe('을')
    expect(objectParticle('휴대폰 케이스')).toBe('를')
    expect(objectParticle('카드')).toBe('를')
  })

  it('한글로 끝나지 않으면 을(를)', () => {
    expect(objectParticle('AirPods')).toBe('을(를)')
    expect(objectParticle('')).toBe('을(를)')
  })
})

describe('exampleText', () => {
  it('예시 칩 → 입력 문장', () => {
    expect(EXAMPLES.map(exampleText)).toEqual([
      '지하철에서 이어폰을 잃어버렸어요',
      '버스에서 지갑을 잃어버렸어요',
      '카페에서 우산을 잃어버렸어요',
    ])
  })

  it('예시 문장은 바로 찾아볼 수 있는 길이', () => {
    for (const example of EXAMPLES) expect(canSubmit(exampleText(example))).toBe(true)
  })
})
