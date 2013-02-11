chunked-input-stream
====================

Node.js wrapper for an input stream, designed to solve a very specific problem
(streaming data to the Dropbox upload API).

We had a single input stream of data, and an upload API that required that data be
sent in separate requests not larger than 150mb. To work easily with the `request`
library and allow us to use `pipe()`, we made this wrapper. Then we did this:

	var stream = openInputStream(...);
	var maxSize = 150000000; //150mb
	var chunkedStream = new ChunkedStream(stream, maxSize);

	function newRequest() {
		return request(uploadUrl, function(err, res, body) {

			if (chunkedStream.actuallyEnded) {
				finishUp();
			} else {
				// start the next chunk rolling.
				chunkedStream.pipe(newRequest());
				// resume() sends any rollover data.
				chunkedStream.resume();
			}

		});
	}

	chunkedStream.pipe(newRequest());


