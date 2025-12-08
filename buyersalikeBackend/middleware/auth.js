const jwt = require('jsonwebtoken')
const asyncHandler = require('./async')
const ErrorResponse = require('../utils/errorResponse')
const models = require('../models');


exports.checkAuth = asyncHandler(async (req, res, next) => {
  let token

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1]
  }

  let userVerified = false;
  let adminVerified = false;
  
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await models.User.findByPk(decoded.id);
    if (req.user.role === "user") {
        userVerified = true;
    }
  } catch (userError) {
  }
  
  try {
    if (!userVerified) {
        decoded = jwt.verify(token, process.env.JWT_SECRET_ADMIN);
        req.user = await models.User.findByPk(decoded.id);
        if (req.user.role.includes("admin")) {
            adminVerified = true;
        }
    }
  } catch (adminError) {
  }
  
  next(); 
})

exports.protect = asyncHandler(async (req, res, next) => {
  let token

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1]
  }
  // Set token from cookie
  // else if (req.cookies.token) {
  //   token = req.cookies.token
  // }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
  }

  try {
    // Verify token
    let decoded;
    let userVerified = false;
    let adminVerified = false;
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await models.User.findByPk(decoded.id);

      if (req.user && (req.user.deleted === true || req.user.suspended === true)) {
        return res.status(401).json({ success: false, error: 'Your account has been deactivated. Please sign out.' });
      }

      if (req.user && req.user.role === "user") {
        userVerified = true;
      }      
    } catch (userError) {
    }
    
    try {
      if (!userVerified) {
        decoded = jwt.verify(token, process.env.JWT_SECRET_ADMIN);
        req.user = await models.User.findByPk(decoded.id);
        
        if (req.user && (req.user.deleted === true || req.user.suspended === true)) {
          return res.status(401).json({ success: false, error: 'Your account has been deactivated. Please sign out.' });
        }

        if (req.user && req.user.role.includes("admin")) {
          adminVerified = true;
        }
      }
    } catch (adminError) {
    }
    
    if (!userVerified && !adminVerified) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    next(); 
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
  }
})

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error:  `User role ${req.user.role} is not authorized to access this route` 
      });
    }
    next()
  }
}