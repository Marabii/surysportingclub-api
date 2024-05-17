require('dotenv').config()
const { MongoClient } = require("mongodb");

const connectDB = async () => {
// Replace the following with your Atlas connection string                                                                                                                                        
const url = process.env.DB_STRING

// Connect to your Atlas cluster
const client = new MongoClient(url);
    try {
        await client.connect();
        console.log("Successfully connected to Atlas");

    } catch (err) {
        console.log(err.stack);
    }
    finally {
        await client.close();
    }


}

module.exports = {connectDB}

