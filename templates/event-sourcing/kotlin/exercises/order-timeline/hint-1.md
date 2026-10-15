Look at what `cancelOrder` does with the reason: it puts it in an email and forgets it. Every route overwrites a
boolean on the row, so the history is lost the moment it happens. Where would you have to write, at every step, to
keep it?
