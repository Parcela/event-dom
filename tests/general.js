/*global describe, it */
"use strict";
var expect = require('chai').expect,
	should = require('chai').should(),

    Event = require("event"),
    EventDom = require('../event-dom'),
    EventEmitter = require('event/event-emitter.js'),
    EventListener = require('event/event-listener.js');

EventDom.mergeInto(Event);
EventEmitter.mergeInto(Event);
EventListener.mergeInto(Event);

describe('General tests', function () {

    // Code to execute before every test.
    beforeEach(function() {
    });

    // Code to execute after every test.
    afterEach(function() {
        Event.detachAll();
        Event.undefAllEvents();
        Event.unNotifyAll();
    });

    it('consistency eventobject', function () {
        var redObject = {},
            handle;
        handle = Event.onceBefore('red:save', function(e) {}, redObject);
        Event._subs['red:save'].b.length.should.be.equal(1);
        handle.detach();
        (Event._subs['red:save']===undefined).should.be.true;
    });

    it('check detach-handle before-subscriber', function () {
        var redObject = {},
            handle;
        handle = Event.before('red:save', function(e) {}, redObject);
        Event._subs['red:save'].b.length.should.be.equal(1);
        handle.detach();
        (Event._subs['red:save']===undefined).should.be.true;
    });

    it('check detach-handle after-subscriber', function () {
        var redObject = {},
            handle;
        handle = Event.after('red:save', function() {}, redObject);
        Event._subs['red:save'].a.length.should.be.equal(1);
        handle.detach();
        (Event._subs['red:save']===undefined).should.be.true;
    });

    it('check detach-handle onceBefore-subscriber', function () {
        var redObject = {},
            handle;
        handle = Event.onceBefore('red:save', function() {}, redObject);
        Event._subs['red:save'].b.length.should.be.equal(1);
        handle.detach();
        (Event._subs['red:save']===undefined).should.be.true;
    });

    it('check detach-handle onceAfter-subscriber', function () {
        var redObject = {},
            handle;
        handle = Event.onceAfter('red:save', function() {}, redObject);
        Event._subs['red:save'].a.length.should.be.equal(1);
        handle.detach();
        (Event._subs['red:save']===undefined).should.be.true;
    });

    it('onceBefore-subscriber auto cleanup', function (done) {
        var redObject = {},
            count = 0;
        Event.onceBefore('red:save', function() {
            count++;
        }, redObject);
        Event.emit(redObject, 'red:save');
        Event.emit(redObject, 'red:save');
        setTimeout(function() {
            count.should.be.equal(1);
            done();
        }, 500);
    });

    it('onceAfter-subscriber auto cleanup', function (done) {
        var redObject = {},
            count = 0;
        Event.onceAfter('red:save', function() {
            count++;
        }, redObject);
        Event.emit(redObject, 'red:save');
        Event.emit(redObject, 'red:save');
        setTimeout(function() {
            count.should.be.equal(1);
            done();
        }, 50);
    });

    it('onceBefore-subscriber auto cleanup with halted inbetween', function (done) {
        var redObject = {},
            count = 0,
            handle;
        Event.onceBefore('red:save', function(e) {
            e.halt();
        }, redObject);
        handle = Event.onceBefore('red:save', function() {
            count++;
        }, redObject);
        Event.emit(redObject, 'red:save');
        Event.emit(redObject, 'red:save');
        Event.emit(redObject, 'red:save');
        setTimeout(function() {
            count.should.be.equal(1);
            handle.detach();
            done();
        }, 50);
    });

    it('onceAfter-subscriber auto cleanup with halted inbetween', function (done) {
        var redObject = {},
            count = 0,
            handle;
        Event.onceBefore('red:save', function(e) {
            e.halt();
        }, redObject);
        handle = Event.onceAfter('red:save', function() {
            count++;
        }, redObject);
        Event.emit(redObject, 'red:save');
        Event.emit(redObject, 'red:save');
        Event.emit(redObject, 'red:save');
        setTimeout(function() {
            count.should.be.equal(1);
            handle.detach();
            done();
        }, 50);
    });

    it('Event.finalize size', function () {
        var count = Event._final.length,
            handle1 = Event.finalize(function() {}),
            handle2 = Event.finalize(function() {});
        Event._final.length.should.be.equal(count+2);
        handle1.detach();
        Event._final.length.should.be.equal(count+1);
        handle2.detach();
        Event._final.length.should.be.equal(count);
    });

    it('Event.finalize invocation and eventobject', function (done) {
        var count = Event._final.length,
            handle;
        handle = Event.finalize(function(e) {
            handle.detach();
            e.fin.should.be.equal(10);
            done();
        });
        Event.before('red:finalize1', function(e) {
            e.fin = 10;
        });
        Event.emit('red:finalize1');
    });

    it('check detach() on the object', function () {
        var blueObject = {};
        blueObject.merge(Event.Listener);
        blueObject.before('blue:save', function() {});
        Event._subs['blue:save'].b.length.should.be.equal(1);
        blueObject.detach('blue:save');
        (Event._subs['blue:save']===undefined).should.be.true;
    });

    it('check detach() on the object with multiple subscribers', function () {
        var blueObject = {},
            greenObject = {};
        blueObject.merge(Event.Listener);
        greenObject.merge(Event.Listener);
        blueObject.before('blue:save', function() {});
        blueObject.before('blueb:save', function() {});
        greenObject.before('blue:save', function() {});
        Event._subs['blue:save'].b.length.should.be.equal(2);
        blueObject.detach('blue:save');
        Event._subs['blue:save'].b.length.should.be.equal(1);
        greenObject.detach('blue:save');
        (Event._subs['blue:save']===undefined).should.be.true;
        Event._subs['blueb:save'].b.length.should.be.equal(1);
        blueObject.detach('blueb:save');
        (Event._subs['blueb:save']===undefined).should.be.true;
    });

    it('check detachAll() on the object', function () {
        var blueObject = {},
            greenObject = {};
        blueObject.merge(Event.Listener);
        greenObject.merge(Event.Listener);
        blueObject.before('blue:save', function() {});
        blueObject.before('blueb:save', function() {});
        greenObject.before('blue:save', function() {});
        Event._subs['blue:save'].b.length.should.be.equal(2);
        blueObject.detachAll();
        Event._subs['blue:save'].b.length.should.be.equal(1);
        (Event._subs['blueb:save']===undefined).should.be.true;
        greenObject.detach('blue:save');
        (Event._subs['blue:save']===undefined).should.be.true;
    });

    it('check detachAll() on ITSA.Event', function () {
        var blueObject = {},
            greenObject = {};
        blueObject.merge(Event.Listener);
        greenObject.merge(Event.Listener);
        blueObject.before('blue:save', function() {});
        blueObject.before('blueb:save', function() {});
        greenObject.before('blue:save', function() {});
        Event._subs['blue:save'].b.length.should.be.equal(2);
        Event.detachAll(blueObject);
        Event._subs['blue:save'].b.length.should.be.equal(1);
        (Event._subs['blueb:save']===undefined).should.be.true;
        greenObject.detach('blue:save');
        (Event._subs['blue:save']===undefined).should.be.true;
    });

    it('check detachAll() on ITSA.Event', function () {
        var blueObject = {},
            greenObject = {};
        blueObject.merge(Event.Listener);
        blueObject.before('blue:save', function() {});
        Event.detachAll(); // will log an error --> cannot be called without parameters
        (Event._subs['blue:save']===undefined).should.be.true;
    });

    it('cross-emits', function (done) {
        var blueObject = {},
            redObject = {};
        Event.before('blue:save', function() {
            Event.detachAll(blueObject);
            Event.detachAll(redObject);
            done();
        }, blueObject);
        Event.before('red:save', function() {
            throw new Error('wrong subscriber invoked');
        }, redObject);
        Event.emit(redObject, 'blue:save');
    });

    it('status.ok', function () {
        Event.defineEvent('red:save').defaultFn(function() {});
        Event.emit('red:save').status.ok.should.be.true;
    });

    it('status.ok when no customEvent', function () {
        Event.emit('red:save').status.ok.should.be.true;
    });

    it('status.ok when halted', function () {
        Event.defineEvent('red:save').defaultFn(function() {});
        Event.before('red:save', function(e) {
            e.halt();
        });
        Event.emit('red:save').status.ok.should.be.false;
    });

    it('status.ok when halted when no customEvent', function () {
        Event.before('red:save', function(e) {
            e.halt();
        });
        Event.emit('red:save').status.ok.should.be.false;
    });

    it('status.ok when preventDefaulted', function () {
        Event.defineEvent('red:save').defaultFn(function() {});
        Event.before('red:save', function(e) {
            e.preventDefault();
        });
        Event.emit('red:save').status.ok.should.be.false;
    });

    it('status.ok when preventDefaulted when no customEvent', function () {
        Event.before('red:save', function(e) {
            e.preventDefault();
        });
        Event.emit('red:save').status.ok.should.be.false;
    });

    it('status.defaultFn', function () {
        Event.defineEvent('red:save').defaultFn(function() {});
        Event.emit('red:save').status.defaultFn.should.be.true;
    });

    it('status.defaultFn when halted', function () {
        Event.defineEvent('red:save').defaultFn(function() {});
        Event.before('red:save', function(e) {
            e.halt();
        });
        (Event.emit('red:save').status.defaultFn===undefined).should.be.true;
    });

    it('status.defaultFn when preventDefaulted', function () {
        Event.defineEvent('red:save').defaultFn(function() {});
        Event.before('red:save', function(e) {
            e.preventDefault();
        });
        (Event.emit('red:save').status.defaultFn===undefined).should.be.true;
    });

    it('status.defaultFn when no customEvent', function () {
        (Event.emit('red:save').status.defaultFn===undefined).should.be.true;
    });

    it('status.preventedFn', function () {
        Event.defineEvent('red:save').preventedFn(function() {});
        (Event.emit('red:save').status.preventedFn===undefined).should.be.true;
    });

    it('status.preventedFn when halted', function () {
        Event.defineEvent('red:save').preventedFn(function() {});
        Event.before('red:save', function(e) {
            e.halt();
        });
        (Event.emit('red:save').status.preventedFn===undefined).should.be.true;
    });

    it('status.preventedFn when preventDefaulted', function () {
        Event.defineEvent('red:save').preventedFn(function() {});
        Event.before('red:save', function(e) {
            e.preventDefault();
        });
        Event.emit('red:save').status.preventedFn.should.be.true;
    });

    it('status.preventedFn when no customEvent', function () {
        (Event.emit('red:save').status.preventedFn===undefined).should.be.true;
    });

    it('status.halted when not halted', function () {
        (Event.emit('red:save').status.halted===undefined).should.be.true;
    });

    it('status.halted when halted without description', function () {
        Event.before('red:save', function(e) {
            e.halt();
        });
        Event.emit('red:save').status.halted.should.be.true;
    });

    it('status.halted when halted with description', function () {
        Event.before('red:save', function(e) {
            e.halt('some reason');
        });
        Event.emit('red:save').status.halted.should.be.eql('some reason');
    });

    it('status.defaultPrevented when not defaultPrevented', function () {
        (Event.emit('red:save').status.defaultPrevented===undefined).should.be.true;
    });

    it('status.defaultPrevented when defaultPrevented without description', function () {
        Event.before('red:save', function(e) {
            e.preventDefault();
        });
        Event.emit('red:save').status.defaultPrevented.should.be.true;
    });

    it('status.defaultPrevented when defaultPrevented with description', function () {
        Event.before('red:save', function(e) {
            e.preventDefault('some reason');
        });
        Event.emit('red:save').status.defaultPrevented.should.be.eql('some reason');
    });

    it('status.renderPrevented when not renderPrevented', function () {
        (Event.emit('red:save').status.renderPrevented===undefined).should.be.true;
    });

    it('status.renderPrevented when renderPrevented without description', function () {
        Event.before('red:save', function(e) {
            e.preventRender();
        });
        Event.emit('red:save').status.renderPrevented.should.be.true;
    });

    it('status.renderPrevented when renderPrevented with description', function () {
        Event.before('red:save', function(e) {
            e.preventRender('some reason');
        });
        Event.emit('red:save').status.renderPrevented.should.be.eql('some reason');
    });

    it('check notify()', function () {
        var count = 0;
        Event.notify('red:save', function(ce) {
            ce.should.be.eql('red:save');
            Event._notifiers.keys().length.should.be.eql(1);
            count++;
        }, Event);
        Event.before('red:save', function() {
            Event._notifiers.keys().length.should.be.eql(0);
        });
        Event.emit('red:save');
        Event.emit('red:save');
        count.should.be.eql(1);
    });

    it('check notify() wildcard', function () {
        var count = 0;
        Event.notify('red:*', function(ce) {
            (count===0) && ce.should.be.eql('red:save');
            (count===1) && ce.should.be.eql('red:create');
            Event._notifiers.keys().length.should.be.eql(1);
            count++;
        }, Event);
        Event.before('red:save', function() {
            Event._notifiers.keys().length.should.be.eql(1);
        });
        Event.before('red:create', function() {
            Event._notifiers.keys().length.should.be.eql(1);
        });
        Event.emit('red:save');
        Event.emit('red:create');
        count.should.be.eql(2);
    });

    it('check unNotify()', function () {
        var count = 0;
        Event.notify('red:save', function(ce) {
            count++;
        }, Event);
        Event.unNotify('red:save');
        Event.emit('red:save');
        count.should.be.eql(0);
    });

    it('check unNotify() wildcard', function () {
        var count = 0;
        Event.notify('red:*', function(ce) {
            count++;
        }, Event);
        Event.unNotify('red:*');
        Event.emit('red:save');
        count.should.be.eql(0);
    });

    it('check unNotifyAll()', function () {
        var count = 0;
        Event.notify('red:save', function(ce) {
            count++;
        }, Event);
        Event.notify('red:*', function(ce) {
            count++;
        }, Event);
        Event.unNotifyAll();
        Event.emit('red:save');
        count.should.be.eql(0);
    });

    it('check notify() when not needed', function () {
        Event.notify('red:save', function(ce) {}, Event);
        Event.emit('red:save');
        Event.unNotify('red:save'); // should not throw error
    });

});
