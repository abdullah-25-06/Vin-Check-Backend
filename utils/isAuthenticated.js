function checkAuthMiddleware(req, res, next) {
    const authHeader = req.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      if (req.path === "/login") {
        return res.status(403).send("Already logged in.");
      } else {
        return res.status(403).send("Already logged in.");
      }
    }
  
    next();
  }
module.exports = checkAuthMiddleware;
  