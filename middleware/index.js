var Campground = require("../models/campground");
var Comment = require("../models/comment");
var Review = require("../models/review");

// Create an empty middleware object
var middlewareObject = {};

// Middleware to check to see if user is logged in
middlewareObject.isLoggedIn = function(req, res, next){
	// check to see if user is logged in
	if(req.isAuthenticated()){
		return next();
	} else {
		req.flash("error", "You need to be logged in to do that!");
		res.redirect("/login");
	}
};

// Middleware to check user's ownership on the campground
middlewareObject.checkCampgroundOwnership = function(req, res, next){
	// check to see if user is logged in
	if(req.isAuthenticated()){
		// look for the particular campground by id
		Campground.findById(req.params.id, function(err, foundCampground){
			if(err || !foundCampground){
				console.log(err);
				req.flash("error", "Campground not found!");
				res.redirect("back");
			} else {
				// check to see if logged in user owns the campground
				if(foundCampground.author.id.equals(req.user._id) || req.user.isAdmin){
					next();
				} else {
					req.flash("error", "You don't have the permission to do that");
					res.redirect("back");
				}
			}
		});
	} else {
		req.flash("error", "You need to be logged in to do that!");
		res.redirect("/login");
	}
};

// Middleware to check user's ownership on the comment
middlewareObject.checkCommentOwnership = function(req, res, next){
	// check to see if user is logged in
	if(req.isAuthenticated()){
		// look for the particular comment by id
		Comment.findById(req.params.comment_id, function(err, foundComment){
			if(err || !foundComment){
				console.log(err);
				req.flash("error", "Comment not found!");
				res.redirect("back");
			} else {
				// check to see if logged in user owns the comment
				if(foundComment.author.id.equals(req.user._id) || req.user.isAdmin){
					return next();
				} else {
					req.flash("error", "You don't have the permission to do that");
					res.redirect("back");
				}
			}
		});
	} else {
		req.flash("error", "You need to be logged in to do that!");
		res.redirect("/login");
	}
};

// Middleware to check to see if the current user owns the review
middlewareObject.checkReviewOwnership = function(req, res, next){
	if(req.isAuthenticated()){
		// find the review by its id
		Review.findById(req.params.review_id, function(err, foundReview){
			if(err || !foundReview){
				req.flash("error", "Review not found!");
				res.redirect("back");
			} else {
				// does current user own the review?
				if(foundReview.author.id.equals(req.user._id)){
					next();
				} else {
					req.flash("error", "You don't have the permission to do that.");
					res.redirect("back");
				}
			}
		});
	} else {
		req.flash("error", "You need to be logged in to do that");
        res.redirect("back");
	}
};

// Middleware to check to see if the user already reviewed the campground
middlewareObject.checkReviewExistence = function(req, res, next){
	if(req.isAuthenticated()){ // if the user is logged in
		// find the particular campground and populate the reviews
		Campground.findById(req.params.id).populate("reviews").exec(function(err, foundCampground){
			if(err || !foundCampground){
				req.flash("error", "Campground not found.");
				res.redirect("back");
			} else {
				// check if req.user._id exists in the foundCampground.reviews
				var foundUserReview = foundCampground.reviews.some(function(review){
					return review.author.id.equals(req.user._id);
				});
				if(foundUserReview){ // if the current user already reviewed the campground
					req.flash("error", "You already wrote a review.");
					return res.redirect("/campgrounds/" + foundCampground._id);
				}
				// if no reviews found for the current user, go to the next code
				next();
			}
		});
	} else {
		req.flash("error", "You need to log in to do that.");
		res.redirect("/login");
	}
};

module.exports = middlewareObject;






