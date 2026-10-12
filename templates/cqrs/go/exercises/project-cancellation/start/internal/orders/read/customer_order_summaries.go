package read

import "example.com/shop/internal/orders/events"

// #region tour:read-model
type CustomerOrderSummary struct {
	OrderCount      int
	TotalSpentCents int64
	LastStatus      events.Status
}

// #endregion

type summaryRow struct {
	CustomerOrderSummary
	lastOrderID string
}

type placedOrder struct {
	customerEmail string
}

type CustomerOrderSummaries struct {
	summaries map[string]summaryRow
	orders    map[string]placedOrder
}

func NewCustomerOrderSummaries() *CustomerOrderSummaries {
	return &CustomerOrderSummaries{summaries: map[string]summaryRow{}, orders: map[string]placedOrder{}}
}

// #region tour:projection
func (s *CustomerOrderSummaries) Apply(event events.Event) {
	if event.Type == events.OrderPlaced {
		s.orders[event.OrderID] = placedOrder{customerEmail: event.CustomerEmail}
		row := s.summaries[event.CustomerEmail]
		row.OrderCount++
		row.TotalSpentCents += event.TotalCents
		row.LastStatus = events.Pending
		row.lastOrderID = event.OrderID
		s.summaries[event.CustomerEmail] = row
		return
	}
	order, found := s.orders[event.OrderID]
	if !found {
		return
	}
	row := s.summaries[order.customerEmail]
	if row.lastOrderID == event.OrderID {
		row.LastStatus = event.StatusAfter()
	}
	s.summaries[order.customerEmail] = row
}

// #endregion

func (s *CustomerOrderSummaries) ForCustomer(email string) CustomerOrderSummary {
	return s.summaries[email].CustomerOrderSummary
}
