import { findCategory, majorCategory } from './codes.js'

/**
 * 썸네일 규칙 (모든 화면 공통, 디자인 핸드오프 "썸네일 규칙")
 * 1) fdFilePathImg에 "no_img"가 없으면 → 실제 사진
 * 2) 사진이 없으면 → prdtClNm의 대분류 이미지
 * 3) 대분류 이미지가 없는 분류면 → 📦 "기타"
 *
 * @param {{ fdFilePathImg?: string, prdtClNm?: string }} item
 * @returns {{ type: 'photo', src: string } | { type: 'category', emoji: string, label: string } | { type: 'other', emoji: string, label: string }}
 */
export function getThumbnail({ fdFilePathImg = '', prdtClNm = '' } = {}) {
  if (hasPhoto(fdFilePathImg)) return { type: 'photo', src: fdFilePathImg }
  return categoryTile(prdtClNm)
}

/** 사진 URL이 실제 사진인지 (경찰청은 사진이 없으면 no_img.gif를 준다) */
export function hasPhoto(fdFilePathImg = '') {
  return Boolean(fdFilePathImg) && !fdFilePathImg.includes('no_img')
}

/** 사진 대신 보여줄 대분류 타일 (사진 로딩 실패 시에도 사용) */
export function categoryTile(prdtClNm = '') {
  const major = majorCategory(prdtClNm)
  const emoji = findCategory(major)?.emoji
  return emoji ? { type: 'category', emoji, label: major } : { type: 'other', emoji: '📦', label: '기타' }
}
