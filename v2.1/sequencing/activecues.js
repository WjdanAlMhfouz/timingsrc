define(function(require) {

    const Interval = require("../util/interval");
    const util = require("../util/util");
    const motionutils = require("../util/motionutils");
    const eventify = require("../util/eventify");






    class ActiveCues {

        constructor (axis, toA, toB) {
            this._axis = axis;
            this._toA = toA;
            this._toA_ready = false;
            this._toB = toB;
            this._toB_ready = false;
            this._activeCues = new Map(); // (key -> cue)

            // Register axis callback
            this._handle = this._axis.add_callback(this._onAxisUpdate.bind(this));

            /*

            Wrap onTimingUpdate

            To allow multiple instances of ActiveCues to subscribe to
            the same event source, the handler must be different objects.
            If we use the class method directly as handler, it will
            be on the prototype and therefor be shared between instances.

            It is safe to use the same handler for multiple event sources.

            Additionally we also use the trick of not specifying a context
            for the handler. This implies that the this object will be
            the event source, which we need to distinguish between the
            two timingobjects.

            */

            this._onTimingUpdateWrapper = function (eInfo) {
                let to = eInfo.src;
                if (to == this._toA && !this._toA_ready) {
                    this._toA_ready = true;
                }
                if (to == this._toB && !this.toB_ready) {
                    this._toB_ready = true;
                }
                if (this._toA_ready && this._toB_ready) {
                    this._onTimingUpdate(eInfo);
                }
            };
            this._toA.on("change", this._onTimingUpdateWrapper, this);
            this._toB.on("change", this._onTimingUpdateWrapper, this);
        }


        /*
            Ready State
        */

        get ready () {
            return Promise.all([this._toA.ready, this._toB.ready]);
        };

        isReady() {
            return this._toA.isReady() && this._toB.isReady();
        }


        /*
            Handling Axis Update Callbacks
        */

        _onAxisUpdate(batchMap) {
            // Do something
            console.log("onAxisUpdate");
        }

        /*
            Handling Change Events from Timing Objects
        */

        _onTimingUpdate (eInfo) {
            let to = eInfo.src;
            if (to == this._toA) {
                console.log("update toA");
            }
            if (to == this._toB) {
                console.log("update toB");

            }
            console.log(to.delta.toString());

            // next up - figure out the new timing object state and
            // what needs to be done.


        };



        /*
            This calculates the transition in activeCues caused by
            a jump on the timeline.
            interval may be point or range
        */

        jumpTo (interval) {

            let newActiveCues = new Map(this._axis.lookup(interval).map(cue => {
                return [cue.key, cue];
            }));

            /*
                find exit cues
                were in old active cues - but not in new
            */
            let exitCues = util.map_difference(this._activeCues, newActiveCues);
            /*
                find enter cues
                were not in old active cues - but are in new
            */
            let enterCues = util.map_difference(newActiveCues, this._activeCues);

            // update active cues
            this._activeCues = newActiveCues;

            return {
                exitCues: exitCues,
                enterCues: enterCues
            };

        }



        values() {
            return this._activeCues.values();
        }


    }

    return ActiveCues;

});

