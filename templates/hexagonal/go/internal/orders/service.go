package orders

import (
	"fmt"

	"example.com/shop/internal/shop"
)

type Service struct {
	orders   OrderRepository
	payments PaymentGateway
	notifier Notifier
	events   EventPublisher
	clock    Clock
}

func NewService(
	orders OrderRepository,
	payments PaymentGateway,
	notifier Notifier,
	events EventPublisher,
	clock Clock,
) *Service {
	return &Service{orders: orders, payments: payments, notifier: notifier, events: events, clock: clock}
}

func (s *Service) PlaceOrder(request OrderRequest) (Order, error) {
	order, err := NewOrder(request, s.clock.Now())
	if err != nil {
		return Order{}, err
	}
	order = s.orders.Add(order)
	if err := s.events.Publish(Event{Type: OrderPlaced, Order: order}); err != nil {
		return Order{}, err
	}
	s.notifier.Notify(Notification{Kind: ConfirmedNotice, Order: order})
	return order, nil
}

func (s *Service) PayOrder(id, cardToken string) (Order, error) {
	order, err := s.FindOrder(id)
	if err != nil {
		return Order{}, err
	}
	if err := order.EnsurePayable(); err != nil {
		return Order{}, err
	}
	paymentID, err := s.payments.Charge(order.Total, cardToken)
	if err != nil {
		return Order{}, err
	}

	order.MarkPaid(paymentID)
	if err := s.save(order, OrderPaid); err != nil {
		return Order{}, err
	}
	return order, nil
}

func (s *Service) ShipOrder(id string) (Order, error) {
	order, err := s.FindOrder(id)
	if err != nil {
		return Order{}, err
	}
	if err := order.Ship(); err != nil {
		return Order{}, err
	}
	if err := s.save(order, OrderShipped); err != nil {
		return Order{}, err
	}
	s.notifier.Notify(Notification{Kind: ShippedNotice, Order: order})
	return order, nil
}

func (s *Service) DeliverOrder(id string) (Order, error) {
	order, err := s.FindOrder(id)
	if err != nil {
		return Order{}, err
	}
	if err := order.Deliver(s.clock.Now()); err != nil {
		return Order{}, err
	}
	if err := s.save(order, OrderDelivered); err != nil {
		return Order{}, err
	}
	return order, nil
}

func (s *Service) CancelOrder(id, reason string) (Order, error) {
	order, err := s.FindOrder(id)
	if err != nil {
		return Order{}, err
	}
	if err := order.Cancel(); err != nil {
		return Order{}, err
	}
	if order.ChargeID != "" {
		s.payments.Refund(order.ChargeID)
	}
	if err := s.save(order, OrderCancelled); err != nil {
		return Order{}, err
	}
	s.notifier.Notify(Notification{Kind: CancelledNotice, Order: order, Reason: reason})
	return order, nil
}

func (s *Service) FindOrder(id string) (Order, error) {
	order, found := s.orders.Find(id)
	if !found {
		return Order{}, fmt.Errorf("%w: %s", ErrOrderNotFound, id)
	}
	return order, nil
}

func (s *Service) CustomerHistory(email string) CustomerHistory {
	orders := s.orders.FindByCustomer(email)
	history := CustomerHistory{OrderCount: len(orders), TotalSpent: shop.Zero}
	for _, order := range orders {
		if !order.IsCancelled {
			history.TotalSpent = history.TotalSpent.Add(order.Total)
		}
		history.LastStatus = order.Status()
	}
	return history
}

func (s *Service) save(order Order, event EventType) error {
	s.orders.Update(order)
	return s.events.Publish(Event{Type: event, Order: order})
}
