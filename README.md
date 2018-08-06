# touch-libs
some light &amp; tiny touch scripts with no dependancy

## use like this:
```javascript
var myTouch = new touch('.page');
    myTouch.on('touch-move', function (distX, distY) {
        console.log(distX, distY);
    });
    myTouch.on('tap', function (e) {
        console.log('tap', e);
    });
    myTouch.on('swipe', function () {
        console.log('swipe');
    });
    myTouch.on('swipe-left', function () {
        console.log('swipeLeft');
    });
    myTouch.on('swipe-right', function () {
        console.log('swipeRight');
    });
```