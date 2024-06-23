const mongoose = require("mongoose");

//  it is the way to create a model in js
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      require: [true, "Enter name"],
    },
    vin: {
      type: String,
      require: true,
    },
    email: {
      type: String,
      require: [true, "Enter email"],
      unique: true,
    },
    phoneno: {
      type: String,
      require: [true, "Enter Phone no"],
      unique: true,
    },
    password: {
      type: String,
      require: [true, "Enter Password"],
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    avaliable_counts: {
      type: Number,
      default: 0,
    },
    package_counts: {
      type: Number,
    },
    token_detail: { access_token: { type: String }, jti: { type: String } },
  },
  {
    timestamps: true,
  }
);
userSchema.set("toObject", { virtuals: true });
userSchema.set("toJSON", { virtuals: true });
userSchema.virtual("transactions", {
  ref: "Transaction",
  localField: "_id",
  foreignField: "transactions",
});
const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    refunded: {
      type: Boolean,
      default: false,
    },
    package_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Packages",
      required: true,
    },
    order_id: {
      type: String,
      required: true,
    },
    status: {
      type: String,
    },
    paypal: {
      email_address: {
        type: String,
        required: true,
      },
      account_id: {
        type: String,
        required: true,
      },
    },
    amount: {
      currency_code: {
        type: String,
        required: true,
      },
      value: {
        type: String,
        required: true,
      },
    },
    seller_receivable_breakdown: {
      gross_amount: {
        currency_code: {
          type: String,
          required: true,
        },
        value: {
          type: String,
          required: true,
        },
      },
      paypal_fee: {
        currency_code: {
          type: String,
          required: true,
        },
        value: {
          type: String,
          required: true,
        },
      },
      net_amount: {
        currency_code: {
          type: String,
          required: true,
        },
        value: {
          type: String,
          required: true,
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

const refundSchemaType = new mongoose.Schema(
  {
    username: {
      type: String,
      require: [true, "Enter name"],
    },
    email: {
      type: String,
      require: [true, "Enter email"],
    },
    phoneno: {
      type: String,
      require: [true, "Enter Phone no"],
    },
    reason: {
      type: String,
      require: [true, "Enter reason to refund"],
    },

    order_id: {
      type: String,
      require: [true, "Enter Order Id"],
    },
    account_id: {
      type: String,
      require: [true, "Enter reason to account Id"],
    },
  },
  {
    timestamps: true,
  }
);

const packagepricingSchema = new mongoose.Schema(
  {
    price: {
      type: String,
      require: [true, "Enter Price"],
    },
    currency: {
      type: String,
      default: "US",
    },
    title: {
      type: String,
      require: [true, "Enter title"],
    },
    desc: {
      type: String,
      require: [true, "Enter desc"],
    },
    count: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const sampledataSchema = new mongoose.Schema({
  vin: {
    type: String,
    require: true,
  },
  image: {},
  year: {
    type: String,
    require: true,
  },
  madeIn: {
    type: String,
    require: true,
  },
  model: {
    type: String,
    require: true,
  },
  engineCylinder: {
    type: String,
    require: true,
  },
  make: {
    type: String,
    require: true,
  },
});
const reportSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    email: {
      type: String,
      require: true,
    },
    vin: {
      type: String,
      require: true,
    },
    phone:{
      type: String,
      require: true,
    },
    pending: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);
const VinTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    require: true,
  },
  expiresAt: {
    type: String,
  },
});
const Sampledata = mongoose.model("Sampledata", sampledataSchema);

const Report = mongoose.model("Report", reportSchema);

const User = mongoose.model("User", userSchema);

const Refund = mongoose.model("Refund", refundSchemaType);

const Transaction = mongoose.model("Transaction", transactionSchema);

const Packages = mongoose.model("Packages", packagepricingSchema);

const Token = mongoose.model("Token", VinTokenSchema);
module.exports = {
  User,
  Refund,
  Transaction,
  Packages,
  Sampledata,
  Report,
  Token,
};
