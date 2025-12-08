const crypto = require('crypto')
const path = require('path')
const asyncHandler = require('../middleware/async')
const ErrorResponse = require('../utils/errorResponse')
const sendEmail = require('../utils/sendEmail')
//const { User } = require('../models/User')
const { Op } = require('sequelize');
const models = require('../models');
const { urlencoded } = require('express')
const { createNotification } = require('../utils/notificationService');


// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  let { /*service, username,*/ email, password } = req.body;

  email = email.toLowerCase();

  const existingUser = await models.User.findOne({
    where: {
      [Op.or]: [ { email }]
    }
  });
  
  if (existingUser) {
    return res.status(400).json({ success: false, error: 'Email already exists' });
  }  

  const user = await models.User.create({
    service: '',
    username: email.slice(0, 5).replace(/[^a-zA-Z0-9]/g, ''),
    email,
    password,
    country: '',
    state: '',
    lga: '',
    address: '',
    businessName: email,
    phoneNumber: '',
    biodata: '',
    video: '',
    verificationStage: 0,
    usernames: email,
    suspensionTime: new Date(),
    verifiedTime: new Date(),
    lockedTime: new Date(),
    planTime: new Date(),
    deleteTime: new Date(),
    roleTime: new Date(),
    isEmailVerified: false
  });

  // welcomeEmail(email, username);
  // sendTokenResponse(user, 200, res);

  const plainOtpForEmail = user.getOtp(); // Generate OTP and store hashed version + expiry on user model
  await user.save(); // Save the user with OTP details

  try {
    const message = `Please use the following One-Time Password (OTP) to verify your account: ${plainOtpForEmail}. This OTP is valid for 10 minutes.`;

    await sendEmail({
      email: user.email,
      subject: 'Verify Your Account - OTP',
      message,
    });

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email. Please verify your account to log in.',
      userId: user.id
    });
  } catch (err) {
    console.error(err);
    user.otp = undefined; // Clear OTP fields if email sending fails
    user.otpExpires = undefined;
    await user.save();
    return next(new ErrorResponse('Email could not be sent. Please try again later.', 500));
  }

  await createNotification(
    'admin', // Assuming 'admin' is a special userId or role that receives all admin-related notifications
    'new_user_registration',
    `New user registered: ${user.username} (${user.email}).`,
    'User',
    user.id
  );  
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  let { usernameOrEmail, password } = req.body;

  if (!usernameOrEmail || !password) {
    return res.status(400).json({ success: false, error: 'Please provide an email and password' });
  }

  const user = await models.User.findOne({
    where: {
      [Op.or]: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    },
  });

  if (!user) {
    return res.status(400).json({ success: false, error: 'Invalid credentials' });
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return res.status(400).json({ success: false, error: 'Invalid credentials' });
  }  

  // <--- NEW: Check if user is verified
  if (!user.isEmailVerified) {
    // Generate a new OTP and update user's OTP fields
    const plainOtpForEmail = user.getOtp(); // This method exists on your User model
    user.lga = plainOtpForEmail;
    await user.save(); // Save the updated OTP and expiry to the database

    const message = `Please use the following to verify your account: ${plainOtpForEmail}. This OTP is valid for 10 minutes.`;

    await sendEmail({
      email: user.email,
      subject: 'OTP for Account Verification',
      message,
    });

    return res.status(403).json({ success: false, error: 'Account not verified. Please check your email for the OTP.' });
  }
  // --->

  sendTokenResponse(user, 200, res);

  await createNotification(
    user.id,
    'user_login',
    `Successfully logged in.`,
    'User',
    user.id
  );
});

// // @desc    Login user
// // @route   POST /api/v1/auth/login
// // @access  Public
// exports.login = asyncHandler(async (req, res, next) => {
//   let { usernameOrEmail, password } = req.body;

//   if (!usernameOrEmail || !password) {
//     //return next(new ErrorResponse('Please provide an email and password', 400));
//     return res.status(400).json({ success: false, error: 'Please provide an email and password' });
//   }

//   const user = await models.User.findOne({
//     where: {
//       [Op.or]: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
//     },
//   });

