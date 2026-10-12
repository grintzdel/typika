package setup

import (
	"fmt"
	"os"
	"testing"
)

func TestMain(m *testing.M) {
	if !Ready() {
		fmt.Println("environment not ready")
		os.Exit(3)
	}
	os.Exit(m.Run())
}

func TestNeverRuns(t *testing.T) {}
