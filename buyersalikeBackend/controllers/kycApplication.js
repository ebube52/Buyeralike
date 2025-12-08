const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const models = require('../models');
const { createNotification } = require('../utils/notificationService');

// Define the exact fields to be returned from the KycApplication model in retrieval functions.
const KYC_APPLICATION_ATTRIBUTES = [
    'id',
    'userId', // Needed for application context
    'status',
    'serviceType',
    'documentUrls',
    'fullLegalCompanyName',
    'streetNumber',
    'streetName',
    'city',
    'province',
    'postalCode',
    'country',
    'adminNotes',
    'reviewedAt',
    // 'reviewedBy',
    'createdAt',
    'updatedAt',
];
// Define the exact fields for the related User model (applicant)
const APPLICANT_ATTRIBUTES = ['id', 'username', 'email', 'role'];

const REVIEWER_ATTRIBUTES = ['username', 'email'];

// @desc Submit a new KYC application
// @route POST /api/v1/kyc
// @access Private (Authenticated User)
exports.submitKycApplication = asyncHandler(async (req, res, next) => {
  const {
    serviceType, documentUrls,
    fullLegalCompanyName, streetNumber, streetName, city, province, postalCode, country
  } = req.body;

  if (!req.user || !req.user.id) {
    return next(new ErrorResponse('Not authorized to submit KYC applications', 401));
  }

  if (!fullLegalCompanyName || !streetNumber || !streetName || !city || !province || !postalCode || !country) {
    return next(new ErrorResponse('Missing required company and address fields.', 400));
  }

  const existingPendingApplication = await models.KycApplication.findOne({
    where: {
      userId: req.user.id,
      status: 'pending',
      fullLegalCompanyName,
      streetNumber,
      streetName,
      city,
      province,
      postalCode,
      country,
    }
  });

  if (existingPendingApplication) {
    return next(new ErrorResponse('You already have a pending KYC application.', 400));
  }

  const kycApplication = await models.KycApplication.create({
    userId: req.user.id,
    serviceType,
    documentUrls,
    status: 'pending',
    fullLegalCompanyName,
    streetNumber,
    streetName,
    city,
    province,
    postalCode,
    country,
  });

  await createNotification(
      req.user.id,
      'kyc_application_submission',
      `New KYC Application submitted by ${req.user.username} for service: ${serviceType}.`,
      'KycApplication',
      kycApplication.id
  );

  res.status(201).json({
    success: true,
    data: kycApplication,
    message: 'KYC application submitted successfully. Please await admin review.'
  });
});

// @desc Get all KYC applications (Admin only)
// @route GET /api/v1/kyc
// @access Private (Admin)
exports.getAllKycApplications = asyncHandler(async (req, res, next) => {
  if (!req.user || !req.user.role || !['adminL5', 'superadmin'].includes(req.user.role)) {
    return next(new ErrorResponse('Not authorized to view all KYC applications', 403));
  }

  const applications = await models.KycApplication.findAll({
    attributes: KYC_APPLICATION_ATTRIBUTES,
    order: [['createdAt', 'DESC']],
    include: [
      {
        model: models.User,
        as: 'applicant',
        attributes: APPLICANT_ATTRIBUTES,
      },
      {
          model: models.User,
          as: 'reviewer',
          attributes: REVIEWER_ATTRIBUTES,
          required: false,
      } 
    ],
  });

  // const applicationsWithApplicantInfo = applications.map(app => ({
  //   ...app.toJSON(),
  //   applicant: app.applicant ? {
  //     id: app.applicant.id,
  //     username: app.applicant.username,
  //     email: app.applicant.email,
  //     role: app.applicant.role,
  //   } : null,
  // }));
  
  const applicationsWithApplicantInfo = applications.map(app => {
    const appJson = app.toJSON();
    return {
      ...appJson,
      reviewedUsername: appJson.reviewer ? appJson.reviewer.username : null,
      reviewedBy: appJson.reviewer ? appJson.reviewer.email : null,
      reviewer: undefined, 
      applicant: app.applicant ? {
        id: app.applicant.id,
        username: app.applicant.username,
        email: app.applicant.email,
        role: app.applicant.role,
      } : null,
    };
  });

  res.status(200).json({
    success: true,
    count: applicationsWithApplicantInfo.length,
    data: applicationsWithApplicantInfo,
  });
});

