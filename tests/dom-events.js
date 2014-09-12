/*global describe, it */
"use strict";
var expect = require('chai').expect,
    should = require('chai').should(),

    Event = require("event"),
    EventDom = require('../event-dom'),
    EventEmitter = require('event/event-emitter.js'),
    EventListener = require('event/event-listener.js'),

    EMIT_CLICK_EVENT, EMIT_FOCUS_EVENT, EMIT_KEY_EVENT, buttonnode, divnode;

EventDom.mergeInto(Event);
EventEmitter.mergeInto(Event);
EventListener.mergeInto(Event);

EMIT_CLICK_EVENT = function(target) {
    if (!window) {
        return;
    }
    var customEvent,
        type = 'click',
        bubbles = true, //all mouse events bubble
        cancelable = false,
        view = window,
        detail = 1,  //number of mouse clicks must be at least one
        screenX = 0,
        screenY = 0,
        clientX = 0,
        clientY = 0,
        ctrlKey = false,
        altKey = false,
        shiftKey = false,
        metaKey = false,
        button = 0,
        relatedTarget = null;

    if (document.createEvent) {
        customEvent = document.createEvent('MouseEvents');
        customEvent.initMouseEvent(type, bubbles, cancelable, view, detail,
                                 screenX, screenY, clientX, clientY,
                                 ctrlKey, altKey, shiftKey, metaKey,
                                 button, relatedTarget);
        //fire the event
        target.dispatchEvent(customEvent);

    }
    else if (document.createEventObject) { //IE
        //create an IE event object
        customEvent = document.createEventObject();
        //assign available properties
        customEvent.bubbles = bubbles;
        customEvent.cancelable = cancelable;
        customEvent.view = view;
        customEvent.detail = detail;
        customEvent.screenX = screenX;
        customEvent.screenY = screenY;
        customEvent.clientX = clientX;
        customEvent.clientY = clientY;
        customEvent.ctrlKey = ctrlKey;
        customEvent.altKey = altKey;
        customEvent.metaKey = metaKey;
        customEvent.shiftKey = shiftKey;
        //fix button property for IE's wacky implementation
        switch(button){
            case 0:
                customEvent.button = 1;
                break;
            case 1:
                customEvent.button = 4;
                break;
            case 2:
                //leave as is
                break;
            default:
                customEvent.button = 0;
        }
        customEvent.relatedTarget = relatedTarget;
        //fire the event
        target.fireEvent('onclick', customEvent);
    }
};

