




export function validateForm() {
  // Reset error indicators
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirm-password');

  emailInput.classList.remove('wrong');
  passwordInput.classList.remove('wrong');
  confirmPasswordInput.classList.remove('wrong');

  // Get input values
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  // Basic email validation using regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    emailInput.classList.add('wrong');
    alert("Invalid email");
    return false;
  }

  // Password double-check
  if (password !== confirmPassword) {
    passwordInput.classList.add('wrong');
    confirmPasswordInput.classList.add('wrong');
    alert("Passwords do not match!");
    return false;
  }

  // Set the username field to display_name
  const usernameInput = document.getElementById('username');
  const display_name = usernameInput.value.trim();

  // Update the form fields for submission
  usernameInput.value = display_name;
  passwordInput.value = password;
  // Validation passed
  fetch('/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      display_name,
      email,
      password,
    }),
  })
  .then(response => {
	  console.log(response);
    if (response.redirected) {
      // Registration was successful
      alert('Registration successful!');
      window.location.href = response.url;
      // You can redirect or perform other actions as needed
    } else {
      // Registration failed, handle the error
      alert('Registration failed. Please try again.');
    }
  })
  .catch(error => {
    console.error('Error:', error);
    alert('An error occurred while processing your request. Please try again later.');
  });

  return true;
}
