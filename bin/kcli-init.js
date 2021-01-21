#!/usr/bin/env node
const checkNode = require('../utils/checkNode')
const log = require('../utils/log')
const pkgManage = require('../utils/pkgManage')
const templateConfig = require('../utils/templateConfig')
const inquirer = require('inquirer')
const fs = require('fs-extra')
const execSync = require('child_process').execSync
const ora = require('ora')
const path = require('path')
const mime = require('mime')

// 创建项目
main()

/**
 * 主进程main函数
 */
async function main () {
  try {
    // 校验node版本
    try {
      await checkNode()
      log({ msg: `Node version verified success!` })
    } catch (error) {
      log({ msg: error.message, type: 'error' })
      process.exit(1)
    }

    try {
      // 输入项目名称与描述，author
      const answers = await inquirer.prompt([
        {
          name: 'pjname',
          message: '请输入项目名称',
          default: 'test-project',
          validate: function (input) {
            let done = this.async()
            // 校验是否已经有同名文件夹
            if (fs.existsSync(input)) {
              done('已经存在同名项目，请修改项目名称')
              return
            }
            // 校验是否有空格
            if (/\s+/.test(input)) {
              done('名称中不能有空格')
              return
            }
            done(null, true)
          }
        },
        {
          name: 'description',
          message: '请输入项目描述',
          default: 'the project description'
        },
        {
          name: 'author',
          message: '请输入作者',
          default: 'test'
        }
      ])

      // 检测yarn npm,都有的时候提供选择，后续以此安装依赖
      let hasYarn = pkgManage.shouldUseYarn()
      let hasNpm = pkgManage.shouldUseNpm()
      let pkgManageType = ''
      if (hasYarn && hasNpm) {
        const pkgAnswers = await inquirer.prompt([
          {
            type: 'list',
            name: 'pkgManageType',
            message: '请选择要使用的包管理器',
            choices: [
              {
                name: 'Yarn',
                value: 'yarn'
              },
              {
                name: 'Npm',
                value: 'npm'
              }
            ]
          }
        ])
        pkgManageType = pkgAnswers.pkgManageType
      } else if (hasYarn) {
        pkgManageType = 'yarn'
      } else if (hasNpm) {
        pkgManageType = 'npm'
      } else {
        log({ msg: 'Yarn and npm command not found!', type: 'error' })
        process.exit(1)
      }

      // 已有模板提供选择+输入
      // 输入模板地址，提示是否保存为新的模板，更新到config.json
      let hasConfig = fs.existsSync(path.join(__dirname, '../config.json'))
      let registryLink = ''
      if (!hasConfig) {
        let registryAnswer = await inputTplName(hasConfig)
        registryLink = registryAnswer.registry
      } else {
        let configs = templateConfig.get()

        let tplSelectAnswer = await inquirer.prompt([
          {
            type: 'list',
            name: 'registry',
            message: '请选择模板',
            choices: [
              ...configs,
              {
                name: '输入新的模板地址',
                value: 'input'
              }
            ]
          }
        ])
        if (tplSelectAnswer.registry === 'input') {
          let registryAnswer = await inputTplName(hasConfig)
          registryLink = registryAnswer.registry
        } else {
          registryLink = tplSelectAnswer.registry
        }
      }

      log({
        msg: `From ${registryLink}`,
        type: 'info'
      })
      const spinner = ora(`Template downloading... \n`)
      spinner.start()

      try {
        // 下载模板
        log({
          msg: `git clone ${registryLink} ${answers.pjname.trim()}`,
          type: 'info'
        })
        execSync(`git clone ${registryLink} ${answers.pjname.trim()}`)
        spinner.succeed()
        log({ msg: `Template download completed!` })

        removeExitedGit(answers.pjname.trim())

        let scripts = {}

        // 根据之前的输入替换package.json
        if (
          fs.existsSync(path.resolve(answers.pjname.trim(), './package.json'))
        ) {
          let pkg = fs.readJsonSync(
            path.resolve(answers.pjname.trim(), './package.json')
          )
          pkg.name = answers.pjname.trim()
          pkg.description = answers.description
          pkg.author = answers.author
          fs.writeJsonSync(
            path.resolve(answers.pjname.trim(), './package.json'),
            pkg,
            {
              spaces: 2
            }
          )
          scripts = pkg.scripts
        }

        try {
          process.chdir(path.resolve(answers.pjname.trim()))

          // 初始化git仓库
          initGit()

          // 安装依赖
          let installSuccess = install(pkgManageType)

          finishedTip({ installSuccess, pjname: answers.pjname.trim() })

          // 检索package.json的命令 列出来
          logScripts({ pkgManageType, scripts })
        } catch (err) {
          log({
            msg: `cd ${answers.pjname.trim()} failed: ${err}`,
            type: 'error'
          })
          process.exit(1)
        }
      } catch (error) {
        spinner.fail()
        log({
          msg: `Template download failed.  ${error}`,
          type: 'error'
        })
        process.exit(1)
      }
    } catch (error) {
      if (error.isTtyError) {
        log({
          msg: `Prompt couldn't be rendered in the current environment`,
          type: 'error'
        })
      } else {
        log({ msg: `Something else went wrong: ${error}`, type: 'error' })
      }
    }
  } catch (err) {
    log({ msg: `创建失败：${err.message}`, type: 'error' })
    process.exit(1)
  }
}

