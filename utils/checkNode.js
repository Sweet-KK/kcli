const currentNodeVersion = process.versions.node
const semver = currentNodeVersion.split('.')
const major = semver[0]

module.exports = () => {
  return new Promise((resolve, reject) => {
    if (major < 11) {
      reject(new Error('You are running Node ' +
        currentNodeVersion +
        '.\n' +
        'kcli requires Node 10 or higher. \n' +
        'Please update your version of Node.'))
    }
    resolve()
  })
}