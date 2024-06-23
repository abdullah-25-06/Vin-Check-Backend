const express = require("express");
const router = require("./routes/router");
const paypal_router = require("./routes/paypal_router");
const app = express();
const cors = require("cors");

const mongoose = require("mongoose");
const error = require("./middleswares/error");
const { connectdb } = require("./Database/connectdb");

app.use(cors());
app.use(express.json({ limit: "5Mb" }));
app.use("/", router);
app.use("/", paypal_router);
app.use(error);

connectdb();
const port = process.env.PORT;

const portal = () => {
  console.log(`server running at ${port}`);
};
app.listen(port, portal);
