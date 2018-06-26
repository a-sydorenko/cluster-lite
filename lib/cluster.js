'use strict'

const EventEmitter = require('events').EventEmitter

class ClusterController extends EventEmitter {

  /**
   * @param {object} options
   * @param {number|void} options.numberCores
   * @param {number|void} options.timeoutOffset
   * */

  constructor (options) {
    super()
    // the marker that indicates that all processes are working
    this.state = false
    this.numberCores = options.numberCores || require('os').cpus().length
    // forks storage
    this.map = new Map()
    // cpu protection
    this.timeoutOffset = options.timeoutOffset || 2000
    // stateChange timeout for changing direction: false => true
    this.timeout = null
  }

  /**
   * @method updateState
   * @description updates instance state
   * @returns {void}
   * */

  updateState () {
    if (this.state) {
      if (this.map.size !== this.numberCores) {
        if (this.timeout) {
          clearTimeout(this.timeout)
        }
        this.emit('stateChange', this.state = false)
      }
    }
    else {
      if (this.map.size === this.numberCores) {
        this.timeout = setTimeout(() => {
          clearTimeout(this.timeout)
          this.timeout = null
          this.emit('stateChange', this.state = true)
        }, this.timeoutOffset)
      }
    }
  }

  /**
   * @method setFork
   * @description set fork to storage
   * @param {object} fork - child process instance wrapper
   * @param {object} settings - current fork config
   * @param {object} settings.conf - current fork config
   * @param {object} settings.param - current fork params
   * @returns {void}
   * */

  setFork (fork, settings) {
    this.map.set(fork, settings)
    this.updateState()
  }

  /**
   * @method getFork
   * @description get settings for passed fork from storage
   * @param {object} fork - child process instance wrapper
   * @returns {object} - null if passed fork doesn't exist
   * */

  getFork (fork) {
    return this.map.get(fork)
  }

  /**
   * @method deleteFork
   * @description delete passed fork from storage, updateState()
   * @param {object} fork - child process instance wrapper
   * @returns {void}
   * */

  deleteFork (fork) {
    this.map.has(fork) ? this.map.delete(fork) : null
    this.updateState()
  }

  /**
   * @method notify
   * @description send message for child process using fork
   * @param {object} message - JSON format message
   * @param {object} fork - child process instance wrapper
   * @returns {void}
   * */

  notify (message, fork) {
    this.map.get(fork).send(message)
  }
}

module.exports = ClusterController
