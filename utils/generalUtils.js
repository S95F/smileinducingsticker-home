
var path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const connection = require('../utils/dbpool.js');

const batchSize = 100;
var imageQueue = [];

const generateRandomSecret = () => {
  const secretLength = 64;
  return crypto.randomBytes(secretLength).toString('hex');
};


function getRandomImages(clientImages, callback) {
  let query;
  if (clientImages.length === 0) {
    query = 'SELECT ImageURL FROM images ORDER BY RAND() LIMIT 28'; // Fetch random images without filtering
  } else {
    query = `SELECT ImageURL FROM images WHERE ImageURL NOT IN (${connection.escape(clientImages)}) ORDER BY RAND() LIMIT 28`;
  }
  connection.query(query, (err, results) => {
    if (err) {
      callback(err, null);
      return;
    }
    callback(null, results);
  });
}

function queueDirectory(directoryPath, rootParentDirectory) {
  const items = fs.readdirSync(directoryPath);

  for (const item of items) {
    const itemPath = path.join(directoryPath, item);
    const stat = fs.statSync(itemPath);

    if (stat.isDirectory() && !['1x', '2x', '3x', 'PNG', 'custom'].includes(item)) {
      queueDirectory(itemPath, rootParentDirectory);
    } else if (stat.isFile() && path.extname(item).toLowerCase() === '.png') {
      const parentDir = path.basename(directoryPath);
      let relativeImageUrl = path.relative(rootParentDirectory, itemPath);
      relativeImageUrl = escape(relativeImageUrl);

      const modifiedItem = item.replace(/\.png$/, '');
      const pattern = /_(.+)_([0-9a-fA-F-]+)$/;
      const matches = modifiedItem.match(pattern);
      const text = matches ? matches[1].replace(/_/g, ' ') : modifiedItem;
      const imageData = {
        name: text,
        description: '',
        imageUrl: decodeURI(relativeImageUrl).replace('/','\\').slice(9),
        isPublic: 1, 
        tags: [parentDir]
      };

      imageQueue.push(imageData);
    }
  }
}

function preprocessTagsAndInsert(data) {
  const allTags = [...new Set(data.flatMap(image => image.tags))];
  connection.beginTransaction(err => {
    if (err) throw err;
    connection.query('SELECT TagName FROM Tags WHERE TagName IN (?)', [allTags], (error, existingTags) => {
      if (error) return connection.rollback(() => { throw error; });
      const newTags = allTags.filter(tag => !existingTags.map(t => t.TagName).includes(tag));
      if (newTags.length) {
        connection.query('INSERT INTO Tags (TagName) VALUES ?', [newTags.map(tag => [tag])], error => {
          if (error) return connection.rollback(() => { throw error; });
          insertImages(data);
        });
      } else {
        insertImages(data);
      }
    });
  });
}
function synchronizeImagesWithDatabase() {
  return new Promise((resolve, reject) => {
    const selectQuery = 'SELECT ImageURL FROM Images';
    connection.query(selectQuery, (selectError, results) => {
      if (selectError) {
        console.error('Error selecting images:', selectError);
        reject(selectError);
        return;
      }
      const existingImageUrls = new Set(results.map(row => row.ImageURL));
      const urlsToRemove = Array.from(existingImageUrls).filter(url => !imageQueue.some(imageData => imageData.imageUrl === url));
      imageQueue = imageQueue.filter(imageData => !existingImageUrls.has(imageData.imageUrl));
      if (imageQueue.length > 0) {
        preprocessTagsAndInsert(imageQueue);
      }
      if (urlsToRemove.length > 0) {
        const deleteQuery = 'DELETE FROM Images WHERE ImageURL IN (?)';
        connection.query(deleteQuery, [urlsToRemove], deleteError => {
          if (deleteError) {
            console.error('Error deleting old images:', deleteError);
            reject(deleteError);
            return;
          }
        });
      }
      resolve();
    });
  });
}

function insertImages(data) {
  const batch = data.splice(0, batchSize);
  batch.forEach(({ name, description, imageUrl, isPublic, tags }) => {
    connection.query('INSERT INTO Images (Name, Description, ImageURL, Is_Public) VALUES (?, ?, ?, ?)', 
    [name, description || '', imageUrl, isPublic !== undefined ? isPublic : 1], (error, imageResults) => {
      if (error) return connection.rollback(() => { throw error; });
      tags.forEach(tag => {
        connection.query('INSERT INTO Image_Tags (ImageID, TagID) SELECT ?, TagID FROM Tags WHERE TagName = ?', 
        [imageResults.insertId, tag], error => {
          if (error) return connection.rollback(() => { throw error; });
        });
      });
    });
  });

  if (data.length) {
    insertImages(data);
  } else {
    connection.commit(err => {
      if (err) return connection.rollback(() => { throw err; });
      console.log(`Inserted ${batch.length} images with their tags.`);
      if (imageQueue.length > 0) preprocessTagsAndInsert(imageQueue.splice(0, batchSize));
    });
  }
}



module.exports = {
	generateRandomSecret,
	getRandomImages,
	queueDirectory,
	preprocessTagsAndInsert,
	synchronizeImagesWithDatabase,
	insertImages
};
