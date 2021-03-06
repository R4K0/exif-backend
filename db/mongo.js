var mongoose = require("mongoose");
var config = require("../config/database.json")
const { Schema } = mongoose;

// Connect us to our database. Top-level await functions aren't a thing, so it had to be defined and called this way
var connection;
(async () => {
    try {
        //If we managed to connect, return the connection object to the variable
        connection = await mongoose.connect(process.env.mongo_connecturl ? `` : `mongodb://${process.env.PORT || config.host}:${config.port}/${config.collection}`, { useNewUrlParser: true, useUnifiedTopology: true })

        console.log(`Connected to the database!`);
    } catch (err) {
        // If we didn't log the error
        console.log(err);
        console.log("Connection to DB failed!");
    }
})()


//Define our schema
const logsSchema = new Schema({
    ip: { type: String }, // Not required, because users can anonymise the database
    date: { type: Date, default: Date.now }
});

// Async methods are neat! This method is responsible for setting all of the records ip to nothing, as long as the previous IP matches
logsSchema.methods.makeAnonymous = function () {
    return new Promise((resolve, reject) => {
        mongoose.model("logs").updateMany({ ip: this.ip }, { $unset: { ip: "" } }, {}, (err, res) => {
            if (err) {
                reject(err);
                return;
            }

            resolve(res);
        })
    })
}

// Like above, but instead of unsetting the ip it just straight out deletes the record.
logsSchema.methods.deleteLikeMe = function () {
    return new Promise((resolve, reject) => {
        mongoose.model("logs").deleteMany({ ip: this.ip }, {}, (err, res) => {
            if (err) {
                reject(err);
                return;
            }

            resolve(res);
        })
    })
}

// This counts rows that have distinct IPs and that the IP exists.
// In English: Count all the unique ips that accessed our service
function countDistinctIPs() {
    return new Promise((resolve, reject) => {
        mongoose.model("logs").distinct('ip', { ip: { $exists: true } }, (err, res) => {
            if (err) {
                reject(err);
                return;
            }

            resolve(res);
        })
    })
}

// Simply count all the IPs that match our ip filter.
function countByIP(ip) {
    return new Promise((resolve, reject) => {
        mongoose.model("logs").find({ ip: ip }, (err, res) => {
            if (err) {
                reject(err);
                return;
            }

            resolve(res);
        })
    })
}

//Create a model out of that schema
const logsModel = mongoose.model("logs", logsSchema);

    //The model is how we interact with the database, so export it for other files to be able to use it.
    module.exports = {
        logsModel,
        countDistinctIPs,
        countByIP,
        getConnection: function () { return connection; }
    };