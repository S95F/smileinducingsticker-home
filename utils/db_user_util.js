


const connection = require('../utils/dbpool.js');


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
