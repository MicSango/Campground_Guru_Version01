var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var flash = require("connect-flash");
var passport = require("passport");
var localStrategy = require("passport-local");
var methodOverride = require("method-override");

// requiring the dotenv file for local environment avariable
require("dotenv").config();

// requiring the mongoose models
var Campground = require("./models/campground");
var Comment = require("./models/comment");
var User = require("./models/user");

// requiring the routes files
var campgroundRoutes 	= require("./routes/campgrounds");
	reviewRoutes 		= require("./routes/reviews");
	commentRoutes		= require("./routes/comments");
	userRoutes			= require("./routes/users");

// Connect to a database in mongoose. Mongoose will create a new DB if the specified DB is not existed yet.
mongoose.connect("mongodb://localhost:27017/campground_guru_v01", {useNewUrlParser: true});
mongoose.set("useFindAndModify", false); // This removes the deprecation warning in the console.
mongoose.set("useCreateIndex", true); // This removes the deprecation warning in the console.
app.use(bodyParser.urlencoded({extended: true})); // This a line of codes that always need to use body-parser
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public")); // Always need to set this line of codes before any custom CSS file can be used.
app.use(methodOverride("_method")); // make method-override available to use
app.use(flash());

app.locals.moment = require("moment"); // now moment is available for use in all view files

//=================================
// POSSPORT CONFIGURATION
//=================================
app.use(require("express-session")({ // configuring express-session and make it available to use
	secret: "Kuv hlub koj ib leeg",
	resave: false,
	saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Making currentUser and connect-flash available to all templates
app.use(function(req, res, next){
	res.locals.currentUser = req.user;
	res.locals.error = req.flash("error");
	res.locals.success = req.flash("success");
	next();
});

// Using the routes and making them available to other routes
app.use(campgroundRoutes);
app.use(commentRoutes);
app.use(userRoutes);
app.use(reviewRoutes);

//=================================
// END OF POSSPORT CONFIGURATION
//=================================


// var port = process.env.PORT || 3000; we can set the variable for the port or just use the codes as below.
app.listen(3000 || process.env.PORT, process.env.IP, function(){
	console.log("Campground Guru server is running!");
});


















