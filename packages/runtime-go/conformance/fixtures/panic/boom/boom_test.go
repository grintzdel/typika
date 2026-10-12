package boom

import "testing"

func TestBefore(t *testing.T) {}

func TestOutOfRange(t *testing.T) {
	At([]int{1}, 3)
}

func TestAfter(t *testing.T) {}
