const asyncHandler = require('../middleware/async')
const ErrorResponse = require('../utils/errorResponse')
const sendEmail = require('../utils/sendEmail')
//const { User } = require('../models/User')
//const { ForumCommentUserReaction } = require('../models/ForumCommentUserReaction')
//const { FeedbackCommentUserReaction } = require('../models/FeedbackCommentUserReaction')
const { Op } = require('sequelize');
const models = require('../models');
const { JSDOM } = require('jsdom');
const { window } = new JSDOM('');
const DOMPurify = require('dompurify')(window);
const { Sequelize } = require('sequelize');
const { sanitizeText } = require('../utils/textSanitizer');
const Redis = require('ioredis');
const redisClient = new Redis(); 
const { renameFirstImage, convertURLToFilePath, renameFile } = require('../helper/mediaUtils');
const { createNotification } = require('../utils/notificationService'); 


/**
 * @desc    Get a public user profile by username
 * @route   GET /api/v1/user/public/:username
 * @access  Public
 */
exports.getPublicProfileByUsername = asyncHandler(async (req, res, next) => {
  const { username } = req.params;

  const publicProfile = await models.User.findOne({
    where: { username: username, deleted: false, suspended: false, locked: false },
    attributes: [
      'id', 'username', 'firstName', 'lastName', 'biodata', 'occupation', 'country', 'state',
      'address', 'coverPhoto', 'profilePhoto', 'createdAt', 'maritalStatus', 'verified'
    ],
    include: [{
      model: models.Interest,
      through: { attributes: [] },
      where: {
        status: 'approved',
      },
      required: false,
    }],
  });

  if (!publicProfile) {
    return res.status(404).json({
      success: false,
      error: 'User not found or is not available publicly.'
    });
  }

  res.status(200).json({
    success: true,
    data: publicProfile
  });
});


// @desc    Register user
// @route   POST /api/v1/user/service/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  let { username, email, password } = req.body;

  const existingUser = await models.User.findOne({
    where: {
      [Op.or]: [{ username }, { email }]
    }
  });
  
  if (existingUser) {
    return res.status(400).json({ success: false, error: 'Username or email already exists' });
  }  

  const user = await models.User.create({
    service: '',
    username,
    email,
    password,
    country: '',
    state: '',
    address: '',
    businessName: username,
    phoneNumber: '',
    biodata: '',
    video: '',
    verificationStage: 0,
    usernames: username,
    suspensionTime: new Date(),
    verifiedTime: new Date(),
    lockedTime: new Date(),
    planTime: new Date(),
    deleteTime: new Date(),
    roleTime: new Date(),
  });

  const token = user.getSignedJwtToken();
  let expiresIn = process.env.JWT_COOKIE_EXPIRE;

  const options = {
    expires: new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000),
    httpOnly: true,
  };  

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  welcomeEmail(email, username);

  await createNotification(
    'admin',
    'new_user_registration',
    `New user registered: ${user.username} (${user.email}).`,
    'User',
    user.id
  );   
  
  res
    .status(200)
    .cookie('token', token, options)
    .json({ 
      success: true, 
      token, 
      id: user.id,
      username: user.username,
      email: user.email,
      profilePhoto: user.profilePhoto,
      verified: user.verified,
      role: user.role,
      plan: user.plan
    });     
});

// @desc    Create user
// @route   POST /api/v1/user
exports.getUsersByIdsPutInBody = asyncHandler(async (req, res, next) => {
  const data = req.body;

  if (data && data.ids) {
    const userIds = data.ids;
    const users = await models.User.findAll({
      where: {
        id: {
          [Op.in]: userIds,
        },
        suspended: 0,
        deleted: 0,
      },
      attributes: ['id', 'username', 'profilePhoto', 'verified'],
    });

    if (!users || users.length === 0) {
      return next(new ErrorResponse('Users not found'));
    }

    res.status(201).json({ success: true, data: users });
  } else if (data && data.forumCommentIds) {
    const forumCommentIds = data.forumCommentIds;
    const forumCommentUserReactions = await models.ForumCommentUserReaction.findAll({
      where: {
        commentId: {
          [Op.in]: forumCommentIds,
        }
      },
      attributes: ['commentId', 'userId', 'liked', 'disliked'],
    });

    if (!forumCommentUserReactions) {
      return next(new ErrorResponse('User interactions not found'));
    }

    res.status(201).json({ success: true, data: forumCommentUserReactions });
  } else if (data && data.feedbackCommentIds) {
    const feedbackCommentIds = data.feedbackCommentIds;
    const feedbackCommentUserReactions = await models.FeedbackCommentUserReaction.findAll({
      where: {
        commentId: {
          [Op.in]: feedbackCommentIds,
        }
      },
      attributes: ['commentId', 'userId', 'liked', 'disliked'],
    });

    if (!feedbackCommentUserReactions) {
      return next(new ErrorResponse('User interactions not found'));
    }
    res.status(201).json({ success: true, data: feedbackCommentUserReactions });
  } else if (data && data.groupCommentIds) {
    const groupCommentIds = data.groupCommentIds;
    const groupCommentUserReactions = await models.GroupCommentUserReaction.findAll({
      where: {
        commentId: {
          [Op.in]: groupCommentIds,
        }
      },
      attributes: ['commentId', 'userId', 'liked', 'disliked'],
    });

    if (!groupCommentUserReactions) {
      return next(new ErrorResponse('User interactions not found'));
    }
    res.status(201).json({ success: true, data: groupCommentUserReactions });
  }
});

