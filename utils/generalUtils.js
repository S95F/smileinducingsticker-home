
var path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const {pool,imagepool} = require('../utils/dbpool.js');
const { v4: uuidv4 } = require('uuid');


const batchSize = 100;
var imageQueue = [];

const generateRandomSecret = () => {
  const secretLength = 64;
  return crypto.randomBytes(secretLength).toString('hex');
};


function getRandomImages(clientImages, callback) {
  let query;
  if (clientImages.length === 0) {
    query = 'SELECT ImageURL FROM images ORDER BY RAND() LIMIT 28'; 
  } else {
    query = `SELECT ImageURL FROM images WHERE ImageURL NOT IN (${pool.escape(clientImages)}) ORDER BY RAND() LIMIT 28`;
  }
  pool.query(query, (err, results) => {
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
        imageUrl: decodeURI(relativeImageUrl).replace('/','\\'),
        isPublic: 1, 
        tags: [parentDir]
      };

      imageQueue.push(imageData);
    }
  }
}

function preprocessTagsAndInsert(data) {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error getting connection from pool:', err);
      throw err; // or handle this error appropriately
    }

    connection.beginTransaction(err => {
      if (err) {
        console.error('Error starting transaction:', err);
        connection.release();
        throw err; // or handle this error appropriately
      }

      const allTags = [...new Set(data.flatMap(image => image.tags))];
      connection.query('SELECT TagName FROM Tags WHERE TagName IN (?)', [allTags], (error, existingTags) => {
        if (error) {
          console.error('Error executing query:', error);
          return connection.rollback(() => {
            connection.release();
            throw error; // or handle this error appropriately
          });
        }

        const newTags = allTags.filter(tag => !existingTags.map(t => t.TagName).includes(tag));
        if (newTags.length) {
          connection.query('INSERT INTO Tags (TagName) VALUES ?', [newTags.map(tag => [tag])], error => {
            if (error) {
              console.error('Error executing insert tags query:', error);
              return connection.rollback(() => {
                connection.release();
                throw error; // or handle this error appropriately
              });
            }
            insertImages(data, connection);
          });
        } else {
          insertImages(data, connection);
        }
      });
    });
  });
}




function synchronizeImagesWithDatabase() {
  return new Promise((resolve, reject) => {
    const selectQuery = 'SELECT ImageURL FROM Images';
    pool.query(selectQuery, (selectError, results) => {
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
        pool.query(deleteQuery, [urlsToRemove], deleteError => {
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

function insertImages(data, connection) {
  if (data.length === 0) {
    // Commit the transaction if there are no more images to insert
    connection.commit(err => {
      if (err) {
        console.error('Error committing transaction:', err);
        return connection.rollback(() => {
          connection.release();
          // Handle error - problem during commit
        });
      }
      connection.release();
      console.log('Transaction complete, connection released.');
      // Handle success
    });
    return;
  }

  const batch = data.splice(0, batchSize);
  const insertImageQuery = 'INSERT INTO Images (Name, Description, ImageURL, Is_Public) VALUES (?, ?, ?, ?)';

  batch.forEach(({ name, description, imageUrl, isPublic, tags }) => {
    connection.query(insertImageQuery, [name, description || '', imageUrl, isPublic !== undefined ? isPublic : 1], (error, imageResults) => {
      if (error) {
        console.error('Error inserting image:', error);
        return connection.rollback(() => {
          connection.release();
          // Handle error - problem during image insert
        });
      }

      tags.forEach(tag => {
        const insertTagQuery = 'INSERT INTO Image_Tags (ImageID, TagID) SELECT ?, TagID FROM Tags WHERE TagName = ?';
        connection.query(insertTagQuery, [imageResults.insertId, tag], error => {
          if (error) {
            console.error('Error inserting image tag:', error);
            return connection.rollback(() => {
              connection.release();
              // Handle error - problem during tag insert
            });
          }
        });
      });
    });
  });

  // Recursively call insertImages for the next batch of data
  insertImages(data, connection);
}

function processImageQueue() {
    imageQueue.forEach(imageData => {
        const { name, imageUrl } = imageData;
        const uuid = uuidv4();
        const fileExtension = path.extname(imageUrl);
        const imageName = path.basename(imageUrl);
        const newFilePath = path.join(__dirname, '..', 'public', 'imglib', `${uuid}${fileExtension}`);
		
        const decodedImageUrl = decodeURI(imageUrl);
        const fullImageUrl = imageUrl.startsWith('public') ? imageUrl : path.join('public', imageUrl);
        if (fs.existsSync(fullImageUrl)) {
            try {
                fs.renameSync(fullImageUrl, newFilePath);
                imageData.name = uuid;
                imageData.imageUrl = path.join('imglib', `${uuid}${fileExtension}`);
                console.log(`Image moved successfully to: ${newFilePath}`);
            } catch (error) {
                console.error(`Error moving image: ${error.message}`);
            }
        } else {
            console.error(`File not found: ${fullImageUrl}`);
        }
    });
}


module.exports = {
	generateRandomSecret,
	getRandomImages,
	queueDirectory,
	preprocessTagsAndInsert,
	synchronizeImagesWithDatabase,
	insertImages,
	processImageQueue,
};
