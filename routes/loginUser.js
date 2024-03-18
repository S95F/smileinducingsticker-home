
const {isValidLogin} = require('../utils/dbutil.js');


const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await isValidLogin(email, password);
    req.login(user, (loginErr) => {
      if (loginErr) {
        return res.status(401).send('Login error');
      }
      req.session.passport.user = user;
      return res.redirect('/?auth=true');
    });
  } catch (err) {
    return res.status(401).send('Login error');
  }
};

module.exports = { loginUser };
