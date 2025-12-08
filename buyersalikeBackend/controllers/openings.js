const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const models = require('../models');
const { JSDOM } = require('jsdom');
const { window } = new JSDOM('');
const DOMPurify = require('dompurify')(window);
const { sanitizeText } = require('../utils/textSanitizer'); 
const { createNotification } = require('../utils/notificationService');
require('dotenv').config();
const { CANADIAN_FRANCHISES } = require('../utils/franchiseData');


function parsePrice(price) {
  if (typeof price === 'number') return price;
  if (!price) return 0;
  
  const priceStr = String(price).replace(/[^0-9.]/g, '');
  const parsed = parseFloat(priceStr);
  return isNaN(parsed) ? 0 : parsed;
}

function getPropertyCategory(propertyType, defaultCategoryId) {
    if (!propertyType) return defaultCategoryId;
    const type = propertyType.toLowerCase();
    if (type.includes('vacant land') || type.includes('lot')) {
        return defaultCategoryId; 
    }
    
    return defaultCategoryId;
}

function getProvince(province) {
  const provinces = {
    'ON': 'Ontario',
    'BC': 'British Columbia',
    'AB': 'Alberta',
    'QC': 'Quebec',
    'MB': 'Manitoba',
    'SK': 'Saskatchewan',
    'NS': 'Nova Scotia',
    'NB': 'New Brunswick',
    'NL': 'Newfoundland and Labrador',
    'PE': 'Prince Edward Island',
    'NT': 'Northwest Territories',
    'YT': 'Yukon',
    'NU': 'Nunavut',
  };
  
  return provinces[province?.toUpperCase() || ''] || province || 'Canada';
}

function generateDescription(listing) {
  const parts = [];
  
  if (listing.Building?.BedroomsTotal) {
    parts.push(`${listing.Building.BedroomsTotal} bedroom`);
  }
  if (listing.Building?.BathroomTotal) {
    parts.push(`${listing.Building.BathroomTotal} bathroom`);
  }
  
  parts.push(listing.Property?.Type || 'property');
  
  if (listing.Property?.Address?.AddressText) {
    parts.push(`at ${listing.Property.Address.AddressText}`);
  }
  
  if (listing.Building?.SizeInterior) {
    parts.push(`with ${listing.Building.SizeInterior} of living space`);
  }
  
  if (listing.PublicRemarks) {
    const remarks = listing.PublicRemarks.substring(0, 300).trim();
    parts.push(remarks);
  }
  
  parts.push(`MLS# ${listing.MlsNumber || listing.Id}`);
  
  return parts.join('. ') + '.';
}

const CITY_COORDS = {
  toronto: { latMin: 43.6, latMax: 43.8, longMin: -79.5, longMax: -79.1, name: 'Toronto' },
  vancouver: { latMin: 49.2, latMax: 49.3, longMin: -123.2, longMax: -123.0, name: 'Vancouver' },
  calgary: { latMin: 50.9, latMax: 51.1, longMin: -114.2, longMax: -113.9, name: 'Calgary' },
  montreal: { latMin: 45.4, latMax: 45.6, longMin: -73.7, longMax: -73.5, name: 'Montreal' },
  ottawa: { latMin: 45.3, latMax: 45.5, longMin: -75.8, longMax: -75.6, name: 'Ottawa' },
  edmonton: { latMin: 53.4, latMax: 53.6, longMin: -113.6, longMax: -113.4, name: 'Edmonton' },
  winnipeg: { latMin: 49.8, latMax: 50.0, longMin: -97.3, longMax: -97.0, name: 'Winnipeg' },
  quebec: { latMin: 46.7, latMax: 46.9, longMin: -71.3, longMax: -71.1, name: 'Quebec City' },
  kelowna: { latMin: 49.8, latMax: 50.0, longMin: -119.6, longMax: -119.3, name: 'Kelowna' },
  victoria: { latMin: 48.4, latMax: 48.5, longMin: -123.4, longMax: -123.3, name: 'Victoria' },
  pickering: { latMin: 43.8, latMax: 43.9, longMin: -79.1, longMax: -78.8, name: 'Pickering' },
  ajax: { latMin: 43.8, latMax: 43.9, longMin: -79.1, longMax: -78.9, name: 'Ajax' },
  whitby: { latMin: 43.8, latMax: 44.0, longMin: -78.95, longMax: -78.85, name: 'Whitby' },
  oshawa: { latMin: 43.8, latMax: 44.0, longMin: -78.9, longMax: -78.7, name: 'Oshawa' },
  mississauga: { latMin: 43.5, latMax: 43.7, longMin: -79.7, longMax: -79.5, name: 'Mississauga' },
  brampton: { latMin: 43.6, latMax: 43.8, longMin: -79.8, longMax: -79.6, name: 'Brampton' },
  markham: { latMin: 43.8, latMax: 43.9, longMin: -79.4, longMax: -79.2, name: 'Markham' },
  vaughan: { latMin: 43.8, latMax: 43.9, longMin: -79.6, longMax: -79.4, name: 'Vaughan' },
  hamilton: { latMin: 43.2, latMax: 43.3, longMin: -79.9, longMax: -79.7, name: 'Hamilton' },
  london: { latMin: 42.9, latMax: 43.0, longMin: -81.3, longMax: -81.1, name: 'London' },
  kitchener: { latMin: 43.4, latMax: 43.5, longMin: -80.6, longMax: -80.4, name: 'Kitchener' },
  guelph: { latMin: 43.5, latMax: 43.6, longMin: -80.3, longMax: -80.1, name: 'Guelph' },
};

