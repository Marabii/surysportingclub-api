const connection = require('../config/news');
const News = connection.models.News;
const express = require('express');
const { isAdmin } = require('./authMiddleware');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');


const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/gif') {
        cb(null, true);
    } else {
        cb(new Error('Not an image! Please upload only images.'), false);
    }
};

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../assets/news/news-photos'));
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Appending extension
    }
});

const upload = multer({ storage: storage, fileFilter : fileFilter });


router.get('/api/get-news', (req, res) => {
    News.find({})
        .then(data => {
            res.json(data);
        })
        .catch(err => {
            // Log the error for server-side debugging
            console.error('Error fetching news:', err);
            // Send a 500 Internal Server Error response
            res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération des nouvelles' });
        });
});

router.post('/api/addNews', isAdmin, upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No image uploaded. Please upload an image file.');
    } else {
        const { title, description } = req.body;
        const imageName = req.file.filename;

        // Create a new news item using the News model
        try {
            const newNews = new News({
                title: title,
                description: description,
                imageName: imageName
            });

            // Save the new news item to the database
            await newNews.save();

            res.send('News added successfully');
        } catch (error) {
            console.error('Error saving news:', error);
            res.status(500).send('Error adding news to the database');
        }
    }
});

router.delete('/api/delete-news', isAdmin, async (req, res) => {
    const { title } = req.body;

    try {
        // Find the news item to get the image name before deleting
        const newsItem = await News.findOneAndDelete({ title: title });
        if (!newsItem) {
            return res.status(404).send('News item not found');
        }

        // Attempt to delete the image file associated with the news item
        const imagePath = path.join(__dirname, '../assets/news/news-photos', newsItem.imageName);
        fs.unlink(imagePath, err => {
            if (err) {
                // Log the error but still send a successful response because the news item was removed
                console.error(`Failed to delete image ${newsItem.imageName}: ${err}`);
            }
            res.send({ message: 'News item and corresponding image deleted successfully' });
        });
    } catch (error) {
        console.error('Error deleting news:', error);
        res.status(500).send('Error deleting news from the database');
    }
});

module.exports = router;
