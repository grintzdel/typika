package orders

import (
	"context"
	"sync"
	"time"

	"example.com/shop/internal/infra"
)

type OutboxRelay struct {
	mu     sync.Mutex
	db     *infra.InMemoryDatabase
	broker *infra.FakeBroker
}

func NewOutboxRelay(db *infra.InMemoryDatabase, broker *infra.FakeBroker) *OutboxRelay {
	return &OutboxRelay{db: db, broker: broker}
}

// #region tour:relay
func (r *OutboxRelay) PublishPending() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	published := 0
	for _, entry := range r.db.PendingOutbox() {
		if err := r.broker.Publish(entry.Topic, entry.Payload); err != nil {
			return published
		}
		r.db.MarkPublished(entry.ID)
		published++
	}
	return published
}

func (r *OutboxRelay) Run(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			r.PublishPending()
		}
	}
}

// #endregion

func (r *OutboxRelay) Pending() int {
	return len(r.db.PendingOutbox())
}