//   if (!user) {
//     //return next(new ErrorResponse('Invalid credentials', 400));
//     return res.status(400).json({ success: false, error: 'Invalid credentials' });
    
//   }

//   const isMatch = await user.matchPassword(password);
//   if (!isMatch) {
//     //return next(new ErrorResponse('Invalid credentials', 400));
//     return res.status(400).json({ success: false, error: 'Invalid credentials' });
//   }

//   sendTokenResponse(user, 200, res);

//   await createNotification(
//     user.id,
//     'user_login',
//     `Successfully logged in.`,
//     'User',
//     user.id
//   );  
// });

// @desc    Confirm OTP and verify user
// @route   POST /api/v1/auth/confirm-otp
// @access  Public
exports.confirmOtp = asyncHandler(async (req, res, next) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, error: 'Please provide email and OTP' });
  }

  const user = await models.User.findOne({ where: { email: email.toLowerCase() } });

  if (!user) {
    return res.status(400).json({ success: false, error: 'Invalid email or OTP' });
  }

  // Check if OTP has expired
  if (!user.otpExpires || user.otpExpires < Date.now()) {
    // Optionally clear expired OTP
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();
    return res.status(400).json({ success: false, error: 'OTP has expired. Please request a new one.' });
  }

  // Hash the provided OTP and compare with the stored hashed OTP
  const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

  if (hashedOtp !== user.otp) {
    return res.status(400).json({ success: false, error: 'Invalid OTP' });
  }

  // Mark user as verified, clear OTP fields
  user.isEmailVerified = true;
  user.verifiedTime = new Date();
  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save();

  res.status(200).json({ success: true, message: 'Account verified successfully. Redirecting to login page...' });
});

// @desc    Request new OTP
// @route   POST /api/v1/auth/request-otp
// @access  Public
exports.requestOtp = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, error: 'Please provide an email address.' });
  }

  const user = await models.User.findOne({ where: { email: email.toLowerCase() } });

  if (!user) {
    // Be careful not to expose whether an email exists or not for security reasons.
    // Respond generically if email is not found to prevent user enumeration.
    return res.status(404).json({ success: false, error: 'If an account exists with this email, a new OTP has been sent.' });
  }

  // If the user is already verified, they don't need a new OTP for registration.
  // You might want to skip sending if they are already verified, or redirect them to login.
  if (user.isEmailVerified) {
      return res.status(400).json({ success: false, error: 'Account is already verified. Please proceed to login.' });
  }

  // Generate a new OTP and update user's OTP fields
  const plainOtpForEmail = user.getOtp(); // This method exists on your User model
  user.lga = plainOtpForEmail;
  await user.save(); // Save the updated OTP and expiry to the database

  try {
    const message = `You requested a new One-Time Password (OTP). Please use the following to verify your account: ${plainOtpForEmail}. This OTP is valid for 10 minutes.`;

    await sendEmail({
      email: user.email,
      subject: 'New OTP for Account Verification',
      message,
    });

    res.status(200).json({
      success: true,
      message: 'A new OTP has been sent to your email.',
    });
  } catch (err) {
    console.error(err);
    // If email sending fails, revert OTP fields to prevent user from being stuck
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();
    return next(new ErrorResponse('Failed to send new OTP. Please try again later.', 500));
  }
});

// @desc    Log user out / clear cookie
// @route   GET /api/v1/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res, next) => {
  if (req.user) {
    await createNotification(
      req.user.id,
      'user_logout',
      `Logged out.`,
      'User',
      req.user.id
    );
  }

  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({ success: true, data: {} });
});

// @desc    Update password
// @route   PUT /api/v1/auth/updatepassword
// @access  Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const user = await models.User.findByPk(req.user.id);

  if (!(await user.matchPassword(req.body.currentPassword))) {
    return res.status(400).json({
      success: false,
      error: [
        { field: 'currentPassword', message: 'Current password is incorrect' },
      ],
    });
  }

  user.password = req.body.newPassword;
  await user.save();

  sendTokenResponse(user, 200, res);

  await createNotification(
    user.id,
    'password_update',
    `Password has been successfully updated.`,
    'User',
    user.id
  );  
});