async function inputTplName (hasConfig) {
  const registryAnswer = await inquirer.prompt([
    {
      name: 'registry',
      message: '请输入模板仓库地址',
      validate: function (input) {
        let done = this.async()
        if (!input) {
          done('模板仓库地址不能为空')
          return
        }
        done(null, true)
      }
    }
  ])

  const { isSave } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'isSave',
      message: '是否保存此模板以作日后选择使用'
    }
  ])

  if (isSave) {
    const { saveName } = await inquirer.prompt([
      {
        name: 'saveName',
        message: '请输入保存的名称',
        validate: function (input) {
          let done = this.async()
          if (!input) {
            done('保存名称不能为空')
            return
          }
          done(null, true)
        }
      }
    ])
    // 更新到config.json中
    if (hasConfig) {
      templateConfig.add({ name: saveName, value: registryAnswer.registry })
    } else {
      templateConfig.write([{ name: saveName, value: registryAnswer.registry }])
    }
  }
  return { registry: registryAnswer.registry }
}

function removeExitedGit (pjname) {
  if (fs.existsSync(path.resolve(pjname, './.git'))) {
    fs.removeSync(path.resolve(pjname, './.git'))
    log({ msg: `Remove template .git` })
  }
}

function initGit () {
  log({
    msg: `Initializing git repository...`,
    type: 'info'
  })
  execSync('git init')
  log({ msg: `Initialize git repository success!` })
}

function install (pkgManageType) {
  const spinner = ora(`Installing dependent packages... \n`)
  spinner.start()
  let installStr = pkgManageType === 'yarn' ? 'yarn' : 'npm install'
  let installSuccess = false
  try {
    execSync(installStr)
    spinner.succeed()
    installSuccess = true
    log({ msg: `Install dependent packages success!` })
  } catch (error) {
    spinner.fail()
    installSuccess = false
    log({ msg: `Install dependent packages failed!`, type: 'error' })
  }
  return installSuccess
}

function logScripts ({ pkgManageType, scripts }) {
  console.log('命令列表：')
  let runStr = pkgManageType === 'yarn' ? 'yarn' : 'npm run'
  Object.keys(scripts).map((key, i) => {
    console.log(`${i + 1}、${runStr} ${key}`)
  })
  console.log('\n\n')
}

function finishedTip ({ installSuccess, pjname }) {
  if (installSuccess) {
    log({ msg: `\n可以开始运行项目了！` })
  } else {
    log({ msg: `\n请进入工作目录重新安装依赖！`, type: 'error' })
  }
  console.log(`cd ${pjname}\n`)
}


function replaceFile (filePath, tplData = {}) {
  fs.readFile(filePath, function (err, data) {
    if (err) {
      return err
    }
    let str = data.toString()
    console.log(str)
    // let newStr = _.template(str)(tplData)
    // fs.writeFile(filePath, newStr, function (err) {
    //   if (err) return err
    // })
  })
}

function readAllFile (dir, tplData = {}) {
  fs.readdir(dir, (err, files) => {
    if (err) throw err
    files.forEach(file => {
      // 拼接获取绝对路径，fs.stat(绝对路径,回调函数)
      let fPath = path.join(dir, file)
      fs.stat(fPath, (err, stat) => {
        if (err) throw err
        if (stat.isFile()) {
          let mimeType = mime.getType(fPath)
          if (!/video|audio|font|image/.test(mimeType)) {
            replaceFile(fPath, tplData)
          }
        } else {
          readAllFile(fPath)
        }
      })
    })
  })
}
