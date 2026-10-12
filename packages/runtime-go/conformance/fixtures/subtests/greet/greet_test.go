package greet

import "testing"

func TestHello(t *testing.T) {
	t.Run("with a name", func(t *testing.T) {
		if got := Hello("Ada"); got != "Hello, Ada!" {
			t.Errorf("Hello(%q) = %q", "Ada", got)
		}
	})
	t.Run("without a name", func(t *testing.T) {
		t.Log("falls back to a plain greeting")
		if got := Hello(""); got != "Hello!" {
			t.Errorf("Hello(\"\") = %q", got)
		}
	})
	t.Run("nested", func(t *testing.T) {
		t.Run("deeper", func(t *testing.T) {
			if got := Hello("Grace"); got != "Hi, Grace!" {
				t.Errorf("got %q, want %q", got, "Hi, Grace!")
			}
		})
		t.Run("skipped", func(t *testing.T) {
			t.Skip("not today")
		})
	})
}

func TestFatal(t *testing.T) {
	t.Fatalf("stops here: %d", 42)
	t.Log("never printed")
}

func TestParallel(t *testing.T) {
	for _, name := range []string{"a", "b", "c"} {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			if Hello(name) == "" {
				t.Error("empty")
			}
		})
	}
}

func TestSkipped(t *testing.T) {
	t.Skip("skipped at the top level")
}

func Test(t *testing.T) {}

func Testlowercase(t *testing.T) { t.Error("must not run: not a test name") }
