require("dotenv").config();

const dbUrl = process.env.DATABASE_URL;

const config = {
  url: dbUrl,
  dialect: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
};

module.exports = {
  development: config,
  test: config,
  production: config,
};