// @desc Get a single KYC application by ID (Admin only)
// @route GET /api/v1/kyc/:id
// @access Private (Admin)
exports.getKycApplication = asyncHandler(async (req, res, next) => {
  if (!req.user || !req.user.role || !['adminL5', 'superadmin'].includes(req.user.role)) {
    return next(new ErrorResponse('Not authorized to view this KYC application', 403));
  }

  const application = await models.KycApplication.findByPk(req.params.id, {
    attributes: KYC_APPLICATION_ATTRIBUTES,
    include: [
      {
        model: models.User,
        as: 'applicant',
        attributes: APPLICANT_ATTRIBUTES,
      },
      {
        model: models.User,
        as: 'reviewer',
        attributes: REVIEWER_ATTRIBUTES,
        required: false,
      }
    ],
  });

  if (!application) {
    return next(new ErrorResponse(`KYC application not found with id of ${req.params.id}`, 404));
  }

  // res.status(200).json({
  //   success: true,
  //   data: {
  //     ...application.toJSON(),
  //     applicant: application.applicant ? {
  //       id: application.applicant.id,
  //       username: application.applicant.username,
  //       email: application.applicant.email,
  //       role: application.applicant.role,
  //     } : null,
  //   }
  // });
  const appJson = application.toJSON();

  res.status(200).json({
    success: true,
    data: {
      ...appJson,
      reviewedUsername: appJson.reviewer ? appJson.reviewer.username : null,
      reviewedBy: appJson.reviewer ? appJson.reviewer.email : null,
      reviewer: undefined, 
      applicant: appJson.applicant ? {
        id: appJson.applicant.id,
        username: appJson.applicant.username,
        email: appJson.applicant.email,
        role: appJson.applicant.role,
      } : null,
    }
  });

});

// @desc Get KYC applications for a specific user (Authenticated User/Admin)
// @route GET /api/v1/kyc/user/:userId
// @access Private (Authenticated User - self, or Admin - others)
exports.getKycApplicationsByUserId = asyncHandler(async (req, res, next) => {
  // Ensure the user is logged in
  if (!req.user || !req.user.id) {
    return next(new ErrorResponse('Not authorized to access KYC applications.', 401));
  }

  // Security check: A regular user can only access their own applications.
  const requestedUserId = req.params.userId;
  const loggedInUserId = req.user.id;
  const isAdmin = req.user.role && (req.user.role === 'adminL5');

  if (requestedUserId !== loggedInUserId && !isAdmin) {
    return next(new ErrorResponse('Not authorized to view other users\' KYC applications.', 403));
  }

  const applications = await models.KycApplication.findAll({
    attributes: KYC_APPLICATION_ATTRIBUTES,
    where: {
      userId: requestedUserId,
    },
    order: [['createdAt', 'DESC']],
    include: [
      {
        model: models.User,
        as: 'applicant',
        attributes: APPLICANT_ATTRIBUTES,
      },
      {
        model: models.User,
        as: 'reviewer',
        attributes: REVIEWER_ATTRIBUTES,
        required: false,
      }    
    ],
  });

  // const applicationsWithApplicantInfo = applications.map(app => ({
  //   ...app.toJSON(),
  //   applicant: app.applicant ? {
  //     id: app.applicant.id,
  //     username: app.applicant.username,
  //     email: app.applicant.email,
  //     role: app.applicant.role,
  //   } : null,
  // }));

  const applicationsWithApplicantInfo = applications.map(app => {
    const appJson = app.toJSON();
    return {
      ...appJson,
      reviewedUsername: appJson.reviewer ? appJson.reviewer.username : null,
      reviewedBy: appJson.reviewer ? appJson.reviewer.email : null,
      reviewer: undefined,
      applicant: app.applicant ? {
        id: app.applicant.id,
        username: app.applicant.username,
        email: app.applicant.email,
        role: app.applicant.role,
      } : null,
    };
  });

  res.status(200).json({
    success: true,
    count: applicationsWithApplicantInfo.length,
    data: applicationsWithApplicantInfo,
  });
});

