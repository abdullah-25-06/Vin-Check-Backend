const asynchandler = require("express-async-handler");
const {
  User,
  Refund,
  Packages,
  Sampledata,
  Report,
  Transaction,
  Token,
} = require("../model/model");

const CustomErrorApi = require("../error/error");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const generateAuthToken = require("../utils/jwt");
const { parsePhoneNumber } = require("awesome-phonenumber");
const { getVinToken, getVinData } = require("../utils/vinData");
const { transporter, sendmail } = require("./nodeMailer");

//  -----------------------------------------
const createuser = async (req, res) => {
  try {
    const { username, email, phoneno, password, vin } = req.body;

    if (!username || !email || !phoneno || !password || !vin)
      return res
        .status(400)
        .json({ msg: "PLease fill all the required fields" });
    const exists = await User.findOne({ $or: [{ email }, { phoneno }] });

    if (exists)
      return res
        .status(400)
        .json({ msg: "PLease enter a unique email or phone number" });

    const salt = await bcrypt.genSalt(10);

    const hashPassword = await bcrypt.hash(password, salt);

    const pn = parsePhoneNumber(phoneno, { regionCode: "US" });

    const session = await mongoose.startSession();

    session.startTransaction();

    const fuser = await User.create({
      username,
      email,
      isAdmin: false,
      phoneno: pn.number.e164,
      password: hashPassword,
      vin: vin,
    });

    if (!fuser) {
      throw new CustomErrorApi("Can't Register right now", 400);
    }

    const { access_token, jti } = generateAuthToken(fuser);

    const token = await User.findByIdAndUpdate(
      { _id: fuser._id },
      { token_detail: { access_token, jti } }
    );
    await session.commitTransaction();

    return res.status(200).json({
      msg: "User Created",
      access_token,
      username: fuser.username,
      count: fuser.avaliable_counts,
      phone: fuser.phoneno,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ msg: "User Not Created" });
  }
};
//---------------------------------------------
const dashboard = asynchandler(async (req, res, next) => {
  const id = req.user.id;
  const user = await User.findOne({ _id: id }).select(
    "-isAdmin -token_detail -createdAt -updatedAt"
  );

  if (!user) throw new CustomErrorApi("User not found", 401);
  res.status(200).json({ user });
});

// ---------------------------------------------
const login = asynchandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password)
    throw new CustomErrorApi("Enter your email address and password", 400);

  const user = await User.findOne({ email });
  if (user && (await bcrypt.compare(password, user.password))) {
    const { access_token, jti } = generateAuthToken(user);

    const token = await User.findByIdAndUpdate(
      { _id: user._id },
      { token_detail: { access_token, jti } }
    );
    if (!token) {
      throw new CustomErrorApi("Try to login again", 400);
    }
    const transactionData = await Transaction.find({ user: user._id }).select(
      "-_id order_id amount"
    );
    if (user.isAdmin)
      return res.status(200).json({
        access_token,
        username: user.username,
        count: user.avaliable_counts,
        phone: user.phoneno,
        isAdmin: user.isAdmin,
      });
    return res.status(200).json({
      access_token,
      username: user.username,
      count: user.avaliable_counts,
      phone: user.phoneno,
    });
  }
  throw new CustomErrorApi("Invalid email or password", 400);
});
const transaction = asynchandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.user.email });
  const transactionData = await Transaction.find({ user: user._id })
    .sort({ created_at: -1 })
    .select("-_id refunded order_id amount");

  return res
    .status(200)
    .json({ transactionData: transactionData[transactionData.length - 1] });
});
// ----------------------------------------------
const logout = asynchandler(async (req, res, next) => {
  const { email } = req.user;
  const user = await User.findOneAndUpdate(
    { email },
    { token_detail: { access_token: null, jti: null } },
    { new: true }
  );

  if (!user) {
    throw new CustomErrorApi("Invalid employee", 403);
  }
  return res.status(201).json({ msg: "Logout successful" });
});

// ---------------------------------------------
const updateuser = async (req, res, next) => {
  try {
    const updateObj = {};

    const { username, password, phoneno } = req.body;

    if (phoneno) {
      if (req.user.phone != phoneno) {
        const result = await User.findOne({ phoneno });
        if (result)
          throw new CustomErrorApi("Phone number already in use", 401);
        const pn = parsePhoneNumber(phoneno, { regionCode: "US" });
        updateObj["phoneno"] = pn.number.e164;
      }
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashPassword = await bcrypt.hash(password, salt);
      updateObj["password"] = hashPassword;
    }

    if (username) updateObj["username"] = username;
    if (Object.keys(updateObj).length === 0) {
      return res.json({ mesage: "Nothing to update" });
    }

    const update = await User.findByIdAndUpdate(
      req.user.id,
      { ...updateObj },
      {
        new: true,
      }
    ).select("-isAdmin -token_detail -createdAt -updatedAt");

    if (!update) throw new CustomErrorApi("Try again", 400);
    return res.status(200).json(update);
  } catch (error) {
    console.log(error);
    throw new CustomErrorApi("Try again", 400);
  }
};

