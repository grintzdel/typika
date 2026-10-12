package pricing

import "testing"

func TestRateDefault(t *testing.T) {
	if rate != 10 {
		t.Errorf("rate = %d", rate)
	}
}
