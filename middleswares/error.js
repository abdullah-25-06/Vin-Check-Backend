const CustomErrorApi = require("../error/error.js");
const error = (err, req, res, next) => {
  if (err instanceof CustomErrorApi) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  return res.status(500).json("Couldn't process the request");
};
module.exports = error;