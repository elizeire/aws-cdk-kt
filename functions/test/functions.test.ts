const md5 = require('crypto-js/md5');

test('md5 test', async () => {

    let md5Hash = md5("test").toString();

    console.log(md5Hash);
});


