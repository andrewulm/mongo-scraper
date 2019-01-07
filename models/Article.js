const mongoose = require('mongoose');

const Schema = mongoose.Schema;

let ArticleSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    link: {
        type: String,
        required: true
    },
    summary: {
        type: String,
        required: true
    },
    date: {
        type: String,
        required: true
    },
    image: String,
    comments: [{
        type: Schema.Types.ObjectId,
        ref: 'Comment'
    }]
});

let Article = mongoose.model('Article', ArticleSchema);

module.exports = Article;