// @desc    Get user
// @route   GET /api/v1/user/:hiDee
exports.getUser = asyncHandler(async (req, res, next) => {
  const username = req.params.hiDee;
  const { start, size, filters, globalFilter, sorting, search } = req.query;
	const startIndex = parseInt(start) || 0;
	const pageSize = parseInt(size) || 10;
  let whereCondition = {};

  const cacheKey = `${'user'}_${username}_${start}_${size}_${filters}_${globalFilter}_${sorting}_${search}`;
  const cachedData = await redisClient.get(cacheKey);
  // if (cachedData) {
  //   const cachedResult = JSON.parse(cachedData);
  //   const currentTime = Date.now();
  //   const expirationTime = cachedResult.timestamp + (5 * 60 * 1000);
  //   if (currentTime < expirationTime) {
  //     return res.status(200).json(cachedResult);
  //   } else {
  //     await redisClient.del(cacheKey);
  //   }
  // }

  let cleanedSearch;
  let serviceExactMatch;
  let remainingSearch;

  if (search && search !== "undefined") {
    cleanedSearch = search.trim().replace(/\s+/g, ' ');
    if (cleanedSearch) {
      serviceExactMatch = serviceData.find(service => cleanedSearch.toLowerCase().includes(service.name.toLowerCase()));    

        if (serviceExactMatch) {
            whereCondition = {
                [Op.or]: [
                    Sequelize.where(Sequelize.col('service'), '=', serviceExactMatch.name)
                ]
            };

            remainingSearch = cleanedSearch.replace(new RegExp(serviceExactMatch.name, 'gi'), '').trim();
            if (remainingSearch) {
                const searchWords = remainingSearch.slice(0, 50).split(/\s+/).filter(Boolean);
                let whereConditionsForOtherColumns = [];
                searchWords.forEach(word => {
                    const condition = {
                        [Op.or]: [
                            Sequelize.where(Sequelize.col('username'), 'LIKE', `%${word}%`),
                            Sequelize.where(Sequelize.col('businessName'), 'LIKE', `%${word}%`),
                            Sequelize.where(Sequelize.col('service'), 'LIKE', `%${word}%`),
                            Sequelize.where(Sequelize.col('country'), 'LIKE', `%${word}%`),
                            Sequelize.where(Sequelize.col('state'), 'LIKE', `%${word}%`),
                            Sequelize.where(Sequelize.col('biodata'), 'LIKE', `%${word}%`),
                        ]
                    };
                    whereConditionsForOtherColumns.push(condition);
                });
                whereCondition[Op.and] = whereConditionsForOtherColumns;
            }
        } else {
            const searchWords = cleanedSearch.slice(0, 50).split(/\s+/).filter(Boolean);
            let whereConditionsForOtherColumns = [];
            searchWords.forEach(word => {
                const condition = {
                    [Op.or]: [
                        Sequelize.where(Sequelize.col('username'), 'LIKE', `%${word}%`),
                        Sequelize.where(Sequelize.col('businessName'), 'LIKE', `%${word}%`),
                        Sequelize.where(Sequelize.col('service'), 'LIKE', `%${word}%`),
                        Sequelize.where(Sequelize.col('country'), 'LIKE', `%${word}%`),
                        Sequelize.where(Sequelize.col('state'), 'LIKE', `%${word}%`),
                        Sequelize.where(Sequelize.col('biodata'), 'LIKE', `%${word}%`),
                    ]
                };
                whereConditionsForOtherColumns.push(condition);
            });

            whereCondition = {
                [Op.or]: whereConditionsForOtherColumns
            };
        }
    }
  }

  if (username === 'all') {
    /*const users = await models.User.findAndCountAll({
      attributes: ['id', 'businessName', 'service', 'username', 'profilePhoto', 'verified', 'state'],
      where: {
        [Op.and]: [
          whereCondition, 
          { suspended: 0 }, 
          { locked: 0 }, 
          { deleted: 0 }, 
        ],
      },
      order: [
        ['verified', 'DESC'],
        [models.sequelize.literal("CASE WHEN plan = 'premium' THEN 1 WHEN plan = 'standard' THEN 2 WHEN plan = 'partner' THEN 3 WHEN plan = 'basic' THEN 4 ELSE 5 END"), 'ASC'],
        [models.sequelize.literal("(SELECT COUNT(*) FROM Services WHERE Services.userId = User.id)"), 'DESC'],
        [models.sequelize.literal("(SELECT COUNT(*) FROM ForumComments WHERE ForumComments.commentUserId = User.id)"), 'DESC'],
        [models.sequelize.literal("(SELECT COUNT(*) FROM FeedbackComments WHERE FeedbackComments.commentUserId = User.id)"), 'DESC'],
        [models.sequelize.literal("(SELECT COUNT(*) FROM GroupComments WHERE GroupComments.commentUserId = User.id)"), 'DESC'],        
        [models.sequelize.literal("(SELECT COUNT(*) FROM ServiceReports WHERE ServiceReports.userId = User.id)"), 'ASC'],
        [models.sequelize.literal("(SELECT COUNT(*) FROM ForumCommentReports WHERE ForumCommentReports.commentUserId = User.id)"), 'ASC'],
        [models.sequelize.literal("(SELECT COUNT(*) FROM FeedbackCommentReports WHERE FeedbackCommentReports.commentUserId = User.id)"), 'ASC'],
        [models.sequelize.literal("(SELECT COUNT(*) FROM GroupCommentReports WHERE GroupCommentReports.commentUserId = User.id)"), 'ASC'],
      ],
      offset: startIndex,
      limit: pageSize,
    });*/

    // const { count, rows: orderedUsers } = await getUsersOrderedByEngagement(undefined,undefined,startIndex,pageSize,whereCondition);    

    const { count, rows: orderedUsers } = await getUsersOrderedByRecentVisit(startIndex,pageSize,whereCondition);    

    //const { count, rows } = users;
    
    let combinedUsers;
    if (start == "0") {
      const priorityUsersPlusUser = await models.PriorityUser.findAll({
        attributes: ['userId'], 
        include: [{
          model: models.User,
          as: 'user', 
          attributes: ['id', 'businessName', 'service', 'username', 'profilePhoto', 'verified', 'state'],
          where: {
            [Op.and]: [
              whereCondition, 
              { suspended: 0 }, 
              { locked: 0 }, 
              { deleted: 0 }, 
            ],
          },
        }],
        order: [['bid', 'DESC']]        
      });

      const priorityUsers = priorityUsersPlusUser.map(priorityUser => priorityUser.user);
      combinedUsers =  priorityUsers.concat(orderedUsers);
    } else {
      combinedUsers =  orderedUsers;
    }

    if (!combinedUsers || combinedUsers.length === 0) {
      const emptyResponse = {
        success: true,
        data: [],
        meta: {
          totalRowCount: 0
        }
      };
      const currentTime = Date.now();
      emptyResponse.timestamp = currentTime;
      if (!cleanedSearch || (serviceExactMatch && serviceExactMatch.name && !remainingSearch)) {
        await redisClient.set(cacheKey, JSON.stringify(emptyResponse)); // Cache empty response with timestamp
      }
      return res.status(200).json(emptyResponse);
    }

    const response = {
      success: true,
      data: combinedUsers,
      meta: {
        totalRowCount: count
      }
    };
    const currentTime = Date.now();
    response.timestamp = currentTime;
    if (!cleanedSearch || (serviceExactMatch && serviceExactMatch.name && !remainingSearch)) {
      await redisClient.set(cacheKey, JSON.stringify(response)); // Cache the response with timestamp
    }
    res.status(200).json(response);
  } else {
    const user = await models.User.findOne({
      where: { 
        email: username,
        suspended: 0,  
        deleted: 0    
      },    
      attributes: [
        'id', 'country', 'state', 'address', 'businessName', 'service', 'username', 'email', 'createdAt',
        'phoneNumber', 'phoneNumberStatus', 'biodata', 'profilePhoto', 'coverPhoto', 'verified', 'video', 
        'plan', 'viewsCount', 'firstName', 'lastName', 'additionalName', 'birthday', 'occupation', 'maritalStatus' 
      ]
    });    

    if (!user) {
      return next(new ErrorResponse(`No user with that email of ${email}`));
    }

    const currrentUser = await models.User.findOne({ where: { email: username } });
    const updatedViewsCount = currrentUser.viewsCount + 1; 
    const updatedRows = await models.User.update(
      { 
        viewsCount: updatedViewsCount
      },
      { where: { email: username } }
    );   

    res.status(200).json({ success: true, data: user });
  }
});

