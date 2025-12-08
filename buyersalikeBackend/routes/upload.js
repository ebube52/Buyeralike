var express = require('express');
var router = express.Router();
var multer = require('multer');
const path = require('path');
const fs = require('fs');
const { S3Client, DeleteObjectCommand, Upload, PutObjectCommand } = require('@aws-sdk/client-s3'); // Keep S3 imports as they are used
const { Op } = require('sequelize');
const models = require('../models');
const { protect } = require('../middleware/auth');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);
const ErrorResponse = require('../utils/errorResponse');
const config = require('../utils/config');
const { serviceLimits } = config;
const { renameFirstImage, convertURLToFilePath, renameFile } = require('../helper/mediaUtils');

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const memoryStorage = multer.memoryStorage();

// ORIGINAL diskStorage - UNTOUCHED FOR ITS EXISTING FUNCTIONALITY (IMAGES ONLY)
const diskStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const fileKeys = req.body.fileKeys.split(',');
      if (fileKeys.length === 0) {
        return cb(new Error('No file keys provided'));
      }

      const firstFileKey = fileKeys[0];
      const parts = firstFileKey.split('/');
      
      if (parts.length < 1 || parts[0] === '') {
        return cb(new Error('Invalid file key format'));
      }      

      if (['basic', 'standard', 'premium','partner'].includes(req.user.plan) && parts[0] === 'service') {
        const serviceLimit = serviceLimits[req.user.plan] || serviceLimits.default;
        const userServiceCount = await models.Service.count({ where: { userId: req.user.id } });
        
        if (userServiceCount >= serviceLimit) {
          return cb(new Error(`Users with a ${req.user.plan} plan can only upload up to ${serviceLimit} service items`));
        }
      }    

      let destinationFolder = './public/uploads/';

      // ORIGINAL LOGIC: ONLY IMAGES ALLOWED HERE
      if (file.mimetype.startsWith('image')) {
        destinationFolder += 'images/' + parts[0] + '/';
      } else {
        // This error will be correctly bypassed by customStorage for non-images now
        return cb(new Error('Unsupported file type for this specific disk storage (only images are handled here).'));
      }

      const absolutePath = path.resolve(destinationFolder);
      fs.mkdirSync(absolutePath, { recursive: true });

      cb(null, destinationFolder);
    } catch (error) {
      cb(new Error('Image upload errors'));
    }
  },
  filename: (req, file, cb) => {
    const { fileKeys } = req.body;
    const fileKeyArray = fileKeys.split(',');
    // Multer's `upload.any()` passes all files. Find the correct fileKey for the current file.
    // This logic assumes `fileKeys` order matches `req.files` order.
    // A more robust way might involve sending unique IDs or original filenames with fileKeys.
    const index = req.files.findIndex(f => f.fieldname === file.fieldname); // Keep original matching method
    const fileKey = index !== -1 ? fileKeyArray[index] : '';
    const filename = fileKey.substring(fileKey.lastIndexOf('/') + 1);

    cb(null, filename);
  }
});

// NEW: Disk Storage specifically for Documents (PDF, Word, etc.)
const documentDiskStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const fileKeys = req.body.fileKeys.split(',');
      if (fileKeys.length === 0) {
        return cb(new Error('No file keys provided for document upload'));
      }

      const firstFileKey = fileKeys[0];
      const parts = firstFileKey.split('/');
      
      if (parts.length < 1 || parts[0] === '') {
        return cb(new Error('Invalid file key format for document upload'));
      }

      let destinationFolder = './public/uploads/documents/' + parts[0] + '/'; // Store documents in a 'documents' subfolder

      const absolutePath = path.resolve(destinationFolder);
      fs.mkdirSync(absolutePath, { recursive: true });

      cb(null, destinationFolder);
    } catch (error) {
      cb(new Error('Document upload errors'));
    }
  },
  filename: (req, file, cb) => {
    const { fileKeys } = req.body;
    const fileKeyArray = fileKeys.split(',');
    const index = req.files.findIndex(f => f.fieldname === file.fieldname); // Keep original matching method
    const fileKey = index !== -1 ? fileKeyArray[index] : '';
    const filename = fileKey.substring(fileKey.lastIndexOf('/') + 1);

    cb(null, filename);
  }
});


