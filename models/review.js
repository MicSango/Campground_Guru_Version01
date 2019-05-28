var mongoose = require("mongoose");

var reviewSchema = new mongoose.Schema({
	rating: {
		// setting the field type for the rating
		type: Number,
		// making the star rating required
		required: "Please provide a rating (1-5 stars).",
		// defining min and max values
		min: 1,
		max: 5,
		// adding validation to see if the entry is an integer
		validate: {
			// validator accepts a function definition which is uses for validation
			validator: Number.isInteger,
			message: "{VALUE} is not an integer value."
		}
	},
	// review text to voice the opinion
	text: {
		type: String
	},
	// author id and username fields
	author: {
		id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User"
		},
		username: String,
		avatar: String
	},
	// campground associated with the review
	campground: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Campground"
	}
}, {
	// if timestamps are set to true, mongoose assigns createdAt and updatedAt fields to your schema.
	// the type assigned is Date.
	timestamps: true
});

module.exports = mongoose.model("Review", reviewSchema);