const REAL_ESTATE_SLUG = 'real-estate'; 
const FRANCHISES_SLUG = 'franchises';


exports.fetchAndCreateOpenings = asyncHandler(async (req, res, next) => {
    const cityParam = req.query.city?.toLowerCase() || 'toronto';
    const limit = parseInt(req.query.limit || '20');
    const cityCoords = CITY_COORDS[cityParam] || CITY_COORDS.toronto;

    const defaultCategoryId = req.body.categoryId ? req.body.categoryId : null; 

    if (!defaultCategoryId) {
        throw new ErrorResponse('Missing required default category ID.', 400);
    }
    
    let selectedCategory;
    let listings = [];
    
    try {
        selectedCategory = await models.OpeningCategory.findByPk(defaultCategoryId);
        
        if (!selectedCategory) {
            throw new ErrorResponse('Invalid opening category ID provided.', 400);
        }
        
        listings = await fetchDataByCategory(selectedCategory.slug, cityCoords, limit);
        
    } catch (err) {
        if (err instanceof ErrorResponse) throw err;
        
        console.error('Category or Data fetching failed:', err);
        throw new ErrorResponse('Failed to execute data retrieval for the selected category.', 500);
    }

    let addedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const listing of listings) {
        try {
            const transformedData = transformListingToOpeningData(listing, selectedCategory, req);

            if (transformedData.skip) {
                skippedCount++;
                continue;
            }

            const existingOpeningByTitle = await models.Opening.findOne({
                where: models.Sequelize.where(
                    models.Sequelize.fn('lower', models.Sequelize.col('title')),
                    transformedData.title.toLowerCase()
                ),
            });

            if (existingOpeningByTitle) { 
                skippedCount++;
                continue;
            }

            const { skip, ...openingData } = transformedData; 
            await models.Opening.create(openingData);
            addedCount++;

        } catch (listingError) {
            console.error(`Error processing listing for ${selectedCategory.name}:`, listingError);
            errorCount++;
        }
    }

    res.status(200).json({ 
        success: true, 
        message: 'Openings fetched and created successfully',
        stats: { 
            added: addedCount, 
            duplicates_skipped: skippedCount,
            total_processed: listings.length,
            errors: errorCount 
        }
    });
});

