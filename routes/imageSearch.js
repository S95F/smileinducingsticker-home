
const connection = require('../utils/dbpool.js');
const {getRandomImages} = require('../utils/generalUtils.js');

const getTags = (socket, searchTerm, page = 1, pageSize = 10) => {
    if (!searchTerm) return socket.emit('searchResults', { error: 'Invalid search term' });

    const tags = searchTerm.split(' ').map(tag => `%${tag.trim()}%`).filter(tag => tag);
    if (tags.length === 0) return socket.emit('searchResults', { error: 'Invalid search term' });

    const whereClauses = tags.map(tag => 'Tags.TagName LIKE ?').join(' OR ');
    const offset = (page - 1) * pageSize;

    const query = `
        SELECT Images.*, GROUP_CONCAT(Tags.TagName SEPARATOR ', ') AS ImageTags
        FROM Images
        JOIN Image_Tags ON Images.ImageID = Image_Tags.ImageID
        JOIN Tags ON Image_Tags.TagID = Tags.TagID
        WHERE ${whereClauses}
        GROUP BY Images.ImageID
        LIMIT ? OFFSET ?`;

   connection.query(query, [...tags, pageSize, offset], (error, results) => {
        if (error) {
            console.error('Error in query:', error);
            socket.emit('searchResults', { error: 'Error in query' });
            return;
        }
        socket.emit('searchResults', results);
    });
}

const getRandomImagesSocket = (socket, receivedImages) => {
    getRandomImages(receivedImages, (err, images) => {
      if (err) {
        console.error('Error fetching random images: ', err);
        return;
      }
      socket.emit('randomImages', images);
    });
}


module.exports = {
	getTags,
	getRandomImagesSocket
}
