/**
 * author: "oujizeng",
 * license: "MIT",
 * github: "https://github.com/yangyuji/touch-libs",
 * name: "touch-es6.js",
 * version: "1.0.0"
 */

class Touch {
    constructor(element) {
        this.el = element

        // start position
        this.startPos = {}
        // current position
        this.endPos = {}

        this._events = {}
        this.el.addEventListener('touchstart', this, false)
    }

    // 实现handleEvent接口才可以使用this绑定
    handleEvent(e) {
        switch (e.type) {
            case 'touchstart':
                this.touchStart(e)
                break
            case 'touchmove':
                this.touchMove(e)
                break
            case 'touchcancel':
            case 'touchend':
                this.touchEnd(e)
                break
        }
    }

    touchStart(e) {
        const touch = e.touches[0]
        this.startPos = {
            x: touch.pageX,
            y: touch.pageY,
            time: new Date().getTime()
        }
        this.endPos = {}
        this.el.addEventListener('touchmove', this, false)
        this.el.addEventListener('touchend', this, false)

        this.emit('start', this.startPos, e)
    }

    touchMove(e) {
        if (e.touches.length > 1 || e.scale && e.scale !== 1) return
        const touch = e.touches[0]
        this.endPos = {
            x: touch.pageX - this.startPos.x,
            y: touch.pageY - this.startPos.y,
            time: new Date().getTime() - this.startPos.time
        }

        this.emit('move', this.endPos, e)
    }

    touchEnd(e) {
        // const touch = e.changedTouches ? e.changedTouches[0] : e
        this.endPos.time = new Date().getTime() - this.startPos.time
        this.el.removeEventListener('touchmove', this, false)
        this.el.removeEventListener('touchend', this, false)

        this.emit('end', this.endPos, e)
    }

    // Event
    on(event, callback) {
        let callbacks = this._events[event] || []
        callbacks.push(callback)
        this._events[event] = callbacks
        return this
    }
    off(event, callback) {
        let callbacks = this._events[event] || []
        this._events[event] = callbacks.filter(fn => fn !== callback)
        this._events[event].length === 0 && delete this._events[event]
        return this
    }
    emit(...args) {
        const event = args[0]
        const params = [].slice.call(args, 1)
        const callbacks = this._events[event] || []
        callbacks.forEach(fn => fn.apply(this, params))
        return this
    }
    once(event, callback) {
        let wrapFunc = (...args) => {
            callback.apply(this, args)
            this.off(event, wrapFunc)
        }
        this.on(event, wrapFunc)
        return this
    }

    destory() {
        this._events = {}
        this.el.removeEventListener('touchstart', this, false)
    }
}