// @desc    Get user by id
// @route   GET /api/v1/user/iden/:hiDee
exports.getUserById = asyncHandler(async (req, res, next) => {
  const id = req.params.hiDee;

  const user = await models.User.findOne({
    where: { 
      id,
      suspended: 0,  
      deleted: 0    
    },    
    attributes: [
      'id', 'country', 'state', 'address', 'username', 'createdAt',
      'biodata', 'profilePhoto', 'coverPhoto', 'verified', 'firstName', 'lastName',
      'additionalName', 'occupation', 'maritalStatus' 
    ]
  });    

  if (!user) {
    return next(new ErrorResponse(`No user found with ID: ${id}`, 404));
  }

  res.status(200).json({ success: true, data: user });
});

// @desc    Get user
// @route   GET /api/v1/user/slg/:hiDee
exports.getUserBySlug = asyncHandler(async (req, res, next) => {
  const slug = req.params.hiDee;
  const signedInUserCondition = req.user?.id 
  ? `WHEN phoneNumberStatus = 'Private' AND phoneNumber IS NOT NULL AND id = :signedInUserId THEN phoneNumber` 
  : '';

  const user = await models.User.findOne({
    include: [{
      model: models.Service,
      where: { 
        slug,
        deleted: 0    
      },      
      attributes: [],
      as: 'services'
    }],
    attributes: ['id', 'country', 'state', 'address', 'businessName', 'service', 'username', 'email', 
      'phoneNumber', 'phoneNumberStatus', 'biodata', 'profilePhoto', 'coverPhoto', 'verified', 'video', 'plan', 
      'viewsCount', 'firstName', 'lastName', 'additionalName', 'birthday', 'occupation', 'maritalStatus' 
    ],
    replacements: {
      signedInUserId: req.user?.id || null
    }           
  });
  
  if (!user) {
    return next(new ErrorResponse(`No user associated with the slug ${slug}`));
  }
  
  const currrentUser = await models.User.findOne({ where: { username: user.username } });
  const updatedViewsCount = currrentUser.viewsCount + 1; 
  const updatedRows = await models.User.update(
    { 
      viewsCount: updatedViewsCount
    },
    { where: { username: user.username } }
  );

  res.status(200).json({ success: true, data: user });
  
});

