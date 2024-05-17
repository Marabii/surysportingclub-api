const mongoose = require('mongoose');

require('dotenv').config();

/**
 * -------------- DATABASE ----------------
 */

/**
 * Connect to MongoDB Server using the connection string in the `.env` file.  To implement this, place the following
 * string into the `.env` file
 * 
 * DB_STRING=mongodb://<user>:<password>@localhost:27017/database_name
 */ 

const conn = process.env.DB_STRING;

const connection = mongoose.createConnection(conn, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Creates simple schema for a User.  The hash and salt are derived from the user's given password when they register
const TeamsSchema = new mongoose.Schema({
    name : String,
    gender : String,
    roles : [Object],
    effectif : String,
    nombreEquipes : String,
    anneeNaissance : String,
    seances : String,
    matches : String,
    motDesCoaches : String,
}, {collection : 'teams'});


const Team = connection.model('Team', TeamsSchema);

// Expose the connection
module.exports = connection;