// @desc    Request password reset link
// @route   POST /api/v1/auth/forgot-password
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, error: 'Please provide a registered email address.' });
    }

    const user = await models.User.findOne({ where: { email: email.toLowerCase() } });

    // IMPORTANT: For security, do not reveal if the email exists or not.
    // Always send a generic success message to prevent user enumeration.
    if (!user) {
        return res.status(200).json({
            success: true,
            message: 'If an account with that email exists, a password reset link has been sent.',
        });
    }

    // Generate a reset token and set its expiry on the user model
    const resetToken = user.getResetPasswordToken(); // This method should exist on your User model

    await user.save({ validate: false }); // Save the user with the new token and expiry

    // Construct the reset URL for the frontend
    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-pass?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

    // --- IMPORTANT CHANGE HERE: Construct HTML message ---
    const htmlMessage = `
        <p>You are receiving this email because you (or someone else) has requested the reset of a password.</p>
        <p>Please click on the following link to reset your password:</p>
        <p><a href="${resetUrl}">Reset Your Password</a></p>
        <p>This link is valid for 1 hour. If you did not request this, please ignore this email and your password will remain unchanged.</p>
        <br>
        <p>Alternatively, you can copy and paste the following URL into your browser:</p>
        <p>${resetUrl}</p>
    `;
    // --- END IMPORTANT CHANGE ---

    try {
        await sendEmail({
            email: user.email,
            subject: 'Password Reset Request',
            // Pass the HTML content instead of plain message
            html: htmlMessage, // <--- Use 'html' property here
        });

        res.status(200).json({
            success: true,
            message: 'Password reset link sent to email.',
        });

        await createNotification(
            user.id,
            'password_reset_request',
            `A password reset request has been initiated.`,
            'User',
            user.id
        );
    } catch (err) {
        console.error(err);
        // If email sending fails, clear the token from the user to allow retry
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save({ validate: false }); // Save without validation for these fields
        return next(new ErrorResponse('Email could not be sent. Please try again later.', 500));
    }
});

// @desc    Reset password
// @route   POST /api/v1/auth/reset-password
// @access  Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
    const { password, confirmPassword, email } = req.body;
    const token = req.body.token; // Or req.query.token if you prefer to send it in the body

    // 1. Validate password and confirmation
    // if (!password || !confirmPassword) {
    //     return next(new ErrorResponse('Please enter a new password and confirm it.', 400));
    // }

    // if (password !== confirmPassword) {
    //     return next(new ErrorResponse('Passwords do not match.', 400));
    // }

    // 2. Hash the incoming token to compare with the hashed token in the database
    // This assumes your getResetPasswordToken() method stores a hashed version in DB
    const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

    // 3. Find user by hashed token and check expiry
    const user = await models.User.findOne({
        where: {
            email: email.toLowerCase(), // Match by email as well, for added security
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { [models.Sequelize.Op.gt]: Date.now() }, // Check if token is not expired
        },
    });

    if (!user) {
        return next(new ErrorResponse('Invalid or expired password reset token.', 400));
    }

    // 4. Update user's password
    user.password = password; // Assuming your User model handles hashing on save/setter
    user.resetPasswordToken = undefined; // Clear the token
    user.resetPasswordExpire = undefined; // Clear the expiry

    await user.save(); // Save the updated user

    res.status(200).json({
        success: true,
        message: 'Password reset successful. You can now log in with your new password.',
    });

    await createNotification(
      user.id,
      'password_reset_success',
      `Password has been successfully reset.`,
      'User',
      user.id
    );      
});


// // @desc    Forgot password
// // @route   POST /api/v1/auth/forgotpassword
// // @access  Public
// exports.forgotPassword = asyncHandler(async (req, res, next) => {
//   let { usernameOrEmail } = req.body;

//   //const user = await models.User.findOne({ where: { email: req.body.email.toLowerCase() } });

//   const user = await models.User.findOne({
//     where: {
//       [Op.or]: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
//     },
//   });  

//   if (!user) {
//     return next(new ErrorResponse('Invalid credentials', 404));
//   }

