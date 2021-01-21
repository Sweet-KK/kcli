const logSymbols = require("log-symbols")
const chalk = require("chalk")

/**
 * @param {*} msg 打印信息
 * @param {*} type [info,success,warning,error]
 * @param {*} color [red,green,blue...]
 */
module.exports = ({ msg = '', type = 'success', color }) => {
  if (color === undefined) {
    color = {
      'info': 'blueBright',
      'success': 'green',
      'warning': 'yellow',
      'error': 'red'
    }[type]
  }
  console.log(logSymbols[type], chalk[color](msg))
}

