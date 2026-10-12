package orders

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"example.com/shop/internal/infra"
	"example.com/shop/internal/orders/read"
	"example.com/shop/internal/orders/write"
	"example.com/shop/internal/web"
)

type Handler struct {
	commands          *write.CommandHandler
	orderViews        *read.OrderViews
	customerSummaries *read.CustomerOrderSummaries
	revenueByDay      *read.RevenueByDay
}

func NewHandler(
	commands *write.CommandHandler,
	orderViews *read.OrderViews,
	customerSummaries *read.CustomerOrderSummaries,
	revenueByDay *read.RevenueByDay,
) *Handler {
	return &Handler{
		commands:          commands,
		orderViews:        orderViews,
		customerSummaries: customerSummaries,
		revenueByDay:      revenueByDay,
	}
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

func (b placeOrderBody) toCommand() write.PlaceOrder {
	command := write.PlaceOrder{Customer: write.Customer{Name: b.Customer.Name, Email: b.Customer.Email}}
	for _, line := range b.Lines {
		command.Lines = append(command.Lines, infra.OrderLineRow{
			SKU:            line.SKU,
			UnitPriceCents: line.UnitPriceCents,
			Quantity:       line.Quantity,
		})
	}
	return command
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

func rejection(err error) web.Response {
	switch {
	case errors.Is(err, write.ErrInvalidOrder):
		return fail(400, err.Error())
	case errors.Is(err, write.ErrPaymentDeclined):
		return fail(402, err.Error())
	case errors.Is(err, write.ErrOrderNotFound):
		return fail(404, err.Error())
	case errors.Is(err, write.ErrConflict):
		return fail(409, err.Error())
	default:
		return fail(500, err.Error())
	}
}

// #region tour:routes
func (h *Handler) Handle(req web.Request) web.Response {
	parts := strings.Split(strings.TrimPrefix(req.Path, "/"), "/")
	switch {
	case req.Method == "POST" && len(parts) == 1 && parts[0] == "orders":
		var input placeOrderBody
		if err := decode(req.Body, &input); err != nil {
			return fail(400, "The order request is malformed")
		}
		orderID, err := h.commands.PlaceOrder(input.toCommand())
		if err != nil {
			return rejection(err)
		}
		view, _ := h.orderViews.Find(orderID)
		return reply(201, map[string]any{"orderId": view.OrderID, "totalCents": view.TotalCents})
	case req.Method == "POST" && len(parts) == 3 && parts[0] == "orders":
		if err := h.execute(parts[1], parts[2], req.Body); err != nil {
			return rejection(err)
		}
		view, _ := h.orderViews.Find(parts[1])
		return reply(200, map[string]any{"orderId": view.OrderID, "status": view.Status})
	case req.Method == "GET" && len(parts) == 2 && parts[0] == "orders":
		view, found := h.orderViews.Find(parts[1])
		if !found {
			return fail(404, fmt.Sprintf("Order %s not found", parts[1]))
		}
		return reply(200, map[string]any{
			"orderId":       view.OrderID,
			"status":        view.Status,
			"customerEmail": view.CustomerEmail,
			"totalCents":    view.TotalCents,
		})
	case req.Method == "GET" && len(parts) == 3 && parts[0] == "customers" && parts[2] == "orders":
		return summaryReply(h.customerSummaries.ForCustomer(parts[1]))
	case req.Method == "GET" && len(parts) == 2 && parts[0] == "revenue" && parts[1] == "daily":
		return reply(200, map[string]any{"days": h.revenueByDay.All()})
	}
	return fail(404, fmt.Sprintf("No route for %s %s", req.Method, req.Path))
}

// #endregion

func (h *Handler) execute(orderID, action, body string) error {
	switch action {
	case "pay":
		var input struct {
			CardToken string `json:"cardToken"`
		}
		if err := decode(body, &input); err != nil || input.CardToken == "" {
			return fmt.Errorf("%w: a card token is required", write.ErrInvalidOrder)
		}
		return h.commands.PayOrder(write.PayOrder{OrderID: orderID, CardToken: input.CardToken})
	case "ship":
		return h.commands.ShipOrder(write.ShipOrder{OrderID: orderID})
	case "deliver":
		return h.commands.DeliverOrder(write.DeliverOrder{OrderID: orderID})
	case "cancel":
		var input struct {
			Reason string `json:"reason"`
		}
		if err := decode(body, &input); err != nil || input.Reason == "" {
			input.Reason = "no reason given"
		}
		return h.commands.CancelOrder(write.CancelOrder{OrderID: orderID, Reason: input.Reason})
	default:
		return fmt.Errorf("%w: cannot %s order %s", write.ErrInvalidOrder, action, orderID)
	}
}

func summaryReply(summary read.CustomerOrderSummary) web.Response {
	var lastStatus any
	if summary.LastStatus != "" {
		lastStatus = summary.LastStatus
	}
	return reply(200, map[string]any{
		"orderCount":      summary.OrderCount,
		"totalSpentCents": summary.TotalSpentCents,
		"lastStatus":      lastStatus,
	})
}
