Calling `http.handle` from the import would work, but then a batch job pretends to be a web client and reads status
codes to know what went wrong. What part of `placeOrder` in `OrdersHandler` has nothing to do with HTTP?
