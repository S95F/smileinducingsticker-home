

import {dotheSlide, onResize, scrollTo} from './slide.js'
import {validateForm} from './formUtil/validateForm.js';
import {setCookie} from './generalUtil/setCookie.js';
import {addClickListenerToImageContainers} from './generalUtil/addClickListenerToImageContainers.js';
export const creatorHelpers = {};




creatorHelpers.validateForm = validateForm;
creatorHelpers.setCookie = setCookie;

creatorHelpers.init = function(){
	creatorHelpers.socket = io({
		autoConnect: true
	}).connect();
	scrollTo(0,0);
	creatorHelpers.sideBar = document.getElementById('sideBar');
	creatorHelpers.appBody = document.getElementById('appBody');
	document.getElementById("signUpbtn").onclick = creatorHelpers.validateForm;
	const signInbtn = document.getElementById('signinbtn');
	signInbtn.onclick = function(event) {
		event.preventDefault(); 
		const email = document.getElementById('emailSignin').value.trim();
		const password = document.getElementById('passwordSignin').value;
		fetch('/login', {
		  method: 'POST',
		  headers: {
			'Content-Type': 'application/json',
		  },
		  body: JSON.stringify({
			email,
			password,
		  }),
		  timeout: 5, 
		})
		.then(response => {
		  if (response.redirected) {
			window.location.href = response.url;
		  } else {
			alert('Login failed. Please check your email and password.');
		  }
		})
		.catch(error => {
		  console.error('Error:', error);
		  alert('An error occurred while processing your request. Please try again later.');
		})
	};
	function signUp(){
		dotheSlide(1,1);
	}
	document.getElementById("signinHeader").onclick = function () {
		var targetPosition = document.getElementById("signIn").getBoundingClientRect().top + window.pageYOffset;
		var container = document.querySelector('.container');
		container.style.overflow = 'clip';
		container.scrollTop = 0;
		document.getElementById('signIn').style.overflow = 'visible';
		dotheSlide(1, 0, function () {
			window.scrollTo({
				top: targetPosition,
				behavior: 'smooth'
			});
			
		});
	};
	document.getElementById("signupbtn").onclick = signUp;
	document.getElementById("twitchsignbtn").onclick = function() {
      window.location.href = '/auth/twitch';
    };
	document.getElementById("googlesignbtn").onclick = function() {
      window.location.href = '/auth/google';
    };
	scrollTo(0,0);
	const queryString = window.location.search;
	const searchParams = new URLSearchParams(queryString);
	const authValue = searchParams.get('auth');
	if (authValue === 'true') {
		creatorHelpers.socket.app = {};
		creatorHelpers.socket.on('connect', () => {
			creatorHelpers.socket.emit("userInfo",(res) => {
				if(res){
					const headerRightButtons = document.getElementById('headerRightButtons');
					headerRightButtons.innerHTML = '';
					const divElement = document.createElement('div');
					divElement.classList.add('inputWrapper');
					divElement.appendChild(document.createTextNode('Welcome! ' + res.display_name));
					headerRightButtons.appendChild(divElement);
					creatorHelpers.socket.emit("user:getSession", (res) => console.log(res));
				}else if(res==false){
					window.location.ref = '/';
				}
			  });
		  });
	}
	updatePercentageValues();
	const createTemplateform = document.getElementById('createTemplateform');
	
	document.getElementById("newTemplate").onclick = function(){
		if(!creatorHelpers.socket.app.newTemplateLock){
			var newEle = document.createElement("div");
			newEle.classList.add("toggle");
			var innerEle = document.createElement("div");
			innerEle.innerHTML = "New!";
			innerEle.classList.add("item");
			newEle.append(innerEle);
			creatorHelpers.sideBar.children[1].append(newEle);
			creatorHelpers.socket.app.newTemplateLock = true;
			createTemplateform.style.display="block";
		}
		else{
			alert("Please finish creating first!");
		}
	};
	const heightInput = document.getElementById('height');
	const widthInput = document.getElementById('width');
	const unitSelect = document.getElementById('unit');
	const maxValueInput = document.getElementById('maxValue');
	function updateMaxValue() {
		if (unitSelect.value === 'metric') {
			heightInput.setAttribute('max', '38.1'); // 38.1 centimeters = 15 inches
			widthInput.setAttribute('max', '38.1'); // 38.1 centimeters = 15 inches
			maxValueInput.value = '38.1'; // Update the maximum value field
		} else {
			heightInput.setAttribute('max', '15');
			widthInput.setAttribute('max', '15');
			maxValueInput.value = '15'; // Update the maximum value field
		}
	}
	updateMaxValue();
	unitSelect.addEventListener('change', updateMaxValue);
	createTemplateform.addEventListener('submit', function (event) {
            event.preventDefault();
            const name = document.getElementById('name').value;
            var height = parseFloat(heightInput.value);
            var width = parseFloat(widthInput.value);
            const unit = unitSelect.value;
            const maxValue = parseFloat(maxValueInput.value);
            const canvas = document.createElement('canvas');
            const dpi = 300;
            creatorHelpers.u = unit==='metric'?2 * Math.min(width,height):4 * Math.min(width,height);
			if (unit === 'metric') {
                width = Math.round(width * dpi * 100 / 2.54)/100/2;
                height = Math.round(height * dpi * 100 / 2.54)/100/2;
            } else {
                width = Math.round(width * dpi * 100)/100/2;
                height = Math.round(height * dpi * 100)/100/2;
            }
            canvas.width = width;
            canvas.height = height;
            dotheSlide(3,0);
			const context = canvas.getContext('2d');
			//context.strokeRect(0, 0, canvas.width, canvas.height);
			canvas.id = "creatorCanvas";
			const ctx = canvas.getContext('2d');
			document.getElementById("creator").append(canvas);
			//creatorHelpers.drawGrid(canvas,canvas.width/u,'darkGrey');
			drawCanvas();
			creatorHelpers.socket.emit('user:sessionUpdate', "designing", (result) => {
				creatorHelpers.setCookie(result);
			});
			creatorHelpers.initCanvas();
    });
    const creator = document.getElementById('creatorContainer');
	creatorHelpers.addClickListenersToButtons(creator);
	// Event listeners for mouse events
	const dragBar = document.getElementById('drag-bar');
	dragBar.addEventListener('mousedown', creatorHelpers.onMouseDown);
	window.addEventListener('mouseup', creatorHelpers.onMouseUp);
	window.addEventListener('mousemove', creatorHelpers.onMouseMove);
	document.getElementById("resetCanvas").addEventListener('click', () => {
      creatorHelpers.offsetX = 0;
      creatorHelpers.offsetY = 0;
      updateCanvasPosition();
    });
    creatorHelpers.imgLibrary = {};
    creatorHelpers.canvasContainer = document.getElementById('creator');
    creatorHelpers.canvasContainer.addEventListener('mousedown', (e) => {
	  if (e.button === 0 && e.target === creatorHelpers.canvas) { // Check if the canvas is clicked
		creatorHelpers.isDragging = true;
		creatorHelpers.startX = e.clientX;
		creatorHelpers.startY = e.clientY;
	  }
	});
	window.addEventListener('resize', updatePercentageValues);
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



creatorHelpers.drawGrid = function(canvas, cellSize, lineColor) {
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1;

  // Calculate the number of rows and columns based on cell size and canvas dimensions
  const numRows = Math.ceil(canvas.height / cellSize);
  const numCols = Math.ceil(canvas.width / cellSize);

  // Draw vertical grid lines
  for (let col = 1; col < numCols; col++) {
    const x = col * cellSize;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  // Draw horizontal grid lines
  for (let row = 1; row < numRows; row++) {
    const y = row * cellSize;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

// Function to toggle the panel open/close
function togglePanel(panelId) {
  const panel = document.getElementById(panelId);
  const isOpen = panel.classList.contains('open');
  var panels = document.getElementsByClassName('panel');
  for(let p = 0; p < panels.length; p+=1){
	  panels[p].classList.remove('open');
  }
  if (!isOpen) {
    // Open the panel
    panel.classList.add('open');
  } else {
    // Close the panel
    panel.classList.remove('open');
  }
}
// Recursive function to add click event listeners to creator-button elements
creatorHelpers.addClickListenersToButtons = function(element) {
  const buttons = element.querySelectorAll('.creator-button');
  var b = 0;
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const panelId = button.getAttribute('data-panel-id');
      togglePanel(panelId);
    });
    button.parentElement.id = button.innerHTML.replace(/\s/g, '_');
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		  const r = Math.random() * 16 | 0;
		  const v = c === 'x' ? r : (r & 0x3 | 0x8);
		  return v.toString(16);
		});
    const panelId = button.setAttribute('data-panel-id',uuid);
    const panel = button.parentElement.children[1];
    panel.id = uuid;
    // Initially hide the panel
    panel.style.transform = 'translateX(-400px)';
    
    // Add a class to identify the panel
    panel.classList.add('panel');
    const colors = [
		'rgb(0, 0, 255)',   // Blue
		'rgb(0, 255, 0)',   // Green
		'rgb(255, 255, 0)', // Yellow
		'rgb(255, 165, 0)', // Orange
		'rgb(255, 0, 0)'    // Red
	  ]
	const greyColors = [
	  'rgb(200, 200, 200)', // Light Grey
	  'rgb(150, 150, 150)',
	  'rgb(100, 100, 100)',
	  'rgb(75, 75, 75)',
	  'rgb(50, 50, 50)'    // Dark Grey
	];
    const randomRGB = colors[b%colors.length];
	button.style.background = randomRGB;
	button.style.top = (7 * b) + "vh";
	button.style.color = greyColors[b%colors.length];
	b = b + 1;
    
  });
}



creatorHelpers.isDragging = false;

// Function to handle mouse down event
creatorHelpers.onMouseDown = function(event) {
  creatorHelpers.isDragging = true;
}

// Function to handle mouse up event
creatorHelpers.onMouseUp = function() {
  creatorHelpers.isDragging = false;
}
creatorHelpers.startX = 0;
creatorHelpers.startY = 0;
creatorHelpers.offsetX = 0;
creatorHelpers.offsetY = 0;



    
function drawCanvas() {
    creatorHelpers.canvas = document.getElementById('creatorCanvas');
    creatorHelpers.ctx = creatorHelpers.canvas.getContext('2d');
    creatorHelpers.ctx.clearRect(0, 0, creatorHelpers.canvas.width, creatorHelpers.canvas.height);
    creatorHelpers.drawGrid(creatorHelpers.canvas, creatorHelpers.canvas.width / creatorHelpers.u, 'lightgrey');
    for (const instance of creatorHelpers.instances) {
        creatorHelpers.ctx.drawImage(
            instance.img,
            instance.x,
            instance.y,
            instance.width,
            instance.height
        );
    }
}
function updateCanvasPosition() {
  creatorHelpers.canvas.style.transform = `translate(${creatorHelpers.offsetX}px, ${creatorHelpers.offsetY}px)`;
  creatorHelpers.updateToolInteractor();
}

// Mouse down event to start dragging

window.addEventListener('mousemove', (e) => {
      if (creatorHelpers.isDragging) {
        const deltaX = e.clientX - creatorHelpers.startX;
        const deltaY = e.clientY - creatorHelpers.startY;
        creatorHelpers.offsetX += deltaX;
        creatorHelpers.offsetY += deltaY;
        creatorHelpers.startX = e.clientX;
        creatorHelpers.startY = e.clientY;
        updateCanvasPosition();
      }
 });
let minPercentage = 10;
let maxPercentage = 68;
let isHorizontalDrag = true;

function updatePercentageValues() {
  if (window.innerWidth < 1000) {
    minPercentage = 30;
    maxPercentage = 55.75;
    isHorizontalDrag = false;
    creatorHelpers.sideBar.style.flexBasis = `calc(20% - 5px)`;
	creatorHelpers.appBody.style.flexBasis = `calc(55.75% - 5px)`;
  } else {
    minPercentage = 10;
    maxPercentage = 68;
    isHorizontalDrag = true;
    creatorHelpers.sideBar.style.flexBasis = `calc(20% - 5px)`;
	creatorHelpers.appBody.style.flexBasis = `calc(80% - 5px)`;
  }
}



creatorHelpers.onMouseMove = function(event) {
  if (!creatorHelpers.isDragging) return;

  if (isHorizontalDrag) {
    const widthPercentage = (event.clientX / window.innerWidth) * 100;
    const clampedPercentage = Math.min(
      Math.max(widthPercentage, minPercentage),
      maxPercentage
    );
    creatorHelpers.sideBar.style.flexBasis = `calc(${clampedPercentage}% - 5px)`;
    creatorHelpers.appBody.style.flexBasis = `calc(${100 - clampedPercentage}% - 5px)`;
  } else {
    const heightPercentage = (event.clientY / window.innerHeight) * 100;
    const clampedPercentage = Math.min(
      Math.max(heightPercentage, minPercentage),
      maxPercentage
    );
    creatorHelpers.sideBar.style.height = `calc(${clampedPercentage}% - 5px)`;
    creatorHelpers.appBody.style.height = `calc(${100 - clampedPercentage}% - 5px)`;
  }
};

let imageLoadToken = 0;

creatorHelpers.updateImageContainer = function() {
    const currentToken = ++imageLoadToken;
    const container = document.getElementById('imglibimgcontainer');
    if (!container) {
        console.error('Container with id "imglibimgcontainer" not found');
        return;
    }

    // Remove all existing images
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    function loadImage(url) {
        return new Promise((resolve, reject) => {
            if (currentToken !== imageLoadToken) {
                reject('Image loading cancelled due to update');
                return;
            }
            const imgElement = document.createElement('img');
            imgElement.onload = resolve;
            imgElement.onerror = reject;
            imgElement.src = url;
            container.appendChild(imgElement);
        });
    }

    let loadPromise = Promise.resolve();
    creatorHelpers.possibilities.forEach(item => {
        const imgUrl = `http://localhost/${item.ImageURL}`;
        loadPromise = loadPromise.then(() => loadImage(imgUrl))
            .catch(error => {
                if (error !== 'Image loading cancelled due to update') {
                    console.error('Error loading image:', error);
                }
            });
    });
    loadPromise.then(() => {
		creatorHelpers.canvas = document.getElementById('creatorCanvas');
		creatorHelpers.ctx = creatorHelpers.canvas.getContext('2d');
		creatorHelpers.initCanvas();
		creatorHelpers.makeImagesDraggable();
	});
};


creatorHelpers.instances = [];

creatorHelpers.initCanvas = function() {
    this.canvas.addEventListener('drop', this.handleDrop.bind(this));
    this.canvas.addEventListener('dragover', function(event) {
        event.preventDefault();
    });
    creatorHelpers.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    creatorHelpers.canvas.parentNode.addEventListener("mousedown", (e) => {
	  if (e.target.id === "imageToolInteractor") {
		creatorHelpers.isResizing = true;
		creatorHelpers.originalX = e.clientX;
		creatorHelpers.originalY = e.clientY;
		creatorHelpers.originalWidth = creatorHelpers.divToScale.offsetWidth;
		creatorHelpers.originalHeight = creatorHelpers.divToScale.offsetHeight;
	  }
	});
};

creatorHelpers.handleDrop = function(event) {
    event.preventDefault();
    const imageUrl = event.dataTransfer.getData('text');
    const width = parseInt(event.dataTransfer.getData('width'), 10);
    const height = parseInt(event.dataTransfer.getData('height'), 10);
    const offsetX = parseInt(event.dataTransfer.getData('offsetX'), 10);
    const offsetY = parseInt(event.dataTransfer.getData('offsetY'), 10);

    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
        this.ctx.drawImage(img, event.offsetX - offsetX, event.offsetY - offsetY, width, height);
        this.instances.push({ img, x: event.offsetX - offsetX, y: event.offsetY - offsetY, width, height, scale: 1, rotation: 0 });
    };
};
creatorHelpers.makeImagesDraggable = function() {
    var images = document.getElementById('imglibimgcontainer').children;

    for (var i = 0; i < images.length; i++) {
        let img = images[i];
        img.draggable = true;
        img.addEventListener('dragstart', function(event) {
            const rect = img.getBoundingClientRect();
            const offsetX = event.clientX - rect.left;
            const offsetY = event.clientY - rect.top;

            event.dataTransfer.setData('text', img.src);
            event.dataTransfer.setData('width', img.offsetWidth);
            event.dataTransfer.setData('height', img.offsetHeight);
            event.dataTransfer.setData('offsetX', offsetX);
            event.dataTransfer.setData('offsetY', offsetY);
        });
    }
};

creatorHelpers.handleMouseDown = function(event) {
    const canvas = this.canvas;
    const offsetX = canvas.getBoundingClientRect().left;
    const offsetY = canvas.getBoundingClientRect().top;
    const mouseX = event.clientX - offsetX;
    const mouseY = event.clientY - offsetY;
    for (const instance of this.instances) {
        const { x, y, width, height } = instance;
        if (mouseX >= x &&
            mouseX <= x + width &&
            mouseY >= y &&
            mouseY <= y + height
        ) {
            this.selectedImage = instance;
            this.dragOffsetX = mouseX - x;
            this.dragOffsetY = mouseY - y;
            creatorHelpers.updateToolInteractor();
            break;
        }
    }
};
creatorHelpers.divToScale = document.getElementById("myDiv");
creatorHelpers.resizeHandle = document.getElementById("top-left");
creatorHelpers.isResizing = false;
creatorHelpers.originalX = 0;
creatorHelpers.originalY = 0;
creatorHelpers.originalWidth = 0;
creatorHelpers.originalHeight = 0;

document.addEventListener("mousemove", (e) => {
  if (creatorHelpers.isResizing) {
    const deltaX = e.clientX - creatorHelpers.originalX;
    const deltaY = e.clientY - creatorHelpers.originalY;

    creatorHelpers.divToScale.style.width = creatorHelpers.originalWidth + deltaX + "px";
    creatorHelpers.divToScale.style.height = creatorHelpers.originalHeight + deltaY + "px";
  }
});

document.addEventListener("mouseup", () => {
  creatorHelpers.isResizing = false;
});
