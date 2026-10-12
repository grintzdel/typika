package read

import "example.com/shop/internal/orders/events"

type OrderView struct {
	OrderID       string
	Status        events.Status
	CustomerEmail string
	TotalCents    int64
}

type OrderViews struct {
	views map[string]OrderView
}

func NewOrderViews() *OrderViews {
	return &OrderViews{views: map[string]OrderView{}}
}

func (v *OrderViews) Apply(event events.Event) {
	if event.Type == events.OrderPlaced {
		v.views[event.OrderID] = OrderView{
			OrderID:       event.OrderID,
			Status:        events.Pending,
			CustomerEmail: event.CustomerEmail,
			TotalCents:    event.TotalCents,
		}
		return
	}
	if view, found := v.views[event.OrderID]; found {
		view.Status = event.StatusAfter()
		v.views[event.OrderID] = view
	}
}

func (v *OrderViews) Find(orderID string) (OrderView, bool) {
	view, found := v.views[orderID]
	return view, found
}
