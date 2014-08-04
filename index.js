var exec = require('child_process').exec;
var request = require('request');
var cheerio = require('cheerio');
var _ = require('underscore');
_.mixin( require('underscore.deferred') );
var inflection = require('inflection');
var conf = require('./config.js');
var Twitter = require('node-twitter');
var twitterRestClient = new Twitter.RestClient(
  conf.consumer_key,
  conf.consumer_secret,
  conf.access_token,
  conf.access_token_secret
);
var Tumblr = require('tumblrwks');
var tumblr = new Tumblr({
    consumerKey:    conf.tumblr_consumer_key,
    consumerSecret: conf.tumblr_consumer_secret,
    accessToken:    conf.tumblr_access_token,
    accessSecret:   conf.tumblr_access_token_secret
  }, 'reverseocr.tumblr.com'
);
var wordfilter = require('wordfilter');
var wordnikKey = require('./permissions.js').key;
var Ocrad = require('ocrad.js');
var Canvas = require('canvas');
var Image = Canvas.Image;
var fs = require('fs');
var WIDTH = 800,
    HEIGHT = 200,
    GWIDTH = 100;

var canvas = new Canvas(WIDTH, HEIGHT);
var ctx = canvas.getContext('2d');

var gCanvas = new Canvas(GWIDTH, HEIGHT);
var gCtx = gCanvas.getContext('2d');

Array.prototype.pick = function() {
  return this[Math.floor(Math.random()*this.length)];
};

Array.prototype.pickRemove = function() {
  var index = Math.floor(Math.random()*this.length);
  return this.splice(index,1)[0];
};

function makePng(canvas) {
  var dfd = new _.Deferred();
  var fs = require('fs'),
      out = fs.createWriteStream(__dirname + '/out.png'),
      stream = canvas.pngStream();

  stream.on('data', function(chunk){
    out.write(chunk);
  });

  stream.on('end', function(){
    console.log('saved png');
    exec('convert out.png out.png').on('close', function() {
      dfd.resolve('done!');
    });
  });
  return dfd.promise();
}

function generate() {
  var dfd = new _.Deferred();
  ctx.lineWidth = 2;
  gCtx.lineWidth = 2;
  ctx.circle = function(x, y, r) {
    this.arc(x, y, r, 0, Math.PI*2, true);
  }

  ctx.font = '30px Arial';
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = 'black';

  function glyph(x, y) {
    gCtx.beginPath();
    gCtx.moveTo(x,y);
    for (var i=0; i<20; i++) {
      x += Math.random()*80-40;
      y += Math.random()*80-40;
      gCtx.lineTo(x, y);
    }
    gCtx.closePath();
    gCtx.stroke();
  }

  var result = '';
  var finalResult = '';

  function isVowel(c) {
    if (c === 'a' || c === 'e' || c === 'i' || c === 'o' || c === 'u' ||
        c === 'A' || c === 'E' || c === 'I' || c === 'O' || c === 'U') {
      return true;
    }
    return false;
  }

  var word = 'reverse ocr';
  request('http://api.wordnik.com/v4/words.json/randomWords?minCorpusCount=8000&maxLength=8&minDictionaryCount=5&excludePartOfSpeech=proper-noun,proper-noun-plural,proper-noun-posessive,suffix,family-name,idiom,affix&hasDictionaryDef=true&includePartOfSpeech=noun&limit=1000&maxLength=22&api_key='+wordnikKey, function(err, resp, body) {
    var res = _.pluck(JSON.parse(body), 'word');
    word = res.pick();
    console.log(word);
    for (var j=0; j < word.length; j++) {
      for(var i=0; i<80000; i++) {
        gCtx.fillStyle = 'white';
        gCtx.fillRect(0, 0, WIDTH, HEIGHT);
        gCtx.fillStyle = 'black';
        glyph(50,100);
        result = Ocrad(gCanvas).trim();
        if (result.length === 1 && result.charCodeAt(0) >= 65 && result.charCodeAt(0) <= 122 && result === word[j]) {
          console.log(result);
          var bimg = new Image;
          bimg.src = gCanvas.toBuffer();
          ctx.drawImage(bimg, j*GWIDTH, 0, GWIDTH, HEIGHT);
          finalResult += result;
          i = 100000;
        }
      }
      if (i !== 100001) {
        finalResult += ' ';
      }
    }
    makePng(canvas).done(function() {
      dfd.resolve(finalResult);
    });
  });
  return dfd.promise();
}

function tweet() {
  generate().then(function(myTweet) {
    if (!wordfilter.blacklisted(myTweet)) {
      console.log(myTweet);
      twitterRestClient.statusesUpdateWithMedia({
          'status': myTweet,
          'media[]': './out.png'
        },
        function(error, result) {
          if (error) {
            console.log('Error: ' + (error.code ? error.code + ' ' + error.message : error.message));
          }
          if (result) {
            console.log(result);
            // Tumblr it
            tumblr.post('/post', {
              type: 'photo',
              source: result.entities.media[0].media_url,
              caption: myTweet,
              }, function(err, json){
              console.log(json, err);
            });
          }
      });
    }
  });
}

// Tweet once on initialization
tweet();
