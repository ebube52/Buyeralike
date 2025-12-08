const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth'); // Your existing auth middleware

const {
  submitKycApplication,
  getAllKycApplications,
  getKycApplication, // Admin: Get by application ID
  updateKycApplicationStatus, // Admin: Update by application ID
  getKycApplicationsByUserId, // NEW: Get applications for a specific user ID
  getApprovedKycApplications, // Admin: Get all approved applications
  // getRejectedKycApplications,  
} = require('../controllers/kycApplication'); // Adjust path as necessary

// Public routes (if any, though for KYC, typically all are protected)
// router.route('/').get(getPublicKycInfo);

// Authenticated User routes
router.route('/').post(protect, submitKycApplication); // User submits KYC

// NEW: User can get their own KYC applications by their userId
// The backend controller will ensure req.params.userId matches req.user.id
router.route('/user/:userId') // This route is specifically for a user to fetch their own applications
  .get(protect, getKycApplicationsByUserId);

// Admin only routes
router.route('/')
  .get(protect, authorize('adminL5'), getAllKycApplications); // Admin gets all applications

router.route('/approved')
  .get(protect, getApprovedKycApplications); // Admin gets all approved applications

// router.route('/rejected')
//   .get(protect, authorize('adminL5'), getRejectedKycApplications); // Admin gets all rejected applications  

router.route('/:id')
  .get(protect, authorize('adminL5'), getKycApplication) // Admin gets single application by application ID
  .put(protect, authorize('adminL5'), updateKycApplicationStatus); // Admin updates status for application ID

module.exports = router;