describe('DOM Events', function () {
    // Code to execute before the tests inside this describegroup.
    before(function() {
        divnode = document.createElement('div');
        divnode.id = 'divcont';
        divnode.className = 'contclass';
        divnode.style = 'position: absolute; left: -1000px; top: -1000px;';
        buttonnode = document.createElement('button');
        buttonnode.id = 'buttongo';
        buttonnode.className = 'buttongoclass';
        divnode.appendChild(buttonnode);
        document.body.appendChild(divnode);
    });

    // Code to execute after the tests inside this describegroup.
    after(function() {
        document.body.removeChild(divnode);
    });

    // Code to execute after every test.
    afterEach(function() {
        Event.detachAll();
        Event.undefAllEvents();
        Event.unNotifyAll();
    });

    it('listening event', function (done) {
        Event.after('click', function() {
            done();
        }, '#buttongo');
        EMIT_CLICK_EVENT(buttonnode);
    });

    it('preventing event', function (done) {
        Event.after('click', function() {
            done(new Error('event should not happen'));
        }, '#buttongo');
        Event.before('click', function(e) {
            e.preventDefault();
        }, '#buttongo');
        EMIT_CLICK_EVENT(buttonnode);
        setTimeout(done, 0);
    });

    it('halt event', function (done) {
        Event.after('click', function() {
            done(new Error('event should not happen'));
        }, '#buttongo');
        Event.before('click', function(e) {
            e.halt();
        }, '#buttongo');
        EMIT_CLICK_EVENT(buttonnode);
        setTimeout(done, 0);
    });

    it('delegation on future nodes', function (done) {
        var count = 0,
            buttonnode2, buttonnode3;
        Event.after('click', function() {
            count++;
        }, '#buttongo2');
        Event.after('click', function() {
            count++;
        }, '.go');

        buttonnode2 = document.createElement('button');
        buttonnode2.id = 'buttongo2';
        buttonnode2.style = 'position: absolute; left: -1000px; top: -1000px;';
        buttonnode2.className = 'go';
        document.body.appendChild(buttonnode2);

        buttonnode3 = document.createElement('button');
        buttonnode3.id = 'buttongo3';
        buttonnode3.style = 'position: absolute; left: -1000px; top: -1000px;';
        buttonnode3.className = 'go';
        document.body.appendChild(buttonnode3);

        EMIT_CLICK_EVENT(buttonnode2);
        EMIT_CLICK_EVENT(buttonnode3);
        count.should.be.eql(3);
        document.body.removeChild(buttonnode2);
        document.body.removeChild(buttonnode3);
        setTimeout(done, 0);
    });

    it('e.target', function (done) {
        Event.after('click', function(e) {
            e.target.id.should.be.eql('buttongo');
        }, '#buttongo');
        Event.after('click', function(e) {
            e.target.id.should.be.eql('divcont');
        }, '.contclass');
        Event.after('click', function(e) {
            e.target.id.should.be.eql('buttongo');
        }, '.contclass button');
        EMIT_CLICK_EVENT(buttonnode);
        setTimeout(done, 0);
    });

    it('e.target with filterfunction', function (done) {
        Event.after('click', function(e) {
            e.target.id.should.be.eql('buttongo');
        }, function(e) {
            return e.target.id==='buttongo'
        });
        Event.after('click', function(e) {
            // manual filterfunction doesn't reset e.target
            e.target.id.should.be.eql('buttongo');
        }, function(e) {
            return e.target.id==='divcont'
        });
        // a third time again on lowest level, to check if e.target is reset:
        Event.after('click', function(e) {
            e.target.id.should.be.eql('buttongo');
        }, function(e) {
            return e.target.id==='buttongo'
        });
        EMIT_CLICK_EVENT(buttonnode);
        setTimeout(done, 0);
    });

    it('e.target with mixed selector and filterfunction', function (done) {
        Event.after('click', function(e) {
            e.target.id.should.be.eql('buttongo');
        }, '#buttongo');
        Event.after('click', function(e) {
            e.target.id.should.be.eql('divcont');
        }, '.contclass');
        // a third time again on lowest level, to check if e.target is reset:
        Event.after('click', function(e) {
            // manual filterfunction doesn't reset e.target
            e.target.id.should.be.eql('buttongo');
        }, function(e) {
            return e.target.id==='buttongo'
        });
        EMIT_CLICK_EVENT(buttonnode);
        setTimeout(done, 0);
    });

    it('e.target on multiple subscribers', function (done) {
        var count = 0,
            divnode = document.getElementById('divcont'),
            divnode2 = document.createElement('div'),
            divnode3 = document.createElement('div'),
            deepestbutton = document.createElement('button');
        divnode2.id = 'divnode2';
        divnode3.id = 'divnode3';
        divnode2.className = 'divnode2class';
        divnode3.appendChild(deepestbutton);
        divnode2.appendChild(divnode3);
        divnode.appendChild(divnode2);

        // create subscriber on divnode2:
        Event.after('click', function(e) {
            count++;
            e.target.id.should.be.eql('divnode2');
        }, 'div.divnode2class');
        // create subscriber on containerdiv:
        Event.after('click', function(e) {
            count++;
            e.target.id.should.be.eql('divcont');
        }, 'div.contclass');

        // create subscriber on whatever div:
        Event.after('click', function(e) {
            count++;
            e.target.id.should.be.eql('divnode3');
        }, 'div');
        EMIT_CLICK_EVENT(deepestbutton);
        count.should.be.eql(3);
        setTimeout(function() {
            divnode.removeChild(divnode2);
            done();
        }, 0);
    });

    it('delegation on future nodes with preventDefault', function (done) {
        var count = 0,
            buttonnode2, buttonnode3;
        Event.before('click', function(e) {
            e.preventDefault();
        }, '#buttongo3');
        Event.after('click', function() {
            count++;
        }, '#buttongo2');
        Event.after('click', function() {
            count++;
        }, '.go');

        buttonnode2 = document.createElement('button');
        buttonnode2.id = 'buttongo2';
        buttonnode2.style = 'position: absolute; left: -1000px; top: -1000px;';
        buttonnode2.className = 'go';
        document.body.appendChild(buttonnode2);

        buttonnode3 = document.createElement('button');
        buttonnode3.id = 'buttongo3';
        buttonnode3.style = 'position: absolute; left: -1000px; top: -1000px;';
        buttonnode3.className = 'go';
        document.body.appendChild(buttonnode3);

        EMIT_CLICK_EVENT(buttonnode2);
        EMIT_CLICK_EVENT(buttonnode3);
        count.should.be.eql(2);
        document.body.removeChild(buttonnode2);
        document.body.removeChild(buttonnode3);
        setTimeout(done, 0);
    });

    it('stopPropagation', function (done) {
        var count = 0;

        Event.after('click', function() {
            done(new Error('After-subscriber #divcont should not be invoked'));
        }, '#divcont');

        Event.after('click', function() {
            count.should.be.eql(15);
            count = count + 16;
        }, '#divcont button.buttongoclass');

        Event.after('click', function() {
            count.should.be.eql(31);
            count = count + 32;
        }, '#buttongo');

        //====================================================

        Event.before('click', function() {
            done(new Error('Before-subscriber #divcont should not be invoked'));
        }, '#divcont');

        Event.before('click', function() {
            count.should.be.eql(0);
            count = count + 1;
        }, '#divcont button.buttongoclass');

        Event.before('click', function(e) {
            count.should.be.eql(1);
            count = count + 2;
            e.stopPropagation();
        }, '#divcont button.buttongoclass');

        Event.before('click', function() {
            count.should.be.eql(3);
            count = count + 4;
        }, '#divcont button.buttongoclass');

        Event.before('click', function() {
            count.should.be.eql(7);
            count = count + 8;
        }, '#buttongo');

        //====================================================

        EMIT_CLICK_EVENT(buttonnode);

        setTimeout(function() {
            count.should.be.eql(63);
            done();
        }, 0);
    });

    it('stopPropagation situation 2', function (done) {
        var count = 0,
            divnode = document.getElementById('divcont'),
            divnode2 = document.createElement('div'),
            divnode3 = document.createElement('div'),
            deepestbutton = document.createElement('button');
        divnode2.id = 'divnode2';
        divnode3.id = 'divnode3';
        divnode2.className = 'divnode2class';
        divnode3.appendChild(deepestbutton);
        divnode2.appendChild(divnode3);
        divnode.appendChild(divnode2);


        Event.after('click', function() {
            done(new Error('Before-subscriber button.buttongoglass should not be invoked'));
        }, 'button.buttongoclass');

        Event.after('click', function(e) {
            done(new Error('Before-subscriber .contclass should not be invoked'));
        }, '.contclass');

        Event.after('click', function(e) {
            count.should.be.eql(31);
            count = count + 32;
        }, '.divnode2class');

        Event.after('click', function() {
            count.should.be.eql(15);
            count = count + 16;
        }, '#divnode3');

        Event.after('click', function() {
            count.should.be.eql(7);
            count = count + 8;
        }, 'button');

        //====================================================

        Event.before('click', function() {
            done(new Error('Before-subscriber button.buttongoglass should not be invoked'));
        }, 'button.buttongoclass');

        Event.before('click', function(e) {
            done(new Error('Before-subscriber .contclass should not be invoked'));
        }, '.contclass');

        Event.before('click', function(e) {
            count.should.be.eql(3);
            count = count + 4;
            e.stopPropagation();
        }, '.divnode2class');

        Event.before('click', function() {
            count.should.be.eql(1);
            count = count + 2;
        }, '#divnode3');

        Event.before('click', function() {
            count.should.be.eql(0);
            count = count + 1;
        }, 'button');

        //====================================================

        EMIT_CLICK_EVENT(deepestbutton);

        setTimeout(function() {
            count.should.be.eql(63);
            divnode.removeChild(divnode2);
            done();
        }, 0);
    });

    it('stopImmediatePropagation', function (done) {
        var count = 0;

        Event.after('click', function() {
            done(new Error('After-subscriber #divcont should not be invoked'));
        }, '#divcont');

        Event.after('click', function() {
            done(new Error('Before-subscriber #divcont button.buttongoclass should not be invoked'));
        }, '#divcont button.buttongoclass');

        Event.after('click', function() {
            done(new Error('Before-subscriber #buttongo should not be invoked'));
        }, '#buttongo');

        //====================================================

        Event.before('click', function() {
            done(new Error('Before-subscriber #divcont should not be invoked'));
        }, '#divcont');

        Event.before('click', function() {
            count.should.be.eql(0);
            count = count + 1;
        }, '#divcont button.buttongoclass');

        Event.before('click', function(e) {
            count.should.be.eql(1);
            count = count + 2;
            e.stopImmediatePropagation();
        }, '#divcont button.buttongoclass');

        Event.before('click', function() {
            done(new Error('Before-subscriber #divcont button.buttongoclass should not be invoked'));
        }, '#divcont button.buttongoclass');

        Event.before('click', function() {
            done(new Error('Before-subscriber #buttongo should not be invoked'));
        }, '#buttongo');

        //====================================================

        EMIT_CLICK_EVENT(buttonnode);

        setTimeout(function() {
            count.should.be.eql(3);
            done();
        }, 0);
    });

    it('stopImmediatePropagation situation 2', function (done) {
        var count = 0,
            divnode = document.getElementById('divcont'),
            divnode2 = document.createElement('div'),
            divnode3 = document.createElement('div'),
            deepestbutton = document.createElement('button');
        divnode2.id = 'divnode2';
        divnode3.id = 'divnode3';
        divnode2.className = 'divnode2class';
        divnode3.appendChild(deepestbutton);
        divnode2.appendChild(divnode3);
        divnode.appendChild(divnode2);


        Event.after('click', function() {
            done(new Error('Before-subscriber button.buttongoglass should not be invoked'));
        }, 'button.buttongoclass');

        Event.after('click', function(e) {
            done(new Error('Before-subscriber .contclass should not be invoked'));
        }, '.contclass');

        Event.after('click', function(e) {
            done(new Error('Before-subscriber .divnode2class should not be invoked'));
        }, '.divnode2class');

        Event.after('click', function() {
            count.should.be.eql(15);
            count = count + 16;
        }, '#divnode3');

        Event.after('click', function() {
            count.should.be.eql(7);
            count = count + 8;
        }, 'button');

        //====================================================

        Event.before('click', function() {
            done(new Error('Before-subscriber button.buttongoglass should not be invoked'));
        }, 'button.buttongoclass');

        Event.before('click', function(e) {
            done(new Error('Before-subscriber .contclass should not be invoked'));
        }, '.contclass');

        Event.before('click', function(e) {
            count.should.be.eql(3);
            count = count + 4;
            e.stopImmediatePropagation();
        }, '.divnode2class');

        Event.before('click', function() {
            count.should.be.eql(1);
            count = count + 2;
        }, '#divnode3');

        Event.before('click', function() {
            count.should.be.eql(0);
            count = count + 1;
        }, 'button');

        //====================================================

        EMIT_CLICK_EVENT(deepestbutton);

        setTimeout(function() {
            count.should.be.eql(31);
            divnode.removeChild(divnode2);
            done();
        }, 0);
    });

});