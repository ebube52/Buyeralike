const express = require('express')
const {
  register,
  getUser,
  getPublicProfileByUsername,
  getUserBySlug,
  getUsersByIdsPutInBody,
  updateUser,
  deleteUser,
  getUserVerificationDetail,
  verifyUser,
  getUserById
} = require('../controllers/user')

//const User = require('../models/User')

const router = express.Router({ mergeParams: true })

//const advancedResults = require('../middleware/advancedResults')
const { checkAuth, protect, authorize } = require('../middleware/auth')

router
  .route('/')
  //.get(/*protect, authorize('admin'),*/ advancedResults(User), getUsers)
  .post(/*protect, authorize('admin'),*/ getUsersByIdsPutInBody)

router
  .route('/:hiDee')
  .get(checkAuth, getUser)
  .put(protect, /*authorize('admin'),*/ updateUser)
  .delete(protect, authorize('adminL5'), deleteUser)

router
  .route('/iden/:hiDee')
  .get(checkAuth, getUserById)

router
  .route('/service/register')
  .post(register)

router.route('/public/:username')
  .get(getPublicProfileByUsername);  

router
  .route('/slg/:hiDee')
  .get(checkAuth, getUserBySlug)

router
  .route('/verify/detail/:hiDee')
  .get(protect, getUserVerificationDetail)

router
  .route('/verify/request/:hiDee')
  .post(protect, verifyUser)  

module.exports = router
