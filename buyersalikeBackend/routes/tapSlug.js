const express = require('express')
const {
  gettapSlug
} = require('../controllers/tapSlug')

const router = express.Router({ mergeParams: true })

router
  .route('/:username/:slug')
  .get(gettapSlug)

module.exports = router
