import { describe, expect, it } from 'vitest'
import { categoryTile, getThumbnail, hasPhoto } from '../src/shared/thumbnail.js'

const NO_IMG = 'https://minwon24.police.go.kr/images/sub/img02_no_img.gif'
const PHOTO = 'https://minwon24.police.go.kr/lost112/find/getOpenapiAttachFileImage/F2026111100004024/1/C2026111100486860/1.do'

describe('썸네일 규칙', () => {
  it('1) 실제 사진이 있으면 사진', () => {
    expect(getThumbnail({ fdFilePathImg: PHOTO, prdtClNm: '지갑 > 남성용 지갑' })).toEqual({ type: 'photo', src: PHOTO })
  })

  it('2) 사진이 없으면 대분류 이미지', () => {
    expect(getThumbnail({ fdFilePathImg: NO_IMG, prdtClNm: '전자기기 > 무선이어폰' })).toEqual({
      type: 'category',
      emoji: '🎧',
      label: '전자기기',
    })
  })

  it('3) 대분류 이미지가 없는 분류면 📦 기타', () => {
    for (const prdtClNm of ['기타물품 > 기타', '산업용품 > 기타', '유가증권 > 상품권', '', '알 수 없는 분류']) {
      expect(getThumbnail({ fdFilePathImg: NO_IMG, prdtClNm })).toEqual({ type: 'other', emoji: '📦', label: '기타' })
    }
  })

  it('사진 URL이 비어 있어도 사진 없음으로 처리', () => {
    expect(hasPhoto('')).toBe(false)
    expect(hasPhoto(undefined)).toBe(false)
    expect(getThumbnail({ prdtClNm: '카드 > 신용(체크)카드' }).type).toBe('category')
  })

  it('img04_no_img 같은 다른 기본 이미지도 사진 없음', () => {
    expect(hasPhoto('https://minwon24.police.go.kr/images/sub/img04_no_img.gif')).toBe(false)
  })

  it('대분류 이미지 16종이 모두 등록되어 있다 (디자인 핸드오프 목록)', () => {
    const expected = ['가방', '귀금속', '도서용품', '서류', '쇼핑백', '스포츠용품', '악기', '의류', '자동차', '전자기기', '지갑', '증명서', '컴퓨터', '카드', '현금', '휴대폰']
    for (const name of expected) expect(categoryTile(`${name} > 기타`).type).toBe('category')
  })
})
