require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const csvParser = require('csv-parser');
const fs = require('fs');
const axios = require('axios');
const Blog = require('./models/Blog');
const blogRoutes = require('./routes/blogRoutes');

const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

// Middleware
app.use(express.json());

// Use routes
app.use('/blogs', blogRoutes);

// Load and parse CSV, then call OpenAI API and save data to MongoDB
const loadCSVAndGenerateBlogs = async () => {
    const results = [];

    fs.createReadStream('data.csv')
        .pipe(csvParser())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            for (const row of results) {
                try {
                    const blogContent = await generateBlogPost(row.name);
                    const newBlog = new Blog({
                        name: row.name,
                        average_revenue: row.average_revenue,
                        average_cost_to_start: row.average_cost_to_start,
                        blog_content: blogContent
                    });

                    await newBlog.save();
                } catch (error) {
                    console.error(`Error processing row: ${row.name}`, error);
                }
            }
            console.log('All data processed and saved to MongoDB');
        });
};

const generateBlogPost = async (name) => {
    let profession = '';

    if (name.toLowerCase().includes('doctor')) {
        profession = 'doctor';
    } else if (name.toLowerCase().includes('dentist')) {
        profession = 'dentist';
    } else if (name.toLowerCase().includes('accountant')) {
        profession = 'accountant';
    }

    const prompt = `Write a professional blog post in 2-3 paragraphs about a ${profession}, highlighting their importance in the industry and any challenges they face.`;

    const response = await axios.post('https://api.openai.com/v1/completions', {
        model: 'text-davinci-003',
        prompt,
        max_tokens: 150
    }, {
        headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    return response.data.choices[0].text.trim();
};

loadCSVAndGenerateBlogs();

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