// @desc Update KYC application status (Approve/Reject) and user role (Admin only)
// @route PUT /api/v1/kyc/:id
// @access Private (Admin)
exports.updateKycApplicationStatus = asyncHandler(async (req, res, next) => {
  const { status, adminNotes } = req.body;

  if (!req.user || !req.user.role || !req.user.role.includes('admin')) {
    return next(new ErrorResponse('Not authorized to update KYC applications', 403));
  }

  const kycApplication = await models.KycApplication.findByPk(req.params.id);

  if (!kycApplication) {
    return next(new ErrorResponse(`KYC application not found with id of ${req.params.id}`, 404));
  }

  if (!['approved', 'pending', 'rejected'].includes(status)) {
    return next(new ErrorResponse('Invalid status provided. Must be "approved", "pending" or "rejected".', 400));
  }

  // Update the KYC application
  kycApplication.status = status;
  kycApplication.adminNotes = adminNotes || null;
  kycApplication.reviewedAt = new Date();
  kycApplication.reviewedBy = req.user.id;
  await kycApplication.save();

  const userToUpdate = await models.User.findByPk(kycApplication.userId);

  if (!userToUpdate) {
    return next(new ErrorResponse('User associated with this KYC application not found.', 404));
  }

  let notificationMessage;
  if (status === 'approved') {
    notificationMessage = `KYC application for '${kycApplication.serviceType}' has been approved. Role has been updated to '${kycApplication.serviceType}'.`;
  } else if (status === 'pending') {
    notificationMessage = `KYC application for '${kycApplication.serviceType}' is pending. Admin notes: ${adminNotes || 'No specific notes provided.'}`;
  } else if (status === 'rejected') {
    notificationMessage = `KYC application for '${kycApplication.serviceType}' has been rejected. Admin notes: ${adminNotes || 'No specific notes provided.'}`;
  }

  await createNotification(
      userToUpdate.id,
      'kyc_status_update',
      notificationMessage,
      'KycApplication',
      kycApplication.id
  );

  res.status(200).json({
    success: true,
    data: kycApplication,
    message: `KYC application status updated to ${status}. User role updated if approved.`,
  });
});


// @desc Get all approved KYC applications (Admin only)
// @route GET /api/v1/kyc/approved
// @access Private (Admin)
exports.getApprovedKycApplications = asyncHandler(async (req, res, next) => {
  // if (!req.user || !req.user.role || !['adminL5', 'superadmin'].includes(req.user.role)) {
  //   return next(new ErrorResponse('Not authorized to view approved KYC applications', 403));
  // }

  const applications = await models.KycApplication.findAll({
    attributes: KYC_APPLICATION_ATTRIBUTES,
    where: {
      status: 'approved'
    },
    order: [['reviewedAt', 'DESC']],
    include: [{
      model: models.User,
      as: 'applicant',
      attributes: APPLICANT_ATTRIBUTES,
    },
    {
      model: models.User,
      as: 'reviewer',
      attributes: REVIEWER_ATTRIBUTES,
      required: false,
    }    
  ],
  });

  // const applicationsWithApplicantInfo = applications.map(app => ({
  //   ...app.toJSON(),
  //   applicant: app.applicant ? {
  //     id: app.applicant.id,
  //     username: app.applicant.username,
  //     email: app.applicant.email,
  //     role: app.applicant.role,
  //   } : null,
  // }));

  const applicationsWithApplicantInfo = applications.map(app => {
    const appJson = app.toJSON();
    return {
      ...appJson,
      reviewedUsername: appJson.reviewer ? appJson.reviewer.username : null,
      reviewedBy: appJson.reviewer ? appJson.reviewer.email : null,
      reviewer: undefined,
      applicant: app.applicant ? {
        id: app.applicant.id,
        username: app.applicant.username,
        email: app.applicant.email,
        role: app.applicant.role,
      } : null,
    };
  });

  res.status(200).json({
    success: true,
    count: applicationsWithApplicantInfo.length,
    data: applicationsWithApplicantInfo,
  });
});

