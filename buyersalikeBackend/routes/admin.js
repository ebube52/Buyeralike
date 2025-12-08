const express = require('express')
const {
  confirmAdmin,
  getRecords,
  getRecordById,
  updateRecordById,
  deleteRecordById,
} = require('../controllers/admin')

const router = express.Router({ mergeParams: true })
const handleQueryParams = require('../middleware/handleQueryParams');
const { protect, authorize } = require('../middleware/auth')

router
  .route('/')
  .get(protect, authorize('adminL1', 'adminL2', 'adminL3', 'adminL4', 'adminL5'),confirmAdmin)

router
  .route('/:type')
  .get(protect, authorize('adminL1', 'adminL2', 'adminL3', 'adminL4', 'adminL5'),handleQueryParams,getRecords)

router
  .route('/:type/:id')
  .get(protect, authorize('admin'),getRecordById)
  .put(protect, authorize('adminL5'),updateRecordById)
  .delete(protect, authorize('adminL5'),deleteRecordById)

module.exports = router
