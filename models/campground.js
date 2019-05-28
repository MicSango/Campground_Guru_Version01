var mongoose = require("mongoose");
var Comment = require("./comment");
var Review = require("./review");

var campgroundSchema = new mongoose.Schema({
	name: String,
	image: String,
	imageId: String,
	description: String,
	price: Number,
	createdAt: { type: Date, default: Date.now },
	author: {
		id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User"
		},
		username: String,
		avatar: String
	},
	comments: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Comment"
		}
	],
	reviews: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Review"
		}
	],
	rating: {
		type: Number,
		default: 0
	}
});

var Campground = mongoose.model("Campground", campgroundSchema);

module.exports = Campground;



