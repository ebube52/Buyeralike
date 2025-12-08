const asyncHandler = require('../middleware/async');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadMiddleware = asyncHandler(async (req, res, next) => {
  const storage = multer.diskStorage({
      destination: (req, file, cb) => {
          let destinationFolder = './public/uploads/';

          if (file.mimetype.startsWith('image')) {
              destinationFolder += 'images/';
          } else if (file.mimetype.startsWith('video')) {
              destinationFolder += 'videos/';
          } else {
              return cb(new Error('Unsupported file type'));
          }

          const absolutePath = path.resolve(destinationFolder);
          fs.mkdirSync(absolutePath, { recursive: true });

          cb(null, destinationFolder);
      },
      filename: (req, file, cb) => {
          const { fileKeys } = req.body;
          const fileKeyArray = fileKeys.split(',');
          const index = req.files.indexOf(file);
          const fileKey = fileKeyArray[index];
          const fileExtension = file.originalname.split('.').pop();
          const filename = fileKey + '.' + fileExtension;

          cb(null, filename);
      }
  });

  const upload = multer({ storage: storage }).array('files', 10);

  upload(req, res, next); 
});

module.exports = { uploadMiddleware };
