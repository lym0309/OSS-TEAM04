import { describe, expect, it } from 'vitest'
import { createPoliceApi, parseListXml } from '../src/services/policeApi.js'

const LIST_XML = `<response><header><resultCode>00</resultCode><resultMsg>NORMAL SERVICE.</resultMsg></header>
<body><numOfRows>2</numOfRows><pageNo>1</pageNo><totalCount>8034</totalCount><items>
<item><atcId>F2026111100004029</atcId><fdSn>1</fdSn><prdtClNm>지갑 &gt; 여성용 지갑</prdtClNm><clrNm>실버(은)</clrNm>
<fdPrdtNm>마땡킴 카드지갑</fdPrdtNm><fdSbjt>설명</fdSbjt><fdFilePathImg>https://minwon24.police.go.kr/images/sub/img02_no_img.gif</fdFilePathImg>
<depPlace>서면지구대</depPlace><fdYmd>2026-11-11</fdYmd><rnum>1</rnum></item>
<item><atcId>F2026111100004028</atcId><fdSn>01</fdSn><prdtClNm>전자기기 &gt; 무선이어폰</prdtClNm><clrNm>퓨시아(자홍)</clrNm>
<fdPrdtNm>무선이어폰</fdPrdtNm><fdFilePathImg>x</fdFilePathImg><depPlace>용강지구대</depPlace><fdYmd>2026-11-11</fdYmd><rnum>2</rnum></item>
</items></body></response>`

const ONE_ITEM_XML = `<response><header><resultCode>00</resultCode><resultMsg>NORMAL SERVICE.</resultMsg></header>
<body><totalCount>1</totalCount><items><item><atcId>V1</atcId><fdSn>1</fdSn><fdYmd>2026-11-10</fdYmd></item></items></body></response>`

const EMPTY_XML = `<response><header><resultCode>00</resultCode><resultMsg>NORMAL SERVICE.</resultMsg></header>
<body><numOfRows>10</numOfRows><pageNo>1</pageNo><totalCount>0</totalCount><items></items></body></response>`

const AUTH_ERROR_XML = `<?xml version="1.0" encoding="UTF-8"?>
<OpenAPI_ServiceResponse><cmmMsgHeader><errMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</errMsg>
<returnAuthMsg>등록되지 않은 서비스키</returnAuthMsg><returnReasonCode>30</returnReasonCode></cmmMsgHeader></OpenAPI_ServiceResponse>`

describe('parseListXml', () => {
  it('목록을 API 필드명 그대로, 값은 문자열로 파싱한다', () => {
    const { totalCount, items } = parseListXml(LIST_XML)
    expect(totalCount).toBe(8034)
    expect(items).toHaveLength(2)
    expect(items[0]).toEqual({
      atcId: 'F2026111100004029',
      fdSn: '1',
      fdPrdtNm: '마땡킴 카드지갑',
      prdtClNm: '지갑 > 여성용 지갑',
      clrNm: '실버(은)',
      fdYmd: '2026-11-11',
      depPlace: '서면지구대',
      fdFilePathImg: 'https://minwon24.police.go.kr/images/sub/img02_no_img.gif',
    })
    expect(items[1].fdSn).toBe('01') // 숫자로 바뀌지 않음
    expect(items[1].clrNm).toBe('퓨시아(자홍)')
  })

  it('항목이 1개여도 배열로 돌려준다', () => {
    expect(parseListXml(ONE_ITEM_XML).items).toHaveLength(1)
  })

  it('결과가 없으면 빈 배열', () => {
    expect(parseListXml(EMPTY_XML)).toEqual({ totalCount: 0, items: [] })
  })

  it('인증키 오류는 502 에러로', () => {
    expect(() => parseListXml(AUTH_ERROR_XML)).toThrow(/등록되지 않은 서비스키/)
    try {
      parseListXml(AUTH_ERROR_XML)
    } catch (err) {
      expect(err.status).toBe(502)
    }
  })

  it('resultCode가 00이 아니면 에러', () => {
    const xml = '<response><header><resultCode>99</resultCode><resultMsg>LIMITED</resultMsg></header></response>'
    expect(() => parseListXml(xml)).toThrow(/LIMITED/)
  })
})

describe('createPoliceApi().listFoundItems', () => {
  it('출처·조건을 쿼리 파라미터로 바꿔 호출한다', async () => {
    const calls = []
    const api = createPoliceApi({
      fetchFn: async (url) => {
        calls.push(new URL(url))
        return new Response(EMPTY_XML)
      },
    })

    await api.listFoundItems('police', {
      startYmd: '20261106', endYmd: '20261112', categoryCode: 'PRH000', regionCode: 'LCA000', pageNo: 2, numOfRows: 40,
    })
    await api.listFoundItems('portal', { startYmd: '20261106', endYmd: '20261112' })

    expect(calls[0].pathname).toMatch(/LosfundInfoInqireService\/getLosfundInfoAccToClAreaPd$/)
    expect(Object.fromEntries(calls[0].searchParams)).toMatchObject({
      START_YMD: '20261106', END_YMD: '20261112', PRDT_CL_CD_01: 'PRH000', N_FD_LCT_CD: 'LCA000', pageNo: '2', numOfRows: '40',
    })
    expect(calls[1].pathname).toMatch(/LosPtfundInfoInqireService\/getPtLosfundInfoAccToClAreaPd$/)
    expect(calls[1].searchParams.has('PRDT_CL_CD_01')).toBe(false)
    expect(calls[1].searchParams.has('N_FD_LCT_CD')).toBe(false)
  })

  it('HTTP 오류·네트워크 오류는 502 에러로', async () => {
    const httpFail = createPoliceApi({ fetchFn: async () => new Response('x', { status: 500 }) })
    await expect(httpFail.listFoundItems('police', { startYmd: '1', endYmd: '2' })).rejects.toMatchObject({ status: 502 })

    const netFail = createPoliceApi({ fetchFn: async () => { throw new Error('ECONNRESET') } })
    await expect(netFail.listFoundItems('police', { startYmd: '1', endYmd: '2' })).rejects.toThrow(/ECONNRESET/)
  })
})
