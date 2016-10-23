'use strict'

const Widget = require('./widget')
const Emitter = require('./emitter')
const id = require('./id-gen')
const Hoek = require('hoek')

class Dashboard {
  constructor (descriptor, io) {
    this.id = id()
    this.name = descriptor.name
    this.sharedConfig = descriptor['shared-config']
    this.emitter = new Emitter(io, this.id)
    this.layout = descriptor.layout
    this.widgets = descriptor.widgets.map(this.registerWidget.bind(this))
  }

  registerWidget (fd) {
    const inheritFrom = Hoek.reach(fd, 'options._extends')

    let options = fd.options
    if (inheritFrom) {
      if (!this.sharedConfig || !this.sharedConfig.hasOwnProperty(inheritFrom)) {
        throw new Error(`Shared configuration ${inheritFrom} does not exist.`)
      }

      const base = this.sharedConfig[inheritFrom]
      options = Object.assign({}, base, fd.options)
      delete options._extends
    }

    return new Widget(this, fd.position, fd.widget, options)
  }

  initialise () {
    this.buildJobs()
  }

  getWidgets () {
    return this.widgets
  }

  getJobs () {
    return this.jobs
  }

  buildJobs () {
    this.jobs = this.getWidgets().map((widget) => {
      const job = widget.getJob()
      if (job) {
        let executeJob = this.emitResult.bind(this, widget, this.emitter)
        executeJob()
        return setInterval(executeJob, job.schedule)
      }
    })
  }

  emitResult (widget, emitter) {
    return widget.getJob().script().then((result) => {
      result._updated = new Date()
      emitter.emit(widget.id, result)
    })
    .catch((err) => {
      console.error(`Error in widget ${widget.descriptor} (${widget.id})`, err)
      emitter.emit(widget.id, { error: { message: (err && err.message) || 'An unknown error occured' } })
    })
  }

  toRenderModel () {
    return {
      name: this.name,
      widgets: this.getWidgets().map((widget) => {
        return widget.toRenderModel()
      })
    }
  }

}

module.exports = Dashboard