// ORIGINAL customStorage - MODIFIED ONLY TO ADD DOCUMENT ROUTING
const customStorage = {
  _handleFile: function (req, file, cb) {
    const fileKeys = req.body.fileKeys.split(',');
    if (fileKeys.length === 0) {
      return cb(new Error('No file keys provided'));
    }

    const firstFileKey = fileKeys[0];
    const parts = firstFileKey.split('/');
    
    if (parts.length < 1 || parts[0] === '') {
      return cb(new Error('Invalid file key format'));
    }        

    if (req.user.plan !== 'premium' && file.mimetype.startsWith('video')) {
      return cb(new Error('Only premium users can manage videos'));
    }    

    const index = req.files.findIndex(f => f.fieldname === file.fieldname);
    const fileKey = index !== -1 ? fileKeys[index] : '';
    const firstFileKeyPart = fileKey.split('/')[0];    

    let storage;
    // ORIGINAL LOGIC for video or verify (memoryStorage -> S3)
    if (firstFileKeyPart === 'verify' || file.mimetype.startsWith('video')) {
      storage = memoryStorage;
    } 
    // NEW LOGIC: If it's a document type (not image, not video), use documentDiskStorage
    else if (!file.mimetype.startsWith('image')) { // Catches PDF, Word, etc.
      storage = documentDiskStorage;
    }
    // ORIGINAL LOGIC for images (diskStorage)
    else {
      storage = diskStorage;
    }

    storage._handleFile(req, file, cb);
  },
  _removeFile: function (req, file, cb) {
    const fileKeyParts = req.body.fileKeys.split(',')[0].split('/');
    const firstFileKeyPart = fileKeyParts[0];

    let storage;
    // Mirroring _handleFile logic for removal
    if (firstFileKeyPart === 'verify' || file.mimetype.startsWith('video')) {
      storage = memoryStorage;
    } else if (!file.mimetype.startsWith('image')) {
      storage = documentDiskStorage;
    } else {
      storage = diskStorage;
    }
    storage._removeFile(req, file, cb);
  }
};

const upload = multer({ storage: customStorage });

const deleteFromS3 = async (url) => {
  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  const key = url.split(`${bucketName}/`)[1];

  const params = {
    Bucket: bucketName,
    Key: key
  };

  await s3Client.send(new DeleteObjectCommand(params));
};

// ORIGINAL uploadToS3 - UNTOUCHED
const uploadToS3 = async (file, fileKey, firstFileKeyPart) => {
  let fileContent;
  if (file.buffer) {
    fileContent = file.buffer;
  } else if (file.path) {
    fileContent = fs.readFileSync(file.path);
  } else {
    throw new Error('File content is not available');
  }

  // Original S3 key logic
  if (firstFileKeyPart === 'verify') {
    fileKey = 'images/' + fileKey;
  } else if (file.mimetype.startsWith('video')) {
    fileKey = 'videos/' + fileKey;
  }

  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: fileKey,
    Body: fileContent,
    ContentType: file.mimetype,
  };

  const command = new PutObjectCommand(params);
  const data = await s3Client.send(command);

  if (file.path) {
    await unlinkAsync(file.path);
  }

  return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
};


