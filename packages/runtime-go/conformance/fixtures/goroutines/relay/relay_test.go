package relay

import (
	"context"
	"testing"
	"time"
)

func TestRelayStopsOnCancel(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	in, out := make(chan int), make(chan int)
	go Relay(ctx, in, out)
	in <- 21
	if got := <-out; got != 42 {
		t.Fatalf("got %d", got)
	}
	cancel()
	select {
	case _, open := <-out:
		if open {
			t.Fatal("out still open")
		}
	case <-time.After(time.Second):
		t.Fatal("relay did not stop")
	}
}

func TestFan(t *testing.T) {
	t.Parallel()
	if got := Fan([]int{1, 2, 3, 4}); got != 10 {
		t.Errorf("Fan = %d", got)
	}
}

func TestTimeout(t *testing.T) {
	t.Parallel()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Millisecond)
	defer cancel()
	<-ctx.Done()
	if ctx.Err() != context.DeadlineExceeded {
		t.Errorf("err = %v", ctx.Err())
	}
}
