// ---------- Import Packages ---------- //
const express = require('express');
const mongoose = require('mongoose');
const cheerio = require('cheerio');
const request = require('request');
const bodyParser = require('body-parser');
const exhandlebars = require('express-handlebars');

// ---------- Initialize ---------- //
// Import Models
const db = require('./models');

// Express init
const app = express();
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended:true}));

// If deployed, use deployed port. If local, use 3000
const PORT = process.env.PORT || 3000;

// If deployed, use the deployed database, otherwise use the local mongoHeadlines database
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";

// Setup Express Handlebars
app.engine('handlebars', exhandlebars({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

// Mongoose init
mongoose.Promise = Promise;

// Connect to DB
mongoose.connect(MONGODB_URI, {useNewUrlParser: true});

// ---------- Scraper ---------- //
function scrape(cb) {
    request('https://www.chiefs.com/news/', (err, response, body) => {
        let articles = [];

        let $ = cheerio.load(body);

        $('section .d3-is-lazy-load-more .d3-l-col__col-3').each((i, element) => {
            let newArticle = {};

            newArticle.title = $(element)
                .find('a')
                .attr('title').trim();

            newArticle.link = $(element)
                .find('a')
                .attr('href');

            newArticle.summary = $(element)
                .find('.d3-o-media-object__summary')
                .text().trim();

            newArticle.date = $(element)
                .find('.d3-o-media-object__date')
                .text().trim();

            newArticle.image = $(element)
                .find('img')
                .attr('src').replace('t_lazy/', '');

            // If no title, add a placeholder
            if (!newArticle.title) {
                newArticle.title = 'Title Placeholder'
            }

            if (!newArticle.summary) {
                newArticle.summary = 'Summary Placeholder'
            }

            // If no image on page, add a placeholder
            if (!newArticle.image) {
                newArticle.image = 'https://via.placeholder.com/150';
            }

            // Add article to array
            if (newArticle.link) {
                newArticle.link = "https://www.chiefs.com" + newArticle.link;
                articles.push(newArticle);
            } else {
                console.log('No URL to link to. Skipping add to Array');
            }
        });

        // Check for duplicates of new articles
        console.log('Duplicate checking...');
        articles.forEach((a, b) => {
            articles.forEach((c, d) => {
                if (b !== d && a.link === c.link) {
                    console.log('Duplicate found...');
                    articles.splice(d, 1);
                    console.log('Duplicate removed...');
                }
            });
        });

        // Check for duplicates in database
        console.log('DB Duplicate checking...');
        db.Article.find({}, (err, data) => {
           data.forEach((a, b) => {
               articles.forEach((c, d) => {
                   if (a.link === c.link) {
                       console.log('Duplicate found...');
                       articles.splice(d, 1);
                       console.log('Duplicate removed...');
                   }
               });
           });

           // Add Articles to DB
           db.Article.insertMany(articles, (err, data) => {
               if (err) throw err;
               cb(data);
               console.log('Added articles to DB...');
           });
        });
    });
}

// ---------- Routes ---------- //
// Homepage
app.get('/', (req, res) => {
   let query = db.Article.find({}).sort('-.id').limit(24);
   query.exec((err, data) => {
       if (err) throw err;
       res.render('index', {articles: data});
   })
});

// Archive
app.get('/archive', (req, res) => {
   let query = db.Article.find({}).sort('-.id');
   query.exec((err, data) => {
       if (err) throw err;
       res.render('index', {articles: data});
   })
});

// Render Comments
app.get('/:id/comments', (req, res) => {
   db.Article.findOne({'_id': req.params.id}).populate('comments').then((data) => {
      res.render('comments', {article: data});
   });
});

// Add Comments
app.get('/api/:id/comments', (req, res) => {
    db.Comment.create(req.body).then((data) => {
       return db.Article.findOneAndUpdate(
           {
               '_id': req.params.id
           },{
               $push: {'comments': data._id}
           },{
               new: true
           }
       )
    }).then((data) => {
       res.json(data);
    });
});

app.delete('/api/comments/:id', (req, res)  => {
   db.Comment.deleteOne({
       "_id": req.params.id
   }).then((data) => {
      res.json(data);
   });
});

// Scrape Articles
app.get('/api/scrape', (req, res) => {
   scrape((newArticles) => {
       res.json(newArticles);
    });
});

// Display Articles JSON
app.get('/api/articles', (req, res) => {
   let query = db.Article.find({}).sort('-.id');
   query.exec((err, data) => {
       if (err) throw err;
       res.json(data);
   })
});

// ---------- Start Server ---------- //
app.listen(PORT, function() {
    console.log("App running on port: " + PORT);
});
