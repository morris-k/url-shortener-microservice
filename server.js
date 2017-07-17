// server.js
// where your node app starts

// init project
var express = require('express');
var bodyparser = require("body-parser");
var validator = require("validator");
var mongoose = require('mongoose');
mongoose.Promise = require("bluebird");
mongoose.connect("mongodb://main:pass@ds147872.mlab.com:47872/shorten", {
  useMongoClient: true
})
var lilUrlSchema = new mongoose.Schema({
  original_url: String,
  short_url: String,
  url_id: {
    type: Number,
    index: true,
    unique: true
  }
});
var Item = mongoose.model("Item", lilUrlSchema);
var app = express();

app.use(bodyparser.json()); 
app.use(bodyparser.urlencoded({ extended: true })); 


function saveWithUniqueId(original, base, cb) {
  var num = Math.floor(Math.random() * 10000) + 1000;
  if (original.charAt(0) != "h") {
    var s = "https://";
    if (original.charAt(0) != "w") {
      s += "www."
    }
    original = s+original;
  }
  var newItem = new Item({url_id: num, original_url: original, short_url: base + "/" + num});
  newItem.save(function(err, item) {
    cb(err, item);
  });
}

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));
app.set('view engine', 'pug');

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  Item.find(function(err, list) {
    if (err) {
      response.render("index", {error: err});
    } else {
      response.render('index', {items: list});
    }
  });
});

app.get(/\/(\d+)/, function(request, response) {
  Item.findOne({url_id: request.params[0]}, function(err, item) {
    console.log(err, item);
    if (err) {
      response.send("error: " + err);
    } else if (!item) {
      response.send("no url found");
    } else {
      response.redirect(item.original_url);
    }
  });
});

function makeItem(request, response, original, cb) {
  if (validator.isURL(original)) {
    console.log("valid url");
    var base = request.headers["x-forwarded-proto"].split(",")[0] + "://" + request.headers.host;
    console.log("saving...")
    saveWithUniqueId(original, base, function(err, item) {
      console.log("saved");
      if (err) {
        cb(err, null);
      } else {
        cb(err, item);
      }
      response.send({original_url: original, short_url: item.short_url});
    })
  } else {
    response.send("{Error: invalid url}");
  }
}

app.get("/new/:original(*)", function(request, response) {
  makeItem(request, response, request.params.original, function(err, item) {
    if (err) {
      response.send({error: err});
    } else {
      response.send({original_url: item.original_url, short_url: item.short_url});
    }
  });
})

app.post("/new", function(request, response) {
  makeItem(request, response, request.body.original, function(err, item) {
    if (err) {
      response.send({error: err});
    } else {
      response.send({original_url: item.original_url, short_url: item.short_url});
    }
  });
  
});

// could also use the POST body instead of query string: http://expressjs.com/en/api.html#req.body


// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
