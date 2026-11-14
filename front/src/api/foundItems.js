import { toSearchParams } from '../pages/browse/browseQuery.js'
import { api } from './client.js'

/**
 * 전체 습득물 목록 (GET /api/found-items). 최신 접수순, 페이지당 8건
 * @param {import('../pages/browse/browseQuery.js').BrowseQuery} query
 * @returns {Promise<{ items: Array<{ atcId: string, fdSn: string, fdPrdtNm: string, prdtClNm: string,
 *   clrNm: string, fdYmd: string, depPlace: string, fdFilePathImg: string, isNew: boolean }>,
 *   totalCount: number, page: number, pageSize: number, totalPages: number }>}
 */
export function getFoundItems(query, { signal } = {}) {
  const qs = toSearchParams(query).toString()
  return api.get(`/api/found-items${qs ? `?${qs}` : ''}`, { signal })
}