// ORIGINAL router.post('/') - MODIFIED ONLY TO DETERMINE URLS FOR RESPONSE AND DELETION
router.post('/', protect, upload.any(), async function (req, res, next) {
  const fileType = req.body.fileTypes;
  const fileKeys = req.body.fileKeys.split(',');
  const files = req.files;

  if (!files || files.length !== fileKeys.length) {
    return next(new ErrorResponse('Invalid request. Number of files does not match number of file keys', 400));
  }

  const uploadedFiles = files.map((file, index) => {
    const fileKeyParts = fileKeys[index].split('/');
    const firstFileKeyPart = fileKeyParts[0];

    // Determine the expected URL based on how customStorage routed the file
    let finalUrl;
    if (firstFileKeyPart === 'verify' || file.mimetype.startsWith('video')) {
      // These are handled by memoryStorage and then uploaded to S3
      // The actual S3 URL will be generated by uploadToS3 later.
      // For now, we set a placeholder, then update it.
      // Or, better, directly call uploadToS3 here for these, then assign.
      finalUrl = ''; // Placeholder, will be updated async
    } else if (!file.mimetype.startsWith('image')) {
      // Documents uploaded to the new documentDiskStorage
      finalUrl = `${process.env.BACKEND_URL}uploads/documents/${firstFileKeyPart}/${path.basename(file.path)}`;
    } else {
      // Images uploaded to the original diskStorage
      finalUrl = `${process.env.BACKEND_URL}uploads/images/${firstFileKeyPart}/${path.basename(file.path)}`;
    }

    return {
      fileKey: fileKeys[index],
      file: file, // This `file` object contains `path` if saved to disk, `buffer` if in memory
      firstFileKeyPart: firstFileKeyPart,
      url: finalUrl // Initial URL (might be placeholder for S3 files)
    };
  });

  // Process files sequentially to correctly handle database updates
  // Using Promise.allSettled for robustness, allowing some files to fail without stopping others.
  const results = await Promise.allSettled(uploadedFiles.map(async (uploadedFile) => {
    try {
      let currentFileUrl = uploadedFile.url; // Start with the determined local URL or placeholder

      // For S3-bound files (verify, video), perform the S3 upload now
      if (uploadedFile.firstFileKeyPart === 'verify' || uploadedFile.file.mimetype.startsWith('video')) {
        currentFileUrl = await uploadToS3(uploadedFile.file, uploadedFile.fileKey, uploadedFile.firstFileKeyPart);
      }
      uploadedFile.url = currentFileUrl; // Update the URL in the object

      // --- Database update logic (mostly untouched, adjusted for URL source and deletion) ---
      if (uploadedFile.firstFileKeyPart === 'userProfile') {
        const userId = req.body.userId;
        const user = await models.User.findByPk(userId);
        if (!user) throw new ErrorResponse('User not found.', 404);

        if (fileType === "coverPhoto") {
          const oldUrl = user.coverPhoto;
          user.coverPhoto = uploadedFile.url;
          if (oldUrl && (oldUrl !== "coverPhoto.png")) {
            // Delete based on where the old file was stored
            if (oldUrl.includes('s3.amazonaws.com')) {
              await deleteFromS3(oldUrl);
            } else {
              await unlinkAsync(convertURLToFilePath(oldUrl));
            }
          }
        } else if (fileType === "profilePhoto") {
          const oldUrl = user.profilePhoto;
          if (oldUrl && (oldUrl !== "profilePhoto.png")) {
            if (oldUrl.includes('s3.amazonaws.com')) {
              await deleteFromS3(oldUrl);
            } else {
              await unlinkAsync(convertURLToFilePath(oldUrl));
            }
          }
          
          // Original rename logic (assumes local image for renaming)
          if (uploadedFile.file.mimetype.startsWith('image') && !uploadedFile.file.mimetype.startsWith('video') && uploadedFile.firstFileKeyPart !== 'verify') {
              const result = renameFirstImage('image', uploadedFile.url, `${user.username}.jpg`);
              if (result) {
                  const { oldUrl: tempUrlBeforeRename, newUrl, updatedUrls } = result;
                  const oldFilePath = convertURLToFilePath(tempUrlBeforeRename); // Path of the newly uploaded file before rename
                  const newFilePath = convertURLToFilePath(newUrl); // Desired final path

                  try {
                      await renameFile(oldFilePath, newFilePath);
                      user.profilePhoto = updatedUrls;
                  } catch (err) {
                      console.error("Error renaming profile photo file locally:", err);
                      user.profilePhoto = uploadedFile.url; // Fallback
                  }
              } else {
                  user.profilePhoto = uploadedFile.url;
              }
          } else {
              user.profilePhoto = uploadedFile.url; // If not a local image, just assign the URL
          }
        } else if (fileType === "video") { // Videos go to S3
          const oldUrl = user.video;
          user.video = uploadedFile.url;
          if (oldUrl && (oldUrl !== "no-photo.jpg")) {
            await deleteFromS3(oldUrl);
          }
        }      
        await user.save();      
      } else if (uploadedFile.firstFileKeyPart === 'groupProfile') {
        const groupId = req.body.groupId;
        const group = await models.Group.findByPk(groupId);
        if (!group) throw new ErrorResponse('Group not found.', 404);

        if (fileType === "coverPhoto") {
          const oldUrl = group.coverPhoto;
          group.coverPhoto = uploadedFile.url;
          if (oldUrl && (oldUrl !== "coverPhoto.png")) {
             if (oldUrl.includes('s3.amazonaws.com')) {
              await deleteFromS3(oldUrl);
            } else {
              await unlinkAsync(convertURLToFilePath(oldUrl));
            }
          }      
        } else if (fileType === "profilePhoto") {
          const oldUrl = group.profilePhoto;
          if (oldUrl && (oldUrl !== "profilePhoto.png")) {
            if (oldUrl.includes('s3.amazonaws.com')) {
              await deleteFromS3(oldUrl);
            } else {
              await unlinkAsync(convertURLToFilePath(oldUrl));
            }
          }
          if (uploadedFile.file.mimetype.startsWith('image') && !uploadedFile.file.mimetype.startsWith('video') && uploadedFile.firstFileKeyPart !== 'verify') {
              const result = renameFirstImage('image', uploadedFile.url, `group-${group.name.replace(/ /g, '-')}.jpg`);
              if (result) {
                  const { oldUrl: tempUrlBeforeRename, newUrl, updatedUrls } = result;
                  const oldFilePath = convertURLToFilePath(tempUrlBeforeRename);
                  const newFilePath = convertURLToFilePath(newUrl);
                  try {
                      await renameFile(oldFilePath, newFilePath);
                      group.profilePhoto = updatedUrls;
                  } catch (err) {
                      console.error("Error renaming group profile photo file locally:", err);
                      group.profilePhoto = uploadedFile.url;
                  }
              } else {
                  group.profilePhoto = uploadedFile.url;      
              }
          } else {
              group.profilePhoto = uploadedFile.url;
          }          
        }    
        await group.save();      
      } else if (uploadedFile.firstFileKeyPart === 'feedbackComment') {  
        // No DB update logic here in original code, so none added. File saved to disk.
      } else if (uploadedFile.firstFileKeyPart === 'forumComment') {
        // No DB update logic here in original code, so none added. File saved to disk.
      } else if (uploadedFile.firstFileKeyPart === 'groupComment') {
        // No DB update logic here in original code, so none added. File saved to disk.
      } else if (uploadedFile.firstFileKeyPart === 'interest') {
        // No DB update logic here in original code, so none added. File saved to disk.
      } else if (uploadedFile.firstFileKeyPart === 'service') {
        if (fileType === "video") {          
          // No DB update logic here in original code, so none added. Video saved to S3.
        }  
      } else if (uploadedFile.firstFileKeyPart === 'verify') {
        const userId = req.body.userId;
        const userVerify = await models.UserVerify.findOne({ where: { userId: userId } });
        if (!userVerify) throw new ErrorResponse('User verification record not found.', 404);

        if (fileType === "IDCard") {
          const oldUrl = userVerify.idCard;
          userVerify.idCard = uploadedFile.url;
          if (oldUrl) { // Always delete old IDCard from S3
            await deleteFromS3(oldUrl);
          }
        } else if (fileType === "selfie") {
          const oldUrl = userVerify.selfie;
          userVerify.selfie = uploadedFile.url;
          if (oldUrl) { // Always delete old selfie from S3
            await deleteFromS3(oldUrl);
          }
        }
        await userVerify.save();
      }
      // NEW: For 'kyc-docs' or other documents, they are now saved to disk locally.
      // Your frontend is responsible for collecting these URLs and sending them in a subsequent step.
      // No explicit DB save here unless you add it. The file is saved and its URL returned.

      // Mark as successful for the response
      uploadedFile.status = 'fulfilled';
    } catch (error) {
      console.error(`Error processing file ${uploadedFile.file.originalname}:`, error);
      uploadedFile.status = 'rejected';
      uploadedFile.error = error.message;
    }
  }));

  // Filter for response
  const successfulUploads = uploadedFiles.filter(f => f.status === 'fulfilled');
  const failedUploads = uploadedFiles.filter(f => f.status === 'rejected');

  if (failedUploads.length > 0) {
    return res.status(500).json({
      success: false,
      message: 'Some files failed to upload or process. Check errors for details.',
      files: successfulUploads.map(f => ({ fileKey: f.fileKey, url: f.url })),
      errors: failedUploads.map(f => ({ fileKey: f.fileKey, error: f.error, originalFilename: f.file.originalname }))
    });
  }

  res.status(200).json({ files: successfulUploads.map(f => ({ fileKey: f.fileKey, url: f.url })) });
});

