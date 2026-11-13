import { Router } from 'express'

export function createLostItemsRouter({ lostItems }) {
  const router = Router()

  // POST /api/lost-items { rawText } — 문장 저장 + 조건 추출 → 201 SearchCondition (+ extracted)
  router.post('/', async (req, res) => {
    res.status(201).json(await lostItems.create(req.body?.rawText))
  })

  // GET /api/lost-items/:id — 저장된 조건
  router.get('/:id', async (req, res) => {
    res.json(await lostItems.get(req.params.id))
  })

  // PATCH /api/lost-items/:id { itemName?, prdtClNm?, clrNm?, region?, dateFrom?, dateTo?, brand?, feature? }
  router.patch('/:id', async (req, res) => {
    res.json(await lostItems.update(req.params.id, req.body))
  })

  return router
}
