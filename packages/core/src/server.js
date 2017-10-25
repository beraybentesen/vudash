'use strict'

const requirePaths = require('app-module-path')
requirePaths.addPath(process.cwd())
requirePaths.addPath(`${process.cwd()}/node_modules`)

const Hapi = require('hapi')
const Hoek = require('hoek')
const fs = require('fs')
const Path = require('path')
const chalk = require('chalk')
const unhandled = require('unhandled-rejection')

const rejectionEmitter = unhandled({
  timeout: 5
})

rejectionEmitter.on('unhandledRejection', (error, promise) => {
  console.error(error)
})

function register () {
  const server = new Hapi.Server()
  server.connection({ port: process.env.PORT || 3300 })

  return server.register([
    require('vision'),
    require('inert'),
    require('./plugins/socket'),
    require('./plugins/static'),
    require('./plugins/dashboard')
  ])
  .then(() => {
    server.views({
      engines: {
        html: require('handlebars')
      },
      relativeTo: __dirname,
      path: './views'
    })

    console.log(`Loading dashboards from ${chalk.blue(process.cwd())}`)
    console.log(`Server ${chalk.green.bold('running')}`)
    console.log('Dashboards available:')
    const dashboardDir = Path.join(process.cwd(), 'dashboards')
    const boards = fs.readdirSync(dashboardDir)
    for (let board of boards) {
      const loaded = require(Path.join(dashboardDir, board))
      const boardUrl = `${Path.basename(board, '.json')}.dashboard`
      console.log(chalk.blue.bold(loaded.name), 'at', chalk.cyan.underline(`${server.info.uri}/${boardUrl}`))
    }

    return Promise.resolve(server)
  })
}

function start (server) {
  return server.start()
  .then(() => {
    if (process.env.BROWSER_SYNC) {
      const bs = require('browser-sync').create()

      bs.init({
        open: false,
        proxy: server.info.uri,
        files: ['src/public/**/*.{js,css}']
      })
    }

    return Promise.resolve()
  })
}

module.exports = {
  register,
  start
}