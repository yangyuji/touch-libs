/**
 * author: "oujizeng",
 * license: "MIT",
 * github: "https://github.com/yangyuji/touch-libs",
 * name: "touch-event.js",
 * version: "1.1.1"
 */

(function (root, factory) {
    if (typeof module != 'undefined' && module.exports) {
        module.exports = factory();
    } else if (typeof define == 'function' && define.amd) {
        define(function () {
            return factory();
        });
    } else {
        root['touch'] = factory();
    }
}(this, function () {
    'use strict'

    function touch(el) {
        this.page = typeof el == 'string' ? document.querySelector(el) : el;   // 主容器
        // 各种事件名称
        this.EVENTS = {
            start: 'touch-start',
            started: 'touch-started',
            move: 'touch-move',
            throttle: 'throttle-move',
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

        this.moved = false;
        this.startTime = 0;
        this.endTime = 0;

        this.start = this._start.bind(this);
        this.move = this._move.bind(this);
        this.end = this._end.bind(this);
        this.cancel = this._cancel.bind(this);

        // 采用事件驱动，不使用回调
        this._events = {};

        // 绑定touch事件
        this.page.addEventListener('touchstart', this.start,
            utils._supportPassive() ? { passive: true } : false);
    }

    touch.prototype = {
        version: '1.1.1',
        destroy: function () {
            this.page.removeEventListener('touchstart', this.start, false);
            this.emit(this.EVENTS.destroy);
        },
        _start: function (e) {
            var point = e.touches ? e.touches[0] : e;

            this.moved = false;
            this.distX = 0;
            this.distY = 0;

            this.startTime = utils._getTime();
            this.endTime = 0;
            this.pointX = point.pageX;
            this.pointY = point.pageY;

            this.page.addEventListener('touchmove', this.move,
                utils._supportPassive() ? { passive: true } : false);
            this.page.addEventListener('touchend', this.end, false);
            this.page.addEventListener('touchcancel', this.cancel, false);

            this.emit(this.EVENTS.start, e);
        },
        _move: function (e) {
            var point = e.touches ? e.touches[0] : e,
                deltaX = point.pageX - this.pointX,
                deltaY = point.pageY - this.pointY;

            this.pointX = point.pageX;
            this.pointY = point.pageY;

            this.distX += deltaX;
            this.distY += deltaY;

            // 执行了滑动
            if (!this.moved) {
                this.emit(this.EVENTS.started, e);
            }
            this.moved = true;

            this.emit(this.EVENTS.move, this.distX, this.distY, e);
            // throttle
            var _this = this;
            requestAnimationFrame(function () {
                _this.emit(_this.EVENTS.throttle, _this.distX, _this.distY, e);
            });
        },
        _end: function (e) {
            var point = e.changedTouches ? e.changedTouches[0] : e,
                duration = 0,       // 耗时
                velocity = null,    // 速度
                direction = 'none'; // 方向

            this.moved = false;
            this.page.removeEventListener('touchmove', this.move, false);
            this.page.removeEventListener('touchend', this.end, false);
            this.page.removeEventListener('touchcancel', this.cancel, false);

            this.endTime = utils._getTime();
            this.emit(this.EVENTS.end);

            duration = this.endTime - this.startTime;
            direction = this._getDirection(this.distX, this.distY);
            velocity = {
                x: Math.abs(this.distX / duration),
                y: Math.abs(this.distY / duration)
            };

            // 行为判断
            var action = this._getAction.call(this, duration, velocity, direction);
            if (action == 'none') {
                return;
            } else if (action == 'tap') {
                this.emit(this.options.tap.event, e);
            } else if (action == 'press') {
                this.emit(this.options.press.event, e);
            } else if (action == 'swipe') {
                this.emit(this.options.swipe.event, e);
                this.emit(this.options.swipe.event + '-' + direction, e);
            }
        },
        _cancel: function (e) {
            this.moved = false;
            this.page.removeEventListener('touchmove', this.move, false);
            this.page.removeEventListener('touchend', this.end, false);
            this.page.removeEventListener('touchcancel', this.cancel, false);
            this.distX = 0;
            this.distY = 0;
            this.pointX = 0;
            this.pointY = 0;
            this.emit(this.EVENTS.cancel, e);
        },
        _getAction: function (duration, velocity, direction) {
            var action = 'none';
            // tap
            if (duration > this.options.tap.time
                && duration < this.options.tap.maxtime
                && Math.abs(this.distX) < this.options.tap.threshold
                && Math.abs(this.distY) < this.options.tap.threshold) {
                action = 'tap';
            }
            // press
            else if (duration > this.options.press.time
                && Math.abs(this.distX) < this.options.press.threshold
                && Math.abs(this.distY) < this.options.press.threshold) {
                action = 'press';
            }
            // swipe
            else if (this.options.swipe.direction.indexOf(direction) > -1
                && Math.abs(this.distX) > this.options.swipe.threshold
                && velocity.x > this.options.swipe.velocity) {
                action = 'swipe';
            }
            // ...未完待续，双手指操作需要监听touches[0]和touches[1]的变化
            return action;
        },
        _getDirection: function (x, y) {
            if (x === y) {
                return 'none';
            }
            if (Math.abs(x) >= Math.abs(y)) {
                return x < 0 ? 'left' : 'right';
            }
            return y < 0 ? 'up' : 'down';
        },
        // Event
        emit: function (type) {
            if (!this._events[type]) {
                return;
            }
            var i = 0,
                l = this._events[type].length;
            if (!l) {
                return;
            }
            for (; i < l; i++) {
                this._events[type][i].apply(this, [].slice.call(arguments, 1));
            }
        },
        on: function (type, fn) {
            if (!this._events[type]) {
                this._events[type] = [];
            }
            this._events[type].push(fn);
        },
        off: function (type, fn) {
            if (!this._events[type]) {
                return;
            }
            var index = this._events[type].indexOf(fn);
            if (index > -1) {
                this._events[type].splice(index, 1);
            }
        }
    }

    var utils = {
        _getTime: Date.now || function getTime() {
            return new Date().getTime();
        },
        _supportPassive: function () {
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
    };

    return touch;
}));