const express = require("express");
const authMiddleware = require("../middleswares/auth");
const { orders, trackOrder } = require("../controller/paypal");
const paypal_router = express.Router();

paypal_router.route("/api/orders").post(authMiddleware, orders);
paypal_router
  .route("/api/capture-paypal-order")
  .post(authMiddleware, trackOrder);

module.exports = paypal_router;
