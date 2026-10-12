package greet

import "fmt"

func Hello(name string) string {
	if name == "" {
		return "Hello!"
	}
	return fmt.Sprintf("Hello, %s!", name)
}
