var addon = require('./build/Release/detectCommunity');
var result = addon.run('linklist.txt');
console.log(result);
