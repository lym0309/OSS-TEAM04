// 분실물 등록·조회·수정 (POST/GET/PATCH /api/lost-items)
import { randomBytes } from 'node:crypto'
import { todayKst } from '../rules/foundItemList.js'
import {
  CONDITION_FIELDS,
  EMPTY_CONDITION,
  dateRangeError,
  isSearchable,
  rawTextError,
  sanitizeCondition,
  withCodes,
} from '../rules/searchCondition.js'

const httpError = (status, message) => Object.assign(new Error(message), { status })

// lostItemId: 무작위 16자 (A-Z a-z 0-9 - _). 화면 주소에 들어가므로 추측할 수 없게
export const newLostItemId = () => randomBytes(12).toString('base64url')
export const LOST_ITEM_ID = /^[A-Za-z0-9_-]{16}$/

// 문장에서 조건을 뽑는 자리. Gemini 연동 전까지는 항상 "못 뽑음" → 3b 화면에서 직접 고른다
// 연동 후: async (rawText, { today }) => ({ itemName, prdtClNm, clrNm, region, dateFrom, dateTo, brand, feature })
export const noExtractor = async () => null

// API 응답 (공유 계약 SearchCondition + extracted). 모르는 값은 null
function toResponse(item) {
  return {
    lostItemId: item.id,
    rawText: item.rawText,
    extracted: item.extracted,
    ...Object.fromEntries(CONDITION_FIELDS.map((f) => [f, item[f] ?? null])),
    prdtClCd: item.prdtClCd ?? null,
    lctCd: item.lctCd ?? null,
  }
}

export function createLostItemsService({
  repo,
  extractor = noExtractor,
  now = () => new Date(),
  newId = newLostItemId,
  log = console.warn,
}) {
  // 추출 결과도 사용자 입력과 같은 규칙으로 걸러서, 이상한 값은 버린다 (LLM이 틀릴 수 있으므로)
  async function extract(rawText, today) {
    let result = null
    try {
      result = await extractor(rawText, { today })
    } catch (err) {
      log(`[lost-items] 조건 추출 실패, 직접 고르기로: ${err.message}`)
    }
    const condition = { ...EMPTY_CONDITION, ...sanitizeCondition(result).values }
    if (dateRangeError(condition, today)) {
      condition.dateFrom = null
      condition.dateTo = null
    }
    return condition
  }

  async function create(rawText) {
    const error = rawTextError(rawText)
    if (error) throw httpError(400, error)

    const text = rawText.trim()
    const condition = withCodes(await extract(text, todayKst(now())))
    const item = { id: newId(), rawText: text, extracted: isSearchable(condition), ...condition }
    await repo.insert(item)
    return toResponse(item)
  }

  async function findOrThrow(id) {
    const item = LOST_ITEM_ID.test(id ?? '') ? await repo.findById(id) : null
    if (!item) throw httpError(404, '분실물을 찾을 수 없어요.')
    return item
  }

  async function get(id) {
    return toResponse(await findOrThrow(id))
  }

  // 보낸 필드만 바꾼다 (null·빈 문자열이면 지움). 코드는 이름으로 다시 계산
  async function update(id, body) {
    const { values, errors } = sanitizeCondition(body)
    if (errors.length > 0) throw httpError(400, errors[0])
    if (Object.keys(values).length === 0) throw httpError(400, '수정할 조건이 없어요.')

    const item = await findOrThrow(id)
    const condition = withCodes({ ...pickCondition(item), ...values })
    const rangeError = dateRangeError(condition, todayKst(now()))
    if (rangeError) throw httpError(400, rangeError)

    await repo.updateCondition(id, condition)
    return toResponse({ ...item, ...condition })
  }

  return { create, get, update }
}

const pickCondition = (item) => Object.fromEntries(CONDITION_FIELDS.map((f) => [f, item[f] ?? null]))