// @desc Get all rejected KYC applications (Admin only)
// @route GET /api/v1/kyc/rejected
// @access Private (Admin)
exports.getRejectedKycApplications = asyncHandler(async (req, res, next) => {
  if (!req.user || !req.user.role || !['adminL5', 'superadmin'].includes(req.user.role)) {
    return next(new ErrorResponse('Not authorized to view rejected KYC applications', 403));
  }

  const applications = await models.KycApplication.findAll({
    attributes: KYC_APPLICATION_ATTRIBUTES,
    where: {
      status: 'rejected'
    },
    order: [['reviewedAt', 'DESC']],
    include: [
      {
        model: models.User,
        as: 'applicant',
        attributes: APPLICANT_ATTRIBUTES,
      },
      {
        model: models.User,
        as: 'reviewer',
        attributes: REVIEWER_ATTRIBUTES,
        required: false,
      }    
    ],
  });

  // const applicationsWithApplicantInfo = applications.map(app => ({
  //   ...app.toJSON(),
  //   applicant: app.applicant ? {
  //     id: app.applicant.id,
  //     username: app.applicant.username,
  //     email: app.applicant.email,
  //     role: app.applicant.role,
  //   } : null,
  // }));
  
  const applicationsWithApplicantInfo = applications.map(app => {
    const appJson = app.toJSON();
    return {
      ...appJson,
      reviewedUsername: appJson.reviewer ? appJson.reviewer.username : null,
      reviewedBy: appJson.reviewer ? appJson.reviewer.email : null,
      reviewer: undefined,
      applicant: app.applicant ? {
        id: app.applicant.id,
        username: app.applicant.username,
        email: app.applicant.email,
        role: app.applicant.role,
      } : null,
    };
  });

  res.status(200).json({
    success: true,
    count: applicationsWithApplicantInfo.length,
    data: applicationsWithApplicantInfo,
  });
});

// const asyncHandler = require('../middleware/async');
// const ErrorResponse = require('../utils/errorResponse');
// const models = require('../models');
// const { createNotification } = require('../utils/notificationService');


// // @desc    Submit a new KYC application
// // @route   POST /api/v1/kyc
// // @access  Private (Authenticated User)
// exports.submitKycApplication = asyncHandler(async (req, res, next) => {
//   const { 
//     serviceType, documentUrls, 
//     fullLegalCompanyName, streetNumber, streetName, city, province, postalCode, country 
//   } = req.body;

//   if (!req.user || !req.user.id) {
//     return next(new ErrorResponse('Not authorized to submit KYC applications', 401));
//   }

//   // if (!fullLegalCompanyName || !streetName || !city || !province || !postalCode || !country) {
//   //   return next(new ErrorResponse('Missing required company and address fields.', 400));
//   // }
//   if (!fullLegalCompanyName || !streetNumber || !streetName || !city || !province || !postalCode || !country) {
//     return next(new ErrorResponse('Missing required company and address fields.', 400));
//   }
  
