import { describe, expect, it } from 'vitest'
import { hasRealPhoto, isValidYmd, toFoundItemRow } from '../../src/rules/foundItemRow.js'

const item = (over = {}) => ({
  atcId: 'F2026111100004030',
  fdSn: '1',
  fdPrdtNm: '검정 반지갑',
  prdtClNm: '지갑 > 남성용 지갑',
  clrNm: '블랙(검정)',
  fdYmd: '2026-11-09',
  depPlace: '서울마포경찰서',
  fdFilePathImg: 'https://www.lost112.go.kr/lostnfs/images/sub/img02_no_img.gif',
  ...over,
})

describe('toFoundItemRow', () => {
  it('API 항목을 테이블 컬럼으로 바꾸고 계산 값을 채운다', () => {
    expect(toFoundItemRow(item(), { source: 'police', region: '서울' })).toEqual({
      atc_id: 'F2026111100004030',
      fd_sn: '1',
      source: 'police',
      fd_prdt_nm: '검정 반지갑',
      prdt_cl_nm: '지갑 > 남성용 지갑',
      clr_nm: '블랙(검정)',
      fd_ymd: '2026-11-09',
      reg_ymd: '2026-11-11', // atcId의 접수일
      dep_place: '서울마포경찰서',
      img_url: 'https://www.lost112.go.kr/lostnfs/images/sub/img02_no_img.gif',
      category: '지갑',
      color_family: '검정',
      region: '서울',
      has_photo: false,
    })
  })

  it('지역을 모르고 받으면 region은 null', () => {
    expect(toFoundItemRow(item(), { source: 'police' }).region).toBeNull()
  })

  it('포털기관 atcId는 습득일과 가까운 해로 접수일을 정한다', () => {
    const row = toFoundItemRow(item({ atcId: 'V0007751L11100002', fdYmd: '2026-11-08' }), { source: 'portal' })
    expect(row.reg_ymd).toBe('2026-11-10')
  })

  it('atcId 형식이 다르면 접수일 = 습득일', () => {
    expect(toFoundItemRow(item({ atcId: 'X123' }), { source: 'police' }).reg_ymd).toBe('2026-11-09')
  })

  it('atcId의 날짜가 없는 날짜면 습득일로 대신한다', () => {
    expect(toFoundItemRow(item({ atcId: 'F2026023000000001' }), { source: 'police' }).reg_ymd).toBe('2026-11-09')
  })

  it('관리번호·순번·습득일이 없거나 이상하면 null (저장 안 함)', () => {
    expect(toFoundItemRow(item({ atcId: '' }), { source: 'police' })).toBeNull()
    expect(toFoundItemRow(item({ fdSn: '' }), { source: 'police' })).toBeNull()
    expect(toFoundItemRow(item({ fdYmd: '' }), { source: 'police' })).toBeNull()
    expect(toFoundItemRow(item({ fdYmd: '2026-13-01' }), { source: 'police' })).toBeNull()
  })

  it('컬럼보다 긴 값은 잘라서 저장한다', () => {
    const row = toFoundItemRow(item({ fdPrdtNm: '가'.repeat(250), depPlace: ' 앞뒤 공백 ' }), { source: 'police' })
    expect(row.fd_prdt_nm).toHaveLength(200)
    expect(row.dep_place).toBe('앞뒤 공백')
  })

  it('실제 사진이 있으면 has_photo = true', () => {
    const row = toFoundItemRow(item({ fdFilePathImg: 'https://www.lost112.go.kr/lostnfs/images/uploadImg/2026/1111/a.jpg' }), {
      source: 'police',
    })
    expect(row.has_photo).toBe(true)
  })

  it('분류·색상이 비어 있어도 저장한다 (색 계열은 기타)', () => {
    const row = toFoundItemRow(item({ prdtClNm: '', clrNm: '' }), { source: 'police' })
    expect(row.category).toBe('')
    expect(row.color_family).toBe('기타')
  })
})

describe('isValidYmd / hasRealPhoto', () => {
  it('실제 있는 날짜만 true', () => {
    expect(isValidYmd('2026-02-28')).toBe(true)
    expect(isValidYmd('2026-02-30')).toBe(false)
    expect(isValidYmd('20260228')).toBe(false)
    expect(isValidYmd(undefined)).toBe(false)
  })

  it('no_img가 들어간 주소나 빈 값은 사진 없음', () => {
    expect(hasRealPhoto('')).toBe(false)
    expect(hasRealPhoto('https://x/img02_no_img.gif')).toBe(false)
    expect(hasRealPhoto('https://x/a.jpg')).toBe(true)
  })
})