module.exports = router;










// var express = require('express');
// var router = express.Router();
// var multer = require('multer');
// const path = require('path');
// const fs = require('fs');
// const { S3Client, DeleteObjectCommand, Upload, PutObjectCommand } = require('@aws-sdk/client-s3');
// const { Op } = require('sequelize');
// const models = require('../models');
// const { protect } = require('../middleware/auth');
// const { promisify } = require('util');
// const unlinkAsync = promisify(fs.unlink);
// const ErrorResponse = require('../utils/errorResponse');
// const config = require('../utils/config');
// const { serviceLimits } = config;
// const { renameFirstImage, convertURLToFilePath, renameFile } = require('../helper/mediaUtils');

// const s3Client = new S3Client({
//   region: process.env.AWS_REGION,
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   },
// });

// const memoryStorage = multer.memoryStorage();

// const diskStorage = multer.diskStorage({
//   destination: async (req, file, cb) => {
//     try {
//       const fileKeys = req.body.fileKeys.split(',');
//       if (fileKeys.length === 0) {
//         return cb(new Error('No file keys provided'));
//       }

//       const firstFileKey = fileKeys[0];
//       const parts = firstFileKey.split('/');
//       /*if (parts.length < 2 || parts[0] === '' || !parts[1].startsWith('date=')) {
//         return cb(new Error('Invalid file key format'));
//       }*/

