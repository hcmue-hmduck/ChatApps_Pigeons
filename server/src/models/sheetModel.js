const mongoose = require('mongoose');

const ThongKeSchema = new mongoose.Schema(
	{
		type: String,
	},
	{
		strict: false,
		timestamps: true,
	},
);

const ThongKeModel = mongoose.models.ThongKe || mongoose.model('ThongKe', ThongKeSchema);

module.exports = {
	ThongKeModel,
};
