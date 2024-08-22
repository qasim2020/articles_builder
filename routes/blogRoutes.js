const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');

// Route to get 31 blog ideas
router.get('/', async (req, res) => {
    try {
        const blogs = await Blog.find().limit(31);
        res.json(blogs);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
