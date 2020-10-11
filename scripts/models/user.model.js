const mongoose = require('mongoose');


const UserDetailsSchema = new mongoose.Schema({
    fromUser: String,
    addValue: Number,
    room: String,
    reason: String
});

const UserDetailsModel = mongoose.model('UserDetailsModel', UserDetailsSchema);

const UserLogSchema = new mongoose.Schema({
    fromUser: String,
    toUser: String,
    room: String,
    dateSubmitted: Date
});

const UserLogModel = mongoose.model('UserLogModel', UserLogSchema);

const UserSchema = new mongoose.Schema({
    username: String,
    kudos: Number,
    //details: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UserDetailsModel' }]
    details: [UserDetailsSchema]
});

const UserModel = mongoose.model('UserModel', UserSchema);

module.exports = { UserModel, UserDetailsModel, UserLogModel }

/*
exports.UserModel = UserModel;
exports.UserDetailsModel = UserDetailsModel;
exports.UserLogModel = UserLogModel;
*/