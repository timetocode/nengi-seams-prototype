require = require("esm")(module/*, options*/)
setTimeout(() => {
    module.exports = require("./serverMain.js")
}, 1500)
