// 主进程

const Framework = require('./framework.js');
const config = require('./config.js');

class App extends Framework {
    constructor(config) {
        super(config);
    }
}

module.exports = new App(config);