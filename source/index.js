'use strict'

// Dependencies
import { createWorkerScript } from './utils'

const _workers = new WeakMap()

/**
 * @description A module allowing developers to benefit from the wonderful Promise interface whilst enjoying the
 *              multi-threaded goodness provided by WebWorkers.
 */
class HonestWorkers {
  constructor () {
    _workers.set(this, {})

    // Setup the default values
    this.defaultThreads = 5
  }

  /**
   * @description This method will register a new function or task using the supplied UID, provided that that UID has
   *              not previously been used. For convenience, a reference to the newly registered item will be returned.
   *
   *              The function or task must adhere to the formatting in the example provided, and the UID must be a
   *              unique string (in the context of the HonestWorker instance).
   *
   * @example
   * honestWorkers.register('myTask', function (done) {
   *   // ... do something snazzy
   *
   *   done()
   * })
   *
   * @param {String}   uid - A unique name or identifier
   * @param {Function} fn  - A function with no lexical dependance
   *
   * @return {Function} A reference to the new congifuration object
   */
  register (uid, fn) {
    const workers = _workers.get(this)

    // Ensure that the UID provided has not previously been used
    if (workers[uid]) {
      throw Error('The UID must be unique')
    }

    // Generate the script source using the provided function
    const src = createWorkerScript(fn);

    workers[uid] = {
      src,
      threads: ((n) => {
        const threads = []
        for (let i = 0; i < n;) {
          threads[i++] = new Worker(src)
        }
        return threads
      })(this.defaultThreads)
    }
    _workers.set(this, workers)

    return workers[uid]
  }

  /**
   * @param {String} uid  - A unique name or identifier
   * @param {...Any} args - A list of arguements to be passed
   *
   * @return {Promise} A Promise dependant on the success of the task
   */
  execute (uid, ...args) {
    let worker

    // Ensure that the UID has been registered
    if (!(worker = _workers.get(this)[uid])) {
      throw Error('The UID has not been defined')
    }

    // Retrieve a reference to a free thread or create a new one
    for (let i = 0, n = worker.threads.length; i < n; i++) {
      if (!worker.threads[i].onmessage) {
        worker = worker.threads[i]
        break
      }
    }

    if (!worker) {
      worker = worker.threads[worker.threads.length] = new Worker(worker.src)
    }

    console.log(worker)

    return new Promise((resolve, reject) => {
      worker.onmessage = (e) => {
        resolve(e.data)
        worker.onmessage = null
      }

      worker.postMessage(args)
    })
  }

  /**
   * @return {Function} - A reference to the HonestWorkers class
   */
  get Class () {
    return HonestWorkers
  }
}

module.exports = new HonestWorkers()
