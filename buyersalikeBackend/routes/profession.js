// routes/profession.js
const express = require('express');
const {
  createProfession,
  getProfessions,
  getProfession,
  updateProfession,
  deleteProfession,
} = require('../controllers/profession');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(getProfessions)
  .post(protect, authorize('adminL5'), createProfession);

router.route('/:id')
  .get(getProfession)
  .put(protect, authorize('adminL5'), updateProfession)
  .delete(protect, authorize('adminL5'), deleteProfession);

module.exports = router;