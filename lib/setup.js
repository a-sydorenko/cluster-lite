'use strict'

const cluster = require('cluster')
const fs = require('fs')
const path = require('path')

const ClusterController = require('./cluster')

class Setup extends ClusterController {

  /**
   * @param {object} options
   * @param {string} options.errorLog
   * @param {object} options.structure
   * @param {number|void} options.numberCores
   * @param {number|void} options.timeoutOffset
   * */

  constructor (options) {
    const params = prepareSettings(options.structure)
    options.numberCores = params.length

    super(options)

    // * * * * * * * * * * * * * * * CLUSTER CONFIG TEMPLATE
    this.clusterConfig = {
      worker: {
        maxPid: this.numberCores,
        port: 80,
        setNoDelay: true,
        pingInterval: 2000,
        samplingInterval: 10,
        gcInterval: 60 * 1000
      }
    }

    this.errorLog = options.errorLog || 'error.log'
    this.stream = null

    this.setup(params)
  }

  /**
   * @param {object} params - an array
   * @param {object} params[i] - fork params
   * */

  setup (params) {

    // * * * * * * * * * * * * * * * FORKS SETUP AND STORING

    for (let i = 1; i <= params.length; i++) {

      /**
       * @object param
       * @property {string} param.filename
       * @property {boolean} param.sendPid
       * @property {boolean} param.startMessage
       * @property {object} param.message
       * */

      const param = params[i - 1]
      const conf = Object.assign({}, this.clusterConfig.worker)
      conf.pid = i

      cluster.setupMaster({ exec: path.join(process.env.PWD, param.filename) })

      const fork = cluster.fork({ WORKER_CONFIG: JSON.stringify(conf) })
      this.setFork(fork, { param, conf })

      if (param.sendPid) {
        fork.send({ pid: conf.pid })
      }

      if (param.startMessage) {
        fork.send(param.message)
      }
    }

    // * * * * * * * * * * * * * * * CLUSTER MESSAGE HANDLING

    cluster.on('message', (worker, message, handle) => {
      for (let [fork, config] of this.map) {
        if (fork !== worker) { // send for each except self
          fork.send(message)
        }
      }
    })

    // * * * * * * * * * * * * * * * CHILD PROCESSES ON EXIT HANDLING

    cluster.on('exit', (worker, code, signal) => {
      const { param, conf } = this.getFork(worker)
      this.deleteFork(worker)

      cluster.setupMaster({ exec: path.join(process.env.PWD, param.filename) })
      const fork = cluster.fork({ WORKER_CONFIG: JSON.stringify(conf) })
      this.setFork(fork, { param, conf })

      if (param.sendPid) {
        fork.send({ pid: conf.pid })
      }

      if (param.startMessage) {
        fork.send(param.message)
      }

      const message = `${new Date()}|pid:${worker.process.pid}|code:${code}|signal:${signal}\n`
      if (this.stream === null) {
        this.stream = fs.createWriteStream(this.errorLog, { flags: 'a' })
      }
      this.stream.write(message)
    })

  }
}

module.exports = Setup

/**
 * @function prepareSettings
 * @description prepare detailed settings
 * @param {object} structure -
 * @returns {object} - array: [params, relations]
 * */

function prepareSettings (structure) {
  const params = []

  for (let i = 0; i < structure.length; i++) {
    const elem = structure[i]

    for (let i = 0; i < elem.number; i++) {
      const settings = Object.assign({}, elem)
      delete settings.number
      params.push(settings)
    }
  }

  return params
}
