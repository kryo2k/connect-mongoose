'use strict';

/**
 * Express Session Store for MongooseJS
 * Partially adapted from connect-mongo's implmentation.
 *
 * @author Hans Doller <kryo2k@gmail.com>
 */

var
_ = require('lodash'),
util = require('util');

var
defaults = {

  // properties which should exist in model:
  propertySessionId:    'sid',             // holds session id (i.e. PADiGWwMH2Ym2iKuMQVV6SPM) not ObjectId (that's _id)
  propertyData:         'data',            // holds the session data
  propertyLastActivity: 'lastActivity',    // last activity of this session

  // if last activity should be updated automatically on get()
  updateLastActivity: true,

  // default expiration time for sessions
  defaultExpirationTime:  86400 * 1000     // 24hrs.
};

/**
 * MongooseStore bootstrap constructor
 *
 * @param {Express} Session         Instance of express-session
 * @param {Model}   mongooseModel   Model to use for sessions
 * @return {Function}
 */
function MongooseStore(session, mongooseModel) {
  var
  self = this;

  if(!session || !session.Store) {
    throw 'express-session was not passed in constructor.';
  }

  if(!mongooseModel || !mongooseModel.findById) {
    throw 'Mongoose Model was not passed in constructor.';
  }

  var Store = session.Store;

  /**
   * MongooseStore session store constructor
   */
  function MStore(config) {
    var
    me = this,

    // define our options for this store instance
    opts = _.extend({}, defaults, config),

    // default (un)serializer using JSON
    serializer = JSON.stringify,
    unserializer = JSON.parse;

    // call superclass method
    Store.call(me, opts);

    var
    defExpireTime  = opts.defaultExpirationTime,
    propSid        = opts.propertySessionId,
    propData       = opts.propertyData,
    propLastActive = opts.propertyLastActivity;

    // creates/updates a query to search for a certain property
    function _applyProp(property, value, obj) {
      obj = obj || {};
      obj[property] = value;
      return obj;
    }

    // checks a session document's expiration date to see if it's still valid
    function _checkExpiration(session) {
      return !session[propLastActive] || new Date < (session[propLastActive].getTime() + defExpireTime);
    }

    _.extend(me, {

      // get session data by session id:
      get: function (sid, callback) {
        var cb = callback || _.noop;

        // ensureIndex is already called on start-up
        mongooseModel.findOne(_applyProp(propSid, sid), function(err, doc) {

          if(err || !doc) { // exit immediately
            cb(err, null);
            return;
          }

          if(_checkExpiration(doc) && doc[propData] !== undefined) { // we're still valid:
            cb(null, unserializer(doc[propData]));
          }
          else { // needs clean-up
            me.destroy(sid, cb);
          }
        });
      },

      // set session data by session id:
      set: function (sid, session, callback) {
        var rec = {};

        // apply our properties:
        _applyProp(propSid, sid, rec);
        _applyProp(propData, serializer(session), rec);

        // opportunity to do:
        _applyProp(propLastActive, new Date(), rec);

        mongooseModel.findOneAndUpdate(_applyProp(propSid, sid), rec, {upsert: true}, function(err){
          (callback||_.noop)(err);
        });
      },

      // destroy session by session id:
      destroy: function (sid, callback) {
        mongooseModel.findOneAndRemove(_applyProp(propSid, sid), function(err) {
          (callback||_.noop)(err);
        });
      },

      // get the number of total sessions:
      length: function (callback) {
        mongooseModel.count({}, callback||_.noop);
      },

      // clear all stored sessions:
      clear: function (callback) {
        mongooseModel.remove({}, callback||_.noop);
      }
    });

    return me;
  }

  // inherit by default from connect memory store:
  util.inherits(MStore, Store);

  // return preconfigured mongoose store:
  return MStore;
}

module.exports = MongooseStore;