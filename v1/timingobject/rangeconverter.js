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

	RANGE CONVERTER

	The converter enforce a range on position.

	It only has effect if given range is a restriction on the range of the timingsrc.
	Range converter will pause on range endpoints if timingsrc leaves the range. 
	Range converters will continue mirroring timingsrc once it comes into the range.
*/

define(['./timingbase'], function (timingbase) {

	'use strict';

	var motionutils = timingbase.motionutils;
	var ConverterBase = timingbase.ConverterBase;	
	var RangeState = motionutils.RangeState;
	var inherit = timingbase.inherit;

	var state = function () {
		var _state = RangeState.INIT;
		var is_real_state_change = function (old_state, new_state) {
			// only state changes between INSIDE and OUTSIDE* are real state changes.
			if (old_state === RangeState.OUTSIDE_HIGH && new_state === RangeState.OUTSIDE_LOW) return false;
			if (old_state === RangeState.OUTSIDE_LOW && new_state === RangeState.OUTSIDE_HIGH) return false;
			if (old_state === RangeState.INIT) return false;
			return true;
		}
		var get = function () {return _state;};
		var set = function (new_state) {
			if (new_state === RangeState.INSIDE || new_state === RangeState.OUTSIDE_LOW || new_state === RangeState.OUTSIDE_HIGH) {
				if (new_state !== _state) {
					var old_state = _state;
					_state = new_state;
					return {real: is_real_state_change(old_state, new_state), abs: true};
				}
			};
			return {real:false, abs:false};
		}
		return {get: get, set:set};
	};


	/*
		Range converter allows a new (smaller) range to be specified.
	*/

	var RangeConverter = function (timingObject, range) {
		ConverterBase.call(this, timingObject, {timeout:true});
		this._state = state();
		// todo - check range
		this._range = range;
	};
	inherit(RangeConverter, ConverterBase);

	// overrides
	RangeConverter.prototype.query = function () {
		if (this.vector === null) return {position:undefined, velocity:undefined, acceleration:undefined};
		// reevaluate state to handle range violation
		var vector = motionutils.calculateVector(this.timingsrc.vector, this.clock.now());
		var state = motionutils.getCorrectRangeState(vector, this._range);
		if (state !== RangeState.INSIDE) {
			this._preProcess(vector);
		} 
		// re-evaluate query after state transition
		return motionutils.calculateVector(this.vector, this.clock.now());
	};
	
	// overridden
	RangeConverter.prototype._calculateTimeoutVector = function () {
		var freshVector = this.timingsrc.query();
		var res = motionutils.calculateDelta(freshVector, this.range);
		var deltaSec = res[0];
		if (deltaSec === null) return null;
		var position = res[1];
		var vector = motionutils.calculateVector(freshVector, freshVector.timestamp + deltaSec);
		vector.position = position; // avoid rounding errors
		return vector;
	};

	// overrides
	RangeConverter.prototype._onTimeout = function (vector) {		
		return this._onChange(vector);
	};

	// overrides
	RangeConverter.prototype._onChange = function (vector) {
		var new_state = motionutils.getCorrectRangeState(vector, this._range);
		var state_changed = this._state.set(new_state);	
		if (state_changed.real) {
			// state transition between INSIDE and OUTSIDE
			if (this._state.get() === RangeState.INSIDE) {
				// OUTSIDE -> INSIDE, generate fake start event
				// vector delivered by timeout 
				// forward event unchanged
			} else {
				// INSIDE -> OUTSIDE, generate fake stop event
				vector = motionutils.checkRange(vector, this._range);
			}
		}
		else {
			// no state transition between INSIDE and OUTSIDE
			if (this._state.get() === RangeState.INSIDE) {
				// stay inside or first event inside
				// forward event unchanged
			} else {
				// stay outside or first event inside 
				// drop unless 
				// - first event outside
				// - skip from outside-high to outside-low
				// - skip from outside-low to outside-high
				if (state_changed.abs) {
					vector = motionutils.checkRange(vector, this._range);
				} else {
					// drop event

					return null;
				}
			}
		}
		return vector;
	};

	return RangeConverter;
});