
const mongoose = require('mongoose');

const m = require('./models/models');

var ScoreKeeper = (function () {
    function ScoreKeeper(robot) {
        var storageLoaded;
        this.robot = robot;
        storageLoaded = (function (_this) {
            return function () {
                var base;
                _this.storage = (base = _this.robot.brain.data).plusPlus || (base.plusPlus = {
                    scores: {},
                    log: {},
                    reasons: {},
                    last: {}
                });
                if (typeof _this.storage.last === "string") {
                    _this.storage.last = {};
                }
                return _this.robot.logger.debug("Plus Plus Data Loaded: " + JSON.stringify(_this.storage, null, 2));
            };
        })(this);
        this.robot.brain.on("loaded", storageLoaded);
        storageLoaded();
    }

    ScoreKeeper.prototype.getUser = function (uname, callback) {
        robot.logger.info("getting user: " + uname);

        const model = m.models.UserModel.findOne({ 'username': uname });

        model.exec(function (err, u) {
            var uRet;
            if (err) {
                robot.logger.info("UserModel.findOne: " + uname + " error: " + err);

                uRet = new m.models.UserModel({ 'username': uname, 'kudos': 0, 'details': [] });
            }
            else {
                if (!u) {
                    u = new m.models.UserModel({ 'username': uname, 'kudos': 0, 'details': [] });
                }
                robot.logger.info("UserModel.findOne: " + uname + " found: " + u);

                uRet = u;
            }

            callback(uRet);
        });
    }

    ScoreKeeper.prototype.validate = function (to, from) {
        return (to !== from) && (to !== "") && !this.isSpam(to, from);
    }

    ScoreKeeper.prototype.isSpam = function (to, from) {
        const query = m.models.UserLogModel.findOne({ 'fromUser': from, 'toUser': to });
        query.exec(function (error, result) {
            // handle error

            if (!result) {
                robot.logger.info('no element in log file founs, is not spam');
                return false;
            }

            const ds = result.dateSubmitted;

            const date = new Date(ds);
            const messageIsSpam = date.setSeconds(date.getSeconds() + 5) > new Date();

            if (!messageIsSpam) {

                robot.logger.info('this is not a spam');

                const query2 = m.models.UserLogModel.deleteMany({ 'fromUser': from, 'toUser': to });

                query2.exec(function (err, u) {
                    if (err) {
                        robot.logger.info("isSpam user: " + from + " error: " + err);
                    }
                    else {
                        robot.logger.info("UserLogModel.deleteMany: " + from + " found: " + u);
                    }
                });
            }

            return messageIsSpam;
        });
    }

    ScoreKeeper.prototype.saveUser = function (userModel, userDetailsModel, callback) {
        this.saveScoreLog(userModel, userDetailsModel, () => {
            userModel.save(function (err, result) {
                if (err) {
                    robot.logger.info("Error on saving the user: " + err);
                }
                else {
                    robot.logger.info("User saved: " + result)
                }

                callback(userModel.kudos, userDetailsModel.reason);
            });
        });
    }

    ScoreKeeper.prototype.saveScoreLog = function (userModel, userDetailsModel, callback) {
        const userLogModel = new m.models.UserLogModel({
            fromUser: userDetailsModel.fromUser,
            toUser: userModel.username,
            room: userDetailsModel.room,
            dateSubmitted: new Date()
        });

        userLogModel.save(function (err, result) {
            if (err) {
                robot.logger.warn("Error on saving the userlog: " + err);
            }
            else {
                robot.logger.info("Userlog saved: " + result)
            }

            // time to save the last value in the room
            // first check if it exist (create or update last)
            m.models.RoomModel.findOne({ "name": userDetailsModel.room }).exec(
                function (err, result) {
                    if (err) {
                        robot.logger.warn("Error on getting last: " + err);
                    }
                    else {
                        robot.logger.debug("Last found: " + result);

                        if (!result) {
                            // create a new one
                            const last = new m.models.RoomModel({
                                "name": userDetailsModel.room,
                                "lastUser": userModel.username,
                                "lastReason": userDetailsModel.reason
                            });

                            last.save(function (err, result) {
                                if (err) {
                                    robot.logger.warn("Error on saving the last: " + err);
                                }
                                else {
                                    robot.logger.info("last saved: " + result);

                                    callback();
                                }
                            });
                        }

                        // change the value then
                        result.lastUser = userModel.username;
                        result.lastReason = userDetailsModel.reason;

                        result.save(function (err, result) {
                            if (err) {
                                robot.logger.warn("Error on saving the last: " + err);
                            }
                            else {
                                robot.logger.info("last result saved: " + result);

                                callback();
                            }
                        });
                    }
                });
        })
    }

    ScoreKeeper.prototype.add = function (to, from, rm, rsn, callback) {
        robot.logger.info("writing a score to user: " + to + " - " + from + " - " + rm);

        if (this.validate(to, from)) {
            this.getUser(to, (u) => {
                robot.logger.info("user found :" + u.username + " - " + u.kudos + " - " + u.details);

                u.kudos++;

                var detailsModel = new m.models.UserDetailsModel({ fromUser: from, addValue: 1, reason: rsn, room: rm });
                u.details.push(detailsModel);


                this.saveUser(u, detailsModel, (k, r) => {
                    callback(k, r);
                });
            });
        } else {
            callback(null, null);
        }
    }

    ScoreKeeper.prototype.subtract = function (to, from, rm, rsn, callback) {
        robot.logger.info("writing a score to user: " + to + " - " + from + " - " + rm);

        if (this.validate(to, from)) {
            this.getUser(to, (u) => {
                robot.logger.info("user found :" + u.username + " - " + u.kudos + " - " + u.details);

                u.kudos--;

                var detailsModel = new m.models.UserDetailsModel({ fromUser: from, addValue: -1, reason: rsn, room: rm });
                u.details.push(detailsModel);


                this.saveUser(u, detailsModel, (k, r) => {
                    callback(k, r);
                });
            });
        } else {
            callback(null, null);
        }
    }

    ScoreKeeper.prototype.scoreForUser = function (user, callback) {
        this.getUser(user, callback);
    }

    ScoreKeeper.prototype.erase = function (user, from, room, reason, callback) {
        this.getUser(user, (u) => {
            if (reason) {
                this.getUser(user, (u) => {
                    robot.logger.info("user found :" + u.username + " - " + u.kudos + " - " + u.details);

                    for (let index = 0; index < u.details.length; index++) {
                        const element = u.details[index];

                        if (element.reason === reason) {
                            u.details.splice(index, 1);

                            u.models.UserModel.save(function (err, result) {
                                if (err) {
                                    robot.logger.info("Error on saving the user: " + err);
                                }
                                else {
                                    robot.logger.info("User saved: " + result);
                                    callback();
                                }
                            });
                        }
                    }

                    callback();
                });
            } else {
                m.models.UserModel.deleteOne({ 'username': user }).exec(function (err, u) {
                    if (err) {
                        robot.logger.info("erase user: " + user + " error: " + err);
                    }
                    else {
                        robot.logger.info("erase user: " + user + " found: " + u);
                        callback();
                    }
                });
            }
        });
    }

    ScoreKeeper.prototype.top = function (amount, callback) {
        const tops = [];

        m.models.UserModel.find({}).sort({ kudos: -1 }).limit(amount).exec(
            function (err, result) {
                if (err) {
                    robot.logger.warn("Error on getting top users: " + err);
                }
                else {
                    robot.logger.debug("Top found: " + result);

                    const mappedResults = result.map(function (res) {
                        var info = {
                            "name": res.username,
                            "score": res.kudos
                        }
                        return info;
                    });

                    robot.logger.debug("Top mappedResults: " + mappedResults);

                    callback(mappedResults);
                }
            });
    }

    ScoreKeeper.prototype.bottom = function (amount, callback) {
        const tops = [];

        m.models.UserModel.find({}).sort({ kudos: 1 }).limit(amount).exec(
            function (err, result) {
                if (err) {
                    robot.logger.warn("Error on getting bottom users: " + err);
                }
                else {
                    robot.logger.debug("Bottom found: " + result);

                    const mappedResults = result.map(function (res) {
                        var info = {
                            "name": res.username,
                            "score": res.kudos
                        }
                        return info;
                    });

                    robot.logger.debug("Bottom mappedResults: " + mappedResults);

                    callback(mappedResults);
                }
            });
    }

    ScoreKeeper.prototype.last = function (room, callback) {
        m.models.RoomModel.findOne({ "name": room }.exec(
            function (err, result) {
                if (err) {
                    robot.logger.warn("Error on getting last: " + err);
                }
                else {
                    robot.logger.debug("Last found: " + result);

                    if (!result) {
                        callback(null, null);
                    }

                    callback(result.lastUser, result.lastReason);
                }
            }));
    }
    
    ScoreKeeper.prototype.normalize = function (fn) {
        m.models.UserModel.find({}).exec(
            function (err, result) {
                if (err) {
                    robot.logger.warn("Error on normalize: " + err);
                }
                else {
                    for (let index = 0; index < result.length; index++) {
                        const r = result[index];

                        r.kudos = fn(r.kudos);

                        r.save(function (err, result) {
                            if (err) {
                                robot.logger.info("Error on saving the user: " + err);
                            }
                            else {
                                robot.logger.info("User saved: " + result);
                            }
                        });
                    }
                }
            });
    }
    
    return ScoreKeeper;

})();

module.exports = ScoreKeeper;
