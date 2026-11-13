import { useState } from 'react'
import { categoryTile, getThumbnail } from './thumbnail.js'
import './Thumbnail.css'

/**
 * 습득물 썸네일 (사진 → 대분류 이미지 → 📦 기타)
 *
 * 사용 예:
 *   <Thumbnail item={item} size={96} />           // 매칭 결과 카드 (정사각형)
 *   <Thumbnail item={item} size={220} />          // 상세 화면
 *   <Thumbnail item={item} height={150} />        // 전체 습득물 카드 (가로는 부모 너비)
 *
 * @param {{ item: { fdFilePathImg?: string, prdtClNm?: string, fdPrdtNm?: string },
 *           size?: number, height?: number, radius?: number, className?: string }} props
 */
export default function Thumbnail({ item, size, height, radius = 12, className = '' }) {
  const [broken, setBroken] = useState(false)
  const thumb = broken ? categoryTile(item?.prdtClNm) : getThumbnail(item)

  const h = height ?? size ?? 96
  const style = { width: size ?? '100%', height: h, borderRadius: radius }
  const emojiSize = Math.round(Math.min(h, size ?? h) * 0.35)

  if (thumb.type === 'photo') {
    return (
      <img
        className={`thumbnail thumbnail--photo ${className}`}
        style={style}
        src={thumb.src}
        alt={item?.fdPrdtNm ? `${item.fdPrdtNm} 사진` : '습득물 사진'}
        loading="lazy"
        decoding="async"
        onError={() => setBroken(true)}
      />
    )
  }

  return (
    <div
      className={`thumbnail thumbnail--${thumb.type} ${className}`}
      style={style}
      role="img"
      aria-label={`사진 없음 · ${thumb.label}`}
    >
      <span className="thumbnail__emoji" style={{ fontSize: emojiSize }} aria-hidden="true">
        {thumb.emoji}
      </span>
      <span className="thumbnail__label">{thumb.label}</span>
    </div>
  )
}
