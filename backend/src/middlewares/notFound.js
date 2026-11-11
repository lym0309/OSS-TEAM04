export function notFound(req, res) {
  res.status(404).json({ error: { message: `${req.method} ${req.originalUrl} 경로를 찾을 수 없습니다.` } })
}
