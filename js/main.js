

import {creatorHelpers} from './creatorHelpers.js';


function setupDragAndDrop() {
    const mainBodies = document.querySelectorAll('.mainBody');
    mainBodies.forEach(mainBody => {
        mainBody.addEventListener('dragover', (event) => {
            event.preventDefault(); 
        });
        mainBody.addEventListener('drop', (event) => {
			event.preventDefault();
			const files = event.dataTransfer.files;
			const validFiles = [];
			for (let i = 0; i < files.length; i++) {
				const file = files[i];
				const reader = new FileReader();
				reader.onload = (event) => {
					validFiles.push({
						name: file.name,
						type: file.type,
						data: event.target.result
					});
					if (validFiles.length === files.length) {
						console.log(creatorHelpers.socket);
						console.log(validFiles);
						creatorHelpers.socket.emit("uploadImages", validFiles);
					}
				};
				reader.readAsDataURL(file);
			}
		});
    });
}

function winLoad(){
	creatorHelpers.init();
	setupDragAndDrop();

}
window.onload = winLoad;



