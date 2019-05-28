var express = require("express");
var router = express.Router();
var Campground = require("../models/campground");
var Comment = require("../models/comment");
var middlewareObject = require("../middleware/");

//============================================
// COMMENTS ROUTES
//============================================

// This route shows the form to create a new comment to the campground
router.get("/campgrounds/:id/comments/new", middlewareObject.isLoggedIn, function(req, res){
	Campground.findById(req.params.id, function(err, foundCampground){
		if(err || !foundCampground){
			req.flash("error", "Campground not found!");
			console.log(err);
		} else {
			res.render("comments/new", {campground: foundCampground});
		}
	});
});

// This route create a new comment to the database for the particular campground
router.post("/campgrounds/:id/comments", middlewareObject.isLoggedIn, function(req, res){
	Campground.findById(req.params.id, function(err, foundCampground){
		if(err){
			console.log(err);
			res.redirect("/campgrounds");
		} else {
			Comment.create(req.body.comment, function(err, comment){
				if(err){
					console.log(err);
				} else {
					// add the user id and username to the comment
					comment.author.id = req.user._id;
					comment.author.username = req.user.username;
					comment.author.avatar = req.user.avatar;
					// save the comment with the associated user
					comment.save();
					// add the newly created comment to the particular campground
					foundCampground.comments.push(comment);
					foundCampground.save();
					req.flash("success", "Successfully added comment!");
					res.redirect("/campgrounds/" + foundCampground._id);
				}
			});
		}
	});
});

// This route shows the form to edit the comments on the campground
router.get("/campgrounds/:id/comments/:comment_id/edit", middlewareObject.checkCommentOwnership, function(req, res){
	// look for the particular campground by its id
	Campground.findById(req.params.id, function(err, foundCampground){
		if(err || !foundCampground){
			req.flash("error", "Campground not found!");
			return res.redirect("back");
		}
		// find the comment by its id
		Comment.findById(req.params.comment_id, function(err, foundComment){
			if(err || !foundComment){
				console.log(err);
				req.flash("error", "Comment not found!");
				res.redirect("back");
			} else {
				/* campground_id does not need the dot like campground._id 
				   because we get it directly from the URL above */
				res.render("comments/edit", {campground_id: req.params.id, comment: foundComment});
			}
		});
	});
});

// This route updates the comment info from the comment edit form
router.put("/campgrounds/:id/comments/:comment_id", middlewareObject.checkCommentOwnership, function(req, res){
	// find the comment by its id again to update the info
	Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err, updatedComment){
		if(err){
			console.log(err);
			res.redirect("back");
		} else {
			req.flash("success", "Comment has been successfully updated");
			res.redirect("/campgrounds/" + req.params.id);
		}
	});
});

// This route deletes a selected comment from the database
router.delete("/campgrounds/:id/comments/:comment_id", middlewareObject.checkCommentOwnership, function(req, res){
	// find the correct comment by its id to remove
	Comment.findByIdAndRemove(req.params.comment_id, function(err, deletedComment){
		if(err){
			console.log(err);
			res.redirect("back");
		} else {
			req.flash("success", "Comment has been successfully deleted");
			res.redirect("/campgrounds/" + req.params.id);
		}
	});
});

module.exports = router;