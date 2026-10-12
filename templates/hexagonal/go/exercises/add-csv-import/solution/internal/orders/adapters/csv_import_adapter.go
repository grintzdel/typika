package adapters

import (
	"errors"
	"strconv"
	"strings"

	"example.com/shop/internal/orders"
)

type OrderPlacer interface {
	PlaceOrder(request orders.OrderRequest) (orders.Order, error)
}

type ImportReport struct {
	Imported      []string
	RejectedLines []int
}

type CSVImportAdapter struct {
	orders OrderPlacer
}

func NewCSVImportAdapter(orders OrderPlacer) *CSVImportAdapter {
	return &CSVImportAdapter{orders: orders}
}

func (a *CSVImportAdapter) ImportOrders(csv string) (ImportReport, error) {
	var report ImportReport
	rows := strings.Split(strings.TrimSpace(csv), "\n")
	for i, row := range rows[1:] {
		lineNumber := i + 2
		request, ok := parseRow(row)
		if !ok {
			report.RejectedLines = append(report.RejectedLines, lineNumber)
			continue
		}
		order, err := a.orders.PlaceOrder(request)
		switch {
		case errors.Is(err, orders.ErrInvalidOrder):
			report.RejectedLines = append(report.RejectedLines, lineNumber)
		case err != nil:
			return report, err
		default:
			report.Imported = append(report.Imported, order.ID)
		}
	}
	return report, nil
}

func parseRow(row string) (orders.OrderRequest, bool) {
	fields := strings.Split(row, ",")
	if len(fields) != 5 {
		return orders.OrderRequest{}, false
	}
	unitPriceCents, priceErr := strconv.ParseInt(fields[3], 10, 64)
	quantity, quantityErr := strconv.Atoi(fields[4])
	if priceErr != nil || quantityErr != nil {
		return orders.OrderRequest{}, false
	}
	return orders.OrderRequest{
		Customer: orders.Customer{Email: fields[0], Name: fields[1]},
		Lines:    []orders.LineRequest{{SKU: fields[2], UnitPriceCents: unitPriceCents, Quantity: quantity}},
	}, true
}
