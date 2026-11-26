# 0028 — Kotlin compilation: compilation processes killed on timeout

**Status**: Accepted · 2026-10-13 · slice 1 of M6 · complements [0019](0019-kotlin-runtime.md)

## Context

The `kotlin-compiler` service compiles untrusted code with a 15 s timeout ([0019](0019-kotlin-runtime.md),
[security §3.3](../specs/security.md)). The compiler never checks whether its thread was interrupted, and
`Thread.stop` no longer exists since JDK 20. 0019 left two options: a separate compilation process, or restarting the
container.

A compilation that exceeds the timeout takes three lines to build: `fun <T> p(t: T) = Pair(t, t)`, a value nested 24
times in `p(...)`, then an assignment to an `Int`. The error message then contains a type of 2²⁴ nodes. Each level
doubles the work: 11 s at 20 levels, well beyond 15 s at 24. On the same principle, `const val` doubled 26 times
exhausts the compiler's memory.

Measurements on `strategy-kotlin` (sources and tests, server cache disabled). The container is limited to 2 vCPU and
1 GiB, without swap. The load sends 80 requests, 8 at a time, on an Apple M4 Pro host.

| Variant | Saturated throughput | p95 at c = 8 | Max memory |
|---|---|---|---|
| One JVM, two compilation threads (spike R8) | 2.2 compil./s | 5.2 s | 656 MiB |
| Two processes, 320 MiB heap, C2 | 1.1 compil./s | 9.3 s | 1 GiB (saturated, one worker killed) |
| Two processes, 192 MiB heap, C2, AOT cache, `MALLOC_ARENA_MAX=2` | 1.7 compil./s | 7.2 s | 850 MiB |
| **Two processes, 192 MiB heap, C1 only, AOT cache, `MALLOC_ARENA_MAX=2`** | **2.4 compil./s** | **4.1 s** | **815 MiB** |

With the last variant, a single compilation takes 0.7 s warm, and a worker is ready 3 s after it is launched.

## Decision

- **One supervisor and one compilation process per slot.** The supervisor is the HTTP server. It launches
  `KOTLIN_COMPILER_CONCURRENCY` workers, each a JVM that compiles one request at a time. A request takes a free
  worker. If the worker has not answered after `KOTLIN_COMPILER_TIMEOUT_MS`, the supervisor kills it, responds `504`
  and launches another one. The other workers, and the queue, are not affected.
- **A worker that dies is replaced the same way.** Workers run with `-XX:+ExitOnOutOfMemoryError`: a compilation that
  exhausts the heap kills its worker, the supervisor responds `503` and relaunches it.
- **The protocol between the supervisor and its workers** goes through standard input and output: JSON frames prefixed
  by their length. The worker's JVM writes its own logs to stderr (`-Xlog:disable`
  `-Xlog:all=warning,aot*=error:stderr`). Without this redirection, a JVM warning on stdout corrupts the next frame.
- **Each worker is warm from launch.** It compiles a small project with a test before declaring itself ready. The
  supervisor assigns it no request before that.
- **Worker tuning, measured**: 192 MiB heap, 48 MiB code cache, C1 only (`-XX:TieredStopAtLevel=1`), SerialGC, 8 MiB
  stack. The JDK 25 AOT cache is produced at image build, by launching a worker with the same options. The image sets
  `MALLOC_ARENA_MAX=2`. `KOTLIN_COMPILER_WORKER_JAVA_OPTS` replaces these options.
- **The supervisor keeps the artifact cache** in a 96 MiB heap. The cache goes from 128 to 32 MiB by default, which is
  about 150 compilations of `strategy-kotlin`. The client cache and the registry's precompiled artifacts already avoid
  most calls.

## Consequences

- A compilation that never finishes costs a slot at most `TIMEOUT_MS`, then about 3 s of relaunch. The rest of the
  service keeps responding.
- With two slots, two trapped compilations sent at the same time block the whole service for about 18 s: the timeout,
  then the relaunch. The following compilations wait in the queue, then receive `503` when it is full. The relay's
  per-IP rate limiting ([0029](0029-kotlin-relay-rate-limit.md)) limits how often the same client can try again,
  without preventing the attack. A `503` caused by a crashed process carries, like the one for a full queue, a
  `Retry-After: 5`.
- Two JVMs instead of one, but the throughput exceeds the spike's: C1 alone compiles the compiler's methods faster than
  C2 optimizes them, on one-second compilations. Memory fits in the reference sizing of
  [0019](0019-kotlin-runtime.md) (2 vCPU, 1 GiB).
- Memory climbs with the number of workers: count about 380 MiB per worker, plus 70 MiB for the supervisor.
- The image weighs 771 MB, including 114 MB of AOT cache. The AOT cache is tied to the image's exact JVM and its
  options. A JVM that refuses the cache still starts, only more slowly: the cache is an optimization, not a dependency.
- Diagnostic messages are truncated to 2,000 characters. The giant type of the example above produced responses of
  more than 10 MB.

## Rejected alternatives

- **Restarting the container**: a single trapped request cuts the service for everyone, queue included, for 5 to 11 s.
  It is a denial of service within anyone's reach.
- **One JVM per compilation**: each request would pay for startup and JIT, i.e. 5 to 11 s measured in spike R8.
- **Threads in a single JVM**: they cannot be interrupted, and an `OutOfMemoryError` in a thread leaves the whole JVM
  in an uncertain state.
