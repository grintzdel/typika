package read

import (
	"slices"
	"strings"
	"time"

	"example.com/shop/internal/orders/events"
)

type DailyRevenue struct {
	Day          string `json:"day"`
	SalesCents   int64  `json:"salesCents"`
	RefundsCents int64  `json:"refundsCents"`
}

type RevenueByDay struct {
	days       map[string]DailyRevenue
	paidOrders map[string]int64
}

func NewRevenueByDay() *RevenueByDay {
	return &RevenueByDay{days: map[string]DailyRevenue{}, paidOrders: map[string]int64{}}
}

func (r *RevenueByDay) Apply(event events.Event) {
	day := event.OccurredAt.UTC().Format(time.DateOnly)
	switch event.Type {
	case events.OrderPaid:
		r.paidOrders[event.OrderID] = event.TotalCents
		revenue := r.days[day]
		revenue.SalesCents += event.TotalCents
		r.save(day, revenue)
	case events.OrderCancelled:
		if paidCents, paid := r.paidOrders[event.OrderID]; paid {
			revenue := r.days[day]
			revenue.RefundsCents += paidCents
			r.save(day, revenue)
		}
	}
}

func (r *RevenueByDay) All() []DailyRevenue {
	days := make([]DailyRevenue, 0, len(r.days))
	for _, revenue := range r.days {
		days = append(days, revenue)
	}
	slices.SortFunc(days, func(a, b DailyRevenue) int { return strings.Compare(a.Day, b.Day) })
	return days
}

func (r *RevenueByDay) save(day string, revenue DailyRevenue) {
	revenue.Day = day
	r.days[day] = revenue
}