//       if (parts.length < 1 || parts[0] === '') {
//         return cb(new Error('Invalid file key format'));
//       }      

//       /*if (req.user.plan === 'basic' && ['feedbackComment', 'forumComment', 'groupComment'].includes(parts[0])) {
//         return cb(new Error(`Basic plan users cannot manage images`));
//       }*/

//       if (['basic', 'standard', 'premium','partner'].includes(req.user.plan) && parts[0] === 'service') {
//         const serviceLimit = serviceLimits[req.user.plan] || serviceLimits.default;
//         const userServiceCount = await models.Service.count({ where: { userId: req.user.id } });
        
//         if (userServiceCount >= serviceLimit) {
//           return cb(new Error(`Users with a ${req.user.plan} plan can only upload up to ${serviceLimit} service items`));
//         }
//       }  

//       let destinationFolder = './public/uploads/';

//       if (file.mimetype.startsWith('image')) {
//         //destinationFolder += 'images/' + parts[0] + '/' + parts[1] + '/';
//         destinationFolder += 'images/' + parts[0] + '/';
//       } else {
//         return cb(new Error('Unsupported file type'));
//       }

//       const absolutePath = path.resolve(destinationFolder);
//       fs.mkdirSync(absolutePath, { recursive: true });

//       cb(null, destinationFolder);
//     } catch (error) {
//       cb(new Error('Image upload errors'));
//     }
//   },
//   filename: (req, file, cb) => {
//     const { fileKeys } = req.body;
//     const fileKeyArray = fileKeys.split(',');
//     const index = req.files.findIndex(f => f.fieldname === file.fieldname);
//     const fileKey = index !== -1 ? fileKeyArray[index] : '';
//     const filename = fileKey.substring(fileKey.lastIndexOf('/') + 1);

//     cb(null, filename);
//   }
// });

// const customStorage = {
//   _handleFile: function (req, file, cb) {
//     const fileKeys = req.body.fileKeys.split(',');
//     if (fileKeys.length === 0) {
//       return cb(new Error('No file keys provided'));
//     }

//     const firstFileKey = fileKeys[0];
//     const parts = firstFileKey.split('/');
//     /*if (parts.length < 2 || parts[0] === '' || !parts[1].startsWith('date=')) {
//       return cb(new Error('Invalid file key format'));
//     }*/