const reqrefund = async (req, res) => {
  try {
    const {
      reason,
      transaction_id,
      account_id,
      number_ref,
      email_ref,
      name_ref,
    } = req.body;

    if (
      !account_id ||
      !transaction_id ||
      !reason ||
      !number_ref ||
      !email_ref ||
      !name_ref
    )
      return res
        .status(400)
        .json({ msg: "PLease fill out all the required fields" });

    const detail = await Transaction.findOne({
      order_id: transaction_id,
      "paypal.account_id": account_id,
      refunded: false,
    });

    if (!detail) {
      return res.status(404).json({
        msg: "Not a valid request for refund Or The request is already refunded ",
      });
    }
    const package = await Packages.findOne({ _id: detail.package_id });
    if (
      +req.user.count === +package.count - 1 ||
      +req.user.count === +package.count
    ) {
      const refund = await Refund.create({
        email: req.user.email,
        username: req.user.username,
        phoneno: req.user.phone,
        order_id: transaction_id,
        account_id,
        reason,
      });
      //need to add more instance of paypal transaction do that complete detail be send to the owner
      //detail var to be used here
      if (!refund)
        return res.status(400).json({ msg: "Not a valid request for refund" });
      const updateUser = await User.findByIdAndUpdate(
        { _id: req.user.id },
        { avaliable_counts: 0 },
        { new: true }
      );
      // const mailOptions = {
      //   from: {
      //     name: "Vin Check Central",
      //     address: "abdullahmoudood35@gmail.com",
      //   },
      //   to: "abdullahmoudood35@gmail.com",
      //   subject: `Request for refund by user ${name_ref} and email ${email_ref}`,
      //   text: `Name: ${name_ref} \n Phone number: ${number_ref} \n Email: ${email_ref} \n TransactionId: ${transaction_id} \n PayPal id: ${account_id} \n Reason:${reason} \n`,
      // };

      // sendmail(mailOptions, transporter);

      await Transaction.findOneAndUpdate(
        {
          order_id: transaction_id,
          "paypal.account_id": account_id,
        },
        {
          refunded: true,
        }
      );
      return res
        .status(200)
        .json({ msg: "Refund sucessful", user: updateUser?.avaliable_counts });
    }
    return res
      .status(400)
      .json({ msg: "You have used the count of this package" });
  } catch (err) {
    return res.status(400).json({ msg: "Refund Not sucessful" });
  }
};
const getUser = asynchandler(async (req, res) => {
  const userData = await User.findOne({ _id: req.user.id }).select(
    "username phoneno"
  );
  if (!userData) return res.status(404).json({});
  return res
    .status(200)
    .json({ username: userData.username, phoneno: userData.phoneno });
});
const packagepricing = asynchandler(async (req, res) => {
  const package = await Packages.find({}).sort({ count: 1 });

  if (!package) {
    throw new CustomErrorApi("Not avaliable", 403);
  }
  return res.status(201).json(package);
});

