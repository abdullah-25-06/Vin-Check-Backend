const { Transaction, Packages, User, Report } = require("../model/model");
const { captureOrder, createOrder } = require("../utils/paypal");
const orders = async (req, res) => {
  try {
    const { amount } = req.body;
    const rec = await Packages.findById({ _id: amount });
    if (!rec) return res.status(500).json({ error: "Failed to create order." });
    const { jsonResponse, httpStatusCode } = await createOrder(
      rec.price.split(" ")[1]
    );
    return res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error("Failed to create order:", error);
    return res.status(500).json({ error: "Failed to create order." });
  }
};
const trackOrder = async (req, res) => {
  try {
    const { orderID, packageID } = req.body;
    const package = await Packages.findById({ _id: packageID });
    if (!package) return res.status(404).json;
    const { jsonResponse, httpStatusCode } = await captureOrder(orderID);
    if (httpStatusCode !== 201) {
      return res.status(httpStatusCode).json(jsonResponse);
    }
    const {
      paypal: { email_address, account_id },
    } = jsonResponse.payment_source;
    const { amount, seller_receivable_breakdown } =
      jsonResponse.purchase_units[0].payments.captures[0];
    const trans = await Transaction.create({
      user: req.user.id,
      package_id: packageID,
      order_id: orderID,
      status: jsonResponse.status,
      paypal: {
        email_address,
        account_id,
      },
      amount,
      seller_receivable_breakdown,
    });

    const user = await User.findByIdAndUpdate(
      { _id: req.user.id },
      {
        avaliable_counts: Number(package.count) - 1,
        package_counts: Number(package.count),
      },
      {
        new: true,
      }
    ).select("avaliable_counts -_id");
    const user1 = await User.findById({ _id: req.user.id });
    if (user1.vin) {
      await Report.create({
        user_id: user1._id,
        email: user1.email,
        phone:user1.phoneno,
        vin: user1.vin,
      });
      await User.findByIdAndUpdate(
        { _id: req.user.id },
        {
          vin: null,
        }
      );
    }
    return res
      .status(httpStatusCode)
      .json({ message: "Suscribtion completed", user: user });
  } catch (error) {
    console.error("Failed to create order:", error);
    return res.status(500).json({ error: "Failed to capture order." });
  }
};
module.exports = { trackOrder, orders };
