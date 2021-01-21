const execSync = require('child_process').execSync

module.exports = {
  shouldUseYarn () {
    try {
      execSync('yarnpkg --version', { stdio: 'ignore' })
      return true
    } catch (e) {
      return false
    }
  },
  shouldUseNpm () {
    try {
      execSync('npm --version').toString().trim()
      return true
    } catch (err) {
      return false
    }
  }
}