// @desc    Create Opening
// @route   POST /api/v1/openings
// @access  Protected
exports.createOpening = asyncHandler(async (req, res, next) => {
  let { title, image, description, openingCategoryId, sourceLink, minInvestmentAmount, maxInvestmentAmount } = req.body;

  // Sanitize and validate input
  title = sanitizeText(DOMPurify.sanitize(title));
  description = description ? sanitizeText(DOMPurify.sanitize(description)) : null;
  image = image ? DOMPurify.sanitize(image) : null;
  sourceLink = sourceLink ? DOMPurify.sanitize(sourceLink) : null;
  minInvestmentAmount = minInvestmentAmount ? DOMPurify.sanitize(maxInvestmentAmount) : null;
  maxInvestmentAmount = maxInvestmentAmount ? DOMPurify.sanitize(maxInvestmentAmount) : null;

  // Basic validation for title and description
  if (!title || title.trim() === '') {
    return next(new ErrorResponse('Opening title is required', 400));
  }
  if (!description || description.trim() === '') {
    return next(new ErrorResponse('Opening description is required', 400));
  }
  // Basic validation for investmentAmount
  if (minInvestmentAmount && (isNaN(minInvestmentAmount) || Number(minInvestmentAmount) < 0)) {
    return next(new ErrorResponse('Invalid minimum investment amount provided', 400));
  }

  if (maxInvestmentAmount && (isNaN(maxInvestmentAmount) || Number(maxInvestmentAmount) < 0)) {
    return next(new ErrorResponse('Invalid maximum investment amount provided', 400));
  }

  // Check for duplicate title (case-insensitive)
  const existingOpening = await models.Opening.findOne({
    where: models.Sequelize.where(
      models.Sequelize.fn('lower', models.Sequelize.col('title')),
      title.toLowerCase()
    ),
  });

  if (existingOpening) {
    return next(new ErrorResponse('An opening with this title already exists', 400));
  }

  // Create the opening with the current user as the creator
  const opening = await models.Opening.create({
    title,
    image,
    description,
    sourceLink,
    openingCategoryId,
    minInvestmentAmount,
    maxInvestmentAmount,
    userId: req.user.id, // Assign the creator's ID
    status: 'pending', // New openings are always pending admin approval
  });

  await createNotification(
    req.user.id,
    'opening_created',
    `Submitted a new opening titled "${opening.title}" for review.`,
    'Opening',
    opening.id
  );  

  res.status(201).json({ success: true, data: opening });
});

// @desc    Get All Openings (Approved for non-admins + their own pending/rejected)
// @route   GET /api/v1/openings
// @access  Protected
exports.getOpenings = asyncHandler(async (req, res, next) => {
  let whereCondition = {};
  const isAdmin = req.user.role.includes('admin');

  if (!isAdmin) {
    // Regular users: only see approved openings OR openings they created (regardless of status)
    whereCondition = {
      [models.Sequelize.Op.or]: [
        { status: 'verified' },
        { status: 'unverified' },
        { userId: req.user.id }
      ],
    };
  }
  // Admins see all openings by default, no additional whereCondition needed

  const openings = await models.Opening.findAll({
    where: whereCondition,
    include: [
      {
        model: models.User,
        as: 'creator',
        attributes: ['id', 'firstName', 'lastName', 'email'], // Include creator's basic info
      },
    ],
    order: [['createdAt', 'DESC']], // Order by most recent
  });

  res.status(200).json({
    success: true,
    count: openings.length,
    data: openings
  });
});

// @desc    Get Single Opening
// @route   GET /api/v1/openings/:id
// @access  Protected
exports.getOpening = asyncHandler(async (req, res, next) => {
  const openingId = req.params.id;
  const isAdmin = req.user.role.includes('admin');

  const opening = await models.Opening.findByPk(openingId, {
    include: [
      {
        model: models.User,
        as: 'creator',
        attributes: ['id', 'firstName', 'lastName', 'email'],
      },
    ],
  });

  if (!opening) {
    return next(new ErrorResponse('Opening not found', 404));
  }

  // Non-admin users can only see approved openings or openings they created
  if (!isAdmin && opening.userId !== req.user.id && opening.status !== 'verified' && opening.status !== 'unverified') {
    return next(new ErrorResponse('Not authorized to view this opening', 403));
  }

  res.status(200).json({ success: true, data: opening });
});


