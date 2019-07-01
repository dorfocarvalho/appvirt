const express = require('express');
const bodyParser = require('body-parser');
const exphbs = require('express-handlebars');
const JSON = require('circular-json');
const exec = require('child_process').exec;
const sleep = require('system-sleep');

const app = express();

var user = "";
var groups = [];
var psgroups = "";

function addgroup(grp, usr){
    exec('powershell -command Add-ADGroupMember -Identity ' + grp + ' -Member ' + usr, function callback(error, stdout, stderr){
        if(stderr) {
            console.log(stderr);
        }
    })
}

function getgroups(usr){
    exec('powershell -command "Get-ADPrincipalGroupMembership -Identity ' + usr + ' | Select-Object -Property Name"', function callback(error, stdout, stderr){
        if(stderr){
            console.log(stderr)
        } else {
            psgroups = stdout
        }
    })
}

// #####################################################
// #################### MIDDLEWARE #####################
// #####################################################

// Node SSPI Middleware
app.use(function (req, res, next) {
        var nodeSSPI = require('node-sspi');
        var nodeSSPIObj = new nodeSSPI({
        retrieveGroups: true
    })
        nodeSSPIObj.authenticate(req, res, function(err){
        res.finished || next();
    })
})
app.use(function(req, res, next) {
    user = req.connection.user;
    console.log(user);
    if (req.connection.userGroups) {
        for (var i in req.connection.userGroups) {
            groups[i] = req.connection.userGroups[i]
        }
    }
    next();
})

// Handlebars middleware
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

// BodyParser Middleware
app.use(bodyParser.urlencoded({ extended: false}));
app.use(bodyParser.json());

// #####################################################
// ###################### ROUTES #######################
// #####################################################

// Root route
app.get("/", function(req, res){
    res.render('index');
});

// New request route
app.get('/request/new', function(req, res){
    refreshgroup();
    var usr = user.split("\\");
    var domain = usr[0];
    res.render('request/new', {
        domain : domain,
        user: user,
        groups: groups
    });
});

app.post('/request/confirm', function(req, res){
    var suser = user.split("\\");
    var group = "APPV_" + req.body.app
    addgroup(group, suser[1]);
    getgroups(suser[1]);
    sleep(10000);
    res.render('request/confirm', {
        user: suser[1],
        domain: suser[0],
        application: req.body.app,
        groups: psgroups
    })
})

// #####################################################
// ##################### LISTENER ######################
// #####################################################

const port = 8080;

app.listen(port, function(){
    console.log("Server started on port " + port);
});