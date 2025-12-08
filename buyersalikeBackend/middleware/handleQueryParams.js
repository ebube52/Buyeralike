const { Op } = require('sequelize');
const models = require('../models');

const handleQueryParams = async (req, res, next) => {
	const { start, size, filters, globalFilter, sorting } = req.query;

	// Pagination
	const startIndex = parseInt(start) || 0;
	const pageSize = parseInt(size) || 10;

	// Filtering
	let whereClause = {};
	if (filters) {
		const parsedFilters = JSON.parse(filters);
		// Iterate over each filter object
		parsedFilters.forEach(filter => {
			// Dynamically assign properties based on the key
			if (filter.hasOwnProperty('id') && filter.hasOwnProperty('value')) {
				whereClause[filter.id] = filter.value;
			}
		});
	}

	// Adjusting where clause for 'admin' type
	if (req.params.type === 'admin') {
		// Include condition for role containing 'admin'
		whereClause['role'] = {
			[Op.like]: '%admin%',
		};
	} else if (req.params.type === 'user') {
		// Exclude records with role containing 'admin'
		whereClause['role'] = {
			[Op.notLike]: '%admin%',
		};
	}

	// Sorting
	let order = [];
	if (sorting) {
		const parsedSorting = JSON.parse(sorting);
		order = parsedSorting.map(sort => {
			return [sort.id, sort.desc ? 'DESC' : 'ASC']; // Assuming 'desc' indicates descending order
		});
	}	

	// Execute database query
	try {
		const records = await fetchRecords(req.params.type, whereClause, order, startIndex, pageSize);
		req.records = records; // Store records in request object
		next(); // Move to the next middleware/route handler
	} catch (error) {
		next(error); // Pass error to error handling middleware
	}
};

// Function to fetch records from the database
const fetchRecords = async (type, whereClause, order, startIndex, pageSize) => {
	let records;

	if (type === "admin") {
		records = await models.User.findAndCountAll({
			where: whereClause,
			order: order,
			offset: startIndex,
			limit: pageSize,
		});
	} else if (type === "user") {
		records = await models.User.findAndCountAll({
			where: whereClause,
			order: order,
			offset: startIndex,
			limit: pageSize,
		});    
	} else if (type === "service") {
		records = await models.Service.findAndCountAll({
			where: whereClause,
			order: order,
			offset: startIndex,
			limit: pageSize,
		});
	} else if (type === "feedbackComment") {
		records = await models.FeedbackComment.findAndCountAll({
			where: whereClause,
			order: order,
			offset: startIndex,
			limit: pageSize,
		});
	} else if (type === "forumComment") {
		records = await models.ForumComment.findAndCountAll({
			where: whereClause,
			order: order,
			offset: startIndex,
			limit: pageSize,
		});
	} else if (type === "group") {
		records = await models.Group.findAndCountAll({
			where: whereClause,
			order: order,
			offset: startIndex,
			limit: pageSize,
		});
	} else if (type === "groupComment") {
		records = await models.GroupComment.findAndCountAll({
			where: whereClause,
			order: order,
			offset: startIndex,
			limit: pageSize,
		});
	}

	if (!records || records.count === 0) {
		throw new ErrorResponse('Records not found');
	}

	return records;
};

module.exports = handleQueryParams;
