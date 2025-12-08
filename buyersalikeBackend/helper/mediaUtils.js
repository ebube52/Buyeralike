// mediaUtils.js
const fs = require('fs');
const path = require('path');
const util = require('util');

const renameFile = util.promisify(fs.rename);

function renameFirstImage(type, url, newName) {
  const typesArray = type.split(',');
  const urlsArray = url.split(',');

  let updated = false;
  for (let i = 0; i < typesArray.length; i++) {
    if (!updated && typesArray[i].trim() === 'image') {
      const oldUrl = urlsArray[i];
      const newUrl = oldUrl.replace(/\/[^\/]*$/, `/${newName}`);
      urlsArray[i] = newUrl;
      updated = true;
      return { oldUrl, newUrl, updatedUrls: urlsArray.join(',') };
    }
  }
  return null;
}

function convertURLToFilePath(url) {
  const newPath = url.replace(process.env.BACKEND_URL.replace(/\/$/, ''), 'public');
  let filePath = newPath.replace(/^(https?:)?\/\//, '');
  filePath = filePath.replace(/\//g, path.sep);
  return filePath;
}

module.exports = {
  renameFirstImage,
  convertURLToFilePath,
  renameFile
};
