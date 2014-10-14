var async = require('async');
var FeedParser = require('feedparser')
  , request = require('request');
var moment = require('moment');
var phantom = require('phantom');
var Q = require('Q');
var schedule = require('node-schedule');

var urls = [
  'http://www.zachdunham.com/talk?format=RSS',
  'http://halfdanj.github.io/feed.xml',
  'http://sfpc.zanarmstrong.com/feed.xml',
  'http://solutionizing.tumblr.com/rss',
  'http://mkhandekar.tumblr.com/rss',
  'http://essays.sarahgp.com/rss/',
  'http://www.franc.ly/feed.xml'

];


var rule = new schedule.RecurrenceRule();
rule.dayOfWeek = [0, new schedule.Range(0, 6)];
rule.hour = 9;
rule.minute = 0;


var j = schedule.scheduleJob(rule, function(){
  run();
});
console.log("I will create pdf's tomorrow at 7am!\n\n");
console.log("These are the url's:\n\n",urls);

var run = function(){



//Loop through the feeds
  async.eachSeries(urls, function( url, callback) {
    console.log(url)

    var feedparser = new FeedParser([{}]);
    var req = request({ url: url, headers: {
      'User-Agent' : 'request',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    }});

    var promises = [];

    req.on('error', function (error) {
      // handle any request errors
      console.log(error)
      callback();

    });

    req.on('response', function (res) {
      var stream = this;

      if (res.statusCode != 200) return this.emit('error', new Error('Bad status code'));

      stream.pipe(feedparser);
    });


    feedparser.on('end', function() {
      console.log("Waiting for renders to finish")

      //Wait for all the render promises to be done before continuing with the next feed
      Q.all(promises).then(function(){
        callback();
      })
    });

    feedparser.on('readable', function() {
      // This is where the action is!
      var stream = this
        , item;


      while (item = stream.read()) {
        var date = moment(item.date);

        console.log(item.meta.title, item.title, date.format())
        var diff = moment().diff(date.format(), 'days');

        if(diff <= 1){
          //If the post is less than 24 hours old, render it
          var promise = render(item.link, item.title);
          promises.push(promise);
        }

        console.log("---------");

      }
    });
  }, function(){
    console.log("\n\n\n################\nDone for todays press, get ready for tomorrow 7am!");
  });

};


var render = function(url, title){
  var deferred = Q.defer();
  console.log("render ",url,title)
  var size = 2880;
  phantom.create(function(ph){
    ph.createPage(function(page) {
      page.open(url, function(status) {
        page.set('viewportSize', { width: size, height: size/0.772 }, function (result) {
          console.log("Viewport set to: " + result.width + "x" + result.height)

          page.render("output/"+title+'.pdf', function(){

            console.log('Page Rendered');
            ph.exit();
            deferred.resolve();

          });
        })

      });
    });
  });

  return deferred.promise;
};

//run();
