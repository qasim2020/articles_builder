const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BlogSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    average_revenue: {
        type: Number,
        required: true
    },
    average_cost_to_start: {
        type: Number,
        required: true
    },
    blog_content: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Blog', BlogSchema);