// @desc    Update user
// @route   PUT /api/v1/user/:hiDee
exports.updateUser = asyncHandler(async (req, res, next) => {
  const userHiDee = req.params.hiDee;
  const {
    username,
    email,
    country,
    state,
    address,
    businessName,
    service,
    phoneNumber,
    phoneNumberStatus,
    biodata,
    profilePhoto,
    coverPhoto,
    video,
    firstName, 
    lastName,  
    additionalName,
    birthday,  
    occupation, 
    maritalStatus  
  } = req.body;

  const sanitisedBiodata = DOMPurify.sanitize(biodata, {
    ALLOWED_TAGS: ['p', 'br', 'ul', 'ol', 'li'],
  });
  const sanitisedUsername = sanitizeText(username);
  const sanitisedAddress = sanitizeText(address);
  const sanitisedBusinessName = sanitizeText(businessName);
  const sanitisedBiodata1 = sanitizeText(sanitisedBiodata);
  const sanitisedFirstName = sanitizeText(firstName);
  const sanitisedLastName = sanitizeText(lastName);
  const sanitisedAdditionalName = sanitizeText(additionalName);
  const sanitisedOccupation = sanitizeText(occupation);
  const sanitisedMaritalStatus = sanitizeText(maritalStatus);

  const user = await models.User.findByPk(userHiDee);

  if (!user || !user.username) {
    return next(new ErrorResponse('User not found'));
  }

  if (user.locked || user.suspended) {
    return next(new ErrorResponse('Invalid operation detected'));
  }

  if (user.deleted) {
    return next(new ErrorResponse('User not found'));
  }

  if ((req.user.id !== user.id) && !req.user.role.includes('admin')) {
    return next(new ErrorResponse('Record not found'));
  }

  if (username !== user.username) {
    user.usernames = user.usernames + "..." + username;
  }

  const signedInUserCondition = req.user?.id 
  ? `WHEN phoneNumberStatus = 'Private' AND phoneNumber IS NOT NULL AND id = :signedInUserId THEN phoneNumber` 
  : '';

  const usernames = user.usernames;
  let affectedRows;

  // if (0  {/*profilePhoto && (profilePhoto !== "profilePhoto.png") && (user.username !== sanitisedUsername)*/}) {
  //   const result = renameFirstImage('image', profilePhoto, `${sanitisedUsername}.jpg`);
  //   if (result) {
  //     const { oldUrl, newUrl, updatedUrls } = result;
  //     const oldFilePath = convertURLToFilePath(oldUrl);
  //     const newFilePath = convertURLToFilePath(newUrl);
  
  //     try {
  //       await renameFile(oldFilePath, newFilePath);
  //     } catch (err) {
  //     }
  
  //     affectedRows = await models.User.update(
  //       {
  //         username: sanitisedUsername || user.username,
  //         email: email || user.email,
  //         country: country || user.country,
  //         state: state || user.state,
  //         address: sanitisedAddress || user.address,
  //         businessName: sanitisedBusinessName || user.businessName,
  //         service: service || user.service,
  //         phoneNumber: (phoneNumber !== "Hidden" && phoneNumber) || user.phoneNumber,
  //         phoneNumberStatus: phoneNumberStatus || user.phoneNumberStatus,
  //         biodata: sanitisedBiodata1 || user.biodata,
  //         profilePhoto: updatedUrls || user.profilePhoto,
  //         coverPhoto: coverPhoto || user.coverPhoto,
  //         video: video || user.video,
  //         usernames: usernames || user.usernames,
  //         firstName: sanitisedFirstName || user.firstName,
  //         lastName: sanitisedLastName || user.lastName,
  //         additionalName: sanitisedAdditionalName || user.additionalName,
  //         birthDay: birthday || user.birthDay,
  //         occupation: sanitisedOccupation || user.occupation,
  //         maritalStatus: sanitisedMaritalStatus || user.maritalStatus
  //       },
  //       {
  //         where: { id: userHiDee },
  //       }
  //     );
      
  //   }
  // } else  {
  //   affectedRows = await models.User.update(
  //     {
  //       username: sanitisedUsername ?? user.username,
  //       email: email ?? user.email,
  //       country: country ?? user.country,
  //       state: state ?? user.state,
  //       address: sanitisedAddress ?? user.address,
  //       businessName: sanitisedBusinessName ?? user.businessName,
  //       service: service ?? user.service,
  //       phoneNumber: (phoneNumber !== "Hidden" && phoneNumber) || user.phoneNumber,
  //       phoneNumberStatus: phoneNumberStatus ?? user.phoneNumberStatus,
  //       biodata: sanitisedBiodata1 ?? user.biodata,
  //       // profilePhoto: updatedUrls ?? user.profilePhoto,
  //       coverPhoto: coverPhoto ?? user.coverPhoto,
  //       video: video ?? user.video,
  //       usernames: usernames ?? user.usernames,
  //       firstName: sanitisedFirstName ?? user.firstName,
  //       lastName: sanitisedLastName ?? user.lastName,
  //       additionalName: sanitisedAdditionalName ?? user.additionalName,
  //       birthday: birthday ?? user.birthday,
  //       occupation: sanitisedOccupation ?? user.occupation,
  //       maritalStatus: sanitisedMaritalStatus ?? user.maritalStatus
  //     },
  //     {
  //       where: { id: userHiDee },
  //     }
  //   );
    
  // }  

  affectedRows = await models.User.update(
    {
      username: sanitisedUsername ?? user.username,
      email: email ?? user.email,
      country: country ?? user.country,
      state: state ?? user.state,
      address: sanitisedAddress ?? user.address,
      // businessName: sanitisedBusinessName ?? user.businessName,
      // service: service ?? user.service,
      phoneNumber: (phoneNumber !== "Hidden" && phoneNumber) || user.phoneNumber,
      // phoneNumberStatus: phoneNumberStatus ?? user.phoneNumberStatus,
      biodata: sanitisedBiodata1 ?? user.biodata,
      // profilePhoto: updatedUrls ?? user.profilePhoto,
      coverPhoto: coverPhoto ?? user.coverPhoto,
      video: video ?? user.video,
      usernames: usernames ?? user.usernames,
      firstName: sanitisedFirstName ?? user.firstName,
      lastName: sanitisedLastName ?? user.lastName,
      additionalName: sanitisedAdditionalName ?? user.additionalName,
      // birthday: birthday ?? user.birthday,
      occupation: sanitisedOccupation ?? user.occupation,
      maritalStatus: sanitisedMaritalStatus ?? user.maritalStatus
    },
    {
      where: { id: userHiDee },
    }
  );

  if (affectedRows[0] > 0) {
    const editedUser = await models.User.findOne({
      where: { id: userHiDee },
      attributes: ['id', 'country', 'state', 'address', 'businessName', 'service', 'username', 'email', 
        'phoneNumber', 'phoneNumberStatus', 'biodata', 'profilePhoto', 'coverPhoto', 'verified', 'video', 'plan', 
        'viewsCount', 'firstName', 'lastName', 'additionalName', 'birthday', 'occupation', 'maritalStatus' 
      ],
      replacements: {
        signedInUserId: req.user?.id || null
      }         
    });

    if (!editedUser) {
      return next(new ErrorResponse('User not found'));
    }

    let changes = [];
    if (sanitisedUsername && sanitisedUsername !== user.username) changes.push(`username from '${user.username}' to '${sanitisedUsername}'`);
    if (email && email !== user.email) changes.push(`email from '${user.email}' to '${email}'`);
    if (country && country !== user.country) changes.push(`country to '${country}'`);
    if (state && state !== user.state) changes.push(`state to '${state}'`);
    if (address && address !== user.address) changes.push(`address to '${address}'`);
    if (businessName && businessName !== user.businessName) changes.push(`business name to '${businessName}'`);
    if (service && service !== user.service) changes.push(`service to '${service}'`);
    if (phoneNumber && phoneNumber !== "Hidden" && phoneNumber !== user.phoneNumber) changes.push(`phone number to '${phoneNumber}'`);
    if (phoneNumberStatus && phoneNumberStatus !== user.phoneNumberStatus) changes.push(`phone number status to '${phoneNumberStatus}'`);
    if (biodata && biodata !== user.biodata) changes.push(`biodata`);
    if (firstName && firstName !== user.firstName) changes.push(`first name to '${firstName}'`);
    if (lastName && lastName !== user.lastName) changes.push(`last name to '${lastName}'`);
    if (additionalName && additionalName !== user.additionalName) changes.push(`additional name to '${additionalName}'`);
    if (birthday && birthday !== user.birthday) changes.push(`birthday to '${birthday}'`);
    if (occupation && occupation !== user.occupation) changes.push(`occupation to '${occupation}'`);
    if (maritalStatus && maritalStatus !== user.maritalStatus) changes.push(`marital status to '${maritalStatus}'`);

    // Notification to admin about user profile update
      await createNotification(
        req.user.id,
        'admin_user_profile_update',
        `User ${user.username} (${user.id}) updated their profile. Changes: ${changes.join(', ')}.`,
        'User',
        user.id
      );  

    res.status(200).json({ success: true, data: editedUser });  
  }
});

