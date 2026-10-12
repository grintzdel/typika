package write

import (
	"encoding/json"
	"fmt"
	"slices"
	"strings"

	"example.com/shop/internal/infra"
	"example.com/shop/internal/orders/events"
	"example.com/shop/internal/shop"
)

type Projection interface {
	Apply(event events.Event)
}

type CommandHandler struct {
	db          *infra.InMemoryDatabase
	cards       *infra.CardProcessor
	broker      *infra.FakeBroker
	mailer      *infra.SMTPMailer
	clock       *infra.ManualClock
	projections []Projection
}

func NewCommandHandler(
	db *infra.InMemoryDatabase,
	cards *infra.CardProcessor,
	broker *infra.FakeBroker,
	mailer *infra.SMTPMailer,
	clock *infra.ManualClock,
	projections ...Projection,
) *CommandHandler {
	return &CommandHandler{db: db, cards: cards, broker: broker, mailer: mailer, clock: clock, projections: projections}
}

func invalid(reason string) error {
	return fmt.Errorf("%w: %s", ErrInvalidOrder, reason)
}

func conflict(orderID, reason string) error {
	return fmt.Errorf("%w: order %s %s", ErrConflict, orderID, reason)
}

func (h *CommandHandler) PlaceOrder(command PlaceOrder) (string, error) {
	if command.Customer.Name == "" {
		return "", invalid("a customer name is required")
	}
	if !strings.Contains(command.Customer.Email, "@") {
		return "", invalid("a valid customer email is required")
	}
	if len(command.Lines) == 0 {
		return "", invalid("an order needs at least one line")
	}
	var totalCents int64
	for _, line := range command.Lines {
		if line.SKU == "" {
			return "", invalid("each line needs a sku")
		}
		if line.UnitPriceCents <= 0 || line.Quantity <= 0 {
			return "", invalid(fmt.Sprintf("line %s needs a positive price and quantity", line.SKU))
		}
		totalCents += line.UnitPriceCents * int64(line.Quantity)
	}

	order := infra.OrderRow{
		ID:            h.db.NextOrderID(),
		CustomerEmail: command.Customer.Email,
		CustomerName:  command.Customer.Name,
		Lines:         slices.Clone(command.Lines),
		TotalCents:    totalCents,
		PlacedAt:      h.clock.Now(),
	}
	h.db.SaveOrder(order)
	err := h.record(events.Event{
		Type:          events.OrderPlaced,
		OrderID:       order.ID,
		CustomerEmail: order.CustomerEmail,
		TotalCents:    totalCents,
		OccurredAt:    order.PlacedAt,
	})
	if err != nil {
		return "", err
	}
	h.mailer.Send(infra.Email{
		To:      order.CustomerEmail,
		Subject: fmt.Sprintf("Order %s confirmed", order.ID),
		Body:    fmt.Sprintf("Hello %s, we received your order of %s.", order.CustomerName, shop.EUR(totalCents)),
	})
	return order.ID, nil
}

func (h *CommandHandler) PayOrder(command PayOrder) error {
	order, err := h.find(command.OrderID)
	if err != nil {
		return err
	}
	if order.IsCancelled {
		return conflict(order.ID, "is cancelled")
	}
	if order.IsPaid {
		return conflict(order.ID, "is already paid")
	}

	charge := h.cards.Charge(command.CardToken, order.TotalCents)
	if !charge.Approved {
		return fmt.Errorf("%w: %s", ErrPaymentDeclined, charge.Reason)
	}
	order.IsPaid = true
	order.ChargeID = charge.ChargeID
	h.db.SaveOrder(order)
	return h.record(events.Event{
		Type:       events.OrderPaid,
		OrderID:    order.ID,
		TotalCents: order.TotalCents,
		OccurredAt: h.clock.Now(),
	})
}

func (h *CommandHandler) ShipOrder(command ShipOrder) error {
	order, err := h.find(command.OrderID)
	if err != nil {
		return err
	}
	if order.IsCancelled {
		return conflict(order.ID, "is cancelled")
	}
	if !order.IsPaid {
		return conflict(order.ID, "is not paid")
	}
	if order.IsShipped {
		return conflict(order.ID, "has already shipped")
	}

	order.IsShipped = true
	h.db.SaveOrder(order)
	if err := h.record(events.Event{Type: events.OrderShipped, OrderID: order.ID, OccurredAt: h.clock.Now()}); err != nil {
		return err
	}
	h.mailer.Send(infra.Email{
		To:      order.CustomerEmail,
		Subject: fmt.Sprintf("Order %s shipped", order.ID),
		Body:    fmt.Sprintf("Hello %s, your order is on its way.", order.CustomerName),
	})
	return nil
}

func (h *CommandHandler) DeliverOrder(command DeliverOrder) error {
	order, err := h.find(command.OrderID)
	if err != nil {
		return err
	}
	if !order.IsShipped || order.IsDelivered {
		return conflict(order.ID, "is not on its way")
	}

	order.IsDelivered = true
	order.DeliveredAt = h.clock.Now()
	h.db.SaveOrder(order)
	return h.record(events.Event{Type: events.OrderDelivered, OrderID: order.ID, OccurredAt: order.DeliveredAt})
}

func (h *CommandHandler) CancelOrder(command CancelOrder) error {
	order, err := h.find(command.OrderID)
	if err != nil {
		return err
	}
	if order.IsShipped {
		return conflict(order.ID, "has already shipped")
	}
	if order.IsCancelled {
		return conflict(order.ID, "is already cancelled")
	}

	if order.IsPaid && order.ChargeID != "" {
		h.cards.Refund(order.ChargeID)
	}
	order.IsCancelled = true
	h.db.SaveOrder(order)
	if err := h.record(events.Event{Type: events.OrderCancelled, OrderID: order.ID, OccurredAt: h.clock.Now()}); err != nil {
		return err
	}
	h.mailer.Send(infra.Email{
		To:      order.CustomerEmail,
		Subject: fmt.Sprintf("Order %s cancelled", order.ID),
		Body:    fmt.Sprintf("Hello %s, your order was cancelled: %s.", order.CustomerName, command.Reason),
	})
	return nil
}

func (h *CommandHandler) find(orderID string) (infra.OrderRow, error) {
	order, found := h.db.FindOrder(orderID)
	if !found {
		return infra.OrderRow{}, fmt.Errorf("%w: %s", ErrOrderNotFound, orderID)
	}
	return order, nil
}

// #region tour:record
func (h *CommandHandler) record(event events.Event) error {
	for _, projection := range h.projections {
		projection.Apply(event)
	}
	payload, err := json.Marshal(event)
	if err != nil {
		return err
	}
	return h.broker.Publish(string(event.Type), payload)
}

// #endregion
