Calling `HTTP.Handle` from the import would work, but then a batch job pretends to be a web client, builds JSON and
reads status codes to know what went wrong. What part of `placeOrder` in `orders.Handler` has nothing to do with HTTP?
