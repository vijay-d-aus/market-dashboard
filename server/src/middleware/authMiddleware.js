const authStore = require("../services/authStore");

const getBearerToken = (req) => {
  const header = req.get?.("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);

  return match ? match[1].trim() : "";
};

const requireAuth = (req, res, next) => {
  const token = getBearerToken(req);
  const user = authStore.getUserByToken(token);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  req.user = user;
  req.authToken = token;
  return next();
};

module.exports = {
  getBearerToken,
  requireAuth
};
