// 경찰청 목록 API 항목 → found_items 테이블 한 줄 (순수 함수)
// 수집기가 저장하기 전에 필터·정렬·매칭에 쓸 값(category, color_family, has_photo, reg_ymd)을 미리 계산한다.
import { colorFamily } from './colors.js'
import { majorCategory } from './foundItemCodes.js'
import { registrationDate } from './foundItemList.js'

// 컬럼 길이 (migrations/001_found_items.sql 과 맞출 것). 넘치면 잘라서 저장
const MAX_LEN = {
  atc_id: 30,
  fd_sn: 10,
  fd_prdt_nm: 200,
  prdt_cl_nm: 100,
  clr_nm: 50,
  dep_place: 100,
  img_url: 300,
  category: 30,
}

const text = (value, column) => String(value ?? '').trim().slice(0, MAX_LEN[column])

// 실제로 있는 날짜인지 (YYYY-MM-DD). 2026-02-30 같은 값은 false
export function isValidYmd(ymd) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd ?? '')) return false
  const date = new Date(`${ymd}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === ymd
}

// 사진 주소에 no_img가 들어 있으면 "사진 없음" 기본 이미지
export function hasRealPhoto(url = '') {
  return url !== '' && !url.includes('no_img')
}

/**
 * @param {{ atcId: string, fdSn: string, fdPrdtNm: string, prdtClNm: string, clrNm: string,
 *           fdYmd: string, depPlace: string, fdFilePathImg: string }} item  목록 API 항목
 * @param {{ source: 'police'|'portal', region?: string|null }} options  region: 지역 코드별로 받았을 때 그 지역 이름
 * @returns {object|null}  저장할 수 없는 항목(관리번호·습득일 없음)이면 null
 */
export function toFoundItemRow(item, { source, region = null }) {
  const atcId = text(item.atcId, 'atc_id')
  const fdSn = text(item.fdSn, 'fd_sn')
  const fdYmd = String(item.fdYmd ?? '').trim()
  if (!atcId || !fdSn || !isValidYmd(fdYmd)) return null

  // 접수일: atcId에서 꺼낸 값(YYYYMMDD). 이상하면 습득일로 대신한다
  const reg = registrationDate({ atcId, fdYmd })
  const regYmd = `${reg.slice(0, 4)}-${reg.slice(4, 6)}-${reg.slice(6, 8)}`

  const prdtClNm = text(item.prdtClNm, 'prdt_cl_nm')
  const imgUrl = text(item.fdFilePathImg, 'img_url')
  return {
    atc_id: atcId,
    fd_sn: fdSn,
    source,
    fd_prdt_nm: text(item.fdPrdtNm, 'fd_prdt_nm'),
    prdt_cl_nm: prdtClNm,
    clr_nm: text(item.clrNm, 'clr_nm'),
    fd_ymd: fdYmd,
    reg_ymd: isValidYmd(regYmd) ? regYmd : fdYmd,
    dep_place: text(item.depPlace, 'dep_place'),
    img_url: imgUrl,
    category: text(majorCategory(prdtClNm), 'category'),
    color_family: colorFamily(item.clrNm),
    region,
    has_photo: hasRealPhoto(imgUrl),
  }
}
