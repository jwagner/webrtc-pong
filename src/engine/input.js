var clamp = require('./util').clamp;

// mapping keycodes to names
var keyname = {
    32: 'SPACE',
    13: 'ENTER',
    9: 'TAB',
    8: 'BACKSPACE',
    16: 'SHIFT',
    17: 'CTRL',
    18: 'ALT',
    20: 'CAPS_LOCK',
    144: 'NUM_LOCK',
    145: 'SCROLL_LOCK',
    37: 'LEFT',
    38: 'UP',
    39: 'RIGHT',
    40: 'DOWN',
    33: 'PAGE_UP',
    34: 'PAGE_DOWN',
    36: 'HOME',
    35: 'END',
    45: 'INSERT',
    46: 'DELETE',
    27: 'ESCAPE',
    19: 'PAUSE'
};


function Key(name) {
    this.name = name;
    this.reset();
}
Key.prototype = {
    tick: function() {
        this.up = false;
        this.down = false;
    },
    press: function() {
        //console.log('press ' + this.name);
        this.down = true;
        this.pressed = true;
    }, 
    release: function() {
        console.log('release ' + this.name);
        this.pressed = false;
        this.up = true;
    }, 
    reset: function() {
        this.up = false;
        this.down = false;
        this.pressed = false;
    }
};

function Keyboard(){
    var name;
    this.keys = Object.create(null);
    this.keyList = [];
    for(var i = 65; i < 128; i++) {
        name = String.fromCharCode(i);
        this.keyList.push(this.keys[name] = new Key(name));
    }
    for(i in keyname){
        if(keyname.hasOwnProperty(i)){
            name = keyname[i];
            this.keyList.push(this.keys[name] = new Key(name));
        }
    }
}
Keyboard.prototype = {
    tick: function() {
        for(var i = 0; i < this.keyList.length; i++) {
            var key = this.keyList[i];
            key.tick();
        }
    },
    reset: function() {
        for(var i = 0; i < this.keyList.length; i++) {
            var key = this.keyList[i];
            key.reset();
        }
    }
};

function Mouse(){
    this.left = new Key('mouse left');
    this.right = new Key('mouse right');
    this.updateDelta = true;
    this.reset();
}
Mouse.prototype = {
    tick: function () {
        this.wheel = this.wheel0;

        this.wheel0 = 0.0;

        if(this.updateDelta){
            this.xd = this.x - this.x0;
            this.yd = this.y - this.y0;
            this.x0 = this.x;
            this.y0 = this.y;
        }
        else {
            this.xd -= this.x0;
            this.x0 = this.xd;
            this.yd -= this.y0;
            this.y0 = this.yd;
        }

        this.left.tick();
        this.right.tick();
    },
    reset: function() {
        this.left.reset();
        this.right.reset();

        this.wheel = 0.0;
        this.wheel0 = 0.0;

        this.x = 0;
        this.x0 = 0;
        this.y = 0;
        this.y0 = 0;

        this.xd = 0;
        this.yd = 0;
        
        this.lock = false;
    }, 
    move: function(x, y, xd, yd) {
        this.x = x;
        this.y = y;
        if(xd !== undefined){
            this.xd += xd;
            this.yd += yd;
            this.updateDelta = false;
        }
    }
}; 

function Handler(element) {
    this.keyboard = new Keyboard();
    this.key = this.keyboard.keys;
    this.mouse = new Mouse();
    this.bind(element);
}
exports.Handler = Handler;
Handler.prototype = {
    tick: function() {
        this.mouse.tick();
        this.keyboard.tick();
    }, 
    bind: function(element) {
        var self = this;
        this.hasFocus = true;
        this.element = element;
        this.updateOffset();
        document.addEventListener('keydown', function(e){
            var name = self.getKeyName(e.keyCode);
            if(name in self.key){
                self.key[name].press();
            }
            if(self.hasFocus) e.preventDefault();
        });
        document.addEventListener('keyup', function(e){
            var name = self.getKeyName(e.keyCode);
            if(name in self.key){
                self.key[name].release();
            }
            if(self.hasFocus) e.preventDefault();
        });
        window.addEventListener('click', function(e){
            if(self.mouse.lock){
                return;
            }
            if(e.target != element){
                self.blur();
            }
            else {
                self.focus();
            }
        });
        window.addEventListener('blur', function (e) {
            self.blur();
        });
        document.addEventListener('mousemove', function(e) {
            var x = clamp(e.pageX-self.offset.x, 0, self.width),
                y = clamp(e.pageY-self.offset.y, 0, self.height);
            self.mouse.move(x, y, e.movementX, e.movementY);
        });
        element.addEventListener('mousedown', function (e) {
            if(e.button > 1){
                self.mouse.right.press();
            }
            else {
                self.mouse.left.press();
            }
            if(self.hasFocus) e.preventDefault();
        });
        element.addEventListener('mouseup', function (e) {
            if(e.button > 1){
                self.mouse.right.release();
            }
            else {
                self.mouse.left.release();
            }
            if(self.hasFocus) e.preventDefault();
        });
        // prevent text selection in browsers that support it
        document.addEventListener('selectstart', function (e) {
            if(self.hasFocus) e.preventDefault();
        });
        document.addEventListener('contextmenu', function (e) {
            if(self.hasFocus) e.preventDefault();
        });
        document.addEventListener('pointerlockchange', function (e) {
            self.mouse.lock = (document.pointerLockElement == self.element);
        });

    },
    lock: function() {
        this.element.requestPointerLock();
    }, 
    updateOffset: function() {
        var offset = this.element.getBoundingClientRect();
        this.width = offset.width;
        this.height = offset.height;
        this.offset = {x:offset.left, y:offset.top};
    }, 
    blur: function() {
        this.hasFocus = false;
        this.reset();
    },
    focus: function() {
        if(!this.hasFocus) {
            this.hasFocus = true;
            this.reset();
        }
    },
    reset: function() {
        this.mouse.reset();
        this.keyboard.reset();
    },
    getKeyName: function(code) {
        if(code in keyname) {
            return keyname[code];
        }
        return String.fromCharCode(code);
    }
 
};

