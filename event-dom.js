/* globals window:true, document:true, Element:true */

"use strict";

/**
 * Integrates DOM-events to core-event-base. more about DOM-events:
 * http://www.smashingmagazine.com/2013/11/12/an-introduction-to-dom-events/
 *
 * Should be called using  the provided `mergeInto`-method like this:
 *
 * @example
 * Event = require('event');
 * DOMEvent = require('event-dom');
 * DOMEvent.mergeInto(Event);
 *
 * @module event
 * @submodule event-dom
 * @class Event
 * @since 0.0.1
 *
 * <i>Copyright (c) 2014 Parcela - https://github.com/Parcela</i>
 * New BSD License - https://github.com/ItsAsbreuk/itsa-library/blob/master/LICENSE
 *
*/

var NAME = '[event-dom]: ',
    REGEXP_UI = /^UI:/,
    REGEXP_NODE_ID = /^#\S+$/,
    REGEXP_EXTRACT_NODE_ID = /#(\S+)/,
    WINDOW = window,
    DOCUMENT = document,
    NEW_EVENTSYSTEM = DOCUMENT.addEventListener,
    OLD_EVENTSYSTEM = !NEW_EVENTSYSTEM && DOCUMENT.attachEvent,
    DOM_Events;

// polyfill for Element.matchesSelector
// based upon https://gist.github.com/jonathantneal/3062955
Element && function(ElementPrototype) {
    ElementPrototype.matchesSelector = ElementPrototype.matchesSelector ||
    ElementPrototype.mozMatchesSelector ||
    ElementPrototype.msMatchesSelector ||
    ElementPrototype.oMatchesSelector ||
    ElementPrototype.webkitMatchesSelector ||
    function (selector) {
        var node = this,
            nodes = (node.parentNode || DOCUMENT).querySelectorAll(selector),
            i = -1;
        while (nodes[++i] && (nodes[i] !== node));
        return !!nodes[i];
    };
}(Element.prototype);

