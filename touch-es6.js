/**
 * author: "oujizeng",
 * license: "MIT",
 * github: "https://github.com/yangyuji/touch-libs",
 * name: "touch-es6.js",
 * version: "1.0.1"
 */

class Touch {
    constructor(element) {
        this.el = element
        this.moved = false
        // start position
        this.startPos = {}
        // current position
        this.endPos = {}
        this._events = {}

        // 各种事件名称
        this.EVENTS = {
            start: 'touch-start',
            started: 'touch-started',
            move: 'touch-move',
            end: 'touch-end',
            cancel: 'touch-cancel',
            destroy: 'touch-destroy'
        };
        // 各种交互临界，参考hammer.js
        this.options = {
            swipe: {
                event: 'swipe',
                threshold: 10,                  // 最小滑动距离
                velocity: 0.3,                  // 最小滑动速度
                direction: ['left', 'right']    // 支持方向
            },
            tap: {
                event: 'tap',
                time: 200,           // 最短按下时间
                maxtime: 300,        // 最长按下时间
                threshold: 9         // 最大滑动距离
            },
            press: {
                event: 'press',
                time: 501,          // 最短按下时间
                threshold: 9        // 最大滑动距离
            }
        };

        this.el.addEventListener('touchstart', this, this._supportPassive() ? { passive: true } : false)
    }

    // refer to: https://www.thecssninja.com/javascript/handleevent
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
            time: Date.now()
        }
        this.endPos = {}
        this.el.addEventListener('touchmove', this, this._supportPassive() ? { passive: true } : false)
        this.el.addEventListener('touchend', this, false)

        this.emit(this.EVENTS.start, this.startPos, e)
    }

    touchMove(e) {
        if (e.scale && e.scale !== 1) return
        const touch = e.touches[0]
        this.endPos = {
            x: touch.pageX,
            y: touch.pageY,
            time: Date.now()
        }

        // start move
        if (!this.moved) {
            this.emit(this.EVENTS.started, e);
        }
        this.moved = true;

        this.emit(this.EVENTS.move, this.endPos, e)
    }

    touchEnd(e) {
        const touch = e.changedTouches ? e.changedTouches[0] : e
        this.endPos = {
            x: touch.pageX,
            y: touch.pageY,
            time: Date.now()
        }
        this.moved = false;
        this.el.removeEventListener('touchmove', this, false)
        this.el.removeEventListener('touchend', this, false)
        this.emit(this.EVENTS.end, this.endPos, e)

        const action = this._getAction()
        if (action == 'none') {
            return;
        } else if (action == 'tap') {
            this.emit(this.options.tap.event, e);
        } else if (action == 'press') {
            this.emit(this.options.press.event, e);
        } else if (action == 'swipe') {
            this.emit(this.options.swipe.event, e);
            const distX = this.endPos.x - this.startPos.x,
                distY = this.endPos.y - this.startPos.y,
                direction = this._getDirection(distX, distY);
            this.emit(this.options.swipe.event + '-' + direction, e);
        }
    }

    // action analyze
    _getAction () {
        const distX = this.endPos.x - this.startPos.x,
            distY = this.endPos.y - this.startPos.y,
            direction = this._getDirection(distX, distY),
            duration = this.endPos.time - this.startPos.time,
            velocity = {
                x: Math.abs(distX / duration),
                y: Math.abs(distY / duration)
            };

        let action = 'none';
        // tap
        if (duration > this.options.tap.time
            && duration < this.options.tap.maxtime
            && Math.abs(distX) < this.options.tap.threshold
            && Math.abs(distY) < this.options.tap.threshold) {
            action = 'tap';
        }
        // press
        else if (duration > this.options.press.time
            && Math.abs(distX) < this.options.press.threshold
            && Math.abs(distY) < this.options.press.threshold) {
            action = 'press';
        }
        // swipe
        else if (this.options.swipe.direction.indexOf(direction) > -1
            && Math.abs(distX) > this.options.swipe.threshold
            && velocity.x > this.options.swipe.velocity) {
            action = 'swipe';
        }
        // ...未完待续，双手指操作需要监听touches[0]和touches[1]的变化
        return action;
    }
    _getDirection (x, y) {
        if (x === y) {
            return 'none';
        }
        if (Math.abs(x) >= Math.abs(y)) {
            return x < 0 ? 'left' : 'right';
        }
        return y < 0 ? 'up' : 'down';
    }
    _supportPassive () {
        var support = false;
        try {
            window.addEventListener("test", null,
                Object.defineProperty({}, "passive", {
                    get: function () {
                        support = true;
                    }
                })
            );
        } catch (err) {
        }
        return support
    }

    // Event
    on(event, callback) {
        let callbacks = this._events[event] || []
        callbacks.push(callback)
        this._events[event] = callbacks
    }
    off(event, callback) {
        let callbacks = this._events[event] || []
        this._events[event] = callbacks.filter(fn => fn !== callback)
        this._events[event].length === 0 && delete this._events[event]
    }
    emit(...args) {
        const event = args[0]
        const params = [].slice.call(args, 1)
        const callbacks = this._events[event] || []
        callbacks.forEach(fn => fn.apply(this, params))
    }
    once(event, callback) {
        let wrapFunc = (...args) => {
            callback.apply(this, args)
            this.off(event, wrapFunc)
        }
        this.on(event, wrapFunc)
    }

    destory() {
        this._events = {}
        this.el.removeEventListener('touchstart', this, false)
        this.emit(this.EVENTS.destroy)
    }
}
