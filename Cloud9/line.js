const getLastLine = require('./fileTools.js').getLastLine
const fileName = '../logger.txt'
const minLineLength = 1
getLastLine(fileName, 1)
    .then((lastLine)=> {
        console.log(lastLine)
    })
    .catch((err)=> {
        console.error(err)
    })