'use strict';

var Stream = require('stream');
var util = require('util');

// Wraps another Stream and splits the output by `chunkSize` bytes.
// It does this by passing through data events until we reach `chunkSize`.
// At this point it emits an `end` event and pauses the stream, which will
// also end any pipe() request.
//
// At this point you can pipe it up to something else and call resume(),
// and it will continue until the source stream is actually finished.
//
// It handles data that isn't exactly on the chunk boundary by splitting
// it up and sending the remainder when resume() is called.
//
// Custom events:
//   newchunk: called after a fake `end` when it's actually just a new chunk.
//   streamend: called when the wrapped stream ends and it's genuinely all over.
//
// Custom properties:
//   actuallyEnded: after an `end` event, this will be true if the source stream
//   		actually ended.
var ChunkedStream = function(wrappedStream, chunkSize) {
	if (!wrappedStream.readable) {
		throw new Error("Can only wrap a readable Stream.");
	}

	var self = this;

	// True if the source ended and it wasn't just a pretend end-of-chunk.
	self.actuallyEnded = false;

	// This needs to be set or else Stream.pipe() will never resume on drain.
	self.readable = true;

	// Data we hold on to in-between chunks.
	var storedData;

	self.bytesWritten = 0;
	self.source = wrappedStream;

	var bytesWrittenThisChunk = 0;

	self.source.on('data', function(data) {
		var newBytesWritten = bytesWrittenThisChunk + data.length;

		// If the data is going to push us over the threshold...
		if (newBytesWritten > chunkSize) {
			// Calculate how much data is needed to hit the threshold.
			var dataOffset = chunkSize - bytesWrittenThisChunk;
			if (dataOffset > data.length) {
				dataOffset = data.length;
			}
			self.bytesWritten += dataOffset;

			// Send just enough data to reach the threshold
			self.emit('data', data.slice(0, dataOffset));

			// Store the rest for later
			self.storedData = data.slice(dataOffset);

			// Pretend the stream's ended, and pause.
			self.emit('end');
			if (self.source.pause) {
				self.source.pause();
			}
			bytesWrittenThisChunk = 0;

			self.emit('newchunk');
		} else {
			// Under the threshold - pass on data as normal.
			bytesWrittenThisChunk = newBytesWritten;
			self.bytesWritten += data.length;
			self.emit('data', data);
		}
		
	});

	['end','close','error'].forEach(function(eventName){
		self.source.on(eventName, function() {
			self.actuallyEnded = true;
			self.readable = false;
			self.emit(eventName);
			self.emit('streamend');
		});
	});

};

util.inherits(ChunkedStream, Stream);

ChunkedStream.prototype.pause = function() {
	this.source.pause();
};

// Resume the stream. You MUST do this when you hear
// and 'end' event and .actuallyEnded is not true,
// because there's still stuff to be done.
// Rather than check .actuallyEnded you can alternatively
// listen to `newchunk` and `streamend`.
ChunkedStream.prototype.resume = function() {
	this.source.resume();
	if (this.storedData) {
		this.emit('data', this.storedData);
		this.bytesWritten += this.storedData.length;
		this.storedData = null;
	}
};

module.exports = ChunkedStream;
