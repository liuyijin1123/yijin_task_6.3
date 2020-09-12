// dependencies
const express = require("express");
const bodyParser = require("body-parser");
const https = require("https");
const User = require("./User");
const mongoose = require("mongoose");
const validator = require("validator");
const crypto = require("crypto");
let url = require("url");
let PATH = "https://liuyijin-icrowdtask.herokuapp.com";

const session = require("express-session");

const passport=require("passport");
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const nodemailer = require('nodemailer');
let smtpTransport = require('nodemailer-smtp-transport');
const config = require('./config');

// send the forget email function
smtpTransport = nodemailer.createTransport(smtpTransport({
    service: config.email.service,
    auth: {
        user: config.email.user,
        pass: config.email.pass
    }
}));
const sendMail = function (recipient, subject, html) {
    smtpTransport.sendMail( {
        from: config.email.user,
        to: recipient,
        subject: subject,
        html: html
    }, function (error, response) {
        if (error) {
            console.log(error);
        }
        console.log('The email has been sent.');
    });
};
module.exports = sendMail;

// set router
const app = express();
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));

// set session and cookie
app.use(session( {
    cookie: { maxAge: 30000 }, // 30000ms = 30s
    resave: false,
    saveUninitialized: false,
    secret: '$iCrowdSession'
}));

// set google sign in
passport.use(new GoogleStrategy({
        clientID: "189239692909-sd1p1dkj3jefqt4204jgk5uugba3f324.apps.googleusercontent.com",
        clientSecret: "pMYRB3uiVXUJTraRiiITbXEW",
        callbackURL: "https://liuyijin-icrowdtask.herokuapp.com/auth/google/callback"
        // https://<projectname>.herokuapp.com/auth/google/callback
    },
    function(accessToken, refreshToken, profile, cb) {

    }
));

app.get('/', (req,res)=>{
    // check session
    if (req.session.sign) {
        res.redirect('/homepage');
    } else {
        res.sendFile(__dirname + "/login.html");
    }
});

app.get('/signUp', (req,res)=>{
    res.sendFile(__dirname + "/index.html");
});

app.get('/homepage', (req,res)=>{
    // check session
    if (req.session.sign) {
        res.sendFile(__dirname + "/reqtask.html");
    } else {
        res.redirect('/');
    }
});

app.get('/forget', (req,res)=>{
    res.sendFile(__dirname + "/forget.html");
});

app.get('/reset', (req,res)=>{
    res.sendFile(__dirname + "/reset.html");
});

app.get('/homepage/log_out', (req,res)=>{
    // clear session
    req.session.sign = false;
    // req.logout();
    res.redirect('/');
});

// set google login
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile'] }, function (err) {
        console.log(err);
    }));

// set google callback
app.get('/auth/google/callback',(req,res) => {
    // Successful authentication, redirect home.
    // set a 1d cookie
    req.session.cookie.maxAge = 86400000;
    req.session.sign = true;
    res.redirect('/homepage');
});

mongoose.connect("mongodb+srv://Liu:WXYvQrfJ7Os3kyG7@cluster0.jjc6o.mongodb.net/users?retryWrites=true&w=majority", {useNewUrlParser: true, useUnifiedTopology: true});

app.post('/', (req,res)=>{

    let md5 = crypto.createHash("md5");
    let cryptoPassword = md5.update(req.body.login_password).digest("hex");

    User.findOne({
        email: req.body.login_email,
        password: cryptoPassword
    }, function (err, data) {
        if(err) throw err;
        if(data){
            if (req.body.save_password === 'on') {
                // set a 1d cookie
                req.session.cookie.maxAge = 86400000;
            }
            req.session.sign = true;
            res.redirect('/homepage');
        }else{
            showMessage("Incorrect username or password!\\n Please Try Again!", res);
        }
    } )

});

function showMessage(message,res){
    let result=`<script>alert('${message}');history.back()</script>`;
    res.send(result)
}


app.post('/signUp', (req,res)=>{

    let md5=crypto.createHash("md5");

    const country = req.body.user_country;
    const fname = req.body.first_name;
    const lname = req.body.last_name;
    const email = req.body.user_email;
    const password = req.body.user_password;
    const address = req.body.user_address;
    const city = req.body.user_city;
    const state = req.body.user_state;
    const zip = req.body.user_zip;
    const mobile = req.body.user_mobile;
    const cryptoPassword = md5.update(password).digest("hex");
    const user = new User({
        country: country,
        fname: fname,
        lname: lname,
        email: email,
        password: cryptoPassword,
        address: address,
        city: city,
        state: state,
        zip: zip,
        mobile: mobile
    });
    user
        .save()
        .catch((err) => console.log(err));

    if (res.statusCode === 200)
    {
        res.redirect('/');
    }
    else
    {
        res.sendFile(__dirname + "/fail.html");
    }

});

