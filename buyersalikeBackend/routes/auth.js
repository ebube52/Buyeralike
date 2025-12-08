const express = require('express')
const router = express.Router()
const UserValidator = require('../validator/UserValidator')

const userValidator = new UserValidator();

const {
  register,
  login,
  confirmOtp,
  requestOtp,  
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  updateDetails,
  uploadChannelAvatar,
  updatePassword
} = require('../controllers/auth')

const { protect } = require('../middleware/auth')

router.post('/register', register)
router.post('/login', login)
router.post('/confirm-otp', confirmOtp);
router.post('/request-otp', requestOtp);
router.post('/logout', logout)
router.put('/updatepassword', protect, updatePassword)
router.post('/forgotpassword', forgotPassword)
router.post('/resetpassword', resetPassword)

module.exports = router
