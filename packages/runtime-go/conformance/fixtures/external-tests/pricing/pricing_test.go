package pricing_test

import (
	"fmt"
	"os"
	"testing"

	"example.com/shop/cart"
	"example.com/shop/pricing"
)

func TestMain(m *testing.M) {
	fmt.Println("setting up")
	os.Exit(m.Run())
}

func TestTotalUsesTheTestRate(t *testing.T) {
	pricing.SetRate(50)
	defer pricing.SetRate(10)
	if got := cart.Total(1000); got != 500 {
		t.Errorf("Total(1000) = %d, want 500", got)
	}
}
