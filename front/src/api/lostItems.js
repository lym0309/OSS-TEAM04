import { api } from './client.js'

/**
 * 분실물 등록 (POST /api/lost-items)
 * @param {string} rawText
 * @returns {Promise<import('../shared/types.js').SearchCondition>}
 */
export function createLostItem(rawText) {
  return api.post('/api/lost-items', { rawText })
}