// @desc    Delete user
// @route   DELETE /api/v1/auth/user/:hiDee
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const userId = req.params.hiDee; // Assuming hiDee contains the user ID
  const user = await models.User.findByPk(userId, {
    include: [
      { model: models.Service, as: 'services' },
      { model: models.ForumComment, as: 'forumComments' },
      { model: models.FeedbackComment, as: 'feedbackComments' },
      { model: models.GroupComment, as: 'groupComments' },
      { model: models.ForumCommentUserReaction, as: 'forumCommentUserReactions' },
      { model: models.FeedbackCommentUserReaction, as: 'feedbackCommentUserReactions' },
      { model: models.GroupCommentUserReaction, as: 'groupCommentUserReactions' },
      { model: models.ForumCommentReport, as: 'forumCommentReports' },
      { model: models.FeedbackCommentReport, as: 'feedbackCommentReports' },
      { model: models.GroupCommentReport, as: 'groupCommentReports' },
      { model: models.ServiceReport, as: 'serviceReports' },
      { model: models.UserPlan, as: 'userPlan' },
      { model: models.PriorityUser, as: 'priorityUser' },
      { model: models.UserVerify, as: 'verifications' }
    ]
  });

  // Check if the user exists
  if (!user) {
    return next(new ErrorResponse('User not found'));
  }

  if (user.deleted) {
    return next(new ErrorResponse('User not found'));
  }

  // Check if the authenticated user is the same user or has admin role
  if (req.user.id !== user.id && !req.user.role.includes('admin')) {
    return next(new ErrorResponse('Unauthorized to delete this user'));
  }

  // const hasDependents =
  //   (user.services && user.services.length > 0) ||
  //   (user.forumComments && user.forumComments.length > 0) ||
  //   (user.feedbackComments && user.feedbackComments.length > 0) ||
  //   (user.groupComments && user.groupComments.length > 0) ||
  //   (user.forumCommentUserReactions && user.forumCommentUserReactions.length > 0) ||
  //   (user.feedbackCommentUserReactions && user.feedbackCommentUserReactions.length > 0) ||
  //   (user.groupCommentUserReactions && user.groupCommentUserReactions.length > 0) ||
  //   (user.forumCommentReports && user.forumCommentReports.length > 0) ||
  //   (user.feedbackCommentReports && user.feedbackCommentReports.length > 0) ||
  //   (user.groupCommentReports && user.groupCommentReports.length > 0) ||
  //   (user.serviceReports && user.serviceReports.length > 0);

  // If the user has dependents and the authenticated user is not an admin, return an error
  /*if (hasDependents && !req.user.role.includes('admin')) {
    return next(new ErrorResponse('Cannot delete user with dependent records'));
  }*/

  if (user.coverPhoto && (user.coverPhoto !== "coverPhoto.png")) {
    //await unlinkAsync(convertURLToFilePath(user.coverPhoto));
  }   

  if (user.profilePhoto && (user.profilePhoto !== "profilePhoto.png")) {
    //await unlinkAsync(convertURLToFilePath(user.profilePhoto));
  }

  if (user.video && (user.video !== "no-photo.jpg")) {
    //await unlinkAsync(convertURLToFilePath(user.video));
  }

  // If there are no dependents or the authenticated user is an admin, proceed with deleting the user
  //await user.destroy();
  user.deleted = true;
  user.deleteddBy = req.user.id;
  user.deleteTime = new Date();
  await user.save();

  // Notification to the user about their account deletion (if deleted by admin)
  if (req.user.id !== user.id && req.user.role.includes('admin')) {
    await createNotification(
      user.id,
      'account_deleted_by_admin',
      `Account has been marked for deletion by an administrator.`,
      'User',
      user.id
    );
  } else if (req.user.id === user.id) {
    // Notification to the user about their own account deletion request
    await createNotification(
      req.user.id,
      'account_deletion_requested',
      `Account deletion request has been processed.`,
      'User',
      user.id
    );
  }  

  // Notification to admin about user deletion
  // await createNotification(
  //   'admin',
  //   'admin_user_deleted',
  //   `User ${user.username} (${user.id}) has been marked as deleted by ${req.user.username} (${req.user.id}).`,
  //   'User',
  //   user.id
  // );  

  res.status(200).json({ success: true });
});