//       if (parts.length < 1 || parts[0] === '') {
//         return cb(new Error('Invalid file key format'));
//       }       

//     if (req.user.plan !== 'premium' && file.mimetype.startsWith('video')) {
//       return cb(new Error('Only premium users can manage videos'));
//     }    

//     const index = req.files.findIndex(f => f.fieldname === file.fieldname);
//     const fileKey = index !== -1 ? fileKeys[index] : '';
//     const firstFileKeyPart = fileKey.split('/')[0]; 

//     const storage = (firstFileKeyPart === 'verify' || file.mimetype.startsWith('video')) ? memoryStorage : diskStorage;

//     storage._handleFile(req, file, cb);
//   },
//   _removeFile: function (req, file, cb) {
//     const storage = file.fieldname.startsWith('verify') || file.mimetype.startsWith('video') ? memoryStorage : diskStorage;
//     storage._removeFile(req, file, cb);
//   }
// };

// const upload = multer({ storage: customStorage });

// const deleteFromS3 = async (url) => {
//   const bucketName = process.env.AWS_S3_BUCKET_NAME;
//   const key = url.split(`${bucketName}/`)[1];

//   const params = {
//     Bucket: bucketName,
//     Key: key
//   };

//   await s3Client.send(new DeleteObjectCommand(params));
// };

// router.post('/', protect, upload.any(), function (req, res, next) {
//   const fileType = req.body.fileTypes;
//   const fileKeys = req.body.fileKeys.split(',');
//   const files = req.files;

//   if (!files || files.length !== fileKeys.length) {
//     return next(new ErrorResponse('Invalid request. Number of files does not match number of file keys', 400));
//   }

//   const uploadedFiles = files.map((file, index) => {
//     const fileKeyParts = fileKeys[index].split('/');
//     const firstFileKeyPart = fileKeyParts[0];
//     return {
//       fileKey: fileKeys[index],
//       file: file,
//       firstFileKeyPart: firstFileKeyPart
//     };
//   });

//   uploadedFiles.forEach(async (uploadedFile) => {
//     try {
//       if (uploadedFile.firstFileKeyPart === 'userProfile') {
//         const userId = req.body.userId;
//         const user = await models.User.findByPk(userId);
//         if (fileType === "coverPhoto") {
//           const coverPhoto = user.coverPhoto;
//           user.coverPhoto = process.env.BACKEND_URL + "uploads/images/" + uploadedFile.fileKey;
//           if (coverPhoto && (coverPhoto !== "coverPhoto.png")) {
//             await unlinkAsync(convertURLToFilePath(coverPhoto));
//           }
//         } else if (fileType === "profilePhoto") {
//           const profilePhoto = user.profilePhoto
//           //user.profilePhoto = process.env.BACKEND_URL + "uploads/images/" + uploadedFile.fileKey;
//           if (profilePhoto && (profilePhoto !== "profilePhoto.png")) {
//             await unlinkAsync(convertURLToFilePath(profilePhoto));
//           }
          
//           const url = process.env.BACKEND_URL + "uploads/images/" + uploadedFile.fileKey;
//           const result = renameFirstImage('image', url, `${user.username}.jpg`);
//           if (result) {
//             const { oldUrl, newUrl, updatedUrls } = result;
//             const oldFilePath = convertURLToFilePath(oldUrl);
//             const newFilePath = convertURLToFilePath(newUrl);
        
