const connection = require('../config/teams');
const Team = connection.models.Team;
const express = require('express');
const { isAdmin } = require('./authMiddleware');
const multer = require('multer');
const router = express.Router();
const fs = require('fs');
const path = require('path')

router.get('/api/getTeamsData', (req, res) => {
    Team.find({})
        .then(data => {
            res.json(data);
        })
        .catch(err => {
            // Log the error for server-side debugging
            console.error('Error fetching news:', err);
            // Send a 500 Internal Server Error response
            res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération de data' });
        });
})

router.delete('/api/delete-team', isAdmin, async (req, res) => {
    const { title } = req.body;

    console.log('title', title)

    try {
        // Find and remove the team from the MongoDB
        const team = await Team.findOneAndDelete({ name: title });
        if (!team) {
            return res.status(404).send('Team item not found');
        }

        // Attempt to delete the image file associated with the team
        const imageName = `${team.name.split(' ').join('_').toLowerCase()}.png`;
        const imagePath = path.join(__dirname, '../assets/teamsData/TeamsPhotos', imageName);

        fs.unlink(imagePath, err => {
            if (err) {
                console.error(`Failed to delete image ${imageName}: ${err}`);
                // Consider what response to send if image deletion fails
            }
            res.send({ message: 'Team item and corresponding image deleted successfully' });
        });
    } catch (error) {
        console.error('Error deleting team:', error);
        res.status(500).send('Error deleting team from the database');
    }
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../assets/teamsData/TeamsPhotos'));
    },
    filename: (req, file, cb) => {
        // Retrieve teamName from the request body
        const teamName = req.body.teamName;
        // Format teamName: replace spaces with underscores, convert to lowercase
        const filename = `${teamName.split(' ').join('_').toLowerCase()}.png`;
        cb(null, filename);
    }
});

const uploadForTeams = multer({ storage: storage });

router.post('/api/addTeam', isAdmin, uploadForTeams.single('teamImage'), async (req, res) => {
    try {
        const { teamName, teamGender, roles, effectif, nombreEquipe, birthday, seancesEntrainement, match, motDesCoaches } = req.body;
        
        // Create a new team instance using the Team model
        const newTeam = new Team({
            name: teamName,
            gender: teamGender,
            roles: JSON.parse(roles), // Ensure roles is a proper JSON string
            effectif: effectif,
            nombreEquipes: nombreEquipe,
            anneeNaissance: birthday,
            seances: seancesEntrainement,
            matches: match,
            motDesCoaches: motDesCoaches
        });

        // Save the new team to the database
        await newTeam.save();

        res.status(200).send({ message: 'Team added successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'Failed to add team' });
    }
});



module.exports = router