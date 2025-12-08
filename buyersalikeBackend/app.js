const express = require('express')
const path = require('path')
const dotenv = require('dotenv')
const colors = require('colors')
const morgan = require('morgan')
const cookieParser = require('cookie-parser')
const mongoSanitize = require('express-mongo-sanitize')
//const fileupload = require('express-fileupload')
const helmet = require('helmet')
const xss = require('xss-clean')
const rateLimit = require('express-rate-limit')
const hpp = require('hpp')
const cors = require('cors')
//const { updateCacheKeys } = require('./helper/cacheUpdater');
const socketIo = require('socket.io') // Keep this import for type hinting or other uses

const errorHandler = require('./middleware/error')
const DBConnection = require('./config/db')
const socketHandler = require('./socketHandler'); // Import the socket handler

dotenv.config({ path: './config/.env' })

DBConnection()

const authRoutes = require('./routes/auth')
const userRoutes = require('./routes/user')
const forumCommentRoutes = require('./routes/forumComment')
const tapSlugRoutes = require('./routes/tapSlug')
const forumCommentUserReactionRoutes = require('./routes/forumCommentUserReaction')
const uploadRoutes = require('./routes/upload')
const adminRoutes = require('./routes/admin')
const pageVisitRoutes = require('./routes/pageVisit')
const interestRoutes = require('./routes/interest')
const messageRoutes = require('./routes/message')
const connectionRoutes = require('./routes/connection')
const openingRoutes = require('./routes/openings')
const partnershipRoutes = require('./routes/partnerships');
const forumCategoryRoutes = require('./routes/forumCategory');
const openingCategoryRoutes = require('./routes/openingCategory');
const notificationRoutes = require('./routes/notification');
const professionRoutes = require('./routes/profession');
const kycRoutes = require('./routes/kyc');
const paymentRoutes = require('./routes/payment');
const contactFormRoutes = require('./routes/contactForm');
const recommenderRoutes = require('./routes/recommender');



const app = express()

//updateCacheKeys();

app.use(express.json())

app.use(express.urlencoded({ extended: true }));

//app.use(express.raw({ type: 'multipart/form-data' }));

app.use(cookieParser())

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

// File uploading
//app.use(
//  fileupload({
//    createParentPath: true,
//  })
//)

// Sanitize data
app.use(mongoSanitize())

// Set security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }  // same-site  cross-origin
  })
);

// Prevent XSS attacks
app.use(xss())

// Enable CORS
app.use(cors())

// Rate limiting
// const limiter = rateLimit({
//   windowMs: 10 * 60 * 1000, // 10 mins
//   max: 100 // 100 request per 10 mins
// })

// app.use(limiter)

// Prevent http param pollution
app.use(hpp())

app.use(express.static(path.join(__dirname, 'public')))

// app.use((req, res, next) => {
//   setTimeout(() => {
//     next()
//   }, 1000)
// })

// Socket.io setup
const server = app.listen(process.env.PORT, () => {
  console.log(`We are live on ${process.env.NODE_ENV} mode on port ${process.env.PORT}`.yellow.bold)
})

// Initialize Socket.io using the separate handler
socketHandler(server);

const versionOne = (routeName) => `/api/v1/${routeName}`

app.use(versionOne('auth'), authRoutes)
app.use(versionOne('user'), userRoutes)
app.use(versionOne('forumComment'), forumCommentRoutes)
app.use(versionOne('tapSlug'), tapSlugRoutes)
app.use(versionOne('forumCommentUserReaction'), forumCommentUserReactionRoutes)
app.use(versionOne('upload'), uploadRoutes)
app.use(versionOne('admin'), adminRoutes)
app.use(versionOne('pageVisit'), pageVisitRoutes)
app.use(versionOne('interest'), interestRoutes)
app.use(versionOne('message'), messageRoutes)
app.use(versionOne('connection'), connectionRoutes)
app.use(versionOne('openings'), openingRoutes)
app.use(versionOne('partnerships'), partnershipRoutes)
app.use(versionOne('forumCategory'), forumCategoryRoutes)
app.use(versionOne('openingCategory'), openingCategoryRoutes)
app.use(versionOne('notification'), notificationRoutes)
app.use(versionOne('profession'), professionRoutes)
app.use(versionOne('kyc'), kycRoutes)
app.use(versionOne('payment'), paymentRoutes)
app.use(versionOne('contactForm'), contactFormRoutes)
app.use(versionOne('recommender'), recommenderRoutes)

app.use(errorHandler)

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`.red)
  // Close server & exit process
  server.close(() => process.exit(1))
})