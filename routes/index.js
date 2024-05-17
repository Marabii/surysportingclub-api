const express = require("express")
const router = express.Router();

const passport = require('passport');
const genPassword = require('../lib/passwordUtils').genPassword;
const connection = require('../config/database');
const User = connection.models.User;
const verifyEmail = require('./verifyEmail')



/**
 * -------------- POST ROUTES ----------------
 */

router.post('/api/login', passport.authenticate('local', {}), (req, res) => {
    const isValid = req.isAuthenticated();
    if (isValid) {
        res.json({ isLoggedIn: true, user: req.session.passport.user });
    } else {
        res.json({ isLoggedIn: false });
    }
  });

  
// Temporary store for verification codes
const verificationStore = {};

router.post('/api/register', async (req, res, next) => {
    try {
        console.log(req.body)
        const saltHash = genPassword(req.body.pw);

        const salt = saltHash.salt;
        const hash = saltHash.hash;
        const token = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000

        // Prepare the new user but do not save yet
        const newUser = new User({
            fname: req.body.fname,
            lname: req.body.lname,
            hash: hash,
            salt: salt,
            admin: false,
            email: req.body.email,
            member : req.body.member === 'on' ? true : false,
        });

        // Send verification email
        const verificationCode = await verifyEmail(req.body.email);

        // Store verification code with a timeout (e.g., 15 minutes)
        verificationStore[req.body.email] = { code: verificationCode, user: newUser, token : token, timeout: setTimeout(() => { delete verificationStore[req.body.email]; }, 900000) };

        // Redirect to verification page
        res.redirect(`${process.env.FRONT_END}/verifyEmail/${req.body.email}/${token}`);
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).send('Failed to register');
    }
});

// Endpoint to verify the code entered by the user
router.post('/api/verifyCode', (req, res) => {
    const { email, code } = req.body;
    const record = verificationStore[email];

    if (record && record.code === Number(code)) {
        record.user.save().then(() => {
            clearTimeout(record.timeout);
            delete verificationStore[email];
            res.status(200).end('success')
        }).catch(error => {
            console.error("Error saving user:", error);
            res.status(500).send("Failed to save user");
        });
    } else {
        res.status(400).send("Invalid verification code");
    }
});


router.post('/api/resendEmail', async (req, res) => {
    const { email } = req.body;

    if (verificationStore[email]) {
        try {
            const verificationCode = await verifyEmail(email); // Re-generate verification code
            verificationStore[email].code = verificationCode
    
            // Send response indicating success
            res.status(200).send("Verification email resent successfully");
        } catch (error) {
            console.error("Error resending verification email:", error);
            res.status(500).send("Failed to resend verification email");
        }
    } else {
        return res.redirect(`${process.env.FRONT_END}/register`)
    }
});

router.post('/api/checkAccessEmailVerification', (req, res) => {
    const { email, token } = req.body;

    if (verificationStore[email]) {
        if (verificationStore[email].token != token) {
            return res.json({notAllowed : true})
        }
    } else {
        console.log('not allowed 2')
        return res.json({notAllowed : true})
    }
})

  
  

// Visiting this route logs the user out
router.get('/api/logout', (req, res, next) => {
    console.log("logout call")
    req.logout();
    res.end()
});

router.get('/login-success', (req, res, next) => {
    res.send('<p>You successfully logged in. --> <a href="/protected-route">Go to protected route</a></p>');
});

router.get('/login-failure', (req, res, next) => {
    res.send('You entered the wrong password.');
});


module.exports = router;