// @desc    Get All Openings (Approved only)
// @route   GET /api/v1/all
// @access  Protected (or adjust if you want public access for approved listings)
exports.getOpeningsForEveryone = asyncHandler(async (req, res, next) => {
  const whereCondition = {
    [models.Sequelize.Op.or]: [
      { status: 'verified' },
      { status: 'unverified' }
    ],
  };

  const openings = await models.Opening.findAll({
    where: whereCondition,
    attributes: [
      'id',
      'title',
      'description',
      'image',
      'sourceLink',
      'createdAt', 
      'openingCategoryId', 
      'minInvestmentAmount',
      'maxInvestmentAmount',
    ],
    include: [
      {
        model: models.User,
        as: 'creator', 
        attributes: ['id', 'firstName', 'lastName', 'email'], 
      },
      {
        model: models.Partnership,
        as: 'Partnerships', 
        attributes: ['id'], 
        required: false,
        where: {
          status: {
            [models.Sequelize.Op.in]: ['accepted_into_group', 'pending_group_join']
          }
        }
      },
      {
        model: models.PartnershipGroup,
        as: 'PartnershipGroups', 
        attributes: ['id', 'maxMembers'], 
        required: false,
      },
    ],
    order: [['createdAt', 'DESC']], 
  });

  const formattedOpenings = openings.map(opening => {
    const openingData = opening.toJSON(); 

    const currentPartnersCount = openingData.Partnerships ? openingData.Partnerships.length : 0;
    let maxExpectedPartners = 1;
    if (openingData.PartnershipGroups && openingData.PartnershipGroups.length > 0) {
      maxExpectedPartners = openingData.PartnershipGroups[0].maxMembers || 1;
    }

    return {
      id: openingData.id,
      title: openingData.title,      
      openingCategoryId: openingData.openingCategoryId, 
      description: openingData.description,
      sourceLink: openingData.sourceLink,
      createdAt: openingData.createdAt,
      partners: currentPartnersCount, 
      maxPartners: maxExpectedPartners, 
      image: openingData.image,
      minInvestmentAmount: openingData.minInvestmentAmount,
      maxInvestmentAmount: openingData.maxInvestmentAmount,
      createdAt: openingData.createdAt,
    };
  });

  res.status(200).json({
    success: true,
    count: formattedOpenings.length,
    data: formattedOpenings
  });
});


// @desc    Get Openings created by a particular user
// @route   GET /api/v1/openings/user/:userId
// @access  Protected
exports.getUserOpenings = asyncHandler(async (req, res, next) => {
  const userId = req.params.userId;
  const isSelf = req.user && req.user.id === userId;
  const isAdmin = req.user.role.includes('admin');

  const user = await models.User.findByPk(userId);

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  let whereCondition = { userId: userId };

  // If not admin and not self, only show approved openings for that user
  if (!isAdmin && !isSelf) {
    whereCondition.status = {
      [models.Sequelize.Op.or]: ['verified', 'unverified']
    };    
  }

  const openings = await models.Opening.findAll({
    where: whereCondition,
    include: [
      {
        model: models.User,
        as: 'creator',
        attributes: ['id', 'firstName', 'lastName', 'email'],
      },
    ],
    order: [['createdAt', 'DESC']],
  });

  res.status(200).json({
    success: true,
    count: openings.length,
    data: openings
  });
});


