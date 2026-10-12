package checkout_test

import (
	"fmt"

	"example.com/shop/internal/checkout"
	"example.com/shop/internal/shop"
)

type fakeNotifier struct {
	sent []string
}

func (n *fakeNotifier) Notify(recipient, message string) error {
	n.sent = append(n.sent, recipient+": "+message)
	return nil
}

type fakeOrders struct {
	saved   map[checkout.OrderID]shop.Order
	failure error
}

func newFakeOrders() *fakeOrders {
	return &fakeOrders{saved: map[checkout.OrderID]shop.Order{}}
}

func (o *fakeOrders) Add(order shop.Order) (checkout.OrderID, error) {
	if o.failure != nil {
		return "", o.failure
	}
	id := checkout.OrderID(fmt.Sprintf("order-%d", len(o.saved)+1))
	o.saved[id] = order
	return id, nil
}

func (o *fakeOrders) Find(id checkout.OrderID) (shop.Order, bool) {
	order, ok := o.saved[id]
	return order, ok
}

var grace = shop.Customer{Name: "Grace", Email: "grace@example.com", Tier: shop.Member}

func orderOf(customer shop.Customer, totalCents int64) shop.Order {
	return shop.Order{
		Customer: customer,
		Lines:    []shop.OrderLine{{SKU: "TEST-SKU", UnitPrice: shop.EUR(totalCents), Quantity: 1}},
	}
}
