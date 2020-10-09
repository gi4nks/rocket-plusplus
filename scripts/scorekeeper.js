const mongoose = require('mongoose');

const UserDetailsSchema = new mongoose.Schema({
  fromUser: String,
  addValue: Number,
  room: String,
  reason: String
});

const UserSchema = new mongoose.Schema({
  username: String,
  kudos: Number,
  details: [UserDetailsSchema]
});

const UserLogSchema = new mongoose.Schema({
  fromUser: String,
  toUser: String,
  room: String,
  dateSubmitted: Date
}); 

const UserModel = mongoose.model('UserModel', UserSchema);
const UserLogModel = mongoose.model('UserLogModel', UserLogSchema);
const UserDetailsModel = mongoose.model('UserDetailsModel', UserDetailsSchema);

var ScoreKeeper = function(robot) {

  mongoose.connect(process.env.PLUSPLUS_DATABASE_HOST, {useNewUrlParser: true});

  this.getUser = async (user) => {
    robot.logger.info("getting user: " + user);

    const model = UserModel.findOne({username: user}, function (err, u) { 
      if (err){ 
        robot.logger.warn("getting user: " + user + " error: " + err);

        return new UserModel({username: user, kudos: 0, details: {}});
      } 
      else { 
        robot.logger.info("getting user: " + user + " found: " + u);

        return u;
      }
    });

    return model;
  }

  this.validate = (user, from) => {
    return (user !== from) && (user !== "") && !this.isSpam(user, from);
  }

  this.isSpam = (user, from) => {
    const model = UserLogModel.findOne({userFrom: from}, function (err, ul) {
      if (err){ 
        robot.logger.warn("isSpam user: " + from + " error: " + err);

        return new UserLogModel({fromUser: user, toUser: from});
      } 
      else { 
        robot.logger.info("getting userlog: " + user + " found: " + u);

        return u;
      }
    });

    if (!model.dateSubmitted)  {
      return false;
    }

    const ds = model.dateSubmitted;

    const date = new Date(ds);
    const messageIsSpam = date.setSeconds(date.getSeconds() + 5) > new Date();

    if (!messageIsSpam) {
      var ret = UserLogModel.deleteOne({userFrom: from}, function (err, ul) {
        if (err){ 
          robot.logger.warn("isSpam user: " + user + " error: " + err);
  
          return false;
        } 
        else { 
          robot.logger.info("getting userlog: " + user + " found: " + u);
  
          return false;
        }
      });

      // don't do nothing
    }

    return messageIsSpam;
  }

  this.saveUser = (userModel, userDetailsModel) => {
    this.saveScoreLog(userModel, userDetailsModel);
  
    userModel.save(function(err, result){ 
      if (err){ 
        robot.logger.warn("Error on saving the user: " + err); 
      } 
      else{ 
        robot.logger.info("User saved: " + result) 
      } 
    })

    return [userModel.kudos, userDetailsModel.reason];
  }

  this.saveScoreLog = (userModel, userDetailsModel) => {

    const userLogModel = new UserLogModel({
      fromUser: userDetailsModel.fromUser,
      toUser: userModel.username,
      room: userDetailsModel.room,
      dateSubmitted: new Date()
    });

    userLogModel.save(function(err, result) {
      if (err){ 
        robot.logger.warn("Error on saving the userlog: " + err); 
      } 
      else{ 
        robot.logger.info("Userlog saved: " + result) 
      } 
    })

    return;
    //return this.storage.last[room] = {user, reason};
  }

  this.add = (user, from, rm, rsn) => {
    robot.logger.info("writing a score to user: " + user + " - " + from + " - " + rm);

    if (this.validate(user, from)) {
      user = this.getUser(user).then(user => {
        robot.logger.info("user found :" + user.username + " - " + user.kudos + " - " + user.details);

        user.kudos++;
        
        var detailsModel = new UserDetailsModel({fromUser: from, addValue: 1, reason: rsn, room: rm});
        user.details.push(detailsModel);
  

        return this.saveUser(user, detailsModel);  

      });

      /*
      robot.logger.info("user found :" + user.username + " - " + user.kudos + " - " + user.details);

      user.kudos++;
      
      var detailsModel = new UserDetailsModel({fromUser: from, addValue: 1, reason: rsn, room: rm});
      user.details.push(detailsModel);

      return this.saveUser(user, detailsModel);
      */
    } else {
      return [null, null];
    }
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
