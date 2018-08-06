/**
* author: "oujizeng",
* license: "MIT",
* github: "https://github.com/yangyuji/touch-libs",
* name: "touch-event.js",
* version: "1.0.0"
*/

(function (root, factory) {
    if (typeof module != 'undefined' && module.exports) {
        module.exports = factory();
    } else if (typeof define == 'function' && define.amd) {
        define( function () { return factory(); } );
    } else {
        root['touch'] = factory();
    }
}(this, function () {
    'use strict'

    function touch (el) {
        this.page = typeof el == 'string' ? document.querySelector(el) : el;   // 主容器
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
                threshold: 10,               // 最小滑动距离
                velocity: 0.3,               // 最小滑动速度
                direction: ['left','right']  // 支持方向
            },
            tap: {
                event: 'tap',
                time: 250,          // 最短按下时间
                threshold: 9        // 最大滑动距离
            }
        };

        this.moved = false;
        this.startTime = 0;
        this.endTime = 0;

        // 采用事件驱动，不使用回调
        this._events = {};

        // 绑定touch事件
        this._bindEvents();
    }

    touch.prototype = {
        version: '1.0.0',
        destroy: function () {
            this._unbindEvents();
            this._execEvent(this.EVENTS.destroy);
        },
        _start: function (e) {
            var point = e.touches ? e.touches[0] : e;

            this.moved		= false;
            this.distX		= 0;
            this.distY		= 0;

            this.startTime  = utils._getTime();
            this.endTime    = 0;
            this.pointX     = point.pageX;
            this.pointY     = point.pageY;

            this._execEvent(this.EVENTS.start);
        },
        _move: function (e) {
            var point		= e.touches ? e.touches[0] : e,
                deltaX		= point.pageX - this.pointX,
                deltaY		= point.pageY - this.pointY;

            this.pointX		= point.pageX;
            this.pointY		= point.pageY;

            this.distX		+= deltaX;
            this.distY		+= deltaY;

            // 执行了滑动
            if (!this.moved) {
                this._execEvent(this.EVENTS.started);
            }
            this.moved = true;

            this._execEvent(this.EVENTS.move, this.distX, this.distY, e);
        },
        _end: function (e) {
            var point    = e.changedTouches ? e.changedTouches[0] : e,
                duration = 0,       // 耗时
                velocity = null,    // 速度
                direction = 'none'; // 方向

            this.endTime = utils._getTime();
            this._execEvent(this.EVENTS.end);

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
                this._execEvent(this.options.tap.event, e);
            } else if (action == 'swipe') {
                this._execEvent(this.options.swipe.event);
                this._execEvent(this.options.swipe.event + '-' + direction);
            }
        },
        _cancel: function () {
            this.moved		= false;
            this.distX		= 0;
            this.distY		= 0;
            this.pointX     = 0;
            this.pointY     = 0;
            this._execEvent(this.EVENTS.cancel);
        },
        _getAction: function (duration, velocity, direction) {
            var action = 'none';
            // 滑动时间超过250ms, 且距离不超过10
            if ( duration > this.options.tap.time
                && (Math.abs(this.distX) < this.options.tap.threshold
                && Math.abs(this.distY) < this.options.tap.threshold) ) {
                action = 'tap';
            }
            // swipe 判断
            else if ( this.options.swipe.direction.indexOf(direction) > -1
                && Math.abs(this.distX) > this.options.swipe.threshold
                && velocity.x > this.options.swipe.velocity ) {
                action = 'swipe';
            }
            // ...未完待续
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
        _bindEvents: function () {
            this.start = this._start.bind(this);
            this.move = this._move.bind(this);
            this.end = this._end.bind(this);
            this.cancel = this._cancel.bind(this);

            this.page.addEventListener('touchstart', this.start,
                utils._supportPassive() ? { passive: true } : false);
            this.page.addEventListener('touchmove', this.move,
                utils._supportPassive() ? { passive: true } : false);
            this.page.addEventListener('touchend', this.end, false);
            this.page.addEventListener('touchcancel', this.cancel, false);
        },
        _unbindEvents: function () {
            this.page.removeEventListener('touchstart', this.start, false);
            this.page.removeEventListener('touchmove', this.move, false);
            this.page.removeEventListener('touchend', this.end, false);
            this.page.removeEventListener('touchcancel', this.cancel, false);
        },
        _execEvent: function (type) {
            if (!this._events[type]) {
                return;
            }
            var i = 0,
                l = this._events[type].length;
            if ( !l ) {
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
            if ( index > -1 ) {
                this._events[type].splice(index, 1);
            }
        }
    }

    var utils = {
        _getTime: Date.now || function getTime () { return new Date().getTime(); },
        _supportPassive: function () {
            var support = false;
            try {
                window.addEventListener("test", null,
                    Object.defineProperty({}, "passive", {
                        get: function() {
                            support = true;
                        }
                    })
                );
            } catch (err) {}
            return support
        }
    };

    touch.utils = utils;
    return touch;
}));