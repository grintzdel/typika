package orders

import (
	"encoding/json"
	"fmt"
	"strings"

	"example.com/shop/internal/infra"
	"example.com/shop/internal/shop"
	"example.com/shop/internal/web"
)

type Handler struct {
	db     *infra.InMemoryDatabase
	cards  *infra.CardProcessor
	relay  *OutboxRelay
	mailer *infra.SMTPMailer
	clock  *infra.ManualClock
}

func NewHandler(
	db *infra.InMemoryDatabase,
	cards *infra.CardProcessor,
	relay *OutboxRelay,
	mailer *infra.SMTPMailer,
	clock *infra.ManualClock,
) *Handler {
	return &Handler{db: db, cards: cards, relay: relay, mailer: mailer, clock: clock}
}

type placeOrderBody struct {
	Customer struct {
		Name  string `json:"name"`
		Email string `json:"email"`
	} `json:"customer"`
	Lines []struct {
		SKU            string `json:"sku"`
		UnitPriceCents int64  `json:"unitPriceCents"`
		Quantity       int    `json:"quantity"`
	} `json:"lines"`
}

func decode(body string, v any) error {
	if body == "" {
		return nil
	}
	return json.Unmarshal([]byte(body), v)
}

func reply(status int, body map[string]any) web.Response {
	data, _ := json.Marshal(body)
	return web.Response{Status: status, Body: string(data)}
}

func fail(status int, message string) web.Response {
	return reply(status, map[string]any{"error": message})
}

func statusOf(order infra.OrderRow) string {
	switch {
	case order.IsCancelled:
		return "cancelled"
	case order.IsDelivered:
		return "delivered"
	case order.IsShipped:
		return "shipped"
	case order.IsPaid:
		return "paid"
	default:
		return "pending"
	}
}

func (h *Handler) Handle(req web.Request) web.Response {
	parts := strings.Split(strings.TrimPrefix(req.Path, "/"), "/")
	switch {
	case req.Method == "POST" && len(parts) == 1 && parts[0] == "orders":
		return h.placeOrder(req.Body)
	case req.Method == "GET" && len(parts) == 2 && parts[0] == "orders":
		return h.getOrder(parts[1])
	case req.Method == "GET" && len(parts) == 3 && parts[0] == "customers" && parts[2] == "orders":
		return h.getCustomerOrders(parts[1])
	case req.Method == "POST" && len(parts) == 3 && parts[0] == "orders":
		order, found := h.db.FindOrder(parts[1])
		if !found {
			return fail(404, fmt.Sprintf("Order %s not found", parts[1]))
		}
		switch parts[2] {
		case "pay":
			return h.payOrder(order, req.Body)
		case "ship":
			return h.shipOrder(order)
		case "deliver":
			return h.deliverOrder(order)
		case "cancel":
			return h.cancelOrder(order, req.Body)
		}
	}
	return fail(404, fmt.Sprintf("No route for %s %s", req.Method, req.Path))
}

func (h *Handler) placeOrder(body string) web.Response {
	var input placeOrderBody
	if err := decode(body, &input); err != nil {
		return fail(400, "The order request is malformed")
	}
	if input.Customer.Name == "" {
		return fail(400, "A customer name is required")
	}
	if !strings.Contains(input.Customer.Email, "@") {
		return fail(400, "A valid customer email is required")
	}
	if len(input.Lines) == 0 {
		return fail(400, "An order needs at least one line")
	}
	var lines []infra.OrderLineRow
	var totalCents int64
	for _, line := range input.Lines {
		if line.SKU == "" {
			return fail(400, "Each line needs a sku")
		}
		if line.UnitPriceCents <= 0 || line.Quantity <= 0 {
			return fail(400, fmt.Sprintf("Line %s needs a positive whole price and quantity", line.SKU))
		}
		lines = append(lines, infra.OrderLineRow{SKU: line.SKU, UnitPriceCents: line.UnitPriceCents, Quantity: line.Quantity})
		totalCents += line.UnitPriceCents * int64(line.Quantity)
	}

	// #region tour:same-transaction
	var order infra.OrderRow
	err := h.db.Transaction(func() error {
		order = infra.OrderRow{
			ID:            h.db.NextOrderID(),
			CustomerEmail: input.Customer.Email,
			CustomerName:  input.Customer.Name,
			Lines:         lines,
			TotalCents:    totalCents,
			PlacedAt:      h.clock.Now(),
		}
		h.db.SaveOrder(order)
		return h.addToOutbox("OrderPlaced", map[string]any{
			"orderId":       order.ID,
			"customerEmail": order.CustomerEmail,
			"totalCents":    totalCents,
		})
	})
	if err != nil {
		return fail(500, err.Error())
	}
	h.relay.PublishPending()
	// #endregion
	h.mailer.Send(infra.Email{
		To:      order.CustomerEmail,
		Subject: fmt.Sprintf("Order %s confirmed", order.ID),
		Body:    fmt.Sprintf("Hello %s, we received your order of %s.", order.CustomerName, shop.EUR(totalCents)),
	})
	return reply(201, map[string]any{"orderId": order.ID, "totalCents": totalCents})
}

