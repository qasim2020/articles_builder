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

// Function to check if OpenAI API is working
const checkOpenAIAPI = async () => {
    console.log(process.env.OPENAI_API_KEY);
    try {
        const response = await axios.post('https://api.openai.com/v1/completions', {
            model: 'text-davinci-003',
            prompt: 'This is a test to see if the OpenAI API is working.',
            max_tokens: 5,
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            }
        });

        if (response.data.choices && response.data.choices.length > 0) {
            console.log('OpenAI API is working.');
            return true;
        } else {
            console.error('Unexpected response from OpenAI API.');
            return false;
        }
    } catch (error) {
        console.log(error);
        console.error('Failed to connect to OpenAI API:', error.message);
        return false;
    }
};

// Function to determine the most similar category
const selectCategory = async (name) => {
    const prompt = `Given the name "${name}", determine whether it is most likely associated with a "doctor", "dentist", or "accountant". Respond with only one of these three words.`;

    const response = await axios.post('https://api.openai.com/v1/completions', {
        model: 'text-davinci-003',
        prompt,
        max_tokens: 10,
    }, {
        headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    const category = response.data.choices[0].text.trim().toLowerCase();
    if (['doctor', 'dentist', 'accountant'].includes(category)) {
        return category;
    } else {
        throw new Error(`Unexpected category received: ${category}`);
    }
};

// Function to generate a blog post based on the category
const generateBlogPost = async (category) => {
    const prompt = `Write a professional blog post in 2-3 paragraphs about a ${category}, highlighting their importance in the industry and any challenges they face.`;

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

// Load and parse CSV, then call OpenAI API and save data to MongoDB
const loadCSVAndGenerateBlogs = async () => {
    const results = [];

    fs.createReadStream('data.csv')
        .pipe(csvParser())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            for (const row of results) {
                try {

                    // Step 1: Determine the most similar category
                    console.log("-------");
                    console.log(row.name);
                    console.log("-------");
                    const category = await selectCategory(row.name);
                    
                    // Step 2: Generate a blog post based on the selected category
                    const blogContent = await generateBlogPost(category);
                    
                    // Step 3: Save the result in MongoDB
                    const newBlog = new Blog({
                        name: row.name,
                        average_revenue: row.average_revenue,
                        average_cost_to_start: row.average_cost_to_start,
                        blog_content: blogContent
                    });

                    await newBlog.save();
                } catch (error) {
                    console.error(`Error processing row: ${row.name}`, error.response.statusText);
                }
            }
            console.log('All data processed and saved to MongoDB');
        });
};

// Start the process
const startProcess = async () => {
    const isAPIWorking = await checkOpenAIAPI();
    if (!isAPIWorking) {
        console.error('OpenAI API is not working. Exiting...');
        process.exit(1);
    }
    
    // If API is working, proceed with the main functionality
    await loadCSVAndGenerateBlogs();
};

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startProcess(); // Initiate the process after the server starts
});
