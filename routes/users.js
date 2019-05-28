var express = require("express");
var router = express.Router();
var passport = require("passport");
var User = require("../models/user");
var Campground = require("../models/campground");
var async = require("async");
var nodemailer = require("nodemailer");
var crypto = require("crypto");

//====================================
// USER/AUTH ROUTES
//====================================

// This route shows the register form to create a user into the DB
router.get("/register", function(req, res){
	res.render("users/register", {page: "register"});
});

// This route handles the sign up logics, register a user into the database
router.post("/register", function(req, res){
	var newUser = new User({
		username: req.body.username,
		avatar: req.body.avatar,
		firstName: req.body.firstName,
		lastName: req.body.lastName,
		email: req.body.email

	});
	if(req.body.admin == "secretadmin123") {
		newUser.isAdmin = true;
	}
	User.register(newUser, req.body.password, function(err, user){
		if(err){
			console.log(err);
			req.flash("error", err.message);
			return res.redirect("/register");
		}
		passport.authenticate("local")(req, res, function(){
			req.flash("success", "You have successfully signed up! " + user.username);
			res.redirect("/campgrounds");
		});
	});
});

// This route shows the log in form for user to login
router.get("/login", function(req, res){
	res.render("users/login", {message: req.flash("error"), page: "login"});
});

// This route handles the log in logics to log the user in to the app
router.post("/login", passport.authenticate("local", 
	{
		successRedirect: "/campgrounds",
		failureRedirect: "/login",
		failureFlash: true,
		successFlash: "You have successfully logged in!"
	}), function(req, res){
});

// This route handles the log out logics to log the user out from the app.
router.get("/logout", function(req, res){
	req.logout();
	req.flash("success", "You have successfully logged out!");
	res.redirect("/campgrounds");
});

//=====================================
// PASSWORD RESET
//=====================================

// This route shows the forgot form for password reset
router.get("/forgot", function(req, res){
	res.render("users/forgot");
});

// This route creates the token and the email, and sends the email to the user's email
router.post("/forgot", function(req, res, next){
	// using async waterfall to create the logics to avoid using too many callbacks
	async.waterfall([
		function(done){
			crypto.randomBytes(20, function(err, buf){
				var token = buf.toString("hex");
				done(err, token);
			});
		},
		function(token, done){
			// find the user in the database with the provided email
			User.findOne({ email: req.body.email}, function(err, user){
				if(!user){
					req.flash("error", "No account with that email address exists.");
					return res.redirect("/forgot");
				}

				// setting the token for the particular user
				user.resetPasswordToken = token;
				user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

				// saving the user with the unique token
				user.save(function(err){
					done(err, token, user);
				});
			});
		},
		// function to set up nodemailer with an email to send out
		function(token, user, done){
			// set up mailer email service
			var smtpTransport = nodemailer.createTransport({
				service: "Gmail",
				auth: {
					user: "webbercoder@gmail.com",
					pass: process.env.GMAILPW
				}
			});
			// set up email to send out to user's email
			var mailOptions = {
				to: user.email,
				from: "webbercoder@gmail.com",
				subject: "Node.js Password Reset",
				text: "You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n" + 
					  "Please click on the following link, or paste this into your browser to complete the process:\n\n" + 
					  "http://" + req.headers.host + "/reset/" + token + "\n\n" +
					  "If you did not request this, please ignore this email and your password will remain unchanged.\n"
			};
			// sending out the email to the user's email address
			smtpTransport.sendMail(mailOptions, function(err){
				console.log("mail sent");
				req.flash("success", "An email has been sent to " + user.email + " with further instructions.");
				done(err, "done");
			});
		}
	], function(err){
		if(err) return next(err);
		res.redirect("/forgot");
	});
});

// This route takes the user to the password reset form
router.get("/reset/:token", function(req, res){
	// find the user with the provided token from the link that was sent in the email
	User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now()}}, function(err, user){
		if(!user){
			req.flash("error", "Password reset token is invalid or has expired.");
			return res.redirect("/forgot");
		}
		res.render("users/reset", {token: req.params.token});
	});
});

// This route resets and creates a new password for the user in the database
router.post("/reset/:token", function(req, res){
	async.waterfall([
		function(done){
			// find the user with the provided token from the link that was sent in the email
			User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now()}}, function(err, user){
				if(!user){
					req.flash("error", "Password reset token is invalid or has expired.");
					return res.redirect("back");
				}
				// confirming and resetting the password for the user
				if(req.body.password === req.body.confirm){
					user.setPassword(req.body.password, function(err){
						// resetting the token and making it undefined
						user.resetPasswordToken = undefined;
						user.resetPasswordExpires = undefined;

						// save the user with the new password
						user.save(function(err){
							// loggin in the user into the app after saving the user
							req.login(user, function(err){
								done(err, user);
							});
						});
					});
				} else {
					req.flash("error", "Passwords do not match.");
					return res.redirect("back");
				}
			});
		},
		// function to create the confirmation email and send it out to the user
		function(user, done){
			// creating mailer's email service with nodemailer
			var smtpTransport = nodemailer.createTransport({
				service: "Gmail",
				auth: {
					user: "webbercoder@gmail.com",
					pass: process.env.GMAILPW
				}
			});
			// setting up the email to send out
			var mailOptions = {
				to: user.email,
				from: "webbercoder@gmail.com",
				subject: "Your password has been changed",
				text: "Hello, \n\n" + 
					  "This is a confirmation that the password for your account " + user.email + " has just been changed.\n"
			};
			// sending out the email to the user
			smtpTransport.sendMail(mailOptions, function(err){
				if(err){
					console.log(err);
				} else {
					req.flash("success", "Success! Your password has been changed successfully.");
					done(err);
				}
			});
		}
	], function(err){
		if(err){
			console.log(err);
			res.redirect("back");
		} else {
			res.redirect("/campgrounds");
		}
	});
});

//======================================
// USER PROFILE
//======================================

// This route shows the user profile page for the particular user
router.get("/users/:id", function(req, res){
	// find the user by its id
	User.findById(req.params.id, function(err, foundUser){
		if(err || !foundUser){
			req.flash("error", "User not found!");
			res.redirect("/campgrounds");
		} else {
			Campground.find().where("author.id").equals(foundUser._id).exec(function(err, campgrounds){
				if(err){
					req.flash("error", "User not found!");
					res.redirect("/campgrounds");
				} else {
					res.render("users/profile", {user: foundUser, campgrounds: campgrounds});
				}
			});
		}
	});
});


module.exports = router;
