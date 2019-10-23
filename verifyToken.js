const jwt = require('jsonwebtoken');
const {jwtSecret} = require('../../config');

function verifyToken(token) {
    try {
        var decoded = jwt.verify(token, 'wrong-secret');
    } catch(err) {
        // err
    }
}

module.exports = verifyToken;









