



const {pool} = require('../utils/dbpool.js');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');


const handleFileUpload = (socket,files) => {
	console.log("handleFileUpload called with files:", files);
    files.forEach(file => {
		console.log("Processing file:", file.name);
        const originalFilename = file.name.replace(/\.[^.]+$/, ''); 
        const fileExtension = file.type === 'image/png' ? '.png' : '.jpg';
        const uuid = uuidv4(); 
        const newFilename = `${uuid}${fileExtension}`; 
        const base64Data = file.data.split(',')[1];
        const bufferData = Buffer.from(base64Data, 'base64');
        fs.writeFile(`./public/imglib/${newFilename}`, bufferData, (err) => {
			if (!file.name || !file.type || !file.data) {
				console.error("Invalid file structure:", file);
				return;
			}
            if (err) {
                console.error('Error writing file:', err);
            } else {
                console.log('File uploaded successfully:', newFilename);
                const query = 'INSERT INTO images (ImageURL, Description, Is_Public, Name) VALUES (?, ?, ?, ?)';
                const values = [`./public/imglib/${newFilename}`, '', 1, originalFilename];
                pool.query(query, values, (error, results) => {
                    if (error) {
                        console.error('Error inserting into database:', error);
                    } else {
                        console.log('File details stored in the database.');
                    }
                });
            }
        });
    });
}


module.exports = {
	handleFileUpload,
}
