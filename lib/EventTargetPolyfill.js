// see https://developer.mozilla.org/en-US/docs/Web/API/EventTarget#Example
"use strict";

class EventTargetPolyfill {
    constructor() {
        this.listeners = {};
    }

    addEventListener(type, callback) {
      if (!(type in this.listeners)) {
        this.listeners[type] = [];
      }
      this.listeners[type].push(callback);
    }

    removeEventListener(type, callback) {
      if (!(type in this.listeners)) {
        return;
      }
      var stack = this.listeners[type];
      for (var i = 0, l = stack.length; i < l; i++) {
        if (stack[i] === callback){
          stack.splice(i, 1);
          return;
        }
      }
    }

    dispatchEvent(event) {
      if (!(event.type in this.listeners)) {
        return true;
      }
      var stack = this.listeners[event.type].slice();
    
      for (var i = 0, l = stack.length; i < l; i++) {
        stack[i].call(this, event);
      }
      return !event.defaultPrevented;
    }
}

try {
    new window.EventTarget();
}
catch (e) {
    window.EventTarget = EventTargetPolyfill;
}

