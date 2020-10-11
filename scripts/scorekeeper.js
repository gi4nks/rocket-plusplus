
const mongoose = require('mongoose');

const m = require('./models/models');

var ScoreKeeper = function (robot) {

  this.getUser = (uname, callback) => {
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

  this.validate = (to, from) => {
    return (to !== from) && (to !== "") && !this.isSpam(to, from);
  }

  this.isSpam = (to, from) => {
    const query = m.models.UserLogModel.findOne({ 'fromUser': from, 'toUser': to });
    query.exec(function(error, result) {
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

  this.saveUser = (userModel, userDetailsModel, callback) => {
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

  this.saveScoreLog = (userModel, userDetailsModel, callback) => {

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

      callback();
    })
  }

  this.add = (to, from, rm, rsn) => {
    robot.logger.info("writing a score to user: " + to + " - " + from + " - " + rm);

    if (this.validate(to, from)) {
      this.getUser(to, (u) => {
        robot.logger.info("user found :" + u.username + " - " + u.kudos + " - " + u.details);

        u.kudos++;

        var detailsModel = new m.models.UserDetailsModel({ fromUser: from, addValue: 1, reason: rsn, room: rm });
        u.details.push(detailsModel);


        this.saveUser(u, detailsModel, (k, r) => {
          return [k, r];
        });
      });
    } else {
      return [null, null];
    }
  }

  this.subtract = (to, from, rm, rsn) => {
    robot.logger.info("writing a score to user: " + to + " - " + from + " - " + rm);

    if (this.validate(to, from)) {
      this.getUser(to, (u) => {
        robot.logger.info("user found :" + u.username + " - " + u.kudos + " - " + u.details);

        u.kudos--;

        var detailsModel = new m.models.UserDetailsModel({ fromUser: from, addValue: -1, reason: rsn, room: rm });
        u.details.push(detailsModel);


        this.saveUser(u, detailsModel, (k, r) => {
          return [k, r];
        });
      });
    } else {
      return [null, null];
    }
  }

  this.scoreForUser = (user, callback) => {
    this.getUser(user, callback);
  }

  this.erase = (user, from, room, reason) => {
    this.getUser(user, (u) => {
      if (reason) {
        delete this.storage.reasons[user][reason];
        this.saveUser(user, from.name, room);
        return true;
      } else {
        delete this.storage.scores[user];
        delete this.storage.reasons[user];
        return true;
      }  
    });
  }

  /*
  const storageLoaded = () => {
    this.storage = robot.brain.data.plusPlus || (robot.brain.data.plusPlus = {
      scores: {},
      log: {},
      reasons: {},
      last: {}
    });
    if (typeof this.storage.last === "string") {
      this.storage.last = {};
    }

    return robot.logger.debug("Plus Plus Data Loaded: " + JSON.stringify(this.storage, null, 2));
  };

  robot.brain.on("loaded", storageLoaded);
  storageLoaded();

  this.getUser = (user) => {
    if (!this.storage.scores[user]) { this.storage.scores[user] = 0; }
    if (!this.storage.reasons[user]) { this.storage.reasons[user] = {}; }
    return user;
  }

  this.saveUser = (user, from, room, reason) => {
    this.saveScoreLog(user, from, room, reason);
    robot.brain.save();

    return [this.storage.scores[user], this.storage.reasons[user][reason] || "none"];
  }

  this.add = (user, from, room, reason) => {
    robot.logger.info("writing a score to user: " + user + "-" + from + "-" + room);

    if (this.validate(user, from)) {
      user = this.getUser(user);
      this.storage.scores[user]++;
      if (!this.storage.reasons[user]) { this.storage.reasons[user] = {}; }

      if (reason) {
        if (!this.storage.reasons[user][reason]) { this.storage.reasons[user][reason] = 0; }
        this.storage.reasons[user][reason]++;
      }

      return this.saveUser(user, from, room, reason);
    } else {
      return [null, null];
    }
  }

  this.subtract = (user, from, room, reason) => {
    if (this.validate(user, from)) {
      user = this.getUser(user);
      this.storage.scores[user]--;
      if (!this.storage.reasons[user]) { this.storage.reasons[user] = {}; }

      if (reason) {
        if (!this.storage.reasons[user][reason]) { this.storage.reasons[user][reason] = 0; }
        this.storage.reasons[user][reason]--;
      }

      return this.saveUser(user, from, room, reason);
    } else {
      return [null, null];
    }
  }

  this.erase = (user, from, room, reason) => {
    user = this.getUser(user);

    if (reason) {
      delete this.storage.reasons[user][reason];
      this.saveUser(user, from.name, room);
      return true;
    } else {
      delete this.storage.scores[user];
      delete this.storage.reasons[user];
      return true;
    }

    return false;
  }

  this.scoreForUser = (user) => {
    user = this.getUser(user);
    return this.storage.scores[user];
  }

  this.reasonsForUser = (user) => {
    user = this.getUser(user);
    return this.storage.reasons[user];
  }

  this.saveScoreLog = (user, from, room, reason) => {
    if (typeof this.storage.log[from] !== "object") {
      this.storage.log[from] = {};
    }

    this.storage.log[from][user] = new Date();
    return this.storage.last[room] = {user, reason};
  }

  this.last = (room) => {
    const last = this.storage.last[room];
    if (typeof last === 'string') {
      return [last, ''];
    } else {
      return [last.user, last.reason];
    }
  }

  this.isSpam = (user, from) => {
    if (!this.storage.log[from]) { this.storage.log[from] = {}; }

    if (!this.storage.log[from][user]) {
      return false;
    }

    const dateSubmitted = this.storage.log[from][user];

    const date = new Date(dateSubmitted);
    const messageIsSpam = date.setSeconds(date.getSeconds() + 5) > new Date();

    if (!messageIsSpam) {
      delete this.storage.log[from][user]; //clean it up
    }

    return messageIsSpam;
  }

  this.validate = (user, from) => {
    return (user !== from) && (user !== "") && !this.isSpam(user, from);
  }

  this.length = () =>  {
    return this.storage.log.length;
  }

  this.top = (amount) => {
    let score;
    const tops = [];

    for (let name in this.storage.scores) {
      score = this.storage.scores[name];
      tops.push({name, score});
    }

    return tops.sort((a, b) => b.score - a.score).slice(0,amount);
  }

  this.bottom = (amount) => {
    const all = this.top(this.storage.scores.length);
    return all.sort((a, b) => b.score - a.score).reverse().slice(0,amount);
  }

  this.normalize = (fn) => {
    const scores = {};

    _.each(this.storage.scores, function(score, name) {
      scores[name] = fn(score);
      if (scores[name] === 0) { return delete scores[name]; }
    });

    this.storage.scores = scores;
    return robot.brain.save();
  }
  */
}

module.exports = ScoreKeeper;
