Each write already knows what just happened and when. Record it as an event, and let a separate read model, kept by
day, update itself from those events. The dashboard reads that model and nothing else: that is the query side of CQRS.
