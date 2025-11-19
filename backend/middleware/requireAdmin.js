// backend/middleware/requireAdmin.js
function requireAdmin(req, res, next) {
  // You already store this in req.session.admin in /login
  if (req.session?.admin?.loggedIn) {
    return next();
  }

  return res.status(401).json({
    message: 'Admin authentication required',
  });
}

module.exports = { requireAdmin };