func (h *Handler) payOrder(order infra.OrderRow, body string) web.Response {
	if order.IsCancelled {
		return fail(409, fmt.Sprintf("Order %s is cancelled", order.ID))
	}
	if order.IsPaid {
		return fail(409, fmt.Sprintf("Order %s is already paid", order.ID))
	}
	var input struct {
		CardToken string `json:"cardToken"`
	}
	if err := decode(body, &input); err != nil || input.CardToken == "" {
		return fail(400, "A card token is required")
	}

	charge := h.cards.Charge(input.CardToken, order.TotalCents)
	if !charge.Approved {
		return fail(402, charge.Reason)
	}
	order.IsPaid = true
	order.ChargeID = charge.ChargeID
	if err := h.save(order, "OrderPaid", map[string]any{"orderId": order.ID, "totalCents": order.TotalCents}); err != nil {
		return fail(500, err.Error())
	}
	return statusReply(order)
}

func (h *Handler) shipOrder(order infra.OrderRow) web.Response {
	if order.IsCancelled {
		return fail(409, fmt.Sprintf("Order %s is cancelled", order.ID))
	}
	if !order.IsPaid {
		return fail(409, fmt.Sprintf("Order %s is not paid", order.ID))
	}
	if order.IsShipped {
		return fail(409, fmt.Sprintf("Order %s has already shipped", order.ID))
	}

	order.IsShipped = true
	if err := h.save(order, "OrderShipped", map[string]any{"orderId": order.ID}); err != nil {
		return fail(500, err.Error())
	}
	h.mailer.Send(infra.Email{
		To:      order.CustomerEmail,
		Subject: fmt.Sprintf("Order %s shipped", order.ID),
		Body:    fmt.Sprintf("Hello %s, your order is on its way.", order.CustomerName),
	})
	return statusReply(order)
}

func (h *Handler) deliverOrder(order infra.OrderRow) web.Response {
	if !order.IsShipped || order.IsDelivered {
		return fail(409, fmt.Sprintf("Order %s is not on its way", order.ID))
	}

	order.IsDelivered = true
	order.DeliveredAt = h.clock.Now()
	if err := h.save(order, "OrderDelivered", map[string]any{"orderId": order.ID}); err != nil {
		return fail(500, err.Error())
	}
	return statusReply(order)
}

func (h *Handler) cancelOrder(order infra.OrderRow, body string) web.Response {
	if order.IsShipped {
		return fail(409, fmt.Sprintf("Order %s has already shipped", order.ID))
	}
	if order.IsCancelled {
		return fail(409, fmt.Sprintf("Order %s is already cancelled", order.ID))
	}
	var input struct {
		Reason string `json:"reason"`
	}
	if err := decode(body, &input); err != nil || input.Reason == "" {
		input.Reason = "no reason given"
	}

	if order.IsPaid && order.ChargeID != "" {
		h.cards.Refund(order.ChargeID)
	}
	order.IsCancelled = true
	if err := h.save(order, "OrderCancelled", map[string]any{"orderId": order.ID}); err != nil {
		return fail(500, err.Error())
	}
	h.mailer.Send(infra.Email{
		To:      order.CustomerEmail,
		Subject: fmt.Sprintf("Order %s cancelled", order.ID),
		Body:    fmt.Sprintf("Hello %s, your order was cancelled: %s.", order.CustomerName, input.Reason),
	})
	return statusReply(order)
}

func (h *Handler) getOrder(id string) web.Response {
	order, found := h.db.FindOrder(id)
	if !found {
		return fail(404, fmt.Sprintf("Order %s not found", id))
	}
	return reply(200, map[string]any{
		"orderId":       order.ID,
		"status":        statusOf(order),
		"customerEmail": order.CustomerEmail,
		"totalCents":    order.TotalCents,
	})
}

func (h *Handler) getCustomerOrders(email string) web.Response {
	orderCount := 0
	var totalSpentCents int64
	var lastStatus any
	for _, order := range h.db.Orders() {
		if order.CustomerEmail != email {
			continue
		}
		orderCount++
		if !order.IsCancelled {
			totalSpentCents += order.TotalCents
		}
		lastStatus = statusOf(order)
	}
	return reply(200, map[string]any{
		"orderCount":      orderCount,
		"totalSpentCents": totalSpentCents,
		"lastStatus":      lastStatus,
	})
}

func (h *Handler) save(order infra.OrderRow, topic string, payload map[string]any) error {
	err := h.db.Transaction(func() error {
		h.db.SaveOrder(order)
		return h.addToOutbox(topic, payload)
	})
	if err != nil {
		return err
	}
	h.relay.PublishPending()
	return nil
}

func (h *Handler) addToOutbox(topic string, payload map[string]any) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	h.db.AddToOutbox(topic, data)
	return nil
}

func statusReply(order infra.OrderRow) web.Response {
	return reply(200, map[string]any{"orderId": order.ID, "status": statusOf(order)})
}
