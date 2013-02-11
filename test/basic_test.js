'use strict';

var should = require('should');
var assert = require('assert');

var ChunkedStream = require('../index');
var Stream = require('stream');

describe('ChunkedStream', function() {

	it('Should emit data emitted by the source stream.', function(done) {
		
		var source = new Stream();
		source.readable = true;
		var chunked = new ChunkedStream(source, 100);

		chunked.on('data', function(data) {
			assert.equal(5, data.length);
		});

		chunked.on('end', function() {
			done();
		});

		source.emit('data', 'hello');
		source.emit('end');
		
	});

	it('Should emit an end event when the threshold is reached', function(done) {

		var source = new Stream();
		source.readable = true;
		source.pause = function() {};
		source.resume = function() {};
		var chunked = new ChunkedStream(source, 10);

		var dataReceived = '';
		chunked.on('data', function(data) {
			dataReceived += data;
		});
		chunked.on('end', function() {
			if (chunked.actuallyEnded) {
				assert.equal(dataReceived, 'firstsecond');
			} else {
				assert.equal(dataReceived, 'firstsecon');
			}
		});

		source.emit('data', 'first');
		source.emit('data', 'second');
		chunked.resume();
		source.emit('end');
		done();

	});

	it('Should split exactly on the threshold', function(done) {
		var source = new Stream();
		source.readable = true;
		source.pause = function() {};
		source.resume = function() {};
		var chunked = new ChunkedStream(source, 10);

		var dataReceived = '';
		chunked.on('data', function(data) {
			dataReceived += data;
		});
		chunked.on('newchunk', function() {
			assert.equal(dataReceived, '1234567890');
		});
		chunked.on('end', function() {
			if (chunked.actuallyEnded) {
				assert.equal(dataReceived, '12345678901234');
				done();
			}
		});

		source.emit('data', '1234567');
		source.emit('data', '8901234');
		chunked.resume();
		source.emit('end');
	});

});