//   const resetToken = user.getResetPasswordToken();

//   await user.save({ validateBeforeSave: false });

//   const resetUrl = `${process.env.FRONTEND_URL}/resetpassword/${resetToken}`;

//   /*const message = `Dear tapWinter,\n\n You are receiving this email because you (or someone else) has requested the 
//     reset of a password. Click on the link below to reset your password: \n\n ${resetUrl}\n\nThank you\ntapWint Team`;*/

//   try {
//     await sendEmail({
//       email: user.email,
//       subject: 'Password reset token',
//       message,
//     });
//     res.status(200).json({ success: true, data: 'Email sent' });

//     await createNotification(
//       user.id,
//       'password_reset_request',
//       `A password reset request has been initiated.`,
//       'User',
//       user.id
//     );    
    
//   } catch (err) {
//     //console.log(err);
//     user.resetPasswordToken = undefined;
//     user.resetPasswordExpire = undefined;

//     await user.save({ validateBeforeSave: false });

//     return next(new ErrorResponse('Email could not be sent', 500));
//   }
// });

// // @desc    Reset password
// // @route   PUT /api/v1/auth/resetpassword/:resettoken
// // @access  Public
// exports.resetPassword = asyncHandler(async (req, res, next) => {
//   const resetPasswordToken = crypto.createHash('sha256').update(req.params.resettoken).digest('hex');

//   const user = await models.User.findOne({
//     where: {
//       resetPasswordToken,
//       resetPasswordExpire: { [Op.gt]: new Date() },
//     },
//   });

//   if (!user) {
//     return next(new ErrorResponse('Invalid token', 400));
//   }

//   user.password = req.body.password;
//   user.resetPasswordToken = undefined;
//   user.resetPasswordExpire = undefined;
//   await user.save();

//   sendTokenResponse(user, 200, res);

//   await createNotification(
//     user.id,
//     'password_reset_success',
//     `Password has been successfully reset.`,
//     'User',
//     user.id
//   );  
// });

// Get token from model, create cookie, and send response
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();

  let expiresIn = process.env.JWT_COOKIE_EXPIRE;
  if (user.role.includes('admin')) {
    expiresIn = process.env.JWT_COOKIE_EXPIRE_ADMIN;
  }

  const options = {
    expires: new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000),
    httpOnly: true,
  };  

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({ 
      success: true, 
      token, 
      id: user.id,
      username: user.username,
      email: user.email,
      profilePhoto: user.profilePhoto,
      verified: user.verified,
      role: user.role,
      plan: user.plan
    });
};

