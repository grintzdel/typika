Compare the stream's current size with `expectedVersion` before writing anything, and throw a `ConcurrencyException`
when they differ. This is optimistic concurrency: nobody locks the stream, but a write based on stale state is caught.
