
const {addUserIfNotFound} = require('../utils/db_user_util.js');
const uuid = require('uuid'); 

const registerUser = async (req, res) => {
  const { display_name, email, password } = req.body;
  const userId = uuid.v4();
  const userObject = {
    id: userId,
    display_name,
    email,
    profPic: '', 
    provider:'self',
    password,
  };
  try {
    await addUserIfNotFound(userObject);
    req.login(userObject, (loginErr) => {
      if (loginErr) {
        return res.status(401).send('Login error');
      }
      req.session.passport.user = userObject;
      return res.redirect('/?auth=true');
    });
  } catch (err) {
    return res.status(400).json({ error: err });
  }
};

module.exports = { registerUser };
