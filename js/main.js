

import {creatorHelpers} from './creatorHelpers.js';
const { environment } = require('immutable');





function addClickListenerToImageContainers() {
  const containers = document.querySelectorAll('.imageContainer');
  const imgInterface = document.createElement('article');
  imgInterface.id = 'imgCtrl';
  imgInterface.innerHTML = `
    <button id="subctrl">-</button>
    <input type="number" id="display" value="0" />
    <button id="addctrl">+</button>
  `;

  containers.forEach(container => {
    container.qty = 0;

    container.addEventListener('click', (event) => handleClick(event, container));
  });

  function handleClick(event, container) {
    const clickedImageContainer = event.target.closest('[data-image-container]');

    if (!clickedImageContainer) {
      return;
    }

    // Remove 'selected' class from all image containers
    document.querySelectorAll('[data-image-container]').forEach(container => {
      container.classList.remove('selected');
    });

    // Add 'selected' class to the clicked image container
    clickedImageContainer.classList.add('selected');

    clickedImageContainer.appendChild(imgInterface);
    const displayInput = imgInterface.querySelector('#display');
    displayInput.value = clickedImageContainer.qty || 0;
  }

  function handleSubtract() {
    const container = imgInterface.parentElement;
    let currentValue = parseInt(imgInterface.querySelector('#display').value);
    if (currentValue > 0) {
      container.qty = currentValue - 1;
      imgInterface.querySelector('#display').value = container.qty;
    }
  }

  function handleAdd() {
    const container = imgInterface.parentElement;
    let currentValue = parseInt(imgInterface.querySelector('#display').value);
    container.qty = currentValue + 1;
    imgInterface.querySelector('#display').value = container.qty;
  }

  imgInterface.querySelector('#subctrl').addEventListener('click', handleSubtract);
  imgInterface.querySelector('#addctrl').addEventListener('click', handleAdd);
}





function winLoad(){
	creatorHelpers.socket = io({
		autoConnect: false
	}).connect();
	creatorHelpers.init();
	const mainBody = document.querySelector('.mainBody');
	const imageContainer = mainBody.querySelector('.imageContainer');
	const loadMoreBtn = mainBody.querySelector('#loadMoreBtn');
	let receivedImages = [];

	creatorHelpers.socket.on('randomImages', (images) => {
		images.forEach((image) => {
			if (!receivedImages.includes(image.ImageURL)) {
				const img = document.createElement('img');
				const div = document.createElement('div');
				img.src = image.ImageURL;
				div.appendChild(img);
				div.dataset.imageContainer = '';
				imageContainer.appendChild(div);
				receivedImages.push(image.ImageURL);
			}
		});
	});

	loadMoreBtn.addEventListener('click', loadMoreImages);

	function loadMoreImages() {
		creatorHelpers.socket.emit('getRandomImages', receivedImages);
	}
	loadMoreImages();
	addClickListenerToImageContainers();
	
	
	

}
window.onload = winLoad;



