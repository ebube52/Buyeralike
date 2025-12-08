const express = require('express');
const {
  fetchAndCreateOpenings,
  createOpening,
  getOpenings,
  getOpeningsForEveryone,
  getOpening,
  updateOpening,
  deleteOpening,
  getUserOpenings, 
  // approveOpening, 
  // rejectOpening, 
  closeOpening
} = require('../controllers/openings');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(protect, getOpenings) 
  .post(protect, createOpening); 

router.route('/automate')
    .post(protect, authorize('adminL5'), fetchAndCreateOpenings); 

router.route('/all')
  .get(/*protect,*/ getOpeningsForEveryone);   

router.route('/:id')
  .get(protect, getOpening)
  .put(protect, updateOpening)
  .delete(protect, deleteOpening);

// router.route('/:id/approve')
//   .put(protect, authorize('adminL5'), approveOpening);

// router.route('/:id/reject')
//   .put(protect, authorize('adminL5'), rejectOpening);

router.route('/:id/close')
  .put(protect, authorize('adminL5'), closeOpening);  

router.route('/user/:userId')
  .get(protect, getUserOpenings);

module.exports = router;