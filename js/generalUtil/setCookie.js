





export function setCookie(cookieName, cookieValue, expire) {
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i];
    const eqPos = cookie.indexOf('=');
    const cookieName = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  }
  // Create a Date object for the expiration time
  const expirationDate = new Date(expire);

  // Convert the expiration date to a UTC string
  const expires = `expires=${expirationDate.toUTCString()}`;

  // Combine the cookie name, value, and expiration information
  const cookieString = `${cookieName}=${cookieValue}; ${expires}; path=/`;

  // Set the cookie in the document
  document.cookie = cookieString;
}