//   const existingPendingApplication = await models.KycApplication.findOne({
//     where: {
//       userId: req.user.id,
//       status: 'pending',
//       fullLegalCompanyName,
//       streetNumber,
//       streetName,
//       city,
//       province,
//       postalCode,
//       country,  
//     }
//   });

//   if (existingPendingApplication) {
//     return next(new ErrorResponse('You already have a pending KYC application.', 400));
//   }

//   const kycApplication = await models.KycApplication.create({
//     userId: req.user.id,
//     serviceType,
//     documentUrls,
//     status: 'pending',
//     fullLegalCompanyName,
//     streetNumber,
//     streetName,
//     city,
//     province,
//     postalCode,
//     country,
//   });

//   await createNotification(
//       req.user.id, 
//       'kyc_application_submission', 
//       `New KYC Application submitted by ${req.user.username} for service: ${serviceType}.`,
//       'KycApplication', 
//       kycApplication.id 
//   );

//   res.status(201).json({
//     success: true,
//     data: kycApplication,
//     message: 'KYC application submitted successfully. Please await admin review.'
//   });
// });

// // @desc    Get all KYC applications (Admin only)
// // @route   GET /api/v1/kyc
// // @access  Private (Admin)
// exports.getAllKycApplications = asyncHandler(async (req, res, next) => {
//   // Assuming 'adminL5' is a specific role string that includes 'admin' check.
//   // Or, you might check `req.user.role.includes('admin')` if roles are an array.
//   // If authorize('adminL5') middleware is robust, this explicit check might be redundant.
//   // Example: if (req.user.role !== 'adminL5') { ... }
//   // Or even better, ensure your `authorize` middleware handles different admin levels.
//   if (!req.user || !req.user.role || !['adminL5', 'superadmin'].includes(req.user.role)) { // Example more robust check
//       return next(new ErrorResponse('Not authorized to view all KYC applications', 403));
//   }

//   const applications = await models.KycApplication.findAll({
//     order: [['createdAt', 'DESC']],
//     include: [{
//       model: models.User,
//       as: 'applicant',
//       attributes: ['id', 'username', 'email', 'role'],
//     }],
//   });

//   const applicationsWithApplicantInfo = applications.map(app => ({
//     ...app.toJSON(),
//     applicant: app.applicant ? {
//       id: app.applicant.id,
//       username: app.applicant.username,
//       email: app.applicant.email,
//       role: app.applicant.role,
//     } : null,
//   }));

//   res.status(200).json({
//     success: true,
//     count: applicationsWithApplicantInfo.length,
//     data: applicationsWithApplicantInfo,
//   });
// });

// // @desc    Get a single KYC application by ID (Admin only)
// // @route   GET /api/v1/kyc/:id
// // @access  Private (Admin)
// exports.getKycApplication = asyncHandler(async (req, res, next) => {
//   if (!req.user || !req.user.role || !['adminL5', 'superadmin'].includes(req.user.role)) { // Example more robust check
//     return next(new ErrorResponse('Not authorized to view this KYC application', 403));
//   }

//   const application = await models.KycApplication.findByPk(req.params.id, {
//     include: [{
//       model: models.User,
//       as: 'applicant',
//       attributes: ['id', 'username', 'email', 'role'],
//     }],
//   });

//   if (!application) {
//     return next(new ErrorResponse(`KYC application not found with id of ${req.params.id}`, 404));
//   }

//   res.status(200).json({
//     success: true,
//     data: {
//       ...application.toJSON(),
//       applicant: application.applicant ? {
//         id: application.applicant.id,
//         username: application.applicant.username,
//         email: application.applicant.email,
//         role: application.applicant.role,
//       } : null,
//     }
//   });
// });

// // @desc    Get KYC applications for a specific user (Authenticated User/Admin)
// // @route   GET /api/v1/kyc/user/:userId
// // @access  Private (Authenticated User - self, or Admin - others)
// exports.getKycApplicationsByUserId = asyncHandler(async (req, res, next) => {
//   // Ensure the user is logged in
//   if (!req.user || !req.user.id) {
//     return next(new ErrorResponse('Not authorized to access KYC applications.', 401));
//   }

