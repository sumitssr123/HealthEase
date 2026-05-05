const bcrypt = require('bcryptjs');

const getHash = async () => {
    const hash = await bcrypt.hash("123456", 10);
    console.log("new:", hash);
};
getHash();