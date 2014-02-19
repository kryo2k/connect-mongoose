connect-mongoose
================

Port of kcbanner's Connect-Mongo (MongoStore) to use mongoose models for storing sessions.

# Installation
```
npm install connect-mongoose-model
```

# Quick example
**In a real setup, your layout will probably be different.**

```JavaScript
var // node requirements:
express = require('express'),
mongoose = require('mongoose'),
connectMongoose = require('connect-mongoose-model');

var // create a minimalistic schema for storing sessions data:
Schema = mongoose.Schema,
Session = mongoose.model('Session', new Schema({
  sid: String,
  data: String,
  lastActivity: {
    type: Date,
    expires: 900 // removed automatically after 15 minutes of no activity <3 mongo.
  }
}));

var
// create a connectMongoose store prototype which is linked on the mongoose model:
mongooseStore = connectMongoose(express, Session),

// connect to your database
db = mongoose.connect('mongodb://localhost/test'),

// create our express application instance:
app = express();

// configure express session with our session store:
app.use(express.session(
  secret: 'your own secret here',
  store: new mongooseStore({
    clear_interval: 900 // every 15 minutes
  }),
  cookie: {
    maxAge: 1209600 * 1000 // 2 weeks
  }
));
```

# Configuration
The mongooseStore prototype accepts the following options, in addition to those
inherited from the connect memory store:

key                       | default       | description
--------------------------|---------------|---------------------------------------------------------
propertySessionId         | sid           | Model property that holds session id (i.e. PADiGWwMH2Ym2iKuMQVV6SPM) not ObjectId (that's _id)
propertyData              | data          | Model property that holds the session data
propertyLastActivity      | lastActivity  | Model property that remembers last activity of this session (this is updated on session.set())
updateLastActivity        | true          | If the session's lastActivity should be on set()
defaultExpirationTime     | 86400000      | Default expiration time for the cookie. (default is 24hrs)