//   // Security check: A regular user can only access their own applications.
//   // An admin can access anyone's.
//   const requestedUserId = req.params.userId;
//   const loggedInUserId = req.user.id;
//   const isAdmin = req.user.role && (req.user.role === 'adminL5'); // Adjust based on your role structure

//   if (requestedUserId !== loggedInUserId && !isAdmin) {
//     return next(new ErrorResponse('Not authorized to view other users\' KYC applications.', 403));
//   }

//   const applications = await models.KycApplication.findAll({
//     where: {
//       userId: requestedUserId,
//     },
//     order: [['createdAt', 'DESC']], // Order by most recent first
//     include: [{
//       model: models.User,
//       as: 'applicant',
//       attributes: ['id', 'username', 'email'], // Only necessary user details
//     }],
//   });

//   // If a non-admin user requests their own ID but no applications are found,
//   // it's not a 404 error but simply an empty array.
//   // If an admin requests a user ID that doesn't exist, it's also an empty array.

//   const applicationsWithApplicantInfo = applications.map(app => ({
//     ...app.toJSON(),
//     applicant: app.applicant ? {
//       id: app.applicant.id,
//       username: app.applicant.username,
//       email: app.applicant.email,
//     } : null,
//   }));

//   res.status(200).json({
//     success: true,
//     count: applicationsWithApplicantInfo.length,
//     data: applicationsWithApplicantInfo,
//   });
// });


// // @desc    Update KYC application status (Approve/Reject) and user role (Admin only)
// // @route   PUT /api/v1/kyc/:id
// // @access  Private (Admin)
// exports.updateKycApplicationStatus = asyncHandler(async (req, res, next) => {
//   const { status, adminNotes } = req.body;

//   if (!req.user || !req.user.role || !req.user.role.includes('admin')) { 
//     return next(new ErrorResponse('Not authorized to update KYC applications', 403));
//   }

//   const kycApplication = await models.KycApplication.findByPk(req.params.id);

//   if (!kycApplication) {
//     return next(new ErrorResponse(`KYC application not found with id of ${req.params.id}`, 404));
//   }

//   if (!['approved', 'pending', 'rejected'].includes(status)) {
//     return next(new ErrorResponse('Invalid status provided. Must be "approved", "pending" or "rejected".', 400));
//   }

//   // Update the KYC application
//   kycApplication.status = status;
//   kycApplication.adminNotes = adminNotes || null;
//   kycApplication.reviewedAt = new Date();
//   kycApplication.reviewedBy = req.user.id;
//   await kycApplication.save();

//   const userToUpdate = await models.User.findByPk(kycApplication.userId);

//   if (!userToUpdate) {
//     return next(new ErrorResponse('User associated with this KYC application not found.', 404));
//   }

//   let notificationMessage;
//   if (status === 'approved') {
//     notificationMessage = `KYC application for '${kycApplication.serviceType}' has been approved. Role has been updated to '${kycApplication.serviceType}'.`;
//   } else if (status === 'pending') {
//     notificationMessage = `KYC application for '${kycApplication.serviceType}' is pending. Admin notes: ${adminNotes || 'No specific notes provided.'}`;
//   } else if (status === 'rejected') {
//     notificationMessage = `KYC application for '${kycApplication.serviceType}' has been rejected. Admin notes: ${adminNotes || 'No specific notes provided.'}`;
//   }  

//   await createNotification(
//     userToUpdate.id,
//     'kyc_status_update',
//     notificationMessage,
//     'KycApplication',
//     kycApplication.id
//   );

//   res.status(200).json({
//     success: true,
//     data: kycApplication,
//     message: `KYC application status updated to ${status}. User role updated if approved.`,
//   });
// });