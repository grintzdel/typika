package adapters

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"example.com/shop/internal/orders"
	"example.com/shop/internal/web"
)

type OrderUseCases interface {
	PlaceOrder(request orders.OrderRequest) (orders.Order, error)
	PayOrder(id, cardToken string) (orders.Order, error)
	ShipOrder(id string) (orders.Order, error)
	DeliverOrder(id string) (orders.Order, error)
	CancelOrder(id, reason string) (orders.Order, error)
	FindOrder(id string) (orders.Order, error)
	CustomerHistory(email string) orders.CustomerHistory
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

func (b placeOrderBody) toRequest() orders.OrderRequest {
	request := orders.OrderRequest{Customer: orders.Customer{Name: b.Customer.Name, Email: b.Customer.Email}}
	for _, line := range b.Lines {
		request.Lines = append(request.Lines, orders.LineRequest{
			SKU:            line.SKU,
			UnitPriceCents: line.UnitPriceCents,
			Quantity:       line.Quantity,
		})
	}
	return request
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

func statusReply(order orders.Order, err error) (web.Response, error) {
	if err != nil {
		return web.Response{}, err
	}
	return reply(200, map[string]any{"orderId": order.ID, "status": order.Status()}), nil
}

// #region tour:driving-adapter
type HTTPOrdersAdapter struct {
	orders OrderUseCases
}

func NewHTTPOrdersAdapter(orders OrderUseCases) *HTTPOrdersAdapter {
	return &HTTPOrdersAdapter{orders: orders}
}

func (a *HTTPOrdersAdapter) Handle(req web.Request) web.Response {
	response, err := a.route(req)
	switch {
	case err == nil:
		return response
	case errors.Is(err, orders.ErrInvalidOrder):
		return fail(400, err.Error())
	case errors.Is(err, orders.ErrPaymentDeclined):
		return fail(402, err.Error())
	case errors.Is(err, orders.ErrOrderNotFound):
		return fail(404, err.Error())
	case errors.Is(err, orders.ErrConflict):
		return fail(409, err.Error())
	default:
		return fail(500, err.Error())
	}
}

// #endregion

func (a *HTTPOrdersAdapter) route(req web.Request) (web.Response, error) {
	parts := strings.Split(strings.TrimPrefix(req.Path, "/"), "/")
	switch {
	case req.Method == "POST" && len(parts) == 1 && parts[0] == "orders":
		var input placeOrderBody
		if err := decode(req.Body, &input); err != nil {
			return fail(400, "The order request is malformed"), nil
		}
		order, err := a.orders.PlaceOrder(input.toRequest())
		if err != nil {
			return web.Response{}, err
		}
		return reply(201, map[string]any{"orderId": order.ID, "totalCents": order.Total.Cents()}), nil
	case req.Method == "GET" && len(parts) == 2 && parts[0] == "orders":
		order, err := a.orders.FindOrder(parts[1])
		if err != nil {
			return web.Response{}, err
		}
		return reply(200, map[string]any{
			"orderId":       order.ID,
			"status":        order.Status(),
			"customerEmail": order.Customer.Email,
			"totalCents":    order.Total.Cents(),
		}), nil
	case req.Method == "GET" && len(parts) == 3 && parts[0] == "customers" && parts[2] == "orders":
		history := a.orders.CustomerHistory(parts[1])
		var lastStatus any
		if history.LastStatus != "" {
			lastStatus = history.LastStatus
		}
		return reply(200, map[string]any{
			"orderCount":      history.OrderCount,
			"totalSpentCents": history.TotalSpent.Cents(),
			"lastStatus":      lastStatus,
		}), nil
	case req.Method == "POST" && len(parts) == 3 && parts[0] == "orders":
		id := parts[1]
		switch parts[2] {
		case "pay":
			var input struct {
				CardToken string `json:"cardToken"`
			}
			if err := decode(req.Body, &input); err != nil || input.CardToken == "" {
				return fail(400, "A card token is required"), nil
			}
			return statusReply(a.orders.PayOrder(id, input.CardToken))
		case "ship":
			return statusReply(a.orders.ShipOrder(id))
		case "deliver":
			return statusReply(a.orders.DeliverOrder(id))
		case "cancel":
			var input struct {
				Reason string `json:"reason"`
			}
			if err := decode(req.Body, &input); err != nil || input.Reason == "" {
				input.Reason = "no reason given"
			}
			return statusReply(a.orders.CancelOrder(id, input.Reason))
		}
	}
	return fail(404, fmt.Sprintf("No route for %s %s", req.Method, req.Path)), nil
}
