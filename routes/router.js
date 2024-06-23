const express = require("express");
const authMiddleware = require("../middleswares/auth");
const router = express.Router();
const {
  getUser,
  createuser,
  updateuser,
  login,
  logout,
  reqrefund,
  dashboard,
  getreport,
  packagepricing,
  getvindata,
  wholeDetail,
  updatereport,
  transaction,
  checkPackage,
  UpdateVin,
  getSubmittedReports,
  getPendingReports,
  changePassword,
} = require("../controller/controller");
router.route("/register").post(authMiddleware, createuser);
router.route("/login").post(authMiddleware, login);
router.route("/transaction").get(authMiddleware, transaction);
router.route("/dashboard").get(authMiddleware, dashboard);
router.route("/submit").get(authMiddleware, getSubmittedReports);
router.route("/pending").get(authMiddleware, getPendingReports);
router.route("/logout").post(authMiddleware, logout);
router.route("/refund").post(authMiddleware, reqrefund);
router.route("/profile").put(authMiddleware, updateuser);
router.route("/me").get(authMiddleware, getUser);
router.route("/report").get(authMiddleware, getreport);
router.route("/detail").post(authMiddleware, wholeDetail);
router.route("/updateVin").post(authMiddleware, UpdateVin);
router.route("/vindata:id").put(authMiddleware, updatereport);
router.route("/check").get(authMiddleware, checkPackage);
router.route("/password").post(changePassword);
router.route("/vindata").get(getvindata);
router.route("/package").get(packagepricing);
module.exports = router;
