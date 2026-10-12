package adapters

import (
	"example.com/shop/internal/infra"
	"example.com/shop/internal/orders"
	"example.com/shop/internal/shop"
)

var _ orders.OrderRepository = (*InMemoryOrderRepository)(nil)

type InMemoryOrderRepository struct {
	db *infra.InMemoryDatabase
}

func NewInMemoryOrderRepository(db *infra.InMemoryDatabase) *InMemoryOrderRepository {
	return &InMemoryOrderRepository{db: db}
}

func toRow(order orders.Order) infra.OrderRow {
	row := infra.OrderRow{
		ID:            order.ID,
		CustomerEmail: order.Customer.Email,
		CustomerName:  order.Customer.Name,
		TotalCents:    order.Total.Cents(),
		PlacedAt:      order.PlacedAt,
		ChargeID:      order.ChargeID,
		DeliveredAt:   order.DeliveredAt,
		IsPaid:        order.IsPaid,
		IsShipped:     order.IsShipped,
		IsDelivered:   order.IsDelivered,
		IsCancelled:   order.IsCancelled,
	}
	for _, line := range order.Lines {
		row.Lines = append(row.Lines, infra.OrderLineRow{
			SKU:            line.SKU,
			UnitPriceCents: line.UnitPrice.Cents(),
			Quantity:       line.Quantity,
		})
	}
	return row
}

func toOrder(row infra.OrderRow) orders.Order {
	order := orders.Order{
		ID:          row.ID,
		Customer:    orders.Customer{Name: row.CustomerName, Email: row.CustomerEmail},
		Total:       shop.EUR(row.TotalCents),
		PlacedAt:    row.PlacedAt,
		ChargeID:    row.ChargeID,
		DeliveredAt: row.DeliveredAt,
		IsPaid:      row.IsPaid,
		IsShipped:   row.IsShipped,
		IsDelivered: row.IsDelivered,
		IsCancelled: row.IsCancelled,
	}
	for _, line := range row.Lines {
		order.Lines = append(order.Lines, orders.Line{
			SKU:       line.SKU,
			UnitPrice: shop.EUR(line.UnitPriceCents),
			Quantity:  line.Quantity,
		})
	}
	return order
}

func (r *InMemoryOrderRepository) Add(order orders.Order) orders.Order {
	order.ID = r.db.NextOrderID()
	r.db.SaveOrder(toRow(order))
	return order
}

func (r *InMemoryOrderRepository) Update(order orders.Order) {
	r.db.SaveOrder(toRow(order))
}

func (r *InMemoryOrderRepository) Find(id string) (orders.Order, bool) {
	row, found := r.db.FindOrder(id)
	if !found {
		return orders.Order{}, false
	}
	return toOrder(row), true
}

func (r *InMemoryOrderRepository) FindByCustomer(email string) []orders.Order {
	var found []orders.Order
	for _, row := range r.db.Orders() {
		if row.CustomerEmail == email {
			found = append(found, toOrder(row))
		}
	}
	return found
}
