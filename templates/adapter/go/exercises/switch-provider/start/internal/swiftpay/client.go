// Package swiftpay simulates a third-party SDK: the shop cannot change it, only adapt to it.
package swiftpay

import (
	"fmt"
	"strconv"
	"strings"
)

type Amount struct {
	Value    string
	Currency string
}

type ChargeParams struct {
	Amount Amount
	Source string
}

type RefundParams struct {
	Charge string
	Amount Amount
}

type Charge struct {
	ID string
}

const (
	CardDeclined      = "card_declined"
	InsufficientFunds = "insufficient_funds"
	ExpiredCard       = "expired_card"
	TryAgain          = "try_again"
	NoSuchCharge      = "no_such_charge"
	AmountTooLarge    = "amount_too_large"
)

type Error struct {
	Code string
}

func (e *Error) Error() string {
	return "swiftpay: " + e.Code
}

var errorsBySource = map[string]string{
	"src_declined": CardDeclined,
	"src_no_funds": InsufficientFunds,
	"src_expired":  ExpiredCard,
	"src_busy":     TryAgain,
}

type Client struct {
	balances map[string]int64
}

func NewClient() *Client {
	return &Client{balances: map[string]int64{}}
}

func (c *Client) CreateCharge(params ChargeParams) (Charge, error) {
	cents, err := centsOf(params.Amount)
	if err != nil {
		return Charge{}, err
	}
	if code, refused := errorsBySource[params.Source]; refused {
		return Charge{}, &Error{Code: code}
	}
	id := fmt.Sprintf("sp_ch_%d", len(c.balances)+1)
	c.balances[id] = cents
	return Charge{ID: id}, nil
}

func (c *Client) CreateRefund(params RefundParams) error {
	cents, err := centsOf(params.Amount)
	if err != nil {
		return err
	}
	balance, ok := c.balances[params.Charge]
	if !ok {
		return &Error{Code: NoSuchCharge}
	}
	if cents > balance {
		return &Error{Code: AmountTooLarge}
	}
	c.balances[params.Charge] = balance - cents
	return nil
}

func centsOf(amount Amount) (int64, error) {
	units, decimals, found := strings.Cut(amount.Value, ".")
	whole, unitsErr := strconv.ParseUint(units, 10, 32)
	fraction, decimalsErr := strconv.ParseUint(decimals, 10, 8)
	if !found || len(decimals) != 2 || unitsErr != nil || decimalsErr != nil || amount.Currency != "EUR" {
		return 0, fmt.Errorf("swiftpay: invalid amount %s %s", amount.Value, amount.Currency)
	}
	return int64(whole)*100 + int64(fraction), nil
}