// @desc    Update Opening (Creator can update pending, Admin can update all including status)
// @route   PUT /api/v1/openings/:id
// @access  Protected
exports.updateOpening = asyncHandler(async (req, res, next) => {
  let { title, image, description, sourceLink, openingCategoryId, status, statusMessage, minInvestmentAmount, maxInvestmentAmount, maxMembers } = req.body;

  const opening = await models.Opening.findByPk(req.params.id);
  if (!opening) {
    return next(new ErrorResponse('Opening not found', 404));
  }

  const isAdmin = req.user.role.includes('admin');
  const oldStatus = opening.status; // Store old status for comparison
  const oldTitle = opening.title; // Store old title for comparison  

  // Creator can only update their own opening if it's still pending
  if (opening.userId !== req.user.id && !isAdmin) {
    return next(new ErrorResponse('Not authorized to update this opening', 403));
  }

  if (opening.userId === req.user.id && opening.status !== 'pending' && !isAdmin) {
    return next(new ErrorResponse('Cannot update an opening that is no longer pending review.', 403));
  }

  // Sanitize inputs
  if (title) title = sanitizeText(DOMPurify.sanitize(title));
  if (description) description = sanitizeText(DOMPurify.sanitize(description));
  if (image) image = DOMPurify.sanitize(image);
  if (sourceLink) sourceLink = DOMPurify.sanitize(sourceLink);
  if (statusMessage) statusMessage = sanitizeText(DOMPurify.sanitize(statusMessage));
  if (minInvestmentAmount) minInvestmentAmount = DOMPurify.sanitize(minInvestmentAmount);
  if (maxInvestmentAmount) maxInvestmentAmount = DOMPurify.sanitize(maxInvestmentAmount);

  // Validate investmentAmount
  if (minInvestmentAmount && (isNaN(minInvestmentAmount) || Number(minInvestmentAmount) < 0)) {
    return next(new ErrorResponse('Invalid minimum investment amount provided', 400));
  }

  if (maxInvestmentAmount && (isNaN(maxInvestmentAmount) || Number(maxInvestmentAmount) < 0)) {
    return next(new ErrorResponse('Invalid maximum investment amount provided', 400));
  }


  // Check for title uniqueness only if title is changing
  if (title && title.toLowerCase() !== opening.title.toLowerCase()) {
    const existing = await models.Opening.findOne({
      where: {
        id: { [models.Sequelize.Op.ne]: opening.id }, // exclude current opening
        [models.Sequelize.Op.and]: models.Sequelize.where(
          models.Sequelize.fn('lower', models.Sequelize.col('title')),
          title.toLowerCase()
        ),
      },
    });

    if (existing) {
      return next(new ErrorResponse('Another opening with this title already exists', 400));
    }
  }

  // Update fields
  if (title) opening.title = title;
  if (image) opening.image = image;
  if (description) opening.description = description;
  if (sourceLink) opening.sourceLink = sourceLink;
  if (openingCategoryId) opening.openingCategoryId = openingCategoryId;
  if (minInvestmentAmount) opening.minInvestmentAmount = minInvestmentAmount;
  if (maxInvestmentAmount) opening.maxInvestmentAmount = maxInvestmentAmount;

  let statusChangedToVerifiedOrUnverified = false;

  // Only admin can update status and statusMessage
  if (isAdmin) {
    // if (status) opening.status = status;
    if (status) {
        // Check if status is changing TO 'verified' or 'unverified'
        if (['verified', 'unverified'].includes(status) && !['verified', 'unverified'].includes(oldStatus)) {
            statusChangedToVerifiedOrUnverified = true;
        }
        opening.status = status;
    }    
    if (statusMessage) opening.statusMessage = statusMessage;
  } else if (status || statusMessage) {
    // Prevent non-admin users from attempting to update status or statusMessage
    return next(new ErrorResponse('Not authorized to change opening status or status message', 403));
  }

  await opening.save();

  if (statusChangedToVerifiedOrUnverified) {
      try {
          // Check if a Partnership Intent or Group already exists for this opening creator for this opening
          const existingCreatorPartnership = await models.Partnership.findOne({
              where: {
                  userId: opening.userId,
                  openingId: opening.id,
                  status: {
                      [models.Sequelize.Op.in]: ['interested', 'pending_group_join', 'accepted_into_group']
                  }
              }
          });

          let partnershipIntent;
          let partnershipGroup;

          if (!existingCreatorPartnership) {
              // 1. Create Partnership Group for the creator
              // You might want to get maxMembers from somewhere, or set a default.
              // For simplicity, setting a default name and maxMembers here.
              partnershipGroup = await models.PartnershipGroup.create({
                  openingId: opening.id,
                  creatorId: opening.userId,
                  name: `Group for "${opening.title}"`, // Default name
                  maxMembers: 20, // Example default
                  status: 'forming'
              });

              // 2. Create Partnership Intent (Payment Intent) for the creator and associate with the new group
              partnershipIntent = await models.Partnership.create({
                  userId: opening.userId,
                  openingId: opening.id,
                  status: 'accepted_into_group', // This status indicates active participation
                  partnershipGroupId: partnershipGroup.id,
                  roleInGroup: 'creator' // Assign creator role
              });

              // Notify the opening creator about their group and partnership
              await createNotification(
                  opening.userId,
                  'creator_partnership_established',
                  `Your opening "${opening.title}" has been approved with a ${opening.status} status. A group have been created for you.`,
                  'PartnershipGroup',
                  partnershipGroup.id
              );

          } else {
              // If a partnership already exists for the creator, perhaps update its status if needed
              // Or simply notify that it already exists if no update is required.
              console.log(`Partnership intent already exists for opening creator ${opening.userId} for opening ${opening.id}`);
              // You might want to update its status or associate it with a group if it's not already.
              // For this request, we'll assume it exists in a valid state or handle it as a non-creation event.
              // If you want to ensure it's linked to a group or has 'accepted_into_group' status,
              // you would add update logic here.
              if (!existingCreatorPartnership.partnershipGroupId) {
                  // If no group yet, create one and link it
                  partnershipGroup = await models.PartnershipGroup.create({
                      openingId: opening.id,
                      creatorId: opening.userId,
                      name: `Group for "${opening.title}"`,
                      maxMembers: 20,
                      status: 'forming'
                  });
                  await existingCreatorPartnership.update({
                      partnershipGroupId: partnershipGroup.id,
                      status: 'accepted_into_group',
                      roleInGroup: 'creator'
                  });
                    await createNotification(
                      opening.userId,
                      'creator_partnership_group_linked',
                      `Your opening "${opening.title}" has been ${opening.status}. Your existing partnership intent has been linked to a new group.`,
                      'PartnershipGroup',
                      partnershipGroup.id
                  );
              }
          }
      } catch (error) {
          console.error(`Error creating partnership/group for opening ${opening.id}:`, error);
          // Decide how to handle this error. You might want to:
          // 1. Log it and continue (not block the opening update).
          // 2. Return an error to the client if this operation is critical.
          // For now, it will just log and continue, allowing the opening status update to succeed.
          await createNotification(
              opening.userId,
              'partnership_creation_failed',
              `Failed to automatically create partnership/group for opening "${opening.title}". Please contact support.`,
              'Opening',
              opening.id
          );
      }
  }

  // Determine who to notify and what message to send
  if (isAdmin) {
    // Admin updated the opening
    if (status && status !== oldStatus) {
      // Notify the original creator of status change
      let notificationMessage;
      let notificationType = 'opening_status_update';
      if ((status === 'verified') || (status === 'unverified')) {
        notificationMessage = `Opening "${opening.title}" has been approved!`;
        notificationType = 'opening_approved';
      } else if (status === 'rejected') {
        notificationMessage = `Opening "${opening.title}" has been rejected. Reason: ${opening.statusMessage || 'No reason provided.'}`;
        notificationType = 'opening_rejected';
      } else if (status === 'pending') {
        notificationMessage = `Status of opening "${opening.title}" has been set to pending.`;
        notificationType = 'opening_pending';
      }
      if (notificationMessage && opening.userId) {
        await createNotification(
          opening.userId,
          notificationType,
          notificationMessage,
          'Opening',
          opening.id
        );
      }
    } else if (title !== oldTitle || description || image || sourceLink || openingCategoryId || minInvestmentAmount || maxInvestmentAmount) {
      // Admin made other updates (not status change)
      if (opening.userId) { // Notify creator about general update
        await createNotification(
          opening.userId,
          'opening_updated_by_admin',
          `Opening "${opening.title}" has been updated by an administrator.`,
          'Opening',
          opening.id
        );
      }
    }

    await createNotification(
      req.user.id,
      'admin_opening_updated',
      `Updated the opening "${opening.title}".`,
      'Opening',
      opening.id
    );    
  } else {
    // Creator updated their own pending opening
    await createNotification(
      req.user.id,
      'opening_self_updated',
      `Updated the opening "${opening.title}". It is still pending review.`,
      'Opening',
      opening.id
    );
  }  

  res.status(200).json({ success: true, data: opening });
});

