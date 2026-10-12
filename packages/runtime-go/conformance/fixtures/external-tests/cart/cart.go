package cart

import "example.com/shop/pricing"

func Total(cents int) int { return cents - pricing.Discount(cents) }