const serviceData = [{ serviceID: 1, name: "Consumer Goods" }, { serviceID: 2, name: "Industrial/Manufacturing Products" }, { serviceID: 3, name: "Technology Products" }, { serviceID: 4, name: "Healthcare and Pharmaceuticals" }, { serviceID: 5, name: "Food and Beverages" }, { serviceID: 6, name: "Automotive Products" }, { serviceID: 7, name: "Real Estate and Construction" }, { serviceID: 8, name: "Financial Products" }, { serviceID: 9, name: "Entertainment and Media" }, { serviceID: 10, name: "Professional Services" }, { serviceID: 11, name: "Educational Products and Services" }, { serviceID: 12, name: "Environmental Products" }, { serviceID: 13, name: "Travel and Hospitality" }];


// @desc    Get user verification detail
// @route   GET /api/v1/user/verify/detail/:hiDee
exports.getUserVerificationDetail = asyncHandler(async (req, res, next) => {
  const userHiDee = req.params.hiDee;

  const user = await models.User.findByPk(userHiDee);

  if (!user || !user.username) {
    return next(new ErrorResponse('User not found'));
  }

  if (user.locked || user.suspended) {
    return next(new ErrorResponse('Invalid operation detected'));
  }

  if (user.deleted) {
    return next(new ErrorResponse('User not found'));
  }

  if (req.user.id !== user.id) {
    return next(new ErrorResponse('Record not found'));
  }

  const userVerify = await models.UserVerify.findOne({
    where: { userId: userHiDee },
    attributes: ['id', 'successful', 'idCard', 'selfie', 'verificationStatus'],
  });

  if (!userVerify) {
    return next(new ErrorResponse('User verification detail not found'));
  }

  let modifiedUserVerify = null;
  modifiedUserVerify = {
    ...userVerify.dataValues,
    idCard: userVerify.idCard ? 'uploaded' : userVerify.idCard,
    selfie: userVerify.selfie ? 'uploaded' : userVerify.selfie,
  };
  
  res.status(200).json({ success: true, userVerify: modifiedUserVerify });
  
});

