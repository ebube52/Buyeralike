// routes/partnershipRoutes.js
const express = require('express');
const {
  createPartnershipIntent,
  getPartnershipGroupsForOpening,
  createPartnershipGroup,
  joinPartnershipGroup,
  updatePartnershipGroupStatus,
  updateUserPartnershipStatus,
  getPartnershipGroup,
  getMyPartnerships,
  getAllPartnerships,
  withdrawOrLeavePartnership
} = require('../controllers/partnerships');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth'); // Adjust path as needed

// Public routes (if any, though partnerships typically require auth)

// User-specific partnerships
router.route('/all').get(protect, authorize('adminL5'), getAllPartnerships);
router.route('/me').get(protect, getMyPartnerships);
router.route('/me/:partnershipId/withdraw').put(protect, withdrawOrLeavePartnership);

// Partnership Intent (initial click)
router.route('/intent/:openingId').post(protect, createPartnershipIntent);

// Partnership Groups
router.route('/groups/:openingId')
  .get(protect, getPartnershipGroupsForOpening) // Get groups on an opening
  .post(protect, createPartnershipGroup);     // Create a new group

router.route('/groups/:groupId/join').post(protect, joinPartnershipGroup); // Join a group

router.route('/groups/:groupId/status').put(protect, updatePartnershipGroupStatus); // Update group status by creator/admin
router.route('/:partnershipId/status').put(protect, updateUserPartnershipStatus); // Approve/Decline user request by group creator/admin

router.route('/groups/:groupId/group').get(protect, getPartnershipGroup); // Get single group details

module.exports = router;