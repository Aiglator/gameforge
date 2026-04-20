import jwt from 'jsonwebtoken'

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' })
  }
  try {
    const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET)
    req.user = payload
    next()
  } catch {
    res.status(401).json({ message: 'Invalid token' })
  }
}

export function requireApiKey(req, res, next) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('ApiKey ')) {
    return res.status(401).json({ message: 'API key required' })
  }
  req.apiKey = auth.slice(7)
  next()
}

export function optionalAuth(req, res, next) {
  const auth = req.headers.authorization
  if (auth?.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(auth.slice(7), process.env.JWT_SECRET)
    } catch { /* ignore */ }
  }
  next()
}