// @desc    Verify user
// @route   POST /api/v1/user/verify/request/:hiDee
exports.verifyUser = asyncHandler(async (req, res, next) => {
  const userHiDee = req.params.hiDee;

  const user = await models.User.findByPk(userHiDee);

  if (!user || !user.username) {
    return next(new ErrorResponse('User not found'));
  }

  if (user.locked || user.suspended) {
    return next(new ErrorResponse('Invalid operation detected'));
  }

  if (user.deleted) {
    return next(new ErrorResponse('User not found'));
  }

  if (req.user.id !== user.id) {
    return next(new ErrorResponse('Record not found'));
  }

  const userVerify = await models.UserVerify.findOne({
    where: { userId: userHiDee },
    attributes: ['id', 'successful', 'idCard', 'selfie', 'verificationStatus'],
  });

  if (!userVerify) {
    return next(new ErrorResponse('User verification detail not found'));
  }

  userVerify.verificationStatus = 'requested';
  await userVerify.save();

  let modifiedUserVerify = null;
  modifiedUserVerify = {
    ...userVerify.dataValues,
    idCard: userVerify.idCard ? 'uploaded' : userVerify.idCard,
    selfie: userVerify.selfie ? 'uploaded' : userVerify.selfie,
  };

  await createNotification(
    req.user.id,
    'admin_new_verification_request',
    `User ${user.username} (${user.id}) has submitted a verification request.`,
    'UserVerify',
    userVerify.id
  );  
  
  res.status(200).json({ success: true, userVerify: modifiedUserVerify });
  
});


