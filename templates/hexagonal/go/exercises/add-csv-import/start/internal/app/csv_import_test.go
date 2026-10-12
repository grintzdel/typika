package app_test

import (
	"slices"
	"strings"
	"testing"

	"example.com/shop/internal/app"
	"example.com/shop/internal/infra"
)

const header = "email,name,sku,unitPriceCents,quantity"

func csvOf(rows ...string) string {
	return strings.Join(append([]string{header}, rows...), "\n")
}

func TestCSVImport(t *testing.T) {
	t.Run("places one order per row", func(t *testing.T) {
		shop := app.OpenShop()

		report, err := shop.CSVImport.ImportOrders(csvOf(
			"ada@example.com,Ada,MUG-01,1200,2",
			"grace@example.com,Grace,KETTLE-01,5990,1",
		))

		if err != nil {
			t.Fatal(err)
		}
		if !slices.Equal(report.Imported, []string{"order-1", "order-2"}) || len(report.RejectedLines) != 0 {
			t.Errorf("report = %+v, want order-1 and order-2 imported, no line rejected", report)
		}
		order := get(shop, "/orders/order-2").Body
		if want := `{"customerEmail":"grace@example.com","orderId":"order-2","status":"pending","totalCents":5990}`; order != want {
			t.Errorf("order-2 = %s, want %s", order, want)
		}
	})

	t.Run("confirms and announces imported orders like any other order", func(t *testing.T) {
		shop := app.OpenShop()

		if _, err := shop.CSVImport.ImportOrders(csvOf("ada@example.com,Ada,MUG-01,1200,2")); err != nil {
			t.Fatal(err)
		}

		want := []infra.Email{{
			To:      "ada@example.com",
			Subject: "Order order-1 confirmed",
			Body:    "Hello Ada, we received your order of 24.00 EUR.",
		}}
		if !slices.Equal(shop.Mailer.Sent, want) {
			t.Errorf("sent %v, want %v", shop.Mailer.Sent, want)
		}
		if len(shop.Broker.Published) != 1 || shop.Broker.Published[0].Topic != "OrderPlaced" {
			t.Errorf("published %+v, want one OrderPlaced", shop.Broker.Published)
		}
	})

	t.Run("rejects the rows the shop would refuse and imports the others", func(t *testing.T) {
		shop := app.OpenShop()

		report, err := shop.CSVImport.ImportOrders(csvOf(
			"ada@example.com,Ada,MUG-01,1200,2",
			"grace@example.com,Grace,KETTLE-01,5990,0",
			"grace,Grace,KETTLE-01,5990,1",
			"grace@example.com,Grace,TEA-GREEN,850,3",
		))

		if err != nil {
			t.Fatal(err)
		}
		if !slices.Equal(report.Imported, []string{"order-1", "order-2"}) || !slices.Equal(report.RejectedLines, []int{3, 4}) {
			t.Errorf("report = %+v, want order-1 and order-2 imported, lines 3 and 4 rejected", report)
		}
		if len(shop.Mailer.Sent) != 2 {
			t.Errorf("sent %d emails, want 2", len(shop.Mailer.Sent))
		}
	})
}
