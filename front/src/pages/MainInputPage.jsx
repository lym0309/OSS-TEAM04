import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { createLostItem } from '../api/lostItems.js'
import './MainInputPage.css'
import { EXAMPLES, MAX_CHARS, canSubmit, exampleText } from './main/mainInput.js'

// 메인 입력 (시안 2a). 문장 입력 → POST /api/lost-items → /confirm/:lostItemId
export default function MainInputPage() {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const disabled = submitting || !canSubmit(text)

  async function submit() {
    if (disabled) return
    setSubmitting(true)
    setError(null)
    try {
      const { lostItemId } = await createLostItem(text.trim())
      navigate(`/confirm/${lostItemId}`)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  function onKeyDown(e) {
    // Enter = 찾아보기, Shift+Enter = 줄바꿈. 한글 조합 중 Enter는 무시
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  function fillExample(example) {
    setText(exampleText(example))
    setError(null)
    inputRef.current?.focus()
  }

  return (
    <div className="main-input">
      <h1 className="main-input__title">무엇을 잃어버리셨나요?</h1>

      <form
        className="main-input__card"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <textarea
          ref={inputRef}
          className="main-input__textarea"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setError(null)
          }}
          onKeyDown={onKeyDown}
          maxLength={MAX_CHARS}
          placeholder="언제, 어디서, 어떤 물건을 잃어버렸는지 편하게 적어주세요"
          aria-label="잃어버린 물건 설명"
          disabled={submitting}
          autoFocus
        />
        <div className="main-input__footer">
          <p className="main-input__hint">문장에서 물품 · 색상 · 장소 · 날짜를 찾아 조건으로 정리해 드려요</p>
          <button type="submit" className="btn btn-primary" disabled={disabled}>
            {submitting ? '정리하는 중…' : '찾아보기'}
          </button>
        </div>
      </form>

      {error && (
        <p className="main-input__error" role="alert">
          {error}
        </p>
      )}

      <div className="main-input__examples" aria-label="예시 문장">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            className="main-input__example"
            onClick={() => fillExample(example)}
            disabled={submitting}
          >
            {example}
          </button>
        ))}
      </div>

      <p className="disclaimer">경찰청 습득물 데이터에서 비슷한 물건을 찾아 매칭 점수순으로 보여드려요</p>
    </div>
  )
}