const wholeDetail = asynchandler(async (req, res, next) => {
  const { vin } = req.body;
  const VinToken = await getVinToken();

  // if (!token || token.expiresAt < Date.now()) {
  //   const VinToken = await getVinToken();

  //   token = await Token.findOneAndUpdate(
  //     { token: token?.token },
  //     { token: VinToken.token, expiresAt: VinToken.expiresAt },
  //     { upsert: true, new: true }
  //   );
  // }

  const session = await mongoose.startSession();
  session.startTransaction();
  const getdata = await getVinData(VinToken.token, vin);

  if (!getdata) throw new CustomErrorApi("Not A valid Vin Number", 403);

  const user = await User.findById({ _id: req.user.id });

  if (!(Number(user.avaliable_counts) >= 1)) {
    throw new CustomErrorApi("Please Buy Counts to Check further details", 403);
  }

  const getreports = await Report.create({
    user_id: user._id,
    email: user.email,
    phone: user.phoneno,
    vin: vin,
  });

  const userUpdate = await User.findByIdAndUpdate(
    { _id: req.user.id },
    { avaliable_counts: Number(user.avaliable_counts) - 1 },
    {
      new: true,
    }
  ).select("-_id avaliable_counts ");

  await session.commitTransaction();
  session.endSession();
  return res
    .status(200)
    .json({ msg: "Detailed Report will be send to you ", user: userUpdate });
});
const getvindata = asynchandler(async (req, res) => {
  const VinToken = await getVinToken();

  const vinNumber = req.query.vin;
  let vinData = await getVinData(VinToken.token, vinNumber);

  if (vinData?.status === 401) {
    const VinToken = await getVinToken();
    const token = await Token.findOneAndUpdate(
      { token: token?.token },
      { token: VinToken.token, expiresAt: VinToken.expiresAt },
      { upsert: true, new: true }
    );
    vinData = await getVinData(token.token, vinNumber);
  }

  if (!vinData) {
    throw new CustomErrorApi("Not a Valid Vin number", 403);
  }
  const newObj = {
    vin: vinData.vin,
    year: vinData.year,
    make: vinData.make,
    model: vinData.model,
    type: vinData.type,
    color: vinData.color,
  };
  return res.status(201).json({
    ...newObj,
  });
});
const getreport = asynchandler(async (req, res) => {
  let getreports;
  if (req.user.isAdmin) {
    getreports = await Report.find({}).select(
      "email vin pending createdAt _id phone"
    );
  } else {
    getreports = await Report.find({ user_id: req.user.id }).select(
      "email vin pending createdAt _id phone"
    );
  }
  if (!getreports) {
    throw new CustomErrorApi("Not avaliable", 403);
  }
  return res.status(201).json({ getreports });
});
const getPendingReports = asynchandler(async (req, res) => {
  let getreports;
  if (req.user.isAdmin) {
    getreports = await Report.find({ pending: true }).select(
      "email vin pending createdAt _id phone"
    );
  } else {
    getreports = await Report.find({
      user_id: req.user.id,
      pending: true,
    }).select("email vin pending createdAt _id phnone");
  }
  if (!getreports) {
    throw new CustomErrorApi("Not avaliable", 403);
  }
  return res.status(201).json({ getreports });
});
const getSubmittedReports = asynchandler(async (req, res) => {
  let getreports;
  if (req.user.isAdmin) {
    getreports = await Report.find({ pending: false }).select(
      "email vin pending createdAt _id phone"
    );
  } else {
    getreports = await Report.find({
      user_id: req.user.id,
      pending: false,
    }).select("email vin pending createdAt _id phone");
  }
  if (!getreports) {
    throw new CustomErrorApi("Not avaliable", 403);
  }
  return res.status(201).json({ getreports });
});
const updatereport = asynchandler(async (req, res) => {
  if (req.user.isAdmin) {
    const id = req.params.id;

    const getreports = await Report.findByIdAndUpdate(
      { _id: id },
      { pending: false },
      {
        new: true,
      }
    );

    if (!getreports) {
      throw new CustomErrorApi("Not avaliable", 403);
    }
    return res.status(200).json({ msg: "Data updated successfully" });
  } else {
    return res.status(400).json({ msg: "Error Occured" });
  }
});
const checkPackage = async (req, res, next) => {
  if (req.user.count >= 1) {
    return res.status(400).json({ msg: "Already Suscribed to a package" });
  }
  return res.status(200).json({ msg: "Can select a package" });
};
const UpdateVin = async (req, res) => {
  try {
    const { vin } = req.body;
    const user = await User.findByIdAndUpdate(
      { _id: req.user.id },
      { vin: vin },
      { new: true }
    );

    if (!user) return res.status(400).json({ msg: "Try again" });
    return res.status(200).json({ msg: "Success" });
  } catch (err) {
    return res.status(400).json({ msg: "Not Successful" });
  }
};
const changePassword = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res
        .status(400)
        .json({ msg: "Enter Phone Number and Password both" });
    }
    const pn = parsePhoneNumber(phone, { regionCode: "US" });

    const user = await User.findOne({ phoneno: pn.number.e164 });

    if (user) {
      const salt = await bcrypt.genSalt(10);
      const hashPassword = await bcrypt.hash(password, salt);

      const user1 = await User.findByIdAndUpdate(
        { _id: user.id },
        { password: hashPassword },
        { new: true }
      );
      return res.status(200).json({ msg: "Password updated successfully" });
    }
    return res.status(400).json({ msg: "Credentials not matched" });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ msg: "Credentials not matched" });
  }
};
module.exports = {
  changePassword,
  packagepricing,
  UpdateVin,
  getUser,
  logout,
  createuser,
  updateuser,
  reqrefund,
  login,
  dashboard,
  wholeDetail,
  getreport,
  getvindata,
  updatereport,
  transaction,
  checkPackage,
  getSubmittedReports,
  getPendingReports,
};
