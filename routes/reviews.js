var express = require("express");
var router = express.Router({mergeParams: true});
var Campground = require("../models/campground");
var Review = require("../models/review");
var middleware = require("../middleware");

// This route shows the reviews index to show all the reviews for a particular campground
router.get("/campgrounds/:id/reviews", function(req, res){
	Campground.findById(req.params.id).populate({
		path: "reviews",
		options: {sort: {createdAt: -1}} // sorting the populated reviews array to show the latest first
	}).exec(function(err, campground){
		if(err || !campground){
			req.flash("error", err.message);
			return res.redirect("back");
		}
		res.render("reviews/reviews", {campground: campground});
	});
});

// This route shows the form to create a new review
router.get("/campgrounds/:id/reviews/new", middleware.isLoggedIn, middleware.checkReviewExistence, function(req, res){
	// middleware.checkReviewExistence checks if a user already reviewed the campground, only one review per user is allowed
	Campground.findById(req.params.id, function(err, campground){
		if(err || !campground){
			req.flash("error", err.message);
			return res.redirect("back");
		}
		res.render("reviews/new", {campground: campground});
	});
});

// This route creates and posts a new review with the particular into the database
router.post("/campgrounds/:id/reviews", middleware.isLoggedIn, middleware.checkReviewExistence, function(req, res){
	// find the campground by its id
	Campground.findById(req.params.id).populate("reviews").exec(function(err, campground){
		if(err || !campground){
			req.flash("error", err.message);
			return res.redirect("back");
		}
		// creating the new review for the campground
		Review.create(req.body.review, function(err, review){
			if(err){
				req.flash("error", err.message);
				return res.redirect("back");
			}
			// add the author's username and id associated with the campground to the review
			review.author.id = req.user._id;
			review.author.username = req.user.username;
			review.author.avatar = req.user.avatar;
			review.campground = campground;
			// save the review
			review.save();
			// push the new review into the campground's reviews array
			campground.reviews.push(review);
			// calculate the new average review for the campground
			campground.rating = calculateAverage(campground.reviews);
			// save the campground
			campground.save();
			req.flash("success", "Your review has been successfully added.");
			res.redirect("/campgrounds/" + campground._id);
		});
	});
});

// This route shows the edit form to edit the review
router.get("/campgrounds/:id/reviews/:review_id/edit", middleware.checkReviewOwnership, function(req, res){
	// find the review by its id
	Review.findById(req.params.review_id, function(err, foundReview){
		if(err){
			req.flash("error", err.message);
            return res.redirect("back");
		}
		res.render("reviews/edit", {campground_id: req.params.id, review: foundReview});
	});
});

// This route updates the infomation on the review and put it in the DB
router.put("/campgrounds/:id/reviews/:review_id", middleware.checkReviewOwnership, function(req, res){
	// find the correct review and update its info
	Review.findByIdAndUpdate(req.params.review_id, req.body.review, {new: true}, function(err, updatedReview){
		if(err){
			req.flash("error", err.message);
            return res.redirect("back");
		}
		// find the correct campground and populate the reviews under it
		Campground.findById(req.params.id).populate("reviews").exec(function(err, campground){
			if(err){
				req.flash("error", err.message);
            	return res.redirect("back");
			}
			// recalculate campground average rating
			campground.rating = calculateAverage(campground.reviews);
			// save changes to the campground
			campground.save();
			req.flash("success", "Your review was successfully updated.");
			res.redirect("/campgrounds/" + campground._id);
		});
	});
});

// This route deletes the selected review
router.delete("/campgrounds/:id/reviews/:review_id", middleware.checkReviewOwnership, function(req, res){
	Review.findByIdAndRemove(req.params.review_id, function(err){
		if(err){
			req.flash("error", err.message);
            return res.redirect("back");
		}
		// find the correct campground to update its info after the review is removed
		Campground.findByIdAndUpdate(req.params.id, {$pull: {reviews: req.params.review_id}}, {new: true}).populate("reviews").exec(function(err, campground){
			if(err){
				req.flash("error", err.message);
            	return res.redirect("back");
			}
			// recalculate campground average rating
			campground.rating = calculateAverage(campground.reviews);
			// save changes
			campground.save();
			req.flash("success", "Your review was successfully deleted.");
			res.redirect("/campgrounds/" + req.params.id);
		});
	});
});


function calculateAverage(reviews){
	if(reviews.length === 0){
		return 0;
	}
	var sum = 0;
	reviews.forEach(function(element){
		sum += element.rating;
	});
	return sum / reviews.length;
}

module.exports = router;