DOM_Events = {
    /*
     * Inititialization-method to extend `Event` which comes from `event-base`.
     *
     * Should be called using  the provided `mergeInto`-method like this:
     *
     * @example
     * DOMEvent = require('core-event-dom');
     * DOMEvent.mergeInto(Event);
     *
     * @method mergeInto
     * @param instanceEvent {Object} The Event-system
     * @since 0.0.1
     */
    mergeInto: function (instanceEvent) {
        var htmlelement;

        /**
         * Internal hash containing all DOM-events that are listened for (at `document`).
         *
         * _DOMev = {
         *     'click': callbackFn,
         *     'mousemove': callbackFn,
         *     'keypress': callbackFn
         * }
         *
         * @property _DOMev
         * @default {}
         * @type Object
         * @private
         * @since 0.0.1
        */
        Object.defineProperty(instanceEvent, '_DOMev', {
            configurable: false,
            enumerable: false,
            writable: false,
            value: {} // `writable` is false means we cannot chance the value-reference, but we can change {} or [] its members
        });

        // First, we extend Event by adding and overrule some methods:

        /**
         * Polyfill for bubbling the `focus` and `blur` events in IE8.
         *
         * IE>8 we can use delegating on ALL events, because we use the capture-phase.
         * Unfortunatly this cannot be done with IE<9. But we can simulate focus and blur
         * delegation bu monitoring the focussed node.
         *
         * This means the IE<9 will miss the events: 'error', 'load', 'resize' and 'scroll'
         * However, if you need one of these to work in IE8, then you can `activate` this event on the
         * single node that you want to minotor. You activate it and then you use the eventsystem
         * like like you are used to. (delegated). Only activated nodes will bubble their non-bubbling events up
         * Activation is not done manually, but automaticly: whenever there is a subscriber on a node (or an id-selector)
         * and IE<9 is the environment, then a listener for that node is set up.
         * Side-effect is that we cannot controll when the listener isn't needed anymore. This might lead to memory-leak - but its IE<9...
         *
         * @method _bubbleIE8
         * @param instanceEvent {Object} The Event-system
         * @private
         * @since 0.0.1
         */
        instanceEvent._bubbleIE8 = function(instanceEvent) {
            // we wil emulate focus and blur by subscribing to the keyup and mouseup events:
            // when they happen, we'll ask for the current focussed Node --> if there is a
            // change compared to the previous, then we fire both a blur and a focus-event
            instanceEvent._focussedNode = DOCUMENT.activeElement;
            instanceEvent.after(['keyup', 'mouseup'], function(e) {
                var newFocussed = DOCUMENT.activeElement,
                    prevFocussed = instanceEvent._focussedNode;
                if (prevFocussed !== newFocussed) {
                    instanceEvent._focussedNode = newFocussed;
                    instanceEvent.emit(prevFocussed, 'UI:blur', e);
                    instanceEvent.emit(newFocussed, 'UI:focus', e);
                }
            });
        };

        /**
         * Creates a filterfunction out of a css-selector. To be used for catching any dom-element, without restrictions
         * of any context (like Parcels can --> Parcel.Event uses _parcelSelToDom instead)
         * On "non-outside" events, subscriber.t is set to the node that first matches the selector
         * so it can be used to set as e.target in the final subscriber
         *
         * @method _domSelToFunc
         * @param subscriber {Object} Subscriber-object
         * @param selector {String} css-selector
         * @param [outsideEvent] {Boolean} whetrer it is an outside-event (like `clickoutside`)
         * @private
         * @since 0.0.1
         */
        instanceEvent._domSelToFunc = function(subscriber, selector, outsideEvent) {
            // this stage is runned during subscription
            console.log(NAME, '_domSelToFunc');
            var byId = REGEXP_NODE_ID.test(selector);
            return function(e) {
                // this stage is runned when the event happens
                console.log(NAME, '_domSelToFunc inside filter');
                var node = e.target,
                    match = false;
                // e.target is the most deeply node in the dom-tree that caught the event
                // our listener uses `selector` which might be a node higher up the tree.
                // we will reset e.target to this node (if there is a match)
                // note that e.currentTarget will always be `document` --> we're not interested in that
                // also, we don't check for `node`, but for node.matchesSelector: the highest level `document`
                // is not null, yet it doesn;t have .matchesSelector so it would fail
                while (node.matchesSelector && !match) {
                    console.log(NAME, '_domSelToFunc inside filter check match');
                    match = byId ? (node.id===selector.substr(1)) : node.matchesSelector(selector);
                    // if there is a match, then set
                    // e.target to the target that matches the selector
                    match && !outsideEvent && (subscriber.t=node);
                    node = node.parentNode;
                }
                console.log(NAME, '_domSelToFunc filter returns '+(!outsideEvent ? match : !match));
                return !outsideEvent ? match : !match;
            };
        };

        // now redefine Event._createFilter --> it needs to work a bit differently when using DOM-events
        // because we could have css-selectors
        /**
         * Creates the filter-function on the subscriber. Overrides _createFilter from `event-base`.
         * Inside core-event-base this means: just set the filter, but core-event-dom overrides this method
         * (because dom-filters could be css-selectors)
         *
         * @method _createFilter
         * @param filter {Function|String}
         * @param customEvent {String}
         * @param [outsideEvent] {Boolean} whether it is an outside-event (like `clickoutside`)
         * @private
         * @since 0.0.1
         */
        instanceEvent._createFilter = function(subscriber, filter, customEvent, outsideEvent) {
            console.log(NAME, '_createFilter');
            var nodeid;
            if ((typeof filter==='string') && DOCUMENT && (REGEXP_UI.test(customEvent))) {
                console.log(NAME, '_createFilter create filter out of css-selector');
                subscriber.f = this._selToFunc(subscriber, filter, outsideEvent);
                nodeid = filter.match(REGEXP_EXTRACT_NODE_ID);
                nodeid ? (subscriber.nId=nodeid[1]) : (subscriber.n=DOCUMENT);
            }
            else {
                console.log(NAME, '_createFilter use filterfunc');
                subscriber.f = filter;
                subscriber.n = this._getCurrentTarget(subscriber);
            }
        };

        instanceEvent._getCurrentTarget || (instanceEvent._getCurrentTarget=function(/* subscriber */) {
            return DOCUMENT;
        });

        /**
         * Generates an event through our Event-system. Does the actual transportation from DOM-events
         * into our Eventsystem. It also looks at the response of our Eventsystem: if our system
         * halts or preventDefaults the customEvent, then the original DOM-event will be preventDefaulted.
         *
         * @method _evCallback
         * @param customEvent {String} the customEvent that is transported to the eventsystem
         * @param e {Object} eventobject
         * @private
         * @since 0.0.1
         */
        instanceEvent._evCallback = function(customEvent, e) {
            console.log(NAME, '_evCallback');
            var eventobject;
            // this = instanceEvent because of binding context
            // Emit the dom-event though our eventsystem:
            // NOTE: emit() needs to be synchronous! otherwise we wouldn't be able
            // to preventDefault in time
            //
            // e = eventobject from the DOM-event OR gesture-event
            // eventobject = eventobject from our Eventsystem, which get returned by calling `emit()`
            eventobject = this.emit(e.target, customEvent, e);
            // if eventobject was preventdefaulted or halted: take appropriate action on
            // the original dom-event:
            eventobject.status.halted && e.stopPropagation();
            // now we might nee to preventDefault the original event.
            // be carefull though: not all gesture events have e.preventDefault
            (eventobject.status.halted || eventobject.status.defaultPrevented) && e.preventDefault && e.preventDefault();
        };

        // now redefine Event._invokeSubs --> it needs to work a bit differently when using DOM-events
        // because we have the dom-bubble chain
        /**
         * Does the actual invocation of a subscriber. Overrides _invokesSubs from `event-base`.
         *
         * @method _invokeSubs
         * @param e {Object} event-object
         * @param subscribers {Array} contains subscribers (objects) with these members:
         * <ul>
         *     <li>subscriber.o {Object} context of the callback</li>
         *     <li>subscriber.cb {Function} callback to be invoked</li>
         *     <li>subscriber.f {Function} filter to be applied</li>
         *     <li>subscriber.t {DOM-node} target for the specific selector, which will be set as e.target
         *         only when event-dom is active and there are filter-selectors</li>
         *     <li>subscriber.n {DOM-node} highest dom-node that acts as the container for delegation.
         *         only when core-event-dom is active and there are filter-selectors</li>
         * </ul>
         * @param [before] {Boolean} whether it concerns before subscribers
         * @param [sort] {Function} a sort function to controll the order of execution.
         *             Only applyable when working with DOM-events (bubble-order), provided by `core-event-dom`
         * @private
         * @since 0.0.1
         */
        //
        // CAUTIOUS: When making changes here, you should look whether these changes also effect `_invokeSubs()`
        // inside `event-base`
        //
        instanceEvent._originalInvokeSubs = instanceEvent._invokeSubs;
        instanceEvent._invokeSubs = function (e, subscribers, before, sort) {
            if (!sort) {
                return this._originalInvokeSubs(e, subscribers, before, sort);
            }
            console.log(NAME, '_invokeSubs on event-dom');
            var subs, propagationStopped, targetnode;

            // we create a new sub-array with the items that passed the filter
            // this subarray gets sorted. We ALWAYS need to do this on every event: the dom could have changed
            subs = subscribers.filter(
                       function(subscriber) {
                           return !subscriber.f || subscriber.f.call(subscriber.o, e);
                       }
                   );

            // at this point, we need to find out what are the current node-refs. whenever there is
            // a filter that starts with `#` --> in those cases we have a bubble-chain, because the selector isn't
            // set up with `document` at its root.
            // we couldn't do this at time of subscribtion, for the nodes might not be there at that time.
            // however, we only need to do this once: we store the value if we find them
            // no problem when the nodes leave the dom later: the previous filter wouldn't pass
            subs.each(function(subscriber) {
                // the node-ref is specified with `subscriber.n`
                subscriber.n || (subscriber.n=DOCUMENT.getElementById(subscriber.nId));
                console.log(NAME, 'check whether to create subscriber.n');
            });

            // now we sort, based upon the sortFn
            subs.sort(sort);

            // `subs` was processed by the sort function, so it also has only subscribers that passed their filter
            subs.some(function(subscriber) {
                // inside the aftersubscribers, we may need exit right away.
                // this would be the case whenever stopPropagation or stopImmediatePropagation was called
                // in case the subscribernode equals the node on which stopImmediatePropagation was called: return true
                targetnode = (subscriber.t || subscriber.n);

                if (e.status.immediatePropagationStopped===targetnode) {
                    return true;
                }
                // in case the subscribernode does not fall within or equals the node on which stopPropagation was called: return true
                propagationStopped = e.status.propagationStopped;
                if (propagationStopped && (propagationStopped!==targetnode) && !propagationStopped.contains(targetnode)) {
                    return true;
                }

                // check: if `sort` exists, then the filter is already supplied, but we need to set e.currentTarget for every bubble-level
                // is `sort` does not exists, then the filter is not yet supplied and we need to it here
                e.currentTarget = targetnode;
                // now we might need to set e.target to the right node:
                // the filterfunction might have found the true domnode that should act as e.target
                // and set it at subscriber.t
                // also, we need to backup the original e.target: this one should be reset when
                // we encounter a subscriber with its own filterfunction instead of selector
                if (subscriber.t) {
                    e._originalTarget || (e._originalTarget=e.target);
                    e.target = subscriber.t;
                }
                else {
                    e._originalTarget && (e.target=e._originalTarget);
                }

                console.log(NAME, '_invokeSubs going to invoke subscriber');

                // finally: invoke subscriber
                subscriber.cb.call(subscriber.o, e);

                if (e.status.unSilencable && e.silent) {
                    console.warn(NAME, ' event '+e.emitter+':'+e.type+' cannot made silent: this customEvent is defined as unSilencable');
                    e.silent = false;
                }

                return e.silent ||
                      (before && (
                              e.status.halted || (
                                  ((propagationStopped=e.status.propagationStopped) && (propagationStopped!==targetnode)) || e.status.immediatePropagationStopped
                              )
                          )
                      );
            });
        };

        /**
         * Creates a filterfunction out of a css-selector.
         * On "non-outside" events, subscriber.t is set to the node that first matches the selector
         * so it can be used to set as e.target in the final subscriber
         *
         * @method _selToFunc
         * @param subscriber {Object} Subscriber-object
         * @param selector {String} css-selector
         * @param [outsideEvent] {Boolean} whetrer it is an outside-event (like `clickoutside`)
         * @private
         * @since 0.0.1
         */
        // careful: _selToFunc might already be defined by Parcel.Events. This version is richer and should not be orverwritten
        instanceEvent._selToFunc || (instanceEvent._selToFunc=function(subscriber, selector, outsideEvent) {
            console.log(NAME, '_selToFunc');
            // return `_domSelToFunc` by default
            // Parcel.Event uses a different selectormethod.
            return this._domSelToFunc(subscriber, selector, outsideEvent);
        });

        /**
         * Transports DOM-events to the Event-system. Catches events at their most early stage:
         * their capture-phase. When these events happen, a new customEvent is generated by our own
         * Eventsystem, by calling _evCallback(). This way we keep DOM-events and our Eventsystem completely separated.
         *
         * @method _setupDomListener
         * @param instanceEvent {Object} The Event-system
         * @param customEvent {String} the customEvent that is transported to the eventsystem
         * @private
         * @since 0.0.1
         */
        instanceEvent._setupDomListener = function(customEvent) {
            console.log(NAME, '_setupDomListener');
            var instance = this,
                callbackFn = instance._evCallback.bind(instance, customEvent),
                eventSplitted = customEvent.split(':'),
                eventName = eventSplitted[1];
            // if eventName equals `mouseover` or `mouseleave` then we quit:
            // people should use `mouseover` and `mouseout`
            if ((eventName==='mouseenter') || (eventName==='mouseleave')) {
                console.warn(NAME, 'Subscription to '+eventName+' not supported, use mouseover and mouseout: this eventsystem uses these non-noisy so they act as mouseenter and mouseleave');
                return;
            }
            // already registered? then return, also return if someone registered for UI:*
            if (instance._DOMev[eventName] || (eventName==='*')) {
                return;
            }

            if (NEW_EVENTSYSTEM) {
                // important: set the third argument `true` so we listen to the capture-phase.
                instance._DOMev[eventName] = {
                    detach: function() {
                        DOCUMENT.removeEventListener(eventName, callbackFn, true);
                    }
                };
                DOCUMENT.addEventListener(eventName, callbackFn, true);
            }
            else if (OLD_EVENTSYSTEM) {
                instance._DOMev[eventName] = {
                    detach: function() {
                        DOCUMENT.detachEvent(eventName, callbackFn);
                    }
                };
                DOCUMENT.attachEvent('on'+eventName, callbackFn);
            }
        };

        /**
         * Generates a sort-function. Overrides _sortSubs from `event-base`.
         *
         * @method _sortSubs
         * @param customEvent {String}
         * @private
         * @return {Function|undefined} sortable function
         * @since 0.0.1
         */
        instanceEvent._sortSubs = function(customEvent) {
            console.log(NAME, '_sortSubs');
            if (REGEXP_UI.test(customEvent)) {
                return this._sortSubsDOM.bind(this);
            }
        };

        /**
         * Sort nodes conform the dom-tree by looking at their position inside the tree.
         *
         * @method _sortSubsDOM
         * @param customEvent {String}
         * @private
         * @return {Function} sortable function
         * @since 0.0.1
         */
        instanceEvent._sortSubsDOM || (instanceEvent._sortSubsDOM=function(subscriberOne, subscriberTwo) {
            console.log(NAME, '_sortSubsDOM');
            return (subscriberTwo.t || subscriberTwo.n).contains(subscriberOne.t || subscriberOne.n) ? -1 : 1;
        });

        // Now we do some initialization in order to make DOM-events work:

        // Notify when someone subscriber to an UI:* event
        // if so: then we might need to define a customEvent for it:
        // alse define the specific DOM-methods that can be called on the eventobject: `stopPropagation` and `stopImmediatePropagation`
        instanceEvent.notify('UI:*', instanceEvent._setupDomListener, instanceEvent)
                     ._setEventObjProperty('stopPropagation', function() {this.status.ok || (this.status.propagationStopped = this.currentTarget);})
                     ._setEventObjProperty('stopImmediatePropagation', function() {this.status.ok || (this.status.immediatePropagationStopped = this.currentTarget);});

        if (WINDOW && (htmlelement=WINDOW.HTMLElement)) {
            // specify the emitter by emitterName UI
            instanceEvent.defineEmitter(htmlelement.prototype, 'UI');
        }

        // next: bubble-polyfill for IE8:
        OLD_EVENTSYSTEM && instanceEvent._bubbleIE8(instanceEvent);

    }
};

module.exports = DOM_Events;
