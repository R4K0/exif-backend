var { logsModel: Log, countDistinctIPs, getConnection, countByIP } = require('./db/mongo.js');
var express = require("express");
var bodyparser = require("body-parser");
var requestIP = require("request-ip");
var rateLimit = require("express-rate-limit");
var cors = require('cors')
const path = require('path');

var app = express()

// So it is reachable!
app.use(cors())

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

// I use bodyparser in case I ever want to recieve the parameters in the body, don't need it now, but maybe in the future.
app.use(bodyparser.urlencoded({ extended: true }))
app.use(bodyparser.json())

// Use our own middleware for this, if the connection to the database is not valid, then return status 500 each time, otherwise proceed with the request.
app.use((req, res, next) => {
    var connection = getConnection();
    if (connection === undefined || connection.readyState == 0) {
        res.status(500).send("Database is not running, sorry!")
        return;
    }

    next();
})

// Rate limit the requests - The database will only respond to users actions 35 times in a 5 minute window to prevent spam.
app.use('/statistics/', rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 35
}))

// This middleware tries to extract the users' IP address and it embeds it into the requests .clientIp property
app.use(requestIP.mw())

// Makes sure that we got a workable IP out of this request, if not, then throw 400 status code and let the requester know what went wrong
var ipCheckMiddleware = (req, res, next) => {
    var ip = req.clientIp || req.ip;

    if (!ip) {
        res.status(400).send("The server could not determine your IP address");
        return;
    }

    next()
}

// Get the count of entries belonging to this IP
app.get("/statistics/count", ipCheckMiddleware, async (req, res) => {
    try {
        var count = await countByIP(req.clientIp || req.ip)

        res.status(200).json({
            count: count.length
        });
    } catch (error) {
        res.sendStatus(500)
    }
})

// Get the count of all the unique IPs we have in our database
app.get("/statistics/distinct", ipCheckMiddleware, async (req, res) => {
    try {
        var count = await countDistinctIPs()

        console.log(count);

        res.status(200).json({
            count: count.length
        });
    } catch (error) {
        res.sendStatus(500)
    }
})

// This end-point logs our IP along with the current date (date is a default field, it'll be created automatically)
app.post("/statistics/add", ipCheckMiddleware, async (req, res) => {
    var logEntry = new Log({ ip: req.clientIp })

    try {
        await logEntry.save()
    } catch (error) {
        res.sendStatus(500)
        return;
    }

    res.sendStatus(200)
})

// This will get all the records with the same IP and make them anonymous, so it won't remove the record, but it'll remove the IP field.
app.post("/statistics/anonymize", ipCheckMiddleware, async (req, res) => {
    var logEntry = new Log({ ip: req.clientIp })

    try {
        await logEntry.makeAnonymous()
    } catch (error) {
        res.sendStatus(500)
        return;
    }

    res.sendStatus(200)
})

// This will drop ALL the logs belonging to this IP. The most destructive operation
app.delete("/statistics/delete", ipCheckMiddleware, async (req, res) => {
    var logEntry = new Log({ ip: req.clientIp })

    try {
        await logEntry.deleteLikeMe()
    } catch (error) {
        res.sendStatus(500)
        return;
    }

    res.sendStatus(200)
})

app.use(express.static(path.join(__dirname, '../build')))

app.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'))
})

app.listen(process.env.PORT || 3000, () => {
    console.log("Listening!");
})