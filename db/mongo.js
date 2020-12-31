var mongoose = require("mongoose");
var config = require("../config/database.json")
const { Schema } = mongoose;

// Connect us to our database.
mongoose.connect(`mongodb://${config.host}:${config.port}/${config.collection}`, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
    console.log("Connected to the database!")
})

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

//Create a model out of that schema
const logsModel = mongoose.model("logs", logsSchema);

//The model is how we interact with the database, so export it for other files to be able to use it.
module.exports = logsModel;