/*
	Copyright 2015 Norut Northern Research Institute
	Author : Ingar Mæhlum Arntzen

    This file is part of the Timingsrc module.

    Timingsrc is free software: you can redistribute it and/or modify
    it under the terms of the GNU Lesser General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Timingsrc is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Lesser General Public License for more details.

    You should have received a copy of the GNU Lesser General Public License
    along with Timingsrc.  If not, see <http://www.gnu.org/licenses/>.
*/

/*
	SCALE CONVERTER

	Scaling by a factor 2 means that values of the timing object (position, velocity and acceleration) are multiplied by two.
	For example, if the timing object represents a media offset in seconds, scaling it to milliseconds implies a scaling factor of 1000.

*/

define(function (require) {

  'use strict';

    const TimingObject = require('./timingobject');

	class ScaleConverter extends TimingObject {
        constructor (timingsrc, factor) {
    		super(timingsrc);
    		this._factor = factor;
            this.eventifyDefineEvent("scalechange", {init:true});
    	};

        // extend
        eventifyInitEventArg(name) {
            if (name == "scalechange") {
                return [true, this._factor];
            } else {
                return super.eventifyInitEventArg(name)
            }
        }

    	// overrides
        onUpdateStart(arg) {
            if (arg.range != undefined) {
                arg.range = [arg.range[0]*this._factor, arg.range[1]*this._factor];
            }
            if (arg.position != undefined) {
                arg.position *= this._factor;
            }
            if (arg.velocity != undefined) {
                arg.velocity *= this._factor;
            }
            if (arg.acceleration != undefined) {
                arg.acceleration *= this._factor;
            }
            return arg;
        }

    	update(arg) {
    		if (arg.position != undefined) {
                arg.position /= this._factor;
            }
    		if (arg.velocity != undefined) {
                arg.velocity /= this._factor;
            }
    		if (arg.acceleration != undefined) {
                arg.acceleration /= this._factor;
            }
    		return super.update(arg);
    	};

        get scale() {return this._factor;};

        set scale(factor) {
            if (factor != this._factor) {
                // set scale and emulate new event from timingsrc
                this._factor = factor;
                this.__handleEvent({
                    ...this.timingsrc.vector,
                    range: this.timingsrc.range
                });
                this.eventifyTriggerEvent("scalechange", factor);
            }
        }
    }
	return ScaleConverter;
});
