import { XMLParser } from 'fast-xml-parser'
import { env } from '../config/env.js'

// 경찰청 습득물 OpenAPI 클라이언트 (XML → JSON)
// 출처 두 곳은 파라미터·응답 필드가 같고 주소·오퍼레이션·인증키만 다르다.
//   police: 경찰관서 습득물      (atcId가 F로 시작)
//   portal: 포털기관 습득물 (지하철·공항·대학 등)

const SOURCES = {
  police: { config: env.policeApi, listOp: 'getLosfundInfoAccToClAreaPd' },
  portal: { config: env.portalApi, listOp: 'getPtLosfundInfoAccToClAreaPd' },
}
export const SOURCE_NAMES = Object.keys(SOURCES)

const parser = new XMLParser({
  parseTagValue: false, // atcId·fdSn 등을 문자열 그대로 유지
  trimValues: true,
  isArray: (name) => name === 'item',
})

// 목록 응답에서 화면에 쓰는 필드만 남긴다 (필드명은 API 그대로)
const LIST_FIELDS = ['atcId', 'fdSn', 'fdPrdtNm', 'prdtClNm', 'clrNm', 'fdYmd', 'depPlace', 'fdFilePathImg']
const pick = (item) => Object.fromEntries(LIST_FIELDS.map((k) => [k, item[k] ?? '']))

export class PoliceApiError extends Error {
  constructor(message) {
    super(message)
    this.name = 'PoliceApiError'
    this.status = 502
  }
}

export function parseListXml(xml) {
  const doc = parser.parse(xml)
  // 인증키 오류 등은 OpenAPI_ServiceResponse 형식으로 온다
  const authError = doc.OpenAPI_ServiceResponse?.cmmMsgHeader
  if (authError) {
    throw new PoliceApiError(`경찰청 API 오류: ${authError.returnAuthMsg ?? authError.errMsg}`)
  }
  const header = doc.response?.header
  if (header?.resultCode !== '00') {
    throw new PoliceApiError(`경찰청 API 오류: ${header?.resultMsg ?? '알 수 없는 응답'}`)
  }
  const body = doc.response.body ?? {}
  return {
    totalCount: Number(body.totalCount ?? 0),
    items: (body.items?.item ?? []).map(pick),
  }
}

export function createPoliceApi({ fetchFn = fetch, timeoutMs = 30_000 } = {}) {
  /**
   * 분류·지역·기간으로 습득물 목록 조회 (API 기본 순서: 최신 접수순)
   * @param {'police'|'portal'} source
   * @param {{ startYmd: string, endYmd: string, categoryCode?: string, regionCode?: string,
   *           pageNo?: number, numOfRows?: number }} params  날짜는 YYYYMMDD
   */
  async function listFoundItems(source, params) {
    const { config, listOp } = SOURCES[source]
    const query = new URLSearchParams({
      serviceKey: config.serviceKey,
      START_YMD: params.startYmd,
      END_YMD: params.endYmd,
      pageNo: String(params.pageNo ?? 1),
      numOfRows: String(params.numOfRows ?? 10),
    })
    if (params.categoryCode) query.set('PRDT_CL_CD_01', params.categoryCode)
    if (params.regionCode) query.set('N_FD_LCT_CD', params.regionCode)

    let res
    try {
      res = await fetchFn(`${config.baseUrl}/${listOp}?${query}`, {
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch (err) {
      throw new PoliceApiError(`경찰청 API 호출 실패: ${err.message}`)
    }
    if (!res.ok) throw new PoliceApiError(`경찰청 API 응답 오류: HTTP ${res.status}`)
    return parseListXml(await res.text())
  }

  return { listFoundItems }
}