app.post('/forget',(req,res) => {
    sendMail(req.body.login_email, 'Reset Your Password On iCrowdTask', '<h1>use the link to reset the password</h1> <a href="https://liuyijin-icrowdtask.herokuapp.com/reset">Reset Password Now!</a>');
    res.send("The email has been sent, remember to check the spam mailbox!");
});

app.post('/reset',(req,res) => {

    let password = req.body.login_password;
    let md5 = crypto.createHash("md5");
    let encryptPassword = md5.update(password).digest("hex");
    User.updateOne({"email": req.body.login_email}, {"password": encryptPassword}, function (err, data) {
        if(err) throw err;
        if(data){
            // login
            req.session.sign = true;
            res.redirect('/homepage');
        }else{
            const json = {"error": "fail to reset the password"};
            res.end(JSON.stringify(json));
        }
    });
});

// REST api

// Retrieving workers
app.get('/workers',(req,res) => {
    User.find({
    }, function (err, workers) {
        if(err) throw err;
        if(workers){
            res.end(JSON.stringify(workers));
        }else{
            let json = {"error": "fail to retrieve data"};
            res.end(JSON.stringify(json));
        }
    });
});

// Adding workers
app.post('/workers',(req,res) => {


    let query = url.parse(req.url, true).query;
    let md5=crypto.createHash("md5");

    const country = query.user_country;
    const fname = query.first_name;
    const lname = query.last_name;
    const email = query.user_email;
    const password = query.user_password;
    // const conpassword = req.body.user_conpassword;
    const address = query.user_address;
    const city = query.user_city;
    const state = query.user_state;
    const zip = query.user_zip;
    const mobile = query.user_mobile;
    const cryptoPassword = md5.update(password).digest("hex");
    const user = new User({
        country: country,
        fname: fname,
        lname: lname,
        email: email,
        password: cryptoPassword,
        // conpassword: conpassword,
        address: address,
        city: city,
        state: state,
        zip: zip,
        mobile: mobile
    });
    user
        .save()
        .catch((err) => console.log(err));

    if (res.statusCode === 200)
    {
        let json = {"Success": "Worker has been added"};
        res.end(JSON.stringify(json));
    }
    else
    {
        let json = {"error": "fail to add the worker"};
        res.end(JSON.stringify(json));
    }
});

// Removing workers
app.delete('/workers',(req,res) => {

    User.deleteMany({}, function (err, data) {
        if(err) throw err;
        if(data){
            const json = {"Success": "Workers has been deleted"};
            res.end(JSON.stringify(json));
        }else{
            const json = {"error": "fail to delete workers"};
            res.end(JSON.stringify(json));
        }
    });
});

// Retrieving a specific worker
app.get('/workers/:id',(req,res) => {

    User.findOne({"_id": req.params.id}, function (err, data) {
        if(err) throw err;
        if(data){
            res.end(JSON.stringify(data));
        }else{
            const json = {"error": "fail to retrieve data"};
            res.end(JSON.stringify(json));
        }
    });
});

// Removing a specific worker
app.delete('/workers/:id',(req,res) => {

    User.deleteOne({"_id": req.params.id}, function (err, data) {
        if(err) throw err;
        if(data){
            const json = {"Success": "The Worker has been deleted"};
            res.end(JSON.stringify(json));
        }else{
            const json = {"error": "fail to delete the worker"};
            res.end(JSON.stringify(json));
        }
    });
});

// Updating a specific worker’s
app.patch('/workers/:id',(req,res) => {

    // address and mobile phone
    if ((url.parse(req.url, true).query).user_password == null) {
        User.updateOne({"_id": req.params.id}, {"mobile": (url.parse(req.url, true).query).user_mobile, "address": (url.parse(req.url, true).query).user_address}, function (err, data) {
            if(err) throw err;
            if(data){
                const json = {"Success": "The Worker's address and mobile number has been updated"};
                res.end(JSON.stringify(json));
            }else{
                const json = {"error": "fail to update the info"};
                res.end(JSON.stringify(json));
            }
        });
    } else {
        // password
        let password = (url.parse(req.url, true).query).user_password;
        let md5 = crypto.createHash("md5");
        let encryptPassword = md5.update(password).digest("hex");
        User.updateOne({"_id": req.params.id}, {"password": encryptPassword}, function (err, data) {
            if(err) throw err;
            if(data){
                const json = {"Success": "The Worker's password has been updated"};
                res.end(JSON.stringify(json));
            }else{
                const json = {"error": "fail to update the password"};
                res.end(JSON.stringify(json));
            }
        });

    }

});

app.listen(process.env.PORT || 8080, function () {
    console.log("Server is running successfully!");
});
