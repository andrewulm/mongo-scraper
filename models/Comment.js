const mongoose = require('mongoose');

let Schema = mongoose.Schema;

let CommentSchema = new Schema({
    body: {
        type: String,
        required: true
    },
    author: {
        type: String,
        required: true
    }
});

let Comment = mongoose.model('Comment', CommentSchema);

module.exports = Comment;