// @desc    Close Opening (Admin only)
// @route   PUT /api/v1/openings/:id/closes
// @access  Admin
exports.closeOpening = asyncHandler(async (req, res, next) => {
  const opening = await models.Opening.findByPk(req.params.id);
  const { statusMessage } = req.body; // Admin can provide a reason for rejection

  if (!opening) {
    return next(new ErrorResponse('Opening not found', 404));
  }

  if (!statusMessage || statusMessage.trim() === '') {
    return next(new ErrorResponse('A rejection message is required when rejecting an opening', 400));
  }

  opening.status = 'closed';
  opening.statusMessage = sanitizeText(DOMPurify.sanitize(statusMessage));
  await opening.save();

  if (opening.userId) {
    await createNotification(
      opening.userId,
      'opening_closed',
      `Opening "${opening.title}" has been closed. Reason: ${opening.statusMessage}`,
      'Opening',
      opening.id
    );
  }  

  await createNotification(
    req.user.id,
    'admin_opening_closed',
    `Closed the opening "${opening.title}".`,
    'Opening',
    opening.id
  );  

  res.status(200).json({ success: true, data: opening });
});

// @desc    Delete Opening (Creator can delete pending, Admin can delete all)
// @route   DELETE /api/v1/openings/:id
// @access  Protected
exports.deleteOpening = asyncHandler(async (req, res, next) => {
  const opening = await models.Opening.findByPk(req.params.id);
  if (!opening) {
    return next(new ErrorResponse('Opening not found', 404));
  }

  const isAdmin = req.user.role.includes('admin');
  const openingTitle = opening.title; // Store title before deletion
  const openingCreatorId = opening.userId; // Store creator ID before deletio  

  // Creator can delete their own opening if it's still pending
  // Admin can delete any opening
  if (opening.userId !== req.user.id && !isAdmin) {
    return next(new ErrorResponse('Not authorized to delete this opening', 403));
  }

  if (opening.userId === req.user.id && opening.status !== 'pending' && !isAdmin) {
    return next(new ErrorResponse('Cannot delete an opening that is no longer pending review.', 403));
  }

  const deletedOpeningId = opening.id;

  await opening.destroy();

  await createNotification(
    req.user.id,
    'opening_deleted_by_user',
    `Deleted the opening: "${openingTitle}".`,
    'Opening',
    deletedOpeningId 
  );

  // If the deleter is an admin and not the creator, notify the creator as well
  if (isAdmin && req.user.id !== openingCreatorId && openingCreatorId) {
    await createNotification(
      openingCreatorId,
      'opening_deleted_by_admin',
      `Opening "${openingTitle}" has been deleted by an administrator.`,
      'Opening',
      deletedOpeningId 
    );
  }

  res.status(200).json({ success: true, data: {} });
});


