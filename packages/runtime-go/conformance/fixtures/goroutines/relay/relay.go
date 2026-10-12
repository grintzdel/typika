package relay

import (
	"context"
	"sync"
	"time"
)

func Relay(ctx context.Context, in <-chan int, out chan<- int) {
	for {
		select {
		case <-ctx.Done():
			close(out)
			return
		case value := <-in:
			out <- value * 2
		}
	}
}

func Fan(values []int) int {
	var mu sync.Mutex
	var wg sync.WaitGroup
	total := 0
	for _, value := range values {
		wg.Add(1)
		go func() {
			defer wg.Done()
			time.Sleep(time.Millisecond)
			mu.Lock()
			total += value
			mu.Unlock()
		}()
	}
	wg.Wait()
	return total
}