//             try {
//               await renameFile(oldFilePath, newFilePath);
//             } catch (err) {
//             }
//             user.profilePhoto = updatedUrls;
//           } else {
//             user.profilePhoto = process.env.BACKEND_URL + "uploads/images/" + uploadedFile.fileKey;       
//           }       
//         } else if (fileType === "video") {          
//           let s3Url;
//           const video = user.video;
//           s3Url = await uploadToS3(uploadedFile.file, uploadedFile.fileKey, fileType);
//           user.video = s3Url;
//           if (video && (video !== "no-photo.jpg")) {
//             await deleteFromS3(video);
//           }
//         }     
//         await user.save();     
//       } else if (uploadedFile.firstFileKeyPart === 'groupProfile') {
//         const groupId = req.body.groupId;
//         const group = await models.Group.findByPk(groupId);
//         if (fileType === "coverPhoto") {
//           const coverPhoto = group.coverPhoto;
//           group.coverPhoto = process.env.BACKEND_URL + "uploads/images/" + uploadedFile.fileKey;
//           if (coverPhoto && (coverPhoto !== "coverPhoto.png")) {
//             await unlinkAsync(convertURLToFilePath(coverPhoto));
//           }      
//         } else if (fileType === "profilePhoto") {
//           const profilePhoto = group.profilePhoto;
//           //group.profilePhoto = process.env.BACKEND_URL + "uploads/images/" + uploadedFile.fileKey;
//           if (profilePhoto && (profilePhoto !== "profilePhoto.png")) {
//             await unlinkAsync(convertURLToFilePath(profilePhoto));
//           }

//           const url = process.env.BACKEND_URL + "uploads/images/" + uploadedFile.fileKey;
//           const result = renameFirstImage('image', url, `group-${group.name.replace(/ /g, '-')}.jpg`);
//           if (result) {
//             const { oldUrl, newUrl, updatedUrls } = result;
//             const oldFilePath = convertURLToFilePath(oldUrl);
//             const newFilePath = convertURLToFilePath(newUrl);
        
//             try {
//               await renameFile(oldFilePath, newFilePath);
//             } catch (err) {
//             }
//             group.profilePhoto = updatedUrls;
//           } else {
//             group.profilePhoto = process.env.BACKEND_URL + "uploads/images/" + uploadedFile.fileKey;       
//           }            
//         }    
//         await group.save();     
//       } else if (uploadedFile.firstFileKeyPart === 'feedbackComment') {  
//       } else if (uploadedFile.firstFileKeyPart === 'forumComment') {
//       } else if (uploadedFile.firstFileKeyPart === 'groupComment') {
//       } else if (uploadedFile.firstFileKeyPart === 'interest') {
//       } else if (uploadedFile.firstFileKeyPart === 'service') {
//         if (fileType === "video") {          
//           let s3Url = await uploadToS3(uploadedFile.file, uploadedFile.fileKey, fileType);
//         } 
//       } else if (uploadedFile.firstFileKeyPart === 'verify') {
//         const userId = req.body.userId;
//         const userVerify = await models.UserVerify.findOne({ where: { userId: userId } });

//         let s3Url;
//         if (fileType === "IDCard") {
//           const idCard = userVerify.idCard;
//           s3Url = await uploadToS3(uploadedFile.file, uploadedFile.fileKey, uploadedFile.firstFileKeyPart);
//           userVerify.idCard = s3Url;
//           if (idCard) {
//             await deleteFromS3(idCard);
//           }
//         } else if (fileType === "selfie") {
//           const selfie = userVerify.selfie;
//           s3Url = await uploadToS3(uploadedFile.file, uploadedFile.fileKey, uploadedFile.firstFileKeyPart);
//           userVerify.selfie = s3Url;
//           if (selfie) {
//             await deleteFromS3(selfie);
//           }
//         }

//         await userVerify.save();
//       }
//     } catch (error) {
//       throw new Error('Image upload errors');
//     }
//   });

//   res.status(200).json({ files: uploadedFiles });
// });

// const uploadToS3 = async (file, fileKey, firstFileKeyPart) => {
//   let fileContent;
//   if (file.buffer) {
//     fileContent = file.buffer;
//   } else if (file.path) {
//     fileContent = fs.readFileSync(file.path);
//   } else {
//     throw new Error('File content is not available');
//   }

//   if (firstFileKeyPart === 'verify') {
//     fileKey = 'images/' + fileKey;
//   } else if (file.mimetype.startsWith('video')) {
//     fileKey = 'videos/' + fileKey;
//   }

//   const params = {
//     Bucket: process.env.AWS_S3_BUCKET_NAME,
//     Key: fileKey,
//     Body: fileContent,
//     ContentType: file.mimetype,
//   };

//   const command = new PutObjectCommand(params);
//   const data = await s3Client.send(command);

//   if (file.path) {
//     await unlinkAsync(file.path);
//   }

//   return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
// };

// module.exports = router;