// @desc    Approve Opening (Admin only)
// @route   PUT /api/v1/openings/:id/approve
// @access  Admin
// exports.approveOpening = asyncHandler(async (req, res, next) => {
//   const opening = await models.Opening.findByPk(req.params.id);

//   if (!opening) {
//     return next(new ErrorResponse('Opening not found', 404));
//   }

//   opening.status = 'approved';
//   opening.statusMessage = 'Approved by admin.';
//   await opening.save();

//   if (opening.userId) {
//     await createNotification(
//       opening.userId,
//       'opening_approved',
//       `Opening "${opening.title}" has been approved! It is now visible to others.`,
//       'Opening',
//       opening.id
//     );
//   }  

//   await createNotification(
//     req.user.id,
//     'admin_opening_approved',
//     `Approved the opening "${opening.title}".`,
//     'Opening',
//     opening.id
//   );  

//   res.status(200).json({ success: true, data: opening });
// });

// @desc    Reject Opening (Admin only)
// @route   PUT /api/v1/openings/:id/reject
// @access  Admin
// exports.rejectOpening = asyncHandler(async (req, res, next) => {
//   const opening = await models.Opening.findByPk(req.params.id);
//   const { statusMessage } = req.body; // Admin can provide a reason for rejection

//   if (!opening) {
//     return next(new ErrorResponse('Opening not found', 404));
//   }

//   if (!statusMessage || statusMessage.trim() === '') {
//     return next(new ErrorResponse('A rejection message is required when rejecting an opening', 400));
//   }

//   opening.status = 'rejected';
//   opening.statusMessage = sanitizeText(DOMPurify.sanitize(statusMessage));
//   await opening.save();

//   if (opening.userId) {
//     await createNotification(
//       opening.userId,
//       'opening_rejected',
//       `Opening "${opening.title}" has been rejected. Reason: ${opening.statusMessage}`,
//       'Opening',
//       opening.id
//     );
//   }  

//   await createNotification(
//     req.user.id,
//     'admin_opening_rejected',
//     `Rejected the opening "${opening.title}".`,
//     'Opening',
//     opening.id
//   );  

//   res.status(200).json({ success: true, data: opening });
// });



