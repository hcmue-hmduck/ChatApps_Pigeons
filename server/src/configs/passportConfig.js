const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const userService = require('../services/usersService.js');

const { google, github, facebook } = require('../configs/index.js');

const localVerifyCallback = async (email, password, cb) => {
    try {
        const user = await userService.getUserByEmailAndPassword(email, password);
        if (!user) return cb(null, false, { message: 'user not found' });

        return cb(null, user);
    } catch (error) {
        if (error.status === 401 || error.status === 400) return cb(null, false, error);
        return cb(error);
    }
};

const socialVerifyCallback = async (accessToken, refreshToken, profile, cb) => {
    try {
        const userProfile = {
            displayName: profile.displayName,
            email: profile.emails[0].value,
            picture: profile.photos[0].value,
        };

        const user = await userService.findOrCreateSocialUser(userProfile);

        return cb(null, user);
    } catch (error) {
        return cb(error);
    }
};

passport.use(
    new LocalStrategy(
        {
            usernameField: 'email',
            passwordField: 'password',
        },
        localVerifyCallback,
    ),
);

passport.use(
    new GoogleStrategy(
        {
            clientID: google.clientId,
            clientSecret: google.clientSecret,
            callbackURL: '/access/google/callback',
        },
        socialVerifyCallback,
    ),
);

passport.use(
    new GitHubStrategy(
        {
            clientID: github.clientId,
            clientSecret: github.clientSecret,
            callbackURL: '/access/github/callback',
        },
        socialVerifyCallback,
    ),
);

module.exports = passport;
