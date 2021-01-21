const fs = require('fs-extra')
const path = require('path')
let configPath = path.join(__dirname, '../config.json')

module.exports = {
  get () {
    return fs.readJsonSync(configPath)
  },
  add (obj) {
    const config = fs.readJsonSync(configPath)
    config.push(obj)
    fs.writeJsonSync(configPath, config, {
      spaces: 2
    })
  },
  write (list) {
    fs.writeJsonSync(configPath, list, {
      spaces: 2
    })
  }
}