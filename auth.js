function decodeCredentials(authHeader) {
  const encodedCredentials = authHeader.trim().replace(/Basic\s+/i, '');
  const buffer = Buffer.from(encodedCredentials, 'base64');
  const decodedCredentials = buffer.toString('utf8');

  return decodedCredentials.split(':');
}

function authMiddleware(req, res, next) {
  const [username, password] = decodeCredentials(
    req.headers.authorization || ''
  );

  if (username === 'admin' && password === 'password') {
    return next();
  }

  // Respond with authenticate header on auth failure.
  res
    .writeHead(401, { 'WWW-Authenticate': 'Basic realm="user_pages"' })
    .end('Authentication required.');
}

module.exports = authMiddleware;