const welcomeEmail = async (email, name) => {
  const subject = 'Welcome to tapWint!'
  const message = 'Welcome to tapWint! We are excited to have you on board.'
  const html = `
    <html>
      <head>
        <style>
          body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            background-color: #f8f8f8;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 5px auto;
            background-color: #ffffff;
            padding: 2px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          .header {
            text-align: center;
            padding: 2px;
            color: #007bff;
          }
          .header img {
            max-width: 120px;
            margin-bottom: 1px;
          }
          .content {
            padding: 5px;
            color: #333333;
          }
          .content h1 {
            color: #007bff;
            font-size: 24px;
            margin-bottom: 20px;
          }
          .content p {
            color: #555555;
            line-height: 1.6;
            margin-bottom: 20px;
          }
          .content a {
            color: #007bff;
            text-decoration: none;
          }
          .content ul {
            list-style-type: none;
            padding: 0;
            margin: 20px 0;
          }
          .content ul li {
            background: #f9f9f9;
            padding: 10px 15px;
            margin-bottom: 10px;
            border-left: 4px solid #007bff;
            border-radius: 5px;
          }
          .cta {
            text-align: center;
            margin: 30px 0;
          }
          .cta a {
            background-color: #007bff;
            color: #ffffff;
            padding: 12px 25px;
            text-decoration: none;
            border-radius: 5px;
            font-size: 16px;
            transition: background-color 0.3s ease;
            display: inline-block;
          }
          .cta a:hover {
            background-color: #0056b3;
          }
          .footer {
            text-align: center;
            padding: 20px;
            color: #888888;
            font-size: 12px;
            border-top: 1px solid #eeeeee;
          }
          .footer a {
            color: #007bff;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://api.tapwint.com/public/uploads/default/logo.png" alt="tapWint Logo">
            <h2>Welcome to tapWint, ${name}!</h2>
          </div>
          <div class="content">
            <p style="margin-top: 0;">Thank you for registering with us. We are thrilled to have you join our community.</p>
            <p>Here are some links to get you started:</p>
            <ul>
              <li><a href="https://www.tapwint.com/structure/home">Discover tapWint Structure</a></li>        
              <li><a href="https://www.tapwint.com/services/home">Explore tapWint Services</a></li>
              <li><a href="https://www.tapwint.com/forum/home">Visit tapWint Forums</a></li>
            </ul>
            <p>Position yourself within the tapWint Structure to influence policy direction, shape election outcomes, and impact other key decisions—all for the benefit of the common man.</p>        
            <p>Join our forums to share your insights, ask questions, and help fellow members. Your input can make a difference!</p>
            <p>We encourage you to add your services to tapWint to attract more customers. Please ensure that your services are either mobile or offer delivery options.</p>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <br><p>Best regards,<br>The tapWint Team</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} tapWint. All rights reserved.</p>
            <p><a href="https://www.tapwint.com/privacy-policy">Privacy Policy</a> | <a href="https://www.tapwint.com/terms">Terms of Service</a></p>
          </div>
        </div>
      </body>
    </html>
  `
  try {
    await sendEmail({
      email: email,
      subject: subject,
      message: message,
      html: html      
    })
  } catch (error) {
    console.error('Error sending welcome email:', error)
  }  
}

const getUsersOrderedByRecentVisit = async (startIndex, pageSize, whereCondition) => {
  const result = await models.User.findAndCountAll({
    attributes: [
        'id',
        'username',
        'profilePhoto',
        'verified',
        'state',
        'plan',
        'businessName',      
        'service',                       
        'country',           
        'address',           
        'biodata',           
        'email',             
        'phoneNumber',       
        'firstName',         
        'lastName',          
        'phoneNumberStatus', 
        'verificationStage', 
        'coverPhoto',     
        'video',           
        'viewsCount',
        'createdAt'       
    ],
    where: { [Op.and]: [whereCondition, { suspended: 0 }, { locked: 0 }, { deleted: 0 }] },
    include: [{ model: models.PageVisit, as: 'pageVisits', attributes: [] }],
    order: [
      ['verified', 'DESC'],
      [models.sequelize.literal(`
        CASE 
          WHEN plan = 'premium' THEN 1 
          WHEN plan = 'standard' THEN 2 
          WHEN plan = 'partner' THEN 3 
          WHEN plan = 'basic' THEN 4 
          ELSE 5 
        END
      `), 'ASC'],
      [models.sequelize.literal(`
        (SELECT MAX(\`visitedAt\`) 
         FROM \`PageVisits\` 
         WHERE \`PageVisits\`.\`userId\` = \`User\`.\`id\`)
      `), 'DESC']
    ],
    offset: startIndex,
    limit: pageSize,
  });    

  const totalCount = await models.User.count({
    where: { [Op.and]: [whereCondition, { suspended: 0 }, { locked: 0 }, { deleted: 0 }] },
  });

  return { count: totalCount, rows: result.rows };  
};


exports.addConnection = async (req, res) => {
  try {
    const { userId1, userId2 } = req.body;

    if (userId1 === userId2) {
      return res.status(400).json({ message: "Cannot connect a user to themselves." });
    }

    const existingConnection = await models.UserConnection.findOne({
      where: {
        [Op.or]: [
          { userId1, userId2 },
          { userId1: userId2, userId2: userId1 },
        ]
      }
    });

    if (existingConnection) {
      return res.status(400).json({ message: "Connection already exists." });
    }

    const newConnection = await models.UserConnection.create({ userId1, userId2 });
    res.status(201).json(newConnection);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
};

exports.removeConnection = async (req, res) => {
  try {
    const { userId1, userId2 } = req.body;

    const deleted = await models.UserConnection.destroy({
      where: {
        [Op.or]: [
          { userId1, userId2 },
          { userId1: userId2, userId2: userId1 },
        ]
      }
    });

    if (!deleted) {
      return res.status(404).json({ message: "Connection not found." });
    }

    res.status(200).json({ message: "Connection removed." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
};
