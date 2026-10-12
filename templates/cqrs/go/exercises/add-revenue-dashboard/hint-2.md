Each write already knows what just happened and when. Record it as an event, and let a separate read model, kept by
day in a map, update itself from those events. The dashboard reads that model and nothing else: that is the query
side of CQRS.