const fetchDataByCategory = async (categorySlug, cityCoords, limit) => {
    switch (categorySlug) {
        case REAL_ESTATE_SLUG:
            // API Call for Real Estate
            const realEstateApiUrl = `https://realty-in-ca1.p.rapidapi.com/properties/list-residential?LatitudeMax=${cityCoords.latMax}&LatitudeMin=${cityCoords.latMin}&LongitudeMax=${cityCoords.longMax}&LongitudeMin=${cityCoords.longMin}&CurrentPage=1&RecordsPerPage=${limit}&Culture=en-CA`;

            const apiKey = process.env.RAPIDAPI_KEY
            const realEstateResponse = await fetch(realEstateApiUrl, {
                headers: {
                    'X-RapidAPI-Key': apiKey,
                    'X-RapidAPI-Host': 'realty-in-ca1.p.rapidapi.com'
                }
            });

            if (!realEstateResponse.ok) {
                throw new ErrorResponse(`External Real Estate API Error: ${realEstateResponse.statusText}`, 502);
            }
            const realEstateData = await realEstateResponse.json();
            return realEstateData.Results || [];
            
        case FRANCHISES_SLUG:
            return CANADIAN_FRANCHISES.slice(0, limit); 
            
        default:
            throw new ErrorResponse(`Data retrieval for category '${categorySlug}' is not supported by this automation yet.`, 501);
    }
};

const transformListingToOpeningData = (listing, selectedCategory, req) => {
    const { slug, id: categoryId } = selectedCategory;
    
    let title, description, sourceLink, photoUrl;
    let minInvestmentAmount = null;
    let maxInvestmentAmount = null;
    let metadata = {};
    let tags = [];
    let skip = false; 

    switch (slug) {
        case REAL_ESTATE_SLUG:
            const mlsNumber = listing.MlsNumber || listing.Id;
            const propertyId = listing.Id;

            if (!mlsNumber || !listing.Property?.Address) {
                skip = true;
                break;
            }
            
            const bedrooms = listing.Building?.BedroomsTotal || 0;
            const propertyType = listing.Property?.Type || 'Home';
            const rawPrice = listing.Property?.Price;
            const price = parsePrice(rawPrice);
            const city = listing.Property?.Address?.City || CITY_COORDS.toronto.name; 
            
            title = bedrooms > 0 
                ? `${bedrooms}-Bedroom ${propertyType} - ${city} (MLS# ${mlsNumber})`
                : `${propertyType} - ${city} (MLS# ${mlsNumber})`;
            
            description = generateDescription(listing);
            photoUrl = listing.Property?.Photo?.[0]?.HighResPath || 
                       listing.Property?.Photo?.[0]?.MedResPath || 
                       'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg';
            sourceLink = `https://www.realtor.ca/real-estate/${propertyId}/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            
            minInvestmentAmount = price;
            maxInvestmentAmount = price;
            
            metadata = {
                property_id: propertyId,
                mls_number: mlsNumber,
                bedrooms: listing.Building?.BedroomsTotal || 0,
                city: city,
                province: getProvince(listing.Property?.Address?.Province),
                postal_code: listing.Property?.Address?.PostalCode || '',
                listing_date: listing.InsertedDateUTC || '',
            };
            tags.push(propertyType); 
            break;

        case FRANCHISES_SLUG:
            if (!listing.name || !listing.investmentMin) {
                 skip = true;
                 break;
            }

            title = `${listing.name} Franchise Opportunity`;
            description = listing.description;
            sourceLink = listing.website; 
            photoUrl = listing.image || 'https://images.pexels.com/photos/3184305/pexels-photo-3184305.jpeg';
            
            minInvestmentAmount = listing.investmentMin;
            maxInvestmentAmount = listing.investmentMax;
            
            metadata = {
                franchise_fee: listing.franchiseFee,
                royalty_fee: listing.royaltyFee,
                category: listing.category,
                established_year: listing.established,
                territories_available: listing.territories,
                province: listing.province,
            };
            tags.push('Franchise');
            tags.push(listing.category);
            break;

        default:
            skip = true;
            break;
    }

    if (skip) {
        return { skip: true };
    }

    return {
        skip: false,
        title: title.substring(0, 255),
        image: photoUrl,
        description: description,
        sourceLink: sourceLink,
        openingCategoryId: categoryId, 
        minInvestmentAmount: minInvestmentAmount,
        maxInvestmentAmount: maxInvestmentAmount,
        source: slug,
        metadata: metadata,
        tags: tags,
        userId: req.user.id,
        status: 'pending',
    };
};


