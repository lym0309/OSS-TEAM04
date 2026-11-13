// 메인 입력 화면(2a) 규칙. 서버 검증(backend rules/searchCondition.js)과 같은 기준
export const MIN_CHARS = 5 // 공백 제외
export const MAX_CHARS = 500

export const EXAMPLES = ['지하철에서 이어폰', '버스에서 지갑', '카페에서 우산']

/** "찾아보기"를 누를 수 있는지: 공백 제외 5자 이상, 500자 이하 */
export function canSubmit(text) {
  return text.replace(/\s/g, '').length >= MIN_CHARS && text.trim().length <= MAX_CHARS
}

/** 받침이 있으면 "을", 없으면 "를" (한글이 아니면 "을(를)") */
export function objectParticle(word) {
  const last = word.trim().at(-1) ?? ''
  const code = last.charCodeAt(0) - 0xac00
  if (!(code >= 0 && code <= 11171)) return '을(를)' // 한글 음절(가~힣)이 아님
  return code % 28 === 0 ? '를' : '을'
}

/** 예시 칩 → 입력칸 문장. "지하철에서 이어폰" → "지하철에서 이어폰을 잃어버렸어요" */
export function exampleText(example) {
  return `${example}${objectParticle(example)} 잃어버렸어요`
}
