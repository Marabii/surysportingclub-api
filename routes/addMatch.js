const connection = require('../config/matchs');
const Contest = connection.models.Contest;
const express = require('express');
const { isAdmin } = require('./authMiddleware');
const router = express.Router();

router.get('/api/matches', (req, res) => {
    Contest.find({})
        .then(data => {
            res.json(data);
        })
        .catch(err => {
            console.error('Error fetching matches:', err);
            res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération des matchs' });
        });
});

router.post('/api/addMatch', isAdmin, (req, res) => {
    const { time, teams } = req.body;

    // Create a new match instance using the Contest model
    const newMatch = new Contest({
        time: time,
        teams: teams
    });

    // Save the new match to the database
    newMatch.save()
        .then(() => {
            res.status(200).send('Match added successfully');
        })
        .catch(err => {
            console.error('Error saving match:', err);
            res.status(500).send('Failed to add match');
        });
});

router.delete('/api/delete-match', isAdmin, (req, res) => {
    const { match } = req.body;  // Assuming 'match' is the identifier to delete a specific document

    // Log the match value for debugging
    console.log(match);

    // Check if 'match' is provided
    if (!match) {
        return res.status(400).send('No match identifier provided');
    }

    // Delete the document matching the 'match' field
    Contest.deleteOne({ teams: match }) // Adjust the field name 'match' if it differs in your schema
        .then(result => {
            if (result.deletedCount === 0) {
                return res.status(404).send('No match found with the given identifier');
            }
            res.status(200).send('Match deleted successfully');
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Error deleting the match');
        });
});

module.exports = router;
