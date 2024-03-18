
const axios = require('axios');




function fetchTwitchProfile(accessToken, refreshToken, profile, done) {
	const options = {
	  url: 'https://api.twitch.tv/helix/users',
	  method: 'GET',
	  headers: {
		'Client-ID': TWITCH_CLIENT_ID,
		'Accept': 'application/vnd.twitchtv.v5+json',
		'Authorization': 'Bearer ' + accessToken
	  }
	};
	axios(options)
		.then(response => {
			if (response.status === 200) {
				const uProf = response.data.data[0];
				var uniformObj = {
					id: uProf.id,
					display_name: uProf.display_name,
					email: uProf.email,
					profPic: uProf.profile_image_url,
					provider: 'Twitch'
				};
				addUserIfNotFound(uniformObj, (error) => error != 'User already exists' ? console.log(error) : false);
				done(null, uniformObj);
			} else {
				done(response.data, false);
			}
		})
		.catch(error => {
			console.error(error);
			done(error, false);
		});
}
function fetchGoogleProfile(accessToken, refreshToken, profile, done) {
    const options = {
      url: 'https://www.googleapis.com/oauth2/v1/userinfo', // Google UserInfo API endpoint
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + accessToken
      }
    };
    axios(options)
		.then(response => {
			if (response.status === 200) {
				const uProf = response.data;
				var uniformObj = {
					id: uProf.id,
					display_name: uProf.given_name,
					email: uProf.email,
					profPic: uProf.picture,
					provider: 'Google'
				};
				addUserIfNotFound(uniformObj, (error) => error != 'User already exists' ? console.log(error) : false);
				done(null, uniformObj);
			} else {
				done(response.data, false);
			}
		})
		.catch(error => {
			console.error(error);
			done(error, false);
		});
}



module.exports = {
	fetchGoogleProfile,
	fetchTwitchProfile
}
