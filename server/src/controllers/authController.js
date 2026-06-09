const authStore = require("../services/authStore");
const { getBearerToken } = require("../middleware/authMiddleware");

const register = (req, res) => {
  const { username, password } = req.body || {};
  const result = authStore.register({
    userId: username,
    password
  });

  if (result.error) {
    return res.status(400).json({
      success: false,
      message: result.error
    });
  }

  return res.status(201).json({
    success: true,
    data: result
  });
};

const login = (req, res) => {
  const { username, password } = req.body || {};
  const result = authStore.login({
    userId: username,
    password
  });

  if (result.error) {
    return res.status(401).json({
      success: false,
      message: result.error
    });
  }

  return res.status(200).json({
    success: true,
    data: result
  });
};

const getCurrentUser = (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      user: req.user
    }
  });
};

const logout = (req, res) => {
  authStore.revokeToken(getBearerToken(req));

  return res.status(200).json({
    success: true,
    message: "Logged out"
  });
};

module.exports = {
  getCurrentUser,
  login,
  logout,
  register
};
