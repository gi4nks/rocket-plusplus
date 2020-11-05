const mongoose = require('mongoose');

const models = require('./user.model');

const connectDb = () => mongoose.connect(process.env.PLUSPLUS_DATABASE_HOST, {useNewUrlParser: true});

exports.connectDb = connectDb;
exports.models = models;