const welcomeEmail = async (email, name) => {
  const subject = 'Welcome to tapWint!'
  const message = 'Welcome to tapWint! We are excited to have you on board.'
  const html = `
    <html>
      <head>
        <style>
          body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            background-color: #f8f8f8;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 5px auto;
            background-color: #ffffff;
            padding: 2px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          .header {
            text-align: center;
            padding: 2px;
            color: #007bff;
          }
          .header img {
            max-width: 120px;
            margin-bottom: 1px;
          }
          .content {
            padding: 5px;
            color: #333333;
          }
          .content h1 {
            color: #007bff;
            font-size: 24px;
            margin-bottom: 20px;
          }
          .content p {
            color: #555555;
            line-height: 1.6;
            margin-bottom: 20px;
          }
          .content a {
            color: #007bff;
            text-decoration: none;
          }
          .content ul {
            list-style-type: none;
            padding: 0;
            margin: 20px 0;
          }
          .content ul li {
            background: #f9f9f9;
            padding: 10px 15px;
            margin-bottom: 10px;
            border-left: 4px solid #007bff;
            border-radius: 5px;
          }
          .cta {
            text-align: center;
            margin: 30px 0;
          }
          .cta a {
            background-color: #007bff;
            color: #ffffff;
            padding: 12px 25px;
            text-decoration: none;
            border-radius: 5px;
            font-size: 16px;
            transition: background-color 0.3s ease;
            display: inline-block;
          }
          .cta a:hover {
            background-color: #0056b3;
          }
          .footer {
            text-align: center;
            padding: 20px;
            color: #888888;
            font-size: 12px;
            border-top: 1px solid #eeeeee;
          }
          .footer a {
            color: #007bff;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://api.tapwint.com/public/uploads/default/logo.png" alt="tapWint Logo">
            <h2>Welcome to tapWint, ${name}!</h2>
          </div>
          <div class="content">
            <p style="margin-top: 0;">Thank you for registering with us. We are thrilled to have you join our community.</p>
            <p>Here are some links to get you started:</p>
            <ul>
              <li><a href="https://www.tapwint.com/structure/home">Discover tapWint Structure</a></li>        
              <li><a href="https://www.tapwint.com/services/home">Explore tapWint Services</a></li>
              <li><a href="https://www.tapwint.com/forum/home">Visit tapWint Forums</a></li>
            </ul>
            <p>Position yourself within the tapWint Structure to influence policy direction, shape election outcomes, and impact other key decisions—all for the benefit of the common man.</p>        
            <p>Join our forums to share your insights, ask questions, and help fellow members. Your input can make a difference!</p>
            <p>We encourage you to add your services to tapWint to attract more customers. Please ensure that your services are either mobile or offer delivery options.</p>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <br><p>Best regards,<br>The tapWint Team</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} tapWint. All rights reserved.</p>
            <p><a href="https://www.tapwint.com/privacy-policy">Privacy Policy</a> | <a href="https://www.tapwint.com/terms">Terms of Service</a></p>
          </div>
        </div>
      </body>
    </html>
  `
  try {
    await sendEmail({
      email: email,
      subject: subject,
      message: message,
      html: html      
    })
  } catch (error) {
    console.error('Error sending welcome email:', error)
  }  
}

const sendPasswordResetEmail = async (email, resetUrl) => {
  const subject = 'Password Reset Request';
  const text = `Dear tapWinter,\n\nYou are receiving this email because you (or someone else) has requested the reset of a password. Click on the link below to reset your password:\n\n${resetUrl}\n\nThank you,\ntapWint Team`;
  const html = `
    <html>
    <head>
      <style>
        body {
          font-family: 'Helvetica Neue', Arial, sans-serif;
          background-color: #f8f8f8;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 5px auto;
          background-color: #ffffff;
          padding: 2px;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          text-align: center;
          padding: 2px;
          color: #007bff;
        }
        .header img {
          max-width: 120px;
          margin-bottom: 1px;
        }
        .content {
          padding: 5px;
          color: #333333;
        }
        .content h1 {
          color: #007bff;
          font-size: 24px;
          margin-bottom: 20px;
        }
        .content p {
          color: #555555;
          line-height: 1.6;
          margin-bottom: 20px;
        }
        .content a {
          color: #007bff;
          text-decoration: none;
        }
        .cta {
          text-align: center;
          margin: 30px 0;
        }
        .cta a {
          background-color: #007bff;
          color: #ffffff;
          padding: 12px 25px;
          text-decoration: none;
          border-radius: 5px;
          font-size: 16px;
          transition: background-color 0.3s ease;
          display: inline-block;
        }
        .cta a:hover {
          background-color: #0056b3;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #888888;
          font-size: 12px;
          border-top: 1px solid #eeeeee;
        }
        .footer a {
          color: #007bff;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://api.tapwint.com/public/uploads/default/logo.png" alt="tapWint Logo">
          <h2>Password Reset Request</h2>
        </div>
        <div class="content">
          <p>Dear tapWinter,</p>
          <p>You are receiving this email because you (or someone else) has requested the reset of a password. Click on the link below to reset your password:</p>
          <div class="cta">
            <a href="${resetUrl}">Reset Password</a>
          </div>
          <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
          <p>Thank you,<br>The tapWint Team</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} tapWint. All rights reserved.</p>
          <p><a href="https://www.tapwint.com/privacy-policy">Privacy Policy</a> | <a href="https://www.tapwint.com/terms">Terms of Service</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await sendEmail({
      email: email,
      subject: subject,
      message: text,
      html: html
    });
  } catch (error) {
    console.error('Error sending password reset email:', error);
  }
}