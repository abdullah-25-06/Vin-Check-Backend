const { User } = require("../model/model");
const JwtStrategy = require("passport-jwt/lib/strategy.js");
const ExtractJwt = require("passport-jwt/lib/extract_jwt.js");

const option = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.access_key
};

const strategy1 = new JwtStrategy(option, (payload, done) => {
  console.log("here1");
  User
    .findOne({ _id: payload.id })
    .select("email username phoneno token_detail")
    .then((user) => {
      if (user) {
        console.log(user);
        console.log("here1");
        if (user.token_detail.jti == payload.jti) {
          return done(null, user);
        } else {
          return done(null, false);
        }
      } else {
        console.log("here");
        return done(null, false);
      }
    })
    .catch((err) => done(err, null));
});

const passportConfig = (passport) => {
  passport.use(strategy1);
  console.log("here3");
};
module.exports = passportConfig;