var express = require("express");
var router = express.Router();
var Campground = require("../models/campground");
var middlewareObject = require("../middleware/");
var Review = require("../models/review");
var Comment = require("../models/comment");

// multer and cloudinary configuration so the app can upload image to cloudinary
var multer = require("multer");
var storage = multer.diskStorage({
	filename: function(req, file, callback){
		callback(null, Date.now() + file.originalname);
	}
});
var imageFilter = function(req, file, callback){
	// accept image files only
	if(!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)){
		return callback(new Error("Only image files are allowed!"), false);
	}
	callback(null, true);
};
var upload = multer({storage: storage, fileFilter: imageFilter});

// Cloudinary configuration
var cloudinary = require("cloudinary");
cloudinary.config({
	cloud_name: "webbercoder",
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET
});

//======================================
// CAMPGROUND ROUTES
//======================================

// This route shows the home page of the app
router.get("", function(req, res){
	res.render("home");
});

// This route shows the index of the campground page to show all the campgrounds from the DB
router.get("/campgrounds", function(req, res){
	// checking the search query from the search box
	if(req.query.search === ""){
		req.flash("error", "Please enter a search value.");
		res.redirect("back");
	}
	else if(req.query.search){ // if there is a search value from the search box
		// set a new regular expression variable
		const regex = new RegExp(escapeRegex(req.query.search), "gi");
		// get all campgrounds from the database that match the search query
		Campground.find({name: regex}, function(err, allCampgrounds){
			if(err || !allCampgrounds){
				req.flash("error", "Campground not found, please try again.");
				res.redirect("back");
			} else {
				// check to see if there is any campground data match the search value
				if(allCampgrounds.length < 1){
					// if no data matches the search value
					req.flash("error", "No campgrounds match that search, please try again.");
					return res.redirect("back");
				}
				// if there is campground data matches the search value
				res.render("campgrounds/campgrounds", {campgrounds: allCampgrounds, page: "campgrounds"});
			}
		});
	} else { // When no search attempts and only click on View All Campgrounds button
		// Get all the campgrounds from the database
		Campground.find({}, function(err, allCampgrounds){
			if(err){
				console.log(err);
			} else {
				res.render("campgrounds/campgrounds", {campgrounds: allCampgrounds, page: "campgrounds"});
			}
		});
	}
});

// This route shows the form to create a new campground
router.get("/campgrounds/new", middlewareObject.isLoggedIn, function(req, res){
	res.render("campgrounds/new");
});

// This route create a new campground into the campground database
router.post("/campgrounds", middlewareObject.isLoggedIn, upload.single("image"), function(req, res){
	cloudinary.v2.uploader.upload(req.file.path, function(err, result){
		if(err){
			req.flash("error", err.message);
			return res.redirect("back");
		}
		// add cloudinary url for the image to the campground object under image property
		req.body.campground.image = result.secure_url;
		// add image's public_id to campground object
		req.body.campground.imageId = result.public_id;
		// associating the author to the campground by getting the current user id and username
		req.body.campground.author = { 
			id: req.user._id,
			username: req.user.username,
			avatar: req.user.avatar
		};
		// creating the campground with the other properties of the campground
		Campground.create(req.body.campground, function(err, newlyCreated){
			if(err){
				req.flash("error", err.message);
				res.redirect("back");
			} else {
				req.flash("success", "Campground successfully created!");
				res.redirect("/campgrounds/" + newlyCreated.id);
			}
		});
	});
});

// This route shows more info about a particular campground
router.get("/campgrounds/:id", function(req, res){
	// Find the particular campground by its ID and populate it's comments under it
	Campground.findById(req.params.id).populate("comments").populate({
		path: "reviews",
		options: {sort: {createdAt: -1}}
	}).exec(function(err, foundCampground){
		if(err || !foundCampground){
			req.flash("error", "Campground not found!");
			res.redirect("back");
		} else {
			// render the show template with that campground
			res.render("campgrounds/show", {campground: foundCampground});
		}
	});
});

// This route shows the form to edit the campground with the current info of the campground
router.get("/campgrounds/:id/edit", middlewareObject.checkCampgroundOwnership, function(req, res){
	// find the particular campground by its id to edit
	Campground.findById(req.params.id, function(err, foundCampground){
		if(err){
			console.log(err);
		} else {
			res.render("campgrounds/edit", {campground: foundCampground});
		}
	});
});

// This route handles the campground edit logics and update the campground info
router.put("/campgrounds/:id", middlewareObject.checkCampgroundOwnership, upload.single("image"), function(req, res){
	delete req.body.campground.rating;
	// find and update the correct campground
	Campground.findById(req.params.id, async function(err, campground){
		if(err){
			req.flash("error", err.message);
			res.redirect("back");
		} else {
			if(req.file){
				try {
					await cloudinary.v2.uploader.destroy(campground.imageId);
					var result = await cloudinary.v2.uploader.upload(req.file.path);
					campground.imageId = result.public_id;
					campground.image = result.secure_url;
				} catch(err) {
					req.flash("error", err.message);
					return res.redirect("back");
				}
			}
			campground.name = req.body.campground.name;
			campground.price = req.body.campground.price;
			campground.description = req.body.campground.description;
			campground.save();
			req.flash("success", "Campground has been successfully updated");
			res.redirect("/campgrounds/" + campground._id);
		}
	});
});

// This route remove the particular campground from the database
router.delete("/campgrounds/:id", middlewareObject.checkCampgroundOwnership, function(req, res){
	// find the correct campground and remove it
	Campground.findById(req.params.id, async function(err, campground){
		if(err){
			req.flash("error", err.message);
			return res.redirect("/campgrounds");
		} 
		try {
			await cloudinary.v2.uploader.destroy(campground.imageId);
			// deletes all comments associated with the campground
			Comment.remove({"_id": {$in: campground.comments}}, function(err){
				if(err){
					console.log(err);
					return res.redirect("/campgrounds");
				}
				// deletes all the reviews associated with the campground
				Review.remove({"_id": {$in: campground.reviews}}, function(err){
					if(err){
						console.log(err);
						return res.redirect("/campgrounds");
					}
					// delete the campground
					campground.remove();
					req.flash("success", "Campground was deleted successfully.");
					res.redirect("/campgrounds");
				});
			});
		} catch(err) {
			if(err){
				req.flash("error", err.message);
				return res.redirect("back");
			}
		}
	});
});

function escapeRegex(text){
	return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

module.exports = router;