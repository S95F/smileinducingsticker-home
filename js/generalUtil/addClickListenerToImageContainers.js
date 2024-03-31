


export function addClickListenerToImageContainers